export default interface ISigner {
  type: string;
  name: string;
  ecSign?: (msg: Buffer) => Promise<Buffer>;
  ethSign?: (msg: Buffer) => Promise<Buffer>;
}
