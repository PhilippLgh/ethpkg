import * as fs from 'fs'
import path from 'path'
import { getUserFilePath } from './InputFilepath'
import { readPrivateKeyFromPEM } from '../../util'

export const getPrivateKeyFromPemFile = async () => {
  const keyFilePath = await getUserFilePath('Provide path to pem keyfile')
  const privateKey = readPrivateKeyFromPEM(keyFilePath)
  return privateKey
}
