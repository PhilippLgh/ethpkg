import * as fs from 'fs'
import path from 'path'

import { startTask, succeed, failed, progress } from '../task'

import { Command, command, param, Options, option } from 'clime'
import { pkgsign, util } from '../..';
import { getUserFilePath } from '../lib/InputFilepath';
import { getSingingMethod, SIGNING_METHOD, getPrivateKey, getExternalSigner } from '../lib/signFlow';

const signFile = async (inputFilePath : string, privateKey : Buffer) => {
  startTask('Signing file')
  const pkg = await pkgsign.sign(inputFilePath, privateKey)
  if(pkg) {
    const buildOutpath = (pkgPath : string) => {
      let ext = path.extname(pkgPath)
      const basename = path.basename(pkgPath, ext)
      // ext = '.epk'
      const dirname = path.dirname(pkgPath)
      const pkgPathOut = `${dirname}/${basename}_signed${ext}`
      return pkgPathOut
    }
    const outPath = buildOutpath(inputFilePath)
    await pkg.write(outPath)
    succeed(`Signed package written to "${outPath}"`)
  }
}

export const startSignFlow = async (inputPath: string) => {
  const selectedSigningMethod = await getSingingMethod(inputPath)
  switch (selectedSigningMethod) {
    case SIGNING_METHOD.PRIVATE_KEY: {
      const { privateKey } = await getPrivateKey()
      if (!privateKey) {
        console.log('>> private key not valid or not able to parse')
        return
      }
      await signFile(inputPath, privateKey)
      break;
    }
    case SIGNING_METHOD.EXTERNAL_SIGNER: {
      const externalSigner = await getExternalSigner()
      console.log('selected external signer is', externalSigner)
      break;
    }
  }
}
@command({
  description: 'sign a package',
})
export default class extends Command {
  public async execute(
    @param({
      name: 'zip | tarball',
      description: 'path to zip or tarball',
      required: false,
    })
    inputPath?: string
  ) {

    if (!inputPath) {
      inputPath = await getUserFilePath('Which zip / tar file do you want to sign?')
    }
    if (!inputPath) {
      return
    }

    await startSignFlow(inputPath)

  }
}