import _fs, { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ISerializable, SerializationInfo, isSerializable } from './ISerializable'

export const md5 = (data : Buffer | string) => crypto.createHash('md5').update(data).digest('hex')

export abstract class ICache<T extends ISerializable> {
  public abstract async put(key: string, obj: T | undefined | any /* accept POJO */) : Promise<string>;
  public abstract async has(key: string) : Promise<boolean>;
  public abstract async get(key: string) : Promise<T | undefined>;
  public abstract async clear() : Promise<void>;
}
export function instanceOfICache(obj: any): obj is ICache<any> {
  return obj && typeof obj.put === 'function' && typeof obj.get === 'function' && typeof obj.has === 'function'
}

// TODO specify return value
// TODO test with multiple args
export function withCache<T extends ISerializable>(cache: ICache<T>, fn: (...args: any) => Promise<T | undefined | any>, keyFn?: (...args: any) => string): any {
  return async (...args: any[]) => {
    // if function to generate key is provided use it otherwise try to hash args
    // FIXME handle functions such as listener by removing them from key
    const key = keyFn ? keyFn(...args) : md5(JSON.stringify(args))
    if (await cache.has(key)) {
      // TODO based on hit/miss we can extend the cache lifetime here or load to mem
      try {
        return cache.get(key)
      } catch (error) {
        // ignore errors during restore and just fallback to fetch + overwrite
      }
    }
    const result = await fn(...args)
    await cache.put(key, result)
    return result
  }
}

export class MemCache<T extends ISerializable> extends ICache<T> {
  private cache : {[index:string]: any} = {}
  constructor() {
    super()
  }
  public async put(key: string, obj: T | undefined | any): Promise<string> {
    this.cache[key] = obj
    return key
  }
  public keys() : Array<string> {
    return Object.keys(this.cache)
  }
  public async has(key: string) {
    return key in this.cache
  }      
  public async get(key: string) {
    return this.cache[key]
  }
  public async clear() {
    this.cache = {}
  }
}

// TODO consider using a compressed tar package as cache
// export class PackagedCache extends ICache

// TODO find solution for browser caching

// TODO consider using cacache
// TODO consider using cbor as serialization
// TODO consider using LRU cache

export class PersistentJsonCache<T extends ISerializable> extends ICache<T> {
  private dirPath: string
  ctor: Function
  constructor(dirPath: string, ctor: (info: SerializationInfo) => Promise<T | undefined>) {
    super()
    this.dirPath = dirPath
    this.ctor = ctor
  }
  private keyToFilepath(key: string) {
    const name = `${md5(key)}.json`
    const fullPath = path.join(this.dirPath, name)
    return fullPath
  }
  public async put(key: string, obj: T | undefined | any): Promise<string> {
    const fullPath = this.keyToFilepath(key)
    const data = isSerializable(obj) ? (await obj.getObjectData()) : obj
    const serializationInfo = {
      data,
      ctor: obj === undefined ? undefined : obj.constructor.name,
      ts: Date.now()
    }
    const dataHash = md5(JSON.stringify(serializationInfo))
    await fs.writeFile(fullPath, JSON.stringify(serializationInfo))
    return dataHash
  }
  public async has(key: string) : Promise<boolean> {
    const fullPath = this.keyToFilepath(key)
    return _fs.existsSync(fullPath)
  }      
  public async get<T>(key: string) : Promise<T | undefined> {
    const exists = await this.has(key)
    if (!exists) {
      return undefined
    }
    const fullPath = this.keyToFilepath(key)
    // console.log('load from cache', fullPath)
    try {
      const result = await fs.readFile(fullPath)
      // json.parse does not handle nested buffers: see Cache.test
      const data = JSON.parse(result.toString(), (key, value) => {
        if (value && value.type && value.type === 'Buffer') {
          return Buffer.from(value.data)
        }
        return value
      })
      return this.ctor(data)
    } catch (error) {
      // console.log('cache error:', error)
      throw new Error('de-serialization error: '+error.message)
    }
  }
  public async clear() {
    const files = await fs.readdir(this.dirPath)
    for (const file of files) {
      // TODO this will also effect json files that are not under the cache's control. an index would avoid this
      if (file.endsWith('.json')) {
        await fs.unlink(path.resolve(this.dirPath, file))
      }
    }
  }
}

export class NoCache<T extends ISerializable> extends ICache<T> {
  public async put(key: string, obj: T | undefined): Promise<string> {
    return key
  }  
  public async has(key: string): Promise<boolean> {
    return false
  }
  public async get(key: string): Promise<T | undefined> {
    return undefined
  }
  public async clear(): Promise<void> {
    // nothing to do
  }


}
