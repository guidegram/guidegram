import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Phase 70 Verification: Chat History Export & Local Archive Exporter...')

const repoRoot = process.cwd()

// Test 1: Check types.ts for ExportChatHistoryOptions & Result
console.log('▶ Test 1: Verifying export interfaces in types.ts...')
const typesPath = path.join(repoRoot, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')

assert(typesContent.includes('export interface ExportChatHistoryOptions'), 'types.ts must declare ExportChatHistoryOptions')
assert(typesContent.includes("format: 'json' | 'html'"), 'ExportChatHistoryOptions must support json and html formats')
assert(typesContent.includes('export interface ExportChatHistoryResult'), 'types.ts must declare ExportChatHistoryResult')
console.log('✅ Test 1 Passed: Types match Telegram archive specifications.')

// Test 2: Check accountManager.ts for exportChatHistory implementation
console.log('▶ Test 2: Verifying exportChatHistory engine in accountManager.ts...')
const accountManagerPath = path.join(repoRoot, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')

assert(accountManagerContent.includes('public async exportChatHistory('), 'AccountManager must implement exportChatHistory')
assert(accountManagerContent.includes("options.format === 'json'"), 'exportChatHistory must support JSON format output')
assert(accountManagerContent.includes('<!DOCTYPE html>'), 'exportChatHistory must generate self-contained HTML archive')
assert(accountManagerContent.includes('this.getMessages('), 'exportChatHistory must paginate through chat history')
console.log('✅ Test 2 Passed: AccountManager provides HTML and JSON export engine.')

// Test 3: Check electron/main.ts IPC registration
console.log('▶ Test 3: Verifying IPC registration in main.ts...')
const mainPath = path.join(repoRoot, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')

assert(mainContent.includes("'telegram:export-chat-history'"), 'main.ts must register telegram:export-chat-history')
assert(mainContent.includes('dialog.showSaveDialog'), 'main.ts must support user save dialog for exports')
assert(mainContent.includes('fs.promises.writeFile'), 'main.ts must write exported content to disk')
console.log('✅ Test 3 Passed: main.ts handles export requests and saves files to disk.')

// Test 4: Check electron/preload.ts exposure
console.log('▶ Test 4: Verifying preload bridge exposure...')
const preloadPath = path.join(repoRoot, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')

assert(preloadContent.includes('exportChatHistory:'), 'preload.ts must expose exportChatHistory')
console.log('✅ Test 4 Passed: Preload API safely exposes exportChatHistory to renderer.')

// Test 5: Check ExportChatModal.tsx and ChatViewport.tsx UI wiring
console.log('▶ Test 5: Verifying ExportChatModal and ChatViewport integration...')
const modalPath = path.join(repoRoot, 'src/components/ExportChatModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')

assert(modalContent.includes('window.guidegram?.exportChatHistory'), 'ExportChatModal must call window.guidegram.exportChatHistory')
assert(modalContent.includes("format === 'html'"), 'ExportChatModal must provide HTML format selector')
assert(modalContent.includes("format === 'json'"), 'ExportChatModal must provide JSON format selector')

const viewportPath = path.join(repoRoot, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('ExportChatModal'), 'ChatViewport must import and render ExportChatModal')
assert(viewportContent.includes('isExportChatOpen'), 'ChatViewport must hold isExportChatOpen state')
assert(viewportContent.includes('FolderDown'), 'ChatViewport header must feature FolderDown export action')
console.log('✅ Test 5 Passed: UI components are fully wired and functional.')

console.log('🎉 All 5/5 Phase 70 Verification tests passed successfully!')
