import fs from 'fs'
import path from 'path'
import { IPackage, instanceofIPackage } from './IPackage'

import Fetcher from '../Fetcher'
import * as PackageSigner from '../PackageSigner'
import { IRelease, FetchOptions, IRepository, instanceOfIRelease, Credentials, RepositoryConfig } from '../Repositories/IRepository'
import { ResolvePackageOptions, instanceofResolvePackageOptions, PackageQuery, instanceOfPackageQuery, DownloadPackageOptions } from '../Fetcher/Fetcher'
import getRepository from '../Repositories/RepositoryManager'
import { IVerificationResult } from '../IVerificationResult'
import ISigner from '../PackageSigner/ISigner'
import { toPackage, PackageData, instanceOfPackageData } from './PackageService'
import { withCache, MemCache, PersistentJsonCache, ICache, NoCache, instanceOfICache } from './Cache'
import { SerializationInfo, ISerializable } from './ISerializable'
import TarPackage from './TarPackage'
import ZipPackage from './ZipPackage'
import { isDirSync, isDirPath, ConstructorOf, isFilePath } from '../util'
import RepositoryManager from '../Repositories/RepositoryManager'
import { isArray } from 'util'
import { StateListener, PROCESS_STATES } from '../IStateListener'
import KeyStore, { PasswordCallback, getPassword, GetKeyOptions } from '../PackageSigner/KeyStore'
import { SignPackageOptions, VerifyPackageOptions, isSigned } from '../PackageSigner'
import { KeyFileInfo } from '../PackageSigner/KeyFileInfo'
import { getExtension } from '../utils/FilenameUtils'
import SignerManager from '../Signers/SignerManager'

// browser / webpack support
if (!fs.existsSync) {
  fs.existsSync = () => false
}

// we need to tell th ecahe how to restore persisted objects
const packageFactory = async (info: SerializationInfo): Promise<IPackage | undefined> => {
  const { ctor, data } = info
  if (ctor === undefined) {
    return undefined
  }
  if (!data) {
    return data
  }
  if (ctor === 'Object') {
    return data
  }
  // FIXME restore fileName
  else if (ctor === 'ZipPackage') {
    const { filePath, buffer, metadata } = data
    const pkg = await new ZipPackage(filePath).loadBuffer(buffer)
    pkg.metadata = metadata
    return pkg
  }
  else if (ctor === 'TarPackage') {
    const { filePath, buffer, metadata } = data
    const pkg = await new TarPackage(filePath).loadBuffer(buffer)
    pkg.metadata = metadata
    return pkg
  }
  else {
    throw new Error('De-serialization error: unknown ctor' + ctor)
  }
}

export interface PackOptions {
  type?: string;
  listener?: StateListener;
  filePath?: string; // if package should be written to disk
  fileName?: string; // if package created from dirPath overwrite default fileName
  compressed?: boolean;
  overwrite?: boolean; // if existing package should be overwritten
}

export interface PublishOptions {
  repository?: string | RepositoryConfig; // ignored - used by package manager to find repo
  listener?: StateListener;
  signPackage?: boolean;
  keyInfo?: GetKeyOptions;
  credentials?: Credentials
}

export interface PackageManagerOptions {
  cache?: string | ICache<ISerializable>
}

export default class PackageManager {

  private cache: ICache<ISerializable> = new NoCache()

  private repoManager: getRepository

  private signerManager: SignerManager

  constructor(options?: PackageManagerOptions) {

    this.repoManager = new RepositoryManager()
    this.signerManager = new SignerManager()

    let cacheInit = false
    if (options && options.cache) {
      if (instanceOfICache(options.cache)) {
        this.cache = options.cache
        cacheInit = true
      }
      else if (isDirSync(options.cache)) {
        this.cache = new PersistentJsonCache(options.cache, packageFactory)
        cacheInit = true
      }
      else {
        throw new Error('Invalid cache path provided: not accessible -' + options.cache)
      }
    }

    if (cacheInit) {
      this.resolve = withCache(this.cache, this.resolve.bind(this), (spec: PackageQuery) => `resolve:${spec}`)
      this.getPackage = withCache(this.cache, this.getPackage.bind(this))
    }

  }

  info() {
    return 'ethpkg version: ' + require('../../package.json').version
  }

  async addRepository(name: string, repo: ConstructorOf<IRepository>): Promise<void> {
    return this.repoManager.addRepository(name, repo)
  }

