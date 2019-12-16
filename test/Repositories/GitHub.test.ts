
import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import Github from '../../src/Repositories/GitHub'
import nock from 'nock'
import { fetch } from '../../src/Downloader'

import http from 'https'

const releaseResponsePath = path.join(__dirname, '..', 'fixtures', 'ServerResponses', 'GitHub', 'githubReleases.json')

const prepareFixture = async () => {
  const data = await fetch('GET', 'https://api.github.com/repos/ethereum/grid-ui/releases', {
    headers: {
      accept: [ 'application/vnd.github.v3+json' ],
      'user-agent': [ 'octokit.js/16.35.0 Node.js/12.10.0 (macOS Catalina; x64)' ],
      'Accept-Encoding': [ 'gzip,deflate' ],
    }
  })
  fs.writeFileSync(releaseResponsePath, data.toString())
  console.log('fixture data written')
}

describe("Github", function() {

  this.timeout(120 * 1000)

  it.skip('prepare fixture data', async () => {
    await prepareFixture()
  })

  const mockResponse = fs.readFileSync(releaseResponsePath)

  const scope = nock("https://api.github.com", {allowUnmocked: true})
    .persist()
    .head("/repos/ethereum/grid-ui/releases")
    .reply(200, 'ok')
    .persist() // don't remove interceptor after request -> always return mock obj
    .get("/repos/ethereum/grid-ui/releases")
    .reply(200, JSON.parse(mockResponse.toString()))

  describe('async listReleases(options? : FetchOptions): Promise<IRelease[]> ', function() {
    it('fetches a list of releases', async () => {
      const github = new Github({ owner: 'ethereum', project: 'grid-ui' })
      const releases = await github.listReleases()
      assert.equal(releases.length, 60)
    })
  })


})