export const readFileToBuffer = (file: File) : Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev: any) => {
      const arraybuf = ev.target.result
      const buf = Buffer.from(new Uint8Array(arraybuf))
      resolve(buf)      
    }
    reader.readAsArrayBuffer(file)
  })
}