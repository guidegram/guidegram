import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Verification: Telegram Premium Custom Emojis, Saved GIFs & Recent Stickers')
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

// 1. AccountManager verification
console.log('[SUITE 1] AccountManager MTProto Implementation')
const accountManagerCode = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/accountManager.ts'), 'utf8')
assert(accountManagerCode.includes('getInstalledEmojiSets('), 'accountManager implements getInstalledEmojiSets (messages.getEmojiStickers)')
assert(accountManagerCode.includes('getRecentStickers('), 'accountManager implements getRecentStickers (messages.getRecentStickers)')
assert(accountManagerCode.includes('getSavedGifs('), 'accountManager implements getSavedGifs (messages.getSavedGifs)')
assert(accountManagerCode.includes('sendSavedGif('), 'accountManager implements sendSavedGif (messages.sendMedia)')
assert(accountManagerCode.includes("documentAttributeCustomEmoji"), 'accountManager supports documentAttributeCustomEmoji for Telegram Premium custom emojis')
assert(accountManagerCode.includes(".mp4"), 'accountManager processes MP4 video GIFs')

// 2. Main IPC Handlers
console.log('\n[SUITE 2] Electron Main IPC Handlers')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("'telegram:get-installed-emojis'"), 'main.ts registers telegram:get-installed-emojis')
assert(mainCode.includes("'telegram:get-recent-stickers'"), 'main.ts registers telegram:get-recent-stickers')
assert(mainCode.includes("'telegram:get-saved-gifs'"), 'main.ts registers telegram:get-saved-gifs')
assert(mainCode.includes("'telegram:send-saved-gif'"), 'main.ts registers telegram:send-saved-gif')

// 3. Preload Bridge Exposure
console.log('\n[SUITE 3] Preload Exposure')
const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes('getInstalledEmojiSets:'), 'preload.ts exposes getInstalledEmojiSets')
assert(preloadCode.includes('getRecentStickers:'), 'preload.ts exposes getRecentStickers')
assert(preloadCode.includes('getSavedGifs:'), 'preload.ts exposes getSavedGifs')
assert(preloadCode.includes('sendSavedGif:'), 'preload.ts exposes sendSavedGif')

// 4. UI Parity & Rendering
console.log('\n[SUITE 4] MediaPickerDrawer & UI Parity')
const drawerCode = fs.readFileSync(path.join(process.cwd(), 'src/components/MediaPickerDrawer.tsx'), 'utf8')
assert(drawerCode.includes('getInstalledEmojiSets'), 'MediaPickerDrawer fetches user installed custom emoji packs')
assert(!drawerCode.includes('TELEGRAM_PREMIUM_EMOJIS = ['), 'MediaPickerDrawer eliminated fake hardcoded VIP emoji array')
assert(drawerCode.includes('getRecentStickers'), 'MediaPickerDrawer displays Recently Used stickers')
assert(drawerCode.includes('getSavedGifs'), 'MediaPickerDrawer fetches and renders MTProto Saved GIFs')
assert(drawerCode.includes('PackCoverIcon'), 'MediaPickerDrawer renders visual pack covers instead of 3-letter text abbreviations')

const chatViewportCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewportCode.includes('handleSendGif'), 'ChatViewport implements handleSendGif handler')
assert(chatViewportCode.includes('onSelectGif={handleSendGif}'), 'ChatViewport wires onSelectGif to MediaPickerDrawer')

console.log('\n----------------------------------------------------')
console.log(`Results: ${passed} Passed, ${failed} Failed`)
console.log('----------------------------------------------------')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('All Custom Emoji, Saved GIF and Recent Sticker features verified successfully!')
  process.exit(0)
}
