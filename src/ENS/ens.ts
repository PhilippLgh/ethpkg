export const resolveName = async (name: string): Promise<string | undefined> => {
  // TODO check that env running in tests
  if(name === 'foo.test.ens') {
    return '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'
  }
}