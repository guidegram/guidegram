import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting IPC Handlers Uniqueness & Resilience Verification...')

const mainTsPath = path.join(rootDir, 'electron', 'main.ts')
assert(fs.existsSync(mainTsPath), 'electron/main.ts must exist')
const content = fs.readFileSync(mainTsPath, 'utf-8')

const regex = /ipcMain\.(handle|on)\s*\(\s*['"]([^'"]+)['"]/g
let match
const counts = {}
const lines = {}
while ((match = regex.exec(content)) !== null) {
  const channel = match[2]
  counts[channel] = (counts[channel] || 0) + 1
  const lineNum = content.substring(0, match.index).split('\n').length
  lines[channel] = lines[channel] || []
  lines[channel].push(lineNum)
}

const duplicates = []
for (const [ch, count] of Object.entries(counts)) {
  if (count > 1) {
    duplicates.push({ channel: ch, count, lines: lines[ch] })
  }
}

assert.strictEqual(
  duplicates.length,
  0,
  `Duplicate IPC channel registrations detected in electron/main.ts:\n${JSON.stringify(duplicates, null, 2)}`
)
console.log(`  ✅ All ${Object.keys(counts).length} IPC channels are uniquely registered without collisions.`)

// Verify defensive setupIpcHandlers call
assert(
  content.includes('setupIpcHandlers()'),
  'electron/main.ts must call setupIpcHandlers()'
)
assert(
  content.includes('createWindow()') && content.includes('createTray()'),
  'electron/main.ts must call createTray() and createWindow()'
)

console.log('🎉 IPC Handlers Uniqueness & Resilience verification passed successfully!')
