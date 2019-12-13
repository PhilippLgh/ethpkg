import SpecParser from '../src/SpecParser'
import { assert } from 'chai'

describe("SpecParser", () => {

  const specs = [
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
  
  describe('static async parseSpec(spec: string) : Promise<ParsedSpec>', () => {
    for (const spec of specs) {
      it (`parses ${spec}`, async () => {
        const result = await SpecParser.parseSpec(spec)
        assert.isDefined(result)
        assert.isDefined(result.repo)
        assert.isDefined(result.project)
      })
    }
    for (const spec of versionedSpecs) {
      it (`parses ${spec}`, async () => {
        const result = await SpecParser.parseSpec(spec)
        assert.isDefined(result)
        assert.isDefined(result.repo)
        assert.isDefined(result.project)
        assert.isDefined(result.version)
      })
    }
  })

})