import { IRepository, IRelease, FetchOptions, PublishOptions } from './IRepository'
import { extractVersionFromString, extractChannelFromVersionString, versionToDisplayVersion } from '../utils/FilenameHeuristics'
import { datestring } from '../utils/PackageUtils'
import { request, downloadStreamToBuffer, downloadJson, download } from '../Downloader'
import { IPackage } from '../PackageManager/IPackage'

class File {
  readonly lastModified: number;
  readonly name: string;
  readonly type: string
  buffer: Buffer
  size: number
  constructor(options: any){
    this.name = options.name
    this.type = 'application/gzip'
    this.lastModified = Date.now()
    this.buffer = options.buffer
    this.size = this.buffer.byteLength
  }
}
/**
 * https://github.com/ipfs/go-ipfs/issues/6523
 */


export default class IpfsRepository implements IRepository {

  name: string = 'IpfsRepository'

  private owner: string;
  private repo: string;

  constructor({ 
    owner = '', 
    project = '' 
  } = {}) {
    this.owner = owner
    this.repo = project
    this.toRelease = this.toRelease.bind(this)
  }

  get api() {
    return 'https://ipfs.infura.io:5001/api/v0'
  }

  private toRelease(releaseInfo : any) : IRelease[] {
    const releases : any = []
    return releases
  }
  
  async listReleases(options? : FetchOptions): Promise<IRelease[]> {
    const dirHash = '' // TODO use service to keep track of dir
    const endpoint = `${this.api}/dag/get?arg=${dirHash}`
    const packageInfo = await download(endpoint)
    const pkgInfo = JSON.parse(packageInfo.toString())
    // console.log('package info', pkgInfo)
    return pkgInfo.links.map((info: any) => {
      const release : IRelease = {
        fileName: info.Name
      }
    })
  }

  async publish(pkg: IPackage, {}: PublishOptions = {}) : Promise<IRelease> {
    const dirHash = '' // TODO use service to keep track of dir
    const endpoint = `${this.api}/add?pin=false`
    // const endpoint = 'https://ipfs.infura.io:5001/api/v0/add?pin=false&wrap-with-directory=true'
    // FIXME make File object
    const data = await pkg.toBuffer()
    const file = new File({
      name: pkg.fileName,   // required
      // type: "text/plain",     // optional
      buffer: data
    })
    const response = await request('POST', endpoint, {
      'Content-Type': 'multipart/form-data',
      Body: data,
      fileName: pkg.fileName
    })
    // console.log('response', response.statusCode)
    const resp : any = await downloadStreamToBuffer(response)
    // response is line-delimited json stream (see json stream)
    const responses = resp.toString().split('\n').filter((l : string) => !!l).map((l: string) => JSON.parse(l))
    // console.log('raw response', responses)

    return {
      fileName: pkg.fileName
    }
  }

}