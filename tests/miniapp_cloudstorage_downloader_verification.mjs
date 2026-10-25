import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Bot WebApp Cloud Storage & File Downloader Protocol Verification...\n')

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
  accountManagerContent.includes('public async botInvokeWebViewCustomMethod(') &&
  accountManagerContent.includes('invokeWebViewCustomMethod'),
  'AccountManager implements botInvokeWebViewCustomMethod'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:bot-invoke-webview-custom-method'") &&
  mainContent.includes('accountManager.botInvokeWebViewCustomMethod'),
  'main.ts registers telegram:bot-invoke-webview-custom-method IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('botInvokeWebViewCustomMethod:') &&
  preloadContent.includes("'telegram:bot-invoke-webview-custom-method'"),
  'preload.ts exposes botInvokeWebViewCustomMethod'
)

// 4. MiniAppModal verification
const modalPath = path.join(rootDir, 'src', 'components', 'MiniAppModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

assert(
  modalContent.includes('web_app_custom_method') &&
  modalContent.includes("'custom_method_invoked'"),
  'MiniAppModal handles web_app_custom_method and dispatches custom_method_invoked'
)

assert(
  modalContent.includes('saveStorageValue') &&
  modalContent.includes('getStorageValues') &&
  modalContent.includes('getStorageKeys') &&
  modalContent.includes('deleteStorageValues'),
  'MiniAppModal implements CloudStorage operations (save, get, keys, delete)'
)

assert(
  modalContent.includes('web_app_download_file') &&
  modalContent.includes("'file_download_started'"),
  'MiniAppModal handles web_app_download_file and dispatches file_download_started'
)

assert(
  modalContent.includes('web_app_read_text_from_clipboard') &&
  modalContent.includes("'clipboard_text_received'"),
  'MiniAppModal handles web_app_read_text_from_clipboard and dispatches clipboard_text_received'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 96!\n`)
