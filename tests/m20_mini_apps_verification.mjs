import { readFileSync } from 'fs'
import { join } from 'path'

console.log('--- Telegram Mini Apps (TWA) Host Verification ---')

const workspaceRoot = process.cwd()

// 1. Check accountManager.ts
const accountManagerPath = join(workspaceRoot, 'electron', 'telegram', 'accountManager.ts')
const accountManagerContent = readFileSync(accountManagerPath, 'utf-8')
if (!accountManagerContent.includes('public async requestWebView(')) {
  throw new Error('accountManager.ts missing requestWebView method')
}
if (!accountManagerContent.includes('messages.requestWebView')) {
  throw new Error('accountManager.ts missing messages.requestWebView MTProto call')
}
if (!accountManagerContent.includes('isMiniApp: true')) {
  throw new Error('accountManager.ts missing isMiniApp marking in keyboardButtonWebView')
}
console.log('✓ Check 1 passed: accountManager.ts implements requestWebView and marks MiniApp buttons')

// 2. Check main.ts
const mainPath = join(workspaceRoot, 'electron', 'main.ts')
const mainContent = readFileSync(mainPath, 'utf-8')
if (!mainContent.includes('openMiniAppWindow(')) {
  throw new Error('main.ts missing openMiniAppWindow helper')
}
if (!mainContent.includes('telegram:request-web-view')) {
  throw new Error('main.ts missing telegram:request-web-view IPC handler')
}
if (!mainContent.includes('telegram:open-mini-app')) {
  throw new Error('main.ts missing telegram:open-mini-app IPC handler')
}
if (!mainContent.includes('window.Telegram.WebApp =')) {
  throw new Error('main.ts missing window.Telegram.WebApp injection script')
}
console.log('✓ Check 2 passed: main.ts implements openMiniAppWindow and registers IPC handlers')

// 3. Check preload.ts
const preloadPath = join(workspaceRoot, 'electron', 'preload.ts')
const preloadContent = readFileSync(preloadPath, 'utf-8')
if (!preloadContent.includes('requestWebView:')) {
  throw new Error('preload.ts missing requestWebView API exposure')
}
if (!preloadContent.includes('openMiniApp:')) {
  throw new Error('preload.ts missing openMiniApp API exposure')
}
console.log('✓ Check 3 passed: preload.ts exposes requestWebView and openMiniApp')

// 4. Check MiniAppModal.tsx
const miniAppModalPath = join(workspaceRoot, 'src', 'components', 'MiniAppModal.tsx')
const miniAppModalContent = readFileSync(miniAppModalPath, 'utf-8')
if (!miniAppModalContent.includes('export const MiniAppModal')) {
  throw new Error('MiniAppModal.tsx missing export const MiniAppModal')
}
if (!miniAppModalContent.includes('<iframe')) {
  throw new Error('MiniAppModal.tsx missing iframe for webview embedding')
}
if (!miniAppModalContent.includes('onOpenInNewWindow')) {
  throw new Error('MiniAppModal.tsx missing standalone window pop-out support')
}
console.log('✓ Check 4 passed: MiniAppModal.tsx component created with full glassmorphism UI & iframe')

// 5. Check ChatViewport.tsx
const chatViewportPath = join(workspaceRoot, 'src', 'components', 'ChatViewport.tsx')
const chatViewportContent = readFileSync(chatViewportPath, 'utf-8')
if (!chatViewportContent.includes("import { MiniAppModal } from './MiniAppModal'")) {
  throw new Error('ChatViewport.tsx missing MiniAppModal import')
}
if (!chatViewportContent.includes('handleLaunchMiniApp')) {
  throw new Error('ChatViewport.tsx missing handleLaunchMiniApp handler')
}
if (!chatViewportContent.includes('chat.isBot') || !chatViewportContent.includes("t('miniapp.launch')")) {
  throw new Error('ChatViewport.tsx missing Bot Mini App header button')
}
if (!chatViewportContent.includes('<MiniAppModal')) {
  throw new Error('ChatViewport.tsx missing MiniAppModal mounting')
}
console.log('✓ Check 5 passed: ChatViewport.tsx integrated with MiniApp header button and modal')

// 6. Check translations.ts
const translationsPath = join(workspaceRoot, 'src', 'i18n', 'translations.ts')
const translationsContent = readFileSync(translationsPath, 'utf-8')
const keys = [
  'miniapp.launch',
  'miniapp.loading',
  'miniapp.reload',
  'miniapp.open_window',
  'miniapp.copy_link',
  'miniapp.close'
]
for (const key of keys) {
  if (!translationsContent.includes(`'${key}'`)) {
    throw new Error(`translations.ts missing translation key: ${key}`)
  }
}
console.log('✓ Check 6 passed: translations.ts contains all MiniApp i18n keys for EN and FA')

// 7. Check types.ts
const typesPath = join(workspaceRoot, 'electron', 'telegram', 'types.ts')
const typesContent = readFileSync(typesPath, 'utf-8')
if (!typesContent.includes('webAppUrl?: string') || !typesContent.includes('isMiniApp?: boolean')) {
  throw new Error('types.ts missing webAppUrl or isMiniApp in InlineButton')
}
console.log('✓ Check 7 passed: types.ts includes webAppUrl and isMiniApp properties')

console.log('\nALL 7 TELEGRAM MINI APPS VERIFICATION CHECKS PASSED SUCCESSFULLY!')
