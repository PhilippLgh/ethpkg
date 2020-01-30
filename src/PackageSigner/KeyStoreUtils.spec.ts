import fs from 'fs'
import path from 'path'
import { assert } from 'chai'
import * as PackageSigner from '.'
import * as KeyStoreUtils from './KeyStoreUtils'

const FIXTURES = path.join(__dirname, '..', '..', 'test', 'fixtures')
const KEYSTORE_PATH = path.join(FIXTURES, 'KeyStore')

const KEY_1 = {
  address: '0x585c34f863e4064bdeFA52305E3e7c89d39F98cF',
  path: path.join(FIXTURES, 'KeyStore', 'UTC--2019-12-17T10-30-10.617174000Z--585c34f863e4064bdefa52305e3e7c89d39f98cf'),
  fileName: 'UTC--2019-12-17T10-30-10.617174000Z--585c34f863e4064bdefa52305e3e7c89d39f98cf',
  password: 'test',
  privateKey: 'B9CB3C948D043BEF4551E1679D441F6DB567D0C74148166BFC6270D2E5D30E39'
}

const KEY_2 = {
  address: '0x1cD1f547bE181Dcd53cF8Fb067A159f68938BfCd',
  path: path.join(FIXTURES, 'KeyStore', 'UTC--2019-12-17T10-30-30.026422000Z--1cd1f547be181dcd53cf8fb067a159f68938bfcd'),
  fileName: 'UTC--2019-12-17T10-30-30.026422000Z--1cd1f547be181dcd53cf8fb067a159f68938bfcd',
  password: 'test2'
}

// http://openssl.cs.utah.edu/docs/apps/ec.html
const PEM_KEY = {
  // openssl ec -in ./test/fixtures/Keys/ec-codesign-pk.pem -text -noout
  privateKey: '6994100d6b46868391a3b908def2726a1b3d85c373676371146b9aad48059ec2',
  fileName: 'ec-codesign-pk.pem',
  path: path.join(FIXTURES, 'Keys', 'ec-codesign-pk.pem')
}

const INVALID_KEYFILE_PATH = path.join(FIXTURES, 'KeyStore', 'INVALID_KEYFILE')
const KEYFILE_1_PATH_OUTSIDE = path.join(FIXTURES, 'Keys', 'UTC--2019-12-17T10-30-10.617174000Z--585c34f863e4064bdefa52305e3e7c89d39f98cf')
const KEYFILE_VERSION_1 = path.join(FIXTURES, 'Keys', 'UTC--2019-13-17T10-30-10.617174000Z--585c34f863e4064bdefa52305e3e7c89d39f98cf')

