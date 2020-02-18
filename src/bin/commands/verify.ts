import { Command, command, param, Options, option } from 'clime'
import { createCLIPrinter, printFormattedVerificationResult } from '../printUtils'
import PackageManager from '../../PackageManager/PackageManager' 

@command({
  description: 'Verifies a package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'package query',
      description: 'Path, url, or query string',
      required: true,
    })
    pkgQuery: string,
    @param({
      name: 'address',
      description: 'Ethereum address to verify against',
      required: false,
    })
    address?: string
  ) {

    const printer = createCLIPrinter()
    const packageManager = new PackageManager()

    printer.print(`Verify package: "${pkgQuery}"`, { isTask: false })
    let pkg
    try {
      pkg = await packageManager.getPackage(pkgQuery, {
        listener: printer.listener
      })
    } catch (error) {
      printer.fail(error)
    }
    if (!pkg) {
      return printer.fail(`Could not find or load package: "${pkgQuery}"`)
    }

    let verificationInfo
    try {
      verificationInfo = await packageManager.verifyPackage(pkg, {
        addressOrEnsName: address,
        listener: printer.listener
      })
    } catch (error) {
      return printer.fail(error)
    }
    if(!verificationInfo) {
      return printer.fail('Could not verify release!')
    }

    printFormattedVerificationResult(verificationInfo)
  }
}