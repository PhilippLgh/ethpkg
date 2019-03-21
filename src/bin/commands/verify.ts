import fs from 'fs'
import path from 'path'
import { Command, command, param, Options, option } from 'clime'
import { pkgsign } from '../..'
import { startTask, succeed, failed } from '../task'
import { downloadNpmPackage } from '../../util'
import { pathToFileURL } from 'url';
import { IVerificationResult } from '../../IVerificationResult';

const formatPrintResult = (result : IVerificationResult) => {
  if (result.error) {
    failed(result.error.message)
    return
  }

  if(!result.isTrusted) {
    console.log('\nWARNING: this key is not certified with a trusted signature!')
    console.log('There is no indication that the signature belongs to the package owner')
  }

  if (result.isValid /*FIXME && result.isTrusted*/) {
    const signerAddresses = result.signers.map(s => s.address).join(',')
    succeed(`package contents passed integrity checks and are signed by [${signerAddresses}]`)
  } else {
    failed('invalid package')
  }
} 

@command({
  description: 'verify a package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'zip | tarball',
      description: 'path to zip or tarball',
      required: true,
    })
    pkgPath: string,
    @param({
      name: 'address',
      description: 'Ethereum address',
      required: false,
    })
    address?: string
  ) {

    const isNPM = pkgPath && !fs.existsSync(pkgPath) && !fs.existsSync(path.join(process.cwd(), pkgPath))

    if (isNPM) {
      startTask('npm download')
      let tempPkgPath = await downloadNpmPackage(pkgPath)
      if(tempPkgPath) {
        succeed(`npm package downloaded to ${tempPkgPath}`)
      } else {
        return failed(`npm package could not be retrieved`)
      }
      startTask('npm package verification')
      const result = await pkgsign.verify(tempPkgPath, address)
      return formatPrintResult(result)
    }

    if (!fs.existsSync(pkgPath)) {
      // try to expand path
      pkgPath = path.join(process.cwd(), pkgPath)
    }

    if (!fs.existsSync(pkgPath)) {
      console.log('>> package could not be found at location: '+pkgPath)
    }

    startTask('verification')
    const result = await pkgsign.verify(pkgPath, address)
    return formatPrintResult(result)
    
  }
}