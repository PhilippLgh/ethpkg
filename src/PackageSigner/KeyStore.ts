import fs from 'fs'
import path from 'path'
import { listKeys, getKeyStorePath } from './KeyStoreUtils'
const Wallet = require('ethereumjs-wallet')

/**
 * Generate filename for a keystore file.
 * @param {string} address Ethereum address.
 * @return {string} Keystore filename.
 */
const generateKeystoreFilename = (address : string) => {
  var filename = `ethpkg--UTC--${new Date().toISOString()}--${address}`
  // Windows does not permit ":" in filenames, replace all with "-"
  if (process.platform === 'win32') filename = filename.split(':').join('-');
  return filename;
}

export interface CreateKeyOptions {
  password?: string;
}

export default class KeyStore {
  keystorePath: string
  constructor(keystorePath?: string){
    this.keystorePath = keystorePath || getKeyStorePath()
  }
  async listKeys() {
    return listKeys(this.keystorePath)
  }
  async getUnlockedKey(address: string, password: string) {
    const keys = await this.listKeys()
    const selectedKey = keys.find(k => k.address === address)
    if (!selectedKey) {
      throw new Error('Key not found')
    }
    // const pk = await getPrivateKeyFromEthKeyfile(fullPath, password)
  }
  async createKey({
    password = undefined
  } : CreateKeyOptions = {}) : Promise<{ key: Object, filePath: string }> {
    const key = Wallet.generate()
    const json = key.toV3(password)
    json.version = 'ethpkg-3'
    const address = key.getChecksumAddressString()
    const fileName = generateKeystoreFilename(address)
    const filePath = path.join(this.keystorePath, fileName)
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
    return {
      key,
      filePath
    }
  }
}