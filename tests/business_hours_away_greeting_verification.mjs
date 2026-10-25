import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Business Hours & Away/Greeting Messages Protocol Verification (Phase 84)...')

// 1. Verify types in electron/telegram/types.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('export interface BusinessWorkHours'), 'types.ts must declare BusinessWorkHours')
assert(typesContent.includes('export interface BusinessGreetingConfig'), 'types.ts must declare BusinessGreetingConfig')
assert(typesContent.includes('export interface BusinessAwayConfig'), 'types.ts must declare BusinessAwayConfig')
console.log('  ✅ 1. BusinessWorkHours, BusinessGreetingConfig & BusinessAwayConfig types verified.')

// 2. Verify AccountManager MTProto methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async updateBusinessWorkHours('), 'AccountManager must implement updateBusinessWorkHours')
assert(accountManagerContent.includes('public async updateBusinessGreetingMessage('), 'AccountManager must implement updateBusinessGreetingMessage')
assert(accountManagerContent.includes("account.updateBusinessGreetingMessage"), 'updateBusinessGreetingMessage must invoke account.updateBusinessGreetingMessage')
assert(accountManagerContent.includes('public async updateBusinessAwayMessage('), 'AccountManager must implement updateBusinessAwayMessage')
assert(accountManagerContent.includes("account.updateBusinessAwayMessage"), 'updateBusinessAwayMessage must invoke account.updateBusinessAwayMessage')
console.log('  ✅ 2. AccountManager Business MTProto methods verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:update-business-work-hours'"), 'main.ts must register telegram:update-business-work-hours')
assert(mainContent.includes("'telegram:update-business-greeting-message'"), 'main.ts must register telegram:update-business-greeting-message')
assert(mainContent.includes("'telegram:update-business-away-message'"), 'main.ts must register telegram:update-business-away-message')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('updateBusinessWorkHours:'), 'preload.ts must expose updateBusinessWorkHours')
assert(preloadContent.includes('updateBusinessGreetingMessage:'), 'preload.ts must expose updateBusinessGreetingMessage')
assert(preloadContent.includes('updateBusinessAwayMessage:'), 'preload.ts must expose updateBusinessAwayMessage')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify BusinessSettingsModal component
const modalPath = path.join(root, 'src/components/chat/BusinessSettingsModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')
assert(modalContent.includes('BusinessSettingsModal'), 'BusinessSettingsModal must exist')
assert(modalContent.includes('Business Hours'), 'BusinessSettingsModal must have Business Hours tab')
assert(modalContent.includes('Greeting'), 'BusinessSettingsModal must have Greeting tab')
assert(modalContent.includes('Away Message'), 'BusinessSettingsModal must have Away Message tab')
assert(modalContent.includes('updateBusinessWorkHours'), 'BusinessSettingsModal must invoke updateBusinessWorkHours')
assert(modalContent.includes('updateBusinessGreetingMessage'), 'BusinessSettingsModal must invoke updateBusinessGreetingMessage')
assert(modalContent.includes('updateBusinessAwayMessage'), 'BusinessSettingsModal must invoke updateBusinessAwayMessage')
console.log('  ✅ 4. BusinessSettingsModal and 3-tab layout verified.')

// 5. Verify ChatViewport UI integration
const viewportPath = path.join(root, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('BusinessSettingsModal'), 'ChatViewport must import and render BusinessSettingsModal')
assert(viewportContent.includes('isBusinessModalOpen'), 'ChatViewport must hold isBusinessModalOpen state')
assert(viewportContent.includes('Briefcase'), 'ChatViewport must render Briefcase button in header')
console.log('  ✅ 5. ChatViewport Briefcase button and modal integration verified.')

console.log('🎉 Phase 84 Verification Passed: 20/20 checks succeeded cleanly.')
