import { IRepository, IRelease, FetchOptions } from "./IRepository"
import { downloadJson } from "../Downloader"
import { datestring } from "../Utils/PackageUtils"
import { removeExtension } from "../utils/FilenameUtils"

export default class BintrayRepository  implements IRepository {

  name: string = 'BintrayRepository'
  owner: string
  repo: string
  package: any

  constructor(options: any) {
    this.owner = options.owner
    const parts = options.project.split('/')
    this.repo = parts[0]
    this.package = parts[1]
    this.toRelease = this.toRelease.bind(this)
  }

  toRelease(pkgInfo : any) : IRelease {
    const {
      name: nameOrg, // 'pantheon-0.8.2.tar.gz'
      path, // 'pantheon-0.8.2.tar.gz.asc'
      // repo, // pegasys-repo
      // package, // pantheon
      version,
      // owner, // consensys
      created,
      size,
      sha1,
      sha256
    } = pkgInfo

    const name = removeExtension(nameOrg)
    const displayName = name
    const fileName = nameOrg
    const commit = undefined
    const updated_ts = Date.parse(created)
    const channel = undefined
    const location = `https://bintray.com/${this.owner}/${this.repo}/download_file?file_path=${fileName}`

    return {
      name,
      version,
      displayVersion: version,
      channel,
      fileName,
      updated_ts,
      updated_at: datestring(updated_ts),
      location,
      error: undefined,
      original: pkgInfo,
      remote: true
    }
  }
  
  async listReleases(options?: FetchOptions | undefined): Promise<IRelease[]> {
    // https://bintray.com/docs/api/#_get_package_files does not seem to have prefix option
    const infoUrl = `https://api.bintray.com/packages/${this.owner}/${this.repo}/${this.package}/files`
    const packageInfo = await downloadJson(infoUrl)

    let releases = packageInfo
      .map(this.toRelease)

    // map signatures to releases
    //TODO releases = releases.filter((r : IRelease) => !r.fileName.endsWith('.asc'))

    return releases
  }
}
