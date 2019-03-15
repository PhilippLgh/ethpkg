import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import ethpkg from '../src/pkgsign'
import { pkg } from '../src/pkgFormats/pkg'

const FIXTURES = path.join(__dirname, 'fixtures')
const TEMP = path.join(__dirname, 'fixtures', 'temp')

const PRIVATE_KEY = '487ACD83B6ED4B8BE58480F0E6B19143E03EC8789BA8199FF5E106A0AA22971F'
const PUBLIC_KEY = '0x0D192c18d9412d2447725BdC28396B8F7154A902'

describe('pack()', () => {

  it('packs a directory', async () => {
    const pkgPath = path.join(FIXTURES, 'test-package')
    const pkgOutPath = path.join(TEMP, 'test-package.zip')
    assert.isFalse(fs.existsSync(pkgOutPath))
    await pkg.create(pkgPath, pkgOutPath)
    assert.isTrue(fs.existsSync(pkgOutPath))
    // cleanup TODO move in afterTest()
    fs.unlinkSync(pkgOutPath)
  })

})

