export interface FetchOptions {
  filter?: (release: IRelease) => boolean; // custom filter logic
  filterInvalid?: boolean // if corrupted or invalid releases should be removed from list
  sort? : boolean // if release list should be sorted. default: true - by version
  version?: string // version or version range that should be returned
  prefix? : string // server-side processed name- / path-filter. default: undefined
  timeout? : number // time in ms for request timeouts.
  skipCache? : boolean // if cached files should be ignored. default: false 
  pagination?: boolean | number // is pagination should be used and number of pages
  limit?: number // number of results
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
}

export interface IRepository {
  readonly name : string // used e.g. for logging
  // repositoryUrl?: string
  listReleases(options?: FetchOptions): Promise<Array<(IRelease)>>
}