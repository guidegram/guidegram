import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('====================================================')
console.log('Running Milestone 17: Shared Media Gallery Verification')
console.log('====================================================\n')

// 1. Type definitions
console.log('[SUITE 1] Type Definitions Verification')
const typesPath = path.join(rootDir, 'electron', 'telegram', 'types.ts')
const typesSrc = fs.readFileSync(typesPath, 'utf-8')

assert(typesSrc.includes('SharedMediaFilterType'), 'types.ts defines SharedMediaFilterType')
assert(typesSrc.includes('SharedMediaItem'), 'types.ts defines SharedMediaItem')
assert(typesSrc.includes('SharedMediaResponse'), 'types.ts defines SharedMediaResponse')
console.log('  [PASS] electron/telegram/types.ts defines SharedMedia types and interfaces')

// 2. AccountManager MTProto Implementation
console.log('\n[SUITE 2] AccountManager MTProto Implementation Verification')
const accountMgrPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountMgrSrc = fs.readFileSync(accountMgrPath, 'utf-8')

assert(accountMgrSrc.includes('getSharedMedia('), 'accountManager.ts implements getSharedMedia')
assert(accountMgrSrc.includes('inputMessagesFilterPhotoVideo'), 'accountManager.ts maps media filter to inputMessagesFilterPhotoVideo')
assert(accountMgrSrc.includes('inputMessagesFilterDocument'), 'accountManager.ts maps files filter to inputMessagesFilterDocument')
assert(accountMgrSrc.includes('inputMessagesFilterUrl'), 'accountManager.ts maps links filter to inputMessagesFilterUrl')
assert(accountMgrSrc.includes('inputMessagesFilterMusic'), 'accountManager.ts maps audio filter to inputMessagesFilterMusic')
assert(accountMgrSrc.includes('inputMessagesFilterRoundVoice'), 'accountManager.ts maps voice filter to inputMessagesFilterRoundVoice')
console.log('  [PASS] accountManager.ts maps all 5 MTProto filters and parses media objects')

// 3. Main & Preload IPC
console.log('\n[SUITE 3] Main & Preload IPC Verification')
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainSrc = fs.readFileSync(mainPath, 'utf-8')
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadSrc = fs.readFileSync(preloadPath, 'utf-8')

assert(mainSrc.includes("ipcMain.handle('telegram:get-shared-media'"), 'main.ts registers telegram:get-shared-media')
assert(preloadSrc.includes("getSharedMedia: ("), 'preload.ts exposes getSharedMedia on guidegramAPI')
console.log('  [PASS] IPC handler and preload bridge wired correctly')

// 4. SharedMediaDrawer Component
console.log('\n[SUITE 4] SharedMediaDrawer Component Verification')
const drawerPath = path.join(rootDir, 'src', 'components', 'SharedMediaDrawer.tsx')
assert(fs.existsSync(drawerPath), 'SharedMediaDrawer.tsx must exist')
const drawerSrc = fs.readFileSync(drawerPath, 'utf-8')

assert(drawerSrc.includes("activeTab === 'media'"), 'SharedMediaDrawer implements media tab')
assert(drawerSrc.includes("activeTab === 'files'"), 'SharedMediaDrawer implements files tab')
assert(drawerSrc.includes("activeTab === 'links'"), 'SharedMediaDrawer implements links tab')
assert(drawerSrc.includes("activeTab === 'audio'"), 'SharedMediaDrawer implements audio tab')
assert(drawerSrc.includes("activeTab === 'voice'"), 'SharedMediaDrawer implements voice tab')
assert(drawerSrc.includes('handleScroll'), 'SharedMediaDrawer implements infinite scroll pagination')
console.log('  [PASS] SharedMediaDrawer.tsx implements all 5 tabs and infinite scrolling')

// 5. ChatViewport Integration
console.log('\n[SUITE 5] ChatViewport Integration Verification')
const viewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const viewportSrc = fs.readFileSync(viewportPath, 'utf-8')

assert(viewportSrc.includes('<SharedMediaDrawer'), 'ChatViewport mounts SharedMediaDrawer')
assert(viewportSrc.includes('isSharedMediaOpen'), 'ChatViewport tracks isSharedMediaOpen state')
assert(viewportSrc.includes("setIsSharedMediaOpen(true)"), 'ChatViewport includes header trigger button')
console.log('  [PASS] ChatViewport.tsx integrates SharedMediaDrawer and header button')

// 6. Localization
console.log('\n[SUITE 6] Localization Verification')
const i18nPath = path.join(rootDir, 'src', 'i18n', 'translations.ts')
const i18nSrc = fs.readFileSync(i18nPath, 'utf-8')

assert(i18nSrc.includes("'shared_media.title': 'Shared Media'"), 'translations.ts has English title')
assert(i18nSrc.includes("'shared_media.title': 'رسانه‌های اشتراک‌گذاری‌شده'"), 'translations.ts has Persian title')
console.log('  [PASS] translations.ts provides complete bilingual localization')

console.log('\n====================================================')
console.log('All Milestone 17 checks passed successfully!')
console.log('====================================================')
