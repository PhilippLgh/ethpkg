import * as fs from 'fs'
import path from 'path'
import os from 'os'

import { startTask, succeed, failed, progress } from '../task'

import { prompt } from 'enquirer'
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

export const getPrivateKeyFromEthKeystore = async () => {
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
    return privateKey
  } catch (error) {
    failed('Key could not be unlocked: wrong password?')
  }
}
