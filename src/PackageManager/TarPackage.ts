import path, { relative } from 'path'
import fs, { realpath } from 'fs'
import zlib from 'zlib'
import { IPackage, IPackageEntry, IFile, WritePackageOptions, CreatePackageOptions, ExtractPackageOptions } from './IPackage'
import tarStream from 'tar-stream'
import { streamToBuffer, bufferToStream, streamPromise, isDirSync, isFileSync, extractPackage } from '../util'
import { getExtension, hasPackageExtension } from '../utils/FilenameUtils'
import { relativePathEquals } from '../utils/PackageUtils'
import { IRelease } from '../Repositories/IRepository'
import { PROCESS_STATES } from '../IStateListener'

export default class TarPackage implements IPackage {

  fileName: string = '<unknown>';  
  metadata?: IRelease | undefined;
  filePath: string;
  isGzipped: boolean;
  tarbuf?: Buffer;

  constructor(packagePathOrName: string, compressed = true) {
    this.filePath = packagePathOrName || ''
    if (this.filePath) {
      this.fileName = path.basename(this.filePath)
    }
    this.isGzipped = this.filePath ? ['.tgz', '.tar.gz'].includes(getExtension(this.filePath)) : compressed
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
      return fs.createReadStream(this.filePath, {highWaterMark: Math.pow(2,16)})
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
      if (this.filePath) {
        this.tarbuf = fs.readFileSync(this.filePath)
      } else {
        throw new Error('Could not create package buffer')
      }
    }
    return Promise.resolve(this.tarbuf)
  }
  // from ISerializable
  async getObjectData(): Promise<any> {
    return {
      buffer: await this.toBuffer(),
      metadata: this.metadata,
      filePath: this.filePath
    }
  }
  async writePackage(outPath: string, {
    overwrite = false,
    compression = true // TODO handle compression param
  } : WritePackageOptions = {}): Promise<string> {
    if (fs.existsSync(outPath) && !overwrite) {
      throw new Error('Package exists already! Use "overwrite" options')
    }
    if (this.isGzipped && (!(outPath.endsWith('.tgz') || outPath.endsWith('.tar.gz')))){
      throw new Error('Attempt to write compressed into a decompressed file: consider using ".tar.gz" or ".tgz" or explicitly decompress')
    }
    let s
    if (!this.isGzipped && ((outPath.endsWith('.tgz') || outPath.endsWith('.tar.gz')))) {
      s = this.getReadStream().pipe(zlib.createGzip()).pipe(fs.createWriteStream(outPath))
    } else {
      s = this.getReadStream().pipe(fs.createWriteStream(outPath))
    }
    await streamPromise(s)
    return outPath
  }
  async extract(destPath: string, {
    listener = undefined
  } : ExtractPackageOptions = {}): Promise<string> {
    return extractPackage(this, destPath, listener)
  }
  async printPackageInfo() {
    const entries = await this.getEntries()
    console.log(entries.map(e => e.relativePath).join('\n'))
  }
  static async create(dirPathOrName : string, {
    compressed = true,
    listener = () => {}
  } : CreatePackageOptions = {}) : Promise<TarPackage> {
    // pack is a streams2 stream
    const pack : any = tarStream.pack() 
    const dirPath = path.basename(dirPathOrName) === dirPathOrName ? undefined : dirPathOrName
    let packageName = dirPath ? path.basename(dirPathOrName) : dirPathOrName
    if (!hasPackageExtension(packageName)) {
      packageName += (compressed ? '.tgz' : 'tar')
    }
    if (dirPath) {
      const writeFileToPackStream = (filePath: string) => {
        return new Promise(async (resolve, reject) => {
          const content = fs.readFileSync(filePath)
          const relativePath = path.relative(dirPath, filePath)
          let entry = pack.entry({ name: relativePath }, content)
          listener(PROCESS_STATES.CREATE_PACKAGE_PROGRESS, {
            file: relativePath
          })
          entry.on('finish', () => {
            resolve()
          })
          entry.end()
        })
      }
      // FIXME might exceed callstack - implement upper limits and remove recursion
      const writeDirToPackStream = async (dirPath: string) => {
        // console.log('write dir', dirPath)
        const fileNames = fs.readdirSync(dirPath)
        for (const fileName of fileNames) {
          // TODO implement listener
          const fullPath = path.join(dirPath, fileName)
          if (isDirSync(fullPath)){
            await writeDirToPackStream(fullPath)
          } 
          else if(isFileSync(fullPath)){
            await writeFileToPackStream(fullPath)
          }
          // else ignore symlinks etc
        }
      }
      await writeDirToPackStream(dirPath)
    }

    let strm = compressed ? pack.pipe(zlib.createGzip()) : pack
    pack.finalize()
    const packageBuffer = await streamToBuffer(strm)
    const t = new TarPackage(packageName, false)
    await t.loadBuffer(packageBuffer)
    return t
  }
  static async from(packagePath: string) : Promise<IPackage> {
    const buf = fs.readFileSync(packagePath)
    return new TarPackage(packagePath).loadBuffer(buf)
  }
}