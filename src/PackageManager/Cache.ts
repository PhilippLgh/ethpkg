import { promises as fs} from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ISerializable, SerializationInfo } from './ISerializable'

export const md5 = (data : Buffer | string) => crypto.createHash('md5').update(data).digest('hex')

export abstract class ICache<T extends ISerializable> {
  public abstract async put(key: string, obj: T | undefined) : Promise<string>;
  public abstract async get(key: string) : Promise<T | undefined>;
  public abstract async clear() : Promise<void>;
}

// TODO specify return value
// TODO test with multiple args
export function withCache<T extends ISerializable>(cache: ICache<T>, fn: (...args: any) => Promise<T | undefined>): any {
  return async (...args: any[]) => {
    const n = md5(JSON.stringify(args))
    let result = await cache.get(n)
    // TODO based on hit/miss wen can extend the cache lifetime here or load to mem
    if (result) {
      return result
    }
    result = await fn(...args)
    await cache.put(n, result)
    return result
  }
}

export class MemCache<T extends ISerializable> extends ICache<T> {
  private cache : {[index:string]: any} = {}
  constructor() {
    super()
  }
  public async put(key: string, obj: T | undefined): Promise<string> {
    this.cache[key] = obj
    return key
  }      
  public async get(key: string) {
    return this.cache[key]
  }
  public async clear() {}
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
  private keyToFileName(key: string) {
    const name = `${md5(key)}.json`
    return name
  }
  public async put(key: string, obj: T | undefined): Promise<string> {
    const name = this.keyToFileName(key)
    const fullPath = path.join(this.dirPath, name)
    const data = obj === undefined ?  undefined : (await obj.getObjectData())
    const serializationInfo = {
      data,
      ctor: obj === undefined ? undefined : obj.constructor.name,
      ts: Date.now()
    }
    const dataHash = md5(JSON.stringify(serializationInfo))
    await fs.writeFile(fullPath, JSON.stringify(serializationInfo))
    return dataHash
  }      
  public async get<T>(key: string) : Promise<T> {
    const name = this.keyToFileName(key)
    const fullPath = path.join(this.dirPath, name)
    try {
      const result = await fs.readFile(fullPath)
      // json.parse does not handle nested buffers: see Cache.test
      const data = JSON.parse(result.toString(), (key, value) => {
        if (value.type && value.type === 'Buffer') {
          return Buffer.from(value.data)
        }
        return value
      })
      return this.ctor(data)
    } catch (error) {
      throw new Error('de-serialization error')
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