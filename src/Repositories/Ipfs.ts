import { IRepository, IRelease, FetchOptions } from "./IRepository"
import { extractVersionFromString, extractChannelFromVersionString, versionToDisplayVersion } from "../utils/FilenameHeuristics"
import { datestring } from "../Utils/PackageUtils"
import { request, downloadStreamToBuffer, downloadJson, download } from "../Downloader";
import { IPackage } from ".."

export default class IpfsRepository implements IRepository {

  name: string = 'IpfsRepository'

  private owner: string;
  private repo: string;

  constructor({ 
    owner = '', 
    project = '' 
  }) {
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
    const dirHash = 'QmWEV1pjbpKHskbC1hWCu5APNsPPk7XUAtzJEiq6EpCoov'
    const endpoint = `${this.api}/dag/get?arg=${dirHash}`
    const packageInfo = await download(endpoint)
    console.log('package info', packageInfo.toString())
    return []
  }

  async publish(pkg: IPackage) {
    const endpoint = `${this.api}/add?pin=false`
    // const endpoint = 'https://ipfs.infura.io:5001/api/v0/add?pin=false&wrap-with-directory=true'
    // FIXME make File object
    const data = await pkg.toBuffer()
    const response = await request('POST', endpoint, {
      'Content-Type': 'multipart/form-data',
      Body: data
    })
    console.log('response', response.statusCode)
    const resp : any = await downloadStreamToBuffer(response)
    // response is line-delimited json stream (see json stream)
    const responses = resp.toString().split('\n').filter((l : string) => !!l).map((l: string) => JSON.parse(l))
    /*
    [
      {
        Name: 'foo.tar',
        Hash: 'QmdRiUHrhzjqA6t47VvFngRxxmgG77ZHWmfppu3Zx35wo2',
        Size: '3083'
      }
    ]
    */
    console.log('raw response', responses)
  }

}