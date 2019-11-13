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
    spec: string,
    @param({
      name: 'destPath',
      description: 'destination path',
      required: false,
    })
    destPath: string
  ) {
    const packageManager = new PackageManager()
    const packagePath = await packageManager.downloadPackage(spec)
    // console.log('buffer length', packageBuf.length)
    console.log('done.')
  }
}
