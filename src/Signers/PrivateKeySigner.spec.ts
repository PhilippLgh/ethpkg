
import PrivateKeySigner from './PrivateKeySigner'
import { assert } from 'chai'
import * as ethUtil from 'ethereumjs-util'
import { ecRecover } from '../jws'

const PRIVATE_KEY_1 = Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex')
const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

const GETH_SIGNATURE = '0xc8733d961e2ff4fc0bc11b9d383a945fb21a8e41a182f6f2b2b24a31de972ef84e75d93a46c998b05c296ffc22b63177fae68eca2fa37dfb7ebd82aefe6bb2db1b'

const TEST_CASE_1 = {
  msg: '0xdeadbeaf', // geth treats 0x prefixed strings like hex buffers
  msgBuffer: Buffer.from('0xdeadbeaf'.slice(2), 'hex'),
  privateKey: Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex'),
  address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
  // eth signatures: //TODO automate generation of these values
  gethSignature: '0xfb65b3368de3abea4fbd79858f345ad80e1a2263f38a02aa6f02afbb8521074513e7d8018a99b1059de542c9225b1af37f436b9f67f7a54e959ee3c408b589751b',
  metamaskSignature: '0xfb65b3368de3abea4fbd79858f345ad80e1a2263f38a02aa6f02afbb8521074513e7d8018a99b1059de542c9225b1af37f436b9f67f7a54e959ee3c408b589751b'
}

const TEST_CASE_2 = {
  msg: 'foobarbaz',
  msgBuffer: Buffer.from('foobarbaz'),
  privateKey: Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex'),
  address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
  metamaskSignature: '0x2c3b7e318c0ea09e79a6f6100a2e72ced7cfd5d6c3e007835dc3331e84172e670b5097d39e4dce3863c7a781a62730bbcd0121599127dd6c59b4f13fd6102dbd1b'
}

const TEST_CASE_3 = {
  name: 'jws foo.tar',
  msgBuffer: Buffer.from('eyJhbGciOiJFVEgiLCJiNjQiOmZhbHNlLCJjcml0IjpbImI2NCJdLCJqd2siOnsia3R5IjoiRUMiLCJrZXlfb3BzIjpbInNpZ24iLCJ2ZXJpZnkiXSwiY3J2IjoiUC0yNTZLIiwiZXRoIjp7ImFkZHJlc3MiOiIweGY4NjNhYzIyN2IwYTBiY2E4OGNiMmZmNDVkOTE2MzI2MjZjZTMyZTcifX0sInR5cCI6IkpXVCJ9.{"data":{"sha512":{"./foo/foo.txt":"f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7","./foo/bar.txt":"d82c4eb5261cb9c8aa9855edd67d1bd10482f41529858d925094d173fa662aa91ff39bc5b188615273484021dfb16fd8284cf684ccf0fc795be3aa2fc1e6c181"}},"exp":1598641170,"iat":1583089170,"iss":"self","version":1}'),
  privateKey: Buffer.from('62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2', 'hex'),
  address: '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7',
  metamaskSignature: '0xb6a44ba20be973e1d343e455c64df54ccebc04eec17168dd6b919f17612656a601c0170fb108ce78a28638084f51f5bc6297e9e8278f11fcb0d04a938ac342721c'
}

const SIGNED_FOO_SIGNER_INPUT = '0x65794a68624763694f694a46557a49314e6b73694c434a694e6a51694f6d5a6862484e6c4c434a6a636d6c30496a7062496d49324e434a6466512e7b2264617461223a7b22736861353132223a7b222e2f666f6f2f666f6f2e747874223a226637666262613665303633366638393065353666626266333238336535323463366661333230346165323938333832643632343734316430646336363338333236653238326334316265356534323534643838323037373263353531386132633561386330633766376564613139353934613765623533393435336531656437222c222e2f666f6f2f6261722e747874223a226438326334656235323631636239633861613938353565646436376431626431303438326634313532393835386439323530393464313733666136363261613931666633396263356231383836313532373334383430323164666231366664383238346366363834636366306663373935626533616132666331653663313831227d7d2c22657870223a313537373435363534303330322c22697373223a2273656c66222c2276657273696f6e223a317d'

describe('PrivateKeySigner', () => {

  // precondition: ethereumjs should be working
  it('is based on ethereum-js util', async () => {
    const msg = 'hello'
    const m = ethUtil.keccak256(msg)
    const signed = ethUtil.ecsign(m, PRIVATE_KEY_1)
    const recoveredPublic = ethUtil.ecrecover(m, signed.v, signed.r, signed.s)
    const recovered = ethUtil.pubToAddress(recoveredPublic)
    const address = `0x${recovered.toString('hex')}`
    assert.equal(address.toLowerCase(), ETH_ADDRESS_1.toLowerCase())
  })

  describe('async ecSign(msg: string) : Promise<Buffer>', function() {

    it(`signs a message string using secp256k1 ec and returns an 'rpc'-formatted string`, async () => {
      const msg = 'hello'
      const signer = new PrivateKeySigner(PRIVATE_KEY_1)
      const signature = await signer.ecSign(Buffer.from(msg))
      const address = await ecRecover(signature.toString('hex'), msg)
      assert.equal(address.toString().toLowerCase(), ETH_ADDRESS_1.toLowerCase())
    })

  })

  describe('async ethSign(msg: string) : Promise<Buffer>', function() {

    it(`produces same signature as geth's eth_sign`, async () => {
      const { msgBuffer, privateKey, gethSignature } = TEST_CASE_1
      const signer = new PrivateKeySigner(privateKey)
      const signature = await signer.ethSign(msgBuffer)
      assert.equal(('0x'+signature.toString('hex')), gethSignature)
    })

    it(`produces same signature as metamask's sign call`, async () => {
      const { msgBuffer, privateKey, metamaskSignature } = TEST_CASE_1
      const signer = new PrivateKeySigner(privateKey)
      const signature = await signer.ethSign(msgBuffer)
      assert.equal(('0x'+signature.toString('hex')), metamaskSignature)
    })

    it.only(`produces same signature as metamask's sign call #2`, async () => {
      const { msgBuffer, privateKey, metamaskSignature } = TEST_CASE_2
      const signer = new PrivateKeySigner(privateKey)
      const signature = await signer.ethSign(msgBuffer)
      assert.equal(('0x'+signature.toString('hex')), metamaskSignature)
    })

    it.only(`produces same signature as metamask's sign call #3`, async () => {
      const { msgBuffer, privateKey, metamaskSignature } = TEST_CASE_2
      const signer = new PrivateKeySigner(privateKey)
      const signature = await signer.ethSign(msgBuffer)
      assert.equal(('0x'+signature.toString('hex')), metamaskSignature)
    })

  })

})