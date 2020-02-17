import * as fs from 'fs'
import path from 'path'
import { prompt } from 'enquirer'
import { KeyFileInfo } from '../PackageSigner/KeyFileInfo'

export const getUserFilePath = async (message: string, filePath?: string) : Promise<string | undefined>  => {
  if (filePath) {
    return filePath
  }
  if (filePath && !path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath)
    return filePath
  }
  const questionFile = (message: string) => [{
    type: 'input',
    name: 'file',
    message,
    initial: ''
  }];
  let { file } = await prompt(questionFile(message))
  return file
}

export const getPasswordFromUser = async ({ repeat = false } = {}) => {
  const questionKeyPassword = (message = `Enter password to de/encrypt key`) => ({
    type: 'password',
    name: 'password',
    message
  })
  const { password } = await prompt(questionKeyPassword())
  if (!password) {
    throw new Error('Error: no password provided by user')
  }
  if (repeat) {
    const { password: repeated } = await prompt(questionKeyPassword(`Repeat password to de/encrypt key`))
    if (password !== repeated) {
      throw new Error('Password input does not match.. typo?')
    }
  }
  return password
}

export const getSelectedKeyFromUser = async (keys: Array<KeyFileInfo>) => {
  const question = [{
    type: 'select',
    name: 'selectedKey',
    message: `Which key do you want to use for signing and publishing?`,
    initial: '',
    choices: keys.map((k: any) => ({ name: k.address, message: `${k.address} ("${k.fileName}")`, keyFile: k.filePath, file: k.fileName })),
    result(value: string): any {
      return keys.find((key) => key.address === value)
    }
  }]
  const { selectedKey } = await prompt(question)
  return selectedKey
}

