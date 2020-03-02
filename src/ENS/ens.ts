import { ethers } from 'ethers'

const cache : {[index:string] : string} = {}
export const resolveName = async (name: string): Promise<string | undefined> => {
  if (name in cache) {
    return cache[name]
  }
  // TODO check env to return this only in tests
  if(name === 'foo.test.eth') {
    return '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
  }
  const provider = new ethers.providers.InfuraProvider()
  const address = await provider.resolveName(name)
  cache[name] = address
  return address
}

export const lookupName = async (address: string) => {
  
}