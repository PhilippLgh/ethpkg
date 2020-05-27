import { StateListener } from '../IStateListener'
import { IPackage } from '../PackageManager/IPackage'

export interface FetchOptions {
  filter?: (release: IRelease) => boolean; // custom filter logic
  filterInvalid?: boolean // if corrupted or invalid releases should be removed from list
  packagesOnly?: boolean // default: true - if false also non package releases will be returned; potentially breaking things
  sort? : boolean // if release list should be sorted. default: true - by version
  version?: string // version or version range that should be returned
  prefix? : string // server-side processed name- / path-filter. default: undefined
  timeout? : number // time in ms for request timeouts.
  skipCache? : boolean // if cached files should be ignored. default: false 
  cache?: string | Array<string> // user defined path to cache dir(s) where to look for packages 
  cacheOnly? : boolean // if requests to backends should be made (good for offline or frequent use)
  preferCache?: boolean // this will return cached releases if they are recent enough
  pagination?: boolean | number // is pagination should be used and number of pages
  limit?: number // number of results
  listener?: StateListener
}

export interface PublishOptions {
  listener?: StateListener;
}

export interface IRelease {
  name?: string;
  version?: string;
  displayVersion?: string; // v prefixed short version without prerelease info
  channel?: string;
  fileName: string;
  updated_ts?: number; // timestamp: last date of modification / (re-) publishing
  updated_at?: string; // display date version

  size?: number; // size of the asset / package

  original?: any; // the original response object before it was parsed
  error?: string; // error message

  location?: string; // download url or path to package
  remote? : boolean; // if package is available locally or only remote

  signature?: string; // url to .asc file
}
export function instanceOfIRelease(obj: any): obj is IRelease {
  //TODO ['displayVersion', 'channel'].some(p => obj[p])
  return obj.fileName && obj.version
}

export interface Credentials {
  username?: string;
  password?: string;
  privateKey?: Buffer;
}

export interface RepositoryConfig {
  name?: string;
  owner?: string;
  project?: string;
}

export interface IRepository {
  readonly name : string // used e.g. for logging
  // repositoryUrl?: string
  login?: (credentials: Credentials) => Promise<boolean>
  listReleases(options?: FetchOptions): Promise<Array<(IRelease)>>
  publish?: (pkg: IPackage, options?: PublishOptions) => Promise<IRelease>
}