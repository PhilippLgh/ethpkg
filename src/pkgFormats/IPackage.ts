export interface IPackage {
  loadBuffer(buf : Buffer) : Promise<void>;
  getEntries() : Promise<Array<IPackageEntry>>;
  getEntry(relativePath : string) : Promise<IPackageEntry | null>;
  addEntry(relativePath : string, content : string | Buffer) : Promise<string>;
  toBuffer() : Promise<Buffer>;
  writePackage(outPath: string): Promise<string>;
}

export interface IFile {
  isDir: boolean,
  name: string,
  readContent: (format? : string) => Promise<Buffer>
}

export interface IPackageEntry {
  relativePath: string,
  file: IFile
}

