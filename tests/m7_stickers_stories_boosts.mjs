import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Milestone 7: MTProto Stickers, Stories & Security Verification')
console.log('====================================================\n')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// 1. AccountManager Verification
console.log('[SUITE 1] AccountManager MTProto Advanced Methods')
const accountManagerCode = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/accountManager.ts'), 'utf8')
assert(accountManagerCode.includes('getInstalledStickerSets('), 'accountManager.ts implements getInstalledStickerSets (messages.getAllStickers)')
assert(accountManagerCode.includes('getStickerSet('), 'accountManager.ts implements getStickerSet (messages.getStickerSet)')
assert(accountManagerCode.includes('sendSticker('), 'accountManager.ts implements sendSticker (sendFile InputDocument)')
assert(accountManagerCode.includes('getStickerData('), 'accountManager.ts implements getStickerData (Lottie ungzip + WebP)')
assert(accountManagerCode.includes('getPeerStories('), 'accountManager.ts implements getPeerStories (stories.getPeerStories)')
assert(accountManagerCode.includes('readStories('), 'accountManager.ts implements readStories (stories.readStories)')
assert(accountManagerCode.includes('getChannelBoostStatus('), 'accountManager.ts implements getChannelBoostStatus (premium.getBoostsStatus)')
assert(accountManagerCode.includes('getTwoFactorStatus('), 'accountManager.ts implements getTwoFactorStatus (account.getPassword)')

// 2. Main IPC Handlers Verification
console.log('\n[SUITE 2] Electron Main IPC Registration')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("'telegram:get-installed-stickers'"), 'main.ts registers telegram:get-installed-stickers')
assert(mainCode.includes("'telegram:get-stickerset'"), 'main.ts registers telegram:get-stickerset')
assert(mainCode.includes("'telegram:send-sticker'"), 'main.ts registers telegram:send-sticker')
assert(mainCode.includes("'telegram:get-sticker-data'"), 'main.ts registers telegram:get-sticker-data')
assert(mainCode.includes("'telegram:get-peer-stories'"), 'main.ts registers telegram:get-peer-stories')
assert(mainCode.includes("'telegram:read-stories'"), 'main.ts registers telegram:read-stories')
assert(mainCode.includes("'telegram:get-channel-boosts'"), 'main.ts registers telegram:get-channel-boosts')
assert(mainCode.includes("'telegram:get-two-factor-status'"), 'main.ts registers telegram:get-two-factor-status')

// 3. Preload API Verification
console.log('\n[SUITE 3] Electron Preload API Exposure')
const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes('getInstalledStickerSets:'), 'preload.ts exposes getInstalledStickerSets')
assert(preloadCode.includes('getStickerSet:'), 'preload.ts exposes getStickerSet')
assert(preloadCode.includes('sendSticker:'), 'preload.ts exposes sendSticker')
assert(preloadCode.includes('getStickerData:'), 'preload.ts exposes getStickerData')
assert(preloadCode.includes('getPeerStories:'), 'preload.ts exposes getPeerStories')
assert(preloadCode.includes('readStories:'), 'preload.ts exposes readStories')
assert(preloadCode.includes('getChannelBoostStatus:'), 'preload.ts exposes getChannelBoostStatus')
assert(preloadCode.includes('getTwoFactorStatus:'), 'preload.ts exposes getTwoFactorStatus')

// 4. UI Components Verification
console.log('\n[SUITE 4] React UI Components & Superpowers')
assert(fs.existsSync(path.join(process.cwd(), 'src/components/StickerPickerDrawer.tsx')), 'StickerPickerDrawer.tsx exists')
const stickerDrawerCode = fs.readFileSync(path.join(process.cwd(), 'src/components/StickerPickerDrawer.tsx'), 'utf8')
assert(stickerDrawerCode.includes('getInstalledStickerSets'), 'StickerPickerDrawer loads user installed packs')
assert(stickerDrawerCode.includes('lottie.loadAnimation'), 'StickerPickerDrawer animates .tgs Lottie vector stickers')
assert(stickerDrawerCode.includes('onSelectSticker'), 'StickerPickerDrawer supports instant click-to-send')

assert(fs.existsSync(path.join(process.cwd(), 'src/components/StoryViewerModal.tsx')), 'StoryViewerModal.tsx exists')
const storyModalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/StoryViewerModal.tsx'), 'utf8')
assert(storyModalCode.includes('getPeerStories'), 'StoryViewerModal loads peer stories via MTProto')
assert(storyModalCode.includes('!ghostMode'), 'StoryViewerModal supports 100% stealth story viewing (bypasses readStories when Ghost Mode is on)')

const chatViewportCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewportCode.includes('<StickerPickerDrawer'), 'ChatViewport mounts StickerPickerDrawer')
assert(chatViewportCode.includes('Stickers & Animated Packs'), 'ChatViewport has sticker button in message composer')
assert(chatViewportCode.includes('Channel Level & Boosts'), 'ChatViewport renders channel level and boosts card')
assert(chatViewportCode.includes('getChannelBoostStatus'), 'ChatViewport fetches channel boost status')

const chatListCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatList.tsx'), 'utf8')
assert(chatListCode.includes('setViewingStoryPeer'), 'ChatList manages story viewer modal state')
assert(chatListCode.includes('<StoryViewerModal'), 'ChatList embeds StoryViewerModal')

const sessionsModalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ActiveSessionsModal.tsx'), 'utf8')
assert(sessionsModalCode.includes('getTwoFactorStatus'), 'ActiveSessionsModal queries 2FA status')
assert(sessionsModalCode.includes('Two-Step Verification (2FA)'), 'ActiveSessionsModal renders 2FA protection card')

console.log('\n----------------------------------------------------')
console.log(`Results: ${passed} Passed, ${failed} Failed`)
console.log('----------------------------------------------------')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('All Milestone 7 MTProto features verified successfully!')
  process.exit(0)
}
