import path from 'path'
import fs from 'fs'
import { IPackage, IPackageEntry, IFile, CreatePackageOptions, WritePackageOptions, ExtractPackageOptions } from './IPackage'
import JSZip from 'jszip'
import { extractPackage, isDirSync, localFileToIFile, isFileSync } from '../util'
import { IRelease } from '../Repositories/IRepository'
import { toIFile } from '../utils/PackageUtils'
import { PROCESS_STATES } from '../IStateListener'

export default class ZipPackage implements IPackage {

  public type: string = 'zip'
  private zip : JSZip | undefined
  fileName = '<unknown>'
  metadata?: IRelease
  readonly filePath: string | undefined
  private _size: number = 0

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

  get size() {
    return this._size
  }

  private async tryLoad() {
    if(!this.zip && this.filePath) {
      const buf = fs.readFileSync(this.filePath)
      await this.loadBuffer(buf)
    }
  }

  async loadBuffer(buf : Buffer) : Promise<IPackage> {
    this._size = buf.byteLength
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
    if (!entry) throw new Error('entry does not exist: '+relativePath)
    if (entry.file.isDir) throw new Error('entry is not a file')
    return entry.file.readContent()
  }
  async addEntry(relativePath : string, file: IFile | string | Buffer) {
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    const content = Buffer.isBuffer(file) ? file : (typeof file === 'string' ? Buffer.from(file) : await file.readContent())
    // FIXME does not handle overwrite
    this._size += content.byteLength
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
      metadata: this.metadata,
      filePath: this.filePath
    }
  }
  async extract(destPath: string, {
    listener = undefined
  } : ExtractPackageOptions = {}) : Promise<string> {
    return extractPackage(this, destPath, listener)
  }
  async writePackage(outPath : string, {
    overwrite = false,
    compression = true
  } : WritePackageOptions = {}) {
    if (fs.existsSync(outPath) && !overwrite) {
      throw new Error('Package exists already! Use "overwrite" option')
    }
    await this.tryLoad()
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    let options : any = {type: 'nodebuffer', compression: 'DEFLATE'}
    if(!compression){
      delete options.compression
    }
    const content = await this.zip.generateAsync(options)
    fs.writeFileSync(outPath, content)
    return outPath
  }
  static async create(dirPathOrName : string, {
    listener = () => {}
  } : CreatePackageOptions = {}) : Promise<ZipPackage> {
    const dirPath = path.basename(dirPathOrName) === dirPathOrName ? undefined : dirPathOrName
    const packageName = dirPath ? path.basename(dirPathOrName) : dirPathOrName

    const pkg = new ZipPackage(packageName).init()

    const writeFileToPackage = async (fullPath: string) => {
      const relativePath = path.relative(<string>dirPath, fullPath)
      listener(PROCESS_STATES.CREATE_PACKAGE_PROGRESS, {
        file: relativePath
      })
      await pkg.addEntry(relativePath, localFileToIFile(fullPath))
    }

    const writeDirToPackage = async (dirPath: string) => {
      // console.log('write dir', dirPath)
      const fileNames = fs.readdirSync(dirPath)
      for (const fileName of fileNames) {
        const fullPath = path.join(dirPath, fileName)
        if (isDirSync(fullPath)){
          await writeDirToPackage(fullPath)
        } else if (isFileSync(fullPath)) {
          await writeFileToPackage(fullPath)
        }
        // else ignore symlinks etc
      }
    }

    if (dirPath) {
      await writeDirToPackage(dirPath)
    }

    return pkg
  }
  static async from(packagePath: string) : Promise<IPackage> {
    const buf = fs.readFileSync(packagePath)
    return new ZipPackage(packagePath).loadBuffer(buf)
  }
}
