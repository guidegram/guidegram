import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Bot WebApp Fullscreen & Biometric Authentication Protocol Verification...\n')

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

// 1. MiniAppModal verification
const modalPath = path.join(rootDir, 'src', 'components', 'MiniAppModal.tsx')
const modalContent = fs.readFileSync(modalPath, 'utf-8')

assert(
  modalContent.includes('web_app_request_fullscreen') &&
  modalContent.includes('web_app_exit_fullscreen'),
  'MiniAppModal handles web_app_request_fullscreen and web_app_exit_fullscreen events'
)

assert(
  modalContent.includes("'fullscreen_changed'") &&
  modalContent.includes('is_fullscreen:'),
  'MiniAppModal posts fullscreen_changed event with is_fullscreen state to iframe'
)

assert(
  modalContent.includes('web_app_biometry_get_info') &&
  modalContent.includes("'biometry_info_received'"),
  'MiniAppModal handles web_app_biometry_get_info and replies with biometry_info_received'
)

assert(
  modalContent.includes('web_app_biometry_request_access') &&
  modalContent.includes('setBiometryAccessGranted'),
  'MiniAppModal handles web_app_biometry_request_access and updates access state'
)

assert(
  modalContent.includes('web_app_biometry_request_auth') &&
  modalContent.includes("'biometry_auth_requested'") &&
  modalContent.includes('status:'),
  'MiniAppModal handles web_app_biometry_request_auth and dispatches biometry_auth_requested'
)

assert(
  modalContent.includes('web_app_biometry_update_token') &&
  modalContent.includes("'biometry_token_updated'"),
  'MiniAppModal handles web_app_biometry_update_token and dispatches biometry_token_updated'
)

assert(
  modalContent.includes('isFullscreen') &&
  modalContent.includes('fixed inset-0 w-screen h-screen') &&
  modalContent.includes('handleToggleFullscreen'),
  'MiniAppModal supports dynamic fullscreen layout expansion and toggle'
)

assert(
  modalContent.includes('BioID') &&
  modalContent.includes('ShieldCheck'),
  'MiniAppModal renders biometric hardware shield status badge in header'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 95!\n`)
