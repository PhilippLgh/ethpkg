import { IPackage, IPackageEntry } from '../PackageManager/IPackage'
import { IRelease } from '../Repositories/IRepository'

const isObject = (obj : any) => typeof obj === 'object'

const findByPath = (data: any, path: string) : any => {
  const parts = path.split('.')
  for (const part of parts) {
    if (!part) continue //ignore empty strings created by split
    data = data[part]
  }
  return data
}

/**
 * foo = {
 *  bar: {...},
 *  baz: {
 *    foo: {
 *      moin: 'hello'
 *    }
 *  }
 * }
 * recursiveSearch(foo, 'moin') => { val: 'hello', path: 'baz.foo.moin'}
 * @param data 
 * @param prop 
 * @param path 
 */
export const recursiveSearch = (data: any, prop: string, path = '') : any => {  
  if (isObject(data)) {
    if (data && prop in data) {
      path = path + (path ? '.' : '') + prop
      return {
        val: data[prop],
        path
      }
    } else {
      for (let key in data) {
        if (isObject(data[key])){
          let newPath = path + (path ? '.' : '') + key
          let { val, path: newPath2 } = recursiveSearch(data[key], prop, newPath)
          if (val) {
            return {
              val,
              path: newPath2
            }
          }
        }
      }
    }
  }
  return {
    val: undefined,
    path
  }
}

