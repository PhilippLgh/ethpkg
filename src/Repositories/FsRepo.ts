import fs from 'fs'
import path from 'path'
import { IRepository, FetchOptions, IRelease } from './IRepository'

export default class FileSystemRepository implements IRepository {
  name: string = 'FileSystemRepository';
  dirPath: string;
  constructor({ 
    project = '' 
  }) {
    this.dirPath = project
  }
  private toRelease(fileName: string) : IRelease {
    const fullPath = path.join(this.dirPath, fileName)
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
      const {
        name, version, displayVersion, channel, fileName,
        updated_ts, updated_at, size, original, error, location, remote
      } = data
      return {
        name,
        version,
        displayVersion, // v prefixed short version without prerelease info
        channel,
        fileName,
        updated_ts, // timestamp: last date of modification / (re-) publishing
        updated_at, // display date version
        size, // size of the asset / package
        original, // the original response object before it was parsed
        error, // error message
        location, // download url or path to package
        remote // if package is available locally or only remote
      }
    } catch (error) {
      return {
        fileName,
        error: 'Could not parse metadata file'
      }
    }
  }
  /**
   * The FS Repo expects a structure:
   * my-package-1.0.0.tar.gz
   * my-package-1.0.0.tar.gz.json
   * where package and metadata are stored next to each other
   * @param options 
   */
  async listReleases(options?: FetchOptions | undefined): Promise<Array<IRelease>> {
    const files = fs.readdirSync(this.dirPath)
    const releases = files.filter(f => f.endsWith('.json')).map(this.toRelease.bind(this))
    return releases
  }
}