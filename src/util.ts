import fs from 'fs'
import path from 'path'
import os from 'os'
import stream from 'stream'

// import { prompt } from 'enquirer'
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
    // FIXME breaks browser lib
    // const { password } = await prompt(questionKeyPassword)
    // keyFilePassword = password
    throw new Error("no password provided")
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

function runScript (scriptName : string, scriptArgs : any, cwd? : any) {
  let scriptCommand = `${scriptName} ${scriptArgs.join(' ')}`
  let scriptOptions = {
    encoding: 'UTF-8'
  }
  if (cwd) {
    // @ts-ignore
    scriptOptions.cwd = cwd
  }
  try {
    const execSync = require('child_process').execSync
    execSync(scriptCommand, scriptOptions)
    return Promise.resolve()
  } catch (err) {
    console.log(`Error running ${scriptName}`, err)
    Promise.reject()
    process.exit(1)
  }
}

export const downloadNpmPackage = async () => {
  await runScript('npm pack @philipplgh/electron-app-updater', [])
}

class WritableMemoryStream extends stream.Writable {
  buffer: Buffer | undefined;
  data : any[] = []
  constructor(){
    super()
    this.buffer = undefined
    this.data = []
    this.once('finish', () => {
      this.buffer = Buffer.concat(this.data)
    })
  }
  _write (chunk : any, enc : string, cb : Function) {
    this.data.push(chunk)
    cb()
  }
}

export const streamToBuffer = async (stream : fs.ReadStream, size? : number) : Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let mStream = new WritableMemoryStream()
    // let fStream = fs.createWriteStream(__dirname+'/test')
    let t0 = Date.now()
    stream.pipe(mStream)
    // stream.pipe(fStream)
    let completed = 0;
    stream.on('data', (data : any) => {
      completed += data.length;
      // console.log('data ', completed, '/', size)
    })
    stream.on("error", (error : any) => {
      reject(error)
    });
    stream.on('end', () => {
      // console.log( ((Date.now()-t0) / 1000) , ' finished processing')
      // console.log('end of stream', completed, '/',  size)
      // TODO make sure that buffer also contains bytes stream.end vs mStream.end
      resolve(mStream.buffer)
    })
  })
}

export const bufferToStream = (buf : Buffer) => {
  const readable = new stream.Readable()
  readable._read = () => {} // _read is required but you can noop it
  readable.push(buf)
  readable.push(null)
  return readable
}
