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
    it('resolves grid.philipplgh.eth ', async () => {
      const address = await resolveName('grid.philipplgh.eth')
      assert.equal(address?.toLowerCase(), '0x39830fed4b4b17fcdfa0830f9ab9ed8a1d0c11d9')
    })
  })
  describe('lookup', () => {
    
  })
})
