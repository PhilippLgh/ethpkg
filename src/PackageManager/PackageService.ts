import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage } from ".."
import ZipPackage from './ZipPackage'
import TarPackage from './TarPackage'
import fileType from 'file-type'
import { instanceofIPackage } from './IPackage'

// TODO redundant impl. move to utils
const isFile = async (pkgPath: string) => {
  try {
    return lstatSync(pkgPath).isFile()
  } catch (error) {
    return false
  }
}

export type PackageSpecifier = IPackage | Buffer | string

export const getPackageFromBuffer = async (pkgBuf: Buffer, pkgFileName?: string): Promise<IPackage> => {
  const bufferType = fileType(pkgBuf)
  if (!bufferType) {
    console.log('bad buffer', pkgBuf)
    throw new Error('bad input buffer')
  }
  if (bufferType.mime === 'application/gzip') {
    const tar = new TarPackage()
    await tar.loadBuffer(pkgBuf)
    return tar
  }
  else if (bufferType.mime === 'application/zip') {
    const zip = new ZipPackage(pkgFileName)
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

export const getPackage = async (pkgSpec : PackageSpecifier) => {
  // TODO need implementation
  if (instanceofIPackage(pkgSpec)){
    return pkgSpec
  } 
  else if(Buffer.isBuffer(pkgSpec)) {
    const pkg = await getPackageFromBuffer(pkgSpec)
    if (!pkg) {
      throw new Error('Package buffer could not be loaded')
    }
    return pkg
  } 
  else if(typeof pkgSpec === 'string') {
    if (!fs.existsSync(pkgSpec)) {
      throw new Error('Package not found: '+pkgSpec)
    }
    if (await isFile(pkgSpec)) {
      return getPackageFromFile(pkgSpec)
    }
  } 
  throw new Error('Package could not be loaded:'+JSON.stringify(pkgSpec))
}