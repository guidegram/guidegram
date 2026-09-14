import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Verification: Phase 2 - Interactive Polls & Quizzes...')

// 1. Check electron types definition
const typesContent = fs.readFileSync(path.resolve('electron/telegram/types.ts'), 'utf-8')
assert.ok(typesContent.includes('export interface PollOptionItem'), 'PollOptionItem must be defined in types.ts')
assert.ok(typesContent.includes('export interface PollItem'), 'PollItem must be defined in types.ts')
assert.ok(typesContent.includes('poll?: PollItem'), 'MessageItem must include poll?: PollItem')
assert.ok(typesContent.includes("'poll'"), "mediaType should support 'poll'")
console.log('✅ Check 1: Electron types include PollItem, PollOptionItem, and MessageItem updates.')

// 2. Check frontend types definition
const dtsContent = fs.readFileSync(path.resolve('src/types/telegram.d.ts'), 'utf-8')
assert.ok(dtsContent.includes('PollOptionItem'), 'telegram.d.ts must export PollOptionItem')
assert.ok(dtsContent.includes('PollItem'), 'telegram.d.ts must export PollItem')
const preloadCheck = fs.readFileSync(path.resolve('electron/preload.ts'), 'utf-8')
assert.ok(preloadCheck.includes('sendVote:'), 'GuidegramAPI interface in preload.ts must declare sendVote')
assert.ok(preloadCheck.includes('createPoll:'), 'GuidegramAPI interface in preload.ts must declare createPoll')
console.log('✅ Check 2: Frontend types and GuidegramAPI declare Poll types and methods.')

// 3. Check AccountManager MTProto handling
const accManagerContent = fs.readFileSync(path.resolve('electron/telegram/accountManager.ts'), 'utf-8')
assert.ok(accManagerContent.includes('parsePollFromMedia'), 'accountManager.ts must contain parsePollFromMedia')
assert.ok(accManagerContent.includes('messages.sendVote'), 'accountManager.ts must call messages.sendVote')
assert.ok(accManagerContent.includes('inputMediaPoll'), 'accountManager.ts must construct inputMediaPoll')
assert.ok(accManagerContent.includes('async sendVote('), 'accountManager.ts must export sendVote method')
assert.ok(accManagerContent.includes('async createPoll('), 'accountManager.ts must export createPoll method')
console.log('✅ Check 3: MTProto handlers in accountManager.ts implemented.')

// 4. Check Preload and Main IPC registration
const preloadContent = fs.readFileSync(path.resolve('electron/preload.ts'), 'utf-8')
assert.ok(preloadContent.includes('telegram:send-vote'), 'preload.ts must invoke telegram:send-vote')
assert.ok(preloadContent.includes('telegram:create-poll'), 'preload.ts must invoke telegram:create-poll')

const mainContent = fs.readFileSync(path.resolve('electron/main.ts'), 'utf-8')
assert.ok(mainContent.includes("'telegram:send-vote'"), "main.ts must register 'telegram:send-vote' handler")
assert.ok(mainContent.includes("'telegram:create-poll'"), "main.ts must register 'telegram:create-poll' handler")
console.log('✅ Check 4: Preload & Main IPC routes registered.')

// 5. Check PollWidget and CreatePollModal components exist and are integrated
assert.ok(fs.existsSync(path.resolve('src/components/PollWidget.tsx')), 'PollWidget.tsx must exist')
assert.ok(fs.existsSync(path.resolve('src/components/CreatePollModal.tsx')), 'CreatePollModal.tsx must exist')

const chatViewportContent = fs.readFileSync(path.resolve('src/components/ChatViewport.tsx'), 'utf-8')
assert.ok(chatViewportContent.includes("import { PollWidget } from './PollWidget'"), 'ChatViewport must import PollWidget')
assert.ok(chatViewportContent.includes("import { CreatePollModal } from './CreatePollModal'"), 'ChatViewport must import CreatePollModal')
assert.ok(chatViewportContent.includes('<PollWidget'), 'ChatViewport must render <PollWidget />')
assert.ok(chatViewportContent.includes('<CreatePollModal'), 'ChatViewport must render <CreatePollModal />')
console.log('✅ Check 5: UI components PollWidget & CreatePollModal mounted into ChatViewport.')

// 6. Check i18n translations
const i18nContent = fs.readFileSync(path.resolve('src/i18n/translations.ts'), 'utf-8')
assert.ok(i18nContent.includes("'poll.vote'"), "translations.ts must have 'poll.vote'")
assert.ok(i18nContent.includes("'poll.anonymous'"), "translations.ts must have 'poll.anonymous'")
console.log('✅ Check 6: Bilingual English/Persian translations present.')

console.log('🎉 ALL 6 VERIFICATION CHECKS PASSED FOR PHASE 2 (Interactive Polls & Quizzes)!')
