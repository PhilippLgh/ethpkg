import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import IpfsRepository from './Ipfs'
import TarPackage from '../PackageManager/TarPackage'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const UNSIGNED_FOO_TAR = path.join(FIXTURES, 'foo.tar.gz')
const SIGNED_FOO_TAR = path.join(FIXTURES, 'foo_signed.tar.gz')

describe('IPFS', function() {

  this.timeout(120 * 1000)

  describe.skip('async listReleases(options? : FetchOptions): Promise<IRelease[]> ', function() {
    it('fetches a list of releases published to ipfs', async () => {
      const ipfs = new IpfsRepository()
      const releases = await ipfs.listReleases()
      // console.log('releases', releases)
      assert.equal(releases.length, 1)
    })
  })

  describe('async publish(pkg: IPackage)', function() {
    it('publishes a package', async () => {
      const ipfs = new IpfsRepository()
      const pkg = await TarPackage.from(UNSIGNED_FOO_TAR)
      const result = await ipfs.publish(pkg)
      console.log('package published', result)
      assert.isDefined(result)
    })
  })

})