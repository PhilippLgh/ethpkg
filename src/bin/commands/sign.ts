import fs from 'fs'
import path from 'path'
import { Command, command, param, Options, option } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { getExtension } from '../../utils/FilenameUtils'
import { createCLIPrinter, printFormattedVerificationResult } from '../printUtils'
import { KeyFileInfo } from '../../PackageSigner/KeyFileInfo'
import { getSelectedKeyFromUser, getPasswordFromUser } from '../interactive'

const buildOutputPathSigned = (pkgPath : string) => {
  let ext = getExtension(pkgPath)
  const basename = path.basename(pkgPath, ext)
  // ext = '.epk'
  const dirname = path.dirname(pkgPath)
  const pkgPathOut = `${dirname}/${basename}_signed${ext}`
  return pkgPathOut
}

export class SignOptions extends Options {
  @option({
    flag: 'o',
    description: 'WARNING: will overwite package contents',
    default: false
  })
  overwrite: boolean = false;
  @option({
    flag: 'a',
    description: 'alias name for key',
    default: 'ethpkg'
  })
  alias: string = 'ethpkg';
  @option({
    flag: 'p',
    description: 'WARNING: use interactive mode: password for key',
    required: false
  })
  password?: string = undefined;
  @option({
    flag: 'i',
    description: 'inplace will overwite the package with the signed version',
    required: false
  })
  inplace?: boolean = undefined;
  /*
  @option({
    flag: 'a',
    description: 'tries to auto-detect correct key for project',
  })
  autodetectkey: boolean = false;
  @option({
    flag: 'p',
    description: 'will trigger npm publish if a signed tarball is found',
  })
  publish: boolean = false;
  @option({
    flag: 'c',
    description: 'creates a key',
  })
  createKey: boolean = false;
  */
}

@command({
  description: 'Signs a package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'zip | tarball',
      description: 'path to zip or tarball',
      required: true,
    })
    inputPath: string,
    options: SignOptions,
  ) {

    const printer = createCLIPrinter()

    /*
    TODO interactive mode
    inputPath = await getUserFilePath('Which package (zip, tar) file do you want to sign?', inputPath)
    if (!inputPath || ) {
      console.log(`>> File not found or invalid: "${inputPath}"`)
      return
    }
    */
    inputPath = path.resolve(inputPath)

    let outPath = options.inplace ? inputPath : buildOutputPathSigned(inputPath)
    let shouldOverwite = options.inplace || options.overwrite
    if (fs.existsSync(outPath) && !shouldOverwite) {
      return printer.fail('Package exists already! Use "overwrite" option')
    }

    const packageManager = new PackageManager()

    let pkg
    try {
      pkg = await packageManager.getPackage(inputPath, {
        listener: printer.listener
      })
      if (!pkg) {
        return printer.fail(`Package not found: "${inputPath}"`)
      }

      const privateKey = await packageManager.getSigningKey({
        alias: options.alias,
        listener: printer.listener,
        password: async () => {
          if (options.password) {
            return options.password
          }
          const password = await getPasswordFromUser()
          return password
        },
        selectKeyCallback: async (keys: Array<KeyFileInfo>) => {
          const result = await getSelectedKeyFromUser(keys) as KeyFileInfo
          return result
        } 
      })
      if (!privateKey) {
        return printer.fail('Could not retrieve private key to sign package')
      }

      pkg = await packageManager.signPackage(pkg, privateKey, {
        listener: printer.listener
      })

      const verificationInfo = await packageManager.verifyPackage(pkg)
      await printFormattedVerificationResult(verificationInfo)

    } catch (error) {
      return printer.fail(error)
    }
    if(!pkg) {
      return printer.fail('Something went wrong')
    }

    try {
      await pkg.writePackage(outPath, {
        overwrite: shouldOverwite
      })
    } catch (error) {
      return printer.fail(error)
    }

    printer.print(`Success! Package signed and written to ${outPath}`)
  }
}