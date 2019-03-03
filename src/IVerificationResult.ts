import { ICertificatePayload } from "./ICertificate";

export interface ISignerInfo {
  address: string,
  certificates: ICertificatePayload[],
  coverage: number
}

export interface IVerificationError {
  code: number,
  message: string
}

export interface IVerificationResult {

  signers: ISignerInfo[]

  // 
  isValid: boolean

  //
  isTrusted: boolean

  // 
  error? : IVerificationError

}