import path from 'path'
import PackageManager from '../../PackageManager/PackageManager'
import { Command, command, param, Options, option } from 'clime'
import { createCLIPrinter } from '../printUtils'
import { KeyFileInfo } from '../../PackageSigner/KeyFileInfo';
import { getSelectedKeyFromUser, getPasswordFromUser, getCredentialsFromUser } from '../interactive';
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
  @option({
    flag: 'l',
    description: 'login before publish',
    default: false
  })
  login?: false;
  @option({
    flag: 'r',
    description: 'repository',
    default: undefined
  })
  repository?: '';
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

    let _repository : string | any = repository
    if (repository === 'github') {
      if (!options.repository) {
        return printer.fail('The flag -r for the repository is required with github release strategy')
      }
      const { username, password } = await getCredentialsFromUser() 
      _repository = {
        name: 'github',
        owner: username,
        project: options.repository,
        auth: password
      }
    }

    try {
      const result = await packageManager.publishPackage(packagePath, {
        repository: _repository,
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
      console.log('result', result)
    } catch (error) {
      printer.fail(error)
    }

  }
}
