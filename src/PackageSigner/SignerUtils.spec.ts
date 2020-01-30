import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import { IPackage, IPackageEntry } from '../PackageManager/IPackage'
import * as SignerUtils from './SignerUtils'
import { getPackage } from '../PackageManager/PackageService'
import { sign } from '.'
import { IVerificationResult, ISignerInfo } from '../IVerificationResult'
import { toIFile } from '../utils/PackageUtils'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const UNSIGNED_FOO_TAR_DECOMPRESSED = path.join(FIXTURES, 'foo.tar')
const UNSIGNED_FOO_TAR = path.join(FIXTURES, 'foo.tar.gz')
const SIGNED_FOO_TAR = path.join(FIXTURES, 'foo_signed.tar.gz')

const PRIVATE_KEY_1 = Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex')
const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

// foo_signed.tar.gz contains two file and these are their digests
const SIGNED_FOO_DIGESTS =  {
  sha512: {
    './foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
    './bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
  }
}

// contents of '_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json':
  /*
    {
  protected: 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ',
  payload: {
    version: 1,
    iss: 'self',
    exp: 1577456540302,
    data: { sha512: [Object] }
  },
  signature: 'pfVnV_A-OcIR7JL2PvIOkRGin4PisNSOtCUTpkDXtKU5lWFsGEInsEWZX3T87hnBfpxNXMay2Zae2gv5vGMM1Q'
}
    */

