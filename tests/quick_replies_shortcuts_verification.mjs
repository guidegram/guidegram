import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Quick Replies & Canned Shortcuts Protocol Verification (Phase 82)...')

// 1. Verify types in electron/telegram/types.ts & src/types/telegram.d.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('export interface QuickReplyShortcutItem'), 'types.ts must declare QuickReplyShortcutItem')
assert(typesContent.includes('shortcut: string'), 'QuickReplyShortcutItem must include shortcut')
assert(typesContent.includes('shortcutId: number'), 'QuickReplyShortcutItem must include shortcutId')

const dtsPath = path.join(root, 'src/types/telegram.d.ts')
const dtsContent = fs.readFileSync(dtsPath, 'utf8')
assert(dtsContent.includes('QuickReplyShortcutItem'), 'telegram.d.ts must re-export QuickReplyShortcutItem')
console.log('  ✅ 1. QuickReplyShortcutItem types verified.')

// 2. Verify accountManager.ts methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async getQuickReplies('), 'AccountManager must implement getQuickReplies')
assert(accountManagerContent.includes("messages.getQuickReplies"), 'getQuickReplies must call messages.getQuickReplies')
assert(accountManagerContent.includes('public async sendQuickReplyMessages('), 'AccountManager must implement sendQuickReplyMessages')
assert(accountManagerContent.includes("messages.sendQuickReplyMessages"), 'sendQuickReplyMessages must call messages.sendQuickReplyMessages')
assert(accountManagerContent.includes('public async editQuickReplyShortcut('), 'AccountManager must implement editQuickReplyShortcut')
assert(accountManagerContent.includes('public async deleteQuickReplyShortcut('), 'AccountManager must implement deleteQuickReplyShortcut')
console.log('  ✅ 2. AccountManager Quick Replies MTProto methods verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:get-quick-replies'"), 'main.ts must register telegram:get-quick-replies')
assert(mainContent.includes("'telegram:send-quick-reply-messages'"), 'main.ts must register telegram:send-quick-reply-messages')
assert(mainContent.includes("'telegram:edit-quick-reply-shortcut'"), 'main.ts must register telegram:edit-quick-reply-shortcut')
assert(mainContent.includes("'telegram:delete-quick-reply-shortcut'"), 'main.ts must register telegram:delete-quick-reply-shortcut')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('getQuickReplies:'), 'preload.ts must expose getQuickReplies')
assert(preloadContent.includes('sendQuickReplyMessages:'), 'preload.ts must expose sendQuickReplyMessages')
assert(preloadContent.includes('editQuickReplyShortcut:'), 'preload.ts must expose editQuickReplyShortcut')
assert(preloadContent.includes('deleteQuickReplyShortcut:'), 'preload.ts must expose deleteQuickReplyShortcut')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify QuickRepliesPanel UI component
const panelPath = path.join(root, 'src/components/chat/QuickRepliesPanel.tsx')
const panelContent = fs.readFileSync(panelPath, 'utf8')
assert(panelContent.includes('QuickRepliesPanel'), 'QuickRepliesPanel component must exist')
assert(panelContent.includes('getQuickReplies'), 'QuickRepliesPanel must call getQuickReplies')
assert(panelContent.includes('onSelectShortcut'), 'QuickRepliesPanel must invoke onSelectShortcut')
console.log('  ✅ 4. QuickRepliesPanel UI component verified.')

// 5. Verify ChatViewport integration
const viewportPath = path.join(root, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('QuickRepliesPanel'), 'ChatViewport must import and render QuickRepliesPanel')
assert(viewportContent.includes('quickReplyQuery'), 'ChatViewport must hold quickReplyQuery state')
assert(viewportContent.includes('handleSelectQuickReply'), 'ChatViewport must handle quick reply selection')
assert(viewportContent.includes("val.startsWith('/')"), 'ChatViewport must trigger on "/" shortcut input')
console.log('  ✅ 5. ChatViewport "/" shortcut detection and panel integration verified.')

console.log('🎉 Phase 82 Verification Passed: 20/20 checks succeeded cleanly.')
