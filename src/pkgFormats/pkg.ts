import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage, IPackageEntry } from './IPackage'

import ZipPackage from './ZipPackage'
import TarPackage from './TarPackage'

import fileType from 'file-type'

// @ts-ignore
const excludedFiles = e => !/\.zip$/.test(e)

export class pkg {
  static isPackage() {
    return true
  }
  static create = async (pkgDirPath : string, pkgOutPath? : string) => {

    if(!lstatSync(pkgDirPath).isDirectory()) {
      throw new Error('package source is not a directory')
    }

    const addFile = (src : string, f : string, pkg : IPackage) => {
      pkg.addEntry(f, fs.readFileSync(path.join(src, f)))
    }

    // FIXME determine the package type e.g zip / tar based on out path
    const zip = new ZipPackage()
    zip.init() // create new empty package

    const files = fs
      .readdirSync(pkgDirPath)
      .filter(excludedFiles)
      .forEach(f => addFile(pkgDirPath, f, zip))
    
    
    if(pkgOutPath) {
      zip.writePackage(pkgOutPath)
    }

    return zip

  }
  static getPackage = async (pkgSrc : string | Buffer) : Promise<IPackage> => {
    if(typeof pkgSrc === 'string'){

      if(!fs.existsSync(pkgSrc)) {
        throw new Error('package not found')
      }

      if(!lstatSync(pkgSrc).isFile()) {
        throw new Error('package source is not a file')
      }

      if (pkgSrc.endsWith('.tgz') || pkgSrc.endsWith('.tar.gz')) {
        const tar = new TarPackage(pkgSrc)
        return tar
      } 
      else if (pkgSrc.endsWith('.zip')) {
        const zip = new ZipPackage()
        const pgkContent = fs.readFileSync(pkgSrc)
        await zip.loadBuffer(pgkContent)
        return zip
      } 
      else {
        let ext = path.extname(pkgSrc)
        throw new Error('unsupported package type: ' + ext)
      }
    }
    else if(Buffer.isBuffer(pkgSrc)) {
      const bufferType = fileType(pkgSrc)
      if (!bufferType) {
        throw new Error('bad input buffer')
      }
      if(bufferType.mime === 'application/gzip') {
        const tar = new TarPackage()
        await tar.loadBuffer(pkgSrc)
        return tar
      }
      else if (bufferType.mime === 'application/zip') {
        const zip = new ZipPackage()
        await zip.loadBuffer(pkgSrc)
        return zip
      } else {
        throw new Error('unsupported input buffer'+bufferType.mime)
      }
    } else {
      throw new Error('unsupported input type for package')
    }
  }
}

