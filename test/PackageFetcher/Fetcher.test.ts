import Fetcher from '../../src/Fetcher'
import { assert } from 'chai'

describe("Fetcher", () => {

  describe('listReleases()', () => {
    
    it.skip(`fetches releases for ${'github:ethereum/grid-ui'}`, async () => {
      const fetcher = new Fetcher()
      const spec = 'github:ethereum/grid-ui'
      const result = await fetcher.listReleases(spec)
      /*
      let releaseList = releases.map(r => `${r.fileName} - ${r.version}`).join('\n')
      console.log('Releases', releaseList)
      // console.log('latest releases unsorted\n', releases.map(r => `{ version: '${r.version}', channel: '${r.channel}' }`).slice(0, 5).join(',\n'))
      */
      assert.equal(60, result.length)
    })

    // TODO without releases info part we probably have to assume that client wants whatever is in master
    it.skip(`fetches releases for ${'github:ethereum/remix-ide'}`, async () => {
      const fetcher = new Fetcher()
      const spec = 'github:ethereum/remix-ide'
      const result = await fetcher.listReleases(spec)
      /*
      let releaseList = releases.map(r => `${r.fileName} - ${r.version}`).join('\n')
      console.log('Releases', releaseList)
      // console.log('latest releases unsorted\n', releases.map(r => `{ version: '${r.version}', channel: '${r.channel}' }`).slice(0, 5).join(',\n'))
      */
      assert.equal(14, result.length)
    })

    it(`fetches releases for ${'azure:gethstore'}`, async () => {
      const fetcher = new Fetcher()
      const spec = 'azure:gethstore'
      const result = await fetcher.listReleases(spec)
      /*
      let releaseList = releases.map(r => `${r.fileName} - ${r.version}`).join('\n')
      console.log('Releases', releaseList)
      // console.log('latest releases unsorted\n', releases.map(r => `{ version: '${r.version}', channel: '${r.channel}' }`).slice(0, 5).join(',\n'))
      */
      assert.equal(2355, result.length)
    })

    it(`can filter invalid releases`, async () => {
      const fetcher = new Fetcher()
      const spec = 'mock:invalid'
      const result = await fetcher.listReleases(spec)
      const names = result.map(r => r.name).join(',')
      assert.equal('valid release', names)
    })

    it(`can return invalid releases e.g. for debugging`, async () => {
      const fetcher = new Fetcher()
      const spec = 'mock:invalid'
      const result = await fetcher.listReleases(spec, {
        filterInvalid: false
      })
      assert.equal(2, result.length)
    })

    it.skip(`can filter releases by semver version`, async () => {
      assert.equal(false, true)
    })

    it.skip(`can filter releases by semver version ranges`, async () => {
      assert.equal(false, true)
    })

    it(`can sort releases using semver and return them descending (latest first)`, async () => {
      const fetcher = new Fetcher()
      const spec = 'mock:unsorted'
      const result = await fetcher.listReleases(spec)
      const versions = result.map(r => r.version).join(',')
      assert.equal('3.0.0,2.0.0,1.1.1-alpha,1.0.2-alpha,1.0.1-beta,1.0.1-alpha,1.0.1-foo,1.0.0,0.1.1', versions)
    })
    
  
  })

})