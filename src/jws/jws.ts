import * as ethUtil from 'ethereumjs-util'
import base64url from 'base64url'
import ISigner from '../PackageSigner/ISigner'
import PrivateKeySigner from '../Signers/PrivateKeySigner'

export interface IFlattenedJwsSerialization {
  header?: any,
  protected?: string, // base64url
  payload: string | any, // base64url | json object
  signature: string // base64url
}

interface VerifyOptions {
  algorithms?: string[];
  issuer?: string | string[];
  subject?: string;
}

// we sort the payload fields to achieve determinism FIX#1
// https://stackoverflow.com/questions/5467129/sort-javascript-object-by-key/31102605#31102605
// https://github.com/brianloveswords/node-jws/pull/83
const safeStringify = (payload: any) => {
  const ordered : any = {};
  Object.keys(payload).sort().forEach(function(key) {
    ordered[key] = payload[key];
  })
  return JSON.stringify(ordered)
}

export const ecRecover = async (signatureHexStr: string, msg: string, scheme: string = ALGORITHMS.EC_SIGN) : Promise<string> => {
  // if compact [r,s] form detected 
  if (signatureHexStr.length === (64 * 2)) {
    signatureHexStr += '1B' // append v=27
  }
  const msgHash = scheme === ALGORITHMS.EC_SIGN ? ethUtil.keccak256(msg) : ethUtil.hashPersonalMessage(Buffer.from(msg))
  // fromRpcSig expects a 0x prefixed hex string
  signatureHexStr = ethUtil.addHexPrefix(signatureHexStr)
  const sigParams = ethUtil.fromRpcSig(signatureHexStr)
  const recoveredPublic = ethUtil.ecrecover(msgHash, sigParams.v, sigParams.r, sigParams.s)
  const recovered = ethUtil.pubToAddress(recoveredPublic)
  const address = `0x${recovered.toString('hex')}`
  return address
}

export type Secret = string | Buffer | { key: string; passphrase: string }

export const ALGORITHMS = {
  'EC_SIGN': 'ES256K',
  'ETH_SIGN': 'ETH',
}

/**
 * Create the JSON object(s) containing the desired set of Header Parameters, 
 * which together comprise the JOSE Header (the JWS Protected Header and/or the JWS Unprotected Header).
 */
export const createHeader = (options: any = { algorithm: ALGORITHMS.EC_SIGN }) => {
  if (!Object.values(ALGORITHMS).includes(options.algorithm)) {
    throw new Error('Unsupported signing algorithm: '+options.algorithm)
  }
  const header = {
    // IMPORTANT: non-standard 'alg' value. see: 
    // https://tools.ietf.org/html/draft-jones-webauthn-secp256k1-00
    // https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms
    alg: options.algorithm, // one of ES256K | ETH
    // skip payload encoding: https://tools.ietf.org/html/rfc7797
    b64: false,
    crit: ['b64']
    // FIXME specify key / cert
  }
  return header
}

// TODO needs implementation
const validateHeader = () => {}

