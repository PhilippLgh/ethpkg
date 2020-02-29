import path from 'path'
import fs from 'fs'
import { assert } from 'chai'
import { IRelease, IRepository, FetchOptions } from '../Repositories/IRepository'
import PackageManager from './PackageManager'
import TarPackage from './TarPackage'
import ISigner from '../PackageSigner/ISigner'
import { getSignatureEntriesFromPackage } from '../PackageSigner/SignerUtils'
import { MemCache } from './Cache'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const UNSIGNED_FOO_TAR = path.join(FIXTURES, 'foo.tar.gz')
const PACKAGE_URL = 'https://github.com/ethereum/grid-ui/releases/download/v1.6.0-master_1569996211/grid-ui_1.6.0_master.zip'
const REPOSITORY_URL = 'https://github.com/ethereum/grid-ui'
const PACKAGE_QUERY_LATEST = 'github:ethereum/grid-ui'
const LATEST_VERSION = '1.6.1'

const PRIVATE_KEY_1 = Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex')
const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

describe('PackageManager', () => {
  describe('constructor(options?: any) {}', function(){
    describe('options.cache', () => {
      it('creates a persistent cache when passed a directory path', async () => {

      })
    })
  })
  describe('IRepository extensibility', function() {
    class TestRepo implements IRepository {
      name: string = 'TestRepo'       
      async listReleases(options?: FetchOptions): Promise<IRelease[]> {
        return [{ fileName: 'a' }, { fileName: 'b' }]
      }
    }
    let pm : PackageManager
    before(() => {
      pm = new PackageManager()
    })
    describe('async addRepository(name: string, repo: ConstructorOf<IRepository>) : Promise<void>', function(){  
      it('adds a custom repository implementation to extend backend support', async () => {
        await pm.addRepository('test', TestRepo)
        const releases = await pm.listPackages('test:testOwner/testProject', {
          filterInvalid: false
        })
        assert.equal(releases.length, 2)
      })
    })
    describe('async getRepository(name: string) : Promise<IRepository | undefined>', function(){
      it('creates a new instance of the IRepository implementation registered with <name>', async () => {
        const repo = await pm.getRepository('test', {})
        if(!repo) {
          return assert.fail()
        }
        const releases = await repo.listReleases()
        assert.equal(releases.length, 2)
      })
    })
    describe('async listRepositories() : Promise<Array<string>>', function(){
      it('lists all the names of available repositories', async () => {
        const repoNames = await pm.listRepositories()
        assert.equal(repoNames.length, 6)
        assert.includeMembers(repoNames, ['github', 'test'])
      })
    })
    describe('async removeRepository(prefix: string) : Promise<boolean>', function(){
      it('removes a repository', async () => {
        await pm.removeRepository('test')
        // should throw:
        pm.listPackages('test:testOwner/testProject')
          .then(() => {
            assert.fail()
          })
          .catch((err) => {
            assert.isDefined(err)
          })
      })
    })
  })

  describe('info()', function() {
    it('display some basic info about this library', () => {
      assert.isDefined(new PackageManager().info())
    })
  })

  describe('async clearCache() : Promise<void>', function(){
    this.timeout(60*1000)
    it('removes all saved data (http responses, packages) from cache', async () => {
      // pre-condition: cache dir is empty
      const CACHE_PATH = path.join(FIXTURES, 'cache')
      let files = fs.readdirSync(CACHE_PATH)
      // TODO assert.equal(files.length, 1) // should contain only the invalid file
      const pm = new PackageManager({
        cache: CACHE_PATH
      })
      let p = await pm.getPackage('github:ethereum/grid-ui')
      console.log('p', p)
      files = fs.readdirSync(CACHE_PATH)
      assert.equal(files.length, 2)
      
      const pkg = await pm.getPackage('github:ethereum/grid-ui')
      if (!pkg) {
        return assert.fail()
      }
      const entries = await pkg.getEntries()
      console.log('valid pkg?', entries.map(e => e.relativePath))
      console.log('index', (await pkg.getContent('index.html')).toString())
      await pm.clearCache()
      files = fs.readdirSync(CACHE_PATH)
      assert.equal(files.length, 1)
    })
  })

  describe('async createPackage(srcDirPathOrName: string, options?: PackOptions) : Promise<IPackage>', function(){
    const FOO_DIR = path.join(FIXTURES, 'foo')
    const FOO_NESTED_DIR = path.join(FIXTURES, 'foo_nested')
    it('creates a new package (default: tar) in memory with the contents of srcDirPath', async () => {
      const pm = new PackageManager()
      const pkg = await pm.createPackage(FOO_DIR)
      assert.isDefined(pkg)
      const foo = await pkg.getContent('foo.txt')
      assert.equal(foo.toString(), 'foo')
    })
    it('creates an empty package', async () => {
      const pm = new PackageManager()
      const pkg = await pm.createPackage(FOO_DIR)
      assert.isDefined(pkg)
      const foo = await pkg.getContent('foo.txt')
      assert.equal(foo.toString(), 'foo')
    })
    it('recursively packs nested directories in tar packages', async () => {
      const pm = new PackageManager()
      const pkg = await pm.createPackage(FOO_NESTED_DIR)
      assert.isDefined(pkg)
      const baz = await pkg.getContent('baz/baz.txt')
      assert.equal(baz.toString(), 'baz')
    })
    it('recursively packs nested directories in zip packages', async () => {
      const pm = new PackageManager()
      const pkg = await pm.createPackage(FOO_NESTED_DIR, {
        type: 'zip'
      })
      assert.isDefined(pkg)
      const baz = await pkg.getContent('baz/baz.txt')
      assert.equal(baz.toString(), 'baz')
    })
    it.skip('handles packages in subfolders by including them', () => {})
    it('throws if srcDirPath is not a valid dir path', async () => {
      const pm = new PackageManager()
      await pm.createPackage('').then(() => {
        assert.fail()
      }).catch(err => {
        assert.isDefined(err)
      })
    })
    it.skip('supports glop patterns', () => {})
    it.skip('detects .npmignore files', () => {})
    it.skip('writes the package to disk if a valid outPath is provided', () => {})
  })

  describe('async listPackages(spec: PackageQuery, options?: FetchOptions) : Promise<Array<IRelease>>', function(){
    this.timeout(60 * 1000)
    it('lists all available & valid packages for a given PackageQuery', async () => {
      const pm = new PackageManager()
      const packages = await pm.listPackages('github:ethereum/grid-ui')
      // TODO mock http
      assert.equal(packages.length, 30)
    })
    it('lists packages for repo urls ', async () => {
      const gethStore = 'https://gethstore.blob.core.windows.net'
      const releases = await new PackageManager().listPackages(gethStore)
      assert.isTrue(releases.length > 100)      
    })
    it('includes packages from a user defined cache path ', async () => {
           
    })
    // TODO usage of fetch options
  })

  describe('async resolve(spec: PackageQuery, options?: ResolvePackageOptions): Promise<IRelease | undefined>', function() {
    it('resolves a PackageQuery to a specific release - this fetches only metadata and not the package itself', async () => {
      const pm = new PackageManager()
      const release = await pm.resolve(PACKAGE_QUERY_LATEST)
      assert.isDefined(release)
      assert.equal((<IRelease>release).version, '1.6.1')
    })
    it('returns undefined if non of the packages matches', async () => {
      const pm = new PackageManager()
      // version > latest should not be possible
      const release = await pm.resolve('github:ethereum/grid-ui@>=1.6.2')
      assert.isUndefined(release)
    })
    it('can be wrapped with a mem-cache', async () => {
      const cache = new MemCache()
      const pm = new PackageManager({
        cache
      })
      const release = await pm.resolve('github:ethereum/grid-ui@>=1.6.1')
      const key = (cache.keys())[0]
      const cached = await cache.get(key)
      assert.deepEqual(release, cached)
    })
    it('can be wrapped with a persistent cache', async () => {
      const CACHE_PATH = path.join(FIXTURES, 'TestCache2')
      const pm = new PackageManager({
        cache: CACHE_PATH
      })
      const release = await pm.resolve('github:ethereum/grid-ui@>=1.6.1')
      // assert.deepEqual(release, cached)
    })
  })

  /* TODO remove
  describe('async fetchPackage(release: IRelease, options?: DownloadPackageOptions) : Promise<IPackage | undefined>', function() {
    this.timeout(60 * 1000)
    it('fetches the package data (e.g. release asset on github) for a given IRelease', async () => {
      const pm = new PackageManager()
      const release = await pm.resolve(PACKAGE_QUERY_LATEST)
      if (!release) {
        return assert.fail()
      }
      const pkg = await pm.fetchPackage(release)
      assert.isDefined(pkg)
    })
  })

  describe('async downloadPackage(pkgSpec: PackageQuery, dest: string = ".") : Promise<IPackage>', function() {
    this.timeout(60 * 1000)
    it('downloads a package to disk', () => {
      
    })
    it('allows to specify a proxy server to avoid cors issues during package download in the browser', async () => {
      const pkg = await new PackageManager().downloadPackage('github:ethereum/grid-ui', {
        proxy: 'https://cors-anywhere.herokuapp.com/',
        // proxy will block requests not coming from browser -> sorry
        headers: {
          Origin: null,
          'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G960F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36'
        }
      })
      assert.isDefined(pkg)
    })
  })
  */

  describe('async getPackage(pkgSpec: PackageQuery | PackageData | ResolvePackageOptions, options? : ResolvePackageOptions) : Promise<IPackage | undefined>', function(){
    this.timeout(60*1000)
    it('accepts an IPackage as pkgSpec (pass-through)', async () => {
      const pkg = await TarPackage.from(UNSIGNED_FOO_TAR)
      const pkg2 = await  new PackageManager().getPackage(pkg)
      if(pkg2 === undefined) {
        return assert.fail()
      }
      const content = await pkg2.getContent('./foo/foo.txt')
      assert.equal(content.toString(), 'foo')
    })
    it('accept a Buffer as pkgSpec', async () => {
      const pkgBuf = fs.readFileSync(UNSIGNED_FOO_TAR)
      const pkg = await  new PackageManager().getPackage(pkgBuf)
      if(pkg === undefined) {
        return assert.fail()
      } 
      const content = await pkg.getContent('./foo/foo.txt')
      assert.equal(content.toString(), 'foo')
    })
    it('accepts a string / file path as pkgSpec', async () => {
      const pkg = await new PackageManager().getPackage(UNSIGNED_FOO_TAR)
      if(pkg === undefined) {
        return assert.fail()
      } 
      const content = await pkg.getContent('./foo/foo.txt')
      assert.equal(content.toString(), 'foo')
    })
    it('accepts a string / repository URL as pkgSpec', async () => {
      const pkg = await new PackageManager().getPackage(REPOSITORY_URL)
      if(pkg === undefined) {
        return assert.fail()
      }
      assert.isDefined(pkg.metadata)
      if (!pkg.metadata) {
        return assert.fail()
      }
      assert.equal(pkg.metadata.version, LATEST_VERSION)
    })
    it('accepts a string / package URL as pkgSpec', async () => {
      const pkg = await new PackageManager().getPackage(PACKAGE_URL)
      if(pkg === undefined) {
        return assert.fail()
      }
      assert.isDefined(pkg.metadata)
      if (!pkg.metadata) {
        return assert.fail()
      }
      assert.equal(pkg.metadata.version, '1.6.0')
    })
    it('accepts a string / PackageQuery as pkgSpec', async () => {
      const pkg = await new PackageManager().getPackage(PACKAGE_QUERY_LATEST)
      if(pkg === undefined) {
        return assert.fail()
      } 
      const index = await pkg.getContent('index.html')
      assert.isDefined(index)
    })
    it.only('downloads a workflow package', async () => {
      const pkg = await new PackageManager().getPackage('ianu:0x585c34f863e4064bdefa52305e3e7c89d39f98cf/foo-1.0.0.tar')
      if(pkg === undefined) {
        return assert.fail()
      } 
      const index = await pkg.getContent('index.js')
      assert.isDefined(index)
    })
    it('accepts an IRelease as pkgSpec', () => {

    })
    it('accepts a state listener to listen for e.g. download progress changes', () => {

    })
    it('has a short form which accepts a single ResolvePackageOptions object', async () => {
      const pkg = await new PackageManager().getPackage({
        spec: 'github:ethereum/grid-ui',
        version: '1.6.0'
      })
      if(pkg === undefined) {
        return assert.fail()
      }
      if (!pkg.metadata) {
        return assert.fail()
      }
      assert.equal(pkg.metadata.version, '1.6.0')
    })
    it('accepts a proxy server to avoid cors issues during package download in the browser', async () => {
      const pkg = await new PackageManager().getPackage('github:ethereum/grid-ui', {
        proxy: 'https://cors-anywhere.herokuapp.com/',
        // proxy will block requests not coming from browser
        headers: {
          Origin: null,
          'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G960F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36'
        }
      })
      assert.isDefined(pkg)
    })
    it('tries to create the download directory if it doesn\'t exist yet', () => {
      
    })
    it('can extract all package contents to disk test tar+zip', () => {

    })
  })

  describe('ISigner extensibility', function() {
    class MySigner implements ISigner {
      type: string = 'ISigner'
      name: string = 'MySigner'
      ecSign(msg: Buffer) : Promise<Buffer> {
        throw new Error('not implemented')
      }
      ethSign(msg: Buffer) : Promise<Buffer> {
        throw new Error('not implemented')
      }
      getAddress() : Promise<string> {
        throw new Error('not implemented')
      }
    }
    describe('async addSigner(signer: ISigner) : Promise<void>', function() {
      it('adds an ISigner implementation', async () => {
        await new PackageManager().addSigner(new MySigner())
      })
    })

    describe('async listSigners() : Promise<Array<string>>', function() {
      it('lists all available signers', async () => {
        const signers = await new PackageManager().listSigners()
        assert.lengthOf(signers, 3) // metamask, geth, private key
      })
    })

    describe('async getSigner(name: string) : Promise<ISigner | undefined>', function() {
      it('returns the signer with <name>', async () => {
        const signer = await new PackageManager().getSigner('geth')
        assert.isDefined(signer)
      })
    })
  })

  describe('async signPackage(pkg: PackageData, privateKey: Buffer, pkgPathOut? : string) : Promise<IPackage>', function() {
    it('signs an unsigned local package using a private key', async () => {
      const pm = new PackageManager()
      const signed = await pm.signPackage(UNSIGNED_FOO_TAR, PRIVATE_KEY_1)
      // TODO const signatures = await signed.getSignatures()
      const signatures = await getSignatureEntriesFromPackage(signed)
      assert.lengthOf(signatures, 1)
    })
    it.skip('signs an unsigned local package using an ISigner', async () => {

    })
  })

  describe('async verifyPackage(pkg : IPackage, addressOrEnsName? : string) : Promise<IVerificationResult>', function() {
    it('verifies a signed package', async () => {
      const pm = new PackageManager()
      const signed = await pm.signPackage(UNSIGNED_FOO_TAR, PRIVATE_KEY_1)
      const verificationResult = await pm.verifyPackage(signed)
      assert.isTrue(verificationResult.isValid)
      assert.isFalse(verificationResult.isTrusted, 'without public key info the package cannot be trusted')
    })
    it('verifies a signed package against a trusted public key', async () => {
      const pm = new PackageManager()
      const signed = await pm.signPackage(UNSIGNED_FOO_TAR, PRIVATE_KEY_1)
      const verificationResult = await pm.verifyPackage(signed, { addressOrEnsName: ETH_ADDRESS_1 })
      assert.isTrue(verificationResult.isValid)
      assert.isTrue(verificationResult.isTrusted)
    })
  })

  describe('async publishPackage(pkgSpec: PackageData, repoSpecifier: string = "ipfs")', function() {
    it('publishes a local package to an IRepository', () => {
      
    })
  })

})
