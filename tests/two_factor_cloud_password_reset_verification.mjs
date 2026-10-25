import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Telegram Account Cloud Password 2FA Reset & Recovery Protocol Verification...\n')

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

// 1. accountSecurityService.ts verification
const securityServicePath = path.join(rootDir, 'electron', 'telegram', 'services', 'accountSecurityService.ts')
const securityServiceContent = fs.readFileSync(securityServicePath, 'utf-8')

assert(
  securityServiceContent.includes('public async resetPassword(') &&
  securityServiceContent.includes('account.resetPassword'),
  'AccountSecurityService implements resetPassword invoking account.resetPassword'
)

assert(
  securityServiceContent.includes('public async declinePasswordReset(') &&
  securityServiceContent.includes('account.declinePasswordReset'),
  'AccountSecurityService implements declinePasswordReset invoking account.declinePasswordReset'
)

// 2. accountManager.ts verification
const accountManagerPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf-8')

assert(
  accountManagerContent.includes('public async accountResetPassword(') &&
  accountManagerContent.includes('account.resetPasswordOk'),
  'AccountManager implements accountResetPassword parsing ok/wait/failed results'
)

assert(
  accountManagerContent.includes('public async accountDeclinePasswordReset(') &&
  accountManagerContent.includes('account.declinePasswordReset'),
  'AccountManager implements accountDeclinePasswordReset'
)

// 3. main.ts IPC registration verification
const mainPath = path.join(rootDir, 'electron', 'main.ts')
const mainContent = fs.readFileSync(mainPath, 'utf-8')

assert(
  mainContent.includes("ipcMain.handle('telegram:account-reset-password'") &&
  mainContent.includes('accountManager.accountResetPassword'),
  'main.ts registers telegram:account-reset-password IPC handler'
)

assert(
  mainContent.includes("ipcMain.handle('telegram:account-decline-password-reset'") &&
  mainContent.includes('accountManager.accountDeclinePasswordReset'),
  'main.ts registers telegram:account-decline-password-reset IPC handler'
)

// 4. preload.ts API exposure verification
const preloadPath = path.join(rootDir, 'electron', 'preload.ts')
const preloadContent = fs.readFileSync(preloadPath, 'utf-8')

assert(
  preloadContent.includes('accountResetPassword:') &&
  preloadContent.includes("'telegram:account-reset-password'"),
  'preload.ts exposes accountResetPassword'
)

assert(
  preloadContent.includes('accountDeclinePasswordReset:') &&
  preloadContent.includes("'telegram:account-decline-password-reset'"),
  'preload.ts exposes accountDeclinePasswordReset'
)

// 5. SettingsModal.tsx verification
const settingsModalPath = path.join(rootDir, 'src', 'components', 'SettingsModal.tsx')
const settingsModalContent = fs.readFileSync(settingsModalPath, 'utf-8')

assert(
  settingsModalContent.includes('handleResetTwoFactor') &&
  settingsModalContent.includes('accountResetPassword'),
  'SettingsModal implements handleResetTwoFactor calling accountResetPassword'
)

assert(
  settingsModalContent.includes('handleDeclineResetTwoFactor') &&
  settingsModalContent.includes('accountDeclinePasswordReset'),
  'SettingsModal implements handleDeclineResetTwoFactor calling accountDeclinePasswordReset'
)

assert(
  settingsModalContent.includes('Request 2FA Reset') &&
  settingsModalContent.includes('Forgot Cloud Password?'),
  'SettingsModal renders 2FA Reset and Recovery protocol UI card'
)

console.log(`\n🎉 All ${passed}/${total} checks passed successfully for Phase 98!\n`)
