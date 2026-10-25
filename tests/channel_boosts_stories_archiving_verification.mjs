import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Channel Boosts & Stories Archiving Protocol Verification...\n')

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
  accountManagerContent.includes('public async getChannelBoostStatus(') &&
  accountManagerContent.includes("premium.getBoostsStatus"),
  'AccountManager implements getChannelBoostStatus invoking premium.getBoostsStatus'
)

assert(
  accountManagerContent.includes('public async applyChannelBoost(') &&
  accountManagerContent.includes("premium.applyBoost"),
  'AccountManager implements applyChannelBoost invoking premium.applyBoost'
)

assert(
  accountManagerContent.includes('public async getMyBoosts(') &&
  accountManagerContent.includes("premium.getMyBoosts"),
  'AccountManager implements getMyBoosts invoking premium.getMyBoosts'
)

assert(
  accountManagerContent.includes('public async getStoriesArchive(') &&
  accountManagerContent.includes("stories.getStoriesArchive"),
  'AccountManager implements getStoriesArchive invoking stories.getStoriesArchive'
)

assert(
  accountManagerContent.includes('public async getPinnedStories(') &&
  accountManagerContent.includes("stories.getPinnedStories"),
  'AccountManager implements getPinnedStories invoking stories.getPinnedStories'
)

assert(
  accountManagerContent.includes('public async toggleStoryPinned(') &&
  accountManagerContent.includes("stories.togglePinned"),
  'AccountManager implements toggleStoryPinned invoking stories.togglePinned'
)

// 2. main.ts IPC verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:get-channel-boost-status'") &&
  mainContent.includes('accountManager.getChannelBoostStatus'),
  'main.ts registers telegram:get-channel-boost-status IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:apply-channel-boost'") &&
  mainContent.includes('accountManager.applyChannelBoost'),
  'main.ts registers telegram:apply-channel-boost IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:get-my-boosts'") &&
  mainContent.includes('accountManager.getMyBoosts'),
  'main.ts registers telegram:get-my-boosts IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:get-stories-archive'") &&
  mainContent.includes('accountManager.getStoriesArchive'),
  'main.ts registers telegram:get-stories-archive IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:get-pinned-stories'") &&
  mainContent.includes('accountManager.getPinnedStories'),
  'main.ts registers telegram:get-pinned-stories IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:toggle-story-pinned'") &&
  mainContent.includes('accountManager.toggleStoryPinned'),
  'main.ts registers telegram:toggle-story-pinned IPC handler'
)

// 3. preload.ts verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('getChannelBoostStatus:') &&
  (preloadContent.includes("'telegram:get-channel-boosts'") || preloadContent.includes("'telegram:get-channel-boost-status'")),
  'preload.ts exposes getChannelBoostStatus'
)

assert(
  preloadContent.includes('applyChannelBoost:') &&
  preloadContent.includes("'telegram:apply-channel-boost'"),
  'preload.ts exposes applyChannelBoost'
)

assert(
  preloadContent.includes('getMyBoosts:') &&
  preloadContent.includes("'telegram:get-my-boosts'"),
  'preload.ts exposes getMyBoosts'
)

assert(
  preloadContent.includes('getStoriesArchive:') &&
  preloadContent.includes("'telegram:get-stories-archive'"),
  'preload.ts exposes getStoriesArchive'
)

assert(
  preloadContent.includes('getPinnedStories:') &&
  preloadContent.includes("'telegram:get-pinned-stories'"),
  'preload.ts exposes getPinnedStories'
)

assert(
  preloadContent.includes('toggleStoryPinned:') &&
  preloadContent.includes("'telegram:toggle-story-pinned'"),
  'preload.ts exposes toggleStoryPinned'
)

// 4. Component verification
const boostModalPath = path.join(rootDir, 'src', 'components', 'chat', 'ChannelBoostModal.tsx')
const boostModalContent = fs.readFileSync(boostModalPath, 'utf-8')

assert(
  boostModalContent.includes('getChannelBoostStatus') &&
  boostModalContent.includes('applyChannelBoost') &&
  boostModalContent.includes('BOOST_PERKS'),
  'ChannelBoostModal displays level perks and triggers boost mutations'
)

const storyViewerPath = path.join(rootDir, 'src', 'components', 'StoryViewerModal.tsx')
const storyViewerContent = fs.readFileSync(storyViewerPath, 'utf-8')

assert(
  storyViewerContent.includes("storyTab === 'pinned'") &&
  storyViewerContent.includes("storyTab === 'archive'") &&
  storyViewerContent.includes('getPinnedStories') &&
  storyViewerContent.includes('getStoriesArchive'),
  'StoryViewerModal implements active, pinned, and archive mode tabs'
)

// 5. ChatViewport integration verification
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportContent.includes('ChannelBoostModal') &&
  chatViewportContent.includes('isChannelBoostModalOpen') &&
  chatViewportContent.includes('setIsChannelBoostModalOpen(true)'),
  'ChatViewport integrates ChannelBoostModal and Info Drawer boost action'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 90!\n`)
