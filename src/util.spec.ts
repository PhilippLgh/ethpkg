import { assert } from 'chai'
import { is } from './util'

describe('utils', () => {
  describe('is', () => {
    it('detect if running in browser', () => {
      assert.isFalse(is.browser())
    })
  })
})
