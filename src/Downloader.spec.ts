
import { assert } from 'chai'
import * as Downloader from './Downloader'
import { fail } from 'assert'

describe('Downloader', () => {

  describe('async download(_url : string, onProgress = (progress : number) => {}, redirectCount = 0, options = { parallel: 0 }): Promise<Buffer>', function() {

    this.timeout(120 * 1000);

    it('throws on 404', async () => {
      try {
        await Downloader.download('https://httpstat.us/404')
      } catch (error) {
        return assert.isDefined(error)
        // error.should.have.value("message", "Contrived Error");
      }
      fail()
    });
  })

})