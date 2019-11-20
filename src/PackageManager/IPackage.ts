export interface IPackage {
  fileName: string;
  loadBuffer(buf : Buffer) : Promise<void>;
  getEntries() : Promise<Array<IPackageEntry>>;
  getEntry(relativePath : string) : Promise<IPackageEntry | undefined>;
  getContent(relativePath : string) : Promise<Buffer>; 
  addEntry(relativePath : string, content : string | Buffer) : Promise<string>;
  toBuffer() : Promise<Buffer>;
  writePackage(outPath: string): Promise<string>;
}

export interface IFile {
  name: string,
  size: number,
  mode?: number,
  isDir: boolean,
  readContent: (format? : string) => Promise<Buffer>
}

export interface IPackageEntry {
  relativePath: string,
  file: IFile
}

