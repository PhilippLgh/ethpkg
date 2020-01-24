import path from 'path'
import fs from 'fs'
import { IPackage, IPackageEntry, IFile, ProgressListener } from './IPackage'
import JSZip from 'jszip'
import { extractPackage } from '../util'
import { IRelease } from '../Repositories/IRepository'

export default class ZipPackage implements IPackage {

  public type: string = 'zip'
  private zip : JSZip | undefined
  fileName = '<unknown>'
  metadata?: IRelease
  private filePath: string | undefined

  constructor(packagePathOrName: string) {
    this.filePath = packagePathOrName || ''
    if (this.filePath) {
      this.fileName = path.basename(this.filePath)
    }
  }

  init(){
    this.zip = new JSZip()
    return this
  }

  private async tryLoad() {
    if(!this.zip && this.filePath) {
      const buf = fs.readFileSync(this.filePath)
      await this.loadBuffer(buf)
    }
  }

  async loadBuffer(buf : Buffer) : Promise<IPackage> {
    this.zip = await JSZip.loadAsync(buf)
    return this
  }

  async getEntries() : Promise<Array<IPackageEntry>>{
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    // get entries
    let entries = [] as any
    this.zip.forEach((relativePath: string, file: any /**ZipObject */) => {
      const {name, size, unixPermissions : mode, dir: isDir, _data } = file
      const { uncompressedSize } = _data
      let iFile : IFile = {
        name: path.basename(name),
        size: uncompressedSize,
        mode,
        isDir,
        readContent: async (t : string = 'nodebuffer') => {
          return file.async(t)
        }
      } 
      entries.push({
        relativePath,
        file: iFile
      })
    })
    return entries
  }

  // TODO can be performance optimized
  async getEntry(relativePath : string) : Promise<IPackageEntry | undefined> {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    try {
      let entries = await this.getEntries()
      let entry = entries.find((entry : IPackageEntry) => ['', '/', './'].some(prefix => `${prefix}${entry.relativePath.replace(/^\.\/+/g, '')}` === relativePath ))
      return entry || undefined
    } catch (error) {
      return undefined
    }
  }

  async getContent(relativePath: string) : Promise<Buffer> {
    const entry = await this.getEntry(relativePath)
    // TODO standardize errors
    if (!entry) throw new Error('entry does not exist')
    if (entry.file.isDir) throw new Error('entry is not a file')
    return entry.file.readContent()
  }
  async addEntry(relativePath : string, file: IFile) {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    const content = await file.readContent()
    this.zip.file(relativePath, content);
    return relativePath
  }
  async toBuffer() {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    let buf = await this.zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'})
    return buf
  }
  // from ISerializable
  async getObjectData(): Promise<any> {
    return {
      buffer: await this.toBuffer(),
      filePath: this.filePath
    }
  }
  async extract(destPath: string, onProgress: ProgressListener = (p, f) => {}) : Promise<string> {
    return extractPackage(this, destPath, onProgress)
  }
  async writePackage(filePath : string, useCompression = true) {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    let options : any = {type: 'nodebuffer', compression: 'DEFLATE'}
    if(!useCompression){
      delete options.compression
    }
    const content = await this.zip.generateAsync(options)
    fs.writeFileSync(filePath, content)
    return filePath
  }
  static async create(dirPathOrName : string) : Promise<ZipPackage> {
    // FIXME zip create not working for directories
    const dirPath = path.basename(dirPathOrName) === dirPathOrName ? undefined : dirPathOrName
    const packageName = dirPath ? path.basename(dirPathOrName) : dirPathOrName
    if (dirPath) {
      throw new Error('creating zip from directories is not implemented')
    }
    return new ZipPackage(packageName).init()
  }
  static async from(packagePath: string) : Promise<IPackage> {
    const buf = fs.readFileSync(packagePath)
    return new ZipPackage(packagePath).loadBuffer(buf)
  }
}
