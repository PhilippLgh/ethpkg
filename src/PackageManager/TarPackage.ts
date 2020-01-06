import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { IPackage, IPackageEntry, IFile, ProgressListener } from './IPackage'
import tarStream from 'tar-stream'
import { streamToBuffer, bufferToStream, streamPromise, isDirSync } from '../util'
import { getExtension } from '../utils/FilenameUtils'
import { relativePathEquals } from '../utils/PackageUtils'

export default class TarPackage implements IPackage {

  fileName: string = '<unknown>';  
  metadata?: import("../Repositories/IRepository").IRelease | undefined;
  packagePath: string;
  isGzipped: boolean;
  tarbuf?: Buffer;

  constructor(packagePath? : string, compressed = true) {
    this.packagePath = packagePath || ''
    if (this.packagePath) {
      this.fileName = path.basename(this.packagePath)
    }
    this.isGzipped = this.packagePath ? ['.tgz', '.tar.gz'].includes(getExtension(this.packagePath)) : compressed
  }

  init() { /* no op */}

  async loadBuffer(buf: Buffer): Promise<IPackage> {
    this.tarbuf = buf
    return this
  }
  private getReadStream() {
    if(this.tarbuf) {
      return bufferToStream(this.tarbuf)
    } else {
      return fs.createReadStream(this.packagePath, {highWaterMark: Math.pow(2,16)})
    }
  }

  private async processTar(iterator: Function, append?: Function) : Promise<Buffer> {
    // create read stream of current archive
    const inputStream = this.getReadStream()

    // this is used to transform the input stream into an extracted stream
    const extract = tarStream.extract()

    // create pack stream for new archive
    const pack = tarStream.pack() // pack is a streams2 stream

    // first scan the package and check if the entry exists
    // if it exists overwrite it
    extract.on('entry', async function(header, stream, next) {
      // header is the tar header
      // stream is the content body (might be an empty stream)
      // call next when you are done with this entry
      const result = await iterator(header, stream, pack)
      // the iterator signals with a truthy value that a modification on the entry stream happened
      // and the passed stream was already processed --> resume()
      if (result) {
        next()
        stream.resume()
      } else {
        // write the unmodified entry to the pack stream
        stream.pipe(pack.entry(header, next))
      }
    })

    // if file was not replaced add it as new entry here (before finalize):
    extract.on('finish', async function() {
      // allow the iterator to append new entries to pack stream here:
      if (typeof append === 'function') {
        await append(pack)
      }
      pack.finalize()
    })

    // start the process by piping the input stream in the transformer (extract)
    if(this.isGzipped) {
      inputStream.pipe(zlib.createGunzip()).pipe(extract)
    } else {
      inputStream.pipe(extract)
    }

    // FIXME make write stream otional: seek operations do not need it and it costs perf
    // write new tar to buffer (this consumes the input stream)
    let strm = this.isGzipped ? pack.pipe(zlib.createGzip()) : pack
    return streamToBuffer(strm)
  }

  private async getEntryData(relPath: string) : Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      this.processTar(async (header: any, stream: any) => {
        const { name: relativePath} = header
        if (relativePath === relPath) {
          const data = await streamToBuffer(stream)
          resolve(data)
          // FIXME stop processing / iteration here
          return 1
        } else {
          return 0
        }
      })
    })
  }

  async getEntries(): Promise<IPackageEntry[]> {
   const entries : Array<IPackageEntry> = []
   await this.processTar((header: any, stream: any) => {
    const { name: relativePath, size, type, mode} = header
    const name = path.basename(relativePath)
    const iFile : IFile = {
      name,
      size,
      mode,
      isDir: type === 'directory',
      readContent: async (t : string = 'nodebuffer') => this.getEntryData(relativePath)
    }
    entries.push({
      relativePath,
      file: iFile
    }) 
   })
   return entries
  }
  async getEntry(relativePath: string): Promise<IPackageEntry | undefined> {
    try {
      const entries = await this.getEntries()
      // remove leading ./ from relative path and try different prefixes
      const entry = entries.find((entry : IPackageEntry) =>  relativePathEquals(entry.relativePath, relativePath))
      return entry
    } catch (error) {
      return undefined
    }
  }
  async getContent(relativePath: string): Promise<Buffer> {
    const entry = await this.getEntry(relativePath)
    // TODO standardize errors
    if (!entry) throw new Error('entry does not exist: '+relativePath)
    if (entry.file.isDir) throw new Error('entry is not a file')
    return entry.file.readContent()
  }

  async addEntry(relativePath: string, file: IFile) : Promise<string> {
    
    let wasOverwritten = false

    const writeEntryToPackStream = (pack: any, relativePath: string) => {
      return new Promise(async (resolve, reject) => {
        const content = await file.readContent()
        let entry = pack.entry({ name: relativePath }, content)
        entry.on('finish', () => {
          resolve()
        })
        entry.end()
      })
    }

    this.tarbuf = await this.processTar(async (header: any, stream: any, pack: any) => {
      const { name: entryRelativePath } = header
      // apparently a tar can contain multiple
      // files with the same name / relative path
      // in order to avoid duplicates we must overwrite existing entries
      if(relativePathEquals(entryRelativePath, relativePath)) {
        // overwrite entry in pack stream
        await writeEntryToPackStream(pack, entryRelativePath)
        wasOverwritten = true
        return 1 // signal that entry was modified
      }
    }, async (pack: any) => {
      // no existing entry was overwritten so we append new entries to pack
      if (!wasOverwritten) {
        await writeEntryToPackStream(pack, relativePath)
      }
    })
    return relativePath
  }
  async toBuffer(): Promise<Buffer> {
    if (!this.tarbuf) {
      if (this.packagePath) {
        this.tarbuf = fs.readFileSync(this.packagePath)
      } else {
        throw new Error('Could not create package buffer')
      }
    }
    return Promise.resolve(this.tarbuf)
  }
  async writePackage(outPath: string): Promise<string> {
    if (this.isGzipped && (!(outPath.endsWith('.tgz') || outPath.endsWith('.tar.gz')))){
      throw new Error('Attempt to write compressed into a decompressed file: consider using ".tar.gz" or ".tgz" or explicitly decompress')
    }
    const s = this.getReadStream().pipe(fs.createWriteStream(outPath))
    await streamPromise(s)
    return outPath
  }
  async extract(destPath: string, onProgress?: ProgressListener | undefined): Promise<string> {
    throw new Error("Method not implemented.");
  }
  async printEntries() {
    const entries = await this.getEntries()
    console.log(entries.map(e => e.relativePath).join('\n'))
  }
  static async create(dirPath : string) : Promise<TarPackage> {

    const writeFileToPackStream = (filePath: string) => {
      return new Promise(async (resolve, reject) => {
        const content = fs.readFileSync(filePath)
        const relativePath = path.relative(dirPath, filePath)
        let entry = pack.entry({ name: relativePath }, content)
        entry.on('finish', () => {
          resolve()
        })
        entry.end()
      })
    }
   // pack is a streams2 stream
   const pack = tarStream.pack()

   const fileNames = fs.readdirSync(dirPath)
   for (const fileName of fileNames) {
     const fullPath = path.join(dirPath, fileName)
     if (!isDirSync(fullPath)){
       await writeFileToPackStream(fullPath)
      } else {
        // FIXME skip recursive call
     }
   }

   pack.finalize()
   const packageBuffer = await streamToBuffer(pack)

   const t = new TarPackage(undefined, false)
   await t.loadBuffer(packageBuffer)
   return t
  }
}