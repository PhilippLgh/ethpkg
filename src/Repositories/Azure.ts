import { IRepository, IRelease, FetchOptions } from "./IRepository"
import { download } from "../Downloader"
import { parseXml } from "../util"
import { hasPackageExtension, hasSignatureExtension, removeExtension } from "../utils/FilenameUtils"
import { extractPlatformFromString, extractArchitectureFromString, extractVersionFromString, versionToDisplayVersion } from "../utils/FilenameHeuristics"
import { datestring } from "../utils/PackageUtils"

interface AzureBlob {
  Name: Array<string>
  Properties: Array<{
    'Last-Modified': Array<Date>
    'Etag': Array<string>
    'Content-Length': Array<string>
    'Content-Type': Array<string>
    'Content-MD5': Array<string>
  }>
}

export default class AzureRepository implements IRepository {

  name: string = 'AzureRepository'
  repositoryUrl: string;

  constructor({ project } : {[index: string] : string}) {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/list-blobs
    this.repositoryUrl = `https://${project}.blob.core.windows.net/builds?restype=container&comp=list`
    this.toRelease = this.toRelease.bind(this)
  }

  toRelease(releaseInfo : AzureBlob) : IRelease {
    /* unhandled:
      'Content-Encoding': [ '' ],
      'Content-Language': [ '' ],
      'Cache-Control': [ '' ],
      'Content-Disposition': [ '' ],
      'BlobType': [ 'BlockBlob' ],
      'LeaseStatus': [ 'unlocked' ],
      'LeaseState': [ 'available' ]
    */
    const fileName = releaseInfo.Name[0]
    const name = removeExtension(fileName)
    const Properties = releaseInfo.Properties[0]
    const lastModified = Properties['Last-Modified'][0]
    const etag = Properties['Etag'][0]
    const size = Properties['Content-Length'][0]
    const contentType = Properties['Content-Type'][0]
    const md5 = Properties['Content-MD5'][0]

    const version = extractVersionFromString(name)
    const displayVersion = versionToDisplayVersion(version)

    // heuristics are not guaranteed to give accurate results:
    const platform = extractPlatformFromString(name)
    const arch = extractArchitectureFromString(name)

    let md5AtoB = Buffer.from(md5, 'base64').toString('binary')
    md5AtoB = md5AtoB.split('').map(char => ('0' + char.charCodeAt(0).toString(16)).slice(-2)).join('')

    // FIXME use url parser
    const baseUrl = this.repositoryUrl.split("?").shift()

    const location = `${baseUrl}/${fileName}`

    const updated_ts = new Date(lastModified).getTime()

    let release = {
      name,
      fileName,
      version,
      displayVersion,
      updated_ts,
      updated_at: datestring(updated_ts),
      platform,
      arch,
      tag: version,
      commit: undefined,
      size,
      channel: undefined,
      location: location,
      error: undefined,
      checksums: {
        md5: md5AtoB
      },
      remote: true
    } as any

    return release
  }
  
  async listReleases(options? : FetchOptions): Promise<IRelease[]> {
    // console.time('download')
    const parameterizedUrl = this.repositoryUrl
    const result = await download(parameterizedUrl)
    // console.timeEnd('download')

    // console.time('parse')
    let parsed
    try {
      parsed = await parseXml(result)
    } catch (error) {
      console.log('error: release feed could not be parsed: ', result)
      return []
    }
    // console.timeEnd('parse') // 93.232ms

    // @ts-ignore
    const blobs = parsed.EnumerationResults.Blobs[0].Blob
    if(!blobs) {
      return []
    }

    // console.time('convert')
    let releases = blobs.map(this.toRelease)
    // console.timeEnd('convert') // 11.369ms

    // filter non-package assets and map signatures (.asc)
    let mapping : {[index : string] : IRelease } = {}
    const packages : any = []
    releases.forEach((release : IRelease) => {
      const { fileName, version } = release
      if (!fileName) return // ignore
      const isExtensionSupported = hasPackageExtension(fileName)
      if(isExtensionSupported && version){
        packages.push(release)
      }
      else if(hasSignatureExtension(fileName)){
        mapping[fileName] = release
      } else {
        // console.log('ignored', fileName)
      }
    })

    // 2nd iteration to apply mapping
    packages.forEach((release : any) => {
      // TODO move to utils? - hardcoded signature extension
      // construct lookup key
      const k = release.fileName + '.asc'
      if(mapping[k]){
        release.signature = mapping[k].location
      }
    })

    return packages
  }
}
