import { isKeyfile, getPrivateKey } from "./KeyStoreUtils"
import ISigner, { instanceofISigner } from "./ISigner"
import PrivateKeySigner from "../Signers/PrivateKeySigner"
import * as ethUtil from 'ethereumjs-util'

export type PrivateKeyInfo = string | Buffer | ISigner

export type PublicKeyInfo = string // can be public key, eth address, ens name or certificate

// resolves a key info like alias, buffer, string or signer to an ISigner instance
// that can be used to sign some input
export const getSigner = async (keyInfo: PrivateKeyInfo) : Promise<ISigner | undefined> => {
  if (instanceofISigner(keyInfo)) {
    return keyInfo
  }
  let privateKey : Buffer | undefined = undefined
  if (typeof keyInfo === 'string') {
    // TODO private key can be path to pem or keystore file
    if (await isKeyfile(keyInfo)) {
      const privateKeyPath = keyInfo
      const password = '' // FIXME
      privateKey = await getPrivateKey(privateKeyPath, password)
    } else {
      // try to decode from string
      privateKey = Buffer.from(keyInfo, 'hex')
    }
  }
  else if(Buffer.isBuffer(keyInfo)) {
    privateKey = keyInfo
  }
  if (!privateKey) {
    return undefined
  }
  if (!ethUtil.isValidPrivate(privateKey)) {
    return undefined
  }
  return new PrivateKeySigner(privateKey)
}