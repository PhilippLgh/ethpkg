import { Command, command, param } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { createCLIPrinter, printFormattedPackageInfo } from '../printUtils'

@command({
  description: 'Lists all files in the specified package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'query',
      description: 'package query',
      required: true,
    })
    spec: string
  ) {
    const packageManager = new PackageManager()

    let pkg
    const printer = createCLIPrinter()
    try {
      pkg = await packageManager.getPackage({
        spec,
        listener: printer.listener
      })
    } catch (error) {
      return printer.fail(error)
    } 
    if(!pkg) {
      return printer.fail('Could not fetch package')
    }
    await printFormattedPackageInfo(pkg)
  }
}
