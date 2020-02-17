import PackageManager from './PackageManager/PackageManager'
export { PackageManager }

export default new PackageManager()

export { PROCESS_STATES } from './IStateListener'
export * from './PackageManager/IPackage'
export * from './Repositories/IRepository'
export { instanceOfPackageQuery } from './Fetcher/Fetcher'
export { default as ISigner } from './PackageSigner/ISigner'
export { default as KeyStore } from './PackageSigner/KeyStore'
