import { Command, command, param, Options, option } from 'clime';
import { pkgsign } from '../..';

import chalk from 'chalk'
import ora from 'ora'

const spinner = ora({
  spinner: {
    "interval": 100,
    "frames": [
      "▓",
      "▒",
      "░"
    ]
  }
})

const startTask = (name: string) => {
  spinner.start()
  spinner.text = chalk.white.bgBlack.bold(' ' + name + '  ')
  // @ts-ignore
  spinner.t_org = name
}

const succeed = (msg?: string) => {
  // @ts-ignore
  let t = chalk.green.bold(spinner.t_org)
  spinner.succeed(t)
  if (msg) {
    console.log(chalk.green(msg))
  }
}

const failed = (msg: string) => {
  // @ts-ignore
  let t = chalk.white.bgRed.bold(spinner.t_org + ' FAILED: ' + (msg || ''))
  spinner.fail(t)
  process.exit()
}

@command({
  description: 'verify a zip or tarball package',
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