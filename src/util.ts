import fs, { WriteStream } from 'fs'
import path from 'path'
import os from 'os'
import stream, { Readable, Writable } from 'stream'
import ZipPackage from './PackageManager/ZipPackage';
import { IPackage } from '.';
// @ts-ignore
import { parseString } from 'xml2js'
import { ProgressListener, IFile } from './PackageManager/IPackage';

// const keythereum = require('keythereum')

const secp256k1 = require('secp256k1')
const asn1 = require('asn1.js')

export function parseXml(xml : string | Buffer){
  return new Promise((resolve, reject) => {
    parseString(xml, (err : any, result : any) => {
      if(err) return reject(err)
      resolve(result)
    })
  });
}

const getDefaultDataDir = () => {
  switch (process.platform) {
    case 'win32': return `${process.env.APPDATA}/Ethereum`
    case 'linux': return '~/.ethereum'
    case 'darwin': return '~/Library/Ethereum'
    default: return '~/.ethereum'
  }
}

export const formatBytes = (bytes : number) => {
  const kb = bytes / 1024
  return `${kb.toFixed(2)} KB`
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
  const privateKey = undefined // FIXME keythereum.recover(keyFilePassword, keyObject)
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

export const isDirSync = (filePath : string) => {
  try {
    const fileStats = fs.lstatSync(filePath);
    return fileStats.isDirectory()
  } catch (error) {
    return false
  }
}

// FIXME note that this is not performance optimized and we do multiple runs on the package data stream
export const extractPackage = async (pkg : IPackage, destPath: string, onProgress: ProgressListener = (p, f) => {}) => {
  // get a list of all entries in the package
  const entries = await pkg.getEntries()
  // iterate over all entries and write them to disk next to the package
  // WARNING packages can have different structures: if the .tar.gz has a nested dir it is fine
  // if not the files will directly be in the directory which can cause all kinds of problems
  // in this case we should try to create an extra subdir
  const extractedPackagePath = destPath
  if (!fs.existsSync(extractedPackagePath)) {
    fs.mkdirSync(extractedPackagePath, {
      recursive: true
    })
  }
  let i = 0
  for (const entry of entries) {
    // the full path where we want to write the package entry's contents on disk
    const destPath = path.join(extractedPackagePath, entry.relativePath)
    // console.log('create dir sync', destPath)
    if (entry.file.isDir) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, {
          recursive: true
        })
      }
    } else {
      try {
        // try to overwrite
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath)
        }
        // IMPORTANT: if the binary already exists the mode cannot be set
        // FIXME make sure the written file has same attributes / mode / permissions etc
        fs.writeFileSync(destPath, await entry.file.readContent())
      } catch (error) {
        console.log('error during extraction', error)
      }
    }
    // TODO change to size based progress?
    const progress = Math.floor((100 / entries.length) * ++i)
    if (onProgress) {
      try {
        onProgress(progress, entry.file.name)
      } catch (error) {
        console.log('error in onProgress handler')
      }
    }
  }
  return extractedPackagePath
}

export function runScriptSync (scriptName : string, scriptArgs : any, cwd? : any) {
  const scriptCommand = `${scriptName} ${scriptArgs.join(' ')}`
  const scriptOptions = {
    stdio: ['inherit', 'inherit', 'inherit'],
    // stdio: [null, null, null], // mute in and outputs
    encoding: 'UTF-8'
  }
  if (cwd) {
    // @ts-ignore
    scriptOptions.cwd = cwd
  }
  try {
    const exec = require('child_process').execSync
    const result = exec(scriptCommand, scriptOptions)
    return result
  } catch (err) {
    console.log(`Error running ${scriptName}`, err)
  }
}

export async function runScript (scriptName : string, scriptArgs : any, cwd? : any) {
  const scriptCommand = `${scriptName} ${scriptArgs.join(' ')}`
  const scriptOptions = {
    stdio: [null, null, null], // mute in and outputs
    encoding: 'UTF-8'
  }
  if (cwd) {
    // @ts-ignore
    scriptOptions.cwd = cwd
  }
  try {
    const util = require('util')
    const exec = util.promisify(require('child_process').exec)
    const { stdout } =  await exec(scriptCommand, scriptOptions)
    return stdout
  } catch (err) {
    console.log(`Error running ${scriptName}`, err)
    Promise.reject()
  }
}

export const downloadNpmPackage = async (moduleName : string) => {
  try {
    let filename = await runScript(`npm pack ${moduleName}`, [])
    filename = filename.trim() // can contain lf,\n etc
    const filePathFull = path.join(process.cwd(), filename)
    return filePathFull
  } catch (error) {
    return null
  }
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

export const streamToBuffer = async (stream : Readable, size? : number) : Promise<Buffer> => {
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
    mStream.once('finish', () => {
      resolve(mStream.buffer)
    })
    /*
    stream.on('end', () => {
      // console.log( ((Date.now()-t0) / 1000) , ' finished processing')
      console.log('end of stream', completed, '/',  size)
      if (!mStream.buffer) {
        mStream.once('finish', () => {
          console.log('finish called!!!')
        })
      } else {
        // TODO make sure that buffer also contains bytes stream.end vs mStream.end
        resolve(mStream.buffer)
      }
    })
    */
  })
}

export const streamPromise = (stream : WriteStream | Writable) : Promise<string> => {
  return new Promise((resolve, reject) => {
    stream.on('end', () => {
        resolve('end');
    });
    stream.on('finish', () => {
        resolve('finish');
    });
    stream.on('error', (error: Error) => {
        reject(error);
    });
  });
}

export const bufferToStream = (buf : Buffer) => {
  const readable = new stream.Readable()
  readable._read = () => {} // _read is required but you can noop it
  readable.push(buf)
  readable.push(null)
  return readable
}

export const isUrl = (str : string) => {
  const urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
  const url = new RegExp(urlRegex, 'i');
  return str.length < 2083 && url.test(str);
}

export const localFileToIFile = (filePath: string) : IFile => {
  const name = path.basename(filePath)
  const isDir = isDirSync(filePath)
  const _content = fs.readFileSync(filePath)
  const file : IFile = {
    name,
    size: _content.length,
    isDir,
    readContent: () => Promise.resolve(_content)
  }
  return file
}