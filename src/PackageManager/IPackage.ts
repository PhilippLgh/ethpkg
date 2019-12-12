import { IRelease } from "../Repositories/IRepository";

export type ProgressListener = (progress: number, filePath: string) => void

export interface IPackage {
  fileName: string;
  metadata?: IRelease;
  loadBuffer(buf : Buffer) : Promise<void>;
  getEntries() : Promise<Array<IPackageEntry>>;
  getEntry(relativePath : string) : Promise<IPackageEntry | undefined>;
  getContent(relativePath : string) : Promise<Buffer>; 
  addEntry(relativePath : string, content : string | Buffer) : Promise<string>;
  toBuffer() : Promise<Buffer>;
  writePackage(outPath: string): Promise<string>;
  extract(destPath: string, onProgress?: ProgressListener) : Promise<string>;
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

