import { Command, command, param } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import boxen from 'boxen'

@command({
  description: 'lists release info for all packages',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'specifier',
      description: 'package specifier',
      required: true,
    })
    spec: string,
    @param({
      name: 'attribute whitelist',
      description: 'comma separated list of attributes to display',
      required: false,
      default: 'fileName,version'
    })
    attr: string
  ) {
    const packageManager = new PackageManager()
    const releases = await packageManager.listPackages(spec, {
      limit: 30
    })
    const releaseList = releases.map(r => `${r.fileName} - ${r.version}`).join('\n')
    console.log(releaseList)
    // console.log(boxen(JSON.stringify(release, undefined, 2)))
  }
}
