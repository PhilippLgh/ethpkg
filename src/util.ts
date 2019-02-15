import fs from 'fs'
const secp256k1 = require('secp256k1')
const asn1 = require('asn1.js')

export const readPrivateKeyFromPEM = (inputPath: string) => {
  const dearmor = (str: string) => {
    return str.split('\n').map(l => l.replace(/\s/g, "")).filter(l => !l.startsWith('-----')).join('')
  }

  const armoredKey = fs.readFileSync(inputPath, 'utf8')
  const privKeyStr = dearmor(armoredKey)
  const privKeyObjectDER = Buffer.from(privKeyStr, 'base64')

  // https://tools.ietf.org/html/rfc5915
  /*
  ECPrivateKey ::= SEQUENCE {
    version        INTEGER { ecPrivkeyVer1(1) } (ecPrivkeyVer1),
    privateKey     OCTET STRING,
    parameters [0] ECParameters {{ NamedCurve }} OPTIONAL,
    publicKey  [1] BIT STRING OPTIONAL
  }
  */
  const ECPrivateKey = asn1.define('ECPrivateKey', function (this: any) {
    this.seq().obj(
      this.key('version').int(),
      this.key('privateKey').octstr(),
      this.key('parameters').explicit(0).optional().any(),
      this.key('publicKey').explicit(1).optional().bitstr()
    );
  })

  const { result } = ECPrivateKey.decode(privKeyObjectDER, 'der')
  if (!result) {
    // console.log('keyfile parser error')
    return null
  }
  const { privateKey } = result

  const verified = secp256k1.privateKeyVerify(privateKey)
  if (!verified) {
    // console.log('invalid private key')
    return null
  }

  return privateKey
}