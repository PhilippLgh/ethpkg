import { IRepository, FetchOptions, IRelease } from "../../IRepository"

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a : any) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}

export default class Mock implements IRepository {
  
  name: string = 'MockRepository'
  testCase: string;

  constructor(testCase: string) {
    this.testCase = testCase
  }
  
  async listReleases(options?: FetchOptions | undefined): Promise<IRelease[]> {
    switch (this.testCase) {
      case 'unsorted': return require('./fixtures/unsorted.json')
      case 'invalid': return require('./fixtures/invalid.json')
      default: return []
    }
  }


}