const fs = require('fs')
const path = require('path')
const { test } = require('uvu') 
const assert = require('uvu/assert')
const { find, findUp } = require('../src')

const ROOT_DIR = path.resolve(__dirname, '../')
const TEMP_DIR = path.resolve(ROOT_DIR, 'tmp')
const TEST_DIR = path.resolve(ROOT_DIR, 'tests')
const TEMP_SUB_DIR = path.resolve(TEMP_DIR, 'sub')

test('Exports API', () => {
  assert.equal(typeof findUp, 'function', 'undefined val')
})

test('return JS', async () => {
  const files = (await find(['**/**.js'], {
    ignore: [
      'node_modules',
      './tests/fixtures/**.js',
      /!!.*\.js$/, // multiple-negation/!unicorn.js'
      // '/tests/fixtures/**/**.js',
      // '/tests',
      // './tests',
      // /tests/,
    ],
    // ignore: /!!.*\.js$/,
    cwd: ROOT_DIR,
    // caseInsensitive: true,
    relativePaths: true,
  })).sort()

  assert.equal(files, [
    'cli.js',
    'src/index.js',
    'src/utils/get-gitignore.js',
    'tests/fixtures/gitignore/bar.js',
    'tests/fixtures/js/simple.js',
    // 'tests/fixtures/multiple-negation/!!unicorn.js',
    'tests/fixtures/multiple-negation/!unicorn.js',
    'tests/fixtures/negative/foo.js',
    'tests/get-file-path.test.js',
    'tests/find.test.js'
  ].sort())
})

test('Ignore Self', async () => {
  const files = await find(['**/**.md'], {
    ignore: [
      '**/**.md',
    ],
    cwd: ROOT_DIR,
  })
  assert.equal(files, [])
})

test('Ignore top patterns', async () => {
  const answer = [
    'tests/fixtures/md/basic.md',
    'tests/fixtures/md/broken-inline.md',
    'tests/fixtures/md/error-missing-transforms-two.md',
    'tests/fixtures/md/error-missing-transforms.md',
    'tests/fixtures/md/error-no-block-transform-defined.md',
    'tests/fixtures/md/error-unbalanced.md',
    'tests/fixtures/md/format-inline.md',
    'tests/fixtures/md/format-with-wacky-indentation.md',
    'tests/fixtures/md/inline-two.md',
    'tests/fixtures/md/inline.md',
    'tests/fixtures/md/missing-transform.md',
    'tests/fixtures/md/mixed.md',
    'tests/fixtures/md/nested/nested.md',
    'tests/fixtures/md/no-transforms.md',
    'tests/fixtures/md/string.md',
    'tests/fixtures/md/syntax-legacy-colon.md',
    'tests/fixtures/md/syntax-legacy-query.md',
    'tests/fixtures/md/syntax-mixed.md',
    'tests/fixtures/md/transform-code.md',
    'tests/fixtures/md/transform-custom.md',
    'tests/fixtures/md/transform-file.md',
    'tests/fixtures/md/transform-remote.md',
    'tests/fixtures/md/transform-toc.md',
    'tests/fixtures/md/transform-wordCount.md'
  ]
  /* Ignore **.md */
  const files = await find(['**/**.md'], {
    ignore: [
      '*.md',
      'node_modules',
    ],
    cwd: ROOT_DIR,
    relativePaths: true,
  })
  /*
  console.log('files', files)
  process.exit(1)
  /** */
  assert.equal(files, answer)

  /* Ignore *.md */
  const filesTwo = await find(['**/**.md'], {
    ignore: [
      '*.md',
      'node_modules',
    ],
    cwd: ROOT_DIR,
    relativePaths: true,
  })
  /*
  console.log('filesTwo', filesTwo)
  process.exit(1)
  /** */
  assert.equal(filesTwo, answer)

  /* Ignore './*.{md,mdx}' */
  const filesThree = await find(['**/**.md'], {
    ignore: [
      './*.{md,mdx}',
      'node_modules',
    ],
    cwd: ROOT_DIR,
    relativePaths: true,
  })
  /*
  console.log('filesThree', filesThree)
  process.exit(1)
  /** */
  assert.equal(filesThree, answer)

  const filesFour = await find(['**/**.md'], {
    ignore: [
      /^[^/]*\.mdx?$/,
      'node_modules',
    ],
    cwd: ROOT_DIR,
    relativePaths: true,
  })
  /*
  console.log('filesFour', filesFour)
  process.exit(1)
  /** */
  assert.equal(filesFour, answer)
})

test.run()