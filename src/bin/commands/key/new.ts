import { Command, command, param, Options, option } from 'clime'
import { prompt } from 'enquirer'

import fs from 'fs'
// @ts-ignore
import keythereum from 'keythereum'

@command({
  description: 'create a new key for signing',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'out',
      description: 'output path for keyfile',
      required: false,
    })
    dirPath?: string
  ) {
    const questionKeyPassword = {
      type: 'password',
      name: 'password',
      message: `Enter password to encrypt key`
    };
    const { password } = await prompt(questionKeyPassword)
    if (!password) {
      console.log('>> error: password empty or invalid')
      return
    }
    const dk = keythereum.create()
    const keyObject = keythereum.dump(password, dk.privateKey, dk.salt, dk.iv)
    keyObject.usage = 'codesign'
    keyObject.version = 'codesign'
    
    const keyFileName = 'code-sign-key.json'
    const result = fs.writeFileSync(keyFileName, JSON.stringify(keyObject, null, 2))
    console.log('written to: ', keyFileName)
  }
}
