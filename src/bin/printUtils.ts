import { PROCESS_STATES } from '../IStateListener'
import chalk from 'chalk'
import Table from 'cli-table'
import boxen from 'boxen'

import { IRelease } from '../Repositories/IRepository'
import { IPackage, IPackageEntry } from '../PackageManager/IPackage'
import { startNewTask, FormatCallback } from './task'
import { formatBytes } from '../util'
import { recursiveSearch } from './utils'
import { format } from 'path'

/**
 * Takes a list of IRelease objects and prints them as a table
 * with property values as columns for each property key specified by attributes
 * @param releases 
 * @param attributes comma separated list of property keys
 */
export const printFormattedReleaseList = (releases: Array<IRelease>, attributes: string = 'fileName,version,updated_at') => {
  const attributeList : string[] = attributes.split(',')
  const releaseList = releases.map(release => {
    // only include white-listed attributes in output
    // also respect attribute order
    const output : any[] = []
    for (const att of attributeList) {
      if (att in release) {
        // @ts-ignore
        const val = release[att]
        // cli-table has issues with undefined.toString()
        output.push(val === undefined ? '' : val)
      } else {
        const { val, path } = recursiveSearch(release, att)
        output.push(val === undefined ? '' : val)
      }
    }
    return output
  })
  let table = new Table({
    head: attributeList
  })
  table.push(...releaseList)
  console.log(table.toString())
}

export const printFormattedRelease = (release?: IRelease) => {
  console.log(boxen(JSON.stringify(release, undefined, 2)))
}


export const printFormattedPackageContents = async (pkg: IPackage) => {
  const entries = await pkg.getEntries()
  const printEntries = entries.slice(0, 30)
  console.log(`Files ${entries.length}:`)

  const lengthLongestPath = printEntries.reduce((prev: IPackageEntry, cur: IPackageEntry) => prev.relativePath.length > cur.relativePath.length ? prev : cur).relativePath.length
  console.log(printEntries.map(e => `- ${e.relativePath} ${' '.repeat(lengthLongestPath - e.relativePath.length)} ${formatBytes(e.file.size) || 'NaN'}`).join('\n'))
  if (entries.length > 30) {
    console.log(entries.length - printEntries.length, 'More files')
  }
}

export const printFormattedPackageInfo = async (pkg?: IPackage) => {
  if (!pkg) {
    return console.log('Cannot inspect invalid package')
  }
  await printFormattedPackageContents(pkg)
  /*
  const verificationInfo = await packageManager.verifyPackage(pkg)
  const signatureInfo = boxen(`${JSON.stringify(verificationInfo, undefined, 2)}`, {
    borderColor: 'cyanBright' // TODO color based on signature status: green, yellow, red
  })
  console.log(`${chalk.bold('Signature info:')}\n${signatureInfo}\n${chalk.bold(`Files (${files.length}):`)}\n${paths}`)
  */
}

const startTask = (name: string) => {
  return startNewTask(name)
}

export const PROCESSES = {
  FETCHING_RELEASE_LIST: {},
  FILTER_RELEASE_LIST: {}
}

export const createCLIPrinter = (processStates: Array<any> = []) => {
  let task : any
  const listener =  (newState: string, args: any = {}) => {
    // return console.log('new state', newState, Object.keys(args))
    switch(newState) {
      case PROCESS_STATES.FETCHING_RELEASE_LIST_STARTED: {
        const { repo } = args
        task = startTask(`Fetching releases from ${repo}`)
        break;
      }
      case PROCESS_STATES.FETCHING_RELEASE_LIST_FINISHED: {
        const { releases, repo } = args
        if (task) {
          task.succeed(`Fetched ${releases.length} releases from ${repo}`)
        }
        break;
      }
      case PROCESS_STATES.FILTER_RELEASE_LIST_STARTED: {
        task = startTask(`Filtering releases`)
        break;
      }
      case PROCESS_STATES.FILTER_RELEASE_LIST_FINISHED: {
        const { releases } = args
        if (task) {
          task.succeed(`Filtered releases to ${releases.length}`)
        }
        break;
      }
      case PROCESS_STATES.RESOLVE_PACKAGE_STARTED: {
        // FIXME wraps multiple
        // task = startTask('[1/2] Resolving package...')
        break;
      } 
      case PROCESS_STATES.RESOLVE_PACKAGE_FINISHED: {
        const { release } = args
        startTask(`Resolving Package`).succeed(`Package query resolved to: `)
        // TODO await?
        printFormattedRelease(release)
        break;
      }
      case PROCESS_STATES.DOWNLOAD_STARTED: {
        task = startTask('Downloading package...')
        break;
      }
      case PROCESS_STATES.DOWNLOAD_PROGRESS: {
        const { progress, size } = args
        if (task) {
          task.updateText(chalk.greenBright(`Downloading package... ${progress}% \t|| ${formatBytes(progress / 100 *  size)} / ${formatBytes(size)} ||`))
        }
        break;
      }
      case PROCESS_STATES.DOWNLOAD_FINISHED: {
        const { size } = args
        let cb : FormatCallback = ({ taskName, timeMs }) => `${taskName}\t\t || Time: ${timeMs} ms || Size: ${formatBytes(size)} || Speed: ${ ((size / 1024) / (timeMs / 1000)).toFixed(2) } KB/s ||`
        task.succeed(cb)
        break;
      }
      case PROCESS_STATES.CREATE_PACKAGE_STARTED: {
        task = startTask('Creating package')
        break;
      }
      case PROCESS_STATES.CREATE_PACKAGE_PROGRESS: {
        const { file } = args
        if (task) {
          task.updateText(`Packing file: "${file}" ...`)
        }
        break;
      }
      case PROCESS_STATES.CREATE_PACKAGE_FINISHED: {
        const { pkg } = args
        task.succeed(`Package created ${pkg.fileName}`)
        break;
      }
    }
  }
  return {
    listener,
    print: (text: string, {isTask = true, bold = true} = {}) => {
      if (isTask) {
        startNewTask(text).succeed(text)
      } else {
        console.log(bold ? chalk.bold(text) : text)
      }
    },
    fail: (error: Error | string) => {
      if (task) {
        task.fail(typeof error === 'string' ? error : error.message)
      }
    }
  }
}

export const createResolvePrinter = () => {}

export const printError = (error: Error) => {
  console.log(chalk.red(error.message))
}
