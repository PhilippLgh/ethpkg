import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import { IPackage } from '../../src'
import * as SignerUtils from '../../src/PackageSigner/SignerUtils'
import { getPackage } from '../../src/PackageManager/PackageService'

const UNSIGNED_FOO_TAR = path.join(__dirname, '..', 'fixtures', 'foo.tar.gz')
const SIGNED_FOO_TAR = path.join(__dirname, '..', 'fixtures', 'foo_signed.tar.gz')

describe.only("SignerUtils", function() {

  describe('calculateDigests = async (pkg: IPackage, alg = "sha512") : Promise<Digests>', function() {
    it('calculates the sha5125 checksums / digests of all files within a package', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg)
      assert.isDefined(digests)
      const { sha512 } = digests
      assert.equal(Object.keys(sha512).length, 2)
    })
    it('ignores files contained in the _META_ special dir of signed packages', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg)
      assert.isDefined(digests)
      const { sha512 } = digests
      assert.equal(Object.keys(sha512).length, 2)
    })
    it('allows to specify an alternative hash function', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg, 'md5')
      assert.isDefined(digests)
      const { md5 } = digests
      assert.equal(Object.keys(md5).length, 2)
    })
  })

  describe('compareDigests = (digestsFile: Digests, calculatedDigests: Digests) : boolean', function() {
    it('compares two digest/checksum maps and returns true if they have ALL the same files/keys and checksums/values', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const digests1 = await SignerUtils.calculateDigests(pkg)
      const digests2 = await SignerUtils.calculateDigests(pkg)
      const result = SignerUtils.compareDigests(digests1, digests2)
      assert.isTrue(result)
    })
    it('throws if one map is empty or has fewer keys', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg)
      const empty = {'sha512': {}}
      assert.throws(() => {
        SignerUtils.compareDigests(empty, digests)
      })
    })
    it("throws an IntegrityViolationError if the files/keys don't match", async () => {
      const digests1 = {
        sha512: {
          './foo/foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './foo/bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      const digests2 = {
        sha512: {
          './foo/foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './foo/baz.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      assert.throws(() => {
        SignerUtils.compareDigests(digests1, digests2)
      })
    })
    it("throws an IntegrityViolationError if the checksums/values don't match", async () => {
      const digests1 = {
        sha512: {
          './foo/foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './foo/bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      const digests2 = {
        sha512: {
          './foo/foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './foo/bar.txt': 'a82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      assert.throws(() => {
        SignerUtils.compareDigests(digests1, digests2)
      })
    })
    it.skip('returns true if only one set of matching digests is found for any supported hash function', async () => {
      const digests1 = {
        sha512: {}, // mismatch
        sha256: {
          './foo/foo.txt': '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
          './foo/bar.txt': 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9'
        }
      }
      const digests2 = {
        sha512: {
          './foo/foo.txt': 'aaaaaa', // can contain invalid values
          './foo/baz.txt': 'a82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        },
        sha256: {
          './foo/foo.txt': '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
          './foo/bar.txt': 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9'
        }
      }
      try {
        const result = SignerUtils.compareDigests(digests1, digests2)
        assert.isTrue(result)
      } catch (error) {
        assert.fail('sha256 non-default is not handled properly')
      }
    })
    it('can compare _checksums.json inside a signed package with a computed digest map', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const checksumsPath = await SignerUtils.checksumsPath(pkg)
      const digestsFile = JSON.parse((await pkg.getContent(checksumsPath)).toString())
      const digests = await SignerUtils.calculateDigests(pkg)
      try {
        const result = SignerUtils.compareDigests(digestsFile, digests)
        assert.isTrue(result)
      } catch (error) {
        assert.fail('_checksums.json does not match digests')
      }
    })
  })

  describe('createPayload = async (pkg : IPackage)', function() {
    it('calculates the unserialized jws payload', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const payload = await SignerUtils.createPayload(pkg)
      assert.isDefined(payload.data)
    })
  })

  describe.skip('verifyIntegrity = async (payloadPkg : any, signatureObj : any) : Promise<boolean>', function() {

  })

  describe('getSignaturesFromPackage = async (pkg : IPackage, address? : string) : Promise<Array<IPackageEntry>>', function() {
    it('returns all signatures from a signed package', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const signatures = await SignerUtils.getSignaturesFromPackage(pkg)
      assert.equal(signatures.length, 1)
    })
    it('returns an empty array from an unsigned package', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const signatures = await SignerUtils.getSignaturesFromPackage(pkg)
      assert.equal(signatures.length, 0)
    })
  })

})