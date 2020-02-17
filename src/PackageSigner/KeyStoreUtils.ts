import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { isDirSync } from '../util'
import { KeyFileInfo } from './KeyFileInfo'
import { getPrivateKeyFromKeyfile } from './KeyStore'
const secp256k1 = require('secp256k1')
const asn1 = require('asn1.js')

const SUPPORTED_KEYFILE_VERSIONS = [3, 'ethpkg-3']

// https://github.com/ethereum/go-ethereum/wiki/Backup-&-restore#data-directory
const getDefaultDataDir = () => {
  switch (process.platform) {
    case 'win32': return `${process.env.APPDATA}/Ethereum`
    case 'linux': return '~/.ethereum'
    case 'darwin': return '~/Library/Ethereum'
    default: return '~/.ethereum'
  }
}

export const getKeyStorePath = () : string => {
  // TODO support different network IDs
  const dataDir = getDefaultDataDir().replace('~', os.homedir())
  const keystore = path.join(dataDir, 'keystore')
  return keystore
}

export const listKeys = async (keystorePath?: string) : Promise<Array<KeyFileInfo>> => {
  const keystore = keystorePath || await getKeyStorePath()
  // TODO we could filter keys here for e.g. a prefix like 'ethpkg' to avoid misuse
  const keyFiles = fs.readdirSync(keystore).map(f => {
    let address = f.split('--').pop() || ''
    address = address.startsWith('0x') ?  address : `0x${address}`
    return {
      // FIXME this is very fragile: parsing the address would be better but slower
      address,
      fileName: f,
      filePath: path.join(keystore, f)
    }
  })
  const validKeyFiles = []
  for (const key of keyFiles) {
    const isValid = await isValidKeyStoreFile(key.filePath)
    if (isValid) {
      validKeyFiles.push(key)
    }
  }
  return validKeyFiles
}

export const findKeyStoreFile = async (keyfilePathOrAlias: string, keyStorePath?: string) : Promise<string | undefined> => {
  if (fs.existsSync(keyfilePathOrAlias)) {
    return keyfilePathOrAlias
  }
  const keystore = keyStorePath || (await getKeyStorePath())

  // try to expand
  if (fs.existsSync(path.join(keystore, keyfilePathOrAlias))) {
    return path.join(keystore, keyfilePathOrAlias)
  }

  // account referenced by address / alias
  if (keyfilePathOrAlias.startsWith('0x')) {
    const keys = await listKeys(keystore)
    let key = keys.find(k => k.address.toLowerCase() === keyfilePathOrAlias.toLowerCase())
    if (!key) {
      return undefined
    } 
    return key.filePath
  } else {
    return undefined
  }

}

export const isValidKeyStoreFile = async (keyfilePathOrAlias: string, keyStorePath?: string) : Promise<boolean> => {
  const keyfilePath = await findKeyStoreFile(keyfilePathOrAlias, keyStorePath)
  if (keyfilePath === undefined){ return false }
  if (isDirSync(keyfilePath)) { return false }
  const content = fs.readFileSync(keyfilePath, 'utf8')
  let keyInfo
  try {
    keyInfo = JSON.parse(content)
  } catch (error) {
    // console.error('could not parse keyfile', keyfilePath, error)
    // keyfile cannot be parsed
    return false
  }
  return keyInfo && SUPPORTED_KEYFILE_VERSIONS.includes(keyInfo.version)
}

export const isValidPemKeyfile = async (keyfilePath: string) : Promise<boolean> => {
  try {
    let privateKey = await getPrivateKeyFromPEM(keyfilePath)
    return privateKey !== undefined
  } catch (error) {
    // catch asn / der parser exceptions
    return false
  }
}

export const isKeyfile = async (keyfilePathOrAlias: string, keyStorePath?: string) : Promise<boolean> => {
  const _isKeyStoreFile = await isValidKeyStoreFile(keyfilePathOrAlias, keyStorePath)
  // perf: if already valid don't look further
  if (_isKeyStoreFile) {
    return true
  }
  const _isPemFile = await isValidPemKeyfile(keyfilePathOrAlias)
  return _isPemFile
}

const getPrivateKeyFromPEM = async (keyfilePath: string) : Promise<Buffer | undefined> => {
  const dearmor = (str: string) => {
    /**
     * handle
    -----BEGIN EC PARAMETERS-----
    BgUrgQQACg==
    -----END EC PARAMETERS-----
    -----BEGIN EC PRIVATE KEY-----
    MHQCAQEEIGmUEA1rRoaDkaO5CN7ycmobPYXDc2djcRRrmq1IBZ7CoAcGBSuBBAAK
    oUQDQgAE7FfkljPwW90lIHilxckicNZUDGACRDpnQCHth1+bUS7M50gqZAhkHfl+
    js17MSsy5zE0VhxFTOiZiVhW+MZCPQ==
    -----END EC PRIVATE KEY-----
     */
    const BEGIN_ARMOR = '-----BEGIN EC PRIVATE KEY-----'
    str = str.substring(
      str.lastIndexOf(BEGIN_ARMOR) + BEGIN_ARMOR.length, 
      str.lastIndexOf('-----END EC PRIVATE KEY-----')
    )
    return str.split('\n').map(l => l.replace(/\s/g, '')).filter(l => !l.startsWith('-----')).join('')
  }

  if (!fs.existsSync(keyfilePath)) {
    return undefined
  }

  const armoredKey = fs.readFileSync(keyfilePath, 'utf8')
  const privKeyStr = dearmor(armoredKey)
  const privKeyObjectDER = Buffer.from(privKeyStr, 'base64')

  // https://tools.ietf.org/html/rfc5915
  /*
  ECPrivateKey ::= SEQUENCE {
    version        INTEGER { ecPrivkeyVer1(1) } (ecPrivkeyVer1),
    privateKey     OCTET STRING,
    parameters [0] ECParameters {{ NamedCurve }} OPTIONAL,
    publicKey  [1] BIT STRING OPTIONAL
  }
  */
  const ECPrivateKey = asn1.define('ECPrivateKey', function (this: any) {
    this.seq().obj(
      this.key('version').int(),
      this.key('privateKey').octstr(),
      this.key('parameters').explicit(0).optional().objid(),
      this.key('publicKey').explicit(1).optional().bitstr()
    );
  })

  const result = ECPrivateKey.decode(privKeyObjectDER, 'der')
  if (!result) {
    // console.log('keyfile parser error')
    return undefined
  }
  const { privateKey } = result

  const verified = secp256k1.privateKeyVerify(privateKey)
  if (!verified) {
    // console.log('invalid private key')
    return undefined
  }

  return privateKey
}



export const getPrivateKey = async (keyfilePathOrAlias: string, passwordOrKeyStore?: string, password?: string) : Promise<Buffer> => {
  const _isKeyStoreFile = await isValidKeyStoreFile(keyfilePathOrAlias, passwordOrKeyStore)
  if (_isKeyStoreFile) {
    const pw = password || passwordOrKeyStore
    if (!pw) {
      throw new Error('No password provided')
    }
    const keyfilePath = await findKeyStoreFile(keyfilePathOrAlias, passwordOrKeyStore)
    return getPrivateKeyFromKeyfile(<string>keyfilePath, pw)
  }

  const _isPemFile = await isValidPemKeyfile(keyfilePathOrAlias)
  if (_isPemFile) {
    const pk = await getPrivateKeyFromPEM(keyfilePathOrAlias)
    if (pk === undefined) {
      throw new Error('Private key could not be parsed from PEM file')
    }
    return pk
  }

  throw new Error('Keyfile not found or not a valid Ethereum or PEM file')
}
