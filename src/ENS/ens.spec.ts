import { assert } from 'chai'
import { resolveName } from './ens'

describe('ENS', () => {
  describe('resolve', () => {
    it('resolves philipplgh.eth ', async () => {
      const address = await resolveName('philipplgh.eth')
      assert.equal(address, '0x6efeF34e81FD201EdF18C7902948168E9eBb88aE')
    })
    it('resolves ethpkg.eth ', async () => {
      const address = await resolveName('ethpkg.eth')
      assert.equal(address, '0x6efeF34e81FD201EdF18C7902948168E9eBb88aE')
    })
  })
  describe('lookup', () => {
    
  })
})
