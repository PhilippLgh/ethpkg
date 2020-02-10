import fs from 'fs'
import { IRelease, FetchOptions } from '../Repositories/IRepository'
import Mock from '../Repositories/test/Mock'
import { compareVersions, multiSort, compareDate } from '../utils/PackageUtils'
import { download } from '../Downloader'
import { StateListener, PROCESS_STATES } from '../IStateListener'
import semver from 'semver'
import { hasPackageExtension } from '../utils/FilenameUtils'
import Parser from '../SpecParser'
import RepositoryManager from '../Repositories/RepositoryManager'

export type PackageQuery = string
export const instanceOfPackageQuery = (str : any) : str is PackageQuery => typeof str === 'string' && str.includes(':') && !fs.existsSync(str) 

type PackageUrl = string

export interface DownloadPackageOptions {
  proxy?: string; // allows to specify a cors proxy to avoid issues in browser
  headers?: any; // http request headers
  onDownloadProgress?: (progress: number, release: IRelease) => void; // convenience wrapper for listener
  listener?: StateListener;
  destPath?: string; // ignored by fetcher
  extract?: boolean; // extract package contents?
  verify?: boolean; // will reject packages that are not valid / not trusted before writing them to disk / returning them
}

export interface ResolvePackageOptions extends FetchOptions, DownloadPackageOptions{
  spec?: PackageQuery; // FIXME make required
  platform?: string;
  cache?: string;
}

export function instanceofResolvePackageOptions(object: any): object is ResolvePackageOptions {
  return typeof object === 'object' && ('spec' in object)
}

const LOGLEVEL = {
  WARN: -1,
  NORMAL: 0,
  VERBOSE: 2
}

const createLogger = (_loglevel : number) => {
  return (loglevel = LOGLEVEL.NORMAL, message: string, ...optionalParams: any[]) => {
    if (_loglevel >= loglevel) {
      if (loglevel === LOGLEVEL.WARN) {
        console.log('WARNING:', message, optionalParams)
      } else {
        console.log(message, optionalParams)
      }
    }
  }
}

const log = createLogger(LOGLEVEL.NORMAL)

export default class Fetcher {

  name: string = 'Fetcher'

  repoManager: RepositoryManager

  constructor(repoManager?: RepositoryManager) {
    this.repoManager = repoManager || new RepositoryManager()
  }

  /**
   * 
   * @param spec : PackageQuery
   * @param options : FetchOptions
   */
  async listReleases(spec: PackageQuery, {
    filter = undefined,
    filterInvalid = true,
    sort = true,
    version = undefined,
    prefix = undefined,
    timeout = 0,
    skipCache = false,
    pagination = false,
    limit = 0
  } : FetchOptions = {}): Promise<IRelease[]> {

    let repository = undefined
    let versionSpecifier : string | undefined = undefined
    if (spec.startsWith('mock')) {
      const testCase = spec.split(':')[1]
      repository = new Mock(testCase)
    } else {
      const parsed = await Parser.parseSpec(spec)
      if (!parsed) throw new Error(`Unsupported or invalid package specification: "${spec}"`)
      const { version } = parsed
      versionSpecifier = version
      repository = await this.repoManager.getRepository(parsed)
    }

    if (!repository) {
      throw new Error('Could not find a repository for specification: ' + spec)
    }


    let releases: Array<IRelease> = []
    try {
      releases = await repository.listReleases({
        prefix,
        pagination,
        timeout
      })
    } catch (error) {
      // TODO logger
      console.log('Repository exception: could not retrieve release list', error && error.message)
      return releases
    }

    // filter non-package releases e.g. Github assets that are .txt, .json etc
    releases = releases.map(release => {
      if(release.fileName && hasPackageExtension(release.fileName)) {
        return release
      }
      release.error = 'Release has no file name information or unsupported package extension'
      return release
    })

    // filter invalid releases i.e. releases that have the error field set
    const invalid = releases.filter(release => ('error' in release && release.error))
    if (invalid.length > 0) {
      log(LOGLEVEL.WARN, `detected ${invalid.length} corrupted releases for ${spec}`)
      log(LOGLEVEL.VERBOSE, invalid.map(r => r.error).join('\n\n'))
    }
    if (filterInvalid) {
      releases = releases.filter(release => !('error' in release && release.error))
    }

    // filter releases based on version or version range info
    const versionFilter = version || versionSpecifier
    if(versionFilter) {
      // TODO move filter in utils
      releases = releases.filter(release => {
        if (!('version' in release)) {
          return false
        }
        const release_version = release.version as string
        return semver.satisfies(release_version, versionFilter)
      })
    }

    if(filter && typeof filter === 'function') {
      releases = releases.filter(filter)
    }

    // sort releases by semver and date, and return them descending (latest first)
    // do not consider prerelease info (alphabetically) if it is e.g. commit hash
    if (sort) {
      releases = releases.sort(multiSort(compareVersions, compareDate))
      // releases =  releases.sort(compareVersions)
    }

    // only return "limit"-number of entries
    if (limit) {
      const l = releases.length
      releases = releases.slice(0, limit < l ? limit : l)
    }

    return releases
  }
  
