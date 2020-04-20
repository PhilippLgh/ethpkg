import fs from 'fs'
import path from 'path'
import os from 'os'
import { KeyFileInfo } from './KeyFileInfo'
import { StateListener, PROCESS_STATES } from '../IStateListener'
import { getDefaultDataDir, sleep } from '../util'
import { Wallet } from 'ethers'

const SUPPORTED_KEYFILE_VERSIONS = [3, 'ethpkg-3']

const getKeyStorePath = (): string => {
  // TODO support different network IDs
  const dataDir = getDefaultDataDir().replace('~', os.homedir())
  const keystore = path.join(dataDir, 'keystore')
  return keystore
}

/**
 * Generate filename for a keystore file.
 * @param {string} address Ethereum address.
 * @return {string} Keystore filename.
 */
const generateKeystoreFilename = (address: string) => {
  var filename = `ethpkg--UTC--${new Date().toISOString().split(':').join('-')}--${address}`
  // Windows does not permit ":" in filenames, replace all with "-"
  if (process.platform === 'win32') filename = filename.split(':').join('-');
  return filename;
}

export interface GetKeyOptions {
  keyStore?: string
  password?: string | PasswordCallback
  listener?: StateListener,
  alias?: string, // key alias or address
  create?: boolean, // create new if none exists
  selectKeyCallback?: (keys: Array<KeyFileInfo>) => Promise<KeyFileInfo>
}

const ETHPKG_KEYFILE_VERSION = 'ethpkg-3'

export interface CreateKeyOptions {
  password?: string | PasswordCallback
  alias?: string;
  listener?: StateListener;
}

export const getPrivateKeyFromKeyfile = async (keyfilePath: string, password: string): Promise<string> => {
  let w
  try {
    w = JSON.parse(fs.readFileSync(keyfilePath, 'utf8'))
    if ('alias' in w) {
      delete w.alias
    }
    if (w.version === ETHPKG_KEYFILE_VERSION) {
      w.version = 3
    }
  } catch (error) {
    throw new Error('Key cannot be parsed')
  }
  const wallet = await Wallet.fromEncryptedJson(JSON.stringify(w), password)
  const pk = wallet.privateKey
  return pk
}

export type PasswordCallback = (options: any) => Promise<string> | string

