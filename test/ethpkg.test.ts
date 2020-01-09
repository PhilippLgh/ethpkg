import path from 'path'
import { assert } from 'chai'
import ethpkg from '../src/index'
import { IRelease } from '../src/Repositories/IRepository'

const FOO_DIR = path.join(__dirname, 'fixtures', 'foo')

const packageSpec = 'github:ethereum/grid-ui'

describe.skip('ethpkg', () => {

  describe('createPackage (contentDirPath : string, pkgOutPath? : string)', () => {
    it ('creates a package from dir', async () => {
      const pkg = await ethpkg.createPackage(FOO_DIR)
      const bar = await pkg.getEntry('bar.txt')
      assert.isDefined(bar)
    })
  })

  describe('findPackage (spec : PackageSpecifier, options? : FetchPackageOptions) : Promise<IRelease | undefined>', () => {
    it ('fetches the package metadata for a specific release as IRelease', async () => {
      // TODO support fs repo for sync tests
      //const pkg = await ethpkg.findPackage('fs:./fixtures/@<1.3')
      // TODO support this form as well
      /*
        {
          repo: 'fs',
          project: './fixtures/',
          version: '<1.3'
        }
      */
      /*
      // TODO test these options
      export interface FetchPackageOptions {
      spec?: string, // FIXME make required
      version?: string;
      platform?: string;
      listener?: StateListener

      cache?: string;

      // pass-through for FetchOptions
      filter?: (release: IRelease) => boolean; // custom filter logic
      semverFilter?: string // version or version range that should be returned
      prefix? : string // server-side processed name- / path-filter. default: undefined
      timeout? : number // time in ms for request timeouts.
      skipCache? : boolean // if cached files should be ignored. default: false 
      pagination?: boolean | number // is pagination should be used and number of pages
      limit?: number // number of results
      }
      */
      // TODO use versioned-specifier
      const release = await ethpkg.findPackage(packageSpec)
      assert.isDefined(release)
    })
  })

  describe('listPackages (spec : PackageSpecifier, options?: FetchOptions) : Promise<Array<IRelease>>', () => {
    it ('fetches the package metadata for all releases as IRelease[]', async () => {
      // TODO test options
      const releases = await ethpkg.listPackages(packageSpec)
      assert.equal(releases.length, 30)
    })
  })

  describe('getPackage (pkgSpec : PackageSpecifier | Buffer | FetchPackageOptions) : Promise<IPackage | undefined>', () => {
    it ('downloads the actual package as IPackage object in memory', async () => {
      const pkg = await ethpkg.downloadPackage('github:ethereum/grid-ui@1.6.0')
      assert.isDefined(pkg)
      const pkgJsonBuf = await pkg.getContent('package.json')
      const pkgJson = JSON.parse(pkgJsonBuf.toString())
      assert.equal(pkgJson.version, '1.6.0')
    })
  })

  describe.skip('signPackage(pkgSrc: string | Buffer, privateKey? : Buffer | ISigner, pkgPathOut? : string) : Promise<IPackage | undefined>', () => {
    it ('signs an unsigned package', async () => {

    })
  })

  describe.skip('verifyPackage (pkg : IPackage, addressOrEnsName? : string) : Promise<IVerificationResult>', () => {
    it ('verifies a package signature', async () => {

    })
  })
  
  describe.skip('downloadPackage (spec : PackageSpecifier, dest : string = ".")', () => {
    it ('does something', async () => {

    })
  })
   
  describe.skip('publishPackage (pkgSpec: string | IPackage, repoSpecifier: string = "ipfs")', () => {
    it ('does something', async () => {

    })
  })

})
