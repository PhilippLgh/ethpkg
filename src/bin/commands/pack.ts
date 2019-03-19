import { Command, command, param, Options, option } from 'clime'
import { util } from '../..'
import fs from 'fs'
// @ts-ignore
import keythereum from 'keythereum'

@command({
  description: 'creates a package from a directory',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'path',
      description: 'path to the directory',
      required: false,
    })
    dirPath?: string
  ) {

  }
}
