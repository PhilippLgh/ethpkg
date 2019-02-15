import * as fs from 'fs'
import path from 'path'
import os from 'os'

import { startTask, succeed, failed, progress } from '../task'

import { Command, command, param, Options, option } from 'clime'
import { prompt } from 'enquirer'
import { pkgsign, util } from '../..';

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
  initial: '',
  choices: keys.map((k: any) => ({ name: k.address, message: `${k.address} ("${k.file}")`, keyFile: k.filePathFull, file: k.file })),
  result(value: string): any {
    return this.choices.find((choice: any) => choice.name === value)
  }
}];

const getUserFilePath = async (message : string) => {
  const questionFile = (message : string) => [{
    type: 'input',
    name: 'file',
    message,
    initial: ''
  }];
  let { file } = await prompt(questionFile(message))
  if(!file || !fs.existsSync(file)){
    console.log(`>> file not found: "${file}"`)
    return ''
  }
  return file
}

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
    { name: `${KEY_STORAGE.PEM}`, message: 'PEM File' }
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

const signFile = async (inputFilePath : string, privateKey : Buffer) => {
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
    const outPath = buildOutpath(inputFilePath)
    await pkg.write(outPath)
    succeed(`Signed package written to "${outPath}"`)
  }
}

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
    // @ts-ignore
    const privateKey = keythereum.recover(keyfilePassword, keyObject)
    succeed('Keyfile unlocked')
    await signFile(inputFilePath, privateKey)
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
      inputPath = await getUserFilePath('Which zip / tar file do you want to sign?')
    }

    if (!inputPath) {
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
          // helpful debugger: https://lapo.it/asn1js
          // https://github.com/lapo-luchini/asn1js/blob/master/asn1.js#L260
          case KEY_STORAGE.PEM: {
            let keyFilePath = await getUserFilePath('Provide path to pem keyfile')
            const privateKey = util.readPrivateKeyFromPEM(keyFilePath)
            if(!privateKey){
              console.log('>> private key not valid or not able to parse')
              return
            }
            await signFile(inputPath, privateKey)
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