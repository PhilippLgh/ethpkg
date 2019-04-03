import { Command, command, param, Options, option } from 'clime'
import { prompt } from 'enquirer'

import fs from 'fs'
import path from 'path'
// @ts-ignore
import keythereum from 'keythereum'
import { getKeystorePath } from '../../../util';
import { failed, succeed } from '../../task';


/**
 * Generate filename for a keystore file.
 * @param {string} address Ethereum address.
 * @return {string} Keystore filename.
 */
const generateKeystoreFilename = (project : string, address : string) => {
  var filename = `ethpkg--UTC--${new Date().toISOString()}--${project}--${address}`
  // Windows does not permit ":" in filenames, replace all with "-"
  if (process.platform === "win32") filename = filename.split(":").join("-");
  return filename;
}

let task = 'Generate new key'

const getProjectNameFromPackageJson = () => {
  const pkgJsonPath = path.join(process.cwd(), 'package.json')
  if (fs.existsSync(pkgJsonPath)) {
    try {          
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      let {name, version} = pkgJson
      name = name.replace('@', '')
      name = name.replace('/', '-')
      return `${name}-${version}`        
    } catch (error) {
      failed(task, 'project.json could not be parsed')
    }
  } else {
    failed(task, 'project.json not found and no project identifier provided')
  }
}

export class KeyOptions extends Options {
  @option({
    flag: 'p',
    description: 'project name',
  })
  projectName?: string = '';
}

@command({
  description: 'create a new key for signing',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'out',
      description: 'output path for keyfile',
      required: false,
    })
    outPath?: string,
    options?: KeyOptions,
  ) {  

    const keystorePath = getKeystorePath()
    try {      
      if (!fs.existsSync(keystorePath)) {
        fs.mkdirSync(keystorePath)
      }
    } catch (error) {
      failed(task, 'could not find or create keystore: '+ keystorePath)
      return console.log('err',  error)
    }

    // fail fast: this block should be executed before password is asked for
    let projectName = options && options.projectName
    if(!outPath) {
      if (!projectName) {
        projectName = getProjectNameFromPackageJson()
      }
      // FIXME should ask / double check path in this case
      if(!projectName) {
        return failed(task, 'project.json not found and no project identifier provided')
      }
    }

    const questionKeyPassword = {
      type: 'password',
      name: 'password',
      message: `Enter password to encrypt key`
    };
    const { password } = await prompt(questionKeyPassword)
    if (!password) {
      return failed(task, 'password empty or invalid')
    }

    const dk = keythereum.create()
    const keyObject = keythereum.dump(password, dk.privateKey, dk.salt, dk.iv)
    keyObject.usage = `ethpkg-${projectName}`
    keyObject.version = ('ethpkg-'+keyObject.version)

    if(!outPath) {
      // @ts-ignore
      const keyFileName = generateKeystoreFilename(projectName, keyObject.address)
      outPath = path.join(keystorePath, keyFileName)
    }

    if (!path.isAbsolute(outPath)){
      outPath = path.join(__dirname, outPath)
    }
    
    if (!outPath.endsWith('.json')) {
      outPath += '.json'
    }

    try {
      const result = fs.writeFileSync(outPath, JSON.stringify(keyObject, null, 2))
      succeed('Keyfile generated at '+outPath)
    } catch (error) {
      failed(task, 'Could not write keyfile to '+outPath)
    }
  }
}
