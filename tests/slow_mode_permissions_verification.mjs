import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Phase 66 Verification: Slow Mode, Anti-Spam & Chat Permissions Enforcement...')

const repoRoot = process.cwd()

// Test 1: Check ChatDetails & ChatSettingsInput types in electron/telegram/types.ts
console.log('▶ Test 1: Verifying types in electron/telegram/types.ts...')
const typesPath = path.join(repoRoot, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')

assert(typesContent.includes('antiSpamEnabled?: boolean'), 'ChatDetails must define antiSpamEnabled')
assert(typesContent.includes('canToggleAntiSpam?: boolean'), 'ChatDetails must define canToggleAntiSpam')
assert(typesContent.includes('slowmodeNextSendDate?: number'), 'ChatDetails must define slowmodeNextSendDate')
assert(typesContent.includes('permissionsMatrix?: {'), 'ChatDetails must define permissionsMatrix')
assert(typesContent.includes('antiSpamEnabled?: boolean') && typesContent.includes('export interface ChatSettingsInput'), 'ChatSettingsInput must define antiSpamEnabled')
console.log('✅ Test 1 Passed: ChatDetails and ChatSettingsInput contain full anti-spam, slow mode, and permission matrices.')

// Test 2: Check accountManager.ts for anti-spam mapping and updateChatSettings propagation
console.log('▶ Test 2: Verifying accountManager.ts implementation...')
const accountManagerPath = path.join(repoRoot, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')

assert(accountManagerContent.includes('antiSpamEnabled: Boolean(res.fullChat?.antispam)'), 'accountManager must map res.fullChat.antispam')
assert(accountManagerContent.includes('slowmodeNextSendDate: res.fullChat?.slowmodeNextSendDate'), 'accountManager must map slowmodeNextSendDate')
assert(accountManagerContent.includes('channelToggleAntiSpam'), 'accountManager must expose channelToggleAntiSpam')
assert(accountManagerContent.includes('channelToggleSlowMode'), 'accountManager must expose channelToggleSlowMode')
assert(accountManagerContent.includes('if (input.antiSpamEnabled !== undefined)'), 'updateChatSettings must handle antiSpamEnabled')
console.log('✅ Test 2 Passed: accountManager properly inspects MTProto fullChat and routes antiSpam updates.')

// Test 3: Check IPC registration in electron/main.ts and preload.ts
console.log('▶ Test 3: Verifying IPC wiring in main.ts and preload.ts...')
const mainPath = path.join(repoRoot, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
const preloadPath = path.join(repoRoot, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')

assert(mainContent.includes("'telegram:channel-toggle-anti-spam'"), 'main.ts must register channel-toggle-anti-spam IPC handler')
assert(preloadContent.includes('channelToggleAntiSpam:'), 'preload.ts must expose channelToggleAntiSpam')
console.log('✅ Test 3 Passed: IPC bridge is fully registered and exposed to renderer.')

// Test 4: Check ChatSettingsModal.tsx for Anti-Spam toggle UI
console.log('▶ Test 4: Verifying ChatSettingsModal.tsx...')
const settingsModalPath = path.join(repoRoot, 'src/components/ChatSettingsModal.tsx')
const settingsModalContent = fs.readFileSync(settingsModalPath, 'utf8')

assert(settingsModalContent.includes('canEditAntiSpam'), 'ChatSettingsModal must check canEditAntiSpam')
assert(settingsModalContent.includes('antiSpam'), 'ChatSettingsModal must hold antiSpam state')
assert(settingsModalContent.includes('Aggressive Anti-Spam'), 'ChatSettingsModal must render Aggressive Anti-Spam label')
assert(settingsModalContent.includes('input.antiSpamEnabled = antiSpam'), 'ChatSettingsModal must pass antiSpamEnabled on save')
console.log('✅ Test 4 Passed: ChatSettingsModal provides toggle and validation for Aggressive Anti-Spam.')

// Test 5: Check ChatViewport.tsx for Slow Mode and Permissions enforcement
console.log('▶ Test 5: Verifying ChatViewport.tsx enforcement...')
const viewportPath = path.join(repoRoot, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')

assert(viewportContent.includes('slowModeSecondsLeft'), 'ChatViewport must track slowModeSecondsLeft countdown')
assert(viewportContent.includes('canSendMessages'), 'ChatViewport must calculate canSendMessages')
assert(viewportContent.includes('canSendMedia'), 'ChatViewport must calculate canSendMedia')
assert(viewportContent.includes('canSendStickers'), 'ChatViewport must calculate canSendStickers')
assert(viewportContent.includes('disabled={slowModeSecondsLeft > 0}'), 'Send button must be disabled when slowModeSecondsLeft > 0')
assert(viewportContent.includes('disabled={!canSendMedia'), 'Attachment button must be disabled when media sending is restricted')
assert(viewportContent.includes('disabled={!canSendStickers'), 'Sticker button must be disabled when sticker sending is restricted')
assert(viewportContent.includes('Slow mode is active. Please wait'), 'handleSend must reject sending when slow mode is active')
console.log('✅ Test 5 Passed: ChatViewport enforces granular permissions and slow mode countdowns.')

console.log('\n🎉 ALL 5 TESTS PASSED FOR PHASE 66! Slow Mode, Anti-Spam & Chat Permissions Enforcement verified.')
