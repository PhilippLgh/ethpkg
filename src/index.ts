import fs from 'fs'
import { IPackage, IPackageEntry } from './pkgFormats/IPackage'
import ZipPackage from './pkgFormats/zipPackage'

import * as util from './util'

export {default as pkgsign} from './pkgsign'
export {default as cert} from './cert'
export {util as util}

const getPackageSync = (pkgSrc : string | Buffer) : IPackage => {
  let pgkContent;
  if(typeof pkgSrc === 'string'){
    if(!fs.existsSync(pkgSrc)) {
      throw new Error('package not found')
    }
    //if (path.endsWith('.tgz') && lstatSync(path).isFile()) {
    pgkContent = fs.readFileSync(pkgSrc)
  } else {
    pgkContent = pkgSrc
  }
  const zip = new ZipPackage()
  zip.loadBufferSync(pgkContent)
  return zip
}

const getPackage = async (pkgSrc : string | Buffer) : Promise<IPackage> => {
  let pgkContent;
  if(typeof pkgSrc === 'string'){
    if(!fs.existsSync(pkgSrc)) {
      throw new Error('package not found')
    }
    //if (path.endsWith('.tgz') && lstatSync(path).isFile()) {
    pgkContent = fs.readFileSync(pkgSrc)
  } else {
    pgkContent = pkgSrc
  }
  const zip = new ZipPackage()
  await zip.loadBuffer(pgkContent)
  return zip
}

export class ethpkg {
  static isPackage() {
    return true
  }
  static getPackageSync = getPackageSync
  static getPackage = getPackage
}

export { IPackage as IPackage, IPackageEntry as IPackageEntry } from './pkgFormats/IPackage'
