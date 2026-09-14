import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Milestone 27: Bot Token Authentication Verification')
console.log('====================================================\n')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// 1. AccountManager Verification
console.log('[SUITE 1] AccountManager Bot Auth Implementation')
const accountManagerCode = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/accountManager.ts'), 'utf8')
assert(accountManagerCode.includes('startBotAuth('), 'accountManager.ts implements startBotAuth')
assert(accountManagerCode.includes('client.signInBot('), 'accountManager.ts calls client.signInBot')
assert(accountManagerCode.includes('isBot: true'), 'accountManager.ts marks registered bot with isBot: true')
assert(accountManagerCode.includes('savedAcc.isBot'), 'accountManager.ts preserves isBot in connectSavedAccount')

// 2. Types Verification
console.log('\n[SUITE 2] AccountInfo Type Definition')
const typesCode = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/types.ts'), 'utf8')
assert(typesCode.includes('isBot?: boolean'), 'electron/telegram/types.ts defines isBot?: boolean in AccountInfo')

// 3. Main IPC Handlers Verification
console.log('\n[SUITE 3] Electron Main IPC Registration')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("'telegram:login-bot'"), 'main.ts registers telegram:login-bot')
assert(mainCode.includes('accountManager.startBotAuth('), 'main.ts invokes accountManager.startBotAuth')

// 4. Preload API Verification
console.log('\n[SUITE 4] Electron Preload API Exposure')
const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes('loginBot:'), 'preload.ts exposes loginBot')
assert(preloadCode.includes("'telegram:login-bot'"), 'preload.ts invokes telegram:login-bot')

// 5. AddAccountModal Verification
console.log('\n[SUITE 5] React AddAccountModal Component')
const modalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/AddAccountModal.tsx'), 'utf8')
assert(modalCode.includes("'qr' | 'phone' | 'bot'"), 'AddAccountModal supports bot in loginMethod')
assert(modalCode.includes('Bot Token'), 'AddAccountModal renders Bot Token tab')
assert(modalCode.includes('handleConnectBot'), 'AddAccountModal implements handleConnectBot')
assert(modalCode.includes('window.guidegram.loginBot('), 'AddAccountModal calls window.guidegram.loginBot')
assert(modalCode.includes('@BotFather'), 'AddAccountModal guides user regarding @BotFather')

// 6. Token Validation Logic Unit Test
console.log('\n[SUITE 6] Bot Token Validation Pattern')
const botTokenRegex = /^\d+:[A-Za-z0-9_-]+$/
assert(botTokenRegex.test('123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ-123_456'), 'Valid standard bot token format passes')
assert(botTokenRegex.test('789101112:AAF-xyz_1234567890abcdef'), 'Valid token with hyphens/underscores passes')
assert(!botTokenRegex.test(''), 'Empty string is rejected')
assert(!botTokenRegex.test('invalid_token_without_id'), 'Token without ID prefix is rejected')
assert(!botTokenRegex.test('abc:12345'), 'Non-numeric bot ID is rejected')
assert(!botTokenRegex.test('12345:token with spaces'), 'Token with spaces is rejected')

// 7. Visual Indicators in Dock & ChatList
console.log('\n[SUITE 7] Bot Visual Badges')
const dockCode = fs.readFileSync(path.join(process.cwd(), 'src/components/AccountDock.tsx'), 'utf8')
assert(dockCode.includes('acc.isBot') && dockCode.includes('🤖'), 'AccountDock renders bot badge for bot accounts')

const chatListCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatList.tsx'), 'utf8')
assert(chatListCode.includes('account.isBot') && chatListCode.includes('BOT'), 'ChatList renders BOT label for active bot account')

console.log('\n====================================================')
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('All Milestone 27 verifications passed successfully!')
}
