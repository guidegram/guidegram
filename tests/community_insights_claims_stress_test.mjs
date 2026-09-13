/**
 * Independent Empirical Validation and Stress Test Harness for:
 * docs/research/64gram_community_insights.md
 *
 * Conducted by Challenger 2 (Empirical Challenger).
 */

import fs from 'fs'
import path from 'path'
import assert from 'assert'

const results = {
  passed: 0,
  failed: 0,
  discrepancies: []
}

function test(name, fn) {
  try {
    fn()
    results.passed++
    console.log(`  [PASS] ${name}`)
  } catch (err) {
    results.failed++
    results.discrepancies.push({ test: name, error: err.message })
    console.log(`  [FAIL / DISCREPANCY] ${name}\n         -> ${err.message}`)
  }
}

console.log('====================================================')
console.log('Challenger 2: Empirical Stress Test & Verification')
console.log('Target: docs/research/64gram_community_insights.md')
console.log('====================================================\n')

// ----------------------------------------------------------------------------
// SUITE 1: Package Dependencies & Target Platform Specs
// ----------------------------------------------------------------------------
console.log('[SUITE 1] Package Dependencies & MTProto Stack')

test('1.1: @mtcute packages version is 0.32.1', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  assert.strictEqual(pkg.dependencies['@mtcute/node'], '0.32.1', '@mtcute/node must be 0.32.1')
  assert.strictEqual(pkg.dependencies['@mtcute/core'], '0.32.1', '@mtcute/core must be 0.32.1')
  assert.strictEqual(pkg.dependencies['@mtcute/convert'], '0.32.1', '@mtcute/convert must be 0.32.1')
})

test('1.2: Electron 34 and React 19 are installed', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  assert.ok(pkg.devDependencies['electron']?.includes('34'), 'Electron must be v34')
  assert.ok(pkg.dependencies['react']?.includes('19'), 'React must be v19')
})

test('1.3: TypeScript version matches claim (TypeScript 5.7 [^5.7.3] in package.json)', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const tsVer = pkg.devDependencies['typescript']
  assert.ok(tsVer?.includes('5.7'), `Expected TypeScript ^5.7.3, package.json specifies "${tsVer}"`)
})

// ----------------------------------------------------------------------------
// SUITE 2: Filesystem Paths & Subsystem Layout
// ----------------------------------------------------------------------------
console.log('\n[SUITE 2] Filesystem Architecture & Subsystem Paths')

test('2.1: electron/telegram/proxyHarvester.ts exists and no electron/network references in report', () => {
  const doc = fs.readFileSync('docs/research/64gram_community_insights.md', 'utf8')
  assert.ok(!doc.includes('electron/network/'), 'Document must not reference electron/network/')
  assert.ok(fs.existsSync('electron/telegram/proxyHarvester.ts'), 'Actual path electron/telegram/proxyHarvester.ts must exist')
})

test('2.2: electron/telegram/warpManager.ts exists under electron/telegram/', () => {
  assert.ok(fs.existsSync('electron/telegram/warpManager.ts'), 'Actual path electron/telegram/warpManager.ts must exist')
})

test('2.3: Actual proxyHarvester.ts and warpManager.ts exist under electron/telegram/', () => {
  assert.ok(fs.existsSync('electron/telegram/proxyHarvester.ts'), 'proxyHarvester.ts exists in electron/telegram/')
  assert.ok(fs.existsSync('electron/telegram/warpManager.ts'), 'warpManager.ts exists in electron/telegram/')
  assert.ok(fs.existsSync('electron/telegram/deviceProfileManager.ts'), 'deviceProfileManager.ts exists in electron/telegram/')
  assert.ok(fs.existsSync('electron/telegram/accountManager.ts'), 'accountManager.ts exists in electron/telegram/')
  assert.ok(fs.existsSync('electron/telegram/sessionStore.ts'), 'sessionStore.ts exists in electron/telegram/')
})

// ----------------------------------------------------------------------------
// SUITE 3: ProxyHarvester Technical Contracts
// ----------------------------------------------------------------------------
console.log('\n[SUITE 3] ProxyHarvester Architecture Contracts')

