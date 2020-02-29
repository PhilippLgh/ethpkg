import path from 'path'
import PackageManager from '../../PackageManager/PackageManager'
import { Command, command, param, Options, option } from 'clime'
import { createCLIPrinter } from '../printUtils'
import { KeyFileInfo } from '../../PackageSigner/KeyFileInfo';
import { getSelectedKeyFromUser, getPasswordFromUser } from '../interactive';
import { isSigned } from '../../PackageSigner';

export class PublishOptions extends Options {
  @option({
    flag: 's',
    description: 'signing package before publishing it',
    default: undefined
  })
  sign?: boolean = undefined;
  @option({
    flag: 'k',
    description: 'signing key alias or address',
    default: undefined
  })
  key?: string;
}

@command({
  description: 'Publishes a package',
})
export default class extends Command {
  public async execute(
    @param({
      description: 'path to the package',
      name: 'package path',
      required: true
    })
    packagePath: string,
    @param({
      description: 'where to publish the package',
      name: 'repository name',
      required: false,
      default: 'ipfs'
    })
    repository: string,
    options: PublishOptions,
  ) {

    const { key, sign: signPackage } = options

    const packageManager = new PackageManager()
    const printer = createCLIPrinter()

    packagePath = path.resolve(packagePath)

    printer.print(`Publishing package "${packagePath}" to hoster "${repository}"`, { isTask: false })
    if (key) {
      printer.print(`Sign package using key "${key}"`, { isTask: false })
    }

    let pkg 
    try {
      pkg = await packageManager.publishPackage(packagePath, {
        repository,
        listener: printer.listener,
        signPackage: signPackage,
        keyInfo: {
          alias: key,
          password: async () => {
            const password = await getPasswordFromUser()
            return password
          },
          selectKeyCallback: async (keys: Array<KeyFileInfo>) => {
            const result = await getSelectedKeyFromUser(keys) as KeyFileInfo
            return result
          }
        }
      })
    } catch (error) {
      printer.fail(error)
    }

  }
}
