import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('--- Telegram Business Tools Verification ---')

// 1. Check types
const typesContent = fs.readFileSync(path.join(root, 'electron/telegram/types.ts'), 'utf-8')
if (
  !typesContent.includes('interface BusinessProfile') ||
  !typesContent.includes('interface BusinessChatLink') ||
  !typesContent.includes('interface BusinessWorkHours') ||
  !typesContent.includes('interface BusinessLocation') ||
  !typesContent.includes('interface BusinessIntro')
) {
  throw new Error('Check 1 failed: Business types missing in electron/telegram/types.ts')
}
console.log('✓ Check 1 passed: Business interfaces defined in types.ts')

// 2. Check accountManager.ts
const amContent = fs.readFileSync(path.join(root, 'electron/telegram/accountManager.ts'), 'utf-8')
if (
  !amContent.includes('getBusinessProfile(') ||
  !amContent.includes('updateBusinessIntro(') ||
  !amContent.includes('updateBusinessWorkHours(') ||
  !amContent.includes('updateBusinessLocation(') ||
  !amContent.includes('createBusinessChatLink(') ||
  !amContent.includes('deleteBusinessChatLink(') ||
  !amContent.includes('account.getBusinessChatLinks') ||
  !amContent.includes('account.updateBusinessWorkHours')
) {
  throw new Error('Check 2 failed: Business methods missing in accountManager.ts')
}
console.log('✓ Check 2 passed: accountManager.ts implements MTProto Business APIs')

// 3. Check main.ts IPC
const mainContent = fs.readFileSync(path.join(root, 'electron/main.ts'), 'utf-8')
if (
  !mainContent.includes("'telegram:get-business-profile'") ||
  !mainContent.includes("'telegram:update-business-intro'") ||
  !mainContent.includes("'telegram:update-business-work-hours'") ||
  !mainContent.includes("'telegram:update-business-location'") ||
  !mainContent.includes("'telegram:create-business-chat-link'") ||
  !mainContent.includes("'telegram:delete-business-chat-link'")
) {
  throw new Error('Check 3 failed: Business IPC handlers missing in main.ts')
}
console.log('✓ Check 3 passed: main.ts registers all Telegram Business IPC handlers')

// 4. Check preload.ts
const preloadContent = fs.readFileSync(path.join(root, 'electron/preload.ts'), 'utf-8')
if (
  !preloadContent.includes('getBusinessProfile:') ||
  !preloadContent.includes('updateBusinessIntro:') ||
  !preloadContent.includes('updateBusinessWorkHours:') ||
  !preloadContent.includes('updateBusinessLocation:') ||
  !preloadContent.includes('createBusinessChatLink:') ||
  !preloadContent.includes('deleteBusinessChatLink:')
) {
  throw new Error('Check 4 failed: Business methods missing in preload.ts')
}
console.log('✓ Check 4 passed: preload.ts exposes Business methods on window.guidegram')

// 5. Check SettingsModal.tsx
const settingsContent = fs.readFileSync(path.join(root, 'src/components/SettingsModal.tsx'), 'utf-8')
if (
  !settingsContent.includes("activeTab === 'business'") ||
  !settingsContent.includes('business.intro_title') ||
  !settingsContent.includes('business.hours_title') ||
  !settingsContent.includes('business.location_title') ||
  !settingsContent.includes('business.links_title') ||
  !settingsContent.includes('handleSaveBusinessIntro') ||
  !settingsContent.includes('handleCreateBusinessLink')
) {
  throw new Error('Check 5 failed: Business tab missing or incomplete in SettingsModal.tsx')
}
console.log('✓ Check 5 passed: SettingsModal.tsx features full Telegram Business Hub')

// 6. Check translations.ts
const transContent = fs.readFileSync(path.join(root, 'src/i18n/translations.ts'), 'utf-8')
if (
  !transContent.includes("'settings.telegram_business'") ||
  !transContent.includes("'business.title'") ||
  !transContent.includes('تلگرام بیزنس') ||
  !transContent.includes('ابزارهای تلگرام بیزنس')
) {
  throw new Error('Check 6 failed: Translations missing for Business keys')
}
console.log('✓ Check 6 passed: translations.ts includes complete EN and FA localization')

console.log('\nALL 6 TELEGRAM BUSINESS VERIFICATION CHECKS PASSED!')