export const getPassword = async (password: string | PasswordCallback | undefined, key?: KeyFileInfo): Promise<string> => {
  let keyName = key ? key.address : ''
  if (key && key.alias && key.alias.length > 0) {
    keyName = `"${key.alias.join(' | ')}"`
  }
  if (!password) {
    throw new Error('No password provided to de/encrypt key')
  }
  if (typeof password === 'function') {
    password = await password({ keyName })
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
  constructor(keystorePath?: string) {
    this.keystorePath = keystorePath || getKeyStorePath()
  }
  public async listKeys(filterEthpkgKeys = false) {
    const keystore = this.keystorePath
    // TODO we could filter keys here for e.g. a prefix like 'ethpkg' to avoid misuse
    const keys: Array<KeyFileInfo> = fs.readdirSync(keystore).map((fileName: string) => {
      const filePath = path.join(keystore, fileName)
      try {
        const stat = fs.statSync(filePath)
        const keyObj : { [index:string]: any } = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        const { address, alias, version } = keyObj
        const isValid = SUPPORTED_KEYFILE_VERSIONS.includes(version)
        return {
          filePath,
          fileName,
          created: stat.birthtime,
          address,
          alias,
          version,
          keyObj,
          isValid
        }
      } catch (error) {
        return {
          filePath,
          fileName,
          keyObj: undefined,
          isValid: false,
          error
        }
      }
    })

    let validKeyFiles = keys.filter(k => k.isValid)
    if(filterEthpkgKeys) {
      validKeyFiles = validKeyFiles.filter(k => k.alias && k.version === ETHPKG_KEYFILE_VERSION)
    }
    return validKeyFiles
  }
  async hasKey(keyInfo: string) : Promise<boolean> {
    const keys = await this.listKeys()
    const k = keys.find(k => k.fileName == keyInfo || k.filePath === keyInfo || k.address === keyInfo || (Array.isArray(k.alias) && k.alias.includes(keyInfo)) )
    return k !== undefined
  }
  async getKeyByAddress(address: string): Promise<KeyFileInfo | undefined> {
    const keys = await this.listKeys()
    const selectedKey = keys.find(k => k.address === address)
    return selectedKey
  }
  async getKeyByAlias(alias: string): Promise<Array<KeyFileInfo>> {
    const keys = await this.listKeys()
    const aliasKeys = keys.filter(k => (k.alias && k.alias.includes(alias)) || k.fileName === alias || k.address?.toLowerCase() === alias.toLowerCase())
    return aliasKeys
  }

  public static async isKeyfile(keyPath: string) {
    const p = path.dirname(keyPath)
    const _keytore = new KeyStore(p)
    return _keytore.hasKey(path.basename(keyPath))
  }

  // TODO warn user if they want to sign with a non-dedicated signing key
  async getKey({
    password = undefined,
    listener = () => { },
    alias = undefined,
    create = false,
    selectKeyCallback = undefined
  }: GetKeyOptions = {}) : Promise<Buffer> {

    let keys = await this.listKeys()
    // if user has no keys (in keystore) -> create new key
    if (create && keys.length === 0) {
      // TODO use listener
      console.log('Creating a new key')
      const { info, key } = await this.createKey({
        alias,
        password,
        listener
      })
      // TODO allow user to backup key
      let privateKey = key.getPrivateKey()
      return privateKey
    }

    // search by alias
    if (alias) {
      listener(PROCESS_STATES.FINDING_KEY_BY_ALIAS_STARTED, { alias })
      keys = await this.getKeyByAlias(alias)
      // TODO fix key: matchingKeys[0]
      if (keys.length === 0) {
        throw new Error(`Key not found for alias: "${alias}"`)
      } else {
        listener(PROCESS_STATES.FINDING_KEY_BY_ALIAS_FINISHED, { alias, key: keys[0] })
      }
    }

    let selectedKey = undefined
    if (keys.length === 1) {
      selectedKey = keys[0]
    }
    else if (keys.length > 1) {
      // try to use any key that has an alias if it is only one
      const keysWithAlias = keys.filter(k => k.alias !== undefined)
      if (keysWithAlias.length === 1) {
        selectedKey = keysWithAlias[0]
      }
    }

    if (!selectedKey && keys.length > 1) {
      if (typeof selectKeyCallback !== 'function') {
        throw new Error('Ambiguous signing keys and no select callback or alias provided')
      }
      selectedKey = await (<Function>selectKeyCallback)(keys)
      if (!selectedKey) {
        throw new Error('Ambiguous signing keys and no select callback or alias provided')
      }
    }

    password = await getPassword(password, selectedKey)
    const unlockedKey = await this.unlockKey(selectedKey, password, listener)
    return Buffer.from(unlockedKey.slice(2), 'hex')
  }
  async unlockKey(addressOrKey: string | KeyFileInfo, password: string, listener: StateListener = () => { }) {
    let key
    if (typeof addressOrKey === 'string') {
      key = await this.getKeyByAddress(addressOrKey)
    } else {
      key = addressOrKey
    }
    if (!key) {
      throw new Error(`Key not found: ${addressOrKey}`)
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
    listener = () => { }
  }: CreateKeyOptions = {}): Promise<{ info: KeyFileInfo, key: any }> {
    // handle invalid passwords, password callbacks etc
    password = await getPassword(password)

    listener(PROCESS_STATES.CREATE_SIGNING_KEY_STARTED, { alias })
    
    const key = Wallet.createRandom()
    const jsonString = await key.encrypt(password)
    const json = JSON.parse(jsonString)
    json.version = ETHPKG_KEYFILE_VERSION
    json.alias = [alias]
    const address = key.address
    const fileName = generateKeystoreFilename(address)
    const filePath = path.join(this.keystorePath, fileName)
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
    listener(PROCESS_STATES.CREATE_SIGNING_KEY_FINISHED, { alias, keyPath: filePath })
    return {
      key,
      info: {
        address,
        fileName,
        filePath,
        isValid: true
      }
    }
  }
}