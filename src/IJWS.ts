export interface IFlattenedJwsSerialization {
  header?: any,
  protected?: string, // base64url
  payload: string | any, // base64url | json object
  signature: string // base64url
}
