const fs = require('fs').promises

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

module.exports = {
  getGitignoreContents
}