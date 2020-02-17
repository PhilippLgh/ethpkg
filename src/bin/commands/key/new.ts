import { Command, command, param, Options, option, metadata } from 'clime'
import { createCLIPrinter } from '../../printUtils'
import { KeyStore } from '../../..'
import { getPasswordFromUser } from '../../interactive'

export class KeyOptions extends Options {
  @option({
    flag: 'a',
    description: 'alias name for key',
    default: 'ethpkg'
  })
  alias: string = 'ethpkg';
  @option({
    flag: 'p',
    description: 'WARNING: use interactive mode: password for key',
    required: false
  })
  password?: string = undefined;
}

@command({
  description: 'Create a new key for signing',
})
export default class extends Command {
  @metadata
  public async execute(
    options: KeyOptions,
  ) {  
    const keyManager = new KeyStore()
    const { alias, password } = options
    const printer = createCLIPrinter()
    printer.print(`Creating a new key with alias "${alias}"`)
    let keyInfo
    try {
      const result = await keyManager.createKey({
        listener: printer.listener,
        password: async () => {
          if (password) {
            return password
          }
          const userPassword = await getPasswordFromUser({ repeat: true})
          return userPassword
        }
      })
      keyInfo = result.info
    } catch (error) {
      printer.fail(error)
    }
    if(!keyInfo) {
      return printer.fail('Key could not be created')
    }
    const { address, filePath } = keyInfo
    printer.print(`Success! New key with address ${address} created at:\n${filePath}`)
  }
}
