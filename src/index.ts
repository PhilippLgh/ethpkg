import PackageManager from './PackageManager/PackageManager'
export { download } from './Downloader'
export { PackageManager }

export default new PackageManager()

export { PROCESS_STATES } from './IStateListener'
export * from './PackageManager/IPackage'
export * from './Repositories/IRepository'
export { instanceOfPackageQuery } from './Fetcher/Fetcher'
export { default as ISigner } from './PackageSigner/ISigner'
export { default as KeyStore } from './PackageSigner/KeyStore'
export { KeyFileInfo } from './PackageSigner/KeyFileInfo'
export { GetKeyOptions } from './PackageSigner/KeyStore'
export { Registry } from '@ianu/sdk'