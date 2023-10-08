const fs = require('fs')
const path = require('path')
const { test } = require('uvu') 
const assert = require('uvu/assert')
const { findUp, getFilePaths, toRelativePath, convertToRelative } = require('../src')
const { getGitignoreContents } = require('../src/utils/get-gitignore')

const GREEN = '\x1b[32m%s\x1b[0m'
const ROOT_DIR = path.resolve(__dirname, '../')
const TEMP_DIR = path.resolve(ROOT_DIR, 'tmp')
const TEST_DIR = path.resolve(ROOT_DIR, 'tests')
const TEMP_SUB_DIR = path.resolve(TEMP_DIR, 'sub')
const fixture = [
	'a.tmp',
	'b.tmp',
	'c.tmp',
	'd.tmp',
	'e.tmp',
]

/* Create temp files */
test.before(() => {
  console.log('1. SETUP temp files')
  if (!fs.existsSync(TEMP_DIR)) {
		fs.mkdirSync(TEMP_DIR)
	}
  if (!fs.existsSync(TEMP_SUB_DIR)) {
		fs.mkdirSync(TEMP_SUB_DIR)
	}
	for (const element of fixture) {
		fs.writeFileSync(path.join(TEMP_DIR, element), '')
		fs.writeFileSync(path.join(TEMP_SUB_DIR, element), '')
	}
})

test('Exports API', () => {
  assert.equal(typeof findUp, 'function', 'undefined val')
})

test('Finds file from file', async () => {
  const startDir = path.resolve(__dirname, 'find.test.js')
  const file = await findUp(startDir, 'README.md')
  /*
  console.log('startAt', startDir)
  console.log('file', file)
  /** */
  assert.ok(file)
  assert.equal(path.basename(file || ''), 'README.md')
})

test('Finds file from dir', async () => {
  const startDir = path.resolve(__dirname, '../')
  const file = await findUp(startDir, 'README.md')
  const baseName = path.basename(file || '')
  /*
  console.log('startAt', startDir)
  console.log('file', file)
  /** */
  assert.ok(file)
  assert.equal(baseName, 'README.md')

  const startDirTwo = path.resolve(__dirname)
  const fileTwo = await findUp(startDirTwo, 'README.md')
  /*
  console.log('startDirTwo', startDirTwo)
  console.log('fileTwo', fileTwo)
  /** */
  assert.ok(fileTwo)
  assert.equal(baseName, 'README.md')
})

test('glob', async t => {
	// const result = await runGlobby(t, '*.tmp');
	// t.deepEqual(result.sort(), ['a.tmp', 'b.tmp', 'c.tmp', 'd.tmp', 'e.tmp']);

  const files = await getFilePaths(ROOT_DIR, {
    patterns: ['tmp/*.tmp'],
  })
  const foundFiles = convertToRelative(files, ROOT_DIR)
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [ 
    'tmp/a.tmp', 
    'tmp/b.tmp', 
    'tmp/c.tmp', 
    'tmp/d.tmp', 
    'tmp/e.tmp'
  ], 'one')

  const filesTwo = await getFilePaths(ROOT_DIR, {
    patterns: ['tmp/**/*.tmp'],
  })
  const foundFilesTwo = convertToRelative(filesTwo, ROOT_DIR)
  // console.log('foundFilesTwo', foundFilesTwo)
  assert.equal(foundFilesTwo, [
    'tmp/a.tmp',
    'tmp/b.tmp',
    'tmp/c.tmp',
    'tmp/d.tmp',
    'tmp/e.tmp',
    'tmp/sub/a.tmp',
    'tmp/sub/b.tmp',
    'tmp/sub/c.tmp',
    'tmp/sub/d.tmp',
    'tmp/sub/e.tmp'
  ], 'two')

  const filesThree = await getFilePaths(ROOT_DIR, {
    patterns: ['tmp/**/*.tmp'],
    ignore: ['tmp/**/c.tmp']
  })
  const foundFilesThree = convertToRelative(filesThree, ROOT_DIR)
  // console.log('foundFilesThree', foundFilesThree)
  assert.equal(foundFilesThree, [
    'tmp/a.tmp',
    'tmp/b.tmp',
    // 'tmp/c.tmp',
    'tmp/d.tmp',
    'tmp/e.tmp',
    'tmp/sub/a.tmp',
    'tmp/sub/b.tmp',
    //'tmp/sub/c.tmp',
    'tmp/sub/d.tmp',
    'tmp/sub/e.tmp'
  ], 'ignore')
})

