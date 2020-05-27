import { IRepository, IRelease, FetchOptions, PublishOptions, Credentials } from './IRepository'
import { Octokit } from '@octokit/rest'
import { extractVersionFromString, extractChannelFromVersionString, versionToDisplayVersion } from '../utils/FilenameHeuristics'
import { datestring } from '../utils/PackageUtils'
import { IPackage } from '../PackageManager/IPackage'

export default class GitHubRepository implements IRepository {

  name: string = 'GitHubRepository'

  private client: Octokit;
  private owner: string;
  private repo: string;

  constructor({
    owner = '',
    project = '',
    auth = undefined
  }) {
    // WARNING: For unauthenticated requests, the rate limit allows for up to 60 requests per hour.
    if (process.env.GITHUB_TOKEN && typeof process.env.GITHUB_TOKEN === 'string') {
      // TODO make sure it works in browser
      this.client = new Octokit({
        // @ts-ignore
        auth: process.env.GITHUB_TOKEN
      })
    } else {
      this.client = new Octokit({
        auth
      })
    }
    this.owner = owner
    this.repo = project
    this.toRelease = this.toRelease.bind(this)
  }

  private _toRelease(
    name: string,
    tag_name: string,
    assetName: string,
    size: number,
    updated_at: string,
    browser_download_url: string,
    original: any
  ): IRelease {

    const version = extractVersionFromString(tag_name)
    const displayVersion = versionToDisplayVersion(version)
    const channel = extractChannelFromVersionString(version)

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
      original
    }
  }

  private toRelease(releaseInfo: any /*ReposListReleasesResponseItem*/): IRelease[] {
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
      name: releaseName,
      tag_name,
      target_commitish: branch
    } = releaseInfo

    let releases = assets.map((asset: any /*ReposListReleasesResponseItemAssetsItem*/) => {

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

      const original = {
        releaseInfo: releaseInfoCopy,
        asset
      }

      return this._toRelease(releaseName, tag_name, assetName, size, updated_at, browser_download_url, original)
    })

    return releases
  }

  async listReleases(options?: FetchOptions): Promise<IRelease[]> {
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

      // convert to IRelease list and flatten
      let releases = releaseInfo.data.map(this.toRelease).reduce((prev, cur) => {
        return prev.concat(cur)
      })
      // console.log('latest releases unsorted\n', releases.map(r => `{ version: '${r.version}', channel: '${r.channel}' }`).slice(0, 5).join(',\n'))
      return releases
    } catch (error) {
      throw new Error('Could not retrieve release list from GitHub: ' + (error ? error.message : ''))
      throw error
    }
  }

  async publish(pkg: IPackage, options?: PublishOptions): Promise<IRelease> {

    const version = pkg.metadata ? pkg.metadata.version : extractVersionFromString(pkg.fileName) || Date.now()

    const { data: releaseDraft } = await this.client.repos.createRelease({
      owner: this.owner,
      repo: this.repo,
      tag_name: 'v' + version,
      name: `${pkg.fileName} - ${version}`,
      draft: false,
      body: 'ethpkg auto-generated release'
    });

    if (!releaseDraft) {
      throw new Error('Release draft failed')
    }

    const fileName = pkg.fileName
    const contentType = fileName.endsWith('.txt') ? 'text/plain' : 'application/octet-stream'
    const contentLength = pkg.size

    const githubOpts = {
      owner: this.owner,
      repo: this.repo,
      release_id: releaseDraft.id,
      url: releaseDraft.upload_url,
      headers: {
        'content-type': contentType,
        'content-length': contentLength,
      },
      name: fileName,
      data: await pkg.toBuffer()
    }
    // @ts-ignore see: https://github.com/octokit/rest.js/issues/1645
    const { data: assetResponse } = await this.client.repos.uploadReleaseAsset(githubOpts)

    if (!assetResponse) {
      throw new Error('Asset upload failed')
    }

    const { tag_name } = releaseDraft
    const {
      name: assetName,
      size,
      updated_at,
      browser_download_url
    } = assetResponse as any

    const original = {
      releaseDraft,
      assetResponse
    }

    const release = this._toRelease(assetName, tag_name, assetName, size, updated_at, browser_download_url, original)

    return release
  }

}