describe('SignerUtils', function() {

  describe('calculateDigests = async (pkg: IPackage, alg = "sha512") : Promise<Digests>', function() {
    it('calculates the sha5125 checksums / digests of all files within a compressed .tar.gz package', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg)
      assert.isDefined(digests)
      const { sha512 } = digests
      assert.equal(Object.keys(sha512).length, 2)
    })
    it('calculates the sha5125 checksums / digests of all files within a decompressed .tar package', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR_DECOMPRESSED)
      const digests = await SignerUtils.calculateDigests(pkg)
      assert.isDefined(digests)
      const { sha512 } = digests
      assert.equal(Object.keys(sha512).length, 2)
    })
    it('produces the same digests for the same files inside different containers (.tar and .tar.gz)', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const pkg2 = await getPackage(UNSIGNED_FOO_TAR_DECOMPRESSED)
      const digests = await SignerUtils.calculateDigests(pkg)
      const digests2 = await SignerUtils.calculateDigests(pkg2)
      const { sha512 } = digests
      const { sha512: _sha512 } = digests2
      assert.deepEqual(sha512, _sha512)
    })
    it('ignores files contained in the _META_ special dir of signed packages', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg)
      assert.isDefined(digests)
      assert.deepEqual(digests, SIGNED_FOO_DIGESTS)
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
    it('throws if one Digests map is empty or has fewer keys', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const digests = await SignerUtils.calculateDigests(pkg)
      const empty = {'sha512': {}}
      assert.throws(() => {
        SignerUtils.compareDigests(empty, digests)
      })
    })
    it('is robust against different relative path formats', async () => {
      const d1 = {
        sha512: {
          './bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      const d2 = {
        sha512: {
          'bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      const result = await SignerUtils.compareDigests(d1, d2)
      assert.isTrue(result)
    })
    it('throws an IntegrityViolationError if the files/keys don\'t match', async () => {
      const digests1 = {
        sha512: {
          './foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      const digests2 = {
        sha512: {
          './foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './baz.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      assert.throws(() => {
        SignerUtils.compareDigests(digests1, digests2)
      })
    })
    it('throws an IntegrityViolationError if the checksums/values don\'t match', async () => {
      const digests1 = {
        sha512: {
          './foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        }
      }
      const digests2 = {
        sha512: {
          './foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
          './bar.txt': 'a82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
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
          './foo.txt': '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
          './bar.txt': 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9'
        }
      }
      const digests2 = {
        sha512: {
          './foo.txt': 'aaaaaa', // can contain invalid values
          './baz.txt': 'a82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
        },
        sha256: {
          './foo.txt': '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
          './bar.txt': 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9'
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

  describe('getSignatureEntriesFromPackage = async (pkg : IPackage, address? : string) : Promise<Array<IPackageEntry>>', function() {
    // TODO test with more than one
    it('returns all signatures from a signed package', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const signatures = await SignerUtils.getSignatureEntriesFromPackage(pkg)
      assert.equal(signatures.length, 1)
    })
    it('returns an empty array from an unsigned package', async () => {
      const pkg = await getPackage(UNSIGNED_FOO_TAR)
      const signatures = await SignerUtils.getSignatureEntriesFromPackage(pkg)
      assert.equal(signatures.length, 0)
    })
  })

  describe('verifySignature = async (signatureEntry : IPackageEntry, digests : Digests) : Promise<IVerificationResult>', function() {
    it('verifies a signature entry containing a jws when passed pkg digests and returns IVerificationResult', async () => {
      const pkg = await getPackage(SIGNED_FOO_TAR)
      const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
      assert.isDefined(signatureEntry)
      const result = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, SIGNED_FOO_DIGESTS)
      assert.isTrue(result.isValid)
    })
    describe('performs integrity checks:', function() {
      it('returns isValid=false if the signature applies to different file digests than the actual ones from package', async () => {
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
        // the passed-in digests are considered "ground truth" so even if the signature is actually valid
        // passing in different checksums should result in invalid signature
        const SIGNED_FOO_DIGESTS_UPDATED =  {
          sha512: {
            './foo.txt': 'bbbbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
            './bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
          }
        }
        const result = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, SIGNED_FOO_DIGESTS_UPDATED)
        assert.isFalse(result.isValid)
      })
      it('returns isValid=false if the signature applies to fewer files than the package contains at the moment (no partial signatures)', async () => {
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
        const SIGNED_FOO_DIGESTS_UPDATED =  {
          sha512: {
            './foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
            './bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181',
            './imaginary/new/file.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
          }
        }
        const result = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, SIGNED_FOO_DIGESTS_UPDATED)
        assert.isFalse(result.isValid)
      })
      it('adding new files invalidates all included signatures', async () => {
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
        // package modification: adding new files invalidates included signature
        const newEntry = await toIFile('new/entry.txt', 'hello world')
        await pkg.addEntry('new/entry.txt', newEntry)
        const digests = await SignerUtils.calculateDigests(pkg)
        const result = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, digests)
        assert.isFalse(result.isValid)
      })
      it('modifying the content of files inside the package invalidates all included signatures', async () => {
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
        // package modification: overwriting files invalidates included signature
        let c = await pkg.getContent('./foo.txt')
        assert.equal(c.toString(), 'foo')
        const newEntry = await toIFile('./foo.txt', 'hello world')
        await pkg.addEntry('./foo.txt', newEntry)
        c = await pkg.getContent('./foo.txt')
        assert.equal(c.toString(), 'hello world')
        const digests = await SignerUtils.calculateDigests(pkg)
        const result = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, digests)
        assert.isFalse(result.isValid)
      })
      it.skip('removing files from the package invalidates all included signatures', async () => {
        // TODO needs implementation in IPackage
      })
      it('re-signing after files were added to pkg results in a valid signature again', async () => {
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
        // package modification: adding new files invalidates included signature
        const newEntry = await toIFile('new/entry.txt', 'hello world')
        await pkg.addEntry('new/entry.txt', newEntry)
        const digests = await SignerUtils.calculateDigests(pkg)
        const result = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, digests)
        assert.isFalse(result.isValid)
        await sign(pkg, PRIVATE_KEY_1)
        const result2 = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, digests)
        assert.isTrue(result2.isValid)
      })
    })
    describe('the signers array contains a single ISignerInfo object', async () => {
      it('which includes the recovered ethereum address of the signer', async () => {
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry('_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json')
        const result : IVerificationResult = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, SIGNED_FOO_DIGESTS)
        const { signers } = result
        assert.equal(signers.length, 1)
        const signer : ISignerInfo | undefined = signers.pop()
        if (!signer) {
          return assert.fail()
        }
        assert.equal(signer.address, ETH_ADDRESS_1.toLowerCase())
      })
      it('the recovered address should match the address part of the file name', async () => {
        const FILEPATH = '_META_/_sig_0xf863ac227b0a0bca88cb2ff45d91632626ce32e7.json'
        const pkg = await getPackage(SIGNED_FOO_TAR)
        const signatureEntry = await pkg.getEntry(FILEPATH)
        const result : IVerificationResult = await SignerUtils.verifySignature(<IPackageEntry>signatureEntry, SIGNED_FOO_DIGESTS)
        const { signers } = result
        assert.equal(signers.length, 1)
        const signer : ISignerInfo | undefined = signers.pop()
        if (!signer) {
          return assert.fail()
        }
        assert.isTrue(FILEPATH.includes(signer.address))
      })
    })
    it.skip('checks the exp field of the token\'s payload', () => {

    })
  })

  describe('containsSignature = async (signers: Array<ISignerInfo>, publicKeyInfo: PublicKeyInfo) : Promise<boolean>', function () {
    it('returns true if publicKeyInfo is present in the list of signers', async () => {
      const info: ISignerInfo = {
        address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      const publicKeyInfo = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isTrue(result)
    })
    it('returns false if signers is an empty array', async () => {
      const publicKeyInfo = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
      const result = await SignerUtils.containsSignature([], publicKeyInfo)
      assert.isFalse(result)
    })
    it('returns false if signers array does not contain publicKeyInfo', async () => {
      const info: ISignerInfo = {
        address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      const publicKeyInfo = '0xFFFFFFF27B0a0BCA88Cb2Ff45d91632626CE32e7'
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isFalse(result)
    })
    it('returns false if publicKeyInfo is an invalid address', async () => {
      const info: ISignerInfo = {
        address: '0xF003aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      const publicKeyInfo = '0xFOO3aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isFalse(result)
    })
    it('handles ENS names', async () => {
      const info: ISignerInfo = {
        address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      const publicKeyInfo = 'foo.test.ens'
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isTrue(result)
    })
    it.skip('handles public key certificates', async () => {
      const info: ISignerInfo = {
        address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      // TODO needs implementation
      const publicKeyInfo /*: ICertificate */ = ''
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isTrue(result)
    })
    it('handles ethereum addresses in checksum format (EIP-55)', async () => {
      const info: ISignerInfo = {
        address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      const publicKeyInfo = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isTrue(result)
    })
    it('handles ethereum addresses without checksum format 1', async () => {
      const info: ISignerInfo = {
        address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
        certificates: [],
      }
      const publicKeyInfo = info.address.toLowerCase()
      const result = await SignerUtils.containsSignature([info], publicKeyInfo)
      assert.isTrue(result)
    })
    it('handles ethereum addresses without checksum format 2', async () => {
      const signers: Array<ISignerInfo> = [
        {
          address: '0xf863ac227b0a0bca88cb2ff45d91632626ce32e7',
          certificates: []
        }
      ]
      const publicKeyInfo = ETH_ADDRESS_1
      const result = await SignerUtils.containsSignature(signers, publicKeyInfo)
      assert.isTrue(result)
    })
  })
})