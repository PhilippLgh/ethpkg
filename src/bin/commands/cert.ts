import fs from 'fs'
import path from 'path'

import { Command, command, param, Options, option } from 'clime'
import { prompt } from 'enquirer'

const CERT_TYPE = {
  SELF: 'SELF_SIGNED'
}

const getInput = async (prop: string, message: string) => {
  const question = {
    type: 'input',
    name: prop,
    message
  }
  const answer = await prompt(question) as any
  return answer[prop] as string
}

const getCertType = async () => {
  const questionCertType = [{
    type: 'select',
    name: 'type',
    message: 'What kind of certificate do you want to create?',
    initial: 0,
    choices: [
      { name: `${CERT_TYPE.SELF}`, message: 'Self signed' },
      // { name: `${KEY_STORAGE.PEM}`, message: 'CA signed' }
    ]
  }]
  let cert_type = await prompt(questionCertType) as any
  return cert_type.type
}

@command({
  description: 'creates certificates',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'name',
      description: 'your username or full name',
      required: false,
    })
    name?: string
  ) {

    const cert_type = await getCertType()
    name = await getInput('name', 'What is the cert holder\'s name or username?')
    const email = await getInput('email', 'What is the cert holder\'s email?')
    
    const subjectInfo = {
      name,
      email
    }
    const options = {
      csrType: 2 // email
    }
    /*
    const { privateKey } = await getPrivateKey()
    const csr = await cert.csr(subjectInfo, privateKey, options)
    
    const outPath = path.join(process.cwd(), `self_signed_cert_${Date.now()}.json`)
    const certData = JSON.stringify(csr, null, 2)
    fs.writeFileSync(outPath, certData)
    progress(`Certificate: \n\n${JSON.stringify(csr, null, 2)}\nwritten to ${outPath}`)
    */
  }
}