  async getRelease(spec: PackageQuery, { 
    listener = () => {},
    filter = undefined,
    version = undefined,
    platform = process.platform, // FIXME this info is only implemented via filters
    prefix = undefined,
    timeout = 0,
    skipCache = false,
    pagination = false,
    limit = 0
  } : ResolvePackageOptions = {}) : Promise<IRelease | undefined> {

    // notify client about process start
    listener(PROCESS_STATES.RESOLVE_PACKAGE_STARTED, { platform, version })
    const releases = await this.listReleases(spec, {
      filter,
      filterInvalid: true,
      sort: true,
      version,
      prefix,
      timeout,
      skipCache,
      pagination,
      limit
    })

    // if more than one release is returned we default to returning the latest version
    let latest = undefined
    if (releases.length > 0) {
      // handle the common case of remote and local (cached)
      // having same version. in this case we want to always return cached
      if (releases.length > 1) {
        if (releases[0].version === releases[1].version) {
          if(releases[0].remote && !releases[1].remote) {
            latest = releases[1]
          }
        }
      }
      latest = releases[0]
    }

    if (!latest) {
      // FIXME failed
      listener(PROCESS_STATES.RESOLVE_PACKAGE_FINISHED, { release: latest, platform, version })
      return undefined
    }

    // notify client about process end
    listener(PROCESS_STATES.RESOLVE_PACKAGE_FINISHED, { release: latest, platform, version })

    // if package not from cache / fs repo it is always remote
    // this info is quite critical as it is used e.g. by updaters to determine
    // if the latest version was fetched from remote or was available locally
    // TODO implement cache
    latest.remote = true

    return latest
  }

  async downloadPackage(release: IRelease, options: DownloadPackageOptions = {}) : Promise<Buffer> {

    let { listener, proxy, onDownloadProgress } = options
    const stateListener = listener || (() => {})

    // wrap onProgress
    // TODO protect with try catch
    let progress = 0;
    const _onProgress = (p : number) => {
      const progressNew = Math.floor(p * 100);
      if (progressNew > progress) {
        progress = progressNew;
         // console.log(`downloading update..  ${pn}%`)
        stateListener(PROCESS_STATES.DOWNLOAD_PROGRESS, { progress, release })
        if (typeof onDownloadProgress === 'function') {
          onDownloadProgress(progress, release)
        }
      }
    }

    // download release data / asset
    let { location } = release
    if (!location) throw new Error('package location not found')
    stateListener(PROCESS_STATES.DOWNLOAD_STARTED, { location, release })

    // TODO if proxy is used issue warning
    if (proxy && proxy.endsWith('/')) {
      proxy = proxy.slice(0, -1)
    }
    location = proxy ? `${proxy}/${encodeURI(location)}` : location
    const packageData = await download(location, _onProgress, 0, {
      parallel: 0,
      headers: options.headers
    })
    stateListener(PROCESS_STATES.DOWNLOAD_FINISHED, { location, size: packageData.length, release })

    return packageData
  }

}