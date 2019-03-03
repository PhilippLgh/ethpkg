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
      required: true,
    })
    address: string
  ) {
    startTask('verification')
    let result = await pkgsign.verify(pkgPath, address)
    if (result) {
      succeed('package contents passed integrity checks and are signed by '+ address)
    } else {
      failed('invalid package')
      console.log('invalid package')
    }
  }
}