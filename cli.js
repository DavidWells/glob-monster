const { find } = require('.')

const opts = {
  // ignore: [
  //   'node_modules',
  //   '/tests/fixtures/**.js',
  //   /!!.*\.js$/, // multiple-negation/!unicorn.js'
  //   // '/tests/fixtures/**/**.js',
  //   // '/tests',
  //   // './tests',
  //   // /tests/,
  // ],
  relativePaths: true,
  debug: true
}

find(
  // ['**/**.js']
  // ['**.js']
  // '**.js'
  // /^[^/]*\.js$/
  // '/^[^/]*\.js$/'
  // '/\[api\]\.page\.js/'
  '\[api\]\.page\.js'
  // /.*\.js$/
  , opts).then((files) => {
  console.log('files', files)
})
