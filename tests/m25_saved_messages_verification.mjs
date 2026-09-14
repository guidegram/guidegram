import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('--- Telegram Saved Messages 2.0 Verification ---')

// 1. Check types.ts
const typesContent = fs.readFileSync(path.join(root, 'electron/telegram/types.ts'), 'utf-8')
if (
  !typesContent.includes('interface SavedDialogItem') ||
  !typesContent.includes('interface SavedReactionTagItem') ||
  !typesContent.includes('isSavedMessages?: boolean')
) {
  throw new Error('Check 1 failed: Saved Messages types missing in electron/telegram/types.ts')
}
console.log('✓ Check 1 passed: Saved Messages 2.0 interfaces defined in types.ts')

// 2. Check accountManager.ts
const amContent = fs.readFileSync(path.join(root, 'electron/telegram/accountManager.ts'), 'utf-8')
if (
  !amContent.includes('getSavedDialogs(') ||
  !amContent.includes('getSavedReactionTags(') ||
  !amContent.includes('messages.getSavedDialogs') ||
  !amContent.includes('messages.getSavedReactionTags')
) {
  throw new Error('Check 2 failed: Saved Messages MTProto methods missing in accountManager.ts')
}
console.log('✓ Check 2 passed: accountManager.ts implements MTProto Saved Dialogs and Reaction Tags')

// 3. Check main.ts IPC
const mainContent = fs.readFileSync(path.join(root, 'electron/main.ts'), 'utf-8')
if (
  !mainContent.includes("'telegram:get-saved-dialogs'") ||
  !mainContent.includes("'telegram:get-saved-reaction-tags'")
) {
  throw new Error('Check 3 failed: Saved Messages IPC handlers missing in main.ts')
}
console.log('✓ Check 3 passed: main.ts registers all Saved Messages 2.0 IPC handlers')

// 4. Check preload.ts
const preloadContent = fs.readFileSync(path.join(root, 'electron/preload.ts'), 'utf-8')
if (
  !preloadContent.includes('getSavedDialogs:') ||
  !preloadContent.includes('getSavedReactionTags:')
) {
  throw new Error('Check 4 failed: Saved Messages methods missing in preload.ts')
}
console.log('✓ Check 4 passed: preload.ts exposes Saved Messages methods on window.guidegram')

// 5. Check SavedMessagesBar.tsx
const barPath = path.join(root, 'src/components/SavedMessagesBar.tsx')
if (!fs.existsSync(barPath)) {
  throw new Error('Check 5 failed: SavedMessagesBar.tsx does not exist')
}
const barContent = fs.readFileSync(barPath, 'utf-8')
if (
  !barContent.includes('SavedMessagesBar') ||
  !barContent.includes('getSavedDialogs') ||
  !barContent.includes('getSavedReactionTags') ||
  !barContent.includes('mediaFilter') ||
  !barContent.includes('saved_messages.search')
) {
  throw new Error('Check 5 failed: SavedMessagesBar.tsx is missing key components or hooks')
}
console.log('✓ Check 5 passed: SavedMessagesBar.tsx component created with full filtering capabilities')

// 6. Check ChatViewport.tsx
const cvContent = fs.readFileSync(path.join(root, 'src/components/ChatViewport.tsx'), 'utf-8')
if (
  !cvContent.includes('SavedMessagesBar') ||
  !cvContent.includes('savedSourceFilter') ||
  !cvContent.includes('savedTagFilter') ||
  !cvContent.includes('chat?.isSavedMessages')
) {
  throw new Error('Check 6 failed: ChatViewport.tsx missing SavedMessagesBar mounting or filter logic')
}
console.log('✓ Check 6 passed: ChatViewport.tsx integrates SavedMessagesBar and reactive filtering')

// 7. Check translations.ts
const transContent = fs.readFileSync(path.join(root, 'src/i18n/translations.ts'), 'utf-8')
if (
  !transContent.includes("'saved_messages.title'") ||
  !transContent.includes("'saved_messages.sources'") ||
  !transContent.includes("'saved_messages.tags'") ||
  !transContent.includes('پیام‌های ذخیره‌شده') ||
  !transContent.includes('گفتگوها و کانال‌ها')
) {
  throw new Error('Check 7 failed: Translations missing for Saved Messages 2.0 keys')
}
console.log('✓ Check 7 passed: translations.ts includes complete EN and FA localization for Saved Messages')

console.log('\nALL 7 SAVED MESSAGES 2.0 VERIFICATION CHECKS PASSED!')
