import fs from 'fs'
import path from 'path'
import TarPackage from '../../src/PackageManager/TarPackage'
import { assert } from "chai"
import { localFileToIFile } from '../../src/util'

describe("TarPackage (IPackage)", () => {

  const FOO_PACKAGE_COMPRESSED = path.join(__dirname, '..', 'fixtures', 'foo.tar.gz')
  const FOO_PACKAGE_DECOMPRESSED = path.join(__dirname, '..', 'fixtures', 'foo.tar')
  const FOO_PACKAGE_WRITE_COMPRESSED = path.join(__dirname, '..', 'fixtures', 'foo_write_test.tar.gz')
  const FOO_DIR= path.join(__dirname, '..', 'fixtures', 'foo')
  const BAZ_TXT = path.join(__dirname, '..', 'fixtures', 'baz.txt')

  describe("loadBuffer(buf: Buffer): Promise<void> ", async () => {
    it('create an IPackage from tar buffer', async () => {
      const buf = fs.readFileSync(FOO_PACKAGE_COMPRESSED)
      const pkg = new TarPackage()
      await pkg.loadBuffer(buf)
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 3)
    })
  })

  describe("async getEntries(): Promise<IPackageEntry[]>", () => {
    it('returns all entries (files and dirs) from tar package', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const entries = await pkg.getEntries()
      // ./foo/ & ./foo/foo.txt & ./foo/bar.txt
      assert.equal(entries.length, 3)
    })
  })

  describe("async getEntry(relativePath: string): Promise<IPackageEntry | undefined>", async () => {
    it('finds an entry by its relative path', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const entry = await pkg.getEntry('/foo/bar.txt')
      assert.isDefined(entry)
    })
  })

  describe("async getContent(relativePath: string): Promise<Buffer>", async () => {
    it(`finds an entry by its relative path and returns the file's content`, async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const content = await pkg.getContent('foo/bar.txt')
      assert.equal(content.toString(), 'bar')
    })
  })

  describe("addEntry(relativePath: string, file: IFile) : Promise<string>", async () => {
    it('adds a file to an existing <decompressed> tar package', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_DECOMPRESSED)
      const entry = await pkg.getEntry('baz.txt')
      assert.isUndefined(entry)
      // prepare file
      const file = localFileToIFile(BAZ_TXT)
      await pkg.addEntry('baz.txt', file)
      const content = await pkg.getContent('baz.txt')
      assert.equal(content.toString(), 'baz')
    })
    it('adds a file to an existing <compressed> tar package', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const entry = await pkg.getEntry('baz.txt')
      assert.isUndefined(entry)
      // prepare file
      const file = localFileToIFile(BAZ_TXT)
      await pkg.addEntry('baz.txt', file)
      const content = await pkg.getContent('baz.txt')
      assert.equal(content.toString(), 'baz')
    })
    it('overwrites existing files', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      // check that foo/bar exists and has content 'bar'
      let content = await pkg.getContent('foo/bar.txt')
      assert.equal(content.toString(), 'bar')
      // prepare file
      const file = localFileToIFile(BAZ_TXT)
      // overwrite foo/bar.txt with file baz.txt
      await pkg.addEntry('foo/bar.txt', file)
      // read file again
      const content2 = await pkg.getContent('foo/bar.txt')
      // contents must not be same
      assert.notEqual(content.toString(), content2.toString())
      assert.equal(content2.toString(), fs.readFileSync(BAZ_TXT, 'utf8'))
    })
  })

  describe("static async create(dirPath : string) : Promise<TarPackage>", async () => {
    it('create a tar archive from a directory', async () => {
      const pkg = await TarPackage.create(FOO_DIR)
      const content = await pkg.getContent('foo.txt')
      assert.equal(content.toString(), 'foo')
    })
    it.skip('create a tar archive from a directory with nested subdirectories', async () => {
      // TODO needs implementation
    })
  })

  describe('async writePackage(outPath: string): Promise<string>', () => {
    it('compresses the contents if the outPath contains gzip extension', async () => {
      let pkg = await TarPackage.create(FOO_DIR)
      await pkg.writePackage(FOO_PACKAGE_WRITE_COMPRESSED)
      const pkg2 = await TarPackage.from(FOO_PACKAGE_WRITE_COMPRESSED)
      assert.isTrue((<TarPackage>pkg2).isGzipped)
      let content = await pkg2.getContent('./bar.txt')
      assert.equal(content.toString(), 'bar')
    })
  })

  describe.skip('static async from(packagePath : string) : Promise<IPackage>', () => {})


})