test('getFilePaths - multiple file paths', async t => {
  const files = await getFilePaths(ROOT_DIR, {
    patterns: ['tmp/a.tmp', 'tmp/b.tmp'],
  })
  const foundFiles = convertToRelative(files, ROOT_DIR)
  // console.log('foundFilesTwo', foundFilesTwo)
  assert.equal(foundFiles, [
    'tmp/a.tmp',
    'tmp/b.tmp',
  ])
})

test.skip('getFilePaths - if empty patterns return all files', async () => {
  /* If called with no options, return all files */
  const filesOne = await getFilePaths(ROOT_DIR)
  // console.log('filesOne', filesOne)
	assert.ok(filesOne.length)
  assert.equal(filesOne.length > 50, true)

  /* If called with blank options, return all files */
  const filesTwo = await getFilePaths(ROOT_DIR, {})
  // console.log('filesTwo', filesTwo)
	assert.ok(filesTwo.length)
  assert.equal(filesTwo.length > 50, true)

  /* if called with empty patterns return all */
  const filesThree = await getFilePaths(ROOT_DIR, {
    patterns: [],
  })
	assert.ok(filesThree.length)
  assert.equal(filesThree.length > 50, true)
})

test('getFilePaths - string opt', async () => {
  /* If called with no options, return all files */
  const files = await getFilePaths(ROOT_DIR, '*.md')
  const foundFiles = convertToRelative(files, ROOT_DIR)
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [
    "Notes.md",
    'README.md',
  ])

  const filesTwo = await getFilePaths(ROOT_DIR, ['*.md', '*.json'])
  const foundFilesTwo = convertToRelative(filesTwo, ROOT_DIR)
  assert.equal(foundFilesTwo, [
    "Notes.md",
    'README.md',
    'package-lock.json',
    'package.json',
  ])
})

test('getFilePaths - first arg opts', async () => {
  /* If called with no options, return all files */
  const files = await getFilePaths({
    patterns: ['*.md']
  })
  const foundFiles = convertToRelative(files, ROOT_DIR)
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [
    "Notes.md",
    'README.md',
  ])

  const filesTwo = await getFilePaths({
    cwd: path.join(__dirname, '..'),
    patterns: ['*.md']
  })
  const foundFilesTwo = convertToRelative(filesTwo, ROOT_DIR)
  // console.log('foundFilesTwo', foundFilesTwo)
  assert.equal(foundFilesTwo, [
    "Notes.md",
    'README.md',
  ])
})

test('getFilePaths with multiple patterns', async () => {
  const files = await getFilePaths(TEMP_DIR, {
    patterns: [
      'a.tmp',
      '*.tmp',
      '!{c,d,e}.tmp'
    ],
    // exactStringMatch: true,
  })
  const foundFiles = convertToRelative(files, ROOT_DIR)
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [ 
    'tmp/a.tmp', 
    'tmp/b.tmp' 
  ], 'one')

  const filesTwo = await getFilePaths(TEMP_DIR, {
    patterns: [
      '**/**/a.tmp',
      '*.tmp',
      '!{c,d,e}.tmp'
    ],
   // exactStringMatch: true,
  })
  const foundFilesTwo = convertToRelative(filesTwo, ROOT_DIR)
  // console.log('foundFilesTwo', foundFilesTwo)
  assert.equal(foundFilesTwo, [ 
    'tmp/a.tmp', 
    'tmp/b.tmp', 
    'tmp/sub/a.tmp' 
  ], 'two')
})

