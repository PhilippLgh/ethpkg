import { IPackage, IPackageEntry } from '../PackageManager/IPackage'

import ethUtil from 'ethereumjs-util'
import jws from '../jws';
import IExternalSigner from './IExternalSigner'
import { IVerificationResult } from '../IVerificationResult'
import ethpkg from '../'
import { downloadNpmPackage } from '../util'
import * as SignerUtils from './SignerUtils'

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

export default class pkgsign {

  static async isSigned(pkg : IPackage | Buffer) : Promise<boolean> {
    pkg = await ethpkg.loadPackage(pkg)
    const signatures = await SignerUtils.getSignaturesFromPackage(pkg)
    return signatures.length > 0
  }

  static async sign(
    pkgSrc: string | Buffer, 
    privateKey? : Buffer | IExternalSigner,
    pkgPathOut? : string
  ) : Promise<IPackage | undefined> {

    let pkg = await ethpkg.loadPackage(pkgSrc)

    if(!privateKey) {
      // TODO support external signers
      throw new Error('private key not provided or malformed')
    }
    
    /*
    1.  Create the content to be used as the JWS Payload.
    */
    const payload = await SignerUtils.createPayload(pkg)
    const checksumsPath = await SignerUtils.checksumsPath(pkg)
    const checksumsFile = SignerUtils.toIFile(checksumsPath, JSON.stringify(payload.data, null, 2))
    await pkg.addEntry(checksumsPath, checksumsFile);

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

    const _signaturePath = await SignerUtils.signaturePath(address, pkg)
    const flattenedJsonSerializationFile = SignerUtils.toIFile(_signaturePath, JSON.stringify(flattenedJwsSerialization, null, 2))
    await pkg.addEntry(_signaturePath, flattenedJsonSerializationFile)

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
    
    let pkg 
    try {
      pkg = await ethpkg.loadPackage(pkgSrc)
    } catch (error) {
      return verificationError(VERIFICATION_ERRORS.BAD_PACKAGE)
    }

    const signatures = await SignerUtils.getSignaturesFromPackage(pkg, addressOrEnsName)

    if (addressOrEnsName && signatures.length <= 0) {  // signature not found
      return verificationError(VERIFICATION_ERRORS.UNSIGNED_BY, addressOrEnsName) 
    }

    if (signatures.length === 0) {
      return verificationError(VERIFICATION_ERRORS.UNSIGNED)
    }

    const payloadPkg = await SignerUtils.createPayload(pkg)
    const promises = signatures.map(sig => SignerUtils.verifySignature(sig, payloadPkg))
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