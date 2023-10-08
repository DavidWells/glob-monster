const { find } = require('.')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname)
const TEMP_DIR = path.resolve(ROOT_DIR, 'tmp')
const TEST_DIR = path.resolve(ROOT_DIR, 'tests')
const TEMP_SUB_DIR = path.resolve(TEMP_DIR, 'sub')
async function example() {
  const filesViaRegex = await find([/\.md$/], {
    excludeGitIgnore: false
  })
  console.log(filesViaRegex)
}

async function exampleGlob() {
  const filesViaGlob = await find(['!a.tmp', '!b.tmp'], {
    cwd: TEMP_DIR,
    // ignore: /node_modules/,
    excludeGitIgnore: false
  })
  console.log(filesViaGlob)
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

// example()
exampleGlob()