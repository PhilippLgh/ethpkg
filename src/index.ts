import fs from 'fs'
import { IPackage, IPackageEntry } from './PackageManager/IPackage'

import PackageManager from './PackageManager/PackageManager'
export { PackageManager }
export default new PackageManager()

import * as util from './util'
export {util as util}

export {default as pkgsign} from './PackageSigner'
export {default as cert} from './cert'


export { IPackage as IPackage, IPackageEntry as IPackageEntry } from './PackageManager/IPackage'
