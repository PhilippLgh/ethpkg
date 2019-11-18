import { IRepository, IRelease, FetchOptions } from "./IRepository"
import pickRepository from "./repositories"
import npa from 'npm-package-arg'
import Mock from "./repositories/test/Mock"
import { compareVersions } from "../Utils/PackageUtils"
import { download } from "../Downloader"
import { StateListener, PROCESS_STATES } from "../IStateListener"
import semver from 'semver'
import { hasPackageExtension } from "../utils/FilenameUtils"

// see https://github.com/npm/npm-package-arg
type PackageSpecifier = string

type PackageUrl = string

type PackageLocator = PackageUrl | IRelease | PackageSpecifier

export interface FetchPackageOptions {
  version?: string;
  platform?: string;
  prefix?: string; // pass through for performance
  listener?: StateListener
}

const parseSpec = (spec: string) => {
  if (!spec) return undefined
  if (spec.startsWith('azure')) {
    const parts = spec.split(':')
   return {
     hosted: {
       type: 'azure',
       user: undefined,
       project: parts[1]
     }
   }  
  }
  let parsed = undefined
  try {
    parsed = npa(spec)
    // console.log('parsed ->', parsed)
  } catch (ex) {
    console.error('NPA parser error', ex.message)
  }
  return parsed
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
    if (spec.startsWith('mock')) {
      const testCase = spec.split(':')[1]
      repository = new Mock(testCase)
    } else {
      const parsed = parseSpec(spec)
      if (!parsed) throw new Error(`Unsupported or invalid package specification: "${spec}"`)
  
      const { hosted } = parsed
      if (!hosted) {
        return []
      }
      const {
        type: repo, // e.g. github
        user, // e.g. ethereum
        project // e.g. grid
      } = hosted
  
      repository = pickRepository(repo, {
        owner: user,
        project
      })
    }

    if (!repository) {
      throw new Error('Could not find a repository for specification: ' + spec)
    }

    let releases = await repository.listReleases()

    // filter invalid releases i.e. releases that have the error field set
    const invalid = releases.filter(release => ('error' in release && release.error))
    if (invalid.length > 0) {
      log(LOGLEVEL.WARN, `detected ${invalid.length} corrupted releases for ${spec}`)
      log(LOGLEVEL.VERBOSE, invalid.map(r => r.error).join('\n\n'))
    }
    if (filterInvalid) {
      releases = releases.filter(release => !('error' in release && release.error))
    }

    // filter non-package releases e.g. Github assets that are .txt, .json etc
    releases = releases.filter(release => release.fileName && hasPackageExtension(release.fileName))

    // filter releases based on version or version range info
    if(semverFilter) {
      // TODO move filter in utils
      releases = releases.filter(release => {
        if (!('version' in release)) {
          return false
        }
        const coercedVersion = semver.coerce(release.version)
        const release_version = coercedVersion ? coercedVersion.version : release.version
        if (release_version === undefined) return false
        return semver.satisfies(release_version, semverFilter)
      })
    }

    // sort releases using semver and return them descending (latest first)
    if (sort) {
      releases =  releases.sort(compareVersions)
    }

    // only return "limit"-number of entries
    if (limit) {
      const l = releases.length
      releases = releases.slice(0, limit < l ? limit : l)
    }

    return releases
  }
  
  async getRelease(spec: PackageSpecifier, { 
    listener = undefined,
    prefix = undefined
  } : FetchPackageOptions = {}) : Promise<IRelease | undefined> {

    // notify client about process start
    if ((listener !== undefined) && (typeof listener === 'function')) {
      listener(PROCESS_STATES.RESOLVE_PACKAGE_STARTED, {})
    }
    const releases = await this.listReleases(spec)

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
      if ((listener !== undefined) && (typeof listener === 'function')) {
        listener(PROCESS_STATES.RESOLVE_PACKAGE_FINISHED, { latest })
      }
      return undefined
    }

    // notify client about process end
    if ((listener !== undefined) && (typeof listener === 'function')) {
      listener(PROCESS_STATES.RESOLVE_PACKAGE_FINISHED, { latest })
    }

    return latest
  }

  async downloadPackage(locator : PackageLocator, listener? : StateListener) : Promise<Buffer> {

    const hasListener = (listener !== undefined) && (typeof listener === 'function')

    // wrap onProgress
    let progress = 0;
    const _onProgress = (p : number) => {
      const progressNew = Math.floor(p * 100);
      if (progressNew > progress) {
        progress = progressNew;
         // console.log(`downloading update..  ${pn}%`)
        if ((listener !== undefined) && (typeof listener === 'function')) {
          listener(PROCESS_STATES.DOWNLOAD_PROGRESS, { progress })
        }
      }
    }

    // download release data / asset
    const { location } = locator as IRelease // FIXME
    if (!location) throw new Error('package location not found')
    if ((listener !== undefined) && (typeof listener === 'function')) {
      listener(PROCESS_STATES.DOWNLOAD_STARTED, { location })
    }
    const packageData = await download(location, _onProgress)
    if ((listener !== undefined) && (typeof listener === 'function')) {
      listener(PROCESS_STATES.DOWNLOAD_FINISHED, { location, size: packageData.length })
    }

    return packageData
  }

}