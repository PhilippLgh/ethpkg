import path from 'path'
import fs from 'fs'
import { IPackage, IPackageEntry, IFile, ProgressListener } from './IPackage'
import JSZip from 'jszip'
import { extractPackage } from '../util'
import { IRelease } from '../Repositories/IRepository'

export default class ZipPackage implements IPackage {

  private zip : JSZip | undefined
  fileName = '<unknown>'
  metadata?: IRelease
  private packagePath: string | undefined

  constructor(packagePath? : string) {
    this.packagePath = packagePath
  }

  init(){
    this.zip = new JSZip()
  }

  private async tryLoad() {
    if(!this.zip && this.packagePath) {
      const buf = fs.readFileSync(this.packagePath)
      await this.loadBuffer(buf)
    }
  }

  async loadBuffer(buf : Buffer) {
    this.zip = await JSZip.loadAsync(buf)
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

  async addEntry(relativePath : string, content : string | Buffer) {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    this.zip.file(relativePath, content);
    return relativePath
  }

  async toBuffer() {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    let buf = await this.zip.generateAsync({type: "nodebuffer", compression: "DEFLATE"})
    return buf
  }

  async extract(destPath: string, onProgress: ProgressListener = (p, f) => {}) : Promise<string> {
    return extractPackage(this, destPath, onProgress)
  }

  async writePackage(filePath : string, useCompression = true) {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    let options : any = {type: "nodebuffer", compression: "DEFLATE"}
    if(!useCompression){
      delete options.compression
    }
    const content = await this.zip.generateAsync(options)
    fs.writeFileSync(filePath, content)
    return filePath
  }
}
