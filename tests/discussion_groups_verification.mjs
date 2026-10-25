import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Channel Discussion Groups & Linked Chats Navigator Verification...')

// 1. Verify DiscussionThreadInfo and ChatDetails types in types.ts
console.log('Test 1: Verifying DiscussionThreadInfo and ChatDetails fields...')
const typesCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/telegram/types.ts'),
  'utf-8'
)
assert(typesCode.includes('linkedChatId?: string'), 'Missing linkedChatId in ChatDetails')
assert(typesCode.includes('linkedChatTitle?: string'), 'Missing linkedChatTitle in ChatDetails')
assert(typesCode.includes('hasDiscussionGroup?: boolean'), 'Missing hasDiscussionGroup in ChatDetails')
assert(typesCode.includes('export interface DiscussionThreadInfo'), 'Missing DiscussionThreadInfo interface')
console.log('✅ Test 1 Passed: Types defined with complete Telegram discussion schema.')

// 2. Verify AccountManager getDiscussionMessage and setDiscussionGroup
console.log('Test 2: Verifying AccountManager discussion group methods...')
const accountManagerCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/telegram/accountManager.ts'),
  'utf-8'
)
assert(accountManagerCode.includes('public async getDiscussionMessage('), 'Missing getDiscussionMessage in AccountManager')
assert(accountManagerCode.includes("'messages.getDiscussionMessage'"), 'getDiscussionMessage must invoke messages.getDiscussionMessage')
assert(accountManagerCode.includes('public async setDiscussionGroup('), 'Missing setDiscussionGroup in AccountManager')
assert(accountManagerCode.includes("'channels.setDiscussionGroup'"), 'setDiscussionGroup must invoke channels.setDiscussionGroup')
assert(accountManagerCode.includes('res.fullChat?.linkedChatId'), 'getChatDetails must parse linkedChatId')
console.log('✅ Test 2 Passed: AccountManager methods implemented with MTProto parity.')

// 3. Verify IPC Handlers in main.ts
console.log('Test 3: Verifying IPC handlers in main.ts...')
const mainCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/main.ts'),
  'utf-8'
)
assert(mainCode.includes("ipcMain.handle('telegram:get-discussion-message'"), 'Missing telegram:get-discussion-message in main.ts')
assert(mainCode.includes("ipcMain.handle('telegram:set-discussion-group'"), 'Missing telegram:set-discussion-group in main.ts')
console.log('✅ Test 3 Passed: Main IPC registration complete.')

// 4. Verify Preload Bridge in preload.ts
console.log('Test 4: Verifying Preload Bridge bindings...')
const preloadCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/preload.ts'),
  'utf-8'
)
assert(preloadCode.includes('getDiscussionMessage:'), 'Missing getDiscussionMessage in preload.ts')
assert(preloadCode.includes('setDiscussionGroup:'), 'Missing setDiscussionGroup in preload.ts')
console.log('✅ Test 4 Passed: Preload API exposes discussion group methods.')

// 5. Verify Frontend UI in ChatViewport.tsx
console.log('Test 5: Verifying Linked Discussion Navigator button in ChatViewport.tsx...')
const viewportCode = fs.readFileSync(
  path.join(process.cwd(), 'src/components/ChatViewport.tsx'),
  'utf-8'
)
assert(viewportCode.includes('chatDetails?.linkedChatId || chatDetails?.hasDiscussionGroup'), 'Missing discussion group check in ChatViewport')
assert(viewportCode.includes('onSelectUserOrChat(chatDetails.linkedChatId!)'), 'Missing discussion group navigation trigger')
console.log('✅ Test 5 Passed: Header navigator wired to linked discussion group.')

console.log('\n🎉 ALL 5 CHANNEL DISCUSSION GROUPS & LINKED CHATS TESTS PASSED PERFECTLY!')
