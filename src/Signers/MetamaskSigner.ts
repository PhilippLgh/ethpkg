import ISigner from "../PackageSigner/ISigner"

const Metamask = {
  sign: (msg: Buffer, address: string) : Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      // TODO handle new API: https://medium.com/metamask/no-longer-injecting-web3-js-4a899ad6e59e?
      // @ts-ignore
      const web3 = window.web3
      web3.personal.sign(msg, address, (err: any, result: any) => {
        if (err) return reject(err)
        return resolve(result)
      })
    })
  }
}

export default class MetamaskSigner implements ISigner {
  name: string = 'Metamask'
  type: string = 'signer'

  async getAddress() : Promise<string> {
    return 'TODO'
  }

  async ecSign(msg: Buffer) : Promise<Buffer> {
    throw new Error('Unsupported Operation')
  }

  async ethSign(msg: Buffer) : Promise<Buffer> {
    const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
    try {
      const result = await Metamask.sign(msg, ETH_ADDRESS_1)
      return result
    } catch (error) {
      console.log('err', error)
      throw new Error('Signing operation failed')
    }
  }

}