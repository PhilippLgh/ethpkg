import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import FsRepo from './FsRepo'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const REPO_DIR = path.join(FIXTURES, 'FsRepo')

describe('FilesystemRepo', function() {
  describe('async listReleases(options? : FetchOptions): Promise<IRelease[]> ', function() {
    // TODO fixture dir does not match expected struct + .json files
    it.skip('fetches a list of releases', async () => {
      const fsRepo = new FsRepo({ project: REPO_DIR })
      const releases = await fsRepo.listReleases()
      assert.equal(releases.length, 0)
    })
  })
})
