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
  const wallet = await Wallet.fromEncryptedJson(w, password)
  const pk = wallet.privateKey
  return pk
}

export type PasswordCallback = () => Promise<string> | string

export const getPassword = async (password: string | PasswordCallback | undefined): Promise<string> => {
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
        const keyObj : { [index:string]: string } = JSON.parse(fs.readFileSync(filePath, 'utf8'))
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
    const k = keys.find(k => k.fileName == keyInfo || k.filePath === keyInfo || k.address === keyInfo || k.alias === keyInfo)
    return k !== undefined
  }
  async getKeyByAddress(address: string): Promise<KeyFileInfo | undefined> {
    const keys = await this.listKeys()
    const selectedKey = keys.find(k => k.address === address)
    return selectedKey
  }
  async getKeyByAlias(alias: string): Promise<KeyFileInfo | undefined> {
    const keys = await this.listKeys()
    const aliasKey = keys.find(k => k.alias && k.alias.includes(alias))
    if (!aliasKey) {
      return undefined
    }
    const aliasAddress = aliasKey.address
    if(!aliasAddress) {
      return undefined
    }
    return keys.find(k => k.address && k.address.toLowerCase() == `0x${aliasAddress.toLowerCase()}`)
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
    alias = undefined, // TODO alias = address is not handled
    selectKeyCallback = undefined
  }: GetKeyOptions = {}) {
    const keys = await this.listKeys()

    // create new key
    if (keys.length === 0) {
      const { info, key } = await this.createKey({
        alias,
        password,
        listener
      })
      // TODO allow user to backup key
      let privateKey = key.getPrivateKey()
      return privateKey
    }

    let selectedKey
    if (alias) {
      listener(PROCESS_STATES.FINDING_KEY_BY_ALIAS_STARTED, { alias })
      selectedKey = await this.getKeyByAlias(alias)
      listener(PROCESS_STATES.FINDING_KEY_BY_ALIAS_FINISHED, { alias, key: selectedKey })
      if (!selectedKey) {
        throw new Error(`Key not found for alias: "${alias}"`)
      }
    }

    if (keys.length > 1) {
      if (!selectedKey) {
        if (typeof selectKeyCallback !== 'function') {
          throw new Error('Ambiguous signing keys and no select callback or alias provided')
        }
        selectedKey = await (<Function>selectKeyCallback)(keys)
      }
      if (!selectedKey) {
        throw new Error('Ambiguous signing keys and no select callback or alias provided')
      }
    }
    if (keys.length === 1 && !selectedKey) {
      selectedKey = keys[0]
    }

    password = await getPassword(password)
    const unlockedKey = await this.unlockKey(selectedKey, password, listener)
    return unlockedKey
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