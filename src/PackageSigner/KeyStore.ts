import fs from 'fs'
import path from 'path'
import { listKeys, getKeyStorePath, getPrivateKey } from './KeyStoreUtils'
import { KeyFileInfo } from './KeyFileInfo'
import { StateListener, PROCESS_STATES } from '../IStateListener'
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

const sleep = (t: number) : Promise<string> => new Promise((resolve, reject) => {
  setTimeout(() => resolve(`slept ${t} ms`), t)
})

export interface CreateKeyOptions {
  password?: string;
  alias?: string;
}

export const getPrivateKeyFromKeyfile = async (keyfilePath: string, password: string) : Promise<Buffer> => {
  let w
  try {
    w = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'))
  } catch (error) {
    throw new Error('Key cannot be parsed')
  }
  const wallet = Wallet.fromV3(w, password)
  const pk = wallet.getPrivateKey()
  return pk
}

export default class KeyStore {
  keystorePath: string
  constructor(keystorePath?: string){
    this.keystorePath = keystorePath || getKeyStorePath()
  }
  async listKeys() {
    // TODO warn user if they want to sign with a non-dedicated signing key
    return listKeys(this.keystorePath)
  }
  async getKeyByAddress(address: string): Promise<KeyFileInfo | undefined> {
    const keys = await this.listKeys()
    const selectedKey = keys.find(k => k.address === address)
    return selectedKey
  }
  async unlockKey(addressOrKey: string | KeyFileInfo, password: string, listener: StateListener = () => {}) {
    let key
    if (typeof addressOrKey === 'string') {
      key = await this.getKeyByAddress(addressOrKey)
    } else {
      key = addressOrKey
    }
    if (!key) {
      throw new Error('Key not found')
    }
    listener(PROCESS_STATES.UNLOCKING_KEY_STARTED, { ...key })
    // FIXME find better way to offload unlock from main thread
    await sleep(200) // allow listener to render
    const pk = await getPrivateKeyFromKeyfile(key.filePath, password)
    listener(PROCESS_STATES.UNLOCKING_KEY_FINISHED, { ...key })
    return pk
  }
  async createKey({
    password = undefined,
    alias = 'ethpkg'
  } : CreateKeyOptions = {}) : Promise<{ key: any, filePath: string }> {
    const key = Wallet.generate()
    const json = key.toV3(password)
    json.version = 'ethpkg-3'
    json.alias = [alias]
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