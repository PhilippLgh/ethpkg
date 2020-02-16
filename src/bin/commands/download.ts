import { Command, command, param } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { createCLIPrinter } from '../printUtils'

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
    const printer = createCLIPrinter()
    printer.print(`Download package: "${spec}"`, {
      isTask: false
    })
    let pkg
    try {
      pkg = await packageManager.getPackage({
        spec,
        destPath,
        listener: printer.listener
      })
      
    } catch (error) {
      printer.fail(error)
    }
    // console.log('buffer length', packageBuf.length)
    printer.print(`File written to ${destPath}`)
  }
}
