import {Command, command, param, Options, option, metadata} from 'clime'
import fs from 'fs'
import path from 'path'

@command({
  description: 'print the version number',
})
export default class extends Command {
  @metadata
  public execute(){
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'))
      console.log('Eth PKG Version: ', pkgJson.version)
    } catch (error) {
      console.log('could not access version information')
    }

  }
}