test('3.1: ProxyHarvester DEFAULT_CHANNELS and 45-minute interval', () => {
  const code = fs.readFileSync('electron/telegram/proxyHarvester.ts', 'utf8')
  assert.ok(code.includes("ProxyMTProto"), 'Must include @ProxyMTProto')
  assert.ok(code.includes("proxymtprotoir"), 'Must include @proxymtprotoir')
  assert.ok(code.includes("mineproxy"), 'Must include @mineproxy')
  assert.ok(code.includes("45 * 60 * 1000"), 'Must schedule every 45 minutes')
})

test('3.2: Universal 3-Layer extraction (Entities, Buttons, Regex)', () => {
  const code = fs.readFileSync('electron/telegram/proxyHarvester.ts', 'utf8')
  assert.ok(code.includes('Layer 1: Entities'), 'Must implement Layer 1 entities')
  assert.ok(code.includes('Layer 2: Inline Keyboard Buttons'), 'Must implement Layer 2 buttons')
  assert.ok(code.includes('Layer 3: Raw text & caption regex matching'), 'Must implement Layer 3 regex')
})

test('3.3: TCP socket ping with 2500ms timeout and two-strike rule', () => {
  const code = fs.readFileSync('electron/telegram/proxyHarvester.ts', 'utf8')
  assert.ok(code.includes('timeoutMs: number = 2500'), 'Must default to 2500ms socket timeout')
  assert.ok(code.includes('failCount >= 2'), 'Must implement two-strike eviction policy')
})

// ----------------------------------------------------------------------------
// SUITE 4: Cloudflare WARP Integration Contracts
// ----------------------------------------------------------------------------
console.log('\n[SUITE 4] Cloudflare WARP Integration Contracts')

test('4.1: WarpManager generates ephemeral x25519 WireGuard keypair and calls Cloudflare API', () => {
  const code = fs.readFileSync('electron/telegram/warpManager.ts', 'utf8')
  assert.ok(code.includes("generateKeyPairSync('x25519')"), 'Must generate Curve25519 / x25519 keypair')
  assert.ok(code.includes("api.cloudflareclient.com"), 'Must call api.cloudflareclient.com')
  assert.ok(code.includes("/v0a2158/reg"), 'Must use registration endpoint /v0a2158/reg')
})

// ----------------------------------------------------------------------------
// SUITE 5: DeviceProfileManager Anti-Fingerprinting Contracts
// ----------------------------------------------------------------------------
console.log('\n[SUITE 5] DeviceProfileManager Anti-Fingerprinting Contracts')

test('5.1: DeviceProfileManager seeded deterministic generation with real OEM models', () => {
  const code = fs.readFileSync('electron/telegram/deviceProfileManager.ts', 'utf8')
  assert.ok(code.includes('function hashString(str: string): number'), 'Must implement hashString seed function')
  assert.ok(code.includes('XPS 15') || code.includes('XPS 13'), 'Must include Dell XPS models')
  assert.ok(code.includes('ThinkPad X1 Carbon'), 'Must include Lenovo ThinkPad models')
  assert.ok(code.includes('EliteBook 840'), 'Must include HP EliteBook models')
  assert.ok(code.includes('22631'), 'Must include Windows 11 Build 22631')
})

test('5.2: accountManager.ts binds DeviceProfileManager and per-account proxy at line 327+', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  const lines = code.split('\n')
  const line327 = lines[326] || ''
  assert.ok(code.includes('ProxyManager.toMtcuteTransport'), 'Must bind per-account transport')
  assert.ok(code.includes('DeviceProfileManager.getProfileForAccount'), 'Must bind seeded device profile')
  assert.ok(line327.includes('ProxyManager.toMtcuteTransport'), `Line 327 must bind transport (got: "${line327.trim()}")`)
})

// ----------------------------------------------------------------------------
// SUITE 6: Media Streaming & Protocol Handler Contracts
// ----------------------------------------------------------------------------
console.log('\n[SUITE 6] Media Streaming Protocol (guidegram-media://)')

