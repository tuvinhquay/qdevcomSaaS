import fs from 'node:fs/promises'
import path from 'node:path'

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function copyDir(fromDir, toDir) {
  await fs.mkdir(toDir, { recursive: true })
  const entries = await fs.readdir(fromDir, { withFileTypes: true })

  await Promise.all(
    entries.map(async (entry) => {
      const fromPath = path.join(fromDir, entry.name)
      const toPath = path.join(toDir, entry.name)

      if (entry.isDirectory()) {
        await copyDir(fromPath, toPath)
        return
      }

      if (entry.isFile()) {
        await fs.mkdir(path.dirname(toPath), { recursive: true })
        await fs.copyFile(fromPath, toPath)
      }
    }),
  )
}

async function main() {
  const projectRoot = process.cwd()
  const srcAssetsDir = path.join(projectRoot, 'src', 'assets')
  const publicAssetsDir = path.join(projectRoot, 'public', 'assets')

  if (!(await pathExists(srcAssetsDir))) return
  await copyDir(srcAssetsDir, publicAssetsDir)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[sync-assets] Failed to sync assets:', err)
  process.exitCode = 1
})
