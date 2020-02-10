import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage, instanceofIPackage } from './IPackage'

import Fetcher from '../Fetcher'
import * as PackageSigner from '../PackageSigner'
import { IRelease, FetchOptions, IRepository, instanceOfIRelease } from '../Repositories/IRepository'
import { ResolvePackageOptions, instanceofResolvePackageOptions, PackageQuery, instanceOfPackageQuery, DownloadPackageOptions } from '../Fetcher/Fetcher'
import getRepository from '../Repositories/RepositoryManager'
import { IVerificationResult } from '../IVerificationResult'
import ISigner from '../PackageSigner/ISigner'
import { toPackage, PackageData, instanceOfPackageData } from './PackageService'
import { withCache, MemCache, PersistentJsonCache, ICache, NoCache, instanceOfICache } from './Cache'
import { SerializationInfo, ISerializable } from './ISerializable'
import TarPackage from './TarPackage'
import ZipPackage from './ZipPackage'
import { isDirSync, ConstructorOf } from '../util'
import RepositoryManager from '../Repositories/RepositoryManager'
import { isArray } from 'util'

// browser / webpack support
if (!fs.existsSync) {
  fs.existsSync = () => false
}

// we need to tell th ecahe how to restore persisted objects
const packageFactory = async (info: SerializationInfo) : Promise<IPackage | undefined> => {
  const { ctor, data } = info
  if (ctor === undefined) {
    return undefined
  }
  if (!data) {
    return data
  }
  if(ctor === 'Object') {
    return data
  }
  // FIXME restore fileName
  else if (ctor === 'ZipPackage') {
    const { filePath, buffer, metadata } = data
    const pkg = await new ZipPackage(filePath).loadBuffer(buffer)
    pkg.metadata = metadata
    return pkg
  } 
  else if(ctor === 'TarPackage') {
    const { filePath, buffer, metadata } = data
    const pkg = await new TarPackage(filePath).loadBuffer(buffer)
    pkg.metadata = metadata
    return pkg
  }
  else {
    throw new Error('De-serialization error: unknown ctor'+ctor)
  }
}

export interface PackOptions {
  type?: string;
}

export interface PackageManagerOptions {
  cache?: string | ICache<any>
}

export default class PackageManager {

  private cache: ICache<ISerializable> = new NoCache()

  private repoManager: getRepository

  private signers: Array<ISigner> = []

  // FIXME type options
  constructor(options?: PackageManagerOptions) {

    this.repoManager = new RepositoryManager()

    let cacheInit = false
    if (options && options.cache) { 
      if(instanceOfICache(options.cache)) {
        this.cache = options.cache
        cacheInit = true
      }
      else if(isDirSync(options.cache)) {
        this.cache = new PersistentJsonCache(options.cache, packageFactory)
        cacheInit = true
      } 
      else {
        throw new Error('Invalid cache path provided: not accessible -'+options.cache)
      }
    }

    if (cacheInit) {
      this.resolve = withCache(this.cache, this.resolve.bind(this), (spec: PackageQuery) => `resolve:${spec}`)
      this.getPackage = withCache(this.cache, this.getPackage.bind(this))
    }
    
  }

  info() {
    return 'ethpkg version: '+ require('../../package.json').version
  }

  async addRepository(name: string, repo: ConstructorOf<IRepository>) : Promise<void> {
    return this.repoManager.addRepository(name, repo)
  }

  async getRepository(name: string, options: any) : Promise<IRepository | undefined> {
    return this.repoManager.getRepository(options)
  }

  async listRepositories() : Promise<Array<string>> {
    return this.repoManager.listRepositories()
  }

  async removeRepository(name: string) : Promise<boolean> {
    return this.repoManager.removeRepository(name)
  }

  async clearCache() : Promise<void> {
    if (this.cache) {
      await this.cache.clear()
    }
  }

  async createPackage(srcDirPathOrName: string, options?: PackOptions) : Promise<IPackage> {
    //  determine the package type e.g zip / tar based on out path
    options = Object.assign({
      type: 'tar'
    }, options)

    let pkg
    if (options.type === 'zip') {
      pkg = await ZipPackage.create(srcDirPathOrName)
    } else {
      pkg = await TarPackage.create(srcDirPathOrName)
    }

    /*
    if(pkgOutPath) {
      await pkg.writePackage(pkgOutPath)
    }
    */
    return pkg
  }

  async listPackages(spec: PackageQuery, options?: FetchOptions) : Promise<Array<IRelease>> {
    const fetcher = new Fetcher(this.repoManager)
    const releases = await fetcher.listReleases(spec, options)
    if (options && options.cache) {
      if (typeof options.cache === 'string') {
        // FIXME fs.existsSync(options.cache)
      } else if (isArray(options.cache)) {

      }
    }
    return releases
  }

