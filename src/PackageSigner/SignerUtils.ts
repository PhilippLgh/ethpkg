import crypto from 'crypto'
import path from 'path'
import os from 'os'
import { IPackage, IPackageEntry, IFile } from '../PackageManager/IPackage'
import { IVerificationResult, ISignerInfo } from '../IVerificationResult'
import * as jws from '../jws'
import { normalizeRelativePath } from '../utils/PackageUtils'
import { PublicKeyInfo, getSigner } from './KeyService'
import { resolveName } from '../ENS/ens'
import { IFlattenedJwsSerialization } from '../jws'

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
    digests[alg][normalizeRelativePath(relativePath)] = checksum
  }
  return digests
}

const normalizePaths = (checksums: any) => {
  let normalized : Digests = {}
  for (const filePath in checksums) {
    normalized[normalizeRelativePath(filePath)] = checksums[filePath]
  }
  return normalized
}

export const compareDigests = (digestsFile: Digests, calculatedDigests: Digests) : boolean => {

  // calculate digests should already produce normalized paths 
  // but we should still sanitize input for compat reasons as this input might not be guaranteed
  let checksumsFile = normalizePaths(digestsFile['sha512'])
  let checksumsCalc = normalizePaths(calculatedDigests['sha512'])

  let filesCalc = Object.keys(checksumsCalc)
  let filesCheck =  Object.keys(checksumsFile)
  if (filesCalc.length !== filesCheck.length)
  {
    let difference = filesCalc
                 .filter(x => !filesCheck.includes(x))
                 .concat(filesCheck.filter(x => !filesCalc.includes(x)))
    throw new Error(`package contains more files than checksums: \n${difference.join('\n')} \n\n`)
  }
  for (const filePath of filesCalc) {
    if(checksumsFile[filePath] !== checksumsCalc[filePath]){
      throw new Error('integrity violation at file: ' + filePath)
    }
  }
  return true
}
const DAYS_180 = (180 * 24 * 60 * 60)

// TODO move to jwt
export const createPayload = async (pkg : IPackage, options : { expiresIn?: number } = {
  expiresIn: DAYS_180
}) => {
  const digests = await calculateDigests(pkg)

  const payload = {
    "version": 1,
    "iss": "self",
    "exp": Date.now() + (options.expiresIn || DAYS_180),
    "data": digests
  }

  return payload
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

export const getJwsFromSignatureEntry = async (signatureEntry: IPackageEntry, decodeToken = false) : Promise<IFlattenedJwsSerialization> => {
  const signatureBuffer = await signatureEntry.file.readContent('nodebuffer')
  const signatureObj = JSON.parse(signatureBuffer.toString())
  if (decodeToken) {
    return jws.decode(signatureObj)
  }
  return signatureObj
}

export const verifySignature = async (signatureEntry : IPackageEntry, digests : Digests) : Promise<IVerificationResult> => {

  const encodedToken = await getJwsFromSignatureEntry(signatureEntry)
  const decodedToken = await jws.decode(encodedToken)

  // verify integrity: check if files covered by signature were changed after signing
  // by comparing digests in signature payload with newly computed digests
  // the signature is valid if the signed hashes match the actual computed file hashes
  let isValid = false
  try {
    const { payload } = decodedToken
    // note we can only compare the digests but not "issue date" etc fields here
    isValid = compareDigests(payload.data, digests)
  } catch (error) {
    // TODO log if verbosity level applies
    // console.log('error: ', error)
  }

  // recover address / public key
  let recoveredAddress
  try {
    recoveredAddress = await jws.recoverAddress(encodedToken)
  } catch (error) {
    console.log('error during signature check', error)
  }
  isValid = isValid && !!recoveredAddress

  let { payload } = decodedToken
  let { version, iss, exp } = payload
  // console.log('recovered payload', payload)

  // TODO check signature date
  // TODO check signature certs
  // TODO check filename matches scheme with contained address
  // TODO check that recovered address matches header address

  const signers : Array<ISignerInfo> = [ ]
  if (recoveredAddress) {
    signers.push({
      address: recoveredAddress,
      exp,
      certificates: []
    })
  }

  const verificationResult = {
    isValid, // passes integrity check: files were not changed
    isTrusted: false, // FIXME 
    signers
  }

  return verificationResult
}

export const getSignatureEntriesFromPackage = async (pkg : IPackage, publicKeyInfo?: PublicKeyInfo) : Promise<Array<IPackageEntry>> => {
  if (publicKeyInfo) {
    const _signaturePath = await signaturePath(publicKeyInfo, pkg)
    const sig = await pkg.getEntry(_signaturePath)
    if(!sig){
      return []
    }
    return [ sig ]
  }
  const signatures = (await pkg.getEntries()).filter((pkgEntry : IPackageEntry) => pkgEntry.relativePath.includes(SIGNATURE_PREFIX))
  return signatures
}

export const getSignature = async (pkg: IPackage, publicKeyInfo: PublicKeyInfo) : Promise<IFlattenedJwsSerialization | undefined> => {
  const signatureEntries = await getSignatureEntriesFromPackage(pkg, publicKeyInfo)
  if (signatureEntries.length !== 1) {
    return undefined
  }
  const jws = await getJwsFromSignatureEntry(signatureEntries[0])
  return jws
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

// TODO consider moving to package utils
export const writeEntry = async (pkg: IPackage, relPath: string, content: string) => {
  const entry = toIFile(relPath, content)
  await pkg.addEntry(relPath, entry)
}

export const containsSignature = async (signers: Array<ISignerInfo>, publicKeyInfo: PublicKeyInfo) : Promise<boolean> => {
  if (typeof publicKeyInfo === 'string' && publicKeyInfo.endsWith('.ens')) {
    const publicKeyResolved = await resolveName(publicKeyInfo)
    if (publicKeyResolved === undefined) {
      // TODO log ens error
      return false
    }
    publicKeyInfo = publicKeyResolved
  }
  const result = signers.find(info => info.address.toLowerCase() === publicKeyInfo.toLowerCase())
  return result !== undefined
}

