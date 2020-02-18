import { ICertificatePayload } from './ICertificate'

export interface ISignerInfo {
  address: string,
  certificates: ICertificatePayload[],
  exp?: string, // expiration date from jws
  // coverage: number
}

export interface IVerificationError {
  code: number,
  message: string
}

export interface IVerificationResult {

  signers: Array<ISignerInfo>

  // 
  isValid: boolean

  //
  isTrusted: boolean

  // 
  error? : IVerificationError

}