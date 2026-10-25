import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Auto-Delete Timer & History TTL Verification (Phase 78)...')

// 1. Verify AccountManager MTProto methods
const accountMgrSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'accountManager.ts'), 'utf-8')
assert(accountMgrSource.includes('public async setHistoryTTL'), 'setHistoryTTL must exist')
assert(accountMgrSource.includes('public async getDefaultHistoryTTL'), 'getDefaultHistoryTTL must exist')
assert(accountMgrSource.includes('public async setDefaultHistoryTTL'), 'setDefaultHistoryTTL must exist')
console.log('  ✅ 1. AccountManager TTL methods verified.')

// 2. Verify Electron Main IPC handlers
const mainSource = fs.readFileSync(path.join(root, 'electron', 'main.ts'), 'utf-8')
assert(mainSource.includes("'telegram:set-history-ttl'"), 'IPC telegram:set-history-ttl must exist')
assert(mainSource.includes("'telegram:get-default-history-ttl'"), 'IPC telegram:get-default-history-ttl must exist')
assert(mainSource.includes("'telegram:set-default-history-ttl'"), 'IPC telegram:set-default-history-ttl must exist')
console.log('  ✅ 2. Electron Main IPC handlers verified.')

// 3. Verify Preload bridge exposure
const preloadSource = fs.readFileSync(path.join(root, 'electron', 'preload.ts'), 'utf-8')
assert(preloadSource.includes('setHistoryTTL:'), 'Preload setHistoryTTL must exist')
assert(preloadSource.includes('getDefaultHistoryTTL:'), 'Preload getDefaultHistoryTTL must exist')
assert(preloadSource.includes('setDefaultHistoryTTL:'), 'Preload setDefaultHistoryTTL must exist')
console.log('  ✅ 3. Preload API methods verified.')

// 4. Verify Types in electron/telegram/types.ts
const typesSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'types.ts'), 'utf-8')
assert(typesSource.includes('historyTtlPeriod?: number'), 'historyTtlPeriod must exist in types')
assert(typesSource.includes('defaultHistoryTtl?: number'), 'defaultHistoryTtl must exist in types')
assert(typesSource.includes('ttlSeconds?: number'), 'ttlSeconds must exist in MessageItem')
console.log('  ✅ 4. Type definitions for TTL verified.')

// 5. Verify UI Components
const modalSource = fs.readFileSync(path.join(root, 'src', 'components', 'AutoDeleteModal.tsx'), 'utf-8')
assert(modalSource.includes('AutoDeleteModal'), 'AutoDeleteModal component must exist')
assert(modalSource.includes('PRESET_PERIODS'), 'PRESET_PERIODS must exist')
assert(modalSource.includes('setHistoryTTL'), 'setHistoryTTL call must exist in modal')
assert(modalSource.includes('setDefaultHistoryTTL'), 'setDefaultHistoryTTL call must exist in modal')
console.log('  ✅ 5. AutoDeleteModal UI component verified.')

// 6. Verify ChatViewport integration
const viewportSource = fs.readFileSync(path.join(root, 'src', 'components', 'ChatViewport.tsx'), 'utf-8')
assert(viewportSource.includes('AutoDeleteModal'), 'AutoDeleteModal must be imported in ChatViewport')
assert(viewportSource.includes('isAutoDeleteModalOpen'), 'isAutoDeleteModalOpen state must exist in ChatViewport')
assert(viewportSource.includes('historyTtlPeriod'), 'historyTtlPeriod header button must exist in ChatViewport')
assert(viewportSource.includes('msg.ttlSeconds'), 'Message bubble TTL indicator badge must exist in ChatViewport')
console.log('  ✅ 6. ChatViewport TTL header button, message badge, and modal integration verified.')

console.log('🎉 Phase 78 Verification Passed: 20/20 checks succeeded cleanly.')
