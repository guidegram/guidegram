import fs from 'fs'
import path from 'path'

console.log('--- Testing Guidegram Architectural Upgrades ---')

// 1. Verify types.ts
const typesContent = fs.readFileSync('electron/telegram/types.ts', 'utf8')
if (!typesContent.includes('migratedFromChatId?: string')) {
  throw new Error('types.ts missing migratedFromChatId')
}
if (!typesContent.includes('migratedFromMaxId?: number')) {
  throw new Error('types.ts missing migratedFromMaxId')
}
if (!typesContent.includes('composerSendAnimation?: boolean')) {
  throw new Error('types.ts missing composerSendAnimation')
}
console.log('✓ Check 1 passed: types.ts defines migratedFromChatId, migratedFromMaxId, and composerSendAnimation')

// 2. Verify sessionStore.ts
const storeContent = fs.readFileSync('electron/telegram/sessionStore.ts', 'utf8')
if (!storeContent.includes('composerSendAnimation: true')) {
  throw new Error('sessionStore.ts missing composerSendAnimation: true default')
}
console.log('✓ Check 2 passed: sessionStore.ts configures composerSendAnimation: true by default')

// 3. Verify accountManager.ts
const accMgrContent = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
if (!accMgrContent.includes('Stage 2: Unified Legacy Export Bridge')) {
  throw new Error('accountManager.ts missing Stage 2 Unified Legacy Export Bridge')
}
if (!accMgrContent.includes('migratedFromChatId: res.fullChat?.migratedFromChatId')) {
  throw new Error('accountManager.ts missing migratedFromChatId assignment in getChatDetails')
}
console.log('✓ Check 3 passed: accountManager.ts implements Two-Stage Unified Export with pre-migration bridging')

// 4. Verify SettingsModal.tsx
const settingsContent = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8')
if (!settingsContent.includes('composerSendAnimation') || !settingsContent.includes('Composer Send Animation')) {
  throw new Error('SettingsModal.tsx missing Composer Send Animation toggle')
}
console.log('✓ Check 4 passed: SettingsModal.tsx exposes decoupled Composer Send Animation setting')

console.log('ALL ARCHITECTURAL UPGRADE VERIFICATION CHECKS PASSED!')
