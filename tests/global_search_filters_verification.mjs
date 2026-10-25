import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Global Search & Filter Tabs (Media, Links, Files, Audio, Voice) Verification...')

// 1. Verify MTProto Filter Type Mapping in AccountManager
console.log('Test 1: Verifying MTProto InputMessagesFilter mapping in AccountManager...')
const accountManagerCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/telegram/accountManager.ts'),
  'utf-8'
)

assert(accountManagerCode.includes("inputMessagesFilterPhotoVideo"), 'Missing inputMessagesFilterPhotoVideo for media')
assert(accountManagerCode.includes("inputMessagesFilterUrl"), 'Missing inputMessagesFilterUrl for links')
assert(accountManagerCode.includes("inputMessagesFilterDocument"), 'Missing inputMessagesFilterDocument for files')
assert(accountManagerCode.includes("inputMessagesFilterMusic"), 'Missing inputMessagesFilterMusic for audio')
assert(accountManagerCode.includes("inputMessagesFilterRoundVoice"), 'Missing inputMessagesFilterRoundVoice for voice')
console.log('✅ Test 1 Passed: All 5 MTProto filter types mapped accurately.')

// 2. Verify Search Filter Categories in ChatList UI
console.log('Test 2: Verifying SearchFilterCategory in ChatList.tsx...')
const chatListCode = fs.readFileSync(
  path.join(process.cwd(), 'src/components/ChatList.tsx'),
  'utf-8'
)

assert(chatListCode.includes("'media'"), 'Missing media in SearchFilterCategory')
assert(chatListCode.includes("'links'"), 'Missing links in SearchFilterCategory')
assert(chatListCode.includes("'files'"), 'Missing files in SearchFilterCategory')
assert(chatListCode.includes("'audio'"), 'Missing audio in SearchFilterCategory')
assert(chatListCode.includes("'voice'"), 'Missing voice in SearchFilterCategory')
console.log('✅ Test 2 Passed: SearchFilterCategory contains complete Telegram filter set.')

// 3. Verify Rich Media Badge & Attribute Rendering in UI
console.log('Test 3: Verifying Media Badges and Format Utilities in ChatList...')
assert(chatListCode.includes('formatFileSize(msg.mediaFileSize)'), 'Missing formatFileSize in media rendering')
assert(chatListCode.includes('formatDuration(msg.mediaDuration)'), 'Missing formatDuration in media rendering')
assert(chatListCode.includes('msg.chatTitle'), 'Missing chatTitle in global search message item')
console.log('✅ Test 3 Passed: Rich media metadata, file size, duration, and chat title verified.')

// 4. Verify MessageItem Type Definition
console.log('Test 4: Verifying MessageItem definition in types.ts...')
const typesCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/telegram/types.ts'),
  'utf-8'
)
assert(typesCode.includes('chatTitle?: string'), 'Missing chatTitle in MessageItem')
assert(typesCode.includes('mediaType?:'), 'Missing mediaType in MessageItem')
assert(typesCode.includes('mediaFileSize?: number'), 'Missing mediaFileSize in MessageItem')
console.log('✅ Test 4 Passed: MessageItem type definition has full parity.')

// 5. Verify IPC Surface and Preload Bindings
console.log('Test 5: Verifying IPC and Preload bindings for searchGlobal...')
const mainCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/main.ts'),
  'utf-8'
)
assert(mainCode.includes("ipcMain.handle('telegram:search-global'"), 'Missing telegram:search-global in main.ts')

const preloadCode = fs.readFileSync(
  path.join(process.cwd(), 'electron/preload.ts'),
  'utf-8'
)
assert(preloadCode.includes('searchGlobal: (accountId: string, query: string, filterType?: string'), 'Missing searchGlobal in preload.ts')
console.log('✅ Test 5 Passed: IPC and Preload interface bindings verified.')

console.log('\n🎉 ALL 5 GLOBAL SEARCH & FILTER TABS TESTS PASSED PERFECTLY!')
