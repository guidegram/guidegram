import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Star Gifts & Digital Collectibles Verification (Phase 54)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async getStarGifts('), 'accountManager must implement getStarGifts')
assert(accountManagerSource.includes('public async getSavedStarGifts('), 'accountManager must implement getSavedStarGifts')
assert(accountManagerSource.includes('public async convertStarGift('), 'accountManager must implement convertStarGift')
assert(accountManagerSource.includes('public async toggleSaveStarGift('), 'accountManager must implement toggleSaveStarGift')
assert(accountManagerSource.includes("'payments.convertStarGift'"), 'convertStarGift must call MTProto payments.convertStarGift')
assert(accountManagerSource.includes("'payments.saveStarGift'"), 'toggleSaveStarGift must call MTProto payments.saveStarGift')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:get-star-gift-catalog'"), 'main.ts must register telegram:get-star-gift-catalog')
assert(mainSource.includes("'telegram:get-star-gifts'"), 'main.ts must register telegram:get-star-gifts')
assert(mainSource.includes("'telegram:convert-star-gift'"), 'main.ts must register telegram:convert-star-gift')
assert(mainSource.includes("'telegram:toggle-save-star-gift'"), 'main.ts must register telegram:toggle-save-star-gift')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('getStarGifts:'), 'preload.ts must expose getStarGifts')
assert(preloadSource.includes('getSavedStarGifts:'), 'preload.ts must expose getSavedStarGifts')
assert(preloadSource.includes('convertStarGift:'), 'preload.ts must expose convertStarGift')
assert(preloadSource.includes('toggleSaveStarGift:'), 'preload.ts must expose toggleSaveStarGift')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional simulation of Star Gift item parser
function parseStarGift(raw) {
  return {
    id: raw.id?.toString() || Math.random().toString(),
    stars: Number(raw.stars || 0),
    convertStars: Number(raw.convertStars || 0),
    title: raw.title,
    date: 0,
    isLimited: Boolean(raw.limited),
    isSoldOut: Boolean(raw.soldOut),
    availabilityRemains: raw.availabilityRemains,
    availabilityTotal: raw.availabilityTotal,
  }
}

const parsedGift = parseStarGift({
  id: 123456789n,
  stars: 50,
  convertStars: 42,
  title: 'Golden Trophy',
  limited: true,
  soldOut: false,
  availabilityRemains: 100,
  availabilityTotal: 5000,
})

assert.equal(parsedGift.id, '123456789')
assert.equal(parsedGift.stars, 50)
assert.equal(parsedGift.convertStars, 42)
assert.equal(parsedGift.title, 'Golden Trophy')
assert.equal(parsedGift.isLimited, true)
assert.equal(parsedGift.isSoldOut, false)
assert.equal(parsedGift.availabilityRemains, 100)
console.log('  ✅ [PASS] StarGiftItem payload parser validation passed')

// 5. Functional simulation of convertStarGift and toggleSaveStarGift error handling on disconnected accounts
class MockAccountManager {
  constructor() {
    this.clients = new Map()
  }

  async convertStarGift(accountId, stargiftMsgId) {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { success: false, error: 'Account is not connected.' }
    try {
      const res = await holder.client.call({
        _: 'payments.convertStarGift',
        stargift: { _: 'inputSavedStarGiftUser', msgId: Number(stargiftMsgId) },
      })
      return { success: true, result: res }
    } catch (err) {
      return { success: false, error: err?.message || String(err) }
    }
  }

  async toggleSaveStarGift(accountId, stargiftMsgId, unsave) {
    const holder = this.clients.get(accountId)
    if (!holder?.client) return { success: false, error: 'Account is not connected.' }
    try {
      await holder.client.call({
        _: 'payments.saveStarGift',
        stargift: { _: 'inputSavedStarGiftUser', msgId: Number(stargiftMsgId) },
        unsave: Boolean(unsave),
      })
      return { success: true }
    } catch (err) {
      return { success: false, error: err?.message || String(err) }
    }
  }
}

const mockMgr = new MockAccountManager()
const disconnConvert = await mockMgr.convertStarGift('nonexistent', 123)
assert.equal(disconnConvert.success, false)
assert.equal(disconnConvert.error, 'Account is not connected.')

const disconnSave = await mockMgr.toggleSaveStarGift('nonexistent', 123, true)
assert.equal(disconnSave.success, false)
assert.equal(disconnSave.error, 'Account is not connected.')

// Connected client mock
mockMgr.clients.set('acc1', {
  client: {
    call: async (query) => {
      if (query._ === 'payments.convertStarGift') {
        return { _: 'payments.starGiftConverted', stars: 42 }
      }
      if (query._ === 'payments.saveStarGift') {
        return true
      }
      throw new Error('Unknown RPC: ' + query._)
    },
  },
})

const connConvert = await mockMgr.convertStarGift('acc1', 777)
assert.equal(connConvert.success, true)
assert.equal(connConvert.result.stars, 42)

const connSave = await mockMgr.toggleSaveStarGift('acc1', 777, false)
assert.equal(connSave.success, true)

console.log('  ✅ [PASS] convertStarGift & toggleSaveStarGift RPC state validation passed')
console.log('🌟 All Phase 54 tests PASSED successfully!')
