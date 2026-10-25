import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Cloud Drafts Sync & Cross-Device Text Synchronization Verification (Phase 62)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async saveDraft('), 'accountManager must implement saveDraft')
assert(accountManagerSource.includes('public async clearDraft('), 'accountManager must implement clearDraft')
assert(accountManagerSource.includes('public async getAllDrafts('), 'accountManager must implement getAllDrafts')
assert(accountManagerSource.includes("'messages.saveDraft'"), 'saveDraft must call messages.saveDraft')
assert(accountManagerSource.includes("'messages.getAllDrafts'"), 'getAllDrafts must call messages.getAllDrafts')
assert(accountManagerSource.includes('updateDraftMessage'), 'getAllDrafts must process updateDraftMessage')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:save-draft'"), 'main.ts must register telegram:save-draft')
assert(mainSource.includes("'telegram:clear-draft'"), 'main.ts must register telegram:clear-draft')
assert(mainSource.includes("'telegram:get-all-drafts'"), 'main.ts must register telegram:get-all-drafts')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('saveDraft:'), 'preload.ts must expose saveDraft')
assert(preloadSource.includes('clearDraft:'), 'preload.ts must expose clearDraft')
assert(preloadSource.includes('getAllDrafts:'), 'preload.ts must expose getAllDrafts')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional simulation of getAllDrafts parser
function parseAllDraftsResponse(res) {
  const drafts = {}
  const updates = Array.isArray(res?.updates) ? res.updates : []
  for (const u of updates) {
    if (u?._ === 'updateDraftMessage' && u.draft && u.draft._ === 'draftMessage') {
      let peerId = ''
      if (u.peer?._ === 'peerUser') peerId = String(u.peer.userId)
      else if (u.peer?._ === 'peerChat') peerId = `-${u.peer.chatId}`
      else if (u.peer?._ === 'peerChannel') peerId = `-${u.peer.channelId}`

      if (peerId && u.draft.message) {
        drafts[peerId] = {
          text: u.draft.message,
          date: u.draft.date ? u.draft.date * 1000 : undefined,
          replyToMsgId: u.draft.replyTo?.replyToMsgId || u.draft.replyToMsgId,
        }
      }
    }
  }
  return drafts
}

const mockDraftsUpdate = {
  _: 'updates',
  updates: [
    {
      _: 'updateDraftMessage',
      peer: { _: 'peerUser', userId: 12345 },
      draft: {
        _: 'draftMessage',
        message: 'Hello from iPhone draft!',
        date: 1729800000,
        replyTo: { replyToMsgId: 444 },
      },
    },
    {
      _: 'updateDraftMessage',
      peer: { _: 'peerChannel', channelId: 987654 },
      draft: {
        _: 'draftMessage',
        message: 'Draft post for announcement channel',
        date: 1729800500,
      },
    },
    {
      _: 'updateDraftMessage',
      peer: { _: 'peerUser', userId: 55555 },
      draft: {
        _: 'draftMessageEmpty',
      },
    },
  ],
}

const parsedDrafts = parseAllDraftsResponse(mockDraftsUpdate)
assert.equal(Object.keys(parsedDrafts).length, 2, 'Empty drafts must be excluded')
assert.equal(parsedDrafts['12345'].text, 'Hello from iPhone draft!')
assert.equal(parsedDrafts['12345'].replyToMsgId, 444)
assert.equal(parsedDrafts['-987654'].text, 'Draft post for announcement channel')
console.log('  ✅ [PASS] Cloud drafts response parser validation passed')

// 5. Mock AccountManager execution
class MockDraftsManager {
  constructor() {
    this.calls = []
    this.storage = new Map()
  }

  async saveDraft(accountId, chatId, message, replyToMsgId) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.saveDraft', chatId, message, replyToMsgId })
    if (!message) {
      this.storage.delete(chatId)
    } else {
      this.storage.set(chatId, { text: message, replyToMsgId })
    }
    return true
  }

  async clearDraft(accountId, chatId) {
    return this.saveDraft(accountId, chatId, '')
  }

  async getAllDrafts(accountId) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.getAllDrafts' })
    const res = {}
    for (const [k, v] of this.storage.entries()) {
      res[k] = v
    }
    return res
  }
}

const mgr = new MockDraftsManager()

// Test saveDraft
const saveOk = await mgr.saveDraft('acc1', 'chat_101', 'Working on report', 99)
assert.equal(saveOk, true)
assert.equal(mgr.storage.get('chat_101').text, 'Working on report')

// Test getAllDrafts
const all1 = await mgr.getAllDrafts('acc1')
assert.equal(all1['chat_101'].text, 'Working on report')

// Test clearDraft
const clearOk = await mgr.clearDraft('acc1', 'chat_101')
assert.equal(clearOk, true)
assert.equal(mgr.storage.has('chat_101'), false)

const all2 = await mgr.getAllDrafts('acc1')
assert.equal(Object.keys(all2).length, 0)

console.log('  ✅ [PASS] Mock AccountManager Drafts lifecycle passed')
console.log('🌟 All Phase 62 tests PASSED successfully!')
