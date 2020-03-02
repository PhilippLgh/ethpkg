import ISigner from '../PackageSigner/ISigner'
import { rejects } from 'assert'

declare const web3: any
declare const ethereum: any

const connect = async () => {
  if (typeof ethereum !== 'undefined') {
    return ethereum.enable()
    .catch(console.error)
  }
  throw new Error('Cannot connect to Metamask')
}

export default class MetamaskSigner implements ISigner {
  name: string = 'Metamask'
  type: string = 'signer'

  async getAddress(retry = true) : Promise<string> {
    let from = undefined
    try {
      from = web3.eth.accounts[0]
    } catch (error) {
      // ignore .. not connected? try again once
    }
    if (!from) {
      await connect()
      if (retry) {
        return this.getAddress(false)
      }
    }
    return from
  }

  async ecSign(msg: Buffer) : Promise<Buffer> {
    throw new Error('Unsupported Operation')
  }

  async metamaskEthSign(msg: string, from: string) : Promise<string | undefined> {
    const method = 'personal_sign'
    const params = [msg, from]
    try {
      const { result: signature } = await new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({ method, params, from }, function(err: any, data: any){
          if (err) {return reject(err)}
          return resolve(data)
        })
      })
      return signature
    } catch (error) {
      if (error && error.code === 4001) {
        // user denied
        console.log(error.message)
        return undefined
      }
      throw error
    }
  }

  async ethSign(msg: Buffer) : Promise<Buffer> {
    const address = await this.getAddress()
    const rpcSig = await this.metamaskEthSign(msg.toString(), address)
    if (rpcSig) {
      return Buffer.from(rpcSig.slice(2), 'hex')
    }
    throw new Error('Could not sign')
  }

}