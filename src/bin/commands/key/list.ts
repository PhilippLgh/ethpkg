import {Command, command, metadata} from 'clime'
import fs from 'fs'
import path from 'path'
import { PackageManager } from '../../..'
import Table from 'cli-table'
import { createCLIPrinter } from '../../printUtils'


@command({
  description: 'Lists available keys',
})
export default class extends Command {
  @metadata
  public async execute(){

    const printer = createCLIPrinter()

    try {
      const pm = new PackageManager()
      const keys = await pm.listKeys()
      const attr = keys.map(k => [k.alias || '<undefined>', k.fileName])
      const table = new Table({
        head: ['alias', 'fileName']
      })
      table.push(...attr)
      console.log(table.toString())
    } catch (error) {
      printer.fail(error)
    }

  }
}