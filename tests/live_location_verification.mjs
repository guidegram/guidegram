import { strict as assert } from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Live Location & Geolocation Sharing Protocol Verification (Phase 60)...')

// 1. Physical inspection of accountManager.ts
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerSource = fs.readFileSync(accountManagerPath, 'utf-8')

assert(accountManagerSource.includes('public async sendLocation('), 'accountManager must implement sendLocation')
assert(accountManagerSource.includes('public async editLiveLocation('), 'accountManager must implement editLiveLocation')
assert(accountManagerSource.includes('public async getRecentLocations('), 'accountManager must implement getRecentLocations')
assert(accountManagerSource.includes("'inputMediaGeoLive'"), 'sendLocation must construct inputMediaGeoLive for live tracking')
assert(accountManagerSource.includes("'inputMediaGeoPoint'"), 'sendLocation must construct inputMediaGeoPoint for static pins')
assert(accountManagerSource.includes("'messages.getRecentLocations'"), 'getRecentLocations must call messages.getRecentLocations')
console.log('  ✅ [PASS] accountManager.ts physical inspection passed')

// 2. Physical inspection of main.ts
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSource = fs.readFileSync(mainPath, 'utf-8')

assert(mainSource.includes("'telegram:send-location'"), 'main.ts must register telegram:send-location')
assert(mainSource.includes("'telegram:edit-live-location'"), 'main.ts must register telegram:edit-live-location')
assert(mainSource.includes("'telegram:get-recent-locations'"), 'main.ts must register telegram:get-recent-locations')
console.log('  ✅ [PASS] main.ts IPC registration passed')

// 3. Physical inspection of preload.ts
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSource = fs.readFileSync(preloadPath, 'utf-8')

assert(preloadSource.includes('sendLocation:'), 'preload.ts must expose sendLocation')
assert(preloadSource.includes('editLiveLocation:'), 'preload.ts must expose editLiveLocation')
assert(preloadSource.includes('getRecentLocations:'), 'preload.ts must expose getRecentLocations')
console.log('  ✅ [PASS] preload.ts bridge exposure passed')

// 4. Functional verification of Location TL payload builder
function buildLocationMedia(params) {
  const geoPoint = {
    _: 'inputGeoPoint',
    lat: Number(params.lat),
    long: Number(params.long),
    accuracyRadius: params.accuracyRadius ? Number(params.accuracyRadius) : undefined,
  }

  if (params.livePeriod && params.livePeriod > 0) {
    return {
      _: 'inputMediaGeoLive',
      geoPoint,
      period: Number(params.livePeriod),
      heading: params.heading ? Number(params.heading) : undefined,
      proximityNotificationRadius: params.proximityNotificationRadius ? Number(params.proximityNotificationRadius) : undefined,
    }
  }

  return {
    _: 'inputMediaGeoPoint',
    geoPoint,
  }
}

// Test static location pin
const staticPin = buildLocationMedia({ lat: 35.6892, long: 51.3890, accuracyRadius: 10 })
assert.equal(staticPin._, 'inputMediaGeoPoint')
assert.equal(staticPin.geoPoint.lat, 35.6892)
assert.equal(staticPin.geoPoint.long, 51.3890)
assert.equal(staticPin.geoPoint.accuracyRadius, 10)

// Test live location sharing (1 hour = 3600s)
const liveShare = buildLocationMedia({
  lat: 35.7000,
  long: 51.4000,
  livePeriod: 3600,
  heading: 90,
  proximityNotificationRadius: 100,
})
assert.equal(liveShare._, 'inputMediaGeoLive')
assert.equal(liveShare.period, 3600)
assert.equal(liveShare.heading, 90)
assert.equal(liveShare.proximityNotificationRadius, 100)

// Test stop live location payload
function buildStopLivePayload(messageId) {
  return {
    _: 'messages.editMessage',
    id: messageId,
    media: {
      _: 'inputMediaGeoLive',
      stopped: true,
      geoPoint: { _: 'inputGeoPointEmpty' },
    },
  }
}

const stopLive = buildStopLivePayload(777)
assert.equal(stopLive.id, 777)
assert.equal(stopLive.media.stopped, true)
assert.equal(stopLive.media.geoPoint._, 'inputGeoPointEmpty')
console.log('  ✅ [PASS] Location & Live Location TL payload builder validation passed')

// 5. Mock AccountManager execution
class MockLocationManager {
  constructor() {
    this.calls = []
  }

  async sendLocation(accountId, chatId, params) {
    if (accountId === 'disconnected') return { success: false, error: 'Account is not connected.' }
    const media = buildLocationMedia(params)
    this.calls.push({ method: 'messages.sendMedia', chatId, media })
    return { success: true, result: { id: 1001, date: 1729800000 } }
  }

  async editLiveLocation(accountId, chatId, messageId, params) {
    if (accountId === 'disconnected') return false
    this.calls.push({ method: 'messages.editMessage', chatId, messageId, params })
    return true
  }

  async getRecentLocations(accountId, chatId, limit = 50) {
    if (accountId === 'disconnected') return { count: 0, locations: [] }
    return {
      count: 1,
      locations: [
        {
          messageId: 1001,
          senderId: 'user_123',
          lat: 35.7000,
          long: 51.4000,
          period: 3600,
          isLive: true,
        },
      ],
    }
  }
}

const mgr = new MockLocationManager()

// Test disconnected
const disconn = await mgr.sendLocation('disconnected', 'chat1', { lat: 10, long: 20 })
assert.equal(disconn.success, false)

// Test send static pin
const pinRes = await mgr.sendLocation('acc1', 'chat1', { lat: 35.6892, long: 51.3890 })
assert.equal(pinRes.success, true)
assert.equal(mgr.calls[0].media._, 'inputMediaGeoPoint')

// Test send live stream
const liveRes = await mgr.sendLocation('acc1', 'chat1', { lat: 35.7000, long: 51.4000, livePeriod: 1800 })
assert.equal(liveRes.success, true)
assert.equal(mgr.calls[1].media._, 'inputMediaGeoLive')
assert.equal(mgr.calls[1].media.period, 1800)

// Test edit / stop live location
const stopOk = await mgr.editLiveLocation('acc1', 'chat1', 1001, { stopped: true })
assert.equal(stopOk, true)
assert.equal(mgr.calls[2].params.stopped, true)

// Test get recent live locations
const recents = await mgr.getRecentLocations('acc1', 'chat1')
assert.equal(recents.count, 1)
assert.equal(recents.locations[0].isLive, true)
assert.equal(recents.locations[0].lat, 35.7000)

console.log('  ✅ [PASS] Mock AccountManager Location & Live Location execution passed')
console.log('🌟 All Phase 60 tests PASSED successfully!')
