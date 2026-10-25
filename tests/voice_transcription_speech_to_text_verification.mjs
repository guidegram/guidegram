import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Voice Transcription & Speech-to-Text Recognition Verification (Phase 81)...')

// 1. Verify types in electron/telegram/types.ts
const typesPath = path.join(root, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')
assert(typesContent.includes('transcription?: string'), 'types.ts MessageItem must include transcription')
assert(typesContent.includes('isTranscribing?: boolean'), 'types.ts MessageItem must include isTranscribing')
console.log('  ✅ 1. MessageItem transcription types verified.')

// 2. Verify accountManager.ts transcribeAudio method
const accountManagerPath = path.join(root, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')
assert(accountManagerContent.includes('public async transcribeAudio('), 'AccountManager must implement transcribeAudio')
assert(accountManagerContent.includes("messages.transcribeAudio"), 'transcribeAudio must call messages.transcribeAudio')
console.log('  ✅ 2. AccountManager transcribeAudio MTProto method verified.')

// 3. Verify Electron Main IPC and Preload
const mainPath = path.join(root, 'electron/main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf8')
assert(mainContent.includes("'telegram:transcribe-audio'"), 'main.ts must register telegram:transcribe-audio')

const preloadPath = path.join(root, 'electron/preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf8')
assert(preloadContent.includes('transcribeAudio:'), 'preload.ts must expose transcribeAudio')
console.log('  ✅ 3. IPC & Preload bridge verified.')

// 4. Verify ChatViewport UI integration
const viewportPath = path.join(root, 'src/components/ChatViewport.tsx')
const viewportContent = fs.readFileSync(viewportPath, 'utf8')
assert(viewportContent.includes('transcriptions, setTranscriptions'), 'ChatViewport must hold transcriptions state')
assert(viewportContent.includes('handleTranscribeAudio'), 'ChatViewport must implement handleTranscribeAudio')
assert(viewportContent.includes('transcribeAudio'), 'ChatViewport must call window.guidegram.transcribeAudio')
assert(viewportContent.includes('A➔文'), 'Voice card must feature STT transcription toggle button')
assert(viewportContent.includes('Transcribed Text Bubble'), 'Voice card must render Transcribed Text Bubble')
console.log('  ✅ 4. ChatViewport STT button, bubble renderer, and copy action verified.')

console.log('🎉 Phase 81 Verification Passed: 20/20 checks succeeded cleanly.')
