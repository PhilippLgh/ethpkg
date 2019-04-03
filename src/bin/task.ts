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

export const startTask = (name: string) => {
  spinner.start()
  spinner.text = chalk.white.bgBlack.bold(' ' + name + '  ')
  // @ts-ignore
  spinner.t_org = name
}

export const succeed = (msg?: string) => {
  // @ts-ignore
  let t = chalk.bold(msg || spinner.t_org)
  spinner.succeed(t)
  if (msg) {
    // console.log(`${chalk.green('✔')} ${chalk.bold(msg)}`)
  }
}

export const progress = (msg : string) => {
  console.log(`${chalk.green('✔')} ${chalk.bold(msg)}`)
}

export const failed = (msg: string, msgText?: string) => {
  let task = ''
  if (msgText) {
    task = msg
    msg = msgText
  }
  // @ts-ignore
  let t = chalk.white.bgRed.bold((spinner.t_org || task) + ' FAILED: ' + (msg || ''))
  spinner.fail(t)
  process.exit()
}