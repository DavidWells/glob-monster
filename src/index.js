const fs = require('fs').promises
const cwd = require('process').cwd
const path = require('path')
const fg = require('fast-glob')
const globrex = require('globrex')
const isGlob = require('is-glob')
const { getGitignoreContents } = require('./utils/get-gitignore')
// const isLocalPath = require('is-local-path')

// https://github.com/kgryte/regex-regex/blob/master/lib/index.js
// const REGEX_REGEX = /^\/((?:\\\/|[^\/])+)\/([imgy]*)$/
const REGEX_REGEX = /^\/((?:\\\/|[^\/]|\[\^.*\/*\])+)\/([imgy]*)$/
const IS_HIDDEN_FILE = /(^|[\\\/])\.[^\\\/\.]/g
const globRexOpts = {
  globstar: true,
  extended: true
}

async function findUp(start, fileName) {
  return escalade(start, (dir, relativePaths) => {
    /*
    console.log('~> dir:', dir);
    console.log('~> relativePaths:', relativePaths);
    /** */
    // console.log('---')
    if (typeof fileName === 'string' && relativePaths.includes(fileName)) {
      // will be resolved into absolute
      return fileName
    }
    if (fileName instanceof RegExp) {
      const found = relativePaths.find((relativePath) => relativePath.match(fileName))
      if (found) return found
    }
  })
}

async function find(globPattern, opts = {}) {
  opts.patterns = ensureArray(globPattern)
  opts.excludeGitIgnore = (typeof opts.excludeGitIgnore !== 'undefined') ? opts.excludeGitIgnore : true
  const directory = opts.cwd || process.cwd()
  if (opts.debug) {
    console.log('find in directory', directory)
    console.log('find in opts', opts)
  }
  return getFilePaths(directory, opts)
}

