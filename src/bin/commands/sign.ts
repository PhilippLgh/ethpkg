import * as fs from 'fs'
import path from 'path'

import { startTask, succeed, failed, progress } from '../task'

import { Command, command, param, Options, option } from 'clime'
import { prompt } from 'enquirer'

import { pkgsign, util } from '../..';
import { getUserFilePath } from '../lib/InputFilepath';
import { getSingingMethod, SIGNING_METHOD, getPrivateKey, getExternalSigner } from '../lib/signFlow';
import { getPrivateKeyFromEthKeyfile, getKeyFilePath, questionKeySelect, listKeys } from '../lib/EthKeystore';
import { runScriptSync, getKeystorePath } from '../../util'

const signFile = async (inputFilePath : string, privateKey : Buffer, inplace = false) => {
  startTask('Signing file')
  const pkg = await pkgsign.sign(inputFilePath, privateKey)
  if(pkg) {
    const buildOutpath = (pkgPath : string) => {
      let ext = path.extname(pkgPath)
      const basename = path.basename(pkgPath, ext)
      // ext = '.epk'
      const dirname = path.dirname(pkgPath)
      const pkgPathOut = `${dirname}/${basename}_signed${ext}`
      return pkgPathOut
    }
    const outPath = inplace ? inputFilePath : buildOutpath(inputFilePath)
    await pkg.writePackage(outPath)
    succeed(`Signed package written to "${outPath}"`)
  } else {
    failed(`Package could not be signed`)
  }
}

export const startSignFlow = async (inputPath: string, keyFilePath? : string) => {

  const selectedSigningMethod = await getSingingMethod(inputPath)
  switch (selectedSigningMethod) {
    case SIGNING_METHOD.PRIVATE_KEY: {
      const { privateKey } = await getPrivateKey()
      if (!privateKey) {
        console.log('>> private key not valid or not able to parse')
        return
      }
      await signFile(inputPath, privateKey)
      break;
    }
    case SIGNING_METHOD.EXTERNAL_SIGNER: {
      const externalSigner = await getExternalSigner()
      console.log('selected external signer is', externalSigner)
      break;
    }
  }
}

export class SignOptions extends Options {
  @option({
    flag: 'o',
    description: 'WARNING: will overwite package contents',
  })
  overwrite: boolean = false;
  @option({
    flag: 'p',
    description: 'will trigger npm publish if a signed tarball is found',
  })
  publish: boolean = false;
}

@command({
  description: 'sign a package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'zip | tarball',
      description: 'path to zip or tarball',
      required: false,
    })
    inputPath?: string,
    @param({
      name: 'key file',
      description: 'path to key file',
      required: false,
    })
    keyFilePath?: string,
    options?: SignOptions,
  ) {

    const pkgJsonPath = path.join(process.cwd(), 'package.json')
    let npmPackageFlow = false
    let pkgFileName = ''

    let pkgJson = null 

    // used as script after `npm pack`
    if (!inputPath) {
      if (fs.existsSync(pkgJsonPath)) {
        pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        let {name: pkgName, version: pkgVersion} = pkgJson
        pkgName = pkgName.replace('@', '')
        pkgName = pkgName.replace('/', '-')
        pkgFileName = `${pkgName}-${pkgVersion}.tgz`
        if(fs.existsSync(pkgFileName)) {
          console.log('INFO: no input file specified but npm package found')
          inputPath = pkgFileName
          npmPackageFlow = true
        }
      }
    }

    if (!inputPath) {
      inputPath = await getUserFilePath('Which zip / tar file do you want to sign?')
    }
    if (!inputPath) {
      console.log('>> input path was not provided')
      return
    }
    if(!path.isAbsolute(inputPath)) {
      inputPath = path.join(process.cwd(), inputPath)
      if(!fs.existsSync(inputPath)) {
        console.log('>> package not found')
        return
      }
    }

    if (!keyFilePath && npmPackageFlow) {
      let projectName = pkgJson && pkgJson.name
      projectName = projectName.replace('@', '')
      projectName = projectName.replace('/', '-')

      let keyfiles = listKeys()
      keyfiles = keyfiles.filter(k => k.file.includes(projectName))

      if (keyfiles.length > 1) {
        // ambiguous keys:
        let { selectedKey } = await prompt(questionKeySelect(keyfiles))
        keyFilePath = selectedKey.keyFile
      } else if (keyfiles.length === 1) {
        keyFilePath = keyfiles[0].filePathFull
        console.log('>> keyfile for project auto-detected: '+keyFilePath)
      } else {
        console.log('>> keyfile could not be auto-detected')
        // ignore ?
      }
    }

    let inplace = options && options.overwrite
    if (npmPackageFlow) {
      inplace = true
    }

    if (keyFilePath) {
      const privateKey = await getPrivateKeyFromEthKeyfile(keyFilePath)
      if (!privateKey) {
        console.log('>> private key not valid or not able to parse')
        return
      }
      const res = await signFile(inputPath, privateKey, inplace)

      if (npmPackageFlow && (options && options.publish === true)) {
        try {
          runScriptSync('npm publish', [pkgFileName])
        } catch (error) {
          console.error(error)
        }
        fs.unlinkSync(pkgFileName)
      }

      return res
    }

    await startSignFlow(inputPath, keyFilePath)


  }
}