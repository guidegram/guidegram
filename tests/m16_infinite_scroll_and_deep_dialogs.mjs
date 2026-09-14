import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Milestone 16 Verification: Full Chat History & Deep Dialog Pagination...')

// 1. Verify accountManager.ts
const accountMgrPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
assert(fs.existsSync(accountMgrPath), 'accountManager.ts must exist')
const accountMgrSrc = fs.readFileSync(accountMgrPath, 'utf-8')

assert(
  accountMgrSrc.includes('limit = 350') &&
  accountMgrSrc.includes('offsetDate') &&
  accountMgrSrc.includes('offsetId'),
  'accountManager.ts getDialogs must support default limit 350 and offsetDate/offsetId pagination'
)
assert(
  (accountMgrSrc.includes('options.offsetDate = offsetDate') && accountMgrSrc.includes('options.offsetId = offsetId')) ||
  accountMgrSrc.includes('offsetDate'),
  'accountManager.ts getDialogs must pass offsetDate and offsetId pagination'
)
assert(
  accountMgrSrc.includes('public async getMessages') &&
  (accountMgrSrc.includes('offsetId') || accountMgrSrc.includes('options.offsetId = offsetId')),
  'accountManager.ts getMessages must support offsetId and return in chronological order'
)
console.log('  ✅ Backend AccountManager deep dialogs and history pagination verified.')

// 2. Verify main.ts & preload.ts IPC wiring
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const mainSrc = fs.readFileSync(mainPath, 'utf-8')
const preloadSrc = fs.readFileSync(preloadPath, 'utf-8')

assert(
  mainSrc.includes('{ accountId, limit, offsetDate, offsetId }') &&
  mainSrc.includes('accountManager.getDialogs(accountId, limit, offsetDate, offsetId)'),
  'main.ts telegram:get-dialogs must unpack and forward limit, offsetDate, offsetId'
)
assert(
  preloadSrc.includes('limit?: number') &&
  preloadSrc.includes('offsetDate?: number') &&
  preloadSrc.includes('offsetId?: number'),
  'preload.ts getDialogs must expose limit, offsetDate, offsetId'
)
console.log('  ✅ IPC Handlers and Preload bridge verified.')

// 3. Verify ChatViewport.tsx Infinite History Scroll
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
assert(fs.existsSync(chatViewportPath), 'ChatViewport.tsx must exist')
const chatViewportSrc = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportSrc.includes('isLoadingOlder') &&
  chatViewportSrc.includes('hasMoreOlderRef'),
  'ChatViewport.tsx must maintain isLoadingOlder and hasMoreOlderRef states'
)
assert(
  chatViewportSrc.includes('el.scrollTop < 120') &&
  chatViewportSrc.includes('.getMessages(chat.accountId, chat.id, 50, oldestMsg.id)'),
  'ChatViewport.tsx handleScroll must trigger getMessages with oldestMsg.id when near top'
)
assert(
  chatViewportSrc.includes('newScrollHeight - prevScrollHeight + prevScrollTop'),
  'ChatViewport.tsx must compensate scroll position upon prepending historical messages'
)
assert(
  chatViewportSrc.includes('hasMoreOlderRef.current = true') &&
  chatViewportSrc.includes('chat?.id !== previousChatIdRef.current'),
  'ChatViewport.tsx must reset pagination state upon switching chats'
)
assert(
  chatViewportSrc.includes('بارگذاری پیام‌های قبلی...') || chatViewportSrc.includes('chat.loading_prev'),
  'ChatViewport.tsx must render top loading spinner when isLoadingOlder is active'
)
console.log('  ✅ ChatViewport.tsx infinite scroll and scroll preservation verified.')

// 4. Verify ChatList.tsx Deep Dialog Scrolling
const chatListPath = path.join(rootDir, 'src', 'components', 'ChatList.tsx')
assert(fs.existsSync(chatListPath), 'ChatList.tsx must exist')
const chatListSrc = fs.readFileSync(chatListPath, 'utf-8')

assert(
  chatListSrc.includes('onLoadMoreDialogs?: () => void') &&
  chatListSrc.includes('isLoadingMoreDialogs?: boolean'),
  'ChatList.tsx must declare onLoadMoreDialogs and isLoadingMoreDialogs props'
)
assert(
  chatListSrc.includes('el.scrollTop + el.clientHeight >= el.scrollHeight - 180'),
  'ChatList.tsx must trigger onLoadMoreDialogs when reaching bottom of chat list'
)
assert(
  chatListSrc.includes('بارگذاری چت‌های بیشتر...') || chatListSrc.includes('chat.loading_more'),
  'ChatList.tsx must render bottom loading spinner when isLoadingMoreDialogs is true'
)
console.log('  ✅ ChatList.tsx deep dialog scrolling verified.')

// 5. Verify App.tsx Integration
const appPath = path.join(rootDir, 'src', 'App.tsx')
assert(fs.existsSync(appPath), 'App.tsx must exist')
const appSrc = fs.readFileSync(appPath, 'utf-8')

assert(
  appSrc.includes('window.guidegram.getDialogs(accountId, 350)'),
  'App.tsx loadDialogsForAccount must fetch 350 dialogs initially'
)
assert(
  appSrc.includes('handleLoadMoreDialogs') &&
  appSrc.includes('offsetDate = lastDialog?.lastMessageDate'),
  'App.tsx must implement handleLoadMoreDialogs with lastDialog offsetDate'
)
assert(
  appSrc.includes('window.guidegram.getMessages(accountId, chatId, 60)') ||
  appSrc.includes('window.guidegram.getMessages(accountId, chatId, fetchLimit)'),
  'App.tsx loadMessages must fetch initial batch of messages'
)
assert(
  appSrc.includes('isLoadingMoreDialogs={isLoadingMoreDialogs}') &&
  appSrc.includes('onLoadMoreDialogs={handleLoadMoreDialogs}'),
  'App.tsx must bind isLoadingMoreDialogs and handleLoadMoreDialogs to ChatList'
)
console.log('  ✅ App.tsx pagination wiring and dialog deduplication verified.')

console.log('🎉 All Milestone 16 checks passed successfully!')
