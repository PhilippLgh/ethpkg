import { assert } from 'chai'
import GethSigner from '../../src/Signers/GethSigner'

const ETH_ADDRESS_1 = '0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7'

describe("GethSigner", () => {

  /**
   * preparing geth manually
   * import private key:
   * echo 62DEBF78D596673BCE224A85A90DA5AECF6E781D9AADCAEDD4F65586CFE670D2 >> keyfile.prv
   * ./geth account import ./keyfile.prv --password <(echo test)
   * >> Address: {f863ac227b0a0bca88cb2ff45d91632626ce32e7}
   * start geth with rpc api:
   * ./geth --syncmode light --unlock 0xf863ac227b0a0bca88cb2ff45d91632626ce32e7 --password <(echo test)  --rpc --rpccorsdomain=localhost --port 0 --allow-insecure-unlock
   * test rpc endpoint
   * curl -X POST --data '{"jsonrpc":"2.0","method":"eth_sign","params":["0xf863ac227b0a0bca88cb2ff45d91632626ce32e7", "0xdeadbeaf"],"id":1}' -H "Content-type:application/json" http://localhost:8545
   * >> {"jsonrpc":"2.0","id":1,"result":"0xfb65b3368de3abea4fbd79858f345ad80e1a2263f38a02aa6f02afbb8521074513e7d8018a99b1059de542c9225b1af37f436b9f67f7a54e959ee3c408b589751b"}
   * foo.tar payload in hex:
   * 0x65794a68624763694f694a46557a49314e6b73694c434a694e6a51694f6d5a6862484e6c4c434a6a636d6c30496a7062496d49324e434a6466512e7b2264617461223a7b22736861353132223a7b222e2f666f6f2f666f6f2e747874223a226637666262613665303633366638393065353666626266333238336535323463366661333230346165323938333832643632343734316430646336363338333236653238326334316265356534323534643838323037373263353531386132633561386330633766376564613139353934613765623533393435336531656437222c222e2f666f6f2f6261722e747874223a226438326334656235323631636239633861613938353565646436376431626431303438326634313532393835386439323530393464313733666136363261613931666633396263356231383836313532373334383430323164666231366664383238346366363834636366306663373935626533616132666331653663313831227d7d2c22657870223a313537373435363534303330322c22697373223a2273656c66222c2276657273696f6e223a317d
   * >> {"jsonrpc":"2.0","id":1,"result":"0xc8733d961e2ff4fc0bc11b9d383a945fb21a8e41a182f6f2b2b24a31de972ef84e75d93a46c998b05c296ffc22b63177fae68eca2fa37dfb7ebd82aefe6bb2db1b"}
   */

  describe('async ethSign(msg: Buffer) : Promise<Buffer>', function() {

    it("signs a payload using the geth client's RPC API", async () => {
      const signer = new GethSigner(ETH_ADDRESS_1)
      const msgBuf = Buffer.from('0xdeadbeaf'.slice(2), 'hex')
      const result = await signer.ethSign(msgBuf)
      const hexString = '0x' + result.toString('hex')
      assert.equal(hexString, '0xfb65b3368de3abea4fbd79858f345ad80e1a2263f38a02aa6f02afbb8521074513e7d8018a99b1059de542c9225b1af37f436b9f67f7a54e959ee3c408b589751b')
    })

  })
})