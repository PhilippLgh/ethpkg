import { ConstructorOf } from '../util'
import ISigner, { instanceofISigner } from '../PackageSigner/ISigner'
import PrivateKeySigner from './PrivateKeySigner'
import MetamaskSigner from './MetamaskSigner'
import GethSigner from './GethSigner'

type SignerMap = { [index: string] : ConstructorOf<ISigner> }
type SignerInstanceMap = { [index: string] : ISigner }

export default class SignerManager {
  private signers : SignerMap = {
    'privatekey': PrivateKeySigner,
    'metamask': MetamaskSigner,
    'geth': GethSigner
  }
  private signerInstances: SignerInstanceMap = {}
  async addSigner(name: string, signer: ConstructorOf<ISigner> | ISigner) : Promise<void> {
    if (instanceofISigner(signer)) {
      this.signerInstances[name] = signer
    } else {
      this.signers[name] = signer
    }
  }

  async getSigner(name: string) : Promise<ISigner | undefined> {
    if (name in this.signers) {
      return new this.signers[name]()
    }
    if (name in this.signerInstances) {
      return this.signerInstances[name]
    }
    return undefined
  }

  async listSigners() : Promise<Array<string>> {
    return [...Object.keys(this.signers), ...Object.keys(this.signerInstances)]
  }

  async removeSigner(name: string) : Promise<boolean> {
    return delete this.signers[name] || delete this.signerInstances[name]
  }
}

