
import { assert } from 'chai'
import * as FilenameUtils from '../../src/utils/FilenameUtils'

describe("FilenameUtils", () => {

  describe('getExtension = (fileName : string) : string ', () => {
    const testCases = [
      { fileName: 'foo.tar', expected: '.tar' },
      { fileName: 'foo.zip', expected: '.zip' },
      { fileName: 'foo.bla.tar.gz', expected: '.tar.gz' },
      { fileName: 'foo.bla.tar.tgz', expected: '.tgz' },
      { fileName: 'foo.bla.tar.gz.asc', expected: '.asc' }
    ]
    for (const testCase of testCases) {
      const { fileName, expected } = testCase
      it (`extracts the file extension from "${fileName}" -> ${expected}`, async () => {
        const result = FilenameUtils.getExtension(fileName)
        assert.equal(result, expected)
      })
    }
  })

  describe('hasPackageExtension = (fileName : string | undefined) : boolean', () => {
    const testCases = [
      { fileName: 'foo.jpg', expected: false },
      { fileName: 'foo.zip', expected: true },
      { fileName: 'foo.bla.tar.gz', expected: true },
      { fileName: 'foo.bla.tar.tgz', expected: true },
      { fileName: 'tar.gz', expected: false },
      { fileName: '', expected: false },
      { fileName: '.tar.gz', expected: true },
      { fileName: '.tar.gz.asc', expected: false },
      { fileName: '.zip.asc', expected: false },
      { fileName: '', expected: false },
      { fileName: undefined, expected: false },
    ]
    for (const testCase of testCases) {
      const { fileName, expected } = testCase
      it (`checks if file "${fileName}" has a package extension -> ${expected}`, async () => {
        const result = FilenameUtils.hasPackageExtension(fileName)
        assert.equal(result, expected)
      })
    }
  })

  describe('hasSignatureExtension = (fileName : string | undefined) : boolean', () => {
    const testCases = [
      { fileName: 'asc.tar.gz', expected: false },
      { fileName: '.tar.asc.gz', expected: false },
      { fileName: '.zip.asc', expected: true },
      { fileName: '', expected: false },
      { fileName: undefined, expected: false }
    ]
    for (const testCase of testCases) {
      const { fileName, expected } = testCase
      it (`checks if file "${fileName}" has a signature-file extension -> ${expected}`, async () => {
        const result = FilenameUtils.hasSignatureExtension(fileName)
        assert.equal(result, expected)
      })
    }
  })

  describe('removeExtension = (fileName : string) : string', () => {
    const testCases = [
      { fileName: 'foo.tar.gz', expected: 'foo' },
      { fileName: 'bar.zip', expected: 'bar' },
      { fileName: 'foo.tar.gz.asc', expected: 'foo.tar.gz' }
    ]
    for (const testCase of testCases) {
      const { fileName, expected } = testCase
      it (`removes the file extension from "${fileName}" -> ${expected}`, async () => {
        const result = FilenameUtils.removeExtension(fileName)
        assert.equal(result, expected)
      })
    }
  })

})