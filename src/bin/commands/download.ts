import path from 'path'
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

    destPath = path.resolve(destPath)

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
      return printer.fail(error)
    }
    if(!pkg) {
      return printer.fail('Package could not be downloaded')
    }
    // console.log('buffer length', packageBuf.length)
    printer.print(`File written to ${pkg.filePath}`)
  }
}
