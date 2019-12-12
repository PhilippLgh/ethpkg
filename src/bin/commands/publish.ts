import path from 'path'
import fs from 'fs'
import PackageManager from '../../PackageManager/PackageManager'
import { isDirSync } from '../../util'
import { Command, command, param, Options, option } from 'clime'

@command({
  description: 'publishes a package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'path',
      description: 'path to the package',
    })
    packagePath: string
  ) {
    const packageManager = new PackageManager()
    packagePath = path.resolve(packagePath)
    if (!fs.existsSync(packagePath)) {
      throw new Error('Invalid path: '+packagePath)
    }
    if (isDirSync(packagePath)) {
      console.log('publish target is directory')
      const pkg = await packageManager.createPackage(packagePath)
      await packageManager.publishPackage(pkg, 'ipfs')
    }
    await packageManager.publishPackage(packagePath, 'ipfs')
  }
}
