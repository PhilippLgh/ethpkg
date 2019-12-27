import * as fs from 'fs'
import path from 'path'

import { prompt } from 'enquirer'
import { hasPackageExtension } from '../../utils/FilenameUtils'

const isValid = (filePath?: string) => filePath && fs.existsSync(filePath) && hasPackageExtension(filePath)

export const getUserFilePath = async (message: string, filePath?: string) : Promise<string | undefined>  => {
  if (isValid(filePath)) {
    return filePath
  }
  if (filePath && !path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath)
    if (isValid(filePath)) {
      return filePath
    }
  }
  const questionFile = (message: string) => [{
    type: 'input',
    name: 'file',
    message,
    initial: ''
  }];
  let { file } = await prompt(questionFile(message))
  if (isValid(file)) {
    return file
  }
  return file
}