describe('KeyStoreUtils', function() {

  describe('getKeyStorePath = async () : Promise<string>', function() {
    it('returns the path to the platform-specific default ethereum keystore whether it exists or not', async () => {
      const keyStorePath = await KeyStoreUtils.getKeyStorePath()
      assert.isDefined(keyStorePath)
    })
    it.skip('returns the path to the ethereum keystore of a certain network when passed a network identifier', async () => {
      // TODO needs implementation
    })
  })

  describe('listKeys = async (keystorePath?: string) : Promise<Array<KeyFileInfo>>', function() {
    it('lists all keyfiles from ethereum keystore in KeyFileInfo format', async () => {
      const keys = await KeyStoreUtils.listKeys(KEYSTORE_PATH)
      const key1 = keys.find(k => k.address.toLowerCase() === KEY_1.address.toLowerCase())
      assert.isDefined(key1)
    })
    it('filters invalid keyfiles from the list', async () => {
      const keys = await KeyStoreUtils.listKeys(KEYSTORE_PATH)
      assert.equal(keys.length, 2)
    })
  })

  describe('findKeyStoreFile = async (keyfilePathOrAlias: string, keyStorePath?: string) : Promise<string | undefined>', function() {
    it('finds the keyfile in a keystore given its address', async () => {
      const keyFilePath = await KeyStoreUtils.findKeyStoreFile(KEY_1.address, KEYSTORE_PATH)
      assert.equal(keyFilePath, KEY_1.path)
    })
    it('expands a relative file path or name to an absolute path', async () => {
      const keyFilePath = await KeyStoreUtils.findKeyStoreFile(KEY_1.fileName, KEYSTORE_PATH)
      assert.equal(keyFilePath, KEY_1.path)
    })
  })

  describe('isValidKeyStoreFile = async (keyfilePathOrAlias: string, keyStorePath?: string) : Promise<boolean>', function() {
    it('returns true if the file path exists in the keystore and is a valid keyfile', async () => {
      const result = await KeyStoreUtils.isValidKeyStoreFile(KEY_1.path, KEYSTORE_PATH)
      assert.isTrue(result)
    })
    it('returns true if the file exists outside the keystore but is a valid keyfile', async () => {
      const result = await KeyStoreUtils.isValidKeyStoreFile(KEYFILE_1_PATH_OUTSIDE)
      assert.isTrue(result)
    })
    it('returns true if the provided alias / eth address can be resolved to a valid file in the keystore', async () => {
      const result = await KeyStoreUtils.isValidKeyStoreFile(KEY_1.address, KEYSTORE_PATH)
      assert.isTrue(result)
    })
    it('returns false if the file exists but has an unsupported version', async () => {
      const result = await KeyStoreUtils.isValidKeyStoreFile(KEYFILE_VERSION_1)
      assert.isFalse(result)
    })
    it('returns false if the file exists but is an invalid or no keyfile', async () => {
      const result = await KeyStoreUtils.isValidKeyStoreFile(INVALID_KEYFILE_PATH)
      assert.isFalse(result)
    })
  })

  describe('isValidPemKeyfile = async (keyfilePath: string) : Promise<boolean> ', function() {
    it('returns true if the file contains a PEM encoded secp256k1 private key', async () => {
      const result = await KeyStoreUtils.isValidPemKeyfile(PEM_KEY.path)
      assert.isTrue(result)
    })
    it.skip('returns false if the file contains a PEM encoded private key that is not secp256k1', async () => {
      // TODO needs test case
    })
    it('returns false if the file is not a PEM file', async () => {
      const result = await KeyStoreUtils.isValidPemKeyfile(INVALID_KEYFILE_PATH)
      assert.isFalse(result)
    })
  })

  describe('isKeyfile = async (keyfilePathOrAlias: string, keyStorePath?: string) : Promise<boolean>', function() {
    it('returns true if the provided path points to a valid ethereum keyfile', async () => {
      const result = await KeyStoreUtils.isKeyfile(KEY_1.path)
      assert.isTrue(result)
    })
    it('returns false if the provided path points to an invalid ethereum keyfile', async () => {
      const result = await KeyStoreUtils.isKeyfile(KEYFILE_VERSION_1)
      assert.isFalse(result)
    })
    it('returns true if the provided path points to a valid PEM keyfile', async () => {
      const result = await KeyStoreUtils.isKeyfile(PEM_KEY.path)
      assert.isTrue(result)
    })
    it('returns false if the provided path points to a non-keyfile-file', async () => {
      const result = await KeyStoreUtils.isKeyfile(INVALID_KEYFILE_PATH)
      assert.isFalse(result)
    })
    it('returns false if the provided path does not exist', async () => {
      const result = await KeyStoreUtils.isKeyfile(path.join(__dirname, '123456789'))
      assert.isFalse(result)
    })
  })

  describe('getPrivateKey = async (keyfilePathOrAlias: string, password?: string) : Promise<Buffer>', function() {
    this.timeout(30*1000)
    it('decrypts the keystore file using <password> and returns the private key as buffer', async () => {
      const result = await KeyStoreUtils.getPrivateKey(KEY_1.path, KEY_1.password)
      assert.equal(result.toString('hex').toLowerCase(), KEY_1.privateKey.toLowerCase())
    })
    it('detects and decodes PEM files and returns private key as buffer', async () => {
      const result = await KeyStoreUtils.getPrivateKey(PEM_KEY.path)
      assert.equal(result.toString('hex').toLowerCase(), PEM_KEY.privateKey.toLowerCase())
    })
  })


})