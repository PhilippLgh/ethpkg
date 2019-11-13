import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import { IPackage, IPackageEntry } from '../PackageManager/IPackage'

import ethUtil from 'ethereumjs-util'
import jws from '../jws';
import base64url from 'base64url'
import IExternalSigner from './IExternalSigner'
import { IVerificationResult } from '../IVerificationResult'
import { default as ethpkg } from '../PackageManager/PackageManager'
import { downloadNpmPackage } from '../util';

const META_DIR = '_META_'
const SIGNATURE_PREFIX = `${META_DIR}/_sig`

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
    if(file.isDir){continue}
    // skip META DIR contents
    if(relativePath.includes(META_DIR)){continue}
    const decompressedData = await file.readContent("nodebuffer")
    const checksum = shasum(decompressedData, alg)
    digests[alg][relativePath] = checksum
  }
  return digests
}

const compareDigests = (digestsFile: Digests, calculatedDigests: Digests) => {
  let checksumsFile = digestsFile['sha512']
  let checksumsCalc = calculatedDigests['sha512']

  let filesCalc = Object.keys(checksumsCalc)
  let filesCheck =  Object.keys(checksumsFile)
  if (filesCalc.length !== filesCheck.length)
  {
    
    let difference = filesCalc
                 .filter(x => !filesCheck.includes(x))
                 .concat(filesCheck.filter(x => !filesCalc.includes(x)))

    throw new Error(`package contains more files than checksums: \n${difference.join('\n')} \n\n`)
  }
  for (const prop in checksumsCalc) {
    if(checksumsFile[prop] !== checksumsCalc[prop]){
      throw new Error('integrity violation at file: ' + prop)
    }
  }
  return true
}

