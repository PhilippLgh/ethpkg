import fs from 'fs'
import path from 'path'
import { Command, command, param, Options, option } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { getExtension } from '../../utils/FilenameUtils'
import { createCLIPrinter } from '../printUtils'
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
  })
  overwrite: boolean = false;
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
    @param({
      name: 'alias',
      description: 'key alias or address',
      required: false,
      default: undefined
    })
    keyAlias?: string,
    // options?: SignOptions,
  ) {

    /*
    TODO interactive mode
    inputPath = await getUserFilePath('Which package (zip, tar) file do you want to sign?', inputPath)
    if (!inputPath || ) {
      console.log(`>> File not found or invalid: "${inputPath}"`)
      return
    }
    */
    inputPath = path.resolve(inputPath)

    const packageManager = new PackageManager()
    const printer = createCLIPrinter()

    let pkg
    try {
      pkg = await packageManager.getPackage(inputPath, {
        listener: printer.listener
      })
      if (!pkg) {
        return printer.fail(`Package not found: "${inputPath}"`)
      }

      const privateKey = await packageManager.getSigningKey({
        alias: keyAlias,
        listener: printer.listener,
        password: async () => {
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
      const { signers } = verificationInfo
      const signature = signers[0]
      const { exp } = signature
      if (typeof exp === 'number') {
        printer.print(`Signature Expires ${new Date(exp * 1000)}`, {
          isTask: false
        })
      }

    } catch (error) {
      return printer.fail(error)
    }
    if(!pkg) {
      return printer.fail('Something went wrong')
    }

    let outPath = ''
    try {
      outPath = buildOutputPathSigned(inputPath)
      await pkg.writePackage(outPath)
    } catch (error) {
      return printer.fail(error)
    }

    printer.print(`Success! Package signed and written to ${outPath}`)

  }
}