export interface IPackage {
  loadBuffer(buf : Buffer) : Promise<void>;
  getEntries() : Promise<Array<IPackageEntry>>;
  getEntry(relativePath : string) : Promise<IPackageEntry | undefined>;
  addFile(relativePath : string, content : string | Buffer) : Promise<string>;
  toBuffer() : Promise<Buffer>;
  write(outPath: string): Promise<string>;
}

export interface IFile {
  dir: boolean,
  name: string,
  readContent: (format? : string) => Promise<Buffer>
}

export interface IPackageEntry {
  relativePath: string,
  file: IFile
}

