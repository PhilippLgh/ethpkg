import { IPackage, IPackageEntry } from '../PackageManager/IPackage'
import * as ethUtil from 'ethereumjs-util'
import * as jws from '../jws'
import ISigner from './ISigner'
import { IVerificationResult, ISignerInfo } from '../IVerificationResult'
import * as SignerUtils from './SignerUtils'
import { toPackage, PackageData } from '../PackageManager/PackageService'
import { createHeader, ALGORITHMS, IFlattenedJwsSerialization } from '../jws'
import { getSigner, PrivateKeyInfo, PublicKeyInfo } from './KeyService'
import { toIFile } from '../utils/PackageUtils'
import { StateListener, PROCESS_STATES } from '../IStateListener'

export interface SignPackageOptions {
  expiresIn?: number,
  listener?: StateListener
}

export interface VerifyPackageOptions {
  addressOrEnsName?: PublicKeyInfo,
  listener?: StateListener
}

const VERIFICATION_ERRORS : any = {
  UNSIGNED: 0,
  UNSIGNED_BY: 1,
  BAD_PACKAGE: 2,
  PACKAGE_DOWNLOAD: 3,
}

const VERIFICATION_ERROR_MESSAGES : any = {} 
VERIFICATION_ERROR_MESSAGES[VERIFICATION_ERRORS.UNSIGNED] = `package is unsigned (signatures missing or not parsable)`
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

const writeChecksumsJson = async (pkg: IPackage, payload: any) => {
  const checksumsPath = await SignerUtils.checksumsPath(pkg)
  const checksumsFile = toIFile(checksumsPath, JSON.stringify(payload.data, null, 2))
  await pkg.addEntry(checksumsPath, checksumsFile);
}

const writeSignatureEntry = async (pkg: IPackage, jws: IFlattenedJwsSerialization, address: string) => {
  // the signature file name is '_sig' || eth-address(publicKey) 
  const signaturePath = await SignerUtils.signaturePath(address, pkg)
  const flattenedJsonSerializationFile = toIFile(signaturePath, JSON.stringify(jws, null, 2))
  await pkg.addEntry(signaturePath, flattenedJsonSerializationFile)
}

export const isSigned = async (pkgSpec: PackageData) : Promise<boolean> => {
  const pkg = await toPackage(pkgSpec)
  const signatures = await SignerUtils.getSignatureEntriesFromPackage(pkg)
  return signatures.length > 0
}

export const isValid = async (pkgSpec: PackageData) : Promise<boolean> => {
  try {
    const verificationResult = await verify(pkgSpec)
    return verificationResult.isValid
  } catch (error) {
    // TODO log with loglevel
    return false
  }
}

const isTrusted = async (pkgSpec: PackageData, publicKeyInfo?: PublicKeyInfo) : Promise<boolean> => {
  try {
    const verificationResult = await verify(pkgSpec)
    return verificationResult.isTrusted
  } catch (error) {
    // TODO log with loglevel
    return false
  }
}

export const sign = async (pkgSpec: PackageData, privateKey: PrivateKeyInfo, {
  expiresIn = undefined,
  listener = () => {}
}: SignPackageOptions = {}) : Promise<IPackage> => {
  
  let pkg 
  try {
    pkg = await toPackage(pkgSpec)
  } catch (error) {
    throw new Error(VERIFICATION_ERRORS.BAD_PACKAGE)
  }

  const signer = await getSigner(privateKey)
  if(!signer) {
    // TODO support external signers
    throw new Error('private key / ISigner not provided or malformed')
  }

  const address = await signer.getAddress()

  // create the content to be used as the JWS Payload.
  listener(PROCESS_STATES.CREATE_PAYLOAD_STARTED)
  const payload = await SignerUtils.createPayload(pkg, {
    expiresIn
  })
  listener(PROCESS_STATES.CREATE_PAYLOAD_FINISHED, { payload })

  const header = createHeader({
    algorithm: ALGORITHMS.EC_SIGN, // TODO use when node, use eth_sign when browser (metamask)
    address
  })
  // sign payload according to RFC7515 Section 5.1

  listener(PROCESS_STATES.SIGNING_PAYLOAD_STARTED)
  const flattenedJwsSerialization =  await jws.sign(payload, signer, header)
  if (!flattenedJwsSerialization) {
    throw new Error('jws signing failed')
  }
  listener(PROCESS_STATES.SIGNING_PAYLOAD_FINISHED)

  // add entries
  listener(PROCESS_STATES.ADDING_SIGNATURE_METADATA_STARTED)
  await writeChecksumsJson(pkg, payload)
  await writeSignatureEntry(pkg, flattenedJwsSerialization, address)
  listener(PROCESS_STATES.ADDING_SIGNATURE_METADATA_FINISHED)

  return pkg
}

/**
 * 
 * @param pkgSpec 
 * @param publicKeyInfo 
 */
export const verify = async (pkgSpec: PackageData, {
  addressOrEnsName = undefined
}: VerifyPackageOptions = {}) : Promise<IVerificationResult> => {
  
  let pkg 
  try {
    pkg = await toPackage(pkgSpec)
    if (!pkg) throw new Error('Package could not be fetched for specifier: '+pkgSpec)
  } catch (error) {
    return verificationError(VERIFICATION_ERRORS.BAD_PACKAGE)
  }

  const signatures = await SignerUtils.getSignatureEntriesFromPackage(pkg /*TODO? needs support for ens etc, publicKeyInfo*/)
  // TODO the error that the package is unsigned if publicKey not found is misleading
  if (signatures.length === 0) {
    return verificationError(VERIFICATION_ERRORS.UNSIGNED)
  }

  // TODO handle publicKeyInfo is cert
  // TODO handle publicKeyInfo is ens

  const digests = await SignerUtils.calculateDigests(pkg)

  const promises = signatures.map(sig => SignerUtils.verifySignature(sig, digests))
  const verificationResults = await Promise.all(promises)

  let signatureFound = false
  if(addressOrEnsName) {
    for (const verificationResult of verificationResults) {
      const { signers } = verificationResult
      if(await SignerUtils.containsSignature(signers, addressOrEnsName)) {
        signatureFound = true
      }
    }
    if (!signatureFound) {
      return verificationError(VERIFICATION_ERRORS.UNSIGNED_BY, addressOrEnsName) 
    }
  }

  /*
  in order for a package to be verified, it
  - MUST have at least one signature
  - the signature MUST match the computed package digests
  - the digests MUST NOT be empty
  - all (valid) signatures MUST cover combined 100% of the package's contents TODO partial signatures currently not supported

  in order for a package to be trusted it
  - MUST have a valid certificate OR ENS name
  - with a proof of identity or signed by a trusted CA
  - 100% of the package contents must be signed by at least one valid certificate
  */
  const signers = verificationResults.map(v => <ISignerInfo>v.signers.pop())

  let isValid = verificationResults.length > 0
  for (const verificationResult of verificationResults) {
    isValid = isValid && verificationResult.isValid
  }

  const isTrusted = isValid && signatureFound // TODO implement cert logic

  const verificationResult = {
    signers,
    isValid,
    isTrusted,
  }

  return verificationResult
}