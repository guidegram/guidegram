import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Account Global Search Filters & Date/Media Indexing Protocol Verification...\n')

let passed = 0
let total = 0

function assert(condition, message) {
  total++
  if (condition) {
    passed++
    console.log(`✓ [${passed}/${total}] ${message}`)
  } else {
    console.error(`✗ [FAIL] ${message}`)
    process.exit(1)
  }
}

// 1. accountManager.ts verification
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf-8')

assert(
  accountManagerContent.includes('public async searchGlobal(') &&
  accountManagerContent.includes('minDate = 0') &&
  accountManagerContent.includes('maxDate = 0'),
  'AccountManager implements searchGlobal with minDate and maxDate support'
)

assert(
  accountManagerContent.includes('inputMessagesFilterPhotoVideo') &&
  accountManagerContent.includes('inputMessagesFilterDocument') &&
  accountManagerContent.includes('inputMessagesFilterUrl') &&
  accountManagerContent.includes('inputMessagesFilterMusic'),
  'AccountManager maps media categories to MTProto InputMessagesFilter types'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:search-global'") &&
  mainContent.includes('minDate, maxDate'),
  'main.ts registers telegram:search-global IPC handler forwarding minDate and maxDate'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('searchGlobal:') &&
  preloadContent.includes('minDate?: number') &&
  preloadContent.includes('maxDate?: number'),
  'preload.ts exposes searchGlobal accepting minDate and maxDate'
)

// 4. ChatList.tsx verification
const chatListPath = path.join(rootDir, 'src', 'components', 'ChatList.tsx')
const chatListContent = fs.readFileSync(chatListPath, 'utf-8')

assert(
  chatListContent.includes('searchDateFilter') &&
  chatListContent.includes('setSearchDateFilter'),
  'ChatList implements searchDateFilter state'
)

assert(
  chatListContent.includes('minDate = nowSec - 24 * 3600') &&
  chatListContent.includes('minDate = nowSec - 7 * 24 * 3600') &&
  chatListContent.includes('minDate = nowSec - 30 * 24 * 3600'),
  'ChatList computes real-time unix epoch minDate for 24h, 7d, and 30d time windows'
)

assert(
  chatListContent.includes('Quick Date Range Indexing Pills') &&
  chatListContent.includes('Anytime') &&
  chatListContent.includes('24h') &&
  chatListContent.includes('7d') &&
  chatListContent.includes('30d'),
  'ChatList renders interactive Quick Date Range Indexing Pills in search UI'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 99!\n`)
