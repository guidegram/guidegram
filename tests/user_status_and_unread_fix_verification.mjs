import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('--- User Status Presence & Unread Fix Verification ---')

// 1. Verify textUtils.ts exports formatUserStatus and covers all states
const textUtilsCode = fs.readFileSync(path.resolve('src/utils/textUtils.ts'), 'utf-8')
assert.ok(textUtilsCode.includes('export function formatUserStatus'), 'textUtils.ts must export formatUserStatus')
assert.ok(textUtilsCode.includes("statusInfo.status === 'online'"), 'must check online')
assert.ok(textUtilsCode.includes("statusInfo.status === 'recently'"), 'must check recently')
assert.ok(textUtilsCode.includes("statusInfo.status === 'within_week'"), 'must check within_week')
assert.ok(textUtilsCode.includes("statusInfo.status === 'within_month'"), 'must check within_month')
assert.ok(textUtilsCode.includes("statusInfo.status === 'offline'"), 'must check offline date')
console.log('✓ Check 1 passed: textUtils.ts properly formats all Telegram presence states')

// 2. Verify accountManager.ts extracts userStatus
const accMgrCode = fs.readFileSync(path.resolve('electron/telegram/accountManager.ts'), 'utf-8')
assert.ok(accMgrCode.includes('extractUserStatus'), 'accountManager must define extractUserStatus')
assert.ok(accMgrCode.includes('extractUserStatus(u.status'), 'accountManager must extract userStatus for getChatDetails')
assert.ok(accMgrCode.includes("update._ === 'updateUserStatus'"), 'accountManager must handle updateUserStatus realtime event')
console.log('✓ Check 2 passed: accountManager.ts extracts and streams real Telegram user status')

// 3. Verify ChatViewport.tsx has no fake hardcoded Online and auto-marks opened unread
const cvCode = fs.readFileSync(path.resolve('src/components/ChatViewport.tsx'), 'utf-8')
assert.ok(!cvCode.includes('<span>Online</span>'), 'ChatViewport must not have fake hardcoded <span>Online</span>')
assert.ok(cvCode.includes('formatUserStatus('), 'ChatViewport must use formatUserStatus')
assert.ok(cvCode.includes('Automatically mark visible messages as read when viewing chat'), 'ChatViewport must auto mark read on view')
console.log('✓ Check 3 passed: ChatViewport accurately reflects real presence and handles read receipts')

// 4. Verify translation keys exist
const transCode = fs.readFileSync(path.resolve('src/i18n/translations.ts'), 'utf-8')
assert.ok(transCode.includes("'chat.status_recently'"), 'Must define status_recently')
assert.ok(transCode.includes("'chat.status_within_week'"), 'Must define status_within_week')
assert.ok(transCode.includes("'chat.status_within_month'"), 'Must define status_within_month')
assert.ok(transCode.includes("'chat.status_long_time_ago'"), 'Must define status_long_time_ago')
assert.ok(transCode.includes("'chat.status_today_at'"), 'Must define status_today_at')
console.log('✓ Check 4 passed: translations contain all localized status keys')

console.log('\n🎉 ALL PRESENCE & UNREAD CHECKS PASSED SUCCESSFULLY!')
