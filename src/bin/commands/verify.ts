import { Command, command, param, Options, option } from 'clime';
import { pkgsign } from '../..';
import { startTask, succeed, failed } from '../task'

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
    startTask('verification')
    let result = await pkgsign.verify(pkgPath, address)

    if (result.error) {
      failed(result.error.message)
      return
    }

    /*
    if(result.isValid) {
      const signerAddresses = result.signers.join(',')
      console.log(`\npackage contents passed integrity checks and are signed by ${signerAddresses}`)
    }

    if(result.isTrusted) {
      console.log('')
    }
    */

    if (result.isValid /*FIXME && result.isTrusted*/) {
      const signerAddresses = result.signers.map(s => s.address).join(',')
      succeed(`package contents passed integrity checks and are signed by [${signerAddresses}]`)
    } else {
      failed('invalid package')
      console.log('invalid package')
    }
  }
}