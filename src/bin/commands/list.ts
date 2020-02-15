import { Command, command, param, Options, option } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import chalk from 'chalk';
import { printFormattedReleaseList } from '../utils'
import { PROCESS_STATES } from '../../IStateListener'
import ora = require('ora')

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
    try {
      let task : undefined | ora.Ora
      releases = await packageManager.listPackages(spec, {
        limit: 50,
        prefix: undefined,
        listener: (newState: string, args: any = {}) => {
          switch(newState) {
            case PROCESS_STATES.FETCHING_RELEASE_LIST_STARTED: {
              const { repo } = args
              task = ora(`Fetching releases from ${repo}`).start()
              break;
            }
            case PROCESS_STATES.FETCHING_RELEASE_LIST_FINISHED: {
              const { releases, repo } = args
              if (task !== undefined) {
                task.succeed(`Fetched ${releases.length} releases from ${repo}`)
              }
              break;
            }
            case PROCESS_STATES.FILTER_RELEASE_LIST_STARTED: {
              task = ora(`Filtering releases`).start()
              break;
            }
            case PROCESS_STATES.FILTER_RELEASE_LIST_FINISHED: {
              const { releases } = args
              if (task !== undefined) {
                task.succeed(`Filtered releases to ${releases.length}`)
              }
              break;
            }
          }
          // console.log('new state', newState, Object.keys(args))
        }
      })
    } catch (error) {
      return console.log(chalk.red(error.message))
    }
    printFormattedReleaseList(releases, attributes)
  }
}
