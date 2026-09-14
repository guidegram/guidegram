import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('--- Telegram Stars Paid Media & Paid Reactions Verification ---')

// 1. Check types.ts
const typesContent = fs.readFileSync(path.join(root, 'electron/telegram/types.ts'), 'utf-8')
if (
  !typesContent.includes('isPaid?: boolean') ||
  !typesContent.includes("'paid_media'") ||
  !typesContent.includes('paidMediaStars?: number') ||
  !typesContent.includes('paidMediaCount?: number') ||
  !typesContent.includes('interface StarsStatusPayload') ||
  !typesContent.includes('interface StarsTransactionItem')
) {
  throw new Error('Check 1 failed: Stars and Paid Media types missing in electron/telegram/types.ts')
}
console.log('✓ Check 1 passed: Stars and Paid Media types defined in types.ts')

// 2. Check accountManager.ts
const amContent = fs.readFileSync(path.join(root, 'electron/telegram/accountManager.ts'), 'utf-8')
if (
  !amContent.includes('sendPaidReaction(') ||
  !amContent.includes('getStarsStatus(') ||
  !amContent.includes('getStarsTransactions(') ||
  !amContent.includes('messageMediaPaidMedia') ||
  !amContent.includes('reactionPaid') ||
  !amContent.includes('paidReactionPrivacyAnonymous') ||
  !amContent.includes('paidReactionPrivacyDefault')
) {
  throw new Error('Check 2 failed: Stars / Paid Reaction logic missing in accountManager.ts')
}
console.log('✓ Check 2 passed: accountManager.ts implements MTProto Stars and Paid Reactions')

// 3. Check main.ts IPC
const mainContent = fs.readFileSync(path.join(root, 'electron/main.ts'), 'utf-8')
if (
  !mainContent.includes("'telegram:send-paid-reaction'") ||
  !mainContent.includes("'telegram:get-stars-status'") ||
  !mainContent.includes("'telegram:get-stars-transactions'")
) {
  throw new Error('Check 3 failed: Stars IPC handlers missing in main.ts')
}
console.log('✓ Check 3 passed: main.ts registers all Stars IPC handlers')

// 4. Check preload.ts
const preloadContent = fs.readFileSync(path.join(root, 'electron/preload.ts'), 'utf-8')
if (
  !preloadContent.includes('sendPaidReaction:') ||
  !preloadContent.includes('getStarsStatus:') ||
  !preloadContent.includes('getStarsTransactions:')
) {
  throw new Error('Check 4 failed: Stars methods missing in preload.ts')
}
console.log('✓ Check 4 passed: preload.ts exposes Stars methods on window.guidegram')

// 5. Check PaidReactionModal.tsx
const modalPath = path.join(root, 'src/components/PaidReactionModal.tsx')
if (!fs.existsSync(modalPath)) {
  throw new Error('Check 5 failed: PaidReactionModal.tsx does not exist')
}
const modalContent = fs.readFileSync(modalPath, 'utf-8')
if (
  !modalContent.includes('PaidReactionModal') ||
  !modalContent.includes('sendPaidReaction') ||
  !modalContent.includes('isAnonymous') ||
  !modalContent.includes('stars.balance')
) {
  throw new Error('Check 5 failed: PaidReactionModal.tsx is missing key elements')
}
console.log('✓ Check 5 passed: PaidReactionModal.tsx component created and properly structured')

// 6. Check ChatViewport.tsx
const cvContent = fs.readFileSync(path.join(root, 'src/components/ChatViewport.tsx'), 'utf-8')
if (
  !cvContent.includes('paidReactionModalState') ||
  !cvContent.includes('<PaidReactionModal') ||
  !cvContent.includes("msg.mediaType === 'paid_media'") ||
  !cvContent.includes('stars.send_star_reaction')
) {
  throw new Error('Check 6 failed: ChatViewport.tsx missing Paid Media card or PaidReactionModal wiring')
}
console.log('✓ Check 6 passed: ChatViewport.tsx integrates Paid Media card & Star reaction picker')

// 7. Check translations.ts
const transContent = fs.readFileSync(path.join(root, 'src/i18n/translations.ts'), 'utf-8')
if (
  !transContent.includes("'stars.send_star_reaction'") ||
  !transContent.includes("'paid_media.title'") ||
  !transContent.includes('ارسال ری‌اکشن ستاره‌ای') ||
  !transContent.includes('محتوای پولی')
) {
  throw new Error('Check 7 failed: Translations missing for Stars / Paid Media keys')
}
console.log('✓ Check 7 passed: translations.ts includes complete EN and FA localization for Stars')

console.log('\nALL 7 TELEGRAM STARS & PAID MEDIA VERIFICATION CHECKS PASSED!')
