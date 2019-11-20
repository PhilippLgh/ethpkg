import { IRepository, IRelease, FetchOptions } from "./IRepository"
import pickRepository, { repos } from "./repositories"
import npa from 'npm-package-arg'
import Mock from "./repositories/test/Mock"
import { compareVersions, multiSort, compareDate } from "../Utils/PackageUtils"
import { download } from "../Downloader"
import { StateListener, PROCESS_STATES } from "../IStateListener"
import semver from 'semver'
import { hasPackageExtension } from "../utils/FilenameUtils"

// see https://github.com/npm/npm-package-arg
type PackageSpecifier = string

type PackageUrl = string

type PackageLocator = PackageUrl | IRelease | PackageSpecifier

export interface FetchPackageOptions {
  spec?: string, // FIXME make required
  version?: string;
  platform?: string;
  prefix?: string; // pass through for performance
  listener?: StateListener
}

export function instanceofFetchPackageOptions(object: any): object is FetchPackageOptions {
  return typeof object === 'object' && ('spec' in object)
}

/**
 * TODO add more unit testing for parser
 * example: npm:@philipplgh/ethpkg@^1.2.3
 * => <repo>:<owner>/<project>@<version>
 * @param spec 
 */
const parseSpec = (spec: string) => {
  if (!spec) return undefined
  const parts = spec.split(':')
  // TODO const repoNames = Object.keys(repos)
  const repoNames = ['azure', 'npm']
  if (parts.length > 0 && repoNames.includes(parts[0])) {
    const repo = parts[0]
    const package_parts = parts[1].split('/')
    const owner = package_parts.length > 1 ? package_parts[0] : undefined 
    let project = package_parts.length === 1 ? package_parts[0] : package_parts[1]
    // parses ethpkg@1.0.0
    const project_parts = project.split('@')
    const version = project_parts.length > 1 ? project_parts[1] : undefined
    if (project_parts.length > 1) {
      project = project.substring(0, project.indexOf('@'))
    }
    return {
      type: 'custom',
      repo,
      owner,
      project,
      version
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
    let versionSpecifier : string | undefined = undefined
    if (spec.startsWith('mock')) {
      const testCase = spec.split(':')[1]
      repository = new Mock(testCase)
    } else {
      const parsed = parseSpec(spec)
      if (!parsed) throw new Error(`Unsupported or invalid package specification: "${spec}"`)
  
      // custom parser was used
      if (parsed.type && parsed.type === 'custom') {
        // @ts-ignore FIXME
        const { repo, version } = parsed
        versionSpecifier = version
        repository = pickRepository(repo, parsed)
      } else {
        // @ts-ignore FIXME
        repository = pickRepository(parsed.hosted.type, parsed.hosted)
      }
  
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
    const versionFilter = semverFilter || versionSpecifier
    if(versionFilter) {
      // TODO move filter in utils
      releases = releases.filter(release => {
        if (!('version' in release)) {
          return false
        }
        const coercedVersion = semver.coerce(release.version)
        const release_version = coercedVersion ? coercedVersion.version : release.version
        if (release_version === undefined) return false
        return semver.satisfies(release_version, versionFilter)
      })
    }

    // sort releases by semver and date, and return them descending (latest first)
    // do not consider prerelease info (alphabetically) if it is e.g. commit hash
    if (sort) {
      releases =  releases.sort(multiSort(compareVersions, compareDate))
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
    prefix = undefined
  } : FetchPackageOptions = {}) : Promise<IRelease | undefined> {

    // notify client about process start
    listener(PROCESS_STATES.RESOLVE_PACKAGE_STARTED, {})
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
      listener(PROCESS_STATES.RESOLVE_PACKAGE_FINISHED, { latest })
      return undefined
    }

    // notify client about process end
    listener(PROCESS_STATES.RESOLVE_PACKAGE_FINISHED, { latest })

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