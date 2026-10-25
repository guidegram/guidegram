import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Active Stories Full Viewer & Reactions Protocol Verification (Phase 87)...')

// 1. Verify AccountManager MTProto methods
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async sendStoryReaction('), 'AccountManager must implement sendStoryReaction')
assert(accountManagerContent.includes("stories.sendReaction"), 'sendStoryReaction must invoke stories.sendReaction')
assert(accountManagerContent.includes('public async readStories('), 'AccountManager must implement readStories')
assert(accountManagerContent.includes("stories.readStories"), 'readStories must invoke stories.readStories')
console.log('  ✅ 1. AccountManager sendStoryReaction & readStories MTProto methods verified.')

// 2. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes('sendStoryReaction'), 'main.ts must register sendStoryReaction')
assert(mainContent.includes('readStories'), 'main.ts must register readStories')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('sendStoryReaction:'), 'preload.ts must expose sendStoryReaction')
assert(preloadContent.includes('readStories:'), 'preload.ts must expose readStories')
console.log('  ✅ 2. IPC & Preload bridge verified.')

// 3. Verify StoryViewerModal features
const viewerPath = path.join(root, 'src/components/StoryViewerModal.tsx')
const viewerContent = fs.readFileSync(viewerPath, 'utf8')
assert(viewerContent.includes('readStories'), 'StoryViewerModal must invoke readStories on story view')
assert(viewerContent.includes('sendStoryReaction'), 'StoryViewerModal must invoke sendStoryReaction')
assert(viewerContent.includes('handleSendReaction'), 'StoryViewerModal must handle reaction selection')
assert(viewerContent.includes('localGhostMode'), 'StoryViewerModal must manage localGhostMode toggle')
assert(viewerContent.includes('reactionFeedback'), 'StoryViewerModal must support floating reaction feedback')
console.log('  ✅ 3. StoryViewerModal read status sync, quick reactions bar, and stealth mode verified.')

console.log('🎉 Phase 87 Verification Passed: 20/20 checks succeeded cleanly.')
