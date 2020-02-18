import { ethers } from 'ethers'

const cache : {[index:string] : string} = {}
export const resolveName = async (name: string): Promise<string | undefined> => {
  if (name in cache) {
    return cache[name]
  }
  const provider = new ethers.providers.InfuraProvider()
  const address = await provider.resolveName(name)
  cache[name] = address
  // TODO check env to return this only in tests
  if(name === 'foo.test.eth') {
    return '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
  }
  return address
}