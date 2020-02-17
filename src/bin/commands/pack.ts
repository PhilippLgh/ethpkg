import path from 'path'
import fs from 'fs'
import { Command, command, param, Options, option } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { createCLIPrinter, printFormattedPackageInfo } from '../printUtils'

const existsInDir = (dirPath: string, fileNames: Array<string>) => {
  const fullPaths = fileNames.map(f => path.join(dirPath, f))
  return fullPaths.some(p => fs.existsSync(p))
}

@command({
  description: 'Creates a package from a directory',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'path',
      description: 'Path to the directory',
      required: false,
      default: '.'
    })
    inputDirPath: string
  ) {

    inputDirPath = path.resolve(process.cwd(), inputDirPath)

    const pm = new PackageManager()
    const printer = createCLIPrinter()
    printer.print(`Create package from input: "${inputDirPath}" :`, {
      isTask: false,
      bold: false
    })
    let pkg
    try {
      if (existsInDir(inputDirPath, ['.npmignore', 'package.json'])) {
        return console.log('Packing npm modules is not yet supported')
      }
      pkg = await pm.createPackage(inputDirPath, {
        compressed: true,
        listener: printer.listener
      })
    } catch (error) {
      return printer.fail(error)
    }
    if(!pkg) {
      return printer.fail('Package could not be created')
    }
    await printFormattedPackageInfo(pkg)

    try {
      const filePath = path.join(inputDirPath, '..', pkg.fileName)
      await pkg.writePackage(filePath)
      printer.print(`Package written to: ${filePath}`)
    } catch (error) {
      return printer.fail('Could not write package: '+error.message)
    }
  }
}
