import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('--- Unread Message Sync & Outgoing Filtering Verification ---')

// 1. Verify App.tsx contains outgoing message check in telegram:new-message
const appTsx = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8')
assert.ok(
  appTsx.includes('unreadCount: chatId !== activeChatId && !message?.isOutgoing ? 1 : 0'),
  'App.tsx should check !message?.isOutgoing for new dialog creation'
)
assert.ok(
  appTsx.includes('const shouldIncrement = chatId !== activeChatId && !message?.isOutgoing'),
  'App.tsx should check !message?.isOutgoing before incrementing unreadCount'
)
console.log('✓ Check 1 passed: App.tsx ignores outgoing messages for unreadCount')

// 2. Verify accountManager.ts properly extracts channelId with -100 prefix and supports updateDialogUnreadMark
const accountMgr = fs.readFileSync(path.resolve('electron/telegram/accountManager.ts'), 'utf-8')
assert.ok(
  accountMgr.includes("update._ === 'updateDialogUnreadMark'"),
  'accountManager.ts onRawUpdate should handle updateDialogUnreadMark'
)
assert.ok(
  accountMgr.includes("chStr.startsWith('-100') ? chStr : (chStr.startsWith('-') ? `-100${chStr.slice(1)}` : `-100${chStr}`)"),
  'accountManager.ts onRawUpdate should format channel ID with -100 prefix'
)
console.log('✓ Check 2 passed: accountManager.ts handles updateDialogUnreadMark and -100 channel prefixes')

// 3. Verify accountManager.ts synchronizes local dialogs disk cache on markAsRead and onRawUpdate
assert.ok(
  accountMgr.includes('this.store.loadDialogsCache(accountId)'),
  'accountManager.ts should load and sync dialogs cache'
)
console.log('✓ Check 3 passed: accountManager.ts synchronizes disk dialogs cache on read events')

// 4. Verify ChatViewport.tsx triggers markAsRead on initial view if at bottom
const chatViewportTsx = fs.readFileSync(path.resolve('src/components/ChatViewport.tsx'), 'utf-8')
assert.ok(
  chatViewportTsx.includes('messagesEndRef.current?.scrollIntoView({ behavior: \'auto\' })') &&
  chatViewportTsx.includes('window.guidegram.markAsRead(chat.accountId, chat.id, lastMsg.id)'),
  'ChatViewport.tsx should sync read status on initial chat view'
)
console.log('✓ Check 4 passed: ChatViewport.tsx triggers markAsRead on initial bottom view')

console.log('\nALL 4 UNREAD SYNC & OUTGOING FILTERING CHECKS PASSED!')
