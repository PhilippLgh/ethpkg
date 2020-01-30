import fs from 'fs'
import { IRepository, FetchOptions, IRelease } from './IRepository'

export default class FileSystemRepository implements IRepository {
  name: string = 'FileSystemRepository';
  dirPath: string;
  constructor({ 
    project = '' 
  }) {
    this.dirPath = project
  }
  async listReleases(options?: FetchOptions | undefined): Promise<Array<IRelease>> {
    const files = fs.readdirSync(this.dirPath)
    const releases = files.map(f => {
      const release : IRelease = {
        fileName: f
      }
      return release
    })
    return releases
  }
}