  async getRepository(name: string): Promise<IRepository | undefined> {
    return this.repoManager.getRepository(name)
  }

  async listRepositories(): Promise<Array<string>> {
    return this.repoManager.listRepositories()
  }

  async removeRepository(name: string): Promise<boolean> {
    return this.repoManager.removeRepository(name)
  }

  async clearCache(): Promise<void> {
    if (this.cache) {
      await this.cache.clear()
    }
  }

  async createPackage(srcDirPathOrName: string, {
    type = 'tar',
    listener = () => { },
    filePath = undefined,
    fileName = undefined,
    compressed = true,
    overwrite = false
  }: PackOptions = {}): Promise<IPackage> {

    const createPackageOptions = {
      listener: listener,
      compress: true
    }

    listener(PROCESS_STATES.CREATE_PACKAGE_STARTED)
    // TODO determine the package type e.g zip / tar based on out path
    let pkg
    if (type === 'zip') {
      pkg = await ZipPackage.create(srcDirPathOrName, createPackageOptions)
    } else {
      pkg = await TarPackage.create(srcDirPathOrName, createPackageOptions)
    }
    if (fileName) {
      const ext = getExtension(pkg.fileName)
      pkg.fileName = `${fileName}${ext}`
    }
    listener(PROCESS_STATES.CREATE_PACKAGE_FINISHED, { name: pkg.fileName, pkg })

    if (filePath) {
      await pkg.writePackage(filePath, {
        overwrite
      })
    }

    return pkg
  }

