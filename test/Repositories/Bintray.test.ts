
import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import Bintray from '../../src/Repositories/Bintray'
import nock from 'nock'
import { download } from '../../src/Downloader'

const releaseResponsePath = path.join(__dirname, '..', 'fixtures', 'ServerResponses', 'Bintray', 'bintrayReleases.json')

const prepareFixture = async () => {
  const data = await download('https://api.bintray.com/packages/hyperledger-org/besu-repo/besu/files')
  fs.writeFileSync(releaseResponsePath, data.toString())
  console.log('fixture data written')
}

describe("Bintray", function() {

  this.timeout(120 * 1000)

  it.skip('prepare fixture data', async () => {
    await prepareFixture()
  })

  const mockResponse = fs.readFileSync(releaseResponsePath)

  const scope = nock('https://api.bintray.com/packages/hyperledger-org/besu-repo/besu', { allowUnmocked: false })
  .persist()
  .head('/files')
  .reply(200, 'ok')
  .persist() // don't remove interceptor after request -> always return mock obj
  .get('/files')
  .reply(200, mockResponse)

  describe('async listReleases(options? : FetchOptions): Promise<IRelease[]> ', function() {
    it('fetches a list of releases', async () => {
      const bintray = new Bintray({ owner: 'hyperledger-org', project: 'besu-repo/besu' })
      const releases = await bintray.listReleases()
      assert.equal(releases.length, 3166)
    })
  })

})