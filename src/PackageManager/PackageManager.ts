import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage } from './IPackage'

import ZipPackage from './ZipPackage'
import TarPackage from './TarPackage'

import fileType from 'file-type'
import Fetcher from '../Fetcher'

import PackageSigner from '../PackageSigner'

import { StateListener } from '../IStateListener'
import { IRelease, FetchOptions } from '../Fetcher/IRepository'
import { FetchPackageOptions, instanceofFetchPackageOptions } from '../Fetcher/Fetcher'

// @ts-ignore
const excludedFiles = e => !/\.zip$/.test(e)

// see https://github.com/npm/npm-package-arg
type PackageSpecifier = string

const isFile = async (pkgPath: string) => {
  try {
    return lstatSync(pkgPath).isFile()
  } catch (error) {
    return false
  }
}

// FIXME
const isSpec = async (str : string) => str.includes(':') && !fs.existsSync(str)

const noop : StateListener = (state, args) => {}

class PackageManager {

  private async getPackageFromBuffer(pkgBuf : Buffer, pkgFileName? : string) : Promise<IPackage> {
    const bufferType = fileType(pkgBuf)
    if (!bufferType) {
      console.log('bad buffer', pkgBuf)
      throw new Error('bad input buffer')
    }
    if(bufferType.mime === 'application/gzip') {
      const tar = new TarPackage()
      await tar.loadBuffer(pkgBuf)
      return tar
    }
    else if (bufferType.mime === 'application/zip') {
      const zip = new ZipPackage(pkgFileName)
      await zip.loadBuffer(pkgBuf)
      return zip
    } else {
      throw new Error('unsupported input buffer'+bufferType.mime)
    }
  }

  private async getPackageFromFile(pkgSrc : string) {
    if(!fs.existsSync(pkgSrc)) {
      throw new Error('package not found')
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

  createPackage = async (pkgDirPath : string, pkgOutPath? : string) => {

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

  resolve = async (spec : PackageSpecifier) : Promise<string> => {
    throw new Error('not implemented!')
    return spec
  }

  findPackage = async (spec : PackageSpecifier, {
    listener = undefined
  } : FetchPackageOptions = {}) : Promise<IRelease | undefined> => {
    const fetcher = new Fetcher()
    const release = await fetcher.getRelease(spec, { listener })
    return release
  }

  listPackages = async (spec : PackageSpecifier, options?: FetchOptions) => {
    const fetcher = new Fetcher()
    const releases = await fetcher.listReleases(spec, options)
    return releases
  }

  /**
   * Creates and returns an IPackage based on a filepath, url, or package specifier
   */
  getPackage = async (pkgSpec : PackageSpecifier | Buffer | FetchPackageOptions) : Promise<IPackage | undefined> => {
    
    let listener = noop

    if (instanceofFetchPackageOptions(pkgSpec)) {
      const { spec, version, platform, prefix, listener: l } = pkgSpec
      listener = l || listener
      // TODO remove once spec is required prop
      if (spec === undefined) throw new Error('no package specifier provided')
      pkgSpec = spec 
    }

    if(typeof pkgSpec === 'string'){
      if (await isSpec(pkgSpec)) {
        const release = await this.findPackage(pkgSpec, { listener })
        if (!release) {
          return undefined
        }
        const fetcher = new Fetcher()
        const buf = await fetcher.downloadPackage(release, listener)
        const {fileName } = release
        const pkg = await this.getPackageFromBuffer(buf, fileName)
        return pkg
      }
      if (await isFile(pkgSpec)) {
        return this.getPackageFromFile(pkgSpec)
      } else {
        throw new Error('package source is not a file')
      }
    }
    else if(Buffer.isBuffer(pkgSpec)) {
      return this.getPackageFromBuffer(pkgSpec)
    } else {
      throw new Error('unsupported input type for package')
    }
  }

  verifyPackage = async (pkg : IPackage, addressOrEnsName? : string) => {
    return PackageSigner.verify(pkg, addressOrEnsName)
  }

  /**
   * Downloads a package to disk
   */
  downloadPackage = async (spec : PackageSpecifier, dest? : string) => {
    const pkg = await this.getPackage(spec)
    /*
    let addressOrEnsName = undefined
    if (verifyWith.length > 0) {
      let author = verifyWith[0]
      if (typeof author === 'string') {
        addressOrEnsName = author
      } else if ('address' in author) {
        addressOrEnsName = author.address
      }
    }
    */
    // await pkg.writePackage()
    return pkg
  }

  /**
   * 
   */
  publishPackage = async (packagePath: string) => {

  }

}

export default PackageManager
