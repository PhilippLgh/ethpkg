import fs from 'fs'
import path from 'path'
import TarPackage from './TarPackage'
import { assert } from 'chai'
import { localFileToIFile } from '../util'
import { toIFile } from '../utils/PackageUtils'

describe('TarPackage (IPackage)', () => {

  const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
  const FOO_PACKAGE_COMPRESSED = path.join(FIXTURES, 'foo.tar.gz')
  const FOO_PACKAGE_DECOMPRESSED = path.join(FIXTURES, 'foo.tar')
  const FOO_PACKAGE_WRITE_COMPRESSED = path.join(FIXTURES, 'foo_write_test.tar.gz')
  const FOO_DIR= path.join(FIXTURES, 'foo')
  const FOO_NESTED_DIR= path.join(FIXTURES, 'foo_nested')
  const BAZ_TXT = path.join(FIXTURES, 'baz.txt')

  describe('loadBuffer(buf: Buffer): Promise<void> ', async () => {
    it('create an IPackage from tar buffer', async () => {
      const buf = fs.readFileSync(FOO_PACKAGE_COMPRESSED)
      const pkg = new TarPackage('my-package.tar.gz')
      await pkg.loadBuffer(buf)
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 3)
    })
  })

  describe('async getEntries(): Promise<IPackageEntry[]>', () => {
    it('returns all entries (files and dirs) from tar package', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const entries = await pkg.getEntries()
      // ./foo/ & ./foo/foo.txt & ./foo/bar.txt
      assert.equal(entries.length, 3)
    })
  })

  describe('async getEntry(relativePath: string): Promise<IPackageEntry | undefined>', async () => {
    it('finds an entry by its relative path', async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const entry = await pkg.getEntry('/foo/bar.txt')
      assert.isDefined(entry)
    })
  })

  describe('async getContent(relativePath: string): Promise<Buffer>', async () => {
    it(`finds an entry by its relative path and returns the file's content`, async () => {
      const pkg = new TarPackage(FOO_PACKAGE_COMPRESSED)
      const content = await pkg.getContent('foo/bar.txt')
      assert.equal(content.toString(), 'bar')
    })
  })

  describe('addEntry(relativePath: string, file: IFile) : Promise<string>', async () => {
    it('adds a file to a newly created package', async () => {
      // NOTE: this will NOT work:
      // const pkg = await new TarPackage().loadBuffer(Buffer.from(''))
      const pkg = await TarPackage.create('my-package.tar')
      await pkg.addEntry('baz.txt', toIFile('baz.txt', 'baz'))
      const content = await pkg.getContent('baz.txt')
      assert.equal(content.toString(), 'baz')
    })
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

  describe('static async create(dirPathOrName : string) : Promise<TarPackage>', async () => {
    it('creates an empty tar if dirPathOrName argument is not a path', async () => {
      const pkg = await TarPackage.create('my-package.tar')
      const entries = await pkg.getEntries()
      assert.equal(entries.length, 0)
    })
    it('creates a tar archive from a directory', async () => {
      const pkg = await TarPackage.create(FOO_DIR)
      const content = await pkg.getContent('foo.txt')
      assert.equal(content.toString(), 'foo')
    })
    it('creates a tar archive from a directory with nested subdirectories', async () => {
      const pkg = await TarPackage.create(FOO_NESTED_DIR)
      assert.isDefined(pkg)
      const entries = await pkg.getEntries()
      // FIXME inconsistency with zip: it should create a dir entry and have 4 entries
      assert.equal(entries.length, 3)
      const baz = await pkg.getContent('baz/baz.txt')
      assert.equal(baz.toString(), 'baz')
    })
  })

  describe('async writePackage(outPath: string): Promise<string>', () => {
    it('compresses the contents if the outPath contains gzip extension', async () => {
      let pkg = await TarPackage.create(FOO_DIR)
      await pkg.writePackage(FOO_PACKAGE_WRITE_COMPRESSED, { overwrite: true })
      const pkg2 = await TarPackage.from(FOO_PACKAGE_WRITE_COMPRESSED)
      assert.isTrue((<TarPackage>pkg2).isGzipped)
      let content = await pkg2.getContent('./bar.txt')
      assert.equal(content.toString(), 'bar')
    })
    it('can overwrite existing packages', () => {
      
    })
  })

  describe.skip('static async from(packagePath : string) : Promise<IPackage>', () => {})


})