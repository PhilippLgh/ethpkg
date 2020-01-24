import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import { PersistentJsonCache, withCache, MemCache } from '../src/PackageManager/Cache'
import { ISerializable, SerializationInfo } from '../src/PackageManager/ISerializable'
import { deleteFolderRecursive } from './TestUtils'

class Dummy implements ISerializable {
  public data: string;
  constructor(info: string | SerializationInfo) {
    if (typeof info === 'string') {
      this.data = info
    } else {
      this.data = info.data
    }
  }
  static getConstructor(): (info: SerializationInfo) => Promise<Dummy> {
    return async (info: SerializationInfo) => new Dummy(info)
  }
  async getObjectData(): Promise<any> {
    return this.data
  }  
}

const CACHE_PATH = path.join(__dirname, 'fixtures', 'TestCache')

describe.only('Cache', () => {

  describe('withCache', () => {
    /**
     * this is a good example that shows how dangerous caching can be if state is changed as side effect
     * or if the state changes in the meantime and we have different expectations
     * => use caching wisely
     */
    it.only('takes a function that returns something serializable (implements ISerializable) and a cache to memoize or persist the responses', async () => {
      let i = 0
      const cacheableFn = async (arg: string) => new Dummy(arg+(++i))
      const cache = new MemCache() // effectively creates memoization and does not need a factory function because objects are never serialized
      const cachedFn = withCache(cache, cacheableFn)
      const res1 = await cachedFn('hello') as Dummy // i = 1 this result will be cached and ALWAYS returned!!
      const res2 = await cachedFn('hello') as Dummy // NOTE: this will not call the original function -> i = 1
      const res3 = await cacheableFn('hello') // i = 2
      const res4 = await cacheableFn('hello') // i = 3
      const res5 = await cachedFn('hello') // i = 1
      assert.equal(res1, res2)
      assert.equal(res2.data, 'hello1')
      assert.equal(res3.data, 'hello2')
      assert.equal(res4.data, 'hello3')
      assert.equal(res5.data, 'hello1')
    })
  })


  describe('PersistentJsonCache', () => {
    before('setting up temp cache dirs', () => {
      if (!fs.existsSync(CACHE_PATH)) {
        fs.mkdirSync(CACHE_PATH)
      }
      const files = fs.readdirSync(CACHE_PATH)
      assert.isEmpty(files, 'test cache should not contain any items')
    })
    it('persists and restores objects that implement the ISerializable interface', async () => {
      const KEY = 'OBJ_KEY'
      const DATA = 'foo bar'
      const cache = new PersistentJsonCache<Dummy>(CACHE_PATH, Dummy.getConstructor())

      await cache.put(KEY, new Dummy(DATA))
      const obj : Dummy = await cache.get(KEY)
      assert.equal(obj.data, DATA)
    })
    after('remove temp cache dirs', () => {
      // node 12: fs.rmdir(CACHE_PATH, { recursive: true });
      deleteFolderRecursive(CACHE_PATH)
    })
  })

})
