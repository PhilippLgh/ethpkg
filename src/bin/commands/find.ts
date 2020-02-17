import { Command, command, param } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { printFormattedRelease, createCLIPrinter } from '../printUtils'

@command({
  description: 'Finds a package and displays its release info',
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
    let release
    const printer = createCLIPrinter()
    try {
      release = await packageManager.resolve(spec, {
        listener: printer.listener
      })
    } catch (error) {
      return printer.fail(error)
    }
    printFormattedRelease(release)
  }
}
