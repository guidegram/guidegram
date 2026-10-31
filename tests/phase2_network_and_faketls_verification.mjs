import assert from 'node:assert/strict'
import { MtprotoNetworkHardener } from '../electron/telegram/mtprotoNetworkHardener.ts'

console.log('--- [Phase 2: MTProto Handshake, FakeTLS & Network Censorship Hardening Verification] ---')

const hardener = MtprotoNetworkHardener.getInstance()

// 1. FakeTLS Modernization Test (resolving tdesktop #30733)
console.log('[Test 1] Validating FakeTLS Secret Parsing & Modern TLS 1.3 SNI Spoofing...')
// Test legacy or blocked domain secret (e.g. google.com in hex = 676f6f676c652e636f6d)
const legacySecret = 'ee0123456789abcdef0123456789abcdef676f6f676c652e636f6d'
const hardenedProfile = hardener.parseAndHardenFakeTls(legacySecret)

assert.equal(hardenedProfile.isFakeTls, true, 'Must identify as FakeTLS')
assert.ok(hardenedProfile.domain, 'Must have a domain assigned')
assert.notEqual(hardenedProfile.domain, 'google.com', 'Blocked domain must be upgraded to modern SNI pool')
assert.ok(hardenedProfile.sanitizedSecret.startsWith('ee0123456789abcdef0123456789abcdef'), 'Core 16-byte key must remain identical')
console.log(`✅ [Test 1 Passed] Successfully upgraded blocked SNI to: ${hardenedProfile.domain}`)

// 2. Safe Socket Teardown Test (resolving tdesktop #2306, #16093)
console.log('[Test 2] Validating Safe Socket Teardown & Listener Hygiene...')
let listenersCleared = false
let destroyed = false
let unrefCalled = false

const mockSocket = {
  destroyed: false,
  removeAllListeners: () => { listenersCleared = true },
  unref: () => { unrefCalled = true },
  destroy: () => { destroyed = true; mockSocket.destroyed = true }
}

hardener.safeTeardownSocket(mockSocket)
assert.equal(listenersCleared, true, 'All listeners must be stripped')
assert.equal(unrefCalled, true, 'Socket must be unref-ed from event loop')
assert.equal(destroyed, true, 'Socket must be destroyed')
console.log('✅ [Test 2 Passed] Socket safely torn down without event loop blocking.')

// 3. Parallel Proxy Racing with Hard Ceiling (resolving tdesktop #17316)
console.log('[Test 3] Validating Parallel Proxy Racing & Circuit Breaker...')
const mockProxies = [
  { id: 'p1', host: '127.0.0.1', port: 1080, type: 'socks5' },
  { id: 'p2', host: '127.0.0.2', port: 1080, type: 'socks5' },
  { id: 'p3', host: '127.0.0.3', port: 1080, type: 'socks5' },
]

const fastWinner = await hardener.raceFastestProxy(mockProxies, async (p) => {
  if (p.id === 'p2') {
    await new Promise(r => setTimeout(r, 20))
    return 45 // 45ms winner
  }
  if (p.id === 'p1') {
    await new Promise(r => setTimeout(r, 100))
    return 250 // 250ms
  }
  throw new Error('Unreachable')
}, 2000)

assert.ok(fastWinner, 'A fast proxy must win the race')
assert.equal(fastWinner.id, 'p2', 'Fastest proxy must be p2')
assert.equal(fastWinner.pingMs, 45, 'Latency must be recorded as 45ms')
console.log('✅ [Test 3 Passed] Parallel proxy racing selects fastest reachable node.')

console.log('--- ALL PHASE 2 NETWORK HARDENING VERIFICATION CHECKS PASSED (100% GREEN) ---')
process.exit(0)