// alt https://github.com/duniul/clean-modules/blob/33b66bcfb7825e1fa1eb1e296e523ddba374f1ae/src/utils/filesystem.ts#L92
// Alt https://github.com/AvianFlu/ncp
async function getFilePaths(dirName, opts = {}) {
  const _opts = typeof dirName === 'object' ? dirName : opts
  const directory = typeof dirName === 'object' ? (_opts.cwd || cwd()) : dirName
  const options = typeof _opts === 'object' ? _opts : {}
  /* Second opt a string or array use it as patterns */
  if (typeof opts === 'string' || Array.isArray(opts)) {
    options.patterns = ensureArray(opts)
  }
  const {
    patterns = [],
    ignore = [],
    excludeGitIgnore = false,
    excludeHidden = false,
    relativePaths = false,
    caseInsensitive = false,
    debug = false
  } = options

  if (debug) {
    console.log('getFilePaths directory', directory)
    console.log('getFilePaths options', options)
  }

  let findPattern
  let ignorePattern
  let hasRegex = false
  let filePaths = []
  let gitIgnoreFiles = []
  let gitIgnoreGlobs = []
  const flags = (caseInsensitive) ? 'i' : ''

  const _patterns = ensureArray(patterns)
  const _ignorePattern = ensureArray(ignore)
  const _findPattern = []
  for (let i = 0; i < _patterns.length; i++) {
    const pat = _patterns[i]
    /* Push negated patterns to ignore list */
    if (typeof pat === 'string' && pat[0] === '!') {
      _ignorePattern.push(pat)
      continue
    }
    _findPattern.push(pat)
  }

  /*
  console.log('FIND patterns', _findPattern)
  console.log('IGNORE patterns', _ignorePattern)
  /** */

  if (_findPattern && _findPattern.length) {
    const findResults = combineRegexPatterns(_findPattern, flags)
    findPattern = findResults[0]
    hasRegex = findResults[1]
  }
  if (_ignorePattern && _ignorePattern.length) {
    const ignoreResults = combineRegexPatterns(_ignorePattern, flags)
    ignorePattern = ignoreResults[0]
    hasRegex = ignoreResults[1]
  }

  if (debug) {
    //*
    console.log('findPattern', findPattern)
    console.log('ignorePattern', ignorePattern)
    /** */
  }

  if (excludeGitIgnore) {
    const gitIgnoreContents = await getGitignoreContents()
    for (let index = 0; index < gitIgnoreContents.length; index++) {
      const ignoreItem = gitIgnoreContents[index]
      // console.log('ignoreItem', ignoreItem)
      if (isGlob(ignoreItem)) {
        gitIgnoreGlobs.push(ignoreItem)
      } else {
        gitIgnoreFiles.push(
          ignoreItem.replace(/^\.\//, '') // normalize relative paths
        )
      }
    }
  }

  /* If only ignore patterns do longer lookup */
  const onlyIgnorePatterns = (_ignorePattern.length && !_findPattern.length)

  if (!hasRegex && !onlyIgnorePatterns) {
    if (debug) {
      console.log('No regex, use faster lookup')
    }
    const fixIgnores = _ignorePattern.map((x) => {
      return (x.match(/^!/)) ? x :  `!${x}`
    })
    const finalFastPatterns = _findPattern.concat(fixIgnores)
    // console.log('finalFastPatterns', finalFastPatterns)
    const entries = fg.globSync(finalFastPatterns, {
      cwd: directory,
      // dot: true, 
      globstar: true,
      extended: true,
      absolute: true,
      caseSensitiveMatch: !caseInsensitive
      // braceExpansion: true
    })

    if (relativePaths) {
      return convertToRelative(entries, directory)
    }

    return entries
  }

  if (debug) {
    console.log('Regex found, look thru all files')
  }
  /*
  console.log('findPattern', findPattern)
  console.log('ignorePattern', ignorePattern)
  console.log('gitIgnoreFiles', gitIgnoreFiles)
  console.log('gitIgnoreGlobs', gitIgnoreGlobs)
  // process.exit(1)
  /** */

  await totalist(directory, (relativePath, absolutePath, stats) => {
    //const absolutePath = `${directory}/${relativePath}`
    //*
    // console.log('directory', abs)
    // console.log('absolutePath', absolutePath)
    // console.log('relativePath', relativePath)
    /** */

    /* Remove hidden files */
    if (excludeHidden && IS_HIDDEN_FILE.test(relativePath)) {
      return
    }

    /* Remove files in git ignore */
    if (excludeGitIgnore && gitIgnoreFiles.length) {
      if (gitIgnoreFiles.includes(relativePath)) return
      if (gitIgnoreFiles.includes(path.basename(relativePath))) return
      //*
      const topLevelDir = relativePath.substring(0, relativePath.indexOf('/'))
      // console.log('topLevelDir', topLevelDir)
      // slower lookup
      if (gitIgnoreFiles.some((ignore) => {
        // console.log('ignore', ignore)
        // return relativePath.indexOf(ignore) > -1
        // return relativePath.split('/')[0] === ignore
        return topLevelDir === ignore || relativePath === ignore
      })) {
        return
      }
      /** */
    }

    /* Remove files in ignore array */
    if (ignorePattern && ignorePattern.test(relativePath)) {
      // Alt checker https://github.com/axtgr/wildcard-match
      return
    }

    /* If no patterns supplied add all files */
    if (!findPattern) {
      filePaths.push(absolutePath)
      return
    }

    /* If pattern match add file! */
    // Alt match https://github.com/micromatch/picomatch
    if (findPattern.test(absolutePath)) {
      // console.log('Match absolutePath', absolutePath)
      filePaths.push(absolutePath)
      return
    }

    /* If pattern match add file! */
    if (findPattern.test(relativePath)) {
      // console.log('Match relativePath', relativePath)
      filePaths.push(absolutePath)
      return
    }

    /*
    let ignored = false
    for (let index = 0; index < ignore.length; index++) {
      const pattern = ignore[index]
      if (pattern.test(absolutePath)) {
        ignored = true
      }
    }
    if (!ignored) {
      filePaths.push(absolutePath)
    }
    /** */
	})

  /* Ignore patterns from .gitignore files */
  if (gitIgnoreGlobs && gitIgnoreGlobs.length) {
    // console.log('gitIgnoreGlobs', gitIgnoreGlobs)
    let removeFiles = []
    for (let index = 0; index < gitIgnoreGlobs.length; index++) {
      const glob = gitIgnoreGlobs[index]
      const result = globrex(glob) // alt lib https://github.com/axtgr/wildcard-match
      // console.log('result', result)
      for (let n = 0; n < filePaths.length; n++) {
        const file = filePaths[n]
        if (result.regex.test(file)) {
          removeFiles.push(file)
        }
      }
    }
    /* Remove files that match glob pattern */
    if (removeFiles.length) {
      filePaths = filePaths.filter(function(el) {
        return removeFiles.indexOf(el) < 0
      })
    }
  }

  if (relativePaths) {
    return convertToRelative(filePaths, directory)
  }

  return filePaths
}

// https://github.com/lukeed/escalade
async function escalade(start, callback) {
	let dir = path.resolve('.', start)
	let tmp, stats = await fs.stat(dir)

	if (!stats.isDirectory()) {
		dir = path.dirname(dir)
	}

	while (true) {
		tmp = await callback(dir, await fs.readdir(dir))
		if (tmp) return path.resolve(dir, tmp)
		dir = path.dirname(tmp = dir)
		if (tmp === dir) break;
	}
}

// https://github.com/lukeed/totalist
async function totalist(dir, callback, pre='') {
	dir = path.resolve('.', dir)
	await fs.readdir(dir).then(arr => {
		return Promise.all(arr.map((str) => {
      let abs = path.join(dir, str)
      return fs.stat(abs).then((stats) => {
        return stats.isDirectory() ? totalist(abs, callback, path.join(pre, str)) : callback(path.join(pre, str), abs, stats)
      })
    }))
	})
}

function combineRegexPatterns(patterns = [], flags) {
  let hasRegex = false
  const patternString = patterns.map((pat) => {
    // console.log('pat', pat)
    if (isRegex(pat)) {
      hasRegex = true
      return pat.source
    } else if (typeof pat === 'string' && REGEX_REGEX.test(pat)) {
      hasRegex = true
      const regexInfo = pat.match(REGEX_REGEX)
      // console.log('regexInfo', regexInfo)
      if (regexInfo && regexInfo[1]) {
        let strMatch = regexInfo[1]
        // console.log('strMatch', strMatch)
        let prefix = ''
        let postFix = ''
        if (strMatch[0] === '^') {
          strMatch = strMatch.substring(1)
          prefix = '^'
        }
        /* If last char is $ */
        if (strMatch[strMatch.length - 1] === '$') {
          strMatch = strMatch.substring(0, strMatch.length - 1)
          postFix = '$'
        }
        // escapeRegexString
        const combined = prefix + escapeRegexString(strMatch) + postFix
        // const combined = prefix + strMatch + postFix
        // console.log('combined', combined)
        // return prefix + strMatch + postFix
        return combined
      }
    } else if (isGlob(pat)) {
      // console.log('isGlob pat', pat)
      let finalPattern = pat
      if (pat[0] === '!') {
        finalPattern = pat.substr(1, pat.length - 1)
      } else if (pat[0] === '.' && pat[1] === '/') {
        finalPattern = pat.substr(2, pat.length - 1)
      } else if (pat[0] === '/') {
        // finalPattern = pat.substr(1, pat.length - 1)
      }

      const result = globrex(finalPattern, globRexOpts)
      // console.log('result', result)
      return result.regex.source
    }
    /*
    console.log('Fall through pattern', pat)
    /** */
    if (pat === 'node_modules') {
      return pat
    }
    /* If str and starts with / */
    if (pat[0] === '/') {
      return '^' + ensureTrailingSlash(pat.substr(1, pat.length - 1))
    }
    /* If str and starts with ./ */
    if (pat[0] === '.' && pat[1] === '/') {
      return '^' + ensureTrailingSlash(pat.substr(2, pat.length - 1))
    }
    // const prefix = (pat[0] === '.') ? '' : '^'
    return '^' + pat + '$'
  }).join('|')
  /*
  console.log('patternString', patternString)
  /** */
  return [
    new RegExp(patternString, flags),
    hasRegex
  ]
}

function ensureTrailingSlash(str = '') {
  return (str[str.length-1] === '/') ? str : str + '/'
}

function ensureArray(thing) {
  return Array.isArray(thing) ? thing : [thing]  // (typeof thing === 'string' || isRegex(thing)) ? [thing] : thing
}

function convertToRelative(files, dir) {
  return files.map((f) => toRelativePath(f, dir)).sort()
}

function toRelativePath(file, cwd) {
  return file.replace(cwd, '').replace(/^\//, '')
}

// slash at the beginning of a filename
const leadingPathSeparator = new RegExp(`^${escapeRegexString(path.sep)}`)
const windowsLeadingPathSeparator = new RegExp('^/')
// all slashes in the filename. path.sep is OS agnostic (windows, mac, etc)
const pathSeparator = new RegExp(escapeRegexString(path.sep), 'g')
const windowsPathSeparator = new RegExp('/', 'g')
// handle MS Windows style double-backslashed filenames
const windowsDoubleSlashSeparator = new RegExp('\\\\', 'g')
// derive `foo.bar.baz` object key from `foo/bar/baz.yml` filename
function fileNameToKey(filename) {
  // const extension = new RegExp(`${path.extname(filename)}$`)
  const key = filename
    // .replace(extension, '')
    .replace(leadingPathSeparator, '')
    .replace(windowsLeadingPathSeparator, '')
    .replace(pathSeparator, '.')
    .replace(windowsPathSeparator, '.')
    .replace(windowsDoubleSlashSeparator, '.')

  return key
}

// https://github.com/regexhq/unc-path-regex/blob/master/index.js
function isUncPath(filepath) {
  return /^[\\\/]{2,}[^\\\/]+[\\\/]+[^\\\/]+/.test(filepath)
}
function isRelative(filepath) {
  const isRel = !isUncPath(filepath) && !/^([a-z]:)?[\\\/]/i.test(filepath)
  // console.log(`isRel ${filepath}`, isRel)
  return isRel
}
/* Find common parts of 2 paths */
function resolveCommonParent(mainDir = '', fileDir = '') {
  const parts = mainDir.split('/')
  let acc = ''
  let value = ''
  for (let i = 0; i < parts.length; i++) {
    const element = parts[i]
    acc+= ((i) ? '/' : '') + element
    if (fileDir.startsWith(acc)) {
      value = acc
    }
  }
  return value
}

function isRegex(thing) {
  return (thing instanceof RegExp)
}

function resolveOutputPath(cwd, outputDir, file) {
  // console.log('file', file)
  const fileCommon = resolveCommonParent(cwd, file)
  // console.log('fileCommon', fileCommon)
  const remove = resolveCommonParent(outputDir, file)
  const fileName = file.replace(remove, '').replace(fileCommon, '')
  let outputFilePath = path.join(outputDir, fileName)
  if (isRelative(outputDir)) {
    outputFilePath = path.join(cwd, outputDir, fileName)
  }
  // console.log('isRelative(outputDir)', isRelative(outputDir))
  // console.log('outputDir', outputDir)
  // console.log('fileName', fileName)
  // console.log('remove', remove)
  return outputFilePath
}

function resolveFlatPath(cwd, outputDir, file) {
  /* old setup */
  const fileName = path.basename(file)
  let outputFilePath = path.join(outputDir, fileName)
  if (isRelative(outputDir)) {
    outputFilePath = path.join(cwd, outputDir, fileName)
  }
  return outputFilePath
}

function depth(string) {
  return path.normalize(string).split(path.sep).length - 1
}

function escapeRegexString(string) {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string')
	}

  // const match = string.match(/\[([^\]]*)\](.?)/)
  // if (match) {
  //   console.log('match', match)
  // }
	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d')
}

module.exports = {
  find,
  findUp,
  getFilePaths,
  // resolveOutputPath,
  // resolveFlatPath,
  // resolveCommonParent,
  toRelativePath,
  convertToRelative
}