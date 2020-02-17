import fs from 'fs'
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
import { isDirSync, isDirPath, ConstructorOf, isFilePath } from '../util'
import RepositoryManager from '../Repositories/RepositoryManager'
import { isArray } from 'util'
import { StateListener, PROCESS_STATES } from '../IStateListener'
import KeyStore, { PasswordCallback, getPassword } from '../PackageSigner/KeyStore'
import { SignPackageOptions } from '../PackageSigner'
import { KeyFileInfo } from '../PackageSigner/KeyFileInfo'

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
  listener?: StateListener;
  filePath?: string; // if package should be written to disk
  compressed?: boolean;
  overwrite?: boolean; // if existing package should be overwritten
}

export interface GetSigningKeyOptions {
  keyStore?: string; // path where to search for keys
  password?: string | PasswordCallback
  listener?: StateListener,
  alias?: string, // key alias or address
  selectKeyCallback?: (keys: Array<KeyFileInfo>) => Promise<KeyFileInfo>,
}

export interface PublishOptions {
  repo?: string; // ignored - used by package manager to find repo
  listener?: StateListener;
  keyInfo?: GetSigningKeyOptions
}

export interface PackageManagerOptions {
  cache?: string | ICache<ISerializable>
}



export default class PackageManager {

  private cache: ICache<ISerializable> = new NoCache()

  private repoManager: getRepository

  private signers: Array<ISigner> = []

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

  async createPackage(srcDirPathOrName: string, {
    type = 'tar',
    listener = () => {},
    filePath = undefined,
    compressed = true,
    overwrite = false
  }: PackOptions = {}) : Promise<IPackage> {

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
    listener(PROCESS_STATES.CREATE_PACKAGE_FINISHED, { name: pkg.fileName, pkg })

    if(filePath) {
      await pkg.writePackage(filePath, {
        overwrite
      })
    }

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
  private async downloadPackage(release: IRelease, {
    proxy = undefined,
    headers = undefined,
    onDownloadProgress = undefined,
    listener = undefined,
    destPath = undefined,
    extract = false,
    verify = true
  } : DownloadPackageOptions = {}) : Promise<IPackage> {

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

    if (destPath) {
      destPath = path.resolve(destPath)
      if (isDirPath(destPath)) {
        if(!isDirSync(destPath)) {
          // TODO try create dir if non-existent dir path
          fs.mkdirSync(destPath, {
            recursive: true
          })
        }
        destPath = path.join(destPath, release.fileName)
      }
      pkg.filePath = destPath
      await pkg.writePackage(destPath)
      if(pkg.metadata) {
        pkg.metadata.remote = false // indicate that local version is available
      }
    }

    if (extract) {
      if (destPath && isDirSync(destPath)) {
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
  async getPackage(pkgSpec: IRelease | PackageData | PackageQuery | ResolvePackageOptions, options? : ResolvePackageOptions) : Promise<IPackage | undefined> {
    
    if (!pkgSpec) {
      throw new Error('Invalid package specification: empty or undefined')
    } 

    // pkgSpec is already available as buffer, File (browser), IPackage or file path => no fetch
    if (instanceOfPackageData(pkgSpec )) {
      return toPackage(pkgSpec)
    }
    // test for invalid file paths not handled by instanceOfPackageData()
    if(typeof pkgSpec === 'string' && isFilePath(pkgSpec)) {
      if (!fs.existsSync(pkgSpec)){
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
        return undefined
      }
    } 

    // download IRelease if it does not exist in cache
    if (instanceOfIRelease(pkgSpec)) {

      const release : IRelease = pkgSpec

      // TODO write tests
      if (options && options.cache && fs.existsSync(options.cache)) {

        let cachedData = path.join(options.cache, release.fileName)
        if (fs.existsSync(cachedData)) {
          const pkg = await toPackage(cachedData)
          pkg.metadata = release
          pkg.filePath = cachedData
          pkg.metadata.remote = false // indicate that it was loaded from cache
          return pkg
        }
      }

      const pkg = await this.downloadPackage(release, options)

      if(pkg.metadata && options && options.cache) {
        fs.writeFileSync(path.join(options.cache, `${pkg.fileName}.json`), JSON.stringify(pkg.metadata))
      }

      return pkg
    }

    throw new Error(`Unsupported input type for package: "${pkgSpec}"`)
  }

  /**
   * Helps to select or create a designated signing key
   */
  async getSigningKey({
    keyStore = undefined,
    password = undefined,
    listener = () => {},
    alias = undefined, // TODO alias = address is not handled
    selectKeyCallback = undefined,
  } : GetSigningKeyOptions = {}) : Promise<Buffer> {

    // TODO move to PackageSigner
    const keystore = new KeyStore(keyStore)
    const keys = await keystore.listKeys()

    // create new key
    if (keys.length === 0) {
      const { info, key } = await keystore.createKey({
        password,
        listener
      })
      // TODO allow user to backup key
      let privateKey = key.getPrivateKey()
      return privateKey
    } 

    let selectedKey
    if (keys.length > 1) {
      if (alias) {
        listener(PROCESS_STATES.FINDING_KEY_BY_ALIAS_STARTED, { alias })
        selectedKey = await keystore.getKeyByAlias(alias)
        listener(PROCESS_STATES.FINDING_KEY_BY_ALIAS_FINISHED, { alias, key: selectedKey })
      }
      if (!selectedKey && typeof selectKeyCallback === 'function') {
        selectedKey = await (<Function>selectKeyCallback)(keys)
      } 
      if (!selectedKey) {
        throw new Error('Ambiguous signing keys and no select callback or alias provided')
      }
    }

    password = await getPassword(password)
    const unlockedKey = await keystore.unlockKey(selectedKey, password, listener)
    return unlockedKey
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
  async signPackage(pkg: PackageData, privateKey: Buffer /*| ISigner*/, options?: SignPackageOptions) : Promise<IPackage> {
    // TODO support all package specifier options that this.getPackage supports
    return PackageSigner.sign(pkg, privateKey, options)
  }

  async verifyPackage(pkg: PackageData, addressOrEnsName? : string) : Promise<IVerificationResult> {
    return PackageSigner.verify(pkg, addressOrEnsName)
  }

  /**
   * 
   */
  async publishPackage(pkgSpec: string | PackageData, {
    repo = 'ianu',
    listener = () => {},
    keyInfo = undefined
  } : PublishOptions = {}) {

    const repository = await this.repoManager.getRepository(repo)
    if (!repository) {
      throw new Error(`Repository not found for specifier: "${repo}"`)
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

    /*
    const privateKey = await this.getSigningKey(keyInfo)
    pkg = await this.signPackage(pkg, privateKey, {
      listener
    })
    */

    if (typeof repository.publish !== 'function') {
      throw new Error('Repository does not implement publish')
    }
    const result = await repository.publish(pkg, {
      listener
    })
    return result
  }
}
