import ISigner from "../PackageSigner/ISigner"
import * as ethUtil from 'ethereumjs-util'
import { ECDSASignature } from 'ethereumjs-util'

// TODO make sure that private keys are not unneccesarily long kept in memory and/or that pk is not instance variable
export default class PrivateKeySigner implements ISigner {
  name: string = 'PrivateKeySigner'
  type: string = 'signer'
  private _privateKey: Buffer
  constructor(privateKey: Buffer) {
    this._privateKey = privateKey
  }

  async getAddress() : Promise<string> {
    return ethUtil.privateToAddress(this._privateKey).toString('hex')
  }

  // NOTE: this signing scheme is quite dangerous as users can be tricked into signing transactions
  // however hardware modules that implement secp256k1 are unlikely to implement ethereum personal message signing
  // the rpc format is the "serialized" form of r,s,v that geth and other clients are using
  async ecSign(msg: Buffer) : Promise<Buffer>  {
    const msgHash = ethUtil.keccak256(msg)
    const signature = ethUtil.ecsign(msgHash, this._privateKey)
    // const signatureData = secp256k1.sign(msgHash, privateKey)
    // const { signature } = signatureData 
    // const r = signature.slice(0, 32)
    // const s = signature.slice(32, 64)
    // signature.v = signatureData.recovery // eth specific: + 27
    // console.log('signature', signature)
    // geth (and the RPC eth_sign method) uses the 65 byte format used by Bitcoin
    // bufferToHex(Buffer.concat([setLengthLeft(r, 32), setLengthLeft(s, 32), toBuffer(v)]))
    const rpcSig = ethUtil.toRpcSig(signature.v, signature.r, signature.s)
    return Buffer.from(rpcSig.slice(2), 'hex')
  }

  // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
  async ethSign(msg: Buffer) : Promise<Buffer> {
    const ethMsg = ethUtil.hashPersonalMessage(Buffer.from(msg))
    const signature: ECDSASignature = ethUtil.ecsign(ethMsg, this._privateKey)
    const rpcSig = ethUtil.toRpcSig(signature.v, signature.r, signature.s)
    const signatureBuf = Buffer.from(rpcSig.slice(2), 'hex')
    return signatureBuf
  }
}