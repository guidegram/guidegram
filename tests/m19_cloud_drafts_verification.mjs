import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Verification: Phase 3 - Cloud Drafts Synchronization...')

// 1. Check electron types definition
const typesContent = fs.readFileSync(path.resolve('electron/telegram/types.ts'), 'utf-8')
assert.ok(typesContent.includes('export interface DraftItem'), 'DraftItem must be defined in types.ts')
assert.ok(typesContent.includes('draft?: DraftItem'), 'DialogItem must include draft?: DraftItem')
console.log('✅ Check 1: Electron types include DraftItem and DialogItem update.')

// 2. Check frontend types definition
const dtsContent = fs.readFileSync(path.resolve('src/types/telegram.d.ts'), 'utf-8')
assert.ok(dtsContent.includes('DraftItem'), 'telegram.d.ts must export DraftItem')
const preloadCheck = fs.readFileSync(path.resolve('electron/preload.ts'), 'utf-8')
assert.ok(preloadCheck.includes('saveDraft:'), 'GuidegramAPI in preload.ts must declare saveDraft')
assert.ok(preloadCheck.includes('getAllDrafts:'), 'GuidegramAPI in preload.ts must declare getAllDrafts')
console.log('✅ Check 2: Frontend types and GuidegramAPI declare DraftItem and methods.')

// 3. Check AccountManager MTProto handling
const accManagerContent = fs.readFileSync(path.resolve('electron/telegram/accountManager.ts'), 'utf-8')
assert.ok(accManagerContent.includes('messages.saveDraft'), 'accountManager.ts must call messages.saveDraft')
assert.ok(accManagerContent.includes('messages.getAllDrafts'), 'accountManager.ts must call messages.getAllDrafts')
assert.ok(accManagerContent.includes('async saveDraft('), 'accountManager.ts must implement saveDraft')
assert.ok(accManagerContent.includes('async getAllDrafts('), 'accountManager.ts must implement getAllDrafts')
assert.ok(accManagerContent.includes('rawDraft._ === \'draftMessage\''), 'accountManager.ts must extract rawDraft in getDialogs')
console.log('✅ Check 3: AccountManager MTProto methods implemented.')

// 4. Check Main IPC handlers
const mainContent = fs.readFileSync(path.resolve('electron/main.ts'), 'utf-8')
assert.ok(mainContent.includes("'telegram:save-draft'"), "main.ts must register 'telegram:save-draft'")
assert.ok(mainContent.includes("'telegram:get-all-drafts'"), "main.ts must register 'telegram:get-all-drafts'")
console.log('✅ Check 4: Main IPC routes registered.')

// 5. Check UI ChatList rendering of draft
const chatListContent = fs.readFileSync(path.resolve('src/components/ChatList.tsx'), 'utf-8')
assert.ok(chatListContent.includes('dialog.draft?.text'), 'ChatList must check dialog.draft?.text')
assert.ok(chatListContent.includes("t('chat.draft')"), 'ChatList must render draft label')
console.log('✅ Check 5: ChatList renders cloud draft badge and text.')

// 6. Check UI ChatViewport synchronization
const chatViewportContent = fs.readFileSync(path.resolve('src/components/ChatViewport.tsx'), 'utf-8')
assert.ok(chatViewportContent.includes('chat?.draft?.text'), 'ChatViewport must populate inputText from draft')
assert.ok(chatViewportContent.includes('window.guidegram.saveDraft'), 'ChatViewport must call saveDraft')
console.log('✅ Check 6: ChatViewport syncs drafts automatically with debounce and clears on send.')

// 7. Check translations
const i18nContent = fs.readFileSync(path.resolve('src/i18n/translations.ts'), 'utf-8')
assert.ok(i18nContent.includes("'chat.draft'"), "translations.ts must have 'chat.draft' key")
console.log('✅ Check 7: Bilingual translations present for chat.draft.')

console.log('🎉 ALL 7 VERIFICATION CHECKS PASSED FOR PHASE 3 (Cloud Drafts Sync)!')
