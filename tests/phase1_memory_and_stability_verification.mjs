import assert from 'node:assert/strict'
import { MediaMemoryLifecycleGuard } from '../src/services/mediaMemoryLifecycleGuard.ts'
import { NonBlockingTypingGuard } from '../src/services/nonBlockingTypingGuard.ts'
import { PowerLifecycleManager } from '../electron/powerLifecycleManager.ts'

console.log('--- [Phase 1: Memory Leaks, VRAM Exhaustion & CPU Spikes Verification] ---')

// Mock URL API for Node environment
let createdUrls = []
let revokedUrls = []
globalThis.URL = {
  createObjectURL: (blob) => {
    const url = `blob:test/${Math.random().toString(36).substring(2)}`
    createdUrls.push(url)
    return url
  },
  revokeObjectURL: (url) => {
    revokedUrls.push(url)
  }
}

// 1. Test MediaMemoryLifecycleGuard Bounded LRU & Zero Leak
console.log('[Test 1] Validating MediaMemoryLifecycleGuard Bounded Capacity & Eviction...')
const guard = MediaMemoryLifecycleGuard.getInstance(5, 1024 * 50) // Max 5 items
guard.purgeAll()
createdUrls = []
revokedUrls = []

// Add 7 items to trigger LRU eviction (max 5)
const urls = []
for (let i = 1; i <= 7; i++) {
  const url = guard.createTrackedUrl(new Blob(['test_data_' + i]), `chat_${i}`, 1024)
  urls.push(url)
}

assert.equal(guard.getTelemetry().activeUrlsCount, 5, 'Active URLs count must be strictly capped at 5')
assert.equal(guard.getTelemetry().evictionCount, 2, '2 oldest URLs must have been evicted')
assert.equal(revokedUrls.length, 2, 'URL.revokeObjectURL must have been invoked for 2 evicted URLs')

// Test tag-based revocation
const revokedByTag = guard.revokeByTag('chat_6')
assert.equal(revokedByTag, 1, 'Should revoke exactly 1 item by tag')

// Test complete purge
const purged = guard.purgeAll()
assert.equal(guard.getTelemetry().activeUrlsCount, 0, 'All active URLs must be 0 after purge')
console.log('✅ [Test 1 Passed] MediaMemoryLifecycleGuard strictly prevents ObjectURL memory leaks.')

// 2. Test PowerLifecycleManager Lock Screen Compaction
console.log('[Test 2] Validating PowerLifecycleManager Lock-Screen VRAM & Memory Trim...')
const mockBroadcast = []
const powerManager = new PowerLifecycleManager({
  broadcastWebContents: (channel, payload) => {
    mockBroadcast.push({ channel, payload })
  }
})

powerManager.handleLockScreen()
const telemetry = powerManager.getTelemetry()
assert.equal(telemetry.totalLocks, 1, 'Lock counter must increment to 1')
const trimEvent = mockBroadcast.find(e => e.channel === 'system:memory-trim')
assert.ok(trimEvent, 'system:memory-trim must be broadcasted on lock-screen')
assert.equal(trimEvent.payload.reason, 'screen-lock', 'Reason must be screen-lock')

powerManager.handleUnlockScreen()
assert.equal(powerManager.getTelemetry().totalUnlocks, 1, 'Unlock counter must increment to 1')
console.log('✅ [Test 2 Passed] PowerLifecycleManager successfully triggers memory trim on lock screen.')

// 3. Test NonBlockingTypingGuard Input & Context Menu Sanitization
console.log('[Test 3] Validating NonBlockingTypingGuard & Context Menu Sanitizer...')
const typingGuard = NonBlockingTypingGuard.getInstance()

// Context menu surrogate pair test
const malformedSurrogate = 'Hello \uD800 World \uDFFF'
const sanitized = typingGuard.sanitizeContextMenuEntity(malformedSurrogate)
assert.ok(!sanitized.includes('\uD800'), 'Lone surrogate D800 must be removed')
assert.ok(!sanitized.includes('\uDFFF'), 'Lone surrogate DFFF must be removed')

// Non-blocking parse test
let parseCompleted = false
typingGuard.scheduleNonBlockingParse('Check out https://guidegram.org and @doctor_guidance with #security', (entities) => {
  parseCompleted = true
  assert.ok(entities.some(e => e.type === 'url' && e.value === 'https://guidegram.org'), 'Must parse URL entity')
  assert.ok(entities.some(e => e.type === 'mention' && e.value === '@doctor_guidance'), 'Must parse mention')
  assert.ok(entities.some(e => e.type === 'hashtag' && e.value === '#security'), 'Must parse hashtag')
}, 10)

setTimeout(() => {
  assert.ok(parseCompleted, 'Asynchronous text parsing must complete successfully')
  console.log('✅ [Test 3 Passed] NonBlockingTypingGuard correctly processes entities and sanitizes context menu.')
  console.log('--- ALL PHASE 1 HARDENING VERIFICATION CHECKS PASSED (100% GREEN) ---')
  process.exit(0)
}, 100)
