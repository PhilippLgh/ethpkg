import SpecParser from './SpecParser'
import { assert } from 'chai'
import { PackageQuery } from './Fetcher/Fetcher'

describe('SpecParser', () => {

  const queries : Array<PackageQuery> = [
    'github:ethereum/remix-ide',
    'azure:gethstore',
    'npm:philipplgh/ethpkg',
    'npm:ethpkg',
    'bintray:hyperledger-org/besu-repo/besu',
    'azure:gethstore/geth-alltools-darwin-amd64-1.9.8-unstable-22e3bbbf.tar.gz'
  ]

  const versionedSpecs = [
    'azure:gethstore@<=1.5.0',
  ]

  const fullUrls = [
    {input: 'https://gethstore.blob.core.windows.net', expected: {
      repo: 'windows',
      project: 'gethstore'
    }},
    {input: 'https://www.github.com/PhilippLgh/ethpkg', expected: {
      repo: 'github',
      owner: 'PhilippLgh',
      project: 'ethpkg'
    }},
    {input: 'https://github.com/ethereum/grid-ui', expected: {
      repo: 'github',
      owner: 'ethereum',
      project: 'grid-ui'
    }}
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
    for (const testCase of fullUrls) {
      const { input, expected } = testCase
      it(`parses full url: "${input}"`, async () => {
        const result: any = await SpecParser.parseSpec(input)
        assert.isDefined(result)
        for(const k in expected) {
          assert.equal(result[k], (<any>expected)[k], `parsed result should have ${k}`)
        }
      })
    }
  })

})