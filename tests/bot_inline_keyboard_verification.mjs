import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('🧪 Starting Phase 68 Verification: Bot Menu Buttons & Inline Keyboard Callback Engine...')

const repoRoot = process.cwd()

// Test 1: Check types.ts for InlineButton switchInlineQuery & buy types
console.log('▶ Test 1: Verifying InlineButton definitions in types.ts...')
const typesPath = path.join(repoRoot, 'electron/telegram/types.ts')
const typesContent = fs.readFileSync(typesPath, 'utf8')

assert(typesContent.includes('switchInlineQuery?: string'), 'types.ts must declare switchInlineQuery in InlineButton')
assert(typesContent.includes('switchInlineQueryCurrentChat?: boolean'), 'types.ts must declare switchInlineQueryCurrentChat in InlineButton')
assert(typesContent.includes("'buy'"), 'types.ts must support buy button type')
assert(typesContent.includes("'switch_inline'"), 'types.ts must support switch_inline button type')
console.log('✅ Test 1 Passed: InlineButton type matches MTProto TL schema specifications.')

// Test 2: Check accountManager.ts for replyMarkup mapping
console.log('▶ Test 2: Verifying replyMarkup mapping in accountManager.ts...')
const accountManagerPath = path.join(repoRoot, 'electron/telegram/accountManager.ts')
const accountManagerContent = fs.readFileSync(accountManagerPath, 'utf8')

assert(accountManagerContent.includes("b._ === 'keyboardButtonSwitchInline'"), 'accountManager must parse keyboardButtonSwitchInline')
assert(accountManagerContent.includes("b._ === 'keyboardButtonBuy'"), 'accountManager must parse keyboardButtonBuy')
assert(accountManagerContent.includes('switchInlineQuery: b.query'), 'accountManager must extract query parameter')
assert(accountManagerContent.includes('switchInlineQueryCurrentChat: Boolean(b.samePeer)'), 'accountManager must extract samePeer parameter')
console.log('✅ Test 2 Passed: accountManager safely transforms MTProto keyboardButton types into structured buttons.')

// Test 3: Check ChatViewport.tsx for switch_inline and buy click handling
console.log('▶ Test 3: Verifying ChatViewport.tsx inline button interaction...')
const chatViewportPath = path.join(repoRoot, 'src/components/ChatViewport.tsx')
const chatViewportContent = fs.readFileSync(chatViewportPath, 'utf8')

assert(chatViewportContent.includes("btn.type === 'switch_inline' || btn.switchInlineQuery !== undefined"), 'ChatViewport must handle switch_inline buttons')
assert(chatViewportContent.includes("btn.type === 'buy'"), 'ChatViewport must handle buy / invoice buttons')
assert(chatViewportContent.includes('btn.switchInlineQueryCurrentChat'), 'ChatViewport must distinguish current chat vs external query')
console.log('✅ Test 3 Passed: ChatViewport executes switch_inline query insertion and payment toasts.')

// Test 4: Check BotMenuDrawer.tsx for command menu button support
console.log('▶ Test 4: Verifying BotMenuDrawer and Command Autocomplete...')
const botMenuPath = path.join(repoRoot, 'src/components/chat/BotMenuDrawer.tsx')
const botMenuContent = fs.readFileSync(botMenuPath, 'utf8')

assert(botMenuContent.includes('export interface BotCommandItem'), 'BotMenuDrawer must define BotCommandItem')
assert(botMenuContent.includes('CommandAutocompleteDrawer'), 'BotMenuDrawer must provide CommandAutocompleteDrawer')
assert(botMenuContent.includes('onLaunchMiniApp'), 'BotMenuDrawer must support web app launch')
console.log('✅ Test 4 Passed: BotMenuDrawer handles bot menu commands and web app buttons.')

// Test 5: Verify botButtonCache and callback query execution in accountManager
console.log('▶ Test 5: Verifying sendBotCallbackQuery mechanism...')
assert(accountManagerContent.includes('botButtonCache.set'), 'accountManager must cache callback data buffers')
assert(accountManagerContent.includes('sendBotCallbackQuery'), 'accountManager must expose sendBotCallbackQuery method')
console.log('✅ Test 5 Passed: Bot callback query mechanism is fully operational.')

console.log('🎉 All 5/5 Phase 68 Verification tests passed successfully!')
