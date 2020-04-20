import path from 'path'
import fs from 'fs'
import { Command, command, param, Options, option } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import { createCLIPrinter, printFormattedPackageInfo } from '../printUtils'
import { extractVersionFromString } from '../../utils/FilenameHeuristics'
import { removeExtension } from '../../utils/FilenameUtils'
import chalk from 'chalk'

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
    inputDirPath: string,
    @param({
      name: 'package name',
      description: 'Name of the package - should include version',
      required: false,
      default: undefined
    })
    packageName?: string
  ) {

    inputDirPath = path.resolve(process.cwd(), inputDirPath)

    const pm = new PackageManager()
    const printer = createCLIPrinter()
    printer.print(`Create package from input: "${inputDirPath}" :`, {
      isTask: false,
      bold: false
    })

    const version = extractVersionFromString(packageName) || extractVersionFromString(inputDirPath)
    if(!version) {
      console.log(`${chalk.yellow('WARNING:')} packages should be versioned but a version could not be parsed from package name`)
    }

    let pkg
    try {
      if (existsInDir(inputDirPath, ['.npmignore', 'package.json'])) {
        return console.log('Packing npm modules is not yet supported')
      }
      pkg = await pm.createPackage(inputDirPath, {
        compressed: true,
        fileName: packageName,
        listener: printer.listener
      })
      try {
        // try to set metadata for nicer output
        pkg.metadata = {
          name: removeExtension(pkg.fileName),
          fileName: pkg.fileName,
          version
        }
      } catch (error) {
        
      }
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
