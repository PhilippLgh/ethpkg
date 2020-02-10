import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage } from '../PackageManager/IPackage'
import ZipPackage from './ZipPackage'
import TarPackage from './TarPackage'
import fileType from 'file-type'
import { instanceofIPackage } from './IPackage'
import { IRelease } from '../Repositories/IRepository'
import { hasPackageExtension } from '../utils/FilenameUtils'
import { readFileToBuffer } from '../utils/BrowserUtils'
import { is } from '../util'

// TODO redundant impl. move to utils
const isFilePath = (pkgPath: string) => {
  try {
    return lstatSync(pkgPath).isFile()
  } catch (error) {
    return false
  }
}

export type PackageData = IPackage | Buffer | File | string /* filename */
export function instanceOfPackageData(obj: any): obj is PackageData {
  return instanceofIPackage(obj) || Buffer.isBuffer(obj) || (typeof obj === 'string' && isFilePath(obj)) || (is.browser() && File && obj instanceof File)
}

const getPackageFromBuffer = async (pkgBuf: Buffer, pkgFileName?: string): Promise<IPackage> => {
  const bufferType = fileType(pkgBuf)
  if (!bufferType) {
    throw new Error('bad input buffer')
  }
  if (bufferType.mime === 'application/gzip') {
    // FIXME throw if pkgFileName is not provided
    // FIXME tar packes need a more robust way to determine if gzipped. to use names is especially bad because of cases like this
    const tar = new TarPackage(pkgFileName || 'package-from-buffer.tar.gz')
    await tar.loadBuffer(pkgBuf)
    return tar
  }
  else if (bufferType.mime === 'application/zip') {
    const zip = new ZipPackage(pkgFileName || 'package-from-buffer.zip')
    await zip.loadBuffer(pkgBuf)
    return zip
  } else {
    throw new Error('unsupported input buffer' + bufferType.mime)
  }
}

export const getPackageFromFile = async (pkgSrc: string): Promise<IPackage> => {
  if (!fs.existsSync(pkgSrc)) {
    throw new Error('package not found')
  }

  if (pkgSrc.endsWith('.tar') || pkgSrc.endsWith('.tgz') || pkgSrc.endsWith('.tar.gz')) {
    const tar = new TarPackage(pkgSrc)
    return tar
  }
  else if (pkgSrc.endsWith('.zip')) {
    const zip = new ZipPackage(pkgSrc)
    const pgkContent = fs.readFileSync(pkgSrc)
    await zip.loadBuffer(pgkContent)
    return zip
  }
  else {
    let ext = path.extname(pkgSrc)
    throw new Error('unsupported package type: ' + ext)
  }
}

export const toPackage = async (pkgSpec : PackageData, release?: IRelease) => {
  if (instanceofIPackage(pkgSpec)){
    return pkgSpec
  } 
  else if(Buffer.isBuffer(pkgSpec)) {
    const pkg = await getPackageFromBuffer(pkgSpec, release ? release.fileName : undefined)
    pkg.metadata = release
    if (!pkg) {
      throw new Error('Package buffer could not be loaded')
    }
    return pkg
  } 
  else if(typeof pkgSpec === 'string') {
    if (!fs.existsSync(pkgSpec)) {
      throw new Error('Package file not found at path: '+pkgSpec)
    }
    if (await isFilePath(pkgSpec)) {
      return getPackageFromFile(pkgSpec)
    }
  }     
  // browser support:
  else if (is.browser() && pkgSpec instanceof File && hasPackageExtension(pkgSpec.name)) {
    const fileBuffer = await readFileToBuffer(pkgSpec)
    return getPackageFromBuffer(fileBuffer)
  }
  throw new Error('Package could not be loaded:'+JSON.stringify(pkgSpec))
}