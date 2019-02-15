import path from 'path'
import fs from 'fs'
import { IPackage, IPackageEntry, IFile } from './IPackage'
import JSZip from 'jszip'
export default class ZipPackage implements IPackage {

  private zip : JSZip | undefined

  async loadBuffer(buf : Buffer) {
    this.zip = await JSZip.loadAsync(buf)
  }

  async getEntries() : Promise<Array<IPackageEntry>>{
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    // get entries
    let entries = [] as any
    this.zip.forEach((relativePath: string, file: any /**ZipObject */) => {
      let iFile : IFile = {
        dir: file.dir,
        name: path.basename(file.name),
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
  async getEntry(relativePath : string) {
    let entries = await this.getEntries()
    let entry = entries.find((entry : IPackageEntry) => entry.relativePath === relativePath)
    return entry
  }

  async addFile(relativePath : string, content : string | Buffer) {
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    this.zip.file(relativePath, content);
    return relativePath
  }

  async toBuffer() {
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    let buf = await this.zip.generateAsync({type: "nodebuffer", compression: "DEFLATE"})
    return buf
  }

  async write(filePath : string) {
    if(!this.zip) {
      throw new Error('package not loaded - load with loadBuffer()')
    }
    const content = await this.zip.generateAsync({type:"nodebuffer"})
    fs.writeFileSync(filePath, content)
    return filePath
  }
}
