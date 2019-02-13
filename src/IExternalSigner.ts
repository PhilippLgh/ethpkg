export default interface IExternalSigner {
  type: string;
  header: {}
  sign: {
    eth : Function
  }
}
