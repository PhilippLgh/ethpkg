import * as fs from 'fs'
import path from 'path'
import os from 'os'

import { startTask, succeed, failed } from '../task'

import { Command, command, param, Options, option } from 'clime'
import { prompt } from 'enquirer'
import { pkgsign } from '../..';
const keythereum = require('keythereum')

const getDefaultDataDir = () => {
  switch (process.platform) {
    case 'win32': return '%APPDATA%/Ethereum'
    case 'linux': return '~/.ethereum'
    case 'darwin': return '~/Library/Ethereum'
    default: return '~/.ethereum'
  }
}

const listKeys = () => {
  const dataDir = getDefaultDataDir().replace('~', os.homedir())
  const keystore = path.join(dataDir, 'keystore')
  // TODO we could filter keys here for e.g. a prefix like 'codesign' to avoid misuse
  const keyFiles = fs.readdirSync(keystore).map(f => {
    return {
      address: '0x' + f.split('--').pop(),
      'file': f,
      'filePathFull': path.join(keystore, f)
    }
  })
  return keyFiles
}

const questionKeySelect = (keys: any) => [{
  type: 'select',
  name: 'selectedKey',
  message: `Which key do you want to use?`,
  initial: 0,
  choices: keys.map((k: any) => ({ name: k.address, message: `${k.address} ("${k.file}")`, keyFile: k.filePathFull, file: k.file })),
  result(value: string): any {
    return this.choices.find((choice: any) => choice.name === value)
  }
}];

const questionInputFile = [{
  type: 'input',
  name: 'method',
  message: 'Which zip / tar file do you want to sign?',
  initial: 1
}];

const SIGNING_METHOD: { [index: string]: string } = {
  'PRIVATE_KEY': 'Local Private Key',
  'EXTERNAL_SIGNER': 'External Signer'
}

const questionSigningMethod = (fileName: string) => [{
  type: 'select',
  name: 'method',
  message: `How do you want to sign "${fileName}"?`,
  initial: 0,
  choices: [
    { name: SIGNING_METHOD.PRIVATE_KEY, message: 'Private Key', value: 'pk' },
    { name: SIGNING_METHOD.EXTERNAL_SIGNER, message: 'External Signer', value: 'signer' }
  ]
}];

const KEY_STORAGE: { [index: string]: string } = {
  'ETH': 'Ethereum Keystore',
  'PEM': 'PEM File'
}

const questionKeyStorage = [{
  type: 'select',
  name: 'storage',
  message: 'How is the private key stored?',
  initial: 0,
  choices: [
    { name: `${KEY_STORAGE.ETH}`, message: 'Geth Keystore' },
    { name: `${KEY_STORAGE.PEM}`, message: 'PEM file' }
  ]
}];

const questionSigner = [{
  type: 'select',
  name: 'format',
  message: 'Which external signer is used?',
  initial: 1,
  choices: [
    { name: 'geth / clef', message: 'geth / clef' },
    { name: 'trezor / ledger', message: 'trezor / ledger' },
    { name: 'metamask', message: 'metamask' },
    { name: 'mobile', message: 'mobile' },
    { name: 'cloud', message: 'cloud' }
  ]
}];

const signWithEthKeystore = async (inputFilePath : string) => {
  const keys = listKeys()
  const { selectedKey }: any = await prompt(questionKeySelect(keys))
  const { keyFile, file } = selectedKey

  let keyObject
  try {
    keyObject = JSON.parse(fs.readFileSync(keyFile, 'utf8'))
  } catch (error) {
    console.log('>> keyfile could not be accessed')
    return
  }

  const question = {
    type: 'password',
    name: 'keyfilePassword',
    message: `Enter password to unlock "${file}"`
  };

  const { keyfilePassword } = await prompt(question)
  try {
    startTask('Unlocking keyfile')
    const privateKey = keythereum.recover(keyfilePassword, keyObject)
    succeed('Keyfile unlocked')
    startTask('Signing file')
    const pkg = await pkgsign.sign(inputFilePath, privateKey)
    if(pkg) {
      const buildOutpath = (pkgPath : string) => {
        let ext = path.extname(pkgPath)
        const basename = path.basename(pkgPath, ext)
        // ext = '.epk'
        const dirname = path.dirname(pkgPath)
        const pkgPathOut = `${dirname}/${basename}_signed_${ext}`
        return pkgPathOut
      }
      const outPath = buildOutpath(inputFilePath)
      await pkg.write(outPath)
      succeed(`File written to ${outPath}`)
    }
  } catch (error) {
    failed('Key could not be unlocked: wrong password?')
  }
}

@command({
  description: 'sign a zip or tarball',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'zip | tarball',
      description: 'path to zip or tarball',
      required: false,
    })
    inputPath?: string
  ) {

    if (!inputPath) {
      inputPath = await prompt(questionInputFile)
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
      console.log('>> input file not found')
      return
    }

    const answersMethod = await prompt(questionSigningMethod(inputPath))
    // @ts-ignore
    const selectedSigningMethod = answersMethod.method

    switch (selectedSigningMethod) {
      case SIGNING_METHOD.PRIVATE_KEY: {
        const answerKeyLocation: any = await prompt(questionKeyStorage)
        switch (answerKeyLocation.storage) {
          case KEY_STORAGE.ETH: {
            await signWithEthKeystore(inputPath)
          }
          case KEY_STORAGE.PEM: {

          }
        }
        break;
      }
      case SIGNING_METHOD.EXTERNAL_SIGNER: {
        const answerSigner = await prompt(questionSigner);
        console.log('selected external signer is', answerSigner)
        break;
      }
    }

    /*

    console.log('sign package not implemented yet')
    */

  }
}