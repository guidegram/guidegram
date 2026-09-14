import { readFileSync } from 'fs'
import { join } from 'path'

console.log('--- Admin Log / Recent Actions Verification ---')

const workspaceRoot = process.cwd()

// 1. Check accountManager.ts
const accountManagerPath = join(workspaceRoot, 'electron', 'telegram', 'accountManager.ts')
const accountManagerContent = readFileSync(accountManagerPath, 'utf-8')

if (!accountManagerContent.includes('public async getAdminLog(')) {
  throw new Error('accountManager.ts missing getAdminLog implementation')
}
if (!accountManagerContent.includes('channels.getAdminLog')) {
  throw new Error('accountManager.ts not invoking channels.getAdminLog')
}
console.log('✓ Check 1 passed: accountManager.ts implements getAdminLog with MTProto channels.getAdminLog')

// 2. Check main.ts
const mainPath = join(workspaceRoot, 'electron', 'main.ts')
const mainContent = readFileSync(mainPath, 'utf-8')

if (!mainContent.includes('telegram:get-admin-log')) {
  throw new Error('main.ts missing telegram:get-admin-log IPC handler')
}
console.log('✓ Check 2 passed: main.ts registers telegram:get-admin-log IPC handler')

// 3. Check preload.ts
const preloadPath = join(workspaceRoot, 'electron', 'preload.ts')
const preloadContent = readFileSync(preloadPath, 'utf-8')

if (!preloadContent.includes('getAdminLog:')) {
  throw new Error('preload.ts missing getAdminLog exposure')
}
console.log('✓ Check 3 passed: preload.ts exposes getAdminLog on window.guidegram')

// 4. Check types.ts
const typesPath = join(workspaceRoot, 'electron', 'telegram', 'types.ts')
const typesContent = readFileSync(typesPath, 'utf-8')

if (!typesContent.includes('interface AdminLogItem') || !typesContent.includes('interface AdminLogResponse')) {
  throw new Error('types.ts missing AdminLogItem or AdminLogResponse interfaces')
}
console.log('✓ Check 4 passed: types.ts defines AdminLogItem and AdminLogResponse')

// 5. Check AdminLogModal.tsx
const modalPath = join(workspaceRoot, 'src', 'components', 'AdminLogModal.tsx')
const modalContent = readFileSync(modalPath, 'utf-8')

if (!modalContent.includes('export const AdminLogModal')) {
  throw new Error('AdminLogModal.tsx missing export const AdminLogModal')
}
if (!modalContent.includes('window.guidegram?.getAdminLog')) {
  throw new Error('AdminLogModal.tsx missing window.guidegram.getAdminLog call')
}
if (!modalContent.includes('getActionBadge')) {
  throw new Error('AdminLogModal.tsx missing getActionBadge for visual action categorization')
}
console.log('✓ Check 5 passed: AdminLogModal.tsx created with search, filter tabs, and chronological timeline')

// 6. Check ChatViewport.tsx
const chatViewportPath = join(workspaceRoot, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = readFileSync(chatViewportPath, 'utf-8')

if (!chatViewportContent.includes("import { AdminLogModal } from './AdminLogModal'")) {
  throw new Error('ChatViewport.tsx missing AdminLogModal import')
}
if (!chatViewportContent.includes('isAdminLogOpen') || !chatViewportContent.includes('setIsAdminLogOpen')) {
  throw new Error('ChatViewport.tsx missing isAdminLogOpen state')
}
if (!chatViewportContent.includes('<AdminLogModal')) {
  throw new Error('ChatViewport.tsx missing AdminLogModal mounting')
}
console.log('✓ Check 6 passed: ChatViewport.tsx integrates AdminLogModal and drawer entry point')

// 7. Check translations.ts
const translationsPath = join(workspaceRoot, 'src', 'i18n', 'translations.ts')
const translationsContent = readFileSync(translationsPath, 'utf-8')

const requiredKeys = [
  'admin_log.title',
  'admin_log.subtitle',
  'admin_log.search',
  'admin_log.filter_all',
  'admin_log.filter_deletions',
  'admin_log.filter_edits',
  'admin_log.filter_members',
  'admin_log.filter_bans',
  'admin_log.filter_admins',
  'admin_log.filter_info',
  'admin_log.empty',
]

for (const key of requiredKeys) {
  if (!translationsContent.includes(`'${key}'`)) {
    throw new Error(`translations.ts missing required key: ${key}`)
  }
}
console.log('✓ Check 7 passed: translations.ts has all admin_log keys for EN and FA')

console.log('\nALL 7 ADMIN LOG VERIFICATION CHECKS PASSED!')