const createPayload = async (pkg : IPackage) => {
  const entries = await pkg.getEntries()
  const digests = await calculateDigests(entries)

  // TODO make sure JSON.stringify(digests) is deterministic: see
  // https://github.com/brianloveswords/node-jws/pull/83
  const payload = {
    "version": 1,
    "iss": "self",
    "exp": Date.now() + (24 * 60 * 60),
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

const isNPM = async (pkg : IPackage) => {
  const packageJson= await pkg.getEntry('package/package.json')
  return packageJson != null
}

const signaturePath = async (address : string, pkg : IPackage) => {
  address = formatAddressHex(address)
  const shouldPrefix = await isNPM(pkg)
  let prefixNpm = (shouldPrefix ? 'package/' : '')
  return `${prefixNpm + META_DIR}/_sig_${address}.json`
}

const checksumsPath = async (pkg : IPackage) => {
  const shouldPrefix = await isNPM(pkg)
  let prefixNpm = (shouldPrefix ? 'package/' : '')
  return `${prefixNpm + META_DIR}/_checksums.json`
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

const verifyIntegrity = async (payloadPkg : any, signatureObj : any) => {
  const { payload } = signatureObj
  const { data } = payload

  let digestsMatch = false
  try {
    // note we can only compare the digests but not "issue date" etc fields here
    digestsMatch = compareDigests(data, payloadPkg.data)
  } catch (error) {
    console.log('error: ', error)
    return false
  }

  return digestsMatch === true
}

const verifySignature = async (signatureEntry : IPackageEntry, payloadPkg : any) => {

  const signatureBuffer = await signatureEntry.file.readContent('nodebuffer')
  const signatureObj = JSON.parse(signatureBuffer.toString())

  // check if files were changed after signing
  let isValid = false
  try {
    isValid = await verifyIntegrity(payloadPkg, signatureObj)
    if(!isValid){
      console.log('integrity error: mismatch between package contents and signed checksums')
    }
  } catch (error) {
    console.log('error during integrity check', error)
  }

  // recover address / public key
  let recoveredAddress = 'invalid address'
  try {
    recoveredAddress = await recoverAddress(signatureObj)
  } catch (error) {
    console.log('error during signature check', error)
  }

  // let header = JSON.parse(base64url.decode(signatureObj.protected))
  let { payload } = signatureObj
  let { version } = payload
  // console.log('recovered payload', payload)


  // TODO check signature date
  // TODO check signature certs
  // TODO check filename matches scheme with contained address

  // TODO check that recovered address matches header address

  const verificationResult = {
    signerAddress: recoveredAddress,
    isValid: (isValid === true), // passes integrity check: files were not changed
    certificates: [

    ]
  }

  return verificationResult
}

const getSignaturesFromPackage = async (pkg : IPackage, address? : string) => {
  if (address) {
    const _signaturePath = await signaturePath(address, pkg)
    const sig = await pkg.getEntry(_signaturePath)
    if(!sig){
      return []
    }
    return [ sig ]
  }
  const signatures = (await pkg.getEntries()).filter((pkgEntry : IPackageEntry) => pkgEntry.relativePath.includes(SIGNATURE_PREFIX))
  return signatures
}

const VERIFICATION_ERRORS : any = {
  UNSIGNED: 0,
  UNSIGNED_BY: 1,
  BAD_PACKAGE: 2,
  PACKAGE_DOWNLOAD: 3,
}

const VERIFICATION_ERROR_MESSAGES : any = {} 
VERIFICATION_ERROR_MESSAGES[VERIFICATION_ERRORS.UNSIGNED] = `package is unsigned. (signatures missing or not parsable)`
VERIFICATION_ERROR_MESSAGES[VERIFICATION_ERRORS.UNSIGNED_BY] = `package does not contain a signature for `
VERIFICATION_ERROR_MESSAGES[VERIFICATION_ERRORS.BAD_PACKAGE] = `could not find or load package`
VERIFICATION_ERROR_MESSAGES[VERIFICATION_ERRORS.PACKAGE_DOWNLOAD] = `could not download package`


const verificationError = (errorCode : number, val = '') : IVerificationResult => {
  return {
    signers: [],
    isValid: false,
    isTrusted: false,
    error: {
      code: errorCode,
      message: `${VERIFICATION_ERROR_MESSAGES[errorCode]} ${val}`
    }
  }
}

export default class pkgsign {

  static loadPackage = async (src: string | Buffer) => {
    const pkg = await new ethpkg().getPackage(src)
    if (!pkg) throw new Error('Package could not be loaded')
    return pkg
  } 

  static async isSigned(pkg : IPackage) {
    const signatures = await getSignaturesFromPackage(pkg)
    return signatures.length > 0
  }

  static async sign(
    pkgSrc: string | Buffer, 
    privateKey? : Buffer | IExternalSigner,
    pkgPathOut? : string
  ) : Promise<IPackage | undefined> {

    let pkg = null
    try {
      pkg = await this.loadPackage(pkgSrc)
    } catch (error) {
      console.log('could not find or load package')
      return
    }

    if(!privateKey) {
      // TODO support external signers
      throw new Error('private key not provided or malformed')
    }
    
    /*
    1.  Create the content to be used as the JWS Payload.
    */
    const payload = await createPayload(pkg)
    await pkg.addEntry(await checksumsPath(pkg), JSON.stringify(payload.data, null, 2));

    // sign payload according to RFC7515 Section 5.1
    const header = {
      alg: 'ES256K',
      b64: false,
      crit: ['b64']
    }

    const flattenedJwsSerialization =  await jws.sign(payload, privateKey, header)
    let address = '0x0000000000000000000000000000000000000000'
    if (Buffer.isBuffer(privateKey)) {
      // the signature file name is '_sig' || eth-address(publicKey) 
      address = ethUtil.privateToAddress(privateKey).toString('hex')
    } else {
      // FIXME retrieve public key / address that was used to sign
      // should be part of the token metadata
    }

    if (!flattenedJwsSerialization) {
      console.log('jws signing failed')
      return
    }

    const _signaturePath = await signaturePath(address, pkg)
    await pkg.addEntry(_signaturePath, JSON.stringify(flattenedJwsSerialization, null, 2))

    if (pkgPathOut) {
      await pkg.writePackage(pkgPathOut)
    }

    return pkg
  }

  static async recoverAddress(signerInput : string, signature : string) {
    return ''
  }

  // TODO add ENS support
  static async verify(pkgSrc: string | Buffer | IPackage, addressOrEnsName? : string) : Promise<IVerificationResult> {
    
    let pkg = null
    if(typeof pkgSrc !== 'string' && !Buffer.isBuffer(pkgSrc)) {
      pkg = pkgSrc
    } else {
      try {
        pkg = await this.loadPackage(pkgSrc)
      } catch (error) {
        return verificationError(VERIFICATION_ERRORS.BAD_PACKAGE)
      }
    }

    const signatures = await getSignaturesFromPackage(pkg, addressOrEnsName)

    if (addressOrEnsName && signatures.length <= 0) {  // signature not found
      return verificationError(VERIFICATION_ERRORS.UNSIGNED_BY, addressOrEnsName) 
    }

    if (signatures.length === 0) {
      return verificationError(VERIFICATION_ERRORS.UNSIGNED)
    }

    const payloadPkg = await createPayload(pkg)
    const promises = signatures.map(sig => verifySignature(sig, payloadPkg))
    const signatureInfos = await Promise.all(promises)

    /*
    in order for a package to be verified, it
    - MUST have at least one signature
    - the signature MUST match the computed package payload
    - the payload MUST NOT be empty
    - all (valid) signatures MUST cover combined 100% of the package's contents TODO partial signatures currently not supported

    in order for a package to be trusted it
    - MUST have a valid certificate
    - with a proof or signed by a trusted CA
    - 100% of the package contents must be signed by at least one valid certificate
    */
    let isValid = true
    signatureInfos.forEach(s => {
      isValid = isValid && s.isValid
    })

    const verificationResult = {
      signers: signatureInfos.map(s => ({
        address: s.signerAddress,
        certificates: [],
        coverage: 100
      })),
      isValid,
      isTrusted: false,
    }

    return verificationResult
    
  }


  static async verifyNpm(pkgName : string, addressOrEnsName? : string) : Promise<IVerificationResult> {
    try {      
      let pkgPath = await downloadNpmPackage(pkgName)
      if (!pkgPath) {
        return verificationError(VERIFICATION_ERRORS.BAD_PACKAGE)
      }

      return this.verify(pkgPath, addressOrEnsName)

    } catch (error) {
      return verificationError(VERIFICATION_ERRORS.PACKAGE_DOWNLOAD)
    }
  }
}