  async listPackages(spec: PackageQuery, options?: FetchOptions): Promise<Array<IRelease>> {
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

  async resolve(spec: PackageQuery, options?: ResolvePackageOptions): Promise<IRelease | undefined> {
    const fetcher = new Fetcher(this.repoManager)
    const release = await fetcher.getRelease(spec, options)
    return release
  }

  /**
   * Downloads a package to disk
   * A combination of resolve, fetchPackage and verify. Steps can be specified through download options
   */
  private async downloadPackage(release: IRelease, {
    proxy = undefined,
    headers = undefined,
    onDownloadProgress = undefined,
    listener = undefined,
    destPath = undefined,
    extract = false,
    verify = true
  }: DownloadPackageOptions = {}): Promise<IPackage> {

    const fetcher = new Fetcher(this.repoManager)
    const buf = await fetcher.downloadPackage(release, {
      proxy,
      headers,
      onDownloadProgress,
      listener
    })
    const pkg = await toPackage(buf, release) // != this.getPackage

    // TODO if download options verify
    if (verify) {
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

    // make sure destPath exists and is dir
    if (destPath) {
      destPath = path.resolve(destPath)
      // FIXME handle destPath = full file path: path/to/file/my-name.tar
      if (isDirPath(destPath)) {
        if (!isDirSync(destPath)) {
          // TODO try create dir if non-existent dir path
          fs.mkdirSync(destPath, {
            recursive: true
          })
        } else {
          destPath: undefined // invalid: reset
        }
      }
    }

    if (destPath && isDirSync(destPath)) {
      // don't overwrite extract dest path
      let _pkgDestPath = path.join(destPath, release.fileName)
      pkg.filePath = _pkgDestPath
      await pkg.writePackage(_pkgDestPath)
      if (pkg.metadata) {
        pkg.metadata.remote = false // indicate that local version is available
      }

      if (extract) {
        await pkg.extract(destPath, {
          listener
        })
        // TODO stateListener(PROCESS_STATES.EXTRACT_FINISHED, { location, size: packageData.length, release })
      }

    }


    return pkg
  }

  /**
   * Creates and returns an IPackage based on a filepath, url, or package specifier
   */
  async getPackage(pkgSpec: IRelease | PackageData | PackageQuery | ResolvePackageOptions, options?: ResolvePackageOptions): Promise<IPackage | undefined> {
    if (!pkgSpec) {
      throw new Error('Invalid package specification: empty or undefined')
    }

    // pkgSpec is already available as buffer, File (browser), IPackage or file path => no fetch
    if (instanceOfPackageData(pkgSpec)) {
      return toPackage(pkgSpec)
    }
    // test for invalid file paths not handled by instanceOfPackageData()
    if (typeof pkgSpec === 'string' && isFilePath(pkgSpec)) {
      if (!fs.existsSync(pkgSpec)) {
        throw new Error(`Path does not point to valid package: "${pkgSpec}"`)
      }
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
        // console.log('resolved to', release)
        if (!release) {
          throw new Error(`Package query "${pkgSpec}" could not be resolved`)
        }
        pkgSpec = release
      } catch (error) {
        // TODO log error here
        // console.log('error during download', error)
        throw error
      }
    }

    // download IRelease if it does not exist in cache
    if (instanceOfIRelease(pkgSpec)) {
      const release: IRelease = pkgSpec
      let cachedDataPath = (options && options.cache) ? path.join(options.cache, release.fileName) : undefined
      // TODO write tests
      if (options && options.cache && fs.existsSync(options.cache)) {
        if (cachedDataPath && fs.existsSync(cachedDataPath)) {
          const pkg = await toPackage(cachedDataPath)
          pkg.metadata = release
          pkg.filePath = cachedDataPath
          pkg.metadata.remote = false // indicate that it was loaded from cache
          return pkg
        }
      }

      // if cache is provided but no explicit download path we still download to cache
      if (options && !options.destPath && options.cache) {
        options.destPath = options.cache
      }
      const pkg = await this.downloadPackage(release, options)

      if (pkg.metadata && options && options.cache) {
        fs.writeFileSync(path.join(options.cache, `${pkg.fileName}.json`), JSON.stringify(pkg.metadata))
      }

      return pkg
    }

    throw new Error(`Unsupported input type for package: "${pkgSpec}"`)
  }

  /**
   * Helps to select or create a designated signing key
   // path where to search for keys
   */
  async getSigningKey(options: GetKeyOptions = {}): Promise<Buffer> {
    const _keyStore = new KeyStore(options.keyStore)
    return _keyStore.getKey(options)
  }

  async listKeys() {
    const _keyStore = new KeyStore()
    return _keyStore.listKeys()
  }

  async addSigner(name: string, signer: ISigner): Promise<void> {
    this.signerManager.addSigner(name, signer)
  }

  async listSigners(): Promise<Array<string>> {
    return this.signerManager.listSigners()
  }

  async getSigner(name: string): Promise<ISigner | undefined> {
    return this.signerManager.getSigner(name)
  }

  /**
   * Signs a package or directory
   */
  async signPackage(pkg: PackageData, privateKey: Buffer | ISigner, options?: SignPackageOptions): Promise<IPackage> {
    // TODO support all package specifier options that this.getPackage supports
    return PackageSigner.sign(pkg, privateKey, options)
  }

  async verifyPackage(pkg: PackageData, options?: VerifyPackageOptions): Promise<IVerificationResult> {
    return PackageSigner.verify(pkg, options)
  }

  /**
   * 
   */
  async publishPackage(pkgSpec: string | PackageData, {
    repository = undefined,
    listener = () => { },
    signPackage = undefined,
    keyInfo = undefined,
    credentials = undefined
  }: PublishOptions = {}) {

    if (!repository) {
      throw new Error('No repository specified for upload')
    }
    const repo = await this.repoManager.getRepository(repository)
    if (!repo) {
      throw new Error(`Repository not found for specifier: "${JSON.stringify(repository)}"`)
    }

    let pkg
    if (typeof pkgSpec === 'string' && isDirSync(pkgSpec)) {
      pkg = await this.createPackage(pkgSpec, {
        listener
      })
    } else {
      pkg = await this.getPackage(pkgSpec, {
        listener
      })
    }
    if (!pkg) {
      throw new Error('Package not found or could not be created')
    }

    // default to signing for unsigned packages
    const _isSigned = await isSigned(pkg)
    signPackage = (typeof signPackage === undefined) ? !_isSigned : signPackage
    if (signPackage) {
      if (!keyInfo) {
        throw new Error('Cannot sign package without keys')
      }
      keyInfo.listener = listener
      const privateKey = await this.getSigningKey(keyInfo)
      pkg = await this.signPackage(pkg, privateKey, {
        listener
      })
    }

    if (credentials && typeof repo.login === 'function') {
      listener(PROCESS_STATES.REPOSITORY_LOGIN_STARTED)
      const isLoggedIn = await repo.login(credentials)
      listener(PROCESS_STATES.REPOSITORY_LOGIN_FINISHED, { isLoggedIn: !!isLoggedIn })
    }

    if (typeof repo.publish !== 'function') {
      throw new Error(`Repository "${repository}" does not implement publish`)
    }
    const result = await repo.publish(pkg, {
      listener
    })
    return result
  }
}
