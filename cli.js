const { globber } = require('.')

globber(
  // ['**/**.js']
  // ['**.js']
  // '**.js'
  // /^[^/]*\.js$/
  // '/^[^/]*\.js$/'
  // '/\[api\]\.page\.js/'
  '\[api\]\.page\.js'
  // /.*\.js$/
  , 
  {
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
}).then((files) => {
  console.log('files', files)
})
