import fs, { lstatSync } from 'fs'
import path from 'path'
import { IPackage, instanceofIPackage } from './IPackage'

import Fetcher from '../Fetcher'
import * as PackageSigner from '../PackageSigner'
import { StateListener } from '../IStateListener'
import { IRelease, FetchOptions, IRepository } from '../Repositories/IRepository'
import { FetchPackageOptions, instanceofFetchPackageOptions, PackageQuery, instanceOfPackageQuery } from '../Fetcher/Fetcher'
import getRepository from '../Repositories/RepositoryManager'
import { IVerificationResult } from '../IVerificationResult'
import ISigner from '../PackageSigner/ISigner'
import { getPackage, PackageData, instanceOfPackageData } from './PackageService'
import { withCache, MemCache, PersistentJsonCache, ICache } from './Cache'
import { SerializationInfo, ISerializable } from './ISerializable'
import TarPackage from './TarPackage'
import ZipPackage from './ZipPackage'
import { isDirSync, ConstructorOf } from '../util'
import RepositoryManager from '../Repositories/RepositoryManager'

// browser / webpack support
if (!fs.existsSync) {
  fs.existsSync = () => false
}

// we need to tell th ecahe how to restore persisted objects
const packageFactory = (info: SerializationInfo) : Promise<IPackage | undefined> => {
  const { ctor, data } = info
  const { filePath, buffer } = data
  // FIXME restore fileName
  if (ctor === undefined) {
    return Promise.resolve(undefined)
  }
  else if (ctor === 'ZipPackage') {
    return new ZipPackage(filePath).loadBuffer(buffer)
  } 
  else if(ctor === 'TarPackage') {
    return new TarPackage(filePath).loadBuffer(buffer)
  }
  else {
    throw new Error('De-serialization error: unknown ctor'+ctor)
  }
}

export interface PackOptions {
  type?: string;
}

export interface DownloadPackageOptions extends FetchPackageOptions {
  destPath?: string
}

export default class PackageManager {

  private cache?: ICache<ISerializable>;

  private repoManager: getRepository

  private signers: Array<ISigner> = []

  constructor(options?: any) {

    this.repoManager = new RepositoryManager()

    if (options && options.cache) { 
      if (isDirSync(options.cache)) {
        this.cache = new PersistentJsonCache(options.cache, packageFactory)
        this.getPackage = withCache(this.cache, this.getPackage)
      } else {
        throw new Error('Invalid cache path provided: not accessible -'+options.cache)
      }
    }
    
  }

  info() {
    return 'ethpkg version: '+ '1.0.0'
  }

  async addRepository(name: string, repo: ConstructorOf<IRepository>) : Promise<void> {
    return this.repoManager.addRepository(name, repo)
  }

  async getRepository(name: string, options: any) : Promise<IRepository | undefined> {
    return this.repoManager.getRepository(name, options)
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
    return releases
  }

  async resolve(spec: PackageQuery, options? : FetchPackageOptions): Promise<IRelease | undefined> {
    const fetcher = new Fetcher(this.repoManager)
    const release = await fetcher.getRelease(spec, options)
    return release
  }

  async fetchPackage(release: IRelease, listener?: StateListener) : Promise<IPackage | undefined> {
    const fetcher = new Fetcher(this.repoManager)
    const buf = await fetcher.downloadPackage(release, listener)
    const pkg = await getPackage(buf, release)
    return pkg
  }

  /**
   * Downloads a package to disk
   * A combination of resolve, fetchPackage and verify. Steps can be specified through download options
   */
  async downloadPackage(pkgSpec: PackageQuery, options? : DownloadPackageOptions) : Promise<IPackage> {
    const release = await this.resolve(pkgSpec, options)
    if (!release) {
      throw new Error(`Package query "${pkgSpec}" could not be resolved`)
    }
    const pkg = await this.fetchPackage(release, options ? options.listener : undefined)
    if (!pkg) {
      throw new Error('Package could not be fetched')
    }

    // TODO if download options verify
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

    if (!options || !options.destPath) {
      return pkg
    }

    let destPath = '.'
    if (options && options.destPath) {
      destPath = path.resolve(options.destPath)
    }

    await pkg.writePackage(destPath)
    return pkg
  }

  /**
   * Creates and returns an IPackage based on a filepath, url, or package specifier
   */
  async getPackage(pkgSpec: PackageQuery | PackageData | FetchPackageOptions, options? : FetchPackageOptions) : Promise<IPackage | undefined> {
    
    if (!pkgSpec) {
      throw new Error('Invalid package specification: empty or undefined')
    }

    // pkgSpec is already available as buffer, File (browser), IPackage or file path => no fetch
    if (instanceOfPackageData(pkgSpec )) {
      return getPackage(pkgSpec)
    }

    // check if the short-hand one argument form is used and extract <PackageQuery>pkgSpec from options before we try to resolve them
    if (instanceofFetchPackageOptions(pkgSpec)) {
      if (options) {
        throw new Error('FetchPackageOptions are provided multiple times')
      }
      if (pkgSpec.spec === undefined) {
        throw new Error('No package specifier provided')
      }
      options = pkgSpec
      pkgSpec = pkgSpec.spec 
    }

    // try to resolve package queries
    if (instanceOfPackageQuery(pkgSpec)) {
      try {
        const pkg = await this.downloadPackage(pkgSpec, options)
        return pkg
      } catch (error) {
        // TODO log error here
        return undefined
      }
    }

    // TODO handle caching
    /*
    if (options && options.cache && fs.existsSync(options.cache)) {
      let cachedData = path.join(options.cache, release.fileName)
      if (fs.existsSync(cachedData)) {
        const pkg = await getPackageFromFile(cachedData)
        pkg.metadata = release
        return pkg
      }
    } 
    */
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
