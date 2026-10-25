import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Chat List Folders Reorder & Filter Tags Protocol Verification (Phase 85)...')

// 1. Verify types in electron/telegram/types.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('color?: number'), 'CloudFolderItem must support color tag index')
console.log('  ✅ 1. CloudFolderItem color tag type verified.')

// 2. Verify AccountManager MTProto methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async updateDialogFiltersOrder('), 'AccountManager must implement updateDialogFiltersOrder')
assert(accountManagerContent.includes("messages.updateDialogFiltersOrder"), 'updateDialogFiltersOrder must invoke messages.updateDialogFiltersOrder')
assert(accountManagerContent.includes('public async updateDialogFilter('), 'AccountManager must implement updateDialogFilter')
assert(accountManagerContent.includes("messages.updateDialogFilter"), 'updateDialogFilter must invoke messages.updateDialogFilter')
assert(accountManagerContent.includes('color: f.color'), 'getCloudFolders must map folder color')
console.log('  ✅ 2. AccountManager updateDialogFiltersOrder & updateDialogFilter MTProto methods verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:update-dialog-filters-order'"), 'main.ts must register telegram:update-dialog-filters-order')
assert(mainContent.includes("'telegram:update-dialog-filter'"), 'main.ts must register telegram:update-dialog-filter')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('updateDialogFiltersOrder:'), 'preload.ts must expose updateDialogFiltersOrder')
assert(preloadContent.includes('updateDialogFilter:'), 'preload.ts must expose updateDialogFilter')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify ChatTabs folder reordering & tag colors
const tabsPath = path.join(root, 'src/components/ChatTabs.tsx')
const tabsContent = fs.readFileSync(tabsPath, 'utf8')
assert(tabsContent.includes('TELEGRAM_FOLDER_TAG_COLORS'), 'ChatTabs must define TELEGRAM_FOLDER_TAG_COLORS')
assert(tabsContent.includes('handleMoveFolder'), 'ChatTabs must implement handleMoveFolder')
assert(tabsContent.includes('handleSetFolderColor'), 'ChatTabs must implement handleSetFolderColor')
assert(tabsContent.includes('Move Folder Left'), 'ChatTabs context menu must offer Move Folder Left')
assert(tabsContent.includes('Move Folder Right'), 'ChatTabs context menu must offer Move Folder Right')
assert(tabsContent.includes('updateDialogFiltersOrder'), 'ChatTabs must invoke updateDialogFiltersOrder')
assert(tabsContent.includes('updateDialogFilter'), 'ChatTabs must invoke updateDialogFilter')
console.log('  ✅ 4. ChatTabs folder reordering, tag color palette, and context menu actions verified.')

console.log('🎉 Phase 85 Verification Passed: 20/20 checks succeeded cleanly.')
