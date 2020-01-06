export default interface ISigner {
  type: string;
  name: string;
  ecSign?: (msg: Buffer) => Promise<Buffer>;
  ethSign?: (msg: Buffer) => Promise<Buffer>;
  getAddress: () => Promise<string>;
}

export function instanceofISigner(object: any): object is ISigner {
  return typeof object === 'object' && object.type === 'signer'
}