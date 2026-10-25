import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Star Subscriptions & Bot Monetization Protocol Verification...\n')

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
  accountManagerContent.includes('public async getStarsSubscriptions(') &&
  accountManagerContent.includes('payments.getStarsSubscriptions'),
  'AccountManager implements getStarsSubscriptions invoking payments.getStarsSubscriptions'
)

assert(
  accountManagerContent.includes('public async changeStarsSubscription(') &&
  accountManagerContent.includes('payments.changeStarsSubscription'),
  'AccountManager implements changeStarsSubscription invoking payments.changeStarsSubscription'
)

assert(
  accountManagerContent.includes('public async paymentGetStarsRevenueStats(') &&
  accountManagerContent.includes('getStarsRevenueStats'),
  'AccountManager implements paymentGetStarsRevenueStats'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:get-stars-subscriptions'") &&
  mainContent.includes('accountManager.getStarsSubscriptions'),
  'main.ts registers telegram:get-stars-subscriptions IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:change-stars-subscription'") &&
  mainContent.includes('accountManager.changeStarsSubscription'),
  'main.ts registers telegram:change-stars-subscription IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:payment-get-stars-revenue-stats'") &&
  mainContent.includes('accountManager.paymentGetStarsRevenueStats'),
  'main.ts registers telegram:payment-get-stars-revenue-stats IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('getStarsSubscriptions:') &&
  preloadContent.includes("'telegram:get-stars-subscriptions'"),
  'preload.ts exposes getStarsSubscriptions'
)

assert(
  preloadContent.includes('changeStarsSubscription:') &&
  preloadContent.includes("'telegram:change-stars-subscription'"),
  'preload.ts exposes changeStarsSubscription'
)

assert(
  preloadContent.includes('paymentGetStarsRevenueStats:') &&
  preloadContent.includes("'telegram:payment-get-stars-revenue-stats'"),
  'preload.ts exposes paymentGetStarsRevenueStats'
)

// 4. StarSubscriptionsModal verification
const modalPath = path.join(rootDir, 'src', 'components', 'chat', 'StarSubscriptionsModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

assert(
  modalContent.includes("'subscriptions'") &&
  modalContent.includes("'monetization'"),
  'StarSubscriptionsModal implements Subscriptions and Monetization tab switcher'
)

assert(
  modalContent.includes('changeStarsSubscription') &&
  modalContent.includes('Cancel Subscription'),
  'StarSubscriptionsModal implements subscription toggle and cancellation actions'
)

assert(
  modalContent.includes('paymentGetStarsRevenueStats') &&
  modalContent.includes('Available Stars Balance') &&
  modalContent.includes('https://fragment.com/stars'),
  'StarSubscriptionsModal renders revenue statistics and Fragment withdrawal link'
)

// 5. ChatViewport integration verification
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportContent.includes('StarSubscriptionsModal') &&
  chatViewportContent.includes('isStarSubscriptionsModalOpen') &&
  chatViewportContent.includes('setIsStarSubscriptionsModalOpen(true)'),
  'ChatViewport integrates StarSubscriptionsModal and Info Drawer action card'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 92!\n`)
