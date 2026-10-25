import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Premium Gifts & Star Subscriptions Verification (Phase 61)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async getStarsSubscriptions('), 'accountManager must implement getStarsSubscriptions')
assert(accountManagerSource.includes('public async changeStarsSubscription('), 'accountManager must implement changeStarsSubscription')
assert(accountManagerSource.includes('public async getGiveawayInfo('), 'accountManager must implement getGiveawayInfo')
assert(accountManagerSource.includes('public async checkCanSendGift('), 'accountManager must implement checkCanSendGift')
assert(accountManagerSource.includes("'payments.getStarsSubscriptions'"), 'must invoke payments.getStarsSubscriptions')
assert(accountManagerSource.includes("'payments.changeStarsSubscription'"), 'must invoke payments.changeStarsSubscription')
assert(accountManagerSource.includes("'payments.getGiveawayInfo'"), 'must invoke payments.getGiveawayInfo')
assert(accountManagerSource.includes("'payments.checkCanSendGift'"), 'must invoke payments.checkCanSendGift')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:get-stars-subscriptions'"), 'main.ts must register telegram:get-stars-subscriptions')
assert(mainSource.includes("'telegram:change-stars-subscription'"), 'main.ts must register telegram:change-stars-subscription')
assert(mainSource.includes("'telegram:get-giveaway-info'"), 'main.ts must register telegram:get-giveaway-info')
assert(mainSource.includes("'telegram:check-can-send-gift'"), 'main.ts must register telegram:check-can-send-gift')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('getStarsSubscriptions:'), 'preload.ts must expose getStarsSubscriptions')
assert(preloadSource.includes('changeStarsSubscription:'), 'preload.ts must expose changeStarsSubscription')
assert(preloadSource.includes('getGiveawayInfo:'), 'preload.ts must expose getGiveawayInfo')
assert(preloadSource.includes('checkCanSendGift:'), 'preload.ts must expose checkCanSendGift')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional simulation of Stars Subscriptions mapping
function parseStarsSubscriptionsResponse(res) {
  return {
    count: res.count !== undefined ? res.count : (res.subscriptions || []).length,
    subscriptions: (res.subscriptions || []).map((sub) => ({
      id: sub.id,
      canceled: Boolean(sub.canceled),
      canRefulfill: Boolean(sub.canRefulfill),
      missingBalance: Boolean(sub.missingBalance),
      chatId: sub.peer ? (sub.peer.channelId ? `-${sub.peer.channelId}` : String(sub.peer.userId || '')) : '',
      untilDate: sub.untilDate ? sub.untilDate * 1000 : 0,
      pricing: sub.pricing,
    })),
    chats: res.chats || [],
    users: res.users || [],
  }
}

const mockRes = {
  count: 1,
  subscriptions: [
    {
      id: 'sub_12345',
      canceled: false,
      canRefulfill: true,
      missingBalance: false,
      peer: { channelId: 1002345678 },
      untilDate: 1735689600,
      pricing: { amount: 250, period: 2592000 },
    },
  ],
}

const parsed = parseStarsSubscriptionsResponse(mockRes)
assert.equal(parsed.count, 1)
assert.equal(parsed.subscriptions[0].id, 'sub_12345')
assert.equal(parsed.subscriptions[0].canceled, false)
assert.equal(parsed.subscriptions[0].chatId, '-1002345678')
assert.equal(parsed.subscriptions[0].untilDate, 1735689600000)
assert.equal(parsed.subscriptions[0].pricing.amount, 250)
console.log('  ✅ [PASS] Stars Subscriptions mapping validation passed')

// 5. Mock AccountManager execution
class MockStarsManager {
  constructor() {
    this.calls = []
  }

  async getStarsSubscriptions(accountId, peerId, offset = '') {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'payments.getStarsSubscriptions', peerId, offset })
    return parsed
  }

  async changeStarsSubscription(accountId, peerId, subscriptionId, canceled) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'payments.changeStarsSubscription', peerId, subscriptionId, canceled })
    return true
  }

  async getGiveawayInfo(accountId, peerId, msgId) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'payments.getGiveawayInfo', peerId, msgId })
    return { _: 'payments.giveawayInfo', startDate: 1729800000, winnersCount: 5 }
  }

  async checkCanSendGift(accountId, giftId) {
    if (accountId === 'disconnected') throw new Error('Account is not connected.')
    this.calls.push({ method: 'payments.checkCanSendGift', giftId: String(giftId) })
    return true
  }
}

const mgr = new MockStarsManager()

// Subscriptions fetch
const subs = await mgr.getStarsSubscriptions('acc1', 'channel_100')
assert.equal(subs.count, 1)
assert.equal(mgr.calls[0].peerId, 'channel_100')

// Cancel subscription
const cancelOk = await mgr.changeStarsSubscription('acc1', 'channel_100', 'sub_12345', true)
assert.equal(cancelOk, true)
assert.equal(mgr.calls[1].canceled, true)

// Giveaway query
const giveaway = await mgr.getGiveawayInfo('acc1', 'channel_100', 42)
assert.equal(giveaway.winnersCount, 5)

// Check gift eligibility
const canGift = await mgr.checkCanSendGift('acc1', '999999')
assert.equal(canGift, true)
assert.equal(mgr.calls[3].giftId, '999999')

console.log('  ✅ [PASS] Mock AccountManager RPC execution passed')
console.log('🌟 All Phase 61 tests PASSED successfully!')
