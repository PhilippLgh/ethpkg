let pattern = '*'
if (process.argv.length === 3) {
  pattern = process.argv.pop()
}
module.exports = {
  "extension": ["ts"],
  "spec": `./src/**/${pattern}.spec.ts`,
  "require": ["ts-node/register", "source-map-support/register"],
  "full-trace": true
}