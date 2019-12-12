import path from 'path'
import { IRepository, FetchOptions, IRelease } from "../Fetcher/IRepository"
import { download, downloadJson } from "../Downloader"
import { datestring } from '../Utils/PackageUtils';

export default class NpmRepository implements IRepository {
  
  name: string = 'NpmRepository';
  owner: string;
  project: string;

  constructor({ owner, project } : {[index: string] : string}) {
    // if owner / scope does not start with @ requests will fail
    if (owner && !owner.startsWith('@')) {
      owner = `@${owner}`
    }
    this.owner = owner
    this.project = project
    this.toRelease = this.toRelease.bind(this)
  }

  private toRelease(npmRelease: any /* package.json + extras */, time: any) {
    const {
      name,
      version,
      description,
      dist,
      _from
    } = npmRelease

    const {
      integrity,
      shasum,
      tarball,
      fileCount,
      unpackedSize,
      'npm-signature': signature
    } = dist

    const fileName = tarball.split('/').pop()

    let updated_ts = undefined
    let updated_at = undefined
    if (version in time) {
      updated_ts = Date.parse(time[version])
      updated_at = datestring(updated_ts)
    }
    
    return {
      name,
      version,
      displayVersion: version,
      channel: undefined,
      fileName,
      updated_ts,
      updated_at,
      original: npmRelease,
      // error: undefined,
      location: tarball,
      remote: true
    }
  }
  
  async listReleases(options?: FetchOptions | undefined): Promise<IRelease[]> {
    const packageAuthor = this.owner
    const packageName = this.project
    const packageFullName = packageAuthor ? `${packageAuthor}/${packageName}` : packageName
    const apiEndpoint = `https://registry.npmjs.org/${packageFullName}`
    const parameterizedUrl = apiEndpoint

    const result = await downloadJson(parameterizedUrl)
    const { versions, readme, license, bugs, author, maintainers, time } = result

    let releases = Object.values(versions).map(v => this.toRelease(v, time))
    return releases
  }

}