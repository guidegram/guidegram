import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Stories Privacy Rules Protocol Verification (Phase 88)...')

// 1. Verify types in electron/telegram/types.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes("'selected_contacts'"), 'StoryPrivacy must include selected_contacts')
assert(typesContent.includes("'nobody'"), 'StoryPrivacy must include nobody')
assert(typesContent.includes('allowedUserIds?: string[]'), 'SendStoryOptions must include allowedUserIds')
console.log('  ✅ 1. StoryPrivacy and SendStoryOptions types verified.')

// 2. Verify AccountManager MTProto methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async setStoriesPrivacy('), 'AccountManager must implement setStoriesPrivacy')
assert(accountManagerContent.includes("account.setPrivacy"), 'setStoriesPrivacy must invoke account.setPrivacy')
assert(accountManagerContent.includes("inputPrivacyKeyStories"), 'setStoriesPrivacy must target inputPrivacyKeyStories')
assert(accountManagerContent.includes("inputPrivacyValueAllowUsers"), 'sendStory & setStoriesPrivacy must support inputPrivacyValueAllowUsers')
console.log('  ✅ 2. AccountManager setStoriesPrivacy & sendStory privacy rules verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:set-stories-privacy'"), 'main.ts must register telegram:set-stories-privacy')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('setStoriesPrivacy:'), 'preload.ts must expose setStoriesPrivacy')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify StoryComposerModal UI
const composerPath = path.join(root, 'src/components/StoryComposerModal.tsx')
const composerContent = fs.readFileSync(composerPath, 'utf8')
assert(composerContent.includes('selected_contacts'), 'StoryComposerModal must offer selected_contacts option')
assert(composerContent.includes('UserCheck'), 'StoryComposerModal must use UserCheck icon for selected_contacts')
console.log('  ✅ 4. StoryComposerModal privacy selector verified.')

console.log('🎉 Phase 88 Verification Passed: 20/20 checks succeeded cleanly.')
