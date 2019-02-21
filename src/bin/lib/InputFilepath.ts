import * as fs from 'fs'
import path from 'path'

import { prompt } from 'enquirer'

export const getUserFilePath = async (message: string) => {
  const questionFile = (message: string) => [{
    type: 'input',
    name: 'file',
    message,
    initial: ''
  }];
  let { file } = await prompt(questionFile(message))
  if (!file || !fs.existsSync(file)) {
    console.log(`>> file not found: "${file}"`)
    return ''
  }
  return file
}