import assert from 'node:assert/strict'
import net from 'net'
import { MtprotoNetworkHardener } from '../electron/telegram/mtprotoNetworkHardener.ts'

console.log('--- [Phase 2: MTProto Handshake, FakeTLS & Network Censorship Hardening Verification] ---')

const hardener = MtprotoNetworkHardener.getInstance()

// 1. Test FakeTLS Modernization (#30733)
console.log('[Test 1] Validating FakeTLS Secret Parsing & Modern SNI Spoofing...')

// Case A: Obsolete / Blocked Google domain in FakeTLS hex
// 'ee' + 32-char hex + hex of 'www.google.com' (7777772e676f6f676c652e636f6d)
const obsoleteSecret = 'ee0123456789abcdef0123456789abcdef7777772e676f6f676c652e636f6d'
const hardenedA = hardener.parseAndHardenFakeTls(obsoleteSecret)

assert.equal(hardenedA.isFakeTls, true, 'Must identify as FakeTLS')
assert.notEqual(hardenedA.domain, 'www.google.com', 'Blocked domain must be upgraded')
assert.ok(hardenedA.sanitizedSecret.startsWith('ee0123456789abcdef0123456789abcdef'), 'Core secret key must be preserved')
assert.ok(hardenedA.sanitizedSecret.length > 34, 'Upgraded domain hex must be attached')

// Case B: Standard 32-char secret (non-FakeTLS)
const standardSecret = '0123456789abcdef0123456789abcdef'
const standardRes = hardener.parseAndHardenFakeTls(standardSecret)
assert.equal(standardRes.isFakeTls, false, 'Standard secret must not be flagged as FakeTLS')
assert.equal(standardRes.sanitizedSecret, standardSecret, 'Standard secret must remain unchanged')

console.log('✅ [Test 1 Passed] FakeTLS Fingerprints successfully modernized to bypass DPI censorship.')

// 2. Test Safe Socket Teardown (#2306, #16093)
console.log('[Test 2] Validating Safe Synchronous Socket Teardown...')
const socket = new net.Socket()
let destroyedCalled = false

// Hook socket destroy
const origDestroy = socket.destroy.bind(socket)
socket.destroy = function () {
  destroyedCalled = true
  return origDestroy()
}

hardener.safeTeardownSocket(socket)
assert.ok(socket.destroyed, 'Socket must be destroyed')
assert.ok(destroyedCalled, 'Destroy callback must be executed')
assert.equal(hardener.getTelemetry().socketsSafelyTornDownCount > 0, true, 'Telemetry must count torn down socket')

console.log('✅ [Test 2 Passed] Socket teardown completed synchronously with unref to prevent event-loop lock.')

// 3. Test Multi-Proxy Racing with Circuit Breaker (#17316)
console.log('[Test 3] Validating Adaptive Proxy Racing & Auto-Failover...')

const mockProxies = [
  { host: '1.1.1.1', port: 443, type: 'socks5', enabled: true },
  { host: '8.8.8.8', port: 1080, type: 'socks5', enabled: true },
  { host: '9.9.9.9', port: 8080, type: 'http', enabled: true },
]

// Simulate ping tester where 8.8.8.8 is fastest (45ms), 1.1.1.1 is slow (500ms), 9.9.9.9 fails (-1)
const mockPingTester = async (p) => {
  if (p.host === '8.8.8.8') {
    await new Promise(r => setTimeout(r, 20))
    return 45
  }
  if (p.host === '1.1.1.1') {
    await new Promise(r => setTimeout(r, 120))
    return 500
  }
  return -1
}

const raceWinner = await hardener.raceFastestProxy(mockProxies, mockPingTester, 1000)
assert.ok(raceWinner, 'Race winner must be selected')
assert.equal(raceWinner.host, '8.8.8.8', 'Fastest reachable proxy (8.8.8.8) must win the race')
assert.equal(raceWinner.pingMs, 45, 'Latency must match winner')

console.log('✅ [Test 3 Passed] Fast proxy racing correctly selects lowest latency node.')
console.log('--- ALL PHASE 2 NETWORK HARDENING CHECKS PASSED (100% GREEN) ---')
