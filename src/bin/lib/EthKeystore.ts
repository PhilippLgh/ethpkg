import * as fs from 'fs'
import path from 'path'

import { getKeystorePath, getPrivateKeyFromKeystore } from '../../util';

import { startTask, succeed, failed, progress } from '../task'

import { prompt } from 'enquirer'
import { getUserFilePath } from './InputFilepath';

const listKeys = () => {
  const keystore = getKeystorePath()
  // TODO we could filter keys here for e.g. a prefix like 'ethpkg' to avoid misuse
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
}]

export const getKeyFilePath = async () => {
  const keyFilePath = await getUserFilePath('Path to keyfile used for signing')
  return keyFilePath
}

export const getPrivateKeyFromEthKeystore = async () => {
  const keys = listKeys()
  const { selectedKey }: any = await prompt(questionKeySelect(keys))
  const { keyFile, file } = selectedKey

  return getPrivateKeyFromEthKeyfile(keyFile, file)
}

export const getPrivateKeyFromEthKeyfile = async (keyFile? : string, fileName? : string) => {

  if(!keyFile) {
    keyFile = await getKeyFilePath()
  }

  if(!keyFile){
    failed('keyfile path was not provided')
    return null
  }

  if(!path.isAbsolute(keyFile)) {
    keyFile = path.join(process.cwd(), keyFile)
  }

  if(!fs.existsSync(keyFile)) {
    failed('keyfile does not exist')
    return
  }

  fileName = fileName || path.basename(keyFile)

  const questionKeyPassword = {
    type: 'password',
    name: 'keyFilePassword',
    message: `Enter password to unlock "${fileName}"`
  };

  const { keyFilePassword } = await prompt(questionKeyPassword)
  try {
    startTask('Unlocking keyfile')
    // @ts-ignore
    const privateKey = await getPrivateKeyFromKeystore(keyFile, keyFilePassword)
    succeed('Keyfile unlocked')
    return privateKey
  } catch (error) {
    failed('Key could not be unlocked: wrong password?')
  }
}
