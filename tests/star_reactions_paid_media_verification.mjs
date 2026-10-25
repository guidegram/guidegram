import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Star Reactions & Paid Media Messages Protocol Verification...\n')

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
  accountManagerContent.includes('public async sendPaidReaction(') &&
  accountManagerContent.includes('messages.sendPaidReaction'),
  'AccountManager implements sendPaidReaction invoking messages.sendPaidReaction'
)

assert(
  accountManagerContent.includes('public async togglePaidReactionPrivacy(') &&
  accountManagerContent.includes('messages.togglePaidReactionPrivacy'),
  'AccountManager implements togglePaidReactionPrivacy invoking messages.togglePaidReactionPrivacy'
)

assert(
  accountManagerContent.includes('public async sendPaidMedia(') &&
  accountManagerContent.includes('inputMediaPaidMedia') &&
  accountManagerContent.includes('messages.sendMedia'),
  'AccountManager implements sendPaidMedia constructing inputMediaPaidMedia'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:send-paid-reaction'") &&
  mainContent.includes('accountManager.sendPaidReaction'),
  'main.ts registers telegram:send-paid-reaction IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:toggle-paid-reaction-privacy'") &&
  mainContent.includes('accountManager.togglePaidReactionPrivacy'),
  'main.ts registers telegram:toggle-paid-reaction-privacy IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:send-paid-media'") &&
  mainContent.includes('accountManager.sendPaidMedia'),
  'main.ts registers telegram:send-paid-media IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('sendPaidReaction:') &&
  preloadContent.includes("'telegram:send-paid-reaction'"),
  'preload.ts exposes sendPaidReaction'
)

assert(
  preloadContent.includes('togglePaidReactionPrivacy:') &&
  preloadContent.includes("'telegram:toggle-paid-reaction-privacy'"),
  'preload.ts exposes togglePaidReactionPrivacy'
)

assert(
  preloadContent.includes('sendPaidMedia:') &&
  preloadContent.includes("'telegram:send-paid-media'"),
  'preload.ts exposes sendPaidMedia'
)

// 4. PaidReactionModal verification
const reactionModalPath = path.join(rootDir, 'src', 'components', 'PaidReactionModal.tsx')
const reactionModalContent = fs.readFileSync(reactionModalPath, 'utf-8')

assert(
  reactionModalContent.includes('PRESET_AMOUNTS') &&
  reactionModalContent.includes('isAnonymous') &&
  reactionModalContent.includes('sendPaidReaction'),
  'PaidReactionModal implements preset star amounts, anonymity toggle, and sendPaidReaction'
)

// 5. PaidMediaComposerModal verification
const composerModalPath = path.join(rootDir, 'src', 'components', 'chat', 'PaidMediaComposerModal.tsx')
const composerModalContent = fs.readFileSync(composerModalPath, 'utf-8')

assert(
  composerModalContent.includes('STAR_PRESETS') &&
  composerModalContent.includes('sendPaidMedia') &&
  composerModalContent.includes('effectiveStars'),
  'PaidMediaComposerModal implements Star price presets and calls sendPaidMedia'
)

// 6. ChatViewport integration verification
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportContent.includes('PaidMediaComposerModal') &&
  chatViewportContent.includes('isPaidMediaComposerModalOpen') &&
  chatViewportContent.includes('setIsPaidMediaComposerModalOpen(true)'),
  'ChatViewport integrates PaidMediaComposerModal and Info Drawer action card'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 94!\n`)
