import { Command, command, param } from 'clime'
import PackageManager from '../../PackageManager/PackageManager'
import boxen from 'boxen'
import { startTask, succeed, failed, startNewTask, FormatCallback } from '../task';
import { formatBytes } from '../../util';
import chalk from 'chalk';
import { PROCESS_STATES } from '../../IStateListener';

@command({
  description: 'lists all files in the specified package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'specifier',
      description: 'package specifier',
      required: true,
    })
    spec: string
  ) {
    const packageManager = new PackageManager()

    let resolveTask : any = undefined
    let fetchTask : any = undefined

    const listener = (newState: string, args: any) => {
      if (newState === PROCESS_STATES.RESOLVE_PACKAGE_STARTED) {
        resolveTask = startNewTask('[1/2] Resolving package...')
      } 
      else if (newState === PROCESS_STATES.RESOLVE_PACKAGE_FINISHED) {
        resolveTask.succeed()
      }
      else if (newState === PROCESS_STATES.DOWNLOAD_STARTED) {
        fetchTask = startNewTask('[2/2] Fetching package...')
      }
      else if (newState === PROCESS_STATES.DOWNLOAD_PROGRESS) {
        const { progress } = args
        if (fetchTask) {
          fetchTask.updateText(chalk.green(`[2/2] Fetching package... ${progress}%`))
        }
      }
      else if (newState === PROCESS_STATES.DOWNLOAD_FINISHED) {
        const { size } = args
        let cb : FormatCallback = ({ taskName, timeMs }) => `${taskName}\t\t || Time: ${timeMs} ms || Size: ${formatBytes(size)} || Speed: ${ ((size / 1024) / (timeMs / 1000)).toFixed(2) } KB/s`
        fetchTask.succeed(cb)
      }
    }
    const pkg = await packageManager.getPackage({
      spec,
      listener
    })
    if (!pkg) {
      return // TODO failed('Package not found')
    }
    const entries = await pkg.getEntries()
    const files = entries.filter(e => !e.file.isDir)
    const paths = files.map(e => `${e.relativePath} - ${formatBytes(e.file.size) || 'NaN'}`).join('\n')
    console.log(`Package contents for: ${pkg.fileName}`)
    const verificationInfo = await packageManager.verifyPackage(pkg)
    const signatureInfo = boxen(`${JSON.stringify(verificationInfo, undefined, 2)}`, {
      borderColor: 'cyanBright' // TODO color based on signature status: green, yellow, red
    })
    console.log(`${chalk.bold('Signature info:')}\n${signatureInfo}\n${chalk.bold(`Files (${files.length}):`)}\n${paths}`)
  }
}
