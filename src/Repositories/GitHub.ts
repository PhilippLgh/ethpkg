import { IRepository, IRelease, FetchOptions } from './IRepository'
import GitHub, { ReposListReleasesResponseItem, ReposListReleasesResponseItemAssetsItem } from '@octokit/rest'
import { extractVersionFromString, extractChannelFromVersionString, versionToDisplayVersion } from '../utils/FilenameHeuristics'
import { datestring } from '../utils/PackageUtils'

export default class GitHubRepository implements IRepository {

  name: string = 'GitHubRepository'

  private client: GitHub;
  private owner: string;
  private repo: string;

  constructor({ 
    owner = '', 
    project = '' 
  }) {
    // WARNING: For unauthenticated requests, the rate limit allows for up to 60 requests per hour.
    if (process.env.GITHUB_TOKEN && typeof process.env.GITHUB_TOKEN === 'string') {
      // TODO make sure it works in browser
      this.client = new GitHub({
        // @ts-ignore
        auth: process.env.GITHUB_TOKEN
      })
    } else {
      this.client = new GitHub()
    }
    this.owner = owner
    this.repo = project
    this.toRelease = this.toRelease.bind(this)
  }

  private toRelease(releaseInfo : ReposListReleasesResponseItem) : IRelease[] {
    const {
      /*
      url,
      assets_url,
      html_url,
      upload_url,
      tarball_url,
      zipball_url,
      id,
      node_id,
      tag_name,
      target_commitish,
      name,
      body,
      draft,
      prerelease,
      created_at,
      published_at,
      author,
      */
      assets,
      name : releaseName,
      tag_name,
      target_commitish : branch
    } = releaseInfo

    let releases = assets.map((asset : ReposListReleasesResponseItemAssetsItem) => {

      const version = extractVersionFromString(tag_name)
      const displayVersion = versionToDisplayVersion(version)
      const channel = extractChannelFromVersionString(version)

      const {
        browser_download_url,
        content_type,
        created_at,
        download_count,
        id,
        label,
        name: assetName,
        node_id,
        size,
        state,
        updated_at,
        // uploader,
        url,
      } = asset

      let releaseInfoCopy = JSON.parse(JSON.stringify(releaseInfo))
      delete releaseInfoCopy.assets

      const updated_ts = Date.parse(updated_at) // return timestamp

      return {
        name: `${this.owner}_${this.repo}`,
        version,
        displayVersion,
        channel,
        fileName: assetName,
        size,
        updated_ts,
        updated_at: datestring(updated_ts),
        location: browser_download_url,
        original: {
          releaseInfo: releaseInfoCopy,
          asset
        }
      }
    })

    return releases
  }
  
  async listReleases(options? : FetchOptions): Promise<IRelease[]> {
    // FIXME use pagination
    try {
      let releaseInfo = await this.client.repos.listReleases({
        owner: this.owner,
        repo: this.repo,
        /**
         * Results per page (max 100)
         */
        // per_page?: number;
        /**
         * Page number of the results to fetch.
         */
        // page?: number;
      })
      // convert to IRelease list
      let releases = releaseInfo.data.map(this.toRelease).reduce((prev, cur) => {
        return prev.concat(cur)
      })
      // console.log('latest releases unsorted\n', releases.map(r => `{ version: '${r.version}', channel: '${r.channel}' }`).slice(0, 5).join(',\n'))
      return releases
    } catch (error) {
      throw new Error('Could not retrieve release list from GitHub: '+ (error ? error.message : '' ))
      throw error
    }
  }

}