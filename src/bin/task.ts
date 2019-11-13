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
  return {
    taskName: name,
    updateText: (text : string) => spinner.text = text,
    succeed: (text?: string) => spinner.succeed(chalk.bold(text || name))
  }
}

export interface FormatOptions {
  taskName: string,
  timeMs : number
}
export type FormatCallback = (info : FormatOptions) => string

export const startNewTask = (name: string) => {
  let _spinner = ora({
    spinner: {
      "interval": 100,
      "frames": [
        "▓",
        "▒",
        "░"
      ]
    }
  })
  _spinner.start()
  _spinner.text = chalk.white.bgBlack.bold(' ' + name + '  ')
  const start = new Date().getTime()
  let stop = new Date().getTime()
  const time = () => (stop - start) 
  return {
    taskName: name,
    updateText: (text : string) => _spinner.text = text,
    succeed: (text?: string | FormatCallback) => {
      stop = new Date().getTime()
      if (typeof text === 'function') {
        text = text({ taskName: name, timeMs: time() })
      }
      _spinner.succeed(chalk.bold(text || `${name}\t\t || Time: ${time()} ms ||`))
    },
    time
  }
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