import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Mini App & WebApp Viewport Bi-Directional State Synchronization Protocol Verification...\n')

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
  accountManagerContent.includes('public async prolongWebView(') &&
  accountManagerContent.includes("messages.prolongWebView"),
  'AccountManager implements prolongWebView invoking messages.prolongWebView'
)

assert(
  accountManagerContent.includes('public async sendWebViewData(') &&
  accountManagerContent.includes("messages.sendWebViewData"),
  'AccountManager implements sendWebViewData invoking messages.sendWebViewData'
)

// 2. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:prolong-web-view'") &&
  mainContent.includes('accountManager.prolongWebView'),
  'main.ts registers telegram:prolong-web-view IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:send-web-view-data'") &&
  mainContent.includes('accountManager.sendWebViewData'),
  'main.ts registers telegram:send-web-view-data IPC handler'
)

// 3. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('prolongWebView:') &&
  preloadContent.includes("'telegram:prolong-web-view'"),
  'preload.ts exposes prolongWebView bridge method'
)

assert(
  preloadContent.includes('sendWebViewData:') &&
  preloadContent.includes("'telegram:send-web-view-data'"),
  'preload.ts exposes sendWebViewData bridge method'
)

// 4. MiniAppModal component verification
const miniAppModalPath = path.join(rootDir, 'src', 'components', 'MiniAppModal.tsx')
const miniAppModalContent = fs.readFileSync(miniAppModalPath, 'utf-8')

assert(
  miniAppModalContent.includes("postEventToWebApp('viewport_changed'"),
  'MiniAppModal dispatches viewport_changed event to WebApp iframe'
)

assert(
  miniAppModalContent.includes("postEventToWebApp('theme_changed'"),
  'MiniAppModal dispatches theme_changed event to WebApp iframe'
)

assert(
  miniAppModalContent.includes("case 'web_app_request_viewport':"),
  'MiniAppModal handles web_app_request_viewport requests'
)

assert(
  miniAppModalContent.includes("case 'web_app_request_theme':"),
  'MiniAppModal handles web_app_request_theme requests'
)

assert(
  miniAppModalContent.includes("case 'web_app_setup_main_button':"),
  'MiniAppModal handles web_app_setup_main_button event configuring bottom action button'
)

assert(
  miniAppModalContent.includes("case 'web_app_setup_back_button':"),
  'MiniAppModal handles web_app_setup_back_button event'
)

assert(
  miniAppModalContent.includes("case 'web_app_setup_settings_button':"),
  'MiniAppModal handles web_app_setup_settings_button event'
)

assert(
  miniAppModalContent.includes("case 'web_app_set_header_color':"),
  'MiniAppModal handles web_app_set_header_color event'
)

assert(
  miniAppModalContent.includes("case 'web_app_set_background_color':"),
  'MiniAppModal handles web_app_set_background_color event'
)

assert(
  miniAppModalContent.includes("case 'web_app_trigger_haptic_feedback':"),
  'MiniAppModal handles web_app_trigger_haptic_feedback event with vibration integration'
)

assert(
  miniAppModalContent.includes("case 'web_app_data_send':") &&
  miniAppModalContent.includes('sendWebViewData'),
  'MiniAppModal handles web_app_data_send forwarding payload to MTProto'
)

assert(
  miniAppModalContent.includes("postEventToWebApp('main_button_pressed')"),
  'MiniAppModal dispatches main_button_pressed when user clicks native MainButton'
)

assert(
  miniAppModalContent.includes("postEventToWebApp('back_button_pressed')"),
  'MiniAppModal dispatches back_button_pressed when user clicks native BackButton'
)

assert(
  miniAppModalContent.includes("postEventToWebApp('settings_button_pressed')"),
  'MiniAppModal dispatches settings_button_pressed when user clicks Settings'
)

// 5. ChatViewport integration verification
const chatViewportPath = path.join(rootDir, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf-8')

assert(
  chatViewportContent.includes('accountId={chat?.accountId}') &&
  chatViewportContent.includes('botPeerId={chat?.id}'),
  'ChatViewport passes accountId and botPeerId to MiniAppModal'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 89!\n`)
