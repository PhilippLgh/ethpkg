let pattern = '*'
let dirPattern = '**'
if (process.argv.length === 3) {
  const arg = process.argv.pop()
  const DIRECTORIES = ['Repositories', 'utils']
  if(DIRECTORIES.includes(arg)) {
    dirPattern = arg
  } else {
    pattern = arg
  }
}
module.exports = {
  "extension": ["ts"],
  "spec": `./src/${dirPattern}/${pattern}.spec.ts`,
  "require": ["ts-node/register", "source-map-support/register", "jsdom-global/register"],
  "full-trace": true
}