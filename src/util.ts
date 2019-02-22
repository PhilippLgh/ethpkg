import fs from 'fs'
import path from 'path'
import os from 'os'

import { prompt } from 'enquirer'
const keythereum = require('keythereum')

const secp256k1 = require('secp256k1')
const asn1 = require('asn1.js')

const getDefaultDataDir = () => {
  switch (process.platform) {
    case 'win32': return '%APPDATA%/Ethereum'
    case 'linux': return '~/.ethereum'
    case 'darwin': return '~/Library/Ethereum'
    default: return '~/.ethereum'
  }
}

export const getKeystorePath = () => {
  const dataDir = getDefaultDataDir().replace('~', os.homedir())
  const keystore = path.join(dataDir, 'keystore')
  return keystore
}

export const getPrivateKeyFromKeystore = async (keyFile : string, keyFilePassword? : string) => {

  if(!path.isAbsolute(keyFile)){
    const keystore = getKeystorePath()
    // account referenced by address
    if (keyFile.startsWith('0x')) {
      let address = keyFile.substring(2) // remove 0x
      // TODO this is a weak and likely to break detection: looking insight json would be better
      let keyFileName = fs.readdirSync(keystore).find(file =>  file.endsWith(address))
      if (!keyFileName) {
        throw new Error(`keyfile for account ${keyFile} not found`)
      } 
      keyFile = keyFileName
    }
    // expand to full path
    keyFile = path.join(keystore, keyFile)
  }

  if(!keyFilePassword) {
    const questionKeyPassword = {
      type: 'password',
      name: 'password',
      message: `Enter password to unlock "${path.basename(keyFile)}"`
    };
    const { password } = await prompt(questionKeyPassword)
    keyFilePassword = password
  }

  let keyObject
  try {
    // good info when resolver used: console.log('use keyfile', keyFile)
    keyObject = JSON.parse(fs.readFileSync(keyFile, 'utf8'))
  } catch (error) {
    console.log('>> keyfile could not be accessed')
    return
  }
  const privateKey = keythereum.recover(keyFilePassword, keyObject)
  return privateKey
} 

export const getPrivateKeyFromPEM = (inputPath: string) => {
  const dearmor = (str: string) => {
    return str.split('\n').map(l => l.replace(/\s/g, "")).filter(l => !l.startsWith('-----')).join('')
  }

  const armoredKey = fs.readFileSync(inputPath, 'utf8')
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
      this.key('parameters').explicit(0).optional().any(),
      this.key('publicKey').explicit(1).optional().bitstr()
    );
  })

  const { result } = ECPrivateKey.decode(privKeyObjectDER, 'der')
  if (!result) {
    // console.log('keyfile parser error')
    return null
  }
  const { privateKey } = result

  const verified = secp256k1.privateKeyVerify(privateKey)
  if (!verified) {
    // console.log('invalid private key')
    return null
  }

  return privateKey
}