import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import EthpkgRepo from './EthpkgRepo'
import PackageManager from '../PackageManager/PackageManager'
import { fail } from 'assert'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const UNSIGNED_FOO_TAR = path.join(FIXTURES, 'foo.tar.gz')
const SIGNED_FOO_TAR = path.join(FIXTURES, 'foo_signed.tar.gz')

describe.skip('EthpkgRepo', function() {

  this.timeout(120 * 1000)

  describe('async listReleases(options? : FetchOptions): Promise<IRelease[]> ', function() {
    it('does something', async () => {
      const ethpkgRepo = new EthpkgRepo({ owner: 'ethereum' })
      const releases = await ethpkgRepo.listReleases()
      // console.log('releases', releases)
      assert.equal(releases.length, 7)
    })
  })

  describe.skip('publish(pkg: IPackage)', function() {
    it('publishes a package', async () => {
      const pm = new PackageManager()
      const pkg = await pm.getPackage(UNSIGNED_FOO_TAR)
      if (!pkg) {
        fail('could not load package')
      }
      const ethpkgRepo = new EthpkgRepo({ })
      const result = await ethpkgRepo.publish(pkg)
      console.log('package published', result)
      assert.isDefined(result)
    })
  })

})