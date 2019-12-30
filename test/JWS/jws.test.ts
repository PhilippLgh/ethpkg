import { assert } from 'chai'
import { fail } from 'assert'
import { ecRecover, verify, sign, createHeader, SUPPORTED_ALGORITHMS } from '../../src/jws'
import * as ethUtil from 'ethereumjs-util'
import GethSigner from '../../src/Signers/GethSigner'
import PrivateKeySigner from '../../src/Signers/PrivateKeySigner'

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


// difference between jws and jwt:
// the payload of a jws can be anything
// if the payload is a json object describing CLAIMS aka "Claims Set" we speak of a jwt 
describe("JWS", () => {

  describe('sign = async (payload: any, signerOrPrivateKey: Buffer | ISigner, header? : any)', function() {
    it('signs a payload with alg=ES256K (default) using a private key and returns a jws object', async () => {
      const token = await sign(SIGNED_FOO_PAYLOAD, PRIVATE_KEY_1)
      assert.isDefined(token.signature)
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
    it.skip("signs a payload using ethereum's personal message signing", async () => {
      const header = createHeader({
        algorithm: SUPPORTED_ALGORITHMS.ETH_SIGN
      })
      const token = await sign(SIGNED_FOO_PAYLOAD_ORDER, PRIVATE_KEY_1, header)
      assert.isDefined(token.signature)
    })
    // TODO use grid-core http api to setup geth
    it("signs a payload using geth as an external signer with personal message signing", async () => {
      const header = createHeader({
        algorithm: SUPPORTED_ALGORITHMS.ETH_SIGN
      })
      const signer = new GethSigner()
      const token = await sign(SIGNED_FOO_PAYLOAD_ORDER, signer, header)
      assert.isDefined(token.signature)
    })
  })

  describe.skip('ecRecover = async (rpcSig: string, msg: string) : Promise<string>', function() {

    it('returns the ethereum address from an "rpc"-signature', async () => {
      const msg = 'hello'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      const signature = await signer.ecSign(Buffer.from(msg))
      const address = await ecRecover(signature.toString('hex'), msg)
      assert.equal(address.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

    it.skip('returns the ethereum address from an "eth"-signature', async () => {
      assert.fail()
    })

    it.skip('returns the ethereum address from an "ec compact"-signature', async () => {
      assert.fail()
    })

  })
})