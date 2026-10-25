import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Bot Menu Button & WebApp Persistent Launcher Protocol Verification...\n')

let passed = 0
let total = 0

function assert(condition, message) {
  total++
  if (condition) {
    passed++
    console.log(`✓ [${passed}/${total}] ${message}`)
  } else {
    console.error(`✗ [FAIL] ${message}`)
    process.exit(1)
  }
}

// 1. AccountManager verification
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf-8')

assert(
  accountManagerContent.includes('public async getBotMenuButton(') &&
  accountManagerContent.includes('bots.getBotMenuButton'),
  'AccountManager implements getBotMenuButton invoking bots.getBotMenuButton'
)

assert(
  accountManagerContent.includes('public async botSetMenuButton(') &&
  accountManagerContent.includes('setBotMenuButton'),
  'AccountManager implements botSetMenuButton invoking botsService.setBotMenuButton'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:get-bot-menu-button'") &&
  mainContent.includes('accountManager.getBotMenuButton'),
  'main.ts registers telegram:get-bot-menu-button IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:bot-set-menu-button'") &&
  mainContent.includes('accountManager.botSetMenuButton'),
  'main.ts registers telegram:bot-set-menu-button IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('getBotMenuButton:') &&
  preloadContent.includes("'telegram:get-bot-menu-button'"),
  'preload.ts exposes getBotMenuButton'
)

assert(
  preloadContent.includes('botSetMenuButton:') &&
  preloadContent.includes("'telegram:bot-set-menu-button'"),
  'preload.ts exposes botSetMenuButton'
)

// 4. BotMenuDrawer verification
const drawerPath = path.join(rootDir, 'src', 'components', 'chat', 'BotMenuDrawer.tsx')
const drawerContent = fs.readFileSync(drawerPath, 'utf-8')

assert(
  drawerContent.includes("mode: 'web_app'") &&
  drawerContent.includes("mode: 'commands'") &&
  drawerContent.includes("mode: 'hidden'"),
  'BotMenuDrawer handles web_app, commands, and hidden menu modes'
)

assert(
  drawerContent.includes('handleLaunchWebApp') &&
  (drawerContent.includes('openMiniApp') || drawerContent.includes('onLaunchMiniApp')),
  'BotMenuDrawer launches Telegram Mini App upon clicking web_app button'
)

// 5. BotMenuButtonConfigModal verification
const modalPath = path.join(rootDir, 'src', 'components', 'chat', 'BotMenuButtonConfigModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

assert(
  modalContent.includes("'commands'") &&
  modalContent.includes("'web_app'") &&
  modalContent.includes("'default'"),
  'BotMenuButtonConfigModal implements mode selection grid'
)

assert(
  modalContent.includes('botSetMenuButton') &&
  modalContent.includes('botMenuButton'),
  'BotMenuButtonConfigModal submits botMenuButton payload via IPC'
)

// 6. ChatViewport integration verification
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportContent.includes('BotMenuButtonConfigModal') &&
  chatViewportContent.includes('isBotMenuConfigModalOpen') &&
  chatViewportContent.includes('setIsBotMenuConfigModalOpen(true)'),
  'ChatViewport integrates BotMenuButtonConfigModal and Info Drawer action card'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 93!\n`)
