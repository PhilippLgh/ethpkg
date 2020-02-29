import SpecParser from './SpecParser'
import { assert } from 'chai'
import { PackageQuery } from './Fetcher/Fetcher'

describe('SpecParser', () => {

  const queries = [
    {
      input: 'github:ethereum/remix-ide',
      expected: {
        repo: 'github',
        project: 'remix-ide'
      }
    },
    {
      input: 'azure:gethstore',
      expected: {
        repo: 'azure',
        project: 'gethstore'
      }
    },
    {
      input: 'npm:philipplgh/ethpkg',
      expected: {
        repo: 'npm',
        project: 'ethpkg'
      }
    },
    { 
      input: 'npm:ethpkg',
      expected: {
        repo: 'npm',
        project: 'ethpkg'
      }
    },
    { 
      input: 'bintray:hyperledger-org/besu-repo/besu',
      expected: {
        repo: 'bintray',
        project: 'besu-repo/besu'
      } 
    },
    { 
      input: 'azure:gethstore@geth-alltools-darwin-amd64-1.9.8-unstable-22e3bbbf.tar.gz',
      expected: {
        repo: 'azure',
        project: 'gethstore'
      }
    }
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
      const { input, expected } = spec
      it (`parses query: "${input}"`, async () => {
        const result = await SpecParser.parseSpec(input)
        assert.isDefined(result)
        assert.equal(result.name, expected.repo)
        assert.equal(result.project, expected.project)
      })
    }
    for (const spec of versionedSpecs) {
      it (`parses query+version: "${spec}"`, async () => {
        const result = await SpecParser.parseSpec(spec)
        assert.isDefined(result)
        assert.isDefined(result.name)
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