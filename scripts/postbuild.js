const packageJson = require('../package.json');
const { writeFileSync, copyFileSync} = require('fs');

const {
  name,
  version,
  description,
  repository,
  keywords,
  author
} = packageJson

const finalPackageJson = {
  name,
  version,
  description,
  repository,
  keywords,
  author,
  main: "index.cjs",
  module: "index.mjs",
  types: "index.d.ts"
}

writeFileSync(
  'dist/package.json',
  JSON.stringify(finalPackageJson, null, 2),
  {encoding: 'utf8'}
)

copyFileSync('README.md', 'dist/README.md')
copyFileSync('docs/examples.md', 'dist/docs/examples.md')
