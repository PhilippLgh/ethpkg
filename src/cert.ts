import crypto from 'crypto'
import fs from 'fs'
import { ICertificatePayload, CERT_TYPE, ISubjectInfo, IDENTITY_TYPE, IEthKeyShort, ICsrOptions } from "./ICertificate";
import jwt from './jwt'
import _jwt from 'jsonwebtoken'
import { IFlattenedJwsSerialization } from './IJWS';
import ethUtil from 'ethereumjs-util'

const uuid = () => crypto.randomBytes(16).toString('hex')

const DAYS = 14 // 14 days is max -> short-lived
const SECONDS_PER_DAY = 86400 // 24 * 60 * 60

const now = () => {
  return Math.floor(Date.now() / 1000)
}

const setJwtStandardClaims = (payload: object, iss: string, address: string): any => {
  return {
    ...payload,

    // issuer block:
    iss, // jwt : urn

    // subject block:
    sub: address, // jwt identifier

    // validity block:
    iat: now(), // jwt : NumericDate
    exp: now() + (DAYS * SECONDS_PER_DAY), // jwt : NumericDate
    nbf: now(), // jwt : NumericDate

    jti: uuid(), // jwt
  }
}

type ICertificateSigningRequest = IFlattenedJwsSerialization

const flattenKeyInfo = (SubjectPublicKeyInfo : IEthKeyShort) => {
  return {
    'key:alg' : SubjectPublicKeyInfo.alg,
    'key:address' : SubjectPublicKeyInfo.address
  }
}

const signAlt = (payload:object) => {
  return _jwt.sign(payload, '1234')
}

export default class cert {

  static async csr(SubjectIdentityInfo: ISubjectInfo, privateKey: Buffer, options : ICsrOptions): Promise<IFlattenedJwsSerialization | string | object | null> {
    const address = '0x'+ethUtil.privateToAddress(privateKey).toString('hex')
    const SubjectPublicKeyInfo = {
      alg: 'eth',
      address
    }
    const payload = {
      ...(flattenKeyInfo(SubjectPublicKeyInfo)),
      ...SubjectIdentityInfo
    }
    const payloadJwt = setJwtStandardClaims(payload, address, address)
    return await jwt.sign(payloadJwt, privateKey)
    // return _jwt.decode(signAlt(payload))
  }

  static async issue(
    validatedCsr: ICertificateSigningRequest,
    privateKey: Buffer,
    optionsHeader: any,
    ca = {
      iss: 'self'
    }
  ): Promise<IFlattenedJwsSerialization> {

    const csrPayload = await jwt.decode(validatedCsr)

    // 2. extract address from csr
    const { SubjectPublicKeyInfo, SubjectIdentityInfo } = csrPayload
    const { address } = SubjectPublicKeyInfo
    const { name, email } = SubjectIdentityInfo
    // 4. create cert token

    let payload = {
      // versioning / "header" block:
      version: 1,
      'cert:typ': CERT_TYPE.PUBLIC_KEY, // custom: oneOf CERT_TYPE
      'id:typ': IDENTITY_TYPE.EMAIL, // custom: oneOf IDENTITY_TYPE

      // subject data block:
      csr: validatedCsr,

      name,
      email,

      // key block
      "key:alg": 'eth',
      "key:address": address
    }

    payload = setJwtStandardClaims(payload, 'self', address)

    // return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    return await jwt.sign(payload, privateKey)
  }
}
