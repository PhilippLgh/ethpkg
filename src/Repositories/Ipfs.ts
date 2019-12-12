import { IRepository, IRelease, FetchOptions } from "../Fetcher/IRepository"
import { extractVersionFromString, extractChannelFromVersionString, versionToDisplayVersion } from "../utils/FilenameHeuristics"
import { datestring } from "../Utils/PackageUtils"

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

}