import * as fs from 'fs'
import path from 'path'
import { getUserFilePath } from './InputFilepath'
import { getPrivateKeyFromPEM } from '../../util'

export const getPrivateKeyFromPemFile = async () => {
  const keyFilePath = await getUserFilePath('Provide path to pem keyfile')
  const privateKey = getPrivateKeyFromPEM(keyFilePath)
  return privateKey
}
