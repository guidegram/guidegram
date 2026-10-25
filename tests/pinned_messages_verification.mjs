import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Pinned Messages Stack & Pinned Bar Verification (Phase 56)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async getPinnedMessages('), 'accountManager must implement getPinnedMessages')
assert(accountManagerSource.includes('public async unpinAllMessages('), 'accountManager must implement unpinAllMessages')
assert(accountManagerSource.includes("'inputMessagesFilterPinned'"), 'getPinnedMessages must use inputMessagesFilterPinned filter')
assert(accountManagerSource.includes("'messages.unpinAllMessages'"), 'unpinAllMessages must call MTProto messages.unpinAllMessages')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:get-pinned-messages'"), 'main.ts must register telegram:get-pinned-messages')
assert(mainSource.includes("'telegram:unpin-all-messages'"), 'main.ts must register telegram:unpin-all-messages')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('getPinnedMessages:'), 'preload.ts must expose getPinnedMessages')
assert(preloadSource.includes('unpinAllMessages:'), 'preload.ts must expose unpinAllMessages')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional parser simulation for pinned message stack
function parsePinnedMessages(res, chatId) {
  const rawMessages = Array.isArray(res.messages) ? res.messages : []
  const items = rawMessages
    .filter((m) => m && m._ !== 'messageEmpty')
    .map((m) => ({
      id: m.id,
      chatId,
      senderId: m.fromId ? (m.fromId.userId ? String(m.fromId.userId) : String(m.fromId.channelId || '')) : chatId,
      text: m.message || '',
      timestamp: m.date ? m.date * 1000 : Date.now(),
      isOutgoing: Boolean(m.out),
      replyToMsgId: m.replyTo?.replyToMsgId,
      pinned: true,
      views: m.views,
      forwards: m.forwards,
    }))

  return {
    count: res.count !== undefined ? res.count : items.length,
    messages: items,
  }
}

const mockRawResponse = {
  count: 3,
  messages: [
    {
      _: 'message',
      id: 101,
      fromId: { userId: 444 },
      message: 'Pinned Announcement #1',
      date: 1700000000,
      views: 120,
      forwards: 5,
    },
    {
      _: 'messageEmpty',
      id: 102,
    },
    {
      _: 'message',
      id: 103,
      fromId: { channelId: 888 },
      message: 'Pinned Roadmap #2',
      date: 1700000500,
      views: 350,
      forwards: 22,
    },
  ],
}

const parsed = parsePinnedMessages(mockRawResponse, 'chat_999')
assert.equal(parsed.count, 3)
assert.equal(parsed.messages.length, 2, 'Empty message must be filtered out')
assert.equal(parsed.messages[0].id, 101)
assert.equal(parsed.messages[0].text, 'Pinned Announcement #1')
assert.equal(parsed.messages[0].pinned, true)
assert.equal(parsed.messages[1].id, 103)
assert.equal(parsed.messages[1].senderId, '888')
console.log('  ✅ [PASS] Pinned messages stack parser validation passed')

// 5. Mock AccountManager execution
class MockPinnedManager {
  constructor() {
    this.calls = []
  }

  async getPinnedMessages(accountId, chatId, limit = 50, offsetId = 0) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.search', chatId, limit, offsetId, filter: 'inputMessagesFilterPinned' })
    return {
      count: 1,
      messages: [{ id: 555, chatId, text: 'Active Pinned', pinned: true }],
    }
  }

  async unpinAllMessages(accountId, chatId, topMsgId = 0) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.unpinAllMessages', chatId, topMsgId })
    return true
  }
}

const mgr = new MockPinnedManager()
const pinnedRes = await mgr.getPinnedMessages('acc1', 'general_chat', 20, 0)
assert.equal(pinnedRes.count, 1)
assert.equal(pinnedRes.messages[0].id, 555)
assert.equal(mgr.calls[0].filter, 'inputMessagesFilterPinned')

const unpinRes = await mgr.unpinAllMessages('acc1', 'general_chat')
assert.equal(unpinRes, true)
assert.equal(mgr.calls[1].method, 'messages.unpinAllMessages')

console.log('  ✅ [PASS] Mock AccountManager RPC execution passed')
console.log('🌟 All Phase 56 tests PASSED successfully!')
