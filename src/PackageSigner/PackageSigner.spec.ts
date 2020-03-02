import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import * as PackageSigner from '.'
import { IPackage } from '../PackageManager/IPackage'
import * as SignerUtils from './SignerUtils'
import TarPackage from '../PackageManager/TarPackage'
import { toPackage } from '../PackageManager/PackageService'
import { writeEntry, toIFile } from '../utils/PackageUtils'
import { ALGORITHMS } from '../jws'

const PRIVATE_KEY_1 = Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex')
const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

const PRIVATE_KEY_2 = Buffer.from('CCCFA716F4F3242A2D7917DA45B7C07EB306402F0DDAA176915A8475D45CF82A', 'hex')
const ETH_ADDRESS_2 = '0x5C69De5c5bf9D54d7dDCA8Ffbba0d3E013f7E90A'

const WRONG_ETH_ADDRESS = '0xF863aC227B0a0BCA88Cb2Ff45d91632626000000'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const FOO_DIR = path.join(FIXTURES, 'foo')
const UNSIGNED_FOO_TAR = path.join(FIXTURES, 'foo.tar.gz')
const SIGNED_FOO_TAR = path.join(FIXTURES, 'foo_signed.tar.gz')
const EXPIRED_SIGNED_FOO_TAR = path.join(FIXTURES, 'foo_signed_expired.tar')
const MULTISIGNED_INVALID_FOO_TAR = path.join(FIXTURES, 'foo_multisigned_invalid.tar')
const MULTISIGNED_CORRUPTED_FOO_TAR = path.join(FIXTURES, 'foo_multisigned_corrupt.tar')
const MULTISIGNED_FOO_TAR = path.join(FIXTURES, 'foo_multisigned.tar')

const TEST_ENS = 'foo.test.eth'

