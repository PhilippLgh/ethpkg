import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { IPackage, IPackageEntry, IFile } from './IPackage'
const tar = require('tar-stream')

export default class TarPackage implements IPackage {

  private packagePath: string;
  private isGzipped: boolean;

  constructor(packagePath : string, compressed = true) {
    this.packagePath = packagePath
    this.isGzipped = compressed
  }
  loadBuffer(buf: Buffer): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async getEntries(): Promise<IPackageEntry[]> {
    // FIXME only if compressed
    const inputStream = fs.createReadStream(this.packagePath, {highWaterMark: Math.pow(2,16)})
    const extract = tar.extract()
    return new Promise((resolve, reject) => {
      const entries : IPackageEntry[] = []
      extract.on('entry', (header : any, stream : any, next : any) => {
        let { name } = header
        const { size, type} = header
        const relativePath = name as string
        name = path.basename(relativePath)

        let iFile : IFile = {
          isDir: type === 'directory',
          name,
          readContent: async (t : string = 'nodebuffer') => {
            // let fileData = await this._getEntryData(relPath)
            return Promise.resolve(Buffer.from('')) // fileData
          }
        } 
        entries.push({
          relativePath,
          file: iFile
        })
        
        stream.on('end', function() {
          next() // ready for next entry
        })
        stream.resume()
        
      })

      extract.on('finish', () => {
        resolve(entries)
      })

      // extract file and
      if(this.isGzipped) {
        inputStream.pipe(zlib.createGunzip()).pipe(extract)
      } else {
        inputStream.pipe(extract)
      }
    });
  }
  async getEntry(relativePath : string) {
    try {
      let entries = await this.getEntries()
      let entry = entries.find((entry : IPackageEntry) => entry.relativePath === relativePath)
      return entry || null
    } catch (error) {
      return null
    }
  }
  addFile(relativePath: string, content: string | Buffer): Promise<string> {
    throw new Error("Method not implemented.");
  }
  toBuffer(): Promise<Buffer> {
    throw new Error("Method not implemented.");
  }
  write(outPath: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

}
