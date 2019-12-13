import { IRepository, IRelease, FetchOptions } from "../Repositories/IRepository"
import getRepository from "../Repositories"
import Mock from "../Repositories/test/Mock"
import { compareVersions, multiSort, compareDate } from "../Utils/PackageUtils"
import { download } from "../Downloader"
import { StateListener, PROCESS_STATES } from "../IStateListener"
import semver from 'semver'
import { hasPackageExtension } from "../utils/FilenameUtils"
import Parser from "../SpecParser"

// see https://github.com/npm/npm-package-arg
type PackageSpecifier = string

type PackageUrl = string

type PackageLocator = PackageUrl | IRelease | PackageSpecifier

export interface FetchPackageOptions {
  spec?: string, // FIXME make required
  version?: string;
  platform?: string;
  listener?: StateListener

  cache?: string;

  // pass-through for FetchOptions
  filter?: (release: IRelease) => boolean; // custom filter logic
  semverFilter?: string // version or version range that should be returned
  prefix? : string // server-side processed name- / path-filter. default: undefined
  timeout? : number // time in ms for request timeouts.
  skipCache? : boolean // if cached files should be ignored. default: false 
  pagination?: boolean | number // is pagination should be used and number of pages
  limit?: number // number of results
}

export function instanceofFetchPackageOptions(object: any): object is FetchPackageOptions {
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

  name: string = "Fetcher"

  /**
   * 
   * @param spec : PackageSpecifier
   * @param options : FetchOptions
   */
  async listReleases(spec: PackageSpecifier, {
    filter = undefined,
    filterInvalid = true,
    sort = true,
    semverFilter = undefined,
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
  
      const { repo, version } = parsed
      versionSpecifier = version
      repository = getRepository(repo, parsed)
  
    }

    if (!repository) {
      throw new Error('Could not find a repository for specification: ' + spec)
    }

    let releases = await repository.listReleases()

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
    const versionFilter = semverFilter || versionSpecifier
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
  
  async getRelease(spec: PackageSpecifier, { 
    listener = () => {},
    filter = undefined,
    semverFilter = undefined,
    prefix = undefined,
    timeout = 0,
    skipCache = false,
    pagination = false,
    limit = 0
  } : FetchPackageOptions = {}) : Promise<IRelease | undefined> {

    const platform = process.platform // FIXME this info is only implemented via filters
    const version = semverFilter || 'latest'

    // notify client about process start
    listener(PROCESS_STATES.RESOLVE_PACKAGE_STARTED, { platform, version })
    const releases = await this.listReleases(spec, {
      filter,
      filterInvalid: true,
      sort: true,
      semverFilter,
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

    return latest
  }

  async downloadPackage(locator : PackageLocator, listener : StateListener = () => {}) : Promise<Buffer> {

    // wrap onProgress
    let progress = 0;
    const _onProgress = (p : number) => {
      const progressNew = Math.floor(p * 100);
      if (progressNew > progress) {
        progress = progressNew;
         // console.log(`downloading update..  ${pn}%`)
        listener(PROCESS_STATES.DOWNLOAD_PROGRESS, { progress })
      }
    }

    // download release data / asset
    const { location } = locator as IRelease // FIXME
    if (!location) throw new Error('package location not found')
    listener(PROCESS_STATES.DOWNLOAD_STARTED, { location })

    const packageData = await download(location, _onProgress)
    listener(PROCESS_STATES.DOWNLOAD_FINISHED, { location, size: packageData.length })

    return packageData
  }

}