  async resolve(spec: PackageQuery, options? : ResolvePackageOptions): Promise<IRelease | undefined> {
    const fetcher = new Fetcher(this.repoManager)
    const release = await fetcher.getRelease(spec, options)
    return release
  }

  /**
   * Downloads a package to disk
   * A combination of resolve, fetchPackage and verify. Steps can be specified through download options
   */
  private async downloadPackage(release: IRelease, options?: DownloadPackageOptions) : Promise<IPackage> {

    options = Object.assign({}, options)

    const fetcher = new Fetcher(this.repoManager)
    const buf = await fetcher.downloadPackage(release, options)
    const pkg = await toPackage(buf, release) // != this.getPackage

    // TODO if download options verify
    if (options.verify) {
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
    }

    const isDirPath = (str:string) => !path.extname(str)
    if (options.destPath) {
      let destPath = path.resolve(options.destPath)
      console.log('is dir?', path.extname(destPath), destPath, isDirPath(destPath))
      if (isDirPath(destPath)) {
        if(isDirSync(destPath)) {
          destPath = path.join(destPath, release.fileName)
        } else {
          // TODO try create dir if non-existent dir path
          fs.mkdirSync(destPath, {
            recursive: true
          })
        }
      }
      console.log('write package to disk', destPath, release.fileName)
      await pkg.writePackage(destPath)
      if(pkg.metadata) {
        pkg.metadata.remote = false // indicate that local version is available
      }
      console.log('package written to', destPath)
    }

    if (options.extract) {
      if (options.destPath && isDirSync(options.destPath)) {
        await pkg.extract(options.destPath, () => {

        })
        // TODO stateListener(PROCESS_STATES.EXTRACT_FINISHED, { location, size: packageData.length, release })
      }
    }

    return pkg
  }

  /**
   * Creates and returns an IPackage based on a filepath, url, or package specifier
   */
  async getPackage(pkgSpec: IRelease | PackageData | PackageQuery | ResolvePackageOptions, options? : ResolvePackageOptions) : Promise<IPackage | undefined> {
    
    if (!pkgSpec) {
      throw new Error('Invalid package specification: empty or undefined')
    } 

    // pkgSpec is already available as buffer, File (browser), IPackage or file path => no fetch
    if (instanceOfPackageData(pkgSpec )) {
      return toPackage(pkgSpec)
    }

    // check if the short-hand one argument form is used and extract <PackageQuery>pkgSpec from options before we try to resolve them
    if (instanceofResolvePackageOptions(pkgSpec)) {
      if (options) {
        throw new Error('ResolvePackageOptions are provided multiple times')
      }
      if (pkgSpec.spec === undefined) {
        throw new Error('No package specifier provided')
      }
      options = pkgSpec
      pkgSpec = pkgSpec.spec 
    }

    // try to resolve package queries to IRelease
    if (instanceOfPackageQuery(pkgSpec)) {
      try {
        const release = await this.resolve(pkgSpec, options)
        if (!release) {
          throw new Error(`Package query "${pkgSpec}" could not be resolved`)
        }
        pkgSpec = release
      } catch (error) {
        // TODO log error here
        // console.log('error during download', error)
        return undefined
      }
    }

    // download IRelease if it does not exist in cache
    if (instanceOfIRelease(pkgSpec)) {

      const release : IRelease = pkgSpec

      // TODO handle caching
      // TODO write tests
      if (options && options.cache && fs.existsSync(options.cache)) {
        let cachedData = path.join(options.cache, release.fileName)
        if (fs.existsSync(cachedData)) {
          const pkg = await toPackage(cachedData)
          pkg.metadata = release
          return pkg
        }
      }

      return this.downloadPackage(release, options)
    }

    throw new Error('unsupported input type for package')
  }

  async addSigner(signer: ISigner) : Promise<void> {
    this.signers.push(signer)
  }

  async listSigners() : Promise<Array<string>> {
    return this.signers.map(signer => signer.name)
  }

  async getSigner(name: string) : Promise<ISigner | undefined> {
    return this.signers.find(signer => signer.name.toLowerCase() === name.toLowerCase())
  }

  /**
   * Signs a package or directory
   */
  async signPackage(pkg: PackageData, privateKey: Buffer /*| ISigner*/, pkgPathOut? : string) : Promise<IPackage> {
    // TODO support all package specifier options that this.getPackage supports
    return PackageSigner.sign(pkg, privateKey, pkgPathOut)
  }

  async verifyPackage(pkg: PackageData, addressOrEnsName? : string) : Promise<IVerificationResult> {
    return PackageSigner.verify(pkg, addressOrEnsName)
  }

  /**
   * 
   */
  async publishPackage(pkgSpec: PackageData, repoSpecifier: string = 'ipfs') {
    const pkg = typeof pkgSpec === 'string' ? await this.getPackage(pkgSpec) : pkgSpec
    /* FIXME
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
    */
  }
}
