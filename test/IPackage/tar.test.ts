import fs from 'fs'
import path from 'path'
import TarPackage from '../../src/PackageManager/TarPackage'
import { assert } from "chai"

describe("TarPackage (IPackage)", () => {

  const FOO_PACKAGE = path.join(__dirname, '..', 'fixtures', 'foo.tar.gz')
  const FOO_DIR= path.join(__dirname, '..', 'fixtures', 'foo')
  const BAZ_TXT = path.join(__dirname, '..', 'fixtures', 'baz.txt')

  describe("loadBuffer(buf: Buffer): Promise<void> ", async () => {
    it('create an IPackage from tar buffer', async () => {
      const buf = fs.readFileSync(FOO_PACKAGE)
      const pkg = new TarPackage()
      await pkg.loadBuffer(buf)
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 3)
    })
  })

  describe("async getEntries(): Promise<IPackageEntry[]>", () => {
    it('returns all entries (files and dirs) from tar package', async () => {
      const pkg = new TarPackage(FOO_PACKAGE)
      const entries = await pkg.getEntries()
      // ./foo/ & ./foo/foo.txt & ./foo/bar.txt
      assert.equal(entries.length, 3)
    })
  })

  describe("async getEntry(relativePath: string): Promise<IPackageEntry | undefined>", async () => {
    it('finds an entry by its relative path', async () => {
      const pkg = new TarPackage(FOO_PACKAGE)
      const entry = await pkg.getEntry('/foo/bar.txt')
      assert.isDefined(entry)
    })
  })

  describe("async getContent(relativePath: string): Promise<Buffer>", async () => {
    it('finds an entry by its relative path', async () => {
      const pkg = new TarPackage(FOO_PACKAGE)
      const content = await pkg.getContent('foo/bar.txt')
      assert.equal(content.toString(), 'bar')
    })
  })

  describe("async addEntry(relativePath: string, filePath: string | Buffer): Promise<string>", async () => {
    it.skip('adds a file to an existing package', async () => {
      const pkg = new TarPackage(FOO_PACKAGE)
      await pkg.addEntry('baz.txt', fs.readFileSync(BAZ_TXT).toString())
      const content = await pkg.getContent('baz.txt')
      assert.equal(content.toString(), 'baz')
    })
  })

  describe("static async create(dirPath : string) : Promise<TarPackage>", async () => {
    it('create a tar archive from a directory', async () => {
      const pkg = await TarPackage.create(FOO_DIR)
      const content = await pkg.getContent('foo.txt')
      assert.equal(content.toString(), 'foo')
    })
  })

})