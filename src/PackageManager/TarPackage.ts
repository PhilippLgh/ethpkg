import fs, { read } from 'fs'
import path from 'path'
import zlib from 'zlib'
import { IPackage, IPackageEntry, IFile } from './IPackage'
import { bufferToStream, streamToBuffer } from '../util'
const tar = require('tar-stream')

export default class TarPackage implements IPackage {

  private packagePath: string;
  private isGzipped: boolean;
  tarbuf?: Buffer;
  fileName = '<unknown>'

  constructor(packagePath? : string, compressed = true) {
    this.packagePath = packagePath || ''
    this.isGzipped = compressed
  }
  loadBuffer(buf: Buffer): Promise<void> {
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
  private async getEntryData(entryPath : string) : Promise<Buffer> {
    const inputStream = this.getReadStream()
    const extract = tar.extract()
    return new Promise((resolve, reject) => {
      extract.on('entry', async (header : any, stream : any, next : any) => {
        let { name } = header
        const { size, type} = header
        const relPath = name as string
        name = path.basename(relPath)
        if(relPath === entryPath){
          let fileData = await streamToBuffer(stream, size)
          resolve(fileData)
          // TODO close here
          next()
        } else {
          stream.on('end', function() {
            next() // ready for next entry
          })
          stream.resume()
        }
      })
      extract.on('finish', () => {
        // resolve(entries)
      })
      if(this.isGzipped) {
        inputStream.pipe(zlib.createGunzip()).pipe(extract)
      } else {
        inputStream.pipe(extract)
      }
    });
  }
  async getEntries(): Promise<IPackageEntry[]> {
    const inputStream = this.getReadStream()
    const extract = tar.extract()
    return new Promise((resolve, reject) => {
      const entries : IPackageEntry[] = []

      extract.on('entry', (header : any, stream : any, next : any) => {
        let { name } = header
        const { size, type, mode} = header
        const relativePath = name as string
        name = path.basename(relativePath)

        let iFile : IFile = {
          name,
          size,
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
  // TODO very poor performance - this can probably be optimized a LOT :(
  async addEntry(relativePath: string, content: string | Buffer): Promise<string> {
    // prepare in / out streams
    let inputStream
    // if tarbuf exists use instead of org file or it would overwite intermediate changes
    inputStream = this.getReadStream()

    // 
    const pack = tar.pack() // pack is a streams2 stream
    const extract = tar.extract()
   
    // prepare compression
    const gzip = zlib.createGzip()

    let wasOverwritten = false

    extract.on('entry', (header : any, stream : any, next : any) => {
      let { name } = header
      const { size, type} = header
      // apparently a tar can contain multiple
      // files with the same name / relative path
      // in order to avoid duplicates we must overwrite existing entries
      if(name === relativePath) {
        wasOverwritten = true
        let entry = pack.entry({ name }, content)
        entry.end()
        stream.on('end', function() {
          console.log('end')
          next() // ready for next entry
        })
        stream.resume() // just auto drain the stream
      } else {
        // write the unmodified entry to the pack stream
        stream.pipe(pack.entry(header, next))
      }
    });

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

    // read input
    if(this.isGzipped) {
      inputStream.pipe(zlib.createGunzip()).pipe(extract)
    } else {
      inputStream.pipe(extract)
    }

    // write new tar to buffer
    let strm = pack.pipe(gzip)
    // @ts-ignore
    this.tarbuf = await streamToBuffer(strm)

    return relativePath
  }
  toBuffer(): Promise<Buffer> {
    throw new Error("Method not implemented.");
  }
  writePackage(outPath: string): Promise<string> {
    if (!this.tarbuf) {
      throw new Error("cannot create tar file - empty buffer")
    }
    fs.writeFileSync(outPath, this.tarbuf)
    return Promise.resolve(outPath)
  }

}
