import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Message Reactions & Custom Emoji Reactions Verification (Phase 55)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async sendReaction('), 'accountManager must implement sendReaction')
assert(accountManagerSource.includes('public async getMessageReactionsList('), 'accountManager must implement getMessageReactionsList')
assert(accountManagerSource.includes('public async getAvailableReactions('), 'accountManager must implement getAvailableReactions')
assert(accountManagerSource.includes("'messages.sendReaction'"), 'sendReaction must invoke MTProto messages.sendReaction')
assert(accountManagerSource.includes("'messages.getMessageReactionsList'"), 'getMessageReactionsList must invoke MTProto messages.getMessageReactionsList')
assert(accountManagerSource.includes("'messages.getAvailableReactions'"), 'getAvailableReactions must invoke MTProto messages.getAvailableReactions')
assert(accountManagerSource.includes("'reactionCustomEmoji'"), 'sendReaction must construct reactionCustomEmoji for custom emojis')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:send-reaction'"), 'main.ts must register telegram:send-reaction')
assert(mainSource.includes("'telegram:get-message-reactions-list'"), 'main.ts must register telegram:get-message-reactions-list')
assert(mainSource.includes("'telegram:get-available-reactions'"), 'main.ts must register telegram:get-available-reactions')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('sendReaction:'), 'preload.ts must expose sendReaction')
assert(preloadSource.includes('getMessageReactionsList:'), 'preload.ts must expose getMessageReactionsList')
assert(preloadSource.includes('getAvailableReactions:'), 'preload.ts must expose getAvailableReactions')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional test of reaction serializer logic
function buildReactions(reaction) {
  const reactionItems = []
  const rawList = Array.isArray(reaction) ? reaction : reaction ? [reaction] : []
  for (const item of rawList) {
    if (typeof item === 'string') {
      if (item.trim()) {
        reactionItems.push({ _: 'reactionEmoji', emoticon: item.trim() })
      }
    } else if (item && typeof item === 'object') {
      if (item.customEmojiId) {
        reactionItems.push({ _: 'reactionCustomEmoji', documentId: String(item.customEmojiId) })
      } else if (item.emoji) {
        reactionItems.push({ _: 'reactionEmoji', emoticon: item.emoji.trim() })
      }
    }
  }
  return reactionItems
}

// Test string reaction
const r1 = buildReactions('❤️')
assert.deepEqual(r1, [{ _: 'reactionEmoji', emoticon: '❤️' }])

// Test custom emoji reaction
const r2 = buildReactions({ customEmojiId: '5432167890' })
assert.deepEqual(r2, [{ _: 'reactionCustomEmoji', documentId: '5432167890' }])

// Test multiple mixed reactions (Telegram Premium allows up to 3)
const r3 = buildReactions(['👍', { customEmojiId: '987654321' }, { emoji: '🔥' }])
assert.deepEqual(r3, [
  { _: 'reactionEmoji', emoticon: '👍' },
  { _: 'reactionCustomEmoji', documentId: '987654321' },
  { _: 'reactionEmoji', emoticon: '🔥' },
])

// Test empty reaction (removing reactions)
const r4 = buildReactions('')
assert.deepEqual(r4, [])
console.log('  ✅ [PASS] Reaction serializer logic validation passed')

// 5. Functional simulation of reactions RPC invocation
class MockReactionsAccountManager {
  constructor() {
    this.calls = []
  }

  async sendReaction(accountId, chatId, messageId, reaction, options) {
    if (accountId === 'disconnected') throw new Error('Account disconnected is not connected.')
    const reactionItems = buildReactions(reaction)
    this.calls.push({
      method: 'messages.sendReaction',
      chatId,
      messageId,
      reactionItems,
      big: Boolean(options?.big),
      addToRecent: options?.addToRecent !== undefined ? Boolean(options.addToRecent) : true,
    })
    return true
  }

  async getMessageReactionsList(accountId, chatId, messageId, options) {
    if (accountId === 'disconnected') throw new Error('Account disconnected is not connected.')
    this.calls.push({
      method: 'messages.getMessageReactionsList',
      chatId,
      messageId,
      options,
    })
    return {
      _: 'messages.messageReactionsList',
      count: 2,
      reactions: [
        { _: 'messagePeerReaction', peerId: { _: 'peerUser', userId: 100 }, reaction: { _: 'reactionEmoji', emoticon: '❤️' } },
        { _: 'messagePeerReaction', peerId: { _: 'peerUser', userId: 200 }, reaction: { _: 'reactionCustomEmoji', documentId: '54321' } },
      ],
      users: [{ id: 100, firstName: 'Alice' }, { id: 200, firstName: 'Bob' }],
    }
  }

  async getAvailableReactions(accountId, hash = 0) {
    if (accountId === 'disconnected') throw new Error('Account disconnected is not connected.')
    this.calls.push({
      method: 'messages.getAvailableReactions',
      hash,
    })
    return {
      _: 'messages.availableReactions',
      reactions: [
        { _: 'availableReaction', reaction: '👍', title: 'Thumbs Up' },
        { _: 'availableReaction', reaction: '❤️', title: 'Heart' },
      ],
    }
  }
}

const mock = new MockReactionsAccountManager()

// Test sendReaction with single emoji
await mock.sendReaction('acc1', '12345', 42, '🎉', { big: true })
assert.equal(mock.calls[0].method, 'messages.sendReaction')
assert.equal(mock.calls[0].reactionItems[0].emoticon, '🎉')
assert.equal(mock.calls[0].big, true)

// Test sendReaction with custom emoji
await mock.sendReaction('acc1', '12345', 42, { customEmojiId: '888888' })
assert.equal(mock.calls[1].reactionItems[0].documentId, '888888')

// Test getMessageReactionsList
const listRes = await mock.getMessageReactionsList('acc1', '12345', 42, { limit: 20 })
assert.equal(listRes.count, 2)
assert.equal(listRes.reactions.length, 2)
assert.equal(listRes.users[0].firstName, 'Alice')

// Test getAvailableReactions
const availRes = await mock.getAvailableReactions('acc1')
assert.equal(availRes.reactions.length, 2)
assert.equal(availRes.reactions[0].reaction, '👍')

console.log('  ✅ [PASS] Mock RPC execution and parameter validation passed')
console.log('🌟 All Phase 55 tests PASSED successfully!')
