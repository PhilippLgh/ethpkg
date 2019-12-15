
import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import Azure from '../../src/Repositories/Azure'
import nock from 'nock'
import { download } from '../../src/Downloader'

const releaseResponsePath = path.join(__dirname, '..', 'fixtures', 'ServerResponses', 'Azure', 'azureReleases.xml')
const mockResponse = fs.readFileSync(releaseResponsePath)

const prepareFixture = async () => {
  const data = await download('https://gethstore.blob.core.windows.net/builds?restype=container&comp=list')
  fs.writeFileSync(releaseResponsePath, data.toString())
  console.log('fixture data written')
}

describe("Azure", () => {

  // await prepareFixture().then => run tests

  const scope = nock('https://gethstore.blob.core.windows.net', { allowUnmocked: false })
  .persist()
  .head('/builds?restype=container&comp=list')
  .reply(200, 'ok')
  .persist() // don't remove interceptor after request -> always return mock obj
  .get('/builds?restype=container&comp=list')
  .reply(200, mockResponse)

  describe('async listReleases(options? : FetchOptions): Promise<IRelease[]> ', function() {
    it('fetches a list of releases', async () => {
      const azure = new Azure({ project: 'gethstore' })
      const releases = await azure.listReleases()
      assert.equal(releases.length, 2342)
    });
  })

})