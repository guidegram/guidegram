import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log('⚡ [TEST SUITE] Phase 75: WebPage Preview & Enhanced Instant View Verification')

// 1. AccountManager MTProto RPC Implementation
console.log('\n--- 1. AccountManager MTProto RPC (messages.getWebPagePreview, messages.getWebPage) ---')
const accountManagerTs = readFileSync(join(ROOT, 'electron/telegram/accountManager.ts'), 'utf-8')
assert(accountManagerTs.includes('public async getWebPagePreview('), 'AccountManager implements getWebPagePreview method')
assert(accountManagerTs.includes('_: \'messages.getWebPagePreview\''), 'getWebPagePreview invokes MTProto messages.getWebPagePreview')
assert(accountManagerTs.includes('public async getWebPage('), 'AccountManager implements getWebPage method')
assert(accountManagerTs.includes('_: \'messages.getWebPage\''), 'getWebPage invokes MTProto messages.getWebPage')
assert(accountManagerTs.includes('parseMtprotoPageToArticle(wp.url, wp)'), 'Instant View article parsed from MTProto cached_page')

// 2. Electron Main IPC Wireup
console.log('\n--- 2. Electron Main IPC Channels ---')
const mainTs = readFileSync(join(ROOT, 'electron/main.ts'), 'utf-8')
assert(mainTs.includes('ipcMain.handle(\'telegram:get-webpage-preview\''), 'main.ts registers telegram:get-webpage-preview handler')
assert(mainTs.includes('accountManager.getWebPagePreview(accountId, message, entities)'), 'telegram:get-webpage-preview calls accountManager')
assert(mainTs.includes('ipcMain.handle(\'telegram:get-webpage\''), 'main.ts registers telegram:get-webpage handler')
assert(mainTs.includes('accountManager.getWebPage(accountId, url, hash)'), 'telegram:get-webpage calls accountManager')
assert(mainTs.includes('const mtprotoPreview = await accountManager.getWebPagePreview(accountId, url)'), 'web:get-link-preview prioritizes MTProto active account preview')

// 3. Electron Preload API Exposure
console.log('\n--- 3. Preload Script Exposure ---')
const preloadTs = readFileSync(join(ROOT, 'electron/preload.ts'), 'utf-8')
assert(preloadTs.includes('getWebPagePreview: (accountId: string, message: string, entities?: any)'), 'preload.ts exposes getWebPagePreview')
assert(preloadTs.includes('getWebPage: (accountId: string, url: string, hash?: number)'), 'preload.ts exposes getWebPage')
assert(preloadTs.includes('getLinkPreview: (url: string, accountId?: string)'), 'preload.ts exposes getLinkPreview with accountId support')

// 4. ChatViewport LinkPreviewCard & Instant View Integration
console.log('\n--- 4. UI Rendering in ChatViewport ---')
const chatViewportTs = readFileSync(join(ROOT, 'src/components/ChatViewport.tsx'), 'utf-8')
assert(chatViewportTs.includes('interface LinkPreviewCardProps') && chatViewportTs.includes('accountId?: string'), 'LinkPreviewCardProps accepts accountId')
assert(chatViewportTs.includes('.getLinkPreview(url, accountId)'), 'LinkPreviewCard passes accountId to getLinkPreview')
assert(chatViewportTs.includes('accountId={chat?.accountId}'), 'ChatViewport passes chat?.accountId to LinkPreviewCard')
assert(chatViewportTs.includes('preview.hasInstantView'), 'ChatViewport detects hasInstantView')
assert(chatViewportTs.includes('<span>⚡ Instant View</span>'), 'ChatViewport renders Instant View quick reader button')

// 5. SSRF Defense & Reader Mode
console.log('\n--- 5. Security Guardrails & SSRF Defense ---')
assert(mainTs.includes('isPrivateIpOrHost(parsed.hostname)'), 'main.ts blocks private / intranet IP ranges in link preview scraper')
assert(mainTs.includes('isPrivateIpOrHost(redirected.hostname)'), 'main.ts blocks SSRF via 30x HTTP redirects')

console.log(`\n==================================================`)
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`==================================================`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL WEBPAGE PREVIEW & INSTANT VIEW VERIFICATION CHECKS PASSED!')
  process.exit(0)
}
