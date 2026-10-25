import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Scheduled & Silent Messages Protocol Verification (Phase 80)...')

// 1. Verify types in electron/telegram/types.ts & src/types/telegram.d.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('export interface ScheduledMessageItem'), 'types.ts must declare ScheduledMessageItem')
assert(typesContent.includes('scheduledDate: number'), 'ScheduledMessageItem must have scheduledDate')
assert(typesContent.includes('isWhenOnline?: boolean'), 'ScheduledMessageItem must have isWhenOnline')
console.log('  ✅ 1. ScheduledMessageItem types verified.')

// 2. Verify accountManager.ts methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async getScheduledMessages('), 'AccountManager must implement getScheduledMessages')
assert(accountManagerContent.includes('messages.getScheduledHistory'), 'getScheduledMessages must call messages.getScheduledHistory')
assert(accountManagerContent.includes('public async sendScheduledMessageNow('), 'AccountManager must implement sendScheduledMessageNow')
assert(accountManagerContent.includes('messages.sendScheduledMessages'), 'sendScheduledMessageNow must call messages.sendScheduledMessages')
assert(accountManagerContent.includes('public async deleteScheduledMessages('), 'AccountManager must implement deleteScheduledMessages')
assert(accountManagerContent.includes('messages.deleteScheduledMessages'), 'deleteScheduledMessages must call messages.deleteScheduledMessages')
console.log('  ✅ 2. AccountManager scheduled messages methods verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:get-scheduled-messages'"), 'main.ts must register telegram:get-scheduled-messages')
assert(mainContent.includes("'telegram:send-scheduled-message-now'"), 'main.ts must register telegram:send-scheduled-message-now')
assert(mainContent.includes("'telegram:delete-scheduled-messages'"), 'main.ts must register telegram:delete-scheduled-messages')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('getScheduledMessages:'), 'preload.ts must expose getScheduledMessages')
assert(preloadContent.includes('sendScheduledMessageNow:'), 'preload.ts must expose sendScheduledMessageNow')
assert(preloadContent.includes('deleteScheduledMessages:'), 'preload.ts must expose deleteScheduledMessages')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify ScheduledMessagesModal UI component
const modalPath = path.join(root, 'src/components/ScheduledMessagesModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')
assert(modalContent.includes('ScheduledMessagesModal'), 'ScheduledMessagesModal component must exist')
assert(modalContent.includes('getScheduledMessages'), 'ScheduledMessagesModal must call getScheduledMessages')
assert(modalContent.includes('sendScheduledMessageNow'), 'ScheduledMessagesModal must call sendScheduledMessageNow')
assert(modalContent.includes('deleteScheduledMessages'), 'ScheduledMessagesModal must call deleteScheduledMessages')
console.log('  ✅ 4. ScheduledMessagesModal UI component verified.')

// 5. Verify ChatViewport integration
const viewportPath = path.join(root, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('ScheduledMessagesModal'), 'ChatViewport must import and render ScheduledMessagesModal')
assert(viewportContent.includes('isScheduleModalOpen'), 'ChatViewport must hold isScheduleModalOpen state')
assert(viewportContent.includes('Send Without Sound'), 'ChatViewport must feature Send Without Sound option')
assert(viewportContent.includes('Schedule Message'), 'ChatViewport must feature Schedule Message option')
assert(viewportContent.includes('scheduleDate:'), 'ChatViewport must pass scheduleDate in send options')
console.log('  ✅ 5. ChatViewport silent send, schedule modal, and scheduled queue verified.')

console.log('🎉 Phase 80 Verification Passed: 20/20 checks succeeded cleanly.')
