import fs from "fs"
import path from "path"
import { assert } from "chai"
import ethpkg from "../src/pkgsign"
import { pkg } from "../src/pkgFormats/pkg"

const FIXTURES = path.join(__dirname, "fixtures")
const TEMP = path.join(__dirname, "fixtures", "temp")

const PRIVATE_KEY = "487ACD83B6ED4B8BE58480F0E6B19143E03EC8789BA8199FF5E106A0AA22971F"
const PUBLIC_KEY = "0x0D192c18d9412d2447725BdC28396B8F7154A902"

describe.skip("keys", () => {

  it("reads private keys from pem files", async () => {

  })

  it("reads private keys from eth keystore", async () => {

  })

  it("reads private keys from eth keyfiles", async () => {

  })

})

describe("pkg", () => {
  it("loads a zip buffer ", async () => {
    const pkgPath = path.join(FIXTURES, "signed.zip")
    const _pkg = await pkg.getPackage(pkgPath)
    assert.isDefined(_pkg)
  })
})

describe("pack()", () => {
  it("packs a directory", async () => {
    const pkgPath = path.join(FIXTURES, "test-package")
    const pkgOutPath = path.join(TEMP, "test-package.zip")
    // assert.isFalse(fs.existsSync(pkgOutPath))
    await pkg.create(pkgPath, pkgOutPath)
    assert.isTrue(fs.existsSync(pkgOutPath))
    // cleanup TODO move in afterTest()
    fs.unlinkSync(pkgOutPath)
  })
})

describe("sign()", () => {

  it.skip("signs tar files", async () => {
    throw new Error("Method not implemented.")
  })

  it("signs zip files", async () => {
    const pkgPath = path.join(FIXTURES, "unsigned.zip")
    const pkg = await ethpkg.sign(pkgPath, Buffer.from(PRIVATE_KEY, "hex"))
    // avoid ts type errors
    if (!pkg) {
      throw new Error("pkg signing failed")
    }
    const result = await ethpkg.verify(pkg)
    assert.isTrue(result.isValid)
  })

  it("signs npm modules", async () => {
    const pkgPath = path.join(FIXTURES, "test-npm-package-unsigned.tgz")
    const pkgOutPath = path.join(TEMP, "test-npm-package.tgz")

    const pkg = await ethpkg.sign(pkgPath, Buffer.from(PRIVATE_KEY, "hex"))
    // avoid ts type errors
    if (!pkg) {
      throw new Error("pkg signing failed")
    }
    pkg.writePackage(pkgOutPath)
    // const result = await ethpkg.verify(pkg)
    // assert.isTrue(result.isValid)
  })
})

describe("verify()", () => {
  it.skip("verifies tar files", async () => {
    throw new Error("Method not implemented.")
  })

  it("verifies gzipped tar buffers", async () => {
    const pkgPath = path.join(FIXTURES, "test-npm-package-signed.tgz")
    const pkgBuf = fs.readFileSync(pkgPath)
    const result = await ethpkg.verify(pkgBuf)
    assert.isUndefined(result.error)
  })

  it("verifies zip files", async () => {
    const pkgPath = path.join(FIXTURES, "signed.zip")
    const result = await ethpkg.verify(pkgPath)
    assert.isUndefined(result.error)
  })

  it("verifies zip buffers", async () => {
    const pkgPath = path.join(FIXTURES, "signed.zip")
    const pkgBuf = fs.readFileSync(pkgPath)
    const result = await ethpkg.verify(pkgBuf)
    assert.isUndefined(result.error)
  })

  it.skip("verifies local npm modules", async () => {
    const pkgPath = path.join(FIXTURES, "test-npm-package-signed-1.0.0.tgz")
    const result = await ethpkg.verify(pkgPath)
    console.log("result", result)
    assert.isUndefined(result.error)
  })
})
