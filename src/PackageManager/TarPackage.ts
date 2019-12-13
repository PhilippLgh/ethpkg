import path from 'path'
import fs from 'fs'
import { IPackage, IPackageEntry, IFile, ProgressListener } from './IPackage'
import tar, { FileStat } from 'tar'
import { streamToBuffer, bufferToStream, streamPromise } from '../util';

export default class TarPackage implements IPackage {

  fileName: string = '<unknown>';  
  metadata?: import("../Repositories/IRepository").IRelease | undefined;
  packagePath: string;
  isGzipped: boolean;
  tarbuf?: Buffer;

  constructor(packagePath? : string, compressed = true) {
    this.packagePath = packagePath || ''
    this.isGzipped = compressed
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
  async addEntry(relativePath: string, filePath: string): Promise<string> {
    throw new Error('not implemented')
    tar.r({
      file: this.packagePath
    }, [ filePath ])
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
  extract(destPath: string, onProgress?: ProgressListener | undefined): Promise<string> {
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