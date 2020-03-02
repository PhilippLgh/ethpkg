import {Command, command, metadata} from 'clime'
import fs from 'fs'
import path from 'path'

@command({
  description: 'Prints the ethpkg version number',
})
export default class extends Command {
  @metadata
  public execute(){
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'))
      console.log('ethpkg Version: ', pkgJson.version)
    } catch (error) {
      console.log('Could not access version information')
    }

  }
}