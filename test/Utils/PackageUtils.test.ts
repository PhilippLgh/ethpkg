
import { assert } from 'chai'
import * as PackageUtils from '../../src/utils/PackageUtils'

describe("PackageUtils", () => {

  describe('compareVersions = (a : {version?:string, channel?: string}, b : {version?:string, channel?: string})', () => {
    it ('compares two release infos and sorts them', async () => {
      const a = {
        version: '1.0.0'
      }
      const b = {
        version: '1.0.1'
      }
      const result = PackageUtils.compareVersions(a, b)
      assert.equal(result, 1)
    })
  })
  
  describe('compareDate = ({updated_ts: a} : {updated_ts?:number}, {updated_ts: b} : {updated_ts?:number})', () => {
    it ('compares two timestamps and sorts them by "youngest first"', async () => {
      const a = {
        updated_ts: Date.now()
      }
      const b = {
        updated_ts: Date.now() + 10 // + = older
      }
      const result = PackageUtils.compareDate(a, b)
      assert.equal(result, 1)
    })
  })

})