import { Command, command, param } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import boxen from 'boxen'

@command({
  description: 'finds a package and display release info',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'specifier',
      description: 'package specifier',
      required: true,
    })
    spec: string
  ) {
    const packageManager = new PackageManager()
    const release = await packageManager.findPackage(spec)
    console.log(boxen(JSON.stringify(release, undefined, 2)))
  }
}
