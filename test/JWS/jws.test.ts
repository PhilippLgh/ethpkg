import { assert } from 'chai'
import { ecRecover, verify, sign, createHeader, ALGORITHMS, decode } from '../../src/jws'
import GethSigner from '../../src/Signers/GethSigner'
import PrivateKeySigner from '../../src/Signers/PrivateKeySigner'
import * as ethUtil from 'ethereumjs-util'

const PRIVATE_KEY_1 = Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', "hex")
const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

const SIGNED_FOO_PAYLOAD_DATA = {
  sha512: {
    './foo/foo.txt': 'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7',
    './foo/bar.txt': 'd82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181'
  }
}

const SIGNED_FOO_PAYLOAD = {
  version: 1,
  iss: 'self',
  exp: 1577456540302,
  data: SIGNED_FOO_PAYLOAD_DATA
}

// has different order of keys and different structure (whitespaces, linebreaks)
const SIGNED_FOO_PAYLOAD_ORDER = {iss: 'self', version: 1, exp: 1577456540302, data: SIGNED_FOO_PAYLOAD_DATA}

const SIGNED_FOO_PAYLOAD_TS_DIFF = {
  version: 1,
  iss: 'self',
  exp: 1577456540309, // this timestamp differs 
  data: SIGNED_FOO_PAYLOAD_DATA
}

const SIGNED_FOO_PAYLOAD_DATA_DIFF = {
  version: 1,
  iss: 'self',
  exp: 1577456540302,
  data: 'hello world' // data differs
}

const SIGNED_FOO_SIGNATURE = Buffer.from('71320e5ddb81bda2cef6972258093b63baed24dcd3d93b0a956a0fecb231be0f04e91c6fd68ed4a0b374a700027a23d6ffb755b20ee1abb0fb60175e3f7cd5b01b', 'hex')
const SIGNED_FOO_MSG = 'eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdfQ.{"data":{"sha512":{"./foo/foo.txt":"f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7","./foo/bar.txt":"d82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181"}},"exp":1577456540302,"iss":"self","version":1}'

// difference between jws and jwt:
// the payload of a jws can be anything
// if the payload is a json object describing CLAIMS aka "Claims Set" we speak of a jwt 
describe.only("JWS", () => {

  describe('sign = async (payload: any, signerOrPrivateKey: Buffer | ISigner, header? : any)', function() {
    it('signs a payload with alg=ES256K (default) using a private key and returns a jws object', async () => {
      const token = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1)
      assert.isDefined(token.signature)
      const decoded = await decode(token)
      assert.equal(decoded.signature, SIGNED_FOO_SIGNATURE.toString('hex'))
    })
    it('different metadata payload values result in different signatures', async () => {
      const token1 = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1)
      const token2 = await sign(SIGNED_FOO_PAYLOAD_TS_DIFF, PRIVATE_KEY_1)
      assert.notEqual(token1.signature, token2.signature)
    })
    it('different payload data values result in different signatures', async () => {
      const token1 = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1)
      const token2 = await sign(SIGNED_FOO_PAYLOAD_DATA_DIFF, PRIVATE_KEY_1)
      assert.notEqual(token1.signature, token2.signature)
    })
    it('is robust against different order of payload fields', async () => {
      const token1 = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1)
      const token2 = await sign(SIGNED_FOO_PAYLOAD_ORDER, PRIVATE_KEY_1)
      assert.equal(token1.signature, token2.signature)
    })
    it('is robust against different order of header fields', async () => {
      const header : any = createHeader()
      const headerInv : any = {}
      Object.keys(header).reverse().forEach(k => headerInv[k] = header[k])
      const token1 = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1, header)
      const token2 = await sign(SIGNED_FOO_PAYLOAD_ORDER, PRIVATE_KEY_1, headerInv)
      assert.equal(token1.signature, token2.signature)
    })
    it('does not support signing schemes other than "EC_SIGN" and "ETH_SIGN"', async () => {
      assert.throws(function(){
        const header = createHeader({
          algorithm: 'HS256'
        })
        return sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1, header)
      })
    })
    it("signs a payload using ethereum's personal message signing", async () => {
      const header = createHeader({
        algorithm: ALGORITHMS.ETH_SIGN
      })
      const token = await sign(SIGNED_FOO_PAYLOAD_ORDER, PRIVATE_KEY_1, header)
      assert.isDefined(token.signature)
    })
    // TODO use grid-core http api to setup geth
    // ./geth --syncmode light --unlock 0xf863ac227b0a0bca88cb2ff45d91632626ce32e7 --password <(echo test) --rpc --rpccorsdomain=localhost --port 0 --allow-insecure-unlock
    it.skip("signs a payload using geth as an external signer with personal message signing", async () => {
      const header = createHeader({
        algorithm: ALGORITHMS.ETH_SIGN
      })
      const signer = new GethSigner(ETH_ADDRESS_1)
      const token = await sign(SIGNED_FOO_PAYLOAD, signer, header)
      assert.isDefined(token.signature)
    })
  })

  describe('ecRecover = async (rpcSig: string, msg: string) : Promise<string>', function() {

    it('returns the ethereum address from an "rpc"-signature', async () => {
      const msg = 'hello'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      const signature = await signer.ecSign(Buffer.from(msg))
      const address = await ecRecover(signature.toString('hex'), msg)
      assert.equal(address.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

    it('WARNING: returns a random ethereum address from a personal message "rpc"-signature when used with different message input', async () => {
      const msg = 'hello'
      const bad_msg = 'foo'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      const signature = await signer.ecSign(Buffer.from(msg))
      const badAddress = await ecRecover(signature.toString('hex'), bad_msg)
      assert.isTrue(ethUtil.isValidAddress(badAddress))
      assert.notEqual(badAddress.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

    it('WARNING: returns a random ethereum address from a ECDSA "rpc"-signature when used with different message input', async () => {
      const msg = 'hello'
      const bad_msg = 'foo'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      const signature = await signer.ethSign(Buffer.from(msg))
      const badAddress = await ecRecover(signature.toString('hex'), bad_msg, ALGORITHMS.ETH_SIGN)
      assert.isTrue(ethUtil.isValidAddress(badAddress))
      assert.notEqual(badAddress.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

    it('WARNING: returns a random ethereum address if the wrong signature scheme is used during recovery', async () => {
      const msg = 'hello'
      const bad_msg = 'foo'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      // note ecSign used for signing
      const signature = await signer.ecSign(Buffer.from(msg))
      // and ETH_SIGN for recovery
      const badAddress = await ecRecover(signature.toString('hex'), bad_msg, ALGORITHMS.ETH_SIGN)
      assert.isTrue(ethUtil.isValidAddress(badAddress))
      assert.notEqual(badAddress.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

    it('returns the ethereum address from an "eth personal message"-signature', async () => {
      const msg = 'hello world'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      const signature = await signer.ethSign(Buffer.from(msg))
      const address = await ecRecover(signature.toString('hex'), msg, ALGORITHMS.ETH_SIGN)
      assert.equal(address.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

    it('returns the ethereum address from an "ec compact"-signature', async () => {
      const address = await ecRecover(SIGNED_FOO_SIGNATURE.toString('hex'), SIGNED_FOO_MSG)
      assert.equal(address.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

  })

  describe('verify = async (token: string | IFlattenedJwsSerialization, secretOrPublicKey: string | Buffer, options?: VerifyOptions): Promise<>', function() {
    it('verifies a jws "token" with ES256K signature against an address', async () => {
      const token = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1)
      const decoded = await verify(token, ETH_ADDRESS_1)
      assert.isDefined(decoded)
    })
  })

})