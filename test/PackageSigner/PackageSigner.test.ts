import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import PackageSigner from '../../src/PackageSigner'
import { IPackage } from '../../src'
import { containsSignature } from '../../src/PackageSigner/SignerUtils'
import TarPackage from '../../src/PackageManager/TarPackage'

const PRIVATE_KEY_1 = Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', "hex")
const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

const PRIVATE_KEY_2 = Buffer.from('CCCFA716F4F3242A2D7917DA45B7C07EB306402F0DDAA176915A8475D45CF82A', "hex")
const ETH_ADDRESS_2 = '0x5C69De5c5bf9D54d7dDCA8Ffbba0d3E013f7E90A'

const WRONG_ETH_ADDRESS = '0xF863aC227B0a0BCA88Cb2Ff45d91632626000000'

const UNSIGNED_FOO_TAR = path.join(__dirname, '..', 'fixtures', 'foo.tar.gz')
const SIGNED_FOO_TAR = path.join(__dirname, '..', 'fixtures', 'foo_signed.tar.gz')

describe("PackageSigner", function() {

  describe('async isSigned(pkg : IPackage) : Promise<boolean>', function() {
    it('returns true if the package contains ANY (valid/invalid) signatures', async () => {
      const buf = fs.readFileSync(SIGNED_FOO_TAR)
      const isSigned = await PackageSigner.isSigned(buf)
      assert.isTrue(isSigned)
    })
    it('returns false if the package contains ZERO signatures', async () => {
      const buf = fs.readFileSync(UNSIGNED_FOO_TAR)
      const isSigned = await PackageSigner.isSigned(buf)
      assert.isFalse(isSigned)
    })
    it('accepts package buffers as input', async () => {
      const buf = fs.readFileSync(SIGNED_FOO_TAR)
      const isSigned = await PackageSigner.isSigned(buf)
      assert.isTrue(isSigned)
    })
  })

  describe('async isValid(pkg: IPackage | Buffer) : Promise<boolean>', function() {
    it.skip('verifies a package against a list of public keys / addresses', async () => {

    })
  })

  describe('async isTrusted(pkg: IPackage | Buffer, ensOrCert: string) : Promise<boolean>', function() {
    it.skip('verifies a package against a list of public keys / addresses', async () => {

    })
  })

  describe(`async sign(pkgSrc: string | Buffer, privateKey : Buffer | IExternalSigner, pkgPathOut? : string) : Promise<IPackage | undefined>`, function() {
    it('signs an unsigned tar package when passed a package buffer + private key', async () => {
      const buf = fs.readFileSync(UNSIGNED_FOO_TAR)
      let isSigned = await PackageSigner.isSigned(buf)
      assert.isFalse(isSigned)
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_1))
      assert.isDefined(pkgSigned)
      isSigned = await PackageSigner.isSigned(<IPackage>pkgSigned)
      assert.isTrue(isSigned)
    })
    it.skip('signs a package when passed a private key certificate', async () => {

    })
    it.skip('signs a package when passed a private key alias', async () => {

    })
    it.skip('signs a package when passed a private key file path', async () => {

    })
    it.skip('signs a package using an IExternalSigner service', async () => {

    })
    it.skip('signs a package and writes it to disk if passed a destination path', async () => {
      const buf = fs.readFileSync(UNSIGNED_FOO_TAR)
      assert.isFalse(fs.existsSync(SIGNED_FOO_TAR), 'signed package should not exist on disk before test')
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_1), SIGNED_FOO_TAR)
      assert.isTrue(fs.existsSync(SIGNED_FOO_TAR), 'signed package should exist on disk after test')
    })
    it('adds a signature to a signed package when different keys are used', async () => {
      const buf = fs.readFileSync(SIGNED_FOO_TAR)
      const verificationInfoBefore = await PackageSigner.verify(buf)
      // assert that package is only signed by ETH_ADDRESS_1
      assert.equal(verificationInfoBefore.signers.length, 1)
      assert.isTrue(containsSignature(verificationInfoBefore, ETH_ADDRESS_1), 'package should already be signed by key1')
      // sign package with different key
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_2))
      assert.isDefined(pkgSigned)
      // assert that a new signature by ETH_ADDRESS_2 was added:
      const verificationInfoAfter = await PackageSigner.verify(<IPackage>pkgSigned)
      assert.equal(verificationInfoAfter.signers.length, 2)
      assert.isTrue(containsSignature(verificationInfoBefore, ETH_ADDRESS_1), "after signing it with key2 it should contain key1's signatures")
      assert.isTrue(containsSignature(verificationInfoAfter, ETH_ADDRESS_2), "after signing it with key2 it should contain key2's signatures")
    })
    it.skip('overrides the signature of a signed package when same key is used', async () => {
      /*
      const buf = fs.readFileSync(SIGNED_FOO_TAR)
      const verificationInfoBefore = await PackageSigner.verify(buf)
      assert.equal(verificationInfoBefore.signers.length, 1)
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_1))
      assert.isDefined(pkgSigned)
      const verificationInfo = await PackageSigner.verify(<IPackage>pkgSigned)
      assert.isTrue(isSigned)
      */
    })
    // package modification invalidates the signature

  })

  describe(`async verify(pkgSrc: string | Buffer | IPackage, addressOrEnsNameOrCert : string) : Promise<IVerificationResult>`, function() {
    it('verifies a package against an ethereum address', async () => {
      const pkg = await new TarPackage().loadBuffer(fs.readFileSync(SIGNED_FOO_TAR))
      const entries = await pkg.getEntries()
      console.log('entries', entries.map(e => e.relativePath))
      const verificationResult = await PackageSigner.verify(SIGNED_FOO_TAR, ETH_ADDRESS_1)
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isDefined(verificationResult.signers.find(info => info.address.toLowerCase() === ETH_ADDRESS_1.toLowerCase()), 'the ethereum address should be present in list of signers')
      assert.isFalse(verificationResult.isTrusted, 'without identity info / cert packages cannot be trusted')
    })
    it.skip('verifies externally hosted packages when passed a valid specifier', async () => {
      // npm example
    })
    it('returns isValid = true even if the provided key info is not matching', async () => {
      const verificationResult = await PackageSigner.verify(SIGNED_FOO_TAR, WRONG_ETH_ADDRESS)
      console.log('verification res', verificationResult)
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isFalse(verificationResult.isTrusted, 'without identity info / cert packages cannot be trusted')
    })
  })

})