test('return all none matching files for all negative patterns', async t => {
  const files = await getFilePaths(TEMP_DIR, {
    patterns: ['!a.tmp', '!b.tmp'],
  })
  const foundFiles = convertToRelative(files, ROOT_DIR)
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [
    'tmp/c.tmp',
    'tmp/d.tmp',
    'tmp/e.tmp',
    'tmp/sub/a.tmp',
    'tmp/sub/b.tmp',
    'tmp/sub/c.tmp',
    'tmp/sub/d.tmp',
    'tmp/sub/e.tmp'
  ])
})

test('getFilePaths with REGEX /\.test\.js?$/', async () => {
  const files = await getFilePaths(ROOT_DIR, {
    patterns: [
      /\.test\.js$/,
    ],
    ignore: [
      /node_modules/,
    ],
  })
  const foundFiles = convertToRelative(files, ROOT_DIR).sort()
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [
    "tests/get-file-path.test.js",
    'tests/find.test.js',
  ].sort())
})

test('getFilePaths with REGEX string', async () => {
  const files = await getFilePaths(ROOT_DIR, {
    patterns: [
      '/.test.js$/',
      //'tests/find.test.js',
    ],
    ignore: [
      /node_modules/,
    ],
  })
  const foundFiles = convertToRelative(files, ROOT_DIR).sort()
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [
    "tests/get-file-path.test.js",
    'tests/find.test.js',
  ].sort())
})

test('getFilePaths /\.mdx?$/, /\.test\.js$/', async () => {
  const files = await getFilePaths(ROOT_DIR, {
    patterns: [
      // /fixtures\/md\/(.*)\.mdx?$/,
      /(.*)\.mdx?$/,
      // /\.js$/,
      /\.test\.js$/,
    ],
    ignore: [
      // /^node_modules\//,
      /node_modules/,
      // /\.git/, 
      // /NOTES\.md/
    ],
    //excludeGitIgnore: true,
    excludeHidden: true,
  })
  const foundFiles = convertToRelative(files, ROOT_DIR).sort()
  // console.log('foundFiles', foundFiles)
  assert.equal(foundFiles, [
    'Notes.md',
    'README.md',
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
    'tests/fixtures/md/mdx-file.mdx',
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
    'tests/fixtures/md/transform-wordCount.md',
    'tests/find.test.js',
    "tests/get-file-path.test.js",
  ].sort())
})

test('getFilePaths glob string', async () => {
  /*
  const x = await glob('**.md')
  console.log(x)
  process.exit(1)
  /** */

  const files = await getFilePaths(ROOT_DIR, {
    patterns: [
      /\.test\.js?$/,
      // /(.*)\.mdx?$/,
      'tests/fixtures/md/**.{md,mdx}'
      // /^[^\/]+\.md?$/,
      // '**.json',
      // '**/**.js',
      // '**.md',
      //'/(.*).md$/',
      // '/^test/',
      // 'test/**'
      ///(.*)\.md/g
    ],
    ignore: [
      // /^node_modules\//,
      /node_modules/,
      // /(.*)\.js$/,
      // /\.git/,
      // /NOTES\.md/
    ],
    excludeGitIgnore: true,
    excludeHidden: true,
  })
  const foundFiles = convertToRelative(files, ROOT_DIR).sort()
  // console.log('foundFiles', foundFiles)
  assert.is(Array.isArray(files), true)
  assert.equal(foundFiles, [
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
    'tests/fixtures/md/mdx-file.mdx',
    'tests/fixtures/md/missing-transform.md',
    'tests/fixtures/md/mixed.md',
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
    'tests/fixtures/md/transform-wordCount.md',
    'tests/find.test.js',
    "tests/get-file-path.test.js",
  ].sort())
})

