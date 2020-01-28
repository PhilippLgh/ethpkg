import fs from 'fs'
import path from 'path'
import ZipPackage from '../../src/PackageManager/ZipPackage'
import { assert } from 'chai'
import { IPackage } from '../../src'
import { IFile } from '../../src/PackageManager/IPackage'
import { localFileToIFile } from '../../src/util'
import { toIFile } from '../../src/utils/PackageUtils'

describe('ZipPackage (IPackage)', () => {

  const FOO_PACKAGE = path.join(__dirname, '..', 'fixtures', 'foo.zip')
  const FOO_DIR= path.join(__dirname, '..', 'fixtures', 'foo')
  const FOO_NESTED_DIR= path.join(__dirname, '..', 'fixtures', 'foo_nested')
  const BAZ_TXT = path.join(__dirname, '..', 'fixtures', 'baz.txt')

  describe('loadBuffer(buf: Buffer): Promise<void> ', async () => {
    it('create an IPackage from tar buffer', async () => {
      const buf = fs.readFileSync(FOO_PACKAGE)
      const pkg = new ZipPackage(FOO_PACKAGE)
      await pkg.loadBuffer(buf)
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 3)
    })
  })

  describe('async getEntries(): Promise<IPackageEntry[]>', () => {
    it('returns all entries (files and dirs) from tar package', async () => {
      const pkg = new ZipPackage(FOO_PACKAGE)
      const entries = await pkg.getEntries()
      // ./foo/ & ./foo/foo.txt & ./foo/bar.txt
      assert.equal(entries.length, 3)
    })
  })

  describe('async getEntry(relativePath: string): Promise<IPackageEntry | undefined>', async () => {
    it('finds an entry by its relative path', async () => {
      const pkg = new ZipPackage(FOO_PACKAGE)
      const entry = await pkg.getEntry('/foo/bar.txt')
      assert.isDefined(entry)
    })
  })

  describe('async getContent(relativePath: string): Promise<Buffer>', async () => {
    it('finds an entry by its relative path', async () => {
      const pkg = new ZipPackage(FOO_PACKAGE)
      const content = await pkg.getContent('foo/bar.txt')
      assert.equal(content.toString(), 'bar')
    })
  })

  describe('addEntry(relativePath: string, file: IFile) : Promise<string>', async () => {
    it('adds a file to a newly created zip package', async () => {
      // NOTE: this will NOT work:
      // const pkg = await new TarPackage().loadBuffer(Buffer.from(''))
      const pkg = await ZipPackage.create('my-package.zip')
      await pkg.addEntry('baz.txt', toIFile('baz.txt', 'baz'))
      const content = await pkg.getContent('baz.txt')
      assert.equal(content.toString(), 'baz')
    })
    it.skip('adds a file to an existing <uncompressed> zip package', async () => {
      // needs fixture data
    })
    it('adds a file to an existing <compressed> zip package', async () => {
      const pkg : IPackage = new ZipPackage(FOO_PACKAGE)
      const file = localFileToIFile(BAZ_TXT)
      await pkg.addEntry('baz.txt', file)
      const content = await pkg.getContent('baz.txt')
      assert.equal(content.toString(), 'baz')
    })
  })

  describe('static async create(dirPath : string) : Promise<ZipPackage>', async () => {
    it('creates an empty tar if dirPathOrName argument is not a path', async () => {
      const pkg = await ZipPackage.create('my-package.zip')
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 0)
    })
    it('creates a zip archive from a directory', async () => {
      const pkg = await ZipPackage.create(FOO_DIR)
      const content = await pkg.getContent('foo.txt')
      assert.equal(content.toString(), 'foo')
    })
    it('creates a zip archive from a directory with nested subdirectories', async () => {
      const pkg = await ZipPackage.create(FOO_NESTED_DIR)
      assert.isDefined(pkg)
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 4)
      const baz = await pkg.getContent('baz/baz.txt')
      assert.equal(baz.toString(), 'baz')
    })
  })

})