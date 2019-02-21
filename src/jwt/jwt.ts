import JWS from "../jws"
import { IFlattenedJwsSerialization } from "../IJWS";

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

const sign = async (payload : string | Buffer | object, secretOrPrivateKey: Buffer/*Secret*/, options?: SignOptions) => {
  const header = {} // construct from options
  return JWS.sign(payload, secretOrPrivateKey, header)
}

const verify = async (
  token: string | IFlattenedJwsSerialization,
  secretOrPublicKey: string | Buffer,
  options?: VerifyOptions,
): Promise<object | string> => {
  // TODO verify algorithms
  // TODO verify exp
  // TODO verify nbf
  // TODO verify issuer
  return ''
}

const decode = (token : IFlattenedJwsSerialization) => {
  return token.payload
}

export default { sign, verify, decode }
