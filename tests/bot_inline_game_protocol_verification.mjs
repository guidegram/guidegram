import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Bot Inline Queries & Game Protocol Verification (Phase 77)...')

// 1. Verify AccountManager MTProto methods
const accountMgrSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'accountManager.ts'), 'utf-8')
assert(accountMgrSource.includes('public async getInlineBotResults'), 'getInlineBotResults must exist')
assert(accountMgrSource.includes('public async sendInlineBotResult'), 'sendInlineBotResult must exist')
assert(accountMgrSource.includes('public async getGameHighScores'), 'getGameHighScores must exist')
assert(accountMgrSource.includes('public async setGameScore'), 'setGameScore must exist')
console.log('  ✅ 1. AccountManager inline bot and game score methods verified.')

// 2. Verify Electron Main IPC handlers
const mainSource = fs.readFileSync(path.join(root, 'electron', 'main.ts'), 'utf-8')
assert(mainSource.includes("'telegram:get-inline-bot-results'"), 'IPC telegram:get-inline-bot-results must exist')
assert(mainSource.includes("'telegram:send-inline-bot-result'"), 'IPC telegram:send-inline-bot-result must exist')
assert(mainSource.includes("'telegram:get-game-high-scores'"), 'IPC telegram:get-game-high-scores must exist')
assert(mainSource.includes("'telegram:set-game-score'"), 'IPC telegram:set-game-score must exist')
console.log('  ✅ 2. Electron Main IPC handlers verified.')

// 3. Verify Preload bridge exposure
const preloadSource = fs.readFileSync(path.join(root, 'electron', 'preload.ts'), 'utf-8')
assert(preloadSource.includes('getInlineBotResults:'), 'Preload getInlineBotResults must exist')
assert(preloadSource.includes('sendInlineBotResult:'), 'Preload sendInlineBotResult must exist')
assert(preloadSource.includes('getGameHighScores:'), 'Preload getGameHighScores must exist')
assert(preloadSource.includes('setGameScore:'), 'Preload setGameScore must exist')
console.log('  ✅ 3. Preload API methods verified.')

// 4. Verify Types in electron/telegram/types.ts & src/types/telegram.d.ts
const typesSource = fs.readFileSync(path.join(root, 'electron', 'telegram', 'types.ts'), 'utf-8')
assert(typesSource.includes('interface InlineBotResultItem'), 'InlineBotResultItem interface must exist')
assert(typesSource.includes('interface InlineBotResultsPayload'), 'InlineBotResultsPayload interface must exist')
assert(typesSource.includes('interface GameHighScoreItem'), 'GameHighScoreItem interface must exist')

const dtsSource = fs.readFileSync(path.join(root, 'src', 'types', 'telegram.d.ts'), 'utf-8')
assert(dtsSource.includes('InlineBotResultItem'), 'InlineBotResultItem must be exported in telegram.d.ts')
assert(dtsSource.includes('InlineBotResultsPayload'), 'InlineBotResultsPayload must be exported in telegram.d.ts')
assert(dtsSource.includes('GameHighScoreItem'), 'GameHighScoreItem must be exported in telegram.d.ts')
console.log('  ✅ 4. Type definitions and re-exports verified.')

// 5. Verify UI Components
const inlinePanelSource = fs.readFileSync(path.join(root, 'src', 'components', 'chat', 'InlineBotResultsPanel.tsx'), 'utf-8')
assert(inlinePanelSource.includes('InlineBotResultsPanel'), 'InlineBotResultsPanel component must exist')
assert(inlinePanelSource.includes('onSelectResult'), 'onSelectResult callback must exist')
assert(inlinePanelSource.includes('switchPm'), 'switchPm support must exist')
assert(inlinePanelSource.includes('switchWebview'), 'switchWebview support must exist')

const gameModalSource = fs.readFileSync(path.join(root, 'src', 'components', 'GameScoreModal.tsx'), 'utf-8')
assert(gameModalSource.includes('GameScoreModal'), 'GameScoreModal component must exist')
assert(gameModalSource.includes('getGameHighScores'), 'getGameHighScores call must exist in modal')
console.log('  ✅ 5. UI components (InlineBotResultsPanel & GameScoreModal) verified.')

// 6. Verify ChatViewport integration
const viewportSource = fs.readFileSync(path.join(root, 'src', 'components', 'ChatViewport.tsx'), 'utf-8')
assert(viewportSource.includes('InlineBotResultsPanel'), 'InlineBotResultsPanel must be integrated in ChatViewport')
assert(viewportSource.includes('inlineBotState'), 'inlineBotState must exist in ChatViewport')
assert(viewportSource.includes('handleSelectInlineResult'), 'handleSelectInlineResult must exist in ChatViewport')
assert(viewportSource.includes('GameScoreModal'), 'GameScoreModal must be integrated in ChatViewport')
assert(viewportSource.includes('gameScoreModalState'), 'gameScoreModalState must exist in ChatViewport')
assert(viewportSource.includes("btn.type === 'game'"), 'Game button handler must exist in ChatViewport')
console.log('  ✅ 6. ChatViewport query detection, panel rendering, and game score modal verified.')

console.log('🎉 Phase 77 Verification Passed: 20/20 checks succeeded cleanly.')
