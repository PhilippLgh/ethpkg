import { IRelease } from '../Repositories/IRepository'
import { ISerializable } from './ISerializable'
import { StateListener } from '../IStateListener'

export interface WritePackageOptions {
  overwrite?: boolean; // should overwrite existing pkg with same name
  compression?: boolean;
}

export interface CreatePackageOptions {
  listener?: StateListener
}

export interface ExtractPackageOptions {
  listener?: StateListener
}

export interface IPackage extends ISerializable {
  fileName: string;
  filePath?: string;
  metadata?: IRelease;
  loadBuffer(buf : Buffer) : Promise<IPackage>;
  getEntries() : Promise<Array<IPackageEntry>>;
  getEntry(relativePath : string) : Promise<IPackageEntry | undefined>;
  getContent(relativePath : string) : Promise<Buffer>; 
  addEntry(relativePath : string, file: IFile) : Promise<string>;
  toBuffer() : Promise<Buffer>;
  writePackage(outPath: string, options?: WritePackageOptions): Promise<string>;
  extract(destPath: string, options?: ExtractPackageOptions) : Promise<string>;
  // static create(dirPathOrName: string, options?: CreatePackageOptions)
}

export function instanceofIPackage(object: any): object is IPackage {
  return typeof object === 'object' && (typeof object.loadBuffer === 'function') && (typeof object.getEntries === 'function')
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

