import fs from 'fs'
import { IPackage, IPackageEntry } from './PackageManager/IPackage'

import * as util from './util'
import { default as pkg } from './PackageManager/PackageManager'

export {default as pkgsign} from './PackageSigner'
export {default as cert} from './cert'
export {util as util}

export {pkg as ethpkg}

export { IPackage as IPackage, IPackageEntry as IPackageEntry } from './PackageManager/IPackage'
