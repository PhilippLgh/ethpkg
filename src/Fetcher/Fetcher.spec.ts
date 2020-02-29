
import { assert } from 'chai'
import Fetcher from '.'

describe('Fetcher', () => {
  
  describe.skip('async listReleases(spec: PackageQuery, options: FetchOptions): Promise<IRelease[]>', function() {

    this.timeout(60 * 1000)

    // FIXME http responses need to be mocked
    const repoQueries = [
      {query: 'github:ethereum/grid-ui', expected: 30}, 
      {query: 'npm:philipplgh/ethpkg', expected: 18}, 
      {query: 'npm:ethpkg', expected: 3},
      // TODO without releases info part we probably have to assume that client wants whatever is in master
      {query: 'github:ethereum/remix-ide', expected: 14},
      {query: 'azure:gethstore', expected: 2500}
    ]

    for (const testCase of repoQueries) {
      const {query, expected} = testCase
      it.skip(`lists releases for PackageQuery: "${query}"`, async () => {
        const fetcher = new Fetcher()
        const result = await fetcher.listReleases(query)
        assert.equal(result.length, expected)
      })
    }

    const repoUrls = [
      {url: 'https://gethstore.blob.core.windows.net', expected: 2500 }
    ]

    for (const testCase of repoUrls) {
      const {url: repoUrl, expected} = testCase
      it.skip(`lists releases for repository URL: ${repoUrl}`, async () => {
        const fetcher = new Fetcher()
        const result = await fetcher.listReleases(repoUrl)
        assert.equal(result.length, expected)
      })
    }

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
      const expected = '3.0.0,2.0.0,1.1.1-alpha,1.0.2-alpha,1.0.1-beta,1.0.1-alpha,1.0.1-foo,1.0.0,0.1.1'
      assert.equal(versions, expected)
    })

  })

  describe('async getRelease(spec: PackageQuery, options: ResolvePackageOptions = {}) : Promise<IRelease | undefined>', function() {
    this.timeout(60 * 1000)
    it('fetches the release info based on a query and additional filter options', async () => {
      
    })

    it.skip('handles queries with filenames', async () => {
      const query = 'azure:gethstore@geth-alltools-linux-amd64-1.9.11-unstable-38d1b0cb.tar.gz '
      const fetcher = new Fetcher()
      const result = await fetcher.getRelease(query)
      assert.isDefined(result)
    })
  })
  
  describe('async downloadPackage(locator : PackageLocator, listener : StateListener = () => {}) : Promise<Buffer>', () => {
    it ('download a package based on a url and provides progress updates', async () => {

    })
  })

})