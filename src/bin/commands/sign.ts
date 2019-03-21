import * as fs from 'fs'
import path from 'path'

import { startTask, succeed, failed, progress } from '../task'

import { Command, command, param, Options, option } from 'clime'
import { pkgsign, util } from '../..';
import { getUserFilePath } from '../lib/InputFilepath';
import { getSingingMethod, SIGNING_METHOD, getPrivateKey, getExternalSigner } from '../lib/signFlow';
import { getPrivateKeyFromEthKeyfile, getKeyFilePath } from '../lib/EthKeystore';
import { runScriptSync } from '../../util'

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

export class SomeOptions extends Options {
  @option({
    flag: 'o',
    description: 'WARNING: will overwite package contents',
  })
  overwrite: boolean = false;
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
    options?: SomeOptions,
  ) {

    const pkgJsonPath = path.join(process.cwd(), 'package.json')
    let npmPackageFlow = false
    let pkgFileName = ''
    
    // used as script after `npm pack`
    if (!inputPath) {
      if (fs.existsSync(pkgJsonPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
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
      // TODO better default name
      const DEFAULT_KEY = 'code-sign-key.json'
      if(fs.existsSync(DEFAULT_KEY)) {
        console.log('INFO: no key file specified but default key found')
        keyFilePath = DEFAULT_KEY
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

      if (npmPackageFlow) {
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