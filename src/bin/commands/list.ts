import { Command, command, param, Options, option } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { printError, printFormattedReleaseList, createCLIPrinter, PROCESSES } from '../printUtils'

export class ListOptions extends Options {
  @option({
    flag: 'a',
    description: 'comma separated list of attributes to display',
    default: 'fileName,version,updated_at'
  })
  attributes: string = 'fileName,version';
}

@command({
  description: 'Lists the release info for all packages',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'query',
      description: 'package query',
      required: true,
    })
    spec: string,
    options: ListOptions
  ) {
    const { attributes } = options
    // console.log('attributes', attributes)
    const packageManager = new PackageManager()
    let releases = []
    const printer = createCLIPrinter([PROCESSES.FETCHING_RELEASE_LIST, PROCESSES.FILTER_RELEASE_LIST])
    try {
      releases = await packageManager.listPackages(spec, {
        limit: 50,
        prefix: undefined,
        listener: printer.listener
      })
    } catch (error) {
      return printer.fail(error)
    }
    printFormattedReleaseList(releases, attributes)
  }
}
