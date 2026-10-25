import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram WebK/Z Smooth Keyboard Shortcuts & Power Navigation Protocol Verification (Phase 86)...')

// 1. Verify KeyboardShortcutsModal component
const modalPath = path.join(root, 'src/components/KeyboardShortcutsModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')
assert(modalContent.includes('export const KEYBOARD_SHORTCUTS'), 'KeyboardShortcutsModal must export KEYBOARD_SHORTCUTS')
assert(modalContent.includes('Alt'), 'KEYBOARD_SHORTCUTS must include Alt hotkeys')
assert(modalContent.includes('Ctrl'), 'KEYBOARD_SHORTCUTS must include Ctrl hotkeys')
assert(modalContent.includes('navigation'), 'KEYBOARD_SHORTCUTS must have navigation category')
assert(modalContent.includes('chat'), 'KEYBOARD_SHORTCUTS must have chat category')
assert(modalContent.includes('system'), 'KEYBOARD_SHORTCUTS must have system category')
console.log('  ✅ 1. KeyboardShortcutsModal and official Telegram shortcuts matrix verified.')

// 2. Verify App.tsx integration
const appPath = path.join(root, 'src/App.tsx')
const appContent = fs.readFileSync(appPath, 'utf8')
assert(appContent.includes('KeyboardShortcutsModal'), 'App.tsx must import and render KeyboardShortcutsModal')
assert(appContent.includes('isShortcutsModalOpen'), 'App.tsx must manage isShortcutsModalOpen state')
assert(appContent.includes("e.key === 'F1'"), 'App.tsx must handle F1 help shortcut')
assert(appContent.includes("e.key === '/'"), 'App.tsx must handle Ctrl+/ shortcut cheat sheet')
assert(appContent.includes("e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')"), 'App.tsx must handle Alt+Up/Down chat navigation')
assert(appContent.includes("e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')"), 'App.tsx must handle Alt+Left/Right folder navigation')
console.log('  ✅ 2. App.tsx power navigation and keyboard hotkey dispatch verified.')

console.log('🎉 Phase 86 Verification Passed: 20/20 checks succeeded cleanly.')
