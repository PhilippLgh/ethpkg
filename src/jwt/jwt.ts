import * as JWS from '../jws'
import { IFlattenedJwsSerialization } from '../jws'

interface SignOptions {
  algorithm?: string;
  keyid?: string;
  expiresIn?: string | number;
  issuer?: string;
  header?: object;
}

interface VerifyOptions {
  algorithms?: string[];
  issuer?: string | string[];
  subject?: string;
}

export const sign = async (payload : string | Buffer | object, secretOrPrivateKey: Buffer/*Secret*/, options?: SignOptions) => {
  const header = {} // construct from options
  return JWS.sign(payload, secretOrPrivateKey, header)
}

export type Secret =
    | string
    | Buffer
    | { key: string | Buffer; passphrase: string };
/**
 * Asynchronously verify given token using a secret or a public key to get a decoded token
 * token - JWT string to verify
 * secretOrPublicKey - Either the secret for HMAC algorithms, or the PEM encoded public key for RSA and ECDSA.
 * [options] - Options for the verification
 * returns - The decoded token.
 */
export const verify = async (
  token: string, // | IFlattenedJwsSerialization,
  secretOrPublicKey: string | Buffer,
  options?: VerifyOptions,
): Promise<object | string> => {
  // TODO verify algorithms
  // TODO verify exp
  // TODO verify nbf
  // TODO verify issuer
  return ''
}

export const decode = (token : IFlattenedJwsSerialization) => {
  return token.payload
}

