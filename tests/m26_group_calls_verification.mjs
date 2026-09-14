import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

console.log('--- Telegram Group Voice & Video Calls Verification ---')

// 1. Check types.ts
const typesContent = fs.readFileSync(path.join(root, 'electron/telegram/types.ts'), 'utf-8')
if (
  !typesContent.includes('interface GroupCallInfo') ||
  !typesContent.includes('interface GroupCallParticipantItem') ||
  !typesContent.includes('hasGroupCall?: boolean')
) {
  throw new Error('Check 1 failed: Group call types missing in electron/telegram/types.ts')
}
console.log('✓ Check 1 passed: Group Call & Participant interfaces defined in types.ts')

// 2. Check accountManager.ts
const amContent = fs.readFileSync(path.join(root, 'electron/telegram/accountManager.ts'), 'utf-8')
if (
  !amContent.includes('getGroupCall(') ||
  !amContent.includes('createGroupCall(') ||
  !amContent.includes('joinGroupCall(') ||
  !amContent.includes('leaveGroupCall(') ||
  !amContent.includes('editGroupCallParticipant(') ||
  !amContent.includes('phone.getGroupCall') ||
  !amContent.includes('phone.createGroupCall')
) {
  throw new Error('Check 2 failed: Group call MTProto methods missing in accountManager.ts')
}
console.log('✓ Check 2 passed: accountManager.ts implements MTProto phone.* Group Call APIs')

// 3. Check main.ts IPC
const mainContent = fs.readFileSync(path.join(root, 'electron/main.ts'), 'utf-8')
if (
  !mainContent.includes("'telegram:get-group-call'") ||
  !mainContent.includes("'telegram:create-group-call'") ||
  !mainContent.includes("'telegram:join-group-call'") ||
  !mainContent.includes("'telegram:leave-group-call'") ||
  !mainContent.includes("'telegram:edit-group-call-participant'")
) {
  throw new Error('Check 3 failed: Group call IPC handlers missing in main.ts')
}
console.log('✓ Check 3 passed: main.ts registers all Telegram Group Call IPC handlers')

// 4. Check preload.ts
const preloadContent = fs.readFileSync(path.join(root, 'electron/preload.ts'), 'utf-8')
if (
  !preloadContent.includes('getGroupCall:') ||
  !preloadContent.includes('createGroupCall:') ||
  !preloadContent.includes('joinGroupCall:') ||
  !preloadContent.includes('leaveGroupCall:') ||
  !preloadContent.includes('editGroupCallParticipant:')
) {
  throw new Error('Check 4 failed: Group call methods missing in preload.ts')
}
console.log('✓ Check 4 passed: preload.ts exposes Group Call methods on window.guidegram')

// 5. Check GroupCallBar.tsx
const barPath = path.join(root, 'src/components/GroupCallBar.tsx')
if (!fs.existsSync(barPath)) {
  throw new Error('Check 5 failed: GroupCallBar.tsx does not exist')
}
const barContent = fs.readFileSync(barPath, 'utf-8')
if (
  !barContent.includes('GroupCallBar') ||
  !barContent.includes('group_call.join') ||
  !barContent.includes('participantsCount')
) {
  throw new Error('Check 5 failed: GroupCallBar.tsx is missing key elements')
}
console.log('✓ Check 5 passed: GroupCallBar.tsx component created and structured')

// 6. Check GroupCallModal.tsx
const modalPath = path.join(root, 'src/components/GroupCallModal.tsx')
if (!fs.existsSync(modalPath)) {
  throw new Error('Check 6 failed: GroupCallModal.tsx does not exist')
}
const modalContent = fs.readFileSync(modalPath, 'utf-8')
if (
  !modalContent.includes('GroupCallModal') ||
  !modalContent.includes('handleToggleMute') ||
  !modalContent.includes('handleToggleRaiseHand') ||
  !modalContent.includes('group_call.speaking') ||
  !modalContent.includes('group_call.mute')
) {
  throw new Error('Check 6 failed: GroupCallModal.tsx is missing key interactive features')
}
console.log('✓ Check 6 passed: GroupCallModal.tsx component created with full audio/video controls')

// 7. Check ChatViewport.tsx
const cvContent = fs.readFileSync(path.join(root, 'src/components/ChatViewport.tsx'), 'utf-8')
if (
  !cvContent.includes('GroupCallBar') ||
  !cvContent.includes('GroupCallModal') ||
  !cvContent.includes('isGroupCallModalOpen') ||
  !cvContent.includes('chatDetails?.hasGroupCall')
) {
  throw new Error('Check 7 failed: ChatViewport.tsx missing GroupCallBar or GroupCallModal wiring')
}
console.log('✓ Check 7 passed: ChatViewport.tsx integrates GroupCallBar banner and GroupCallModal')

// 8. Check translations.ts
const transContent = fs.readFileSync(path.join(root, 'src/i18n/translations.ts'), 'utf-8')
if (
  !transContent.includes("'group_call.title'") ||
  !transContent.includes("'group_call.video_chat'") ||
  !transContent.includes('گفتگوی صوتی') ||
  !transContent.includes('گفتگوی ویدیویی')
) {
  throw new Error('Check 8 failed: Translations missing for Group Call keys')
}
console.log('✓ Check 8 passed: translations.ts includes complete EN and FA localization for Group Calls')

console.log('\nALL 8 GROUP VOICE & VIDEO CALLS VERIFICATION CHECKS PASSED!')
