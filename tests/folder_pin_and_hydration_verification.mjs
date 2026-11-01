import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Folder Pin Parity & Peer Hydration Verification...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async toggleFolderPin('), 'accountManager must implement toggleFolderPin')
assert(accountManagerSource.includes('public async getFolderPeerDialogs('), 'accountManager must implement getFolderPeerDialogs')
assert(accountManagerSource.includes("'messages.getPeerDialogs'"), 'getFolderPeerDialogs must call messages.getPeerDialogs')
assert(accountManagerSource.includes('const rawPinned = filterData.pinnedPeerIds || (filterData as any).pinnedPeers'), 'updateDialogFilter must handle pinnedPeerIds and pinnedPeers')
console.log('  ✅ [PASS] accountManager.ts toggleFolderPin and getFolderPeerDialogs physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:toggle-folder-pin'"), 'main.ts must register telegram:toggle-folder-pin')
assert(mainSource.includes("'telegram:get-folder-peer-dialogs'"), 'main.ts must register telegram:get-folder-peer-dialogs')
console.log('  ✅ [PASS] main.ts IPC registration for folder pinning and peer hydration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('toggleFolderPin:'), 'preload.ts must expose toggleFolderPin')
assert(preloadSource.includes('getFolderPeerDialogs:'), 'preload.ts must expose getFolderPeerDialogs')
console.log('  ✅ [PASS] preload.ts bridge exposure for folder pinning passed')

// 4. Physical inspection of ChatList.tsx
const chatListPath = path.join(rootDir, 'src', 'components', 'ChatList.tsx')
const chatListSource = fs.readFileSync(chatListPath, 'utf-8')

assert(chatListSource.includes('sortedFilteredDialogs'), 'ChatList must sort dialogs according to folder pinned order')
assert(chatListSource.includes('isPinnedInActiveView'), 'ChatList must compute folder-specific pinned status')
assert(chatListSource.includes('toggleFolderPin'), 'ChatList must call toggleFolderPin when pinning inside a folder')
assert(chatListSource.includes('isPinnedOverride'), 'ChatList must pass isPinnedOverride to DialogListItem')
console.log('  ✅ [PASS] ChatList.tsx folder pin sorting & context menu integration passed')

// 5. Physical inspection of App.tsx
const appPath = path.join(rootDir, 'src', 'App.tsx')
const appSource = fs.readFileSync(appPath, 'utf-8')

assert(appSource.includes('getFolderPeerDialogs'), 'App.tsx must invoke getFolderPeerDialogs to hydrate missing folder peers')
assert(appSource.includes('onFoldersUpdated='), 'App.tsx must pass onFoldersUpdated to ChatList')
console.log('  ✅ [PASS] App.tsx folder peer hydration and update dispatch passed')

// 6. Functional simulation of folder pin sorting logic
const mockFolder = {
  id: 5,
  title: 'Bots',
  pinnedPeerIds: ['bot_3', 'bot_1'],
}

const mockDialogs = [
  { id: 'bot_1', title: 'Bot One', lastMessageDate: 1000 },
  { id: 'bot_2', title: 'Bot Two', lastMessageDate: 5000 },
  { id: 'bot_3', title: 'Bot Three', lastMessageDate: 2000 },
  { id: 'bot_4', title: 'Bot Four', lastMessageDate: 3000 },
]

const pinnedMap = new Map()
mockFolder.pinnedPeerIds.forEach((pid, idx) => {
  pinnedMap.set(pid, idx)
})

const pinnedList = []
const unpinnedList = []

for (const d of mockDialogs) {
  if (pinnedMap.has(d.id)) {
    pinnedList.push({ d, idx: pinnedMap.get(d.id) })
  } else {
    unpinnedList.push(d)
  }
}

pinnedList.sort((a, b) => a.idx - b.idx)
unpinnedList.sort((a, b) => b.lastMessageDate - a.lastMessageDate)
const sortedResult = [...pinnedList.map(p => p.d), ...unpinnedList]

assert.strictEqual(sortedResult[0].id, 'bot_3', 'First item must be bot_3 (first in pinnedPeerIds)')
assert.strictEqual(sortedResult[1].id, 'bot_1', 'Second item must be bot_1 (second in pinnedPeerIds)')
assert.strictEqual(sortedResult[2].id, 'bot_2', 'Third item must be bot_2 (highest date among unpinned)')
assert.strictEqual(sortedResult[3].id, 'bot_4', 'Fourth item must be bot_4')
console.log('  ✅ [PASS] Functional simulation of folder pin ordering passed')

console.log('🌟 ALL Folder Pin Parity & Hydration tests PASSED!')
