import fs from 'fs'
import { IPackage, IPackageEntry } from '../PackageManager/IPackage'

import ethUtil from 'ethereumjs-util'
import * as jws from '../jws'
import IExternalSigner from './IExternalSigner'
import { IVerificationResult } from '../IVerificationResult'
import * as SignerUtils from './SignerUtils'
import { isKeyfile, getPrivateKey } from './KeyStoreUtils'
import { getPackage } from '../PackageManager/PackageService'
import { createHeader, SUPPORTED_ALGORITHMS, IFlattenedJwsSerialization } from '../jws'

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
  const checksumsFile = SignerUtils.toIFile(checksumsPath, JSON.stringify(payload.data, null, 2))
  await pkg.addEntry(checksumsPath, checksumsFile);
}

const writeSignatureEntry = async (pkg: IPackage, jws: IFlattenedJwsSerialization, address: string) => {
  // the signature file name is '_sig' || eth-address(publicKey) 
  const signaturePath = await SignerUtils.signaturePath(address, pkg)
  const flattenedJsonSerializationFile = SignerUtils.toIFile(signaturePath, JSON.stringify(jws, null, 2))
  await pkg.addEntry(signaturePath, flattenedJsonSerializationFile)
}

export const isSigned = async (pkg: IPackage | Buffer) : Promise<boolean> => {
  pkg = await getPackage(pkg)
  const signatures = await SignerUtils.getSignatureEntriesFromPackage(pkg)
  return signatures.length > 0
}

const isValid = async (pkg: IPackage | Buffer) : Promise<boolean> => {
  return false
}

const isTrusted = async (pkg: IPackage | Buffer, ensOrCert: string) : Promise<boolean> => {
  return false
}

export const sign = async (
  pkgSrc: string | Buffer | IPackage, 
  privateKey : string | Buffer /*TODO | IExternalSigner*/,
  pkgPathOut? : string
) : Promise<IPackage | undefined> => {
  
  let pkg 
  try {
    pkg = await getPackage(pkgSrc)
  } catch (error) {
    throw new Error(VERIFICATION_ERRORS.BAD_PACKAGE)
  }

  if (typeof privateKey === 'string') {
    // TODO private key can be path to pem or keystore file
    if (await isKeyfile(privateKey)) {
      const privateKeyPath = privateKey
      const password = '' // FIXME
      privateKey = await getPrivateKey(privateKeyPath, password)
    }
    else {
      privateKey = Buffer.from(privateKey, 'hex')
    }
  }
  if(!privateKey || (Buffer.isBuffer(privateKey) && !ethUtil.isValidPrivate(privateKey))) {
    // TODO support external signers
    throw new Error('private key not provided or malformed')
  }

  // create the content to be used as the JWS Payload.
  const payload = await SignerUtils.createPayload(pkg)
  const header = createHeader({
    algorithm: SUPPORTED_ALGORITHMS.EC_SIGN // TODO use when node, use eth_sign when browser (metamask)
  })
  // sign payload according to RFC7515 Section 5.1
  const flattenedJwsSerialization =  await jws.sign(payload, privateKey, header)
  if (!flattenedJwsSerialization) {
    console.log('jws signing failed')
    return
  }

  // add entries
  await writeChecksumsJson(pkg, payload)

  const address = ethUtil.privateToAddress(privateKey).toString('hex')
  await writeSignatureEntry(pkg, flattenedJwsSerialization, address)

  if (pkgPathOut) {
    await pkg.writePackage(pkgPathOut)
  }

  return pkg
}

/**
 * 
 * @param pkgSrc 
 * @param addressOrEnsNameOrCert 
 */
export const verify = async (pkgSrc: string | Buffer | IPackage, addressOrEnsNameOrCert?: string) : Promise<IVerificationResult> => {
    
  let pkg 
  try {
    pkg = await getPackage(pkgSrc)
    if (!pkg) throw new Error('Package could not be fetched for specifier: '+pkgSrc)
  } catch (error) {
    return verificationError(VERIFICATION_ERRORS.BAD_PACKAGE)
  }

  const signatures = await SignerUtils.getSignatureEntriesFromPackage(pkg, addressOrEnsNameOrCert)
  if (signatures.length === 0) {
    return verificationError(VERIFICATION_ERRORS.UNSIGNED)
  }

  // TODO if addressOrEnsNameOrCert is cert
  // TODO if addressOrEnsNameOrCert is ens

  const payloadPkg = await SignerUtils.createPayload(pkg)
  const promises = signatures.map(sig => SignerUtils.verifySignature(sig, payloadPkg))
  const signatureInfos = await Promise.all(promises)

  /* FIXME
  if (addressOrEnsNameOrCert && signatureInfos.find(info => info.signerAddress.toLowerCase() === addressOrEnsNameOrCert.toLowerCase())) {  // signature not found
    return verificationError(VERIFICATION_ERRORS.UNSIGNED_BY, addressOrEnsNameOrCert) 
  }
  */

  /*
  in order for a package to be verified, it
  - MUST have at least one signature
  - the signature MUST match the computed package payload
  - the payload MUST NOT be empty
  - all (valid) signatures MUST cover combined 100% of the package's contents TODO partial signatures currently not supported

  in order for a package to be trusted it
  - MUST have a valid certificate OR ENS name
  - with a proof of identity or signed by a trusted CA
  - 100% of the package contents must be signed by at least one valid certificate
  */
  let isValid = true
  signatureInfos.forEach(s => {
    isValid = isValid && s.isValid
  })

  const verificationResult = {
    signers: signatureInfos.map(s => ({
      address: '', //FIXME s.signerAddress,
      certificates: [],
      coverage: 100
    })),
    isValid,
    isTrusted: false,
  }

  return verificationResult
}