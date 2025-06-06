# glob-monster

Moved to https://github.com/DavidWells/packages/tree/master/packages/util-globs

<img align="right" width="100" height="100" src="./.github/logo.png">File globber that understands globs or regex.

See [tests](./tests/) for more details.

## Install

```
npm install glob-monster
```

## Usage

```js
const { find, getFilePaths } = require('glob-monster')

const opts = {}
const files = await find(['**.md'], opts)
console.log(files)
/* [
  'README.md',
  'node_modules/dequal/readme.md',
] */

const opts = {}
const filesViaRegex = await find([/\.md$/], {})
console.log(filesViaRegex)
/* files [
  'README.md',
  'node_modules/dequal/readme.md',
] */

const mdxAndTestFiles = await getFilePaths(ROOT_DIR, {
  patterns: [
    /(.*)\.mdx?$/,
    /\.test\.js$/,
  ],
  ignore: [
    /node_modules/,
  ],
  excludeGitIgnore: true,
  excludeHidden: true,
})
```

## About

I wanted a easy way to use glob patterns or regular expressions to locate files. Thus, this package was born.

String globs match via [micromatch](https://github.com/micromatch/micromatch) and [is-glob](https://github.com/micromatch/is-glob/).

### Basic syntax

* An asterisk (`*`) — matches everything except slashes (path separators), hidden files (names starting with `.`).
* A double star or globstar (`**`) — matches zero or more directories.
* Question mark (`?`) – matches any single character except slashes (path separators).
* Sequence (`[seq]`) — matches any character in sequence.

> :book: A few additional words about the [basic matching behavior][picomatch_matching_behavior].

Some examples:

* `src/**/*.js` — matches all files in the `src` directory (any level of nesting) that have the `.js` extension.
* `src/*.??` — matches all files in the `src` directory (only first level of nesting) that have a two-character extension.
* `file-[01].js` — matches files: `file-0.js`, `file-1.js`.

### Advanced syntax

* [Escapes characters][micromatch_backslashes] (`\\`) — matching special characters (`$^*+?()[]`) as literals.
* [POSIX character classes][picomatch_posix_brackets] (`[[:digit:]]`).
* [Extended globs][micromatch_extglobs] (`?(pattern-list)`).
* [Bash style brace expansions][micromatch_braces] (`{}`).
* [Regexp character classes][micromatch_regex_character_classes] (`[1-5]`).
* [Regex groups][regular_expressions_brackets] (`(a|b)`).

> :book: A few additional words about the [advanced matching behavior][micromatch_extended_globbing].

Some examples:

* `src/**/*.{css,scss}` — matches all files in the `src` directory (any level of nesting) that have the `.css` or `.scss` extension.
* `file-[[:digit:]].js` — matches files: `file-0.js`, `file-1.js`, …, `file-9.js`.
* `file-{1..3}.js` — matches files: `file-1.js`, `file-2.js`, `file-3.js`.
* `file-(1|2)` — matches files: `file-1.js`, `file-2.js`.
