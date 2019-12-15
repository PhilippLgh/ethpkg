import path from 'path'

// the supported package extensions
const PACKAGE_EXTENSIONS = ['.zip', '.tar.gz', '.tgz', '.tar']

// this helper is especially used to support .tar.gz
export const getExtension = (fileName : string) : string => {
  for (let i = 0; i < PACKAGE_EXTENSIONS.length; i++) {
    const ext = PACKAGE_EXTENSIONS[i];
    if(fileName.endsWith(ext)){
      return ext
    }
  }
  return path.extname(fileName)
}

export const hasPackageExtension = (fileName : string | undefined) : boolean => {
  if (fileName === undefined) return false
  const ext = getExtension(fileName)
  return PACKAGE_EXTENSIONS.includes(ext)
}

export const hasSignatureExtension = (fileName : string | undefined) : boolean => {
  if (fileName === undefined) return false
  const ext = getExtension(fileName)
  return ext === '.asc'
}

export const removeExtension = (fileName : string) : string => {
  const ext = getExtension(fileName)
  return fileName.slice(0, -ext.length)
}