test('getGitignoreContents', async () => {
  const files = await getGitignoreContents()
  // console.log('files', files)
  assert.is(Array.isArray(files), true)
  assert.equal(files, [
    'logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'tmp',
    'pids',
    '*.pid',
    '*.seed',
    '*.pid.lock',
    'lib-cov',
    'coverage',
    '.nyc_output',
    '.grunt',
    'bower_components',
    '.lock-wscript',
    'build/Release',
    'node_modules',
    'jspm_packages',
    'typings',
    '.npm',
    '.eslintcache',
    '.node_repl_history',
    '*.tgz',
    '.yarn-integrity',
    '.env',
    '.env.test',
    '.cache',
    '.next',
    '.nuxt',
    '.vuepress/dist',
    '.serverless',
    '.fusebox',
    '.dynamodb',
    '.DS_Store',
    '.AppleDouble',
    '.LSOverride',
    'Icon',
    '._*',
    '.DocumentRevisions-V100',
    '.fseventsd',
    '.Spotlight-V100',
    '.TemporaryItems',
    '.Trashes',
    '.VolumeIcon.icns',
    '.com.apple.timemachine.donotpresent',
    '.AppleDB',
    '.AppleDesktop',
    'Network Trash Folder',
    'Temporary Items',
    '.apdisk'
  ])
})

test('Opts - relativePaths. return relative paths', async () => {
  const files = await getFilePaths(ROOT_DIR, {
    relativePaths: true,
    patterns: [
     '**/**.md',
    ],
    ignore: [
      /node_modules/,
    ],
  })
  /*
  console.log('files', files)
  /** */
  assert.equal(files, [
    'Notes.md',
    'README.md',
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
  ])
})

test('Opts - caseInsensitive. return matches regardless of casing', async () => {
  const files = await getFilePaths(ROOT_DIR, {
    relativePaths: true,
    caseInsensitive: true,
    // debug: true,
    patterns: [
     '**/README.md',
    ],
    ignore: [
     // /node_modules/,
    ],
  })
  // console.log('files', files)
  assert.equal(files, [
    'README.md',
    'node_modules/@nodelib/fs.scandir/README.md',
    'node_modules/@nodelib/fs.stat/README.md',
    'node_modules/@nodelib/fs.walk/README.md',
    'node_modules/braces/README.md',
    'node_modules/dequal/readme.md',
    'node_modules/diff/README.md',
    'node_modules/fast-glob/README.md',
    'node_modules/fastq/README.md',
    'node_modules/fill-range/README.md',
    'node_modules/glob-parent/README.md',
    'node_modules/globrex/readme.md',
    'node_modules/is-extglob/README.md',
    'node_modules/is-glob/README.md',
    'node_modules/is-number/README.md',
    'node_modules/kleur/readme.md',
    'node_modules/merge2/README.md',
    'node_modules/micromatch/README.md',
    'node_modules/mri/readme.md',
    'node_modules/picomatch/README.md',
    'node_modules/queue-microtask/README.md',
    'node_modules/reusify/README.md',
    'node_modules/run-parallel/README.md',
    'node_modules/sade/readme.md',
    'node_modules/to-regex-range/README.md',
    'node_modules/uvu/readme.md'
  ])
})

async function getIgnores(dir){
  const files = await getGitignoreContents()
  console.log('files', files)
}
//getIgnores(process.cwd())

/* Cleanup temp files */
test.after(() => {
  console.log('\nTest CLEANUP complete')
  for (const element of fixture) {
		fs.unlinkSync(path.join(TEMP_DIR, element))
		fs.unlinkSync(path.join(TEMP_SUB_DIR, element))
	}

  fs.rmdirSync(path.join(TEMP_SUB_DIR))
	fs.rmdirSync(path.join(TEMP_DIR))
  console.log(GREEN, `Done.`)
})

test.run()