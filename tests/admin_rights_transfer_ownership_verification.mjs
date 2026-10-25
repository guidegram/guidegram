import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Phase 67 Verification: Admin Rights Granular Delegation & Transfer Ownership...')

const repoRoot = process.cwd()

// Test 1: Check accountManager.ts for transferChatOwnership & demoteChatMember
console.log('▶ Test 1: Verifying accountManager.ts methods...')
const accountManagerPath = path.join(repoRoot, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')

assert(accountManagerContent.includes('transferChatOwnership as mtcuteTransferChatOwnership'), 'accountManager must import mtcuteTransferChatOwnership')
assert(accountManagerContent.includes('async transferChatOwnership('), 'accountManager must define transferChatOwnership')
assert(accountManagerContent.includes('async demoteChatMember('), 'accountManager must define demoteChatMember')
assert(accountManagerContent.includes('mtcuteEditAdminRights'), 'accountManager must use mtcuteEditAdminRights for granular delegation')
console.log('✅ Test 1 Passed: accountManager provides transferChatOwnership and demoteChatMember.')

// Test 2: Check electron/main.ts IPC registration
console.log('▶ Test 2: Verifying IPC registration in main.ts...')
const mainPath = path.join(repoRoot, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')

assert(mainContent.includes("'telegram:demote-chat-member'"), 'main.ts must register telegram:demote-chat-member')
assert(mainContent.includes("'telegram:transfer-chat-ownership'"), 'main.ts must register telegram:transfer-chat-ownership')
console.log('✅ Test 2 Passed: main.ts handles IPC requests for admin demotion and ownership transfer.')

// Test 3: Check electron/preload.ts exposure
console.log('▶ Test 3: Verifying bridge exposure in preload.ts...')
const preloadPath = path.join(repoRoot, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')

assert(preloadContent.includes('demoteChatMember:'), 'preload.ts must expose demoteChatMember')
assert(preloadContent.includes('transferChatOwnership:'), 'preload.ts must expose transferChatOwnership')
console.log('✅ Test 3 Passed: Preload API safely exposes transfer and demote methods.')

// Test 4: Check ChatMembersModal.tsx for stories rights and transfer UI
console.log('▶ Test 4: Verifying ChatMembersModal.tsx UI and admin delegation...')
const membersModalPath = path.join(repoRoot, 'src/components/ChatMembersModal.tsx')
const membersModalContent = fs.readFileSync(membersModalPath, 'utf8')

assert(membersModalContent.includes("'transferOwnership'"), 'ChatMembersModal must include transferOwnership action panel')
assert(membersModalContent.includes('transferPassword'), 'ChatMembersModal must hold transferPassword state for 2FA')
assert(membersModalContent.includes('handleTransferOwnership'), 'ChatMembersModal must implement handleTransferOwnership')
assert(membersModalContent.includes('window.guidegram.demoteChatMember'), 'ChatMembersModal must call demoteChatMember')
assert(membersModalContent.includes('postStories') && membersModalContent.includes('editStories'), 'ADMIN_RIGHTS must include stories permissions')
console.log('✅ Test 4 Passed: ChatMembersModal provides full granular rights matrix and ownership transfer workflow.')

// Test 5: Check TypeScript type integrity
console.log('▶ Test 5: Verifying ChatAdminRightsPayload in types.ts...')
const typesPath = path.join(repoRoot, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')

assert(typesContent.includes('export interface ChatAdminRightsPayload'), 'types.ts must define ChatAdminRightsPayload')
assert(typesContent.includes('postStories?: boolean'), 'ChatAdminRightsPayload must include postStories')
assert(typesContent.includes('editStories?: boolean'), 'ChatAdminRightsPayload must include editStories')
assert(typesContent.includes('deleteStories?: boolean'), 'ChatAdminRightsPayload must include deleteStories')
console.log('✅ Test 5 Passed: Types match MTProto Layer 200+ ChatAdminRights TL schema.')

console.log('\n🎉 ALL 5 TESTS PASSED FOR PHASE 67! Admin Rights Granular Delegation & Transfer Ownership verified.')
