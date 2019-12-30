
import { assert } from 'chai'
import * as FilenameHeuristics from '../../src/utils/FilenameHeuristics'

describe("FilenameHeuristics", () => {

  describe('extractVersionFromString = (str : string | undefined) :string | undefined', () => {
    const testCases = [
      { fileName: 'foo.bla.tar.gz', expected: undefined },
      { fileName: 'foo-1.0.0-bar.tar', expected: '1.0.0' },
      { fileName: 'foo_1.0.0_bar', expected: '1.0.0' },
      { fileName: 'geth-darwin-amd64-1.9.5-a1c09b93.tar.gz', expected: '1.9.5' },
      { fileName: 'geth-darwin-amd64-1.9.9-01744997.tar.gz', expected: '1.9.9' },
    ]
    for (const testCase of testCases) {
      const { fileName, expected } = testCase
      it (`extracts the version info from ${fileName} -> ${expected}`, async () => {
        const result = FilenameHeuristics.extractVersionFromString(fileName)
        assert.equal(result, expected)
      })
    }
  })

})