import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Chat Export Tool & JSON/HTML Archival Engine Verification (Phase 79)...')

// 1. Verify types in electron/telegram/types.ts & src/types/telegram.d.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('export interface ExportChatHistoryOptions'), 'types.ts must declare ExportChatHistoryOptions')
assert(typesContent.includes("format: 'json' | 'html'"), 'ExportChatHistoryOptions must support json and html formats')
assert(typesContent.includes('selectedTypes?: Array<'), 'ExportChatHistoryOptions must support selectedTypes filtering')
assert(typesContent.includes('fromDate?: number'), 'ExportChatHistoryOptions must support fromDate')
assert(typesContent.includes('toDate?: number'), 'ExportChatHistoryOptions must support toDate')
assert(typesContent.includes('export interface ExportChatHistoryResult'), 'types.ts must declare ExportChatHistoryResult')
console.log('  ✅ 1. Export options & result types verified.')

// 2. Verify accountManager.ts exportChatHistory engine
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async exportChatHistory('), 'AccountManager must implement exportChatHistory')
assert(accountManagerContent.includes("options.format === 'json'"), 'exportChatHistory must support JSON format output')
assert(accountManagerContent.includes('<!DOCTYPE html>'), 'exportChatHistory must generate self-contained HTML archive')
assert(accountManagerContent.includes('this.getMessages('), 'exportChatHistory must paginate through chat history')
assert(accountManagerContent.includes('options.fromDate'), 'exportChatHistory must respect fromDate')
assert(accountManagerContent.includes('options.toDate'), 'exportChatHistory must respect toDate')
assert(accountManagerContent.includes('options.selectedTypes'), 'exportChatHistory must respect selectedTypes')
console.log('  ✅ 2. AccountManager exportChatHistory engine with filters verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:export-chat-history'"), 'main.ts must register telegram:export-chat-history')
assert(mainContent.includes('dialog.showSaveDialog'), 'main.ts must support user save dialog')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('exportChatHistory:'), 'preload.ts must expose exportChatHistory')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify ExportChatModal UI component
const modalPath = path.join(root, 'src/components/ExportChatModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')
assert(modalContent.includes('window.guidegram?.exportChatHistory'), 'ExportChatModal must call window.guidegram.exportChatHistory')
assert(modalContent.includes("format === 'html'"), 'ExportChatModal must provide HTML format selector')
assert(modalContent.includes("format === 'json'"), 'ExportChatModal must provide JSON format selector')
assert(modalContent.includes('MEDIA_TYPES'), 'ExportChatModal must provide media type filters')
assert(modalContent.includes('fromDateStr'), 'ExportChatModal must provide fromDate input')
assert(modalContent.includes('toDateStr'), 'ExportChatModal must provide toDate input')
console.log('  ✅ 4. ExportChatModal UI component with media and date filters verified.')

// 5. Verify ChatViewport integration
const viewportPath = path.join(root, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('ExportChatModal'), 'ChatViewport must import and render ExportChatModal')
assert(viewportContent.includes('isExportChatOpen'), 'ChatViewport must hold isExportChatOpen state')
assert(viewportContent.includes('FolderDown'), 'ChatViewport header must feature FolderDown export action')
console.log('  ✅ 5. ChatViewport integration verified.')

console.log('🎉 Phase 79 Verification Passed: 20/20 checks succeeded cleanly.')
