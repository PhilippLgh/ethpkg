import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage, instanceofIPackage } from './IPackage'

import TarPackage from './TarPackage'
import Fetcher from '../Fetcher'
import * as PackageSigner from '../PackageSigner'
import { StateListener } from '../IStateListener'
import { IRelease, FetchOptions, IRepository } from '../Repositories/IRepository'
import { FetchPackageOptions, instanceofFetchPackageOptions } from '../Fetcher/Fetcher'
import getRepository from '../Repositories'
import { IVerificationResult } from '../IVerificationResult'
import ISigner from '../PackageSigner/ISigner'
import { readFileToBuffer } from '../utils/BrowserUtils'
import { hasPackageExtension } from '../utils/FilenameUtils'
import { getPackageFromBuffer, getPackageFromFile, getPackage } from './PackageService'

// browser / webpack support
if (!fs.existsSync) {
  fs.existsSync = () => false
}

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

export default class PackageManager {

  public addRepository(repo: IRepository) {}

  createPackage = async (contentDirPath : string, pkgOutPath? : string) => {
    if(!lstatSync(contentDirPath).isDirectory()) {
      throw new Error('package source is not a directory')
    }
    // FIXME determine the package type e.g zip / tar based on out path
    const pkg = await TarPackage.create(contentDirPath)
    if(pkgOutPath) {
      pkg.writePackage(pkgOutPath)
    }
    return pkg
  }

  findPackage = async (spec : PackageSpecifier, options? : FetchPackageOptions) : Promise<IRelease | undefined> => {
    const fetcher = new Fetcher()
    const release = await fetcher.getRelease(spec, options)
    return release
  }

  listPackages = async (spec : PackageSpecifier, options?: FetchOptions) : Promise<Array<IRelease>> => {
    const fetcher = new Fetcher()
    const releases = await fetcher.listReleases(spec, options)
    return releases
  }

  loadPackage = async (pkgSpec : IPackage | Buffer | string) : Promise<IPackage> => {
    return getPackage(pkgSpec)
  }

  /**
   * Creates and returns an IPackage based on a filepath, url, or package specifier
   */
  getPackage = async (pkgSpec : IPackage | PackageSpecifier | Buffer | File | FetchPackageOptions) : Promise<IPackage | undefined> => {
    
    if (instanceofIPackage(pkgSpec)){
      return pkgSpec
    }

    let listener = noop
    let options = undefined
    if (instanceofFetchPackageOptions(pkgSpec)) {
      options = pkgSpec
      listener = options.listener || noop
      // TODO remove once spec is required prop
      if (options.spec === undefined) throw new Error('no package specifier provided')
      pkgSpec = options.spec 
    }

    if(typeof pkgSpec === 'string'){
      if (await isSpec(pkgSpec)) {
        const release = await this.findPackage(pkgSpec, options)
        if (!release) {
          return undefined
        }
        if (options && options.cache && fs.existsSync(options.cache)) {
          let cachedData = path.join(options.cache, release.fileName)
          if (fs.existsSync(cachedData)) {
            const pkg = await getPackageFromFile(cachedData)
            pkg.metadata = release
            return pkg
          }
        } 
        const fetcher = new Fetcher()
        const buf = await fetcher.downloadPackage(release, listener)
        const {fileName } = release
        const pkg = await getPackageFromBuffer(buf, fileName)
        pkg.metadata = release
        return pkg
      }
      if (await isFile(pkgSpec)) {
        return getPackageFromFile(pkgSpec)
      } else {
        throw new Error('package source is not a file')
      }
    }
    else if(Buffer.isBuffer(pkgSpec)) {
      return getPackageFromBuffer(pkgSpec)
    } 
    // browser support:
    else if (pkgSpec instanceof File && hasPackageExtension(pkgSpec.name)) {
      const fileBuffer = await readFileToBuffer(pkgSpec)
      return getPackageFromBuffer(fileBuffer)
    }
    else {
      throw new Error('unsupported input type for package')
    }
  }

  /**
   * Signs a package or directory
   */
  signPackage = async (pkgSrc: string | Buffer | IPackage, privateKey: Buffer /*| ISigner*/, pkgPathOut? : string) : Promise<IPackage | undefined> => {
    return PackageSigner.sign(pkgSrc, privateKey, pkgPathOut)
  }

  verifyPackage = async (pkg : IPackage, addressOrEnsName? : string) : Promise<IVerificationResult> => {
    return PackageSigner.verify(pkg, addressOrEnsName)
  }

  /**
   * Downloads a package to disk
   */
  downloadPackage = async (spec : PackageSpecifier, dest : string = '.') => {
    dest = path.resolve(dest)
    const pkg = await this.getPackage(spec)
    if (!pkg) {
      throw new Error('Package could not be fetched')
    }
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
    await pkg.writePackage(dest)
    return pkg
  }

  /**
   * 
   */
  publishPackage = async (pkgSpec: string | IPackage, repoSpecifier: string = 'ipfs') => {
    const pkg = typeof pkgSpec === 'string' ? await this.getPackage(pkgSpec) : pkgSpec
    const repo = await getRepository(repoSpecifier, {})
    if (!repo) {
      throw new Error('Repository not found for specifier: '+repoSpecifier)
    }
    // @ts-ignore
    if (typeof repo.publish !== 'function') {
      throw new Error('Repository does not implement publish')
    }
    // @ts-ignore
    const result = await repo.publish(pkg)
    return result
  }
}