describe('PackageSigner', function() {

  describe('fixture creation:', () => {
    // please note that some tests might fail after 180 days after creation
    it.skip('creates a valid signed .tar.gz package', async () => {
      let pkg : IPackage | undefined = await TarPackage.create(FOO_DIR)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_1)
      await pkg.writePackage(SIGNED_FOO_TAR)
    })
    it.skip('creates a package with an expired signature', async () => {
      let pkg : IPackage | undefined = await TarPackage.create(FOO_DIR)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_1, {
        expiresIn: 0
      })
      await pkg.writePackage(EXPIRED_SIGNED_FOO_TAR)
    })
    it.skip('creates a package with one valid and one invalid signature', async () => {
      let pkg : IPackage | undefined = await TarPackage.create(FOO_DIR)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_1)
      const newEntry = await toIFile('./baz.txt', 'baz')
      await pkg.addEntry('./baz.txt', newEntry)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_2)
      await pkg.writePackage(MULTISIGNED_INVALID_FOO_TAR)
    })
    it.skip('creates a package with one valid and one malformed signature', async () => {
      let pkg : IPackage | undefined = await TarPackage.create(FOO_DIR)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_1)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_2)
      const sig = await pkg.getContent('_META_/_sig_0x5c69de5c5bf9d54d7ddca8ffbba0d3e013f7e90a.json')
      const sigObj = JSON.parse(sig.toString())
      // modify / corrupt signature
      sigObj.signature = 'BAD' + sigObj.signature.slice(3)
      await writeEntry(pkg, '_META_/_sig_0x5c69de5c5bf9d54d7ddca8ffbba0d3e013f7e90a.json', JSON.stringify(sigObj))
      await pkg.writePackage(MULTISIGNED_CORRUPTED_FOO_TAR)
    })
    it.skip('creates a package with two signatures', async () => {
      let pkg : IPackage | undefined = await TarPackage.create(FOO_DIR)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_1)
      pkg = await PackageSigner.sign(pkg, PRIVATE_KEY_2)
      await pkg.writePackage(MULTISIGNED_FOO_TAR)
    })
    
  })

  describe('isSigned = async (pkgSpec: PackageData) : Promise<boolean>', function() {
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

  describe('isValid = async (pkgSpec: PackageData) : Promise<boolean>', function() {
    it('returns true if the package is signed AND ALL signatures are <valid>: the signed digests match and cover the actual digests/current state of the package', async () => {
      const pkg = await toPackage(MULTISIGNED_FOO_TAR)
      const result = await PackageSigner.isValid(pkg)
      assert.isTrue(result)
    })
    it('returns false if the package is unsigned', async () => {
      const pkg = await toPackage(UNSIGNED_FOO_TAR)
      const result = await PackageSigner.isValid(pkg)
      assert.isFalse(result)
    })
    it('returns false if the package contains ANY invalid/malformed signature', async () => {
      const pkg = await toPackage(MULTISIGNED_CORRUPTED_FOO_TAR)
      const result = await PackageSigner.isValid(pkg)
      assert.isFalse(result)
    })
    // package modification invalidates the signature
    it.skip('returns false if the package contents to do not match the signature (the package was modified)', async () => {

    })
    it('returns false if the package contents are not covered 100% by all signatures', async () => {
      const pkg = await toPackage(MULTISIGNED_INVALID_FOO_TAR)
      const result = await PackageSigner.isValid(pkg)
      assert.isFalse(result)
    })
    it('returns false if the package contains ANY expired signature', async () => {
      const pkg = await toPackage(EXPIRED_SIGNED_FOO_TAR)
      const result = await PackageSigner.isValid(pkg)
      assert.isFalse(result)
    })
  })

  describe('isTrusted = async (pkgSpec: PackageData, publicKeyInfo?: PublicKeyInfo) : Promise<boolean>', function() {
    it.skip('returns true if isValid returns true AND the signers public keys have valid certificates', async () => {

    })
    it.skip('returns true if isValid returns true AND publicKeyInfo is a valid ENS name and in the list of signers', async () => {

    })
    it.skip('returns true if isValid returns true AND publicKeyInfo is an explicitly trusted Ethereum address and in the list of signers', async () => {

    })
  })

  describe(`sign = async (pkgSpec: PackageData, privateKey : string | Buffer | ISigner, pkgPathOut? : string) : Promise<IPackage>`, function() {
    it('signs an unsigned tar package when passed a package buffer + private key', async () => {
      const buf = fs.readFileSync(UNSIGNED_FOO_TAR)
      let isSigned = await PackageSigner.isSigned(buf)
      assert.isFalse(isSigned)
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_1), { algorithm: ALGORITHMS.EC_SIGN})
      assert.isDefined(pkgSigned)
      isSigned = await PackageSigner.isSigned(<IPackage>pkgSigned)
      assert.isTrue(isSigned)
    })
    it('signs an unsigned tar package when passed a package buffer + private key', async () => {
      const buf = fs.readFileSync(UNSIGNED_FOO_TAR)
      let isSigned = await PackageSigner.isSigned(buf)
      assert.isFalse(isSigned)
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_1), { algorithm: ALGORITHMS.ETH_SIGN})
      assert.isDefined(pkgSigned)
      isSigned = await PackageSigner.isSigned(<IPackage>pkgSigned)
      assert.isTrue(isSigned)
    })
    it.skip('signs a package using a private key certificate', async () => {

    })
    it.skip('signs a package using a private key alias from the keystore', async () => {

    })
    it.skip('signs a package using a private key file path', async () => {

    })
    it.skip('signs a package using an ISigner service', async () => {

    })
    it('adds a signature to a signed package when different keys are used', async () => {
      const buf = fs.readFileSync(SIGNED_FOO_TAR)
      const verificationInfoBefore = await PackageSigner.verify(buf)
      // assert that package is only signed by ETH_ADDRESS_1
      assert.equal(verificationInfoBefore.signers.length, 1)
      assert.isTrue(await SignerUtils.containsSignature(verificationInfoBefore.signers, ETH_ADDRESS_1), `package should be signed by ${ETH_ADDRESS_1}`)
      // sign package with different key
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_2))
      assert.isDefined(pkgSigned)
      // assert that a new signature by ETH_ADDRESS_2 was added:
      const verificationInfoAfter = await PackageSigner.verify(<IPackage>pkgSigned)
      assert.equal(verificationInfoAfter.signers.length, 2)
      assert.isTrue(await SignerUtils.containsSignature(verificationInfoBefore.signers, ETH_ADDRESS_1), 'after signing it with key2 it should contain key1\'s signatures')
      assert.isTrue(await SignerUtils.containsSignature(verificationInfoAfter.signers, ETH_ADDRESS_2), 'after signing it with key2 it should contain key2\'s signatures')
    })
    it('overrides the signature of a signed package when same key is used and extends expiration field', async () => {
      const buf = fs.readFileSync(SIGNED_FOO_TAR)
      const pkg = await toPackage(buf)
      const jws = await SignerUtils.getSignature(pkg, ETH_ADDRESS_1)
      if (!jws) {
        return assert.fail('Package should already be signed by: '+ETH_ADDRESS_1)
      }
      const { exp: exp1 } = jws.payload
      // re-sign
      const pkgSigned = await PackageSigner.sign(buf, Buffer.from(PRIVATE_KEY_1))
      assert.isDefined(pkgSigned)
      const verificationInfo = await PackageSigner.verify(<IPackage>pkgSigned)
      const { signers } = verificationInfo
      assert.equal(signers.length, 1, 'after re-signing package should still only contain 1 signature')
      const signer = signers[0]
      assert.isDefined(signer.exp, 'new signature should have valid expiration date')
      assert.notEqual(exp1, signer.exp, 'the new expiration date should not be the old one (extended expiration)')
    })
  })

  describe(`verify = async (pkgSpec: PackageData, publicKeyInfo?: PublicKeyInfo) : Promise<IVerificationResult>`, function() {
    it('verifies a local package without an ethereum address', async () => {
      const pkg = await TarPackage.from(SIGNED_FOO_TAR)
      const verificationResult = await PackageSigner.verify(pkg)
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isDefined(verificationResult.signers.find(info => info.address.toLowerCase() === ETH_ADDRESS_1.toLowerCase()), 'the ethereum address should be present in list of signers')
      assert.isFalse(verificationResult.isTrusted, 'without identity info about the signer the package cannot be trusted')
    })
    it('verifies a local package against an ethereum address', async () => {
      const pkg = await TarPackage.from(SIGNED_FOO_TAR)
      const verificationResult = await PackageSigner.verify(pkg, { addressOrEnsName: ETH_ADDRESS_1 })
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isDefined(verificationResult.signers.find(info => info.address.toLowerCase() === ETH_ADDRESS_1.toLowerCase()), 'the ethereum address should be present in list of signers')
      assert.isTrue(verificationResult.isTrusted, 'when provided a trusted address that matches a signer isTrusted should be true')
    })
    it('verifies a local package against an ethereum ENS name', async () => {
      const pkg = await TarPackage.from(SIGNED_FOO_TAR)
      const verificationResult = await PackageSigner.verify(pkg, { addressOrEnsName: TEST_ENS })
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isDefined(verificationResult.signers.find(info => info.address.toLowerCase() === ETH_ADDRESS_1.toLowerCase()), 'the ethereum address should be present in list of signers')
      assert.isTrue(verificationResult.isTrusted, 'with ENS as identity info the package becomes trusted')
    })
    it.skip('verifies externally hosted packages when passed a valid PackageQuery', async () => {
      // npm example
    })
    it.skip('for meaning and tests of isValid and isTrusted see above tests', () => {})
    /*
    it.skip('returns isValid=false if the package has a valid signature but the provided key info is not matching the signature', async () => {
      const verificationResult = await PackageSigner.verify(SIGNED_FOO_TAR, WRONG_ETH_ADDRESS)
      console.log('verification res', verificationResult)
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isFalse(verificationResult.isTrusted, 'without identity info / cert packages cannot be trusted')
    })
    it.skip('returns isValid=false if the package has an invalid signature', async () => {
      const verificationResult = await PackageSigner.verify(SIGNED_FOO_TAR, WRONG_ETH_ADDRESS)
      console.log('verification res', verificationResult)
      assert.isTrue(verificationResult.isValid, 'the package should be valid')
      assert.isFalse(verificationResult.isTrusted, 'without identity info / cert packages cannot be trusted')
    })
    */
    it.skip('returns isTrusted=true ONLY if the package is signed, the signature matches the archive\'s checksums, is not expired and the public key is explicitly trusted or bound to a trusted identity via certificate, ENS or similar means', async () => {

    })

  })

})