import crypto from 'crypto'
import path from 'path'
import os from 'os'
import { IPackage, IPackageEntry, IFile } from '../PackageManager/IPackage'
import * as ethUtil from 'ethereumjs-util'
import base64url from 'base64url'
import { IVerificationResult } from '../IVerificationResult'

const META_DIR = '_META_'
const SIGNATURE_PREFIX = `${META_DIR}/_sig`

const shasum = (data : any, alg? : string) => {
  return crypto
    .createHash(alg || 'sha256')
    .update(data)
    .digest('hex')
}

export const checksumsPath = async (pkg : IPackage) => {
  const shouldPrefix = await isNPM(pkg)
  let prefixNpm = (shouldPrefix ? 'package/' : '')
  return `${prefixNpm + META_DIR}/_checksums.json`
}

export interface Digests {[index:string] : {[index:string] : string} }

export const calculateDigests = async (pkg: IPackage, alg = 'sha512') : Promise<Digests> => {
  const entries = await pkg.getEntries()
  const digests : Digests = {}
  digests[alg] = {}
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const { relativePath, file } = entry
    if(file.isDir){continue}
    // skip META DIR contents
    if(relativePath.includes(META_DIR)){continue}
    const decompressedData = await file.readContent('nodebuffer')
    const checksum = shasum(decompressedData, alg)
    digests[alg][relativePath] = checksum
  }
  return digests
}

export const compareDigests = (digestsFile: Digests, calculatedDigests: Digests) : boolean => {
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

export const createPayload = async (pkg : IPackage) => {
  const digests = await calculateDigests(pkg)

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

export const verifyIntegrity = async (payloadPkg : any, signatureObj : any) : Promise<boolean> => {
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

export const formatAddressHex = (address : string) => {
  address = address.toLowerCase()
  if (!address.startsWith('0x')){
    address = `0x${address}`
  }
  return address
}

const isNPM = async (pkg : IPackage) : Promise<Boolean> => {
  const packageJson = await pkg.getEntry('package/package.json')
  return !!packageJson
}

export const signaturePath = async (address : string, pkg : IPackage) => {
  address = formatAddressHex(address)
  const shouldPrefix = await isNPM(pkg)
  let prefixNpm = (shouldPrefix ? 'package/' : '')
  return `${prefixNpm + META_DIR}/_sig_${address}.json`
}


export const verifySignature = async (signatureEntry : IPackageEntry, payloadPkg : any) : Promise<IVerificationResult> => {

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
    // recoveredAddress = await recoverAddress(signatureObj)
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

    ],
    signers: [],
    isTrusted: false // FIXME 
  }

  return verificationResult
}

export const getSignatureEntriesFromPackage = async (pkg : IPackage, address? : string) : Promise<Array<IPackageEntry>> => {
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

export const toIFile = (relPath: string, content: string | Buffer) : IFile => {
  const contentBuf = (typeof content === 'string') ? Buffer.from(content) : content
  const name = path.basename(relPath)
  return {
    name,
    isDir: false,
    size: contentBuf.length,
    readContent: () => Promise.resolve(contentBuf)
  }
}

export const containsSignature = (verificationResult: IVerificationResult, addressOrEnsNameOrCert: string) : boolean => {
  const { signers } = verificationResult
  const result = signers.find(info => info.address.toLowerCase() === addressOrEnsNameOrCert.toLowerCase())
  console.log('signers', signers, result, addressOrEnsNameOrCert)
  return result !== undefined
}

