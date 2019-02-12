import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import { IPackage, IPackageEntry } from './pkgFormats/IPackage'
import ZipPackage from './pkgFormats/zipPackage'

import ethUtil from 'ethereumjs-util'
import jws from './jws';
import base64url from 'base64url';

const META_DIR = '_META_'

const shasum = (data : any, alg? : string) => {
  return crypto
    .createHash(alg || 'sha256')
    .update(data)
    .digest('hex');
}

interface Digests {[index:string] : {[index:string] : string} }

const calculateDigests = async (entries : Array<IPackageEntry>, alg = 'sha512') => {
  const digests : Digests = {}
  digests[alg] = {}
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const { relativePath, file } = entry
    if(file.dir){continue}
    // skip META DIR contents
    if(relativePath.startsWith(META_DIR)){continue}
    const decompressedData = await file.readContent("nodebuffer")
    const checksum = shasum(decompressedData, alg)
    digests[alg][relativePath] = checksum
  }
  return digests
}

const compareDigests = (digestsFile: Digests, calculatedDigests: Digests) => {
  let checksumsFile = digestsFile['sha512']
  let checksumsCalc = calculatedDigests['sha512']
  if(Object.keys(checksumsCalc).length !== Object.keys(checksumsFile).length){
    throw new Error('package contains more files than checksums')
  }
  for (const prop in checksumsCalc) {
    if(checksumsFile[prop] !== checksumsCalc[prop]){
      throw new Error('integrity violation at file: ' + prop)
    }
  }
  return true
}

const getPackage = async (pkgPath : string) : Promise<IPackage> => {
  const zip = new ZipPackage()
  const pgkContent = fs.readFileSync(pkgPath)
  await zip.loadBuffer(pgkContent)
  return zip
}

const createPayload = async (pkg : IPackage) => {
  const entries = await pkg.getEntries()
  const digests = await calculateDigests(entries)

  // TODO make sure JSON.stringify(digests) is deterministic: see
  // https://github.com/brianloveswords/node-jws/pull/83
  const payload = {
    "version": 1,
    "iss": "self",
    "exp": Date.now() + (24 * 60 * 60 * 1000),
    "data": digests
  }

  return payload
}

const formatAddressHex = (address : string) => {
  address = address.toLowerCase()
  if (!address.startsWith('0x')){
    address = `0x${address}`
  }
  return address
}

const signaturePath = (address : string) => {
  address = formatAddressHex(address)
  return `${META_DIR}/_sig_${address}.json`
}

const recoverAddress = async (signatureObj : any) => {
  const { signature } = signatureObj

  const encodedProtectedHeader = signatureObj.protected
  const encodedPayload = JSON.stringify(signatureObj.payload) // NOTE: not encoded due to b64:false flag

  const signingInput = Buffer.from(`${encodedProtectedHeader}.${encodedPayload}`)
  const signingInputHashed = ethUtil.keccak256(signingInput)

  const decodedSignature = base64url.toBuffer(signature)

  const r = decodedSignature.slice(0, 32)
  const s = decodedSignature.slice(32, 64)
  const v = 27
  const pub = ethUtil.ecrecover(signingInputHashed, v, r, s)
  const address = formatAddressHex(ethUtil.pubToAddress(pub).toString('hex'))
  // console.log('recovered: ', address)
  return address
}

const verifyIntegrity = async (pkg : IPackage, signatureObj : any) => {
  const { payload } = signatureObj
  const { data } = payload

  // calculate new checksums
  const payloadGenerated = await createPayload(pkg)

  let digestsMatch = false
  try {
    digestsMatch = compareDigests(data, payloadGenerated.data)
  } catch (error) {
    console.log('error: ', error)
    return false
  }

  return digestsMatch === true
}

export default class pkgsign {

  static async sign(pkgPath: string, privateKey? : Buffer, pkgPathOut? : string) {

    const pkg = await getPackage(pkgPath)

    if(!privateKey) {
      // TODO support external signers
      throw new Error('private key not provided or malformed')
    }
    
    /*
    1.  Create the content to be used as the JWS Payload.
    */
    const payload = await createPayload(pkg)
    await pkg.addFile(`${META_DIR}/_checksums.json`, JSON.stringify(payload.data, null, 2));

    // sign payload according to RFC7515 Section 5.1
    const header = {
      alg: 'ES256K',
      b64: false
    }
    const flattenedJwsSerialization =  await jws.sign(payload, privateKey, header)

    // the signature file name is '_sig' || eth-address(publicKey) 
    const address = ethUtil.privateToAddress(privateKey).toString('hex')
    await pkg.addFile(`${signaturePath(address)}`, JSON.stringify(flattenedJwsSerialization, null, 2));

    // generate an output path based on the input (pkg) path
    const buildOutpath = (pkgPath : string) => {
      let ext = path.extname(pkgPath)
      const basename = path.basename(pkgPath, ext)
      // ext = '.epk'
      const dirname = path.dirname(pkgPath)
      const pkgPathOut = `${dirname}/${basename}_signed${ext}`
      return pkgPathOut
    }

    pkgPathOut = pkgPathOut || buildOutpath(pkgPath)
    await pkg.write(pkgPathOut)

    return pkgPathOut
  }

  static async recoverAddress() {

  }

  static async verify(pkgPath: string, address : string) {
    const pkg = await getPackage(pkgPath)    
    
    const signatureEntry = await pkg.getEntry(signaturePath(address))
    if(!signatureEntry){
      console.log('package does not contain a signature for', address)
      return false
    }

    const signatureBuffer = await signatureEntry.file.readContent('nodebuffer')
    const signatureObj = JSON.parse(signatureBuffer.toString())

    try {
      const isValid = await verifyIntegrity(pkg, signatureObj)
      if(!isValid){
        console.log('integrity error: mismatch between package contents and signed checksums')
        return false
      }
    } catch (error) {
      console.log('error during integrity check', error)
      return false
    }

    try {
      const addressRecovered = await recoverAddress(signatureObj)
      address = formatAddressHex(address)
      return addressRecovered === address
    } catch (error) {
      console.log('error during signature check', error)
      return false
    }

  }

}