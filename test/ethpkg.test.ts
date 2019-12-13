import path from 'path'
import { assert } from 'chai'
import ethpkg from '../src/index'

const FOO_DIR = path.join(__dirname, 'fixtures', 'foo')

describe('ethpkg', () => {

  describe('createPackage (contentDirPath : string, pkgOutPath? : string)', () => {
    it ('creates a package from dir', async () => {
      const pkg = await ethpkg.createPackage(FOO_DIR)
      const bar = await pkg.getEntry('bar.txt')
      assert.isDefined(bar)
    })
  })

  describe('findPackage (spec : PackageSpecifier, options? : FetchPackageOptions) : Promise<IRelease | undefined>', () => {
    it ('creates a package from dir', async () => {

    })
  })

  describe('listPackages (spec : PackageSpecifier, options?: FetchOptions)', () => {
    it ('creates a package from dir', async () => {

    })
  })

  describe('getPackage (pkgSpec : PackageSpecifier | Buffer | FetchPackageOptions) : Promise<IPackage | undefined>', () => {
    it ('creates a package from dir', async () => {

    })
  })

  describe('verifyPackage (pkg : IPackage, addressOrEnsName? : string)', () => {
    it ('creates a package from dir', async () => {

    })
  })
  
  describe('downloadPackage (spec : PackageSpecifier, dest : string = ".")', () => {
    it ('creates a package from dir', async () => {

    })
  })
   
  describe('publishPackage (pkgSpec: string | IPackage, repoSpecifier: string = "ipfs")', () => {
    it ('creates a package from dir', async () => {

    })
  })
   

})
