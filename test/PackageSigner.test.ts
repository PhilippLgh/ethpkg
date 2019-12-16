import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import PackageSigner from '../src/PackageSigner'

const PRIVATE_KEY = "487ACD83B6ED4B8BE58480F0E6B19143E03EC8789BA8199FF5E106A0AA22971F"

describe("PackageSigner", function() {

  describe('isSigned(pkg : IPackage) : Promise<boolean>', function() {
    it('accepts package buffers as input', async () => {
      const fooPackage = path.join(__dirname, 'fixtures', 'foo.tar.gz')
      const buf = fs.readFileSync(fooPackage)
      const isSigned = await PackageSigner.isSigned(buf)
      assert.isTrue(isSigned)
    })
    it('returns true if the package contains ANY (valid/invalid) signatures', async () => {
      const fooPackage = path.join(__dirname, 'fixtures', 'foo.tar.gz')
      const buf = fs.readFileSync(fooPackage)
      const isSigned = await PackageSigner.isSigned(buf)
      assert.isTrue(isSigned)
    })
    it('returns false if the package contains ZERO signatures', async () => {
      const fooPackage = path.join(__dirname, 'fixtures', 'foo.tar.gz')
      const buf = fs.readFileSync(fooPackage)
      const isSigned = await PackageSigner.isSigned(buf)
      assert.isFalse(isSigned)
    })
  })

  describe(`static async sign(
    pkgSrc: string | Buffer, 
    privateKey? : Buffer | IExternalSigner,
    pkgPathOut? : string
  ) : Promise<IPackage | undefined>`, function() {
    it('signs an unsigned tar package when passed a package buffer + private key', async () => {
      const fooPackage = path.join(__dirname, 'fixtures', 'foo.tar.gz')
      const buf = fs.readFileSync(fooPackage)
      let isSigned = await PackageSigner.isSigned(buf)
      assert.isFalse(isSigned)
      const pkg2 = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY))
      assert.isDefined(pkg2)
      isSigned = await PackageSigner.isSigned(buf)
      assert.isTrue(isSigned)
    })
  })

})