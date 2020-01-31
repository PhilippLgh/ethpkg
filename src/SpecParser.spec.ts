import SpecParser from './SpecParser'
import { assert } from 'chai'
import { PackageQuery } from './Fetcher/Fetcher'

describe('SpecParser', () => {

  const queries : Array<PackageQuery> = [
    'github:ethereum/remix-ide',
    'azure:gethstore',
    'npm:philipplgh/ethpkg',
    'npm:ethpkg',
    'https://github.com/PhilippLgh/ethpkg',
    'bintray:hyperledger-org/besu-repo/besu',
    'azure:gethstore/geth-alltools-darwin-amd64-1.9.8-unstable-22e3bbbf.tar.gz'
  ]

  const versionedSpecs = [
    'azure:gethstore@<=1.5.0',
  ]

  const fullUrls = [
    'https://gethstore.blob.core.windows.net',
    'https://www.github.com/ethereum/grid-ui'
  ]
  
  describe('static async parseSpec(spec: string) : Promise<ParsedSpec>', () => {
    for (const spec of queries) {
      it (`parses query: "${spec}"`, async () => {
        const result = await SpecParser.parseSpec(spec)
        assert.isDefined(result)
        assert.isDefined(result.repo)
        assert.isDefined(result.project)
      })
    }
    for (const spec of versionedSpecs) {
      it (`parses query+version: "${spec}"`, async () => {
        const result = await SpecParser.parseSpec(spec)
        assert.isDefined(result)
        assert.isDefined(result.repo)
        assert.isDefined(result.project)
        assert.isDefined(result.version)
      })
    }
    for (const spec of fullUrls) {
      it(`parses full url: "${spec}"`, async () => {
        const result = await SpecParser.parseSpec(spec)
        assert.isDefined(result)
        assert.isDefined(result.repo, 'repo should be parsed from url')
        assert.isDefined(result.project, 'project should be parsed from url')
      })
    }
  })

})