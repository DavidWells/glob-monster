const fs = require('fs').promises
const path = require('path')
const globrex = require('globrex')
const isGlob = require('is-glob')
const isLocalPath = require('is-local-path')

// https://github.com/kgryte/regex-regex/blob/master/lib/index.js
const REGEX_REGEX = /^\/((?:\\\/|[^\/])+)\/([imgy]*)$/
const IS_HIDDEN_FILE = /(^|[\\\/])\.[^\\\/\.]/g

function isRegex(thing) {
  return (thing instanceof RegExp)
}

async function findUp(start, fileName) {
  const file = await escalade(start, (dir, relativePaths) => {
    console.log('~> dir:', dir);
    console.log('~> relativePaths:', relativePaths);
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
  return file
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
  const patternString = patterns.map((pat) => {
    if (isRegex(pat)) {
      return pat.source
    } else if (typeof pat === 'string' && REGEX_REGEX.test(pat)) {
      const regexInfo = pat.match(REGEX_REGEX)
      // console.log('regexInfo', regexInfo)
      if (regexInfo && regexInfo[1]) {
        let strMatch = regexInfo[1]
        let prefix = ''
        let postFix = ''
        if (strMatch[0] === '^') {
          strMatch = strMatch.substring(1, strMatch.length - 1)
          prefix = '^'
        }
        /* If last char is $ */
        if (strMatch[strMatch.length - 1] === '$') {
          strMatch = strMatch.substring(0, strMatch.length - 1)
          postFix = '$'
        }
        // escapeRegexString
        return prefix + escapeRegexString(strMatch) + postFix
      }
    } else if (isGlob(pat)) {
      console.log('isGlob pat', pat)
      let finalPattern = pat
      if (pat[0] === '!') {
        finalPattern = pat.substr(1, pat.length - 1)
      } else if (pat[0] === '.' && pat[1] === '/') {
        finalPattern = pat.substr(2, pat.length - 1)
      } else if (pat[0] === '/') {
        finalPattern = pat.substr(1, pat.length - 1)
      }

      const result = globrex(finalPattern, {
        globstar: true,
        extended: true
      })
      // console.log('result', result)
      return result.regex.source
    }
    console.log('Fall through', pat)
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
  console.log('patternString', patternString)
  return new RegExp(patternString, flags)
}

function ensureTrailingSlash(str = '') {
  return (str[str.length-1] === '/') ? str : str + '/'
}

function ensureArray(thing) {
  return (typeof thing === 'string') ? [thing] : thing
}

async function globber(globPattern, opts = {}) {
  const globs = ensureArray(globPattern)
  opts.patterns = globs
  opts.excludeGitIgnore = (typeof opts.excludeGitIgnore !== 'undefined') ? opts.excludeGitIgnore : true
  const dir = opts.cwd || process.cwd()
  console.log('dir', dir)
  console.log('opts', opts)
  return getFilePaths(dir, opts)
}

// alt https://github.com/duniul/clean-modules/blob/33b66bcfb7825e1fa1eb1e296e523ddba374f1ae/src/utils/filesystem.ts#L92
// Alt https://github.com/AvianFlu/ncp
async function getFilePaths(dirName, {
  patterns = [],
  ignore = [],
  excludeGitIgnore = false,
  excludeHidden = false,
  relativePaths = false,
  caseInsensitive = false
}) {
  let findPattern
  let ignorePattern
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

  if (_findPattern && _findPattern.length) {
    console.log('FIND patterns', _findPattern)
    findPattern = combineRegexPatterns(_findPattern, flags)
  }
  if (_ignorePattern && _ignorePattern.length) {
    console.log('IGNORE patterns', _ignorePattern)
    ignorePattern = combineRegexPatterns(_ignorePattern, flags)
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
  
  /*
  console.log('findPattern', findPattern)
  console.log('ignorePattern', ignorePattern)
  console.log('gitIgnoreFiles', gitIgnoreFiles)
  console.log('gitIgnoreGlobs', gitIgnoreGlobs)
  // process.exit(1)
  /** */

  await totalist(dirName, (relativePath, absolutePath, stats) => {
    //const absolutePath = `${dirName}/${relativePath}`
    //*
    // console.log('dirName', abs)
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
    return convertToRelative(filePaths, dirName)
  }

  return filePaths
}

function convertToRelative(files, dir) {
  return files.map((f) => toRelativePath(f, dir)).sort()
}

function toRelativePath(file, cwd) {
  return file.replace(cwd, '').replace(/^\//, '')
}

async function getGitignoreContents(filePath = '.gitignore') {
  try {
    const gitIgnoreContent = await fs.readFile(filePath, { encoding: 'utf8' })
    return gitIgnoreContent
      .split(/\r?\n/)
      .filter((line) => !/^\s*$/.test(line) && !/^\s*#/.test(line))
      .map((line) => line.trim().replace(/^\/+|\/+$/g, ''))
  } catch (_a) {
    return []
  }
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
    const element = parts[i];
    acc+= ((i) ? '/' : '') + element
    if (fileDir.startsWith(acc)) {
      value = acc
    }
  }
  return value
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
	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
}

module.exports = {
  globber,
  isLocalPath,
  findUp,
  getFilePaths,
  resolveOutputPath,
  resolveFlatPath,
  resolveCommonParent,
  getGitignoreContents,
  toRelativePath,
  convertToRelative
}