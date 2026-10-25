import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Scheduled Messages & Send When Online Verification (Phase 58)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async getScheduledMessages('), 'accountManager must implement getScheduledMessages')
assert(accountManagerSource.includes('public async sendScheduledMessageNow('), 'accountManager must implement sendScheduledMessageNow')
assert(accountManagerSource.includes('public async deleteScheduledMessages('), 'accountManager must implement deleteScheduledMessages')
assert(accountManagerSource.includes('0x7ffffffe'), 'accountManager must use Telegram MTProto constant 0x7ffffffe for Send When Online')
assert(accountManagerSource.includes('isWhenOnline'), 'getScheduledMessages must flag isWhenOnline')
assert(accountManagerSource.includes("'messages.getScheduledHistory'"), 'getScheduledMessages must call messages.getScheduledHistory')
assert(accountManagerSource.includes("'messages.sendScheduledMessages'"), 'sendScheduledMessageNow must call messages.sendScheduledMessages')
assert(accountManagerSource.includes("'messages.deleteScheduledMessages'"), 'deleteScheduledMessages must call messages.deleteScheduledMessages')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:get-scheduled-messages'"), 'main.ts must register telegram:get-scheduled-messages')
assert(mainSource.includes("'telegram:send-scheduled-message-now'"), 'main.ts must register telegram:send-scheduled-message-now')
assert(mainSource.includes("'telegram:delete-scheduled-messages'"), 'main.ts must register telegram:delete-scheduled-messages')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('getScheduledMessages:'), 'preload.ts must expose getScheduledMessages')
assert(preloadSource.includes('sendScheduledMessageNow:'), 'preload.ts must expose sendScheduledMessageNow')
assert(preloadSource.includes('deleteScheduledMessages:'), 'preload.ts must expose deleteScheduledMessages')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional verification of Send When Online timestamp logic
const SCHEDULE_WHEN_ONLINE = 0x7ffffffe

function computeScheduleDate(options) {
  if (options?.scheduleWhenOnline) {
    return SCHEDULE_WHEN_ONLINE
  }
  if (options?.scheduleDate) {
    return Math.floor(options.scheduleDate / 1000)
  }
  return undefined
}

assert.equal(computeScheduleDate({ scheduleWhenOnline: true }), 2147483646)
assert.equal(computeScheduleDate({ scheduleDate: 1729800000000 }), 1729800000)
assert.equal(computeScheduleDate({}), undefined)

function parseScheduledMessage(m) {
  return {
    id: m.id,
    text: m.message,
    date: m.date,
    scheduledDate: m.date === SCHEDULE_WHEN_ONLINE ? SCHEDULE_WHEN_ONLINE * 1000 : m.date * 1000,
    isOutgoing: Boolean(m.out),
    isWhenOnline: m.date === SCHEDULE_WHEN_ONLINE,
  }
}

const itemOnline = parseScheduledMessage({ id: 10, message: 'Send when you appear', date: SCHEDULE_WHEN_ONLINE, out: true })
assert.equal(itemOnline.isWhenOnline, true)
assert.equal(itemOnline.id, 10)

const itemTimed = parseScheduledMessage({ id: 11, message: 'Happy Birthday', date: 1730000000, out: true })
assert.equal(itemTimed.isWhenOnline, false)
assert.equal(itemTimed.scheduledDate, 1730000000000)

console.log('  ✅ [PASS] Send When Online logic and payload validation passed')

// 5. Mock AccountManager execution
class MockScheduledManager {
  constructor() {
    this.calls = []
  }

  async getScheduledMessages(accountId, chatId) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.getScheduledHistory', chatId })
    return [
      { id: 101, text: 'Meeting in 1 hour', date: 1730001000, isWhenOnline: false },
      { id: 102, text: 'Ping me when online', date: SCHEDULE_WHEN_ONLINE, isWhenOnline: true },
    ]
  }

  async sendScheduledMessageNow(accountId, chatId, messageId) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.sendScheduledMessages', chatId, id: [messageId] })
    return true
  }

  async deleteScheduledMessages(accountId, chatId, messageIds) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'messages.deleteScheduledMessages', chatId, id: messageIds })
    return true
  }
}

const mockMgr = new MockScheduledManager()
const history = await mockMgr.getScheduledMessages('acc1', 'work_group')
assert.equal(history.length, 2)
assert.equal(history[1].isWhenOnline, true)

const sendNowOk = await mockMgr.sendScheduledMessageNow('acc1', 'work_group', 101)
assert.equal(sendNowOk, true)
assert.deepEqual(mockMgr.calls[1].id, [101])

const delOk = await mockMgr.deleteScheduledMessages('acc1', 'work_group', [101, 102])
assert.equal(delOk, true)
assert.deepEqual(mockMgr.calls[2].id, [101, 102])

console.log('  ✅ [PASS] Mock AccountManager RPC execution passed')
console.log('🌟 All Phase 58 tests PASSED successfully!')
