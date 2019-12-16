import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { IPackage, IPackageEntry, IFile, ProgressListener } from './IPackage'
import tar, { FileStat } from 'tar'
import tarStream from 'tar-stream'
import { streamToBuffer, bufferToStream, streamPromise } from '../util'
import { getExtension } from '../utils/FilenameUtils'

export default class TarPackage implements IPackage {

  fileName: string = '<unknown>';  
  metadata?: import("../Repositories/IRepository").IRelease | undefined;
  packagePath: string;
  isGzipped: boolean;
  tarbuf?: Buffer;

  constructor(packagePath? : string, compressed = true) {
    this.packagePath = packagePath || ''
    this.isGzipped = this.packagePath ? ['.tgz', '.tar.gz'].includes(getExtension(this.packagePath)) : compressed
  }

  init() { /* no op */}

  async loadBuffer(buf: Buffer): Promise<void> {
    this.tarbuf = buf
    return Promise.resolve()
  }
  private getReadStream() {
    if(this.tarbuf) {
      return bufferToStream(this.tarbuf)
    } else {
      return fs.createReadStream(this.packagePath, {highWaterMark: Math.pow(2,16)})
    }
  }
  // see: https://github.com/npm/node-tar/issues/181
  private async getEntryData(relPath: string) : Promise<Buffer> {
    const data : Array<any> = []
    const onentry = (entry: tar.FileStat)  => {
      if (entry.header.path === relPath) {
        entry.on('data', c =>  {
          data.push(c)
        })
      }
    }
    const writeStream = tar.t({
      onentry
    })
    const s = this.getReadStream().pipe(writeStream)
    await streamPromise(s)
    return Buffer.concat(data)
  }
  async getEntries(): Promise<IPackageEntry[]> {
    const entries : Array<IPackageEntry> = []
    const writeStream = tar.t({
      onentry: (entry: FileStat) => {
        // console.log('entry', entry)
        const { header } = entry
        const { path : relativePath, size, mode, type } = header
        const name = path.basename(relativePath)
        let iFile : IFile = {
          name,
          size: size || 0,
          mode,
          isDir: type === 'directory',
          readContent: async (t : string = 'nodebuffer') => {
            const content = await this.getEntryData(relativePath)
            return content
          }
        } 
        entries.push({
          relativePath,
          file: iFile
        })
      }
    })
    return new Promise((resolve, reject) => {
      this.getReadStream().pipe(writeStream).on('finish', () => {
        resolve(entries)
      })
    })
  }
  async getEntry(relativePath: string): Promise<IPackageEntry | undefined> {
    try {
      let entries = await this.getEntries()
      // remove leading ./ from relative path and try different prefixes
      let entry = entries.find((entry : IPackageEntry) => ['', '/', './'].some(prefix => `${prefix}${entry.relativePath.replace(/^\.\/+/g, '')}` === relativePath ))
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
    
    // create read stream of current archive
    const inputStream = this.getReadStream()

    // this is used to transform the input stream into an extracted stream
    const extract = tarStream.extract()
    // create pack stream for new archive
    const pack = tarStream.pack() // pack is a streams2 stream

    let wasOverwritten = false

    const content = await file.readContent()

    // first scan the package and check if the entry exists
    // if it exists overwrite it
    extract.on('entry', function(header, stream, next) {
      // header is the tar header
      // stream is the content body (might be an empty stream)
      // call next when you are done with this entry

      const { name: entryRelativePath } = header
      // const { size, type} = header
      // apparently a tar can contain multiple
      // files with the same name / relative path
      // in order to avoid duplicates we must overwrite existing entries
      // TODO move to helper
      if(['', '/', './'].some(prefix => `${prefix}${entryRelativePath.replace(/^\.\/+/g, '')}` === relativePath)) {
        wasOverwritten = true
        // overwrite entry in pack stream
        let entry = pack.entry({ name: entryRelativePath }, content)
        entry.end()
        stream.on('end', next)
        stream.resume() // just auto drain the stream
      } else {
        // write the unmodified entry to the pack stream
        stream.pipe(pack.entry(header, next))
      }
    })

    // if file was not replaced add it as new entry here (before finalize):
    extract.on('finish', function() {
      // add new entries here:
      if(!wasOverwritten) {
        let entry = pack.entry({ name: relativePath }, content)
        // all entries done - lets finalize it
        entry.on('finish', () => {
          pack.finalize()
        })
        entry.end()
      } else {
        pack.finalize()
      }
    })

    // start the process by piping the input stream in the transformer (extract)
    if(this.isGzipped) {
      inputStream.pipe(zlib.createGunzip()).pipe(extract)
    } else {
      inputStream.pipe(extract)
    }

    // write new tar to buffer (this consumes the input stream)
    let strm = this.isGzipped ? pack.pipe(zlib.createGzip()) : pack
    this.tarbuf = await streamToBuffer(strm)
    
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
    const files = fs.readdirSync(dirPath)
    const readStream = await tar.c({
      cwd: dirPath,
    }, [ ...files ])
    const buf = await streamToBuffer(readStream)
    const _tar = new TarPackage()
    _tar.loadBuffer(buf)
    return _tar
  }
}