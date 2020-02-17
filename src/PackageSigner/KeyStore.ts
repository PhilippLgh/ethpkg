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
  var filename = `ethpkg--UTC--${new Date().toISOString().split(':').join('-')}--${address}`
  // Windows does not permit ":" in filenames, replace all with "-"
  if (process.platform === 'win32') filename = filename.split(':').join('-');
  return filename;
}

const sleep = (t: number) : Promise<string> => new Promise((resolve, reject) => {
  setTimeout(() => resolve(`slept ${t} ms`), t)
})

const KEYFILE_VERSION = 'ethpkg-3'

export interface CreateKeyOptions {
  password?: string | PasswordCallback
  alias?: string;
  listener?: StateListener;
}

export const getPrivateKeyFromKeyfile = async (keyfilePath: string, password: string) : Promise<Buffer> => {
  let w
  try {
    w = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'))
    if ('alias' in w) {
      delete w.alias
    }
    if (w.version === KEYFILE_VERSION) {
      w.version = 3
    }
  } catch (error) {
    throw new Error('Key cannot be parsed')
  }
  const wallet = Wallet.fromV3(w, password)
  const pk = wallet.getPrivateKey()
  return pk
}

export type PasswordCallback = () => Promise<string> | string

export const getPassword = async (password: string | PasswordCallback | undefined) : Promise<string> =>  {
  if (!password) {
    throw new Error('No password provided to de/encrypt key')
  }
  if (typeof password === 'function') {
    password = await password()
    if (!password) {
      throw new Error('Password callback returned an empty or invalid password')
    }
    return password
  } else {
    return password as string
  }
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
  async getKeyByAlias(alias: string): Promise<KeyFileInfo | undefined> {
    const keys = await this.listKeys()
    const fullKeys = keys.map(k => {
      try {
        return JSON.parse(fs.readFileSync(k.filePath, 'utf8'))
      } catch (error) {
        return undefined
      }
    }).filter(k => k !== undefined)
    const aliasKey = fullKeys.find(k => k.alias && k.alias.includes(alias))
    if (!aliasKey) {
      return undefined
    }

    return keys.find(k => k.address.toLowerCase() == `0x${aliasKey.address.toLowerCase()}`)
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
    alias = 'ethpkg',
    listener = () => {}
  } : CreateKeyOptions = {}) : Promise<{ info: KeyFileInfo, key: any }> {
    // handle invalid passwords, password callbacks etc
    password = await getPassword(password)

    listener(PROCESS_STATES.CREATE_SIGNING_KEY_STARTED)
    const key = Wallet.generate()
    const json = key.toV3(password)
    json.version = KEYFILE_VERSION
    json.alias = [alias]
    const address = key.getChecksumAddressString()
    const fileName = generateKeystoreFilename(address)
    const filePath = path.join(this.keystorePath, fileName)
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
    listener(PROCESS_STATES.CREATE_SIGNING_KEY_FINISHED, { keyPath: filePath})
    return {
      key,
      info: {
        address,
        fileName,
        filePath
      }
    }
  }
}