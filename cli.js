const { find } = require('.')

async function example() {
  const filesViaRegex = await find([/\.md$/], {
    excludeGitIgnore: false
  })
  console.log(filesViaRegex)
}

function exampleTwo() {
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
}

example()