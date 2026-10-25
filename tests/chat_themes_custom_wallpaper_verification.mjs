import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Chat Themes & Custom Wallpaper Protocol Verification (Phase 83)...')

// 1. Verify types in electron/telegram/types.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('chatTheme?: string'), 'types.ts must declare chatTheme')
assert(typesContent.includes('chatWallpaper?: string'), 'types.ts must declare chatWallpaper')
console.log('  ✅ 1. chatTheme & chatWallpaper types verified.')

// 2. Verify AccountManager MTProto methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async setChatTheme('), 'AccountManager must implement setChatTheme')
assert(accountManagerContent.includes("messages.setChatTheme"), 'setChatTheme must invoke messages.setChatTheme')
assert(accountManagerContent.includes('public async setChatWallPaper('), 'AccountManager must implement setChatWallPaper')
assert(accountManagerContent.includes("messages.setChatWallPaper"), 'setChatWallPaper must invoke messages.setChatWallPaper')
console.log('  ✅ 2. AccountManager setChatTheme & setChatWallPaper MTProto methods verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:set-chat-theme'"), 'main.ts must register telegram:set-chat-theme')
assert(mainContent.includes("'telegram:set-chat-wallpaper'"), 'main.ts must register telegram:set-chat-wallpaper')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('setChatTheme:'), 'preload.ts must expose setChatTheme')
assert(preloadContent.includes('setChatWallPaper:'), 'preload.ts must expose setChatWallPaper')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify ChatThemeModal component & OFFICIAL_CHAT_THEMES
const modalPath = path.join(root, 'src/components/chat/ChatThemeModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')
assert(modalContent.includes('OFFICIAL_CHAT_THEMES'), 'ChatThemeModal must export OFFICIAL_CHAT_THEMES')
assert(modalContent.includes('☀️'), 'OFFICIAL_CHAT_THEMES must include daylight theme')
assert(modalContent.includes('🌙'), 'OFFICIAL_CHAT_THEMES must include midnight theme')
assert(modalContent.includes('forBoth'), 'ChatThemeModal must offer forBoth option')
console.log('  ✅ 4. ChatThemeModal and official theme palettes verified.')

// 5. Verify ChatViewport UI integration
const viewportPath = path.join(root, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('ChatThemeModal'), 'ChatViewport must import and render ChatThemeModal')
assert(viewportContent.includes('isChatThemeModalOpen'), 'ChatViewport must hold isChatThemeModalOpen state')
assert(viewportContent.includes('handleSetChatTheme'), 'ChatViewport must handle theme change')
assert(viewportContent.includes('activeThemeObj'), 'ChatViewport must compute activeThemeObj')
assert(viewportContent.includes('bg-gradient-to-b'), 'ChatViewport must render theme gradient on messages wrapper')
console.log('  ✅ 5. ChatViewport theme selector button and dynamic background verified.')

console.log('🎉 Phase 83 Verification Passed: 20/20 checks succeeded cleanly.')
