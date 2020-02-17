import { prompt } from 'enquirer'

export const SIGNING_METHOD: { [index: string]: string } = {
  'PRIVATE_KEY': 'Local Private Key',
  'EXTERNAL_SIGNER': 'External Signer'
}

export const KEY_STORAGE: { [index: string]: string } = {
  'ETH': 'Ethereum Keystore',
  'ETH_KEYFILE': 'Ethereum Keyfile',
  'PEM': 'PEM File',
  'CREATE': 'Create new key'
}

export const getSingingMethod = async (fileName?: string) => {
  const questionSigningMethod = (fileName: string) => ({
    type: 'select',
    name: 'method',
    message: `How do you want to sign "${fileName}"?`,
    initial: 0,
    choices: [
      { name: SIGNING_METHOD.PRIVATE_KEY, message: 'Private Key', value: 'pk' },
      { name: SIGNING_METHOD.EXTERNAL_SIGNER, message: 'External Signer', value: 'signer' }
    ]
  })
  fileName = fileName || 'the data'
  const answersMethod = await prompt(questionSigningMethod(fileName)) as any
  return answersMethod.method
}

export const getKeyLocation = async () => {
  const questionKeyStorage = [{
    type: 'select',
    name: 'storage',
    message: 'How is the private key stored?',
    initial: 0,
    choices: [
      { name: `${KEY_STORAGE.ETH}`, message: 'Keystore' },
      { name: `${KEY_STORAGE.ETH_KEYFILE}`, message: 'Keyfile' },
      { name: `${KEY_STORAGE.PEM}`, message: 'PEM Keyfile' },
      { name: `${KEY_STORAGE.PEM}`, message: 'Create new key' },
    ]
  }];
  const answerKeyLocation: any = await prompt(questionKeyStorage)
  return answerKeyLocation.storage
}

export const getExternalSigner = async () => {
  const questionSigner = [{
    type: 'select',
    name: 'format',
    message: 'Which external signer is used?',
    initial: 1,
    choices: [
      { name: 'geth / clef', message: 'geth / clef' },
      { name: 'trezor / ledger', message: 'trezor / ledger' },
      { name: 'metamask', message: 'metamask' },
      { name: 'mobile', message: 'mobile' },
      { name: 'cloud', message: 'cloud' }
    ]
  }]
  let answerExternalSigner = await prompt(questionSigner) as any
  return answerExternalSigner.format
}

/**
 export const getPrivateKeyFromPemFile = async () => {
  const keyFilePath = await getUserFilePath('Provide path to pem keyfile')
  const privateKey = getPrivateKeyFromPEM(keyFilePath)
  return privateKey
}
 */

export const getPrivateKey = async (options: any) : Promise<any> => {
  const keyLocation = await getKeyLocation()
  switch (keyLocation) {
    case KEY_STORAGE.ETH: {
      // FIXME 
      throw new Error('not implemented')
      /*
      const privateKey = await getPrivateKeyFromEthKeystore()
      return {
        privateKey
      }
      */
    }
    case KEY_STORAGE.ETH_KEYFILE: {
      // FIXME
      throw new Error('not implemented')
      /*
      const privateKey = await getPrivateKeyFromEthKeyfile()
      return {
        privateKey
      }
      */
    }
    // helpful debugger: https://lapo.it/asn1js
    // https://github.com/lapo-luchini/asn1js/blob/master/asn1.js#L260
    case KEY_STORAGE.PEM: {
      // FIXME const privateKey = await getPrivateKeyFromPemFile()
      const privateKey = Buffer.from('')
      return {
        privateKey
      }
    }
    default : {
      return {
        privateKey: undefined
      }
    }
  }
}