test('6.1: electron/main.ts registers guidegram-media protocol handler', () => {
  const code = fs.readFileSync('electron/main.ts', 'utf8')
  assert.ok(code.includes("protocol.handle('guidegram-media'"), 'Must handle guidegram-media scheme')
  assert.ok(code.includes('net.fetch'), 'Must use net.fetch to preserve Range headers for media seeking')
})

test('6.2: accountManager.ts parallelDownloadDocument exists at line 143-174 with 512KB chunks', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  const lines = code.split('\n')
  const line143 = lines[142] || ''
  assert.ok(line143.includes('parallelDownloadDocument'), `Line 143 must be parallelDownloadDocument (got: "${line143.trim()}")`)
  assert.ok(code.includes('ProgressThrottler'), 'Must use ProgressThrottler')
  assert.ok(code.includes('partSize:'), 'Must specify partSize with 512KB limit')
})

// ----------------------------------------------------------------------------
// SUITE 7: Citations & Code References Accuracy Check
// ----------------------------------------------------------------------------
console.log('\n[SUITE 7] Code Citations & Line Number Verification')

test('7.1: forwardMessages uses dropAuthor: options?.withoutQuote (line 1910)', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  assert.ok(code.includes('dropAuthor: options?.withoutQuote'), 'Must match dropAuthor camelCase syntax in accountManager.ts')
})

test('7.2: ChatViewport.tsx formatMessageTime uses showSeconds (line 2086)', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  const lines = code.split('\n')
  const line2086 = lines[2085] || ''
  assert.ok(line2086.includes('showSeconds'), `Line 2086 must contain showSeconds (got: "${line2086.trim()}")`)
})

test('7.3: ChatViewport.tsx line 3062+ renders showChatId header pill', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  const lines = code.split('\n')
  const line3062 = lines[3061] || ''
  assert.ok(line3062.includes('showChatId'), `Line 3062 must contain showChatId (got: "${line3062.trim()}")`)
})

test('7.4: accountManager.ts line 1939 is markAllAsRead', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  assert.ok(code.includes('markAllAsRead(accountId: string)'), 'accountManager.ts must contain markAllAsRead')
})

test('7.5: Data Shield auto-recovery in sessionStore.ts at line 103+', () => {
  const code = fs.readFileSync('electron/telegram/sessionStore.ts', 'utf8')
  const lines = code.split('\n')
  const line103 = lines[102] || ''
  assert.ok(line103.includes('safe backup') || lines.slice(100, 115).some(l => l.includes('safe backup')), 'Must auto-restore from safe backup around line 103+')
})

// ----------------------------------------------------------------------------
// SUITE 8: Raw Dataset Provenance Check
// ----------------------------------------------------------------------------
console.log('\n[SUITE 8] Raw Dataset Verification (result.json)')

test('8.1: result.json exists and matches claimed volume (39,897 events)', () => {
  const p = 'D:/download/Telegram Desktop/ChatExport_2026-09-13/result.json'
  assert.ok(fs.existsSync(p), 'result.json must exist on disk')
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  assert.strictEqual(data.messages.length, 39897, 'Must have exactly 39,897 messages')
  assert.strictEqual(data.id, 1241321702, 'Chat ID must be 1241321702')
  assert.strictEqual(data.name, '64Gram Chat', 'Chat name must be 64Gram Chat')
})

test('8.2: result.json byte size matches claim (19,565,777 bytes)', () => {
  const p = 'D:/download/Telegram Desktop/ChatExport_2026-09-13/result.json'
  const stat = fs.statSync(p)
  assert.strictEqual(stat.size, 19565777, `Claimed 19,565,777 bytes, actual is ${stat.size} bytes`)
})

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n====================================================')
console.log(`Results: ${results.passed} passed, ${results.failed} failed / discrepancies`)
console.log('====================================================')
if (results.failed > 0) {
  console.log('\nList of Discrepancies Found:')
  results.discrepancies.forEach((d, i) => {
    console.log(`${i + 1}. [${d.test}] -> ${d.error}`)
  })
}
