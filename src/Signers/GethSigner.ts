import ISigner from "../PackageSigner/ISigner"
import { request, downloadStreamToBuffer } from "../Downloader"

export default class GethSigner implements ISigner {
  name: string = 'Geth'
  type: string = 'signer'
  address: string
  id: number = 0
  rpcApi: string

  // Note that unlock + http api results in *Error: account unlock with HTTP access is forbidden* for a good reason
  // and needs to be explicitly allowed with '--allow-insecure-unlock'
  constructor(address: string, rpc: string = 'http://localhost:8545') {
    // Note the address to sign with must be unlocked.
    this.address = address
    this.rpcApi = rpc
  }

  async ecSign(msg: Buffer) : Promise<Buffer> {
    throw new Error('Unsupported Operation')
  }

  async ethSign(msg: Buffer) : Promise<Buffer> {
    // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
    const rpcData = {
      "jsonrpc": "2.0",
      "method": "eth_sign",
      "params":[this.address, ('0x'+msg.toString('hex'))],
      "id": ++this.id
    }
    const response = await request('POST', this.rpcApi, {
      headers: {
        'Content-Type': 'application/json',
      },
      Body: rpcData
    })
    const dataBuf: any = await downloadStreamToBuffer(response)
    const data = JSON.parse(dataBuf.toString())
    const { result } = data
    return Buffer.from(result.slice(2), 'hex')
  }

}