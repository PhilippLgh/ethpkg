import { IRepository, IRelease, FetchOptions } from "./IRepository"
import { extractVersionFromString, extractChannelFromVersionString, versionToDisplayVersion } from "../utils/FilenameHeuristics"
import { datestring } from "../Utils/PackageUtils"
import { request, downloadStreamToBuffer } from "../Downloader";
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

  private toRelease(releaseInfo : any) : IRelease[] {
    const releases : any = []
    return releases
  }
  
  async listReleases(options? : FetchOptions): Promise<IRelease[]> {
    return []
  }

  async publish(pkg: IPackage) {
    const response = await request('POST', 'https://ipfs.infura.io:5001/api/v0/add?pin=false', {
      'Content-Type': 'multipart/form-data',
      Body: await pkg.toBuffer()
    })
    console.log('response', response.statusCode)
    const resp : any = await downloadStreamToBuffer(response)
    console.log('hash: ', JSON.parse(resp.toString()).Hash)
  }

}