export const sign = async (payload: any, signerOrPrivateKey: Buffer | ISigner, header? : any) => {

  /*
  Compute the encoded header value BASE64URL(UTF8(JWS Protected Header)).  
  If the JWS Protected Header is not present (which can only happens when using 
  the JWS JSON Serialization and no "protected" member is present), let this value be the empty string.
  */
  header = header || createHeader()
  const encodedHeader = base64url.encode(safeStringify(header))

  // Compute the encoded payload value BASE64URL(JWS Payload)
  // https://tools.ietf.org/html/rfc7797
  // step is skipped: const encodedPayload = base64url.encode(JSON.stringify(payload))
  const encodedPayload = safeStringify(payload)

  // turn pk buffer into ISigner if necessary
  const signer = Buffer.isBuffer(signerOrPrivateKey) ? new PrivateKeySigner(signerOrPrivateKey) : signerOrPrivateKey

  /*
  Compute the JWS Signature in the manner defined for the particular algorithm being used over the JWS Signing Input
  ASCII(BASE64URL(UTF8(JWS Protected Header)) || '.' || BASE64URL(JWS Payload)).  
  The "alg" (algorithm) Header Parameter MUST be present in the JOSE Header, with the algorithm value
  accurately representing the algorithm used to construct the JWS Signature.
  */
  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`)
  let signature

  /**
   * https://tools.ietf.org/id/draft-jones-json-web-signature-02.html#DefiningECDSA:
    A JWS is signed with an ECDSA P-256 SHA-256 signature as follows:
    Generate a digital signature of the UTF-8 representation of the JWS Signing Input using ECDSA P-256 SHA-256 with the desired private key.
    The output will be the EC point (R, S), where R and S are unsigned integers.
    Turn R and S into byte arrays in big endian order. Each array will be 32 bytes long.
    Concatenate the two byte arrays in the order R and then S.
    Base64url encode the resulting 64 byte array.
  */
  if (header.alg === ALGORITHMS.EC_SIGN) {
    if (!signer.ecSign) {
      throw new Error(`Signer "${signer.name}" does not implement EC signing`)
    }
    signature = await signer.ecSign(signingInput)
  } 
  else if(header.alg === ALGORITHMS.ETH_SIGN) {
    if (!signer.ethSign) {
      throw new Error(`Signer "${signer.name}" does not implement personal message signing`)
    }
    signature = await signer.ethSign(signingInput)
  }
  else {
    throw new Error('Unsupported algorithm')
  }

  // length 64 is according to ietf spec draft
  // length 65 is bitcoin style
  const isValid = !!signature && (signature.length === 64 || signature.length === 65) // TODO run checks on signature
  if (!signature) {
    throw new Error(`Payload could not be signed: signer "${signer.name}" cancelled or threw error`)
  }
  if (!isValid) {
    throw new Error(`Signer "${signer.name}" produced an invalid signature`)
  }

  /*
  Compute the encoded signature value BASE64URL(JWS Signature).
  */
  const encodedSignature = base64url.encode(signature)

  /*
  Create the desired serialized output.  
  The JWS JSON Serialization is described in Section 7.2.
  */
  const flattenedJwsSerialization = {
    protected: encodedHeader,
    payload,
    signature: encodedSignature
  }

  return flattenedJwsSerialization
}

export const decode = async (token: IFlattenedJwsSerialization) => {
  const { protected: encodedProtectedHeader, payload, signature } = token
  const decodedHeader = base64url.toBuffer(encodedProtectedHeader || '').toString('hex')
  const decodedSignature = base64url.toBuffer(signature).toString('hex')
  return {
    protected: decodedHeader,
    payload, // NOTE: not encoded due to b64:false flag
    signature: decodedSignature
  }
}

export const recoverAddress = async (encodedToken: IFlattenedJwsSerialization) : Promise<string> => {
  const { protected: encodedProtectedHeader } = encodedToken
  const decoded = await decode(encodedToken)
  const { /*protected,*/ payload, signature } = decoded
  // TODO consider moving to helper
  const encodedPayload = safeStringify(payload) // NOTE: not encoded due to b64:false flag
  const signingInput = `${encodedProtectedHeader}.${encodedPayload}`
  // TODO handle eth and ec
  const address = await ecRecover(signature, signingInput)
  return address
}

export const verify = async (
  token: /*string |*/ IFlattenedJwsSerialization,
  secretOrPublicKey: string | Buffer,
  options?: VerifyOptions
): Promise<Object | undefined> => {
  const decoded = await decode(token)
  const address = await recoverAddress(token)
  if (Buffer.isBuffer(secretOrPublicKey)) {
    secretOrPublicKey = secretOrPublicKey.toString()
  }
  if (address.toLowerCase() === secretOrPublicKey.toLowerCase()) {
    return decoded
  }
  // TODO consider throwing an error here
  return undefined
}