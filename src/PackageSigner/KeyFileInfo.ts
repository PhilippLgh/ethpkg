export interface KeyFileInfo {
  fileName: string;
  filePath: string;
  address?: string;
  alias?: string;
  version?: string;
  keyObj?: any;
  error?: any,
  isValid: boolean;
  type?: string; // experimental, non-standard : intended use case of the key
}