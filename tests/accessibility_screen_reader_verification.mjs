import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log('♿ [TEST SUITE] Phase 74: Accessibility & Screen-Reader Hardening Verification')

// 1. CSS Accessibility Standards
console.log('\n--- 1. CSS Accessibility Rules (.sr-only, :focus-visible, prefers-reduced-motion) ---')
const indexCss = readFileSync(join(ROOT, 'src/index.css'), 'utf-8')
assert(indexCss.includes('.sr-only'), 'src/index.css defines .sr-only utility class')
assert(indexCss.includes(':focus-visible'), 'src/index.css defines :focus-visible ring')
assert(indexCss.includes('prefers-reduced-motion: reduce'), 'src/index.css respects prefers-reduced-motion for motion sensitivities')

// 2. App.tsx Live Announcer & Semantic Landmarks
console.log('\n--- 2. App.tsx ARIA-Live Announcer & Semantic Landmarks ---')
const appTsx = readFileSync(join(ROOT, 'src/App.tsx'), 'utf-8')
assert(appTsx.includes('id="a11y-live-announcer"'), 'App.tsx contains accessible #a11y-live-announcer element')
assert(appTsx.includes('aria-live="polite"'), 'Announcer uses aria-live="polite"')
assert(appTsx.includes('aria-atomic="true"'), 'Announcer uses aria-atomic="true"')
assert(appTsx.includes('setA11yAnnouncement(`New message from'), 'Incoming messages dynamically trigger polite ARIA live announcement')
assert(appTsx.includes('role="navigation"'), 'App.tsx defines role="navigation" on AccountDock landmark')
assert(appTsx.includes('role="complementary"'), 'App.tsx defines role="complementary" on conversations sidebar landmark')
assert(appTsx.includes('role="main"'), 'App.tsx defines role="main" on conversation viewport landmark')
assert(appTsx.includes('role="separator"'), 'App.tsx defines role="separator" on sidebar splitter')

// 3. ChatViewport.tsx A11y Attributes
console.log('\n--- 3. ChatViewport.tsx Accessible Controls & Message Stream ---')
const chatViewportTsx = readFileSync(join(ROOT, 'src/components/ChatViewport.tsx'), 'utf-8')
assert(chatViewportTsx.includes('role="log"'), 'Messages feed defines role="log"')
assert(chatViewportTsx.includes('aria-label="Messages stream"'), 'Messages feed defines aria-label="Messages stream"')
assert(chatViewportTsx.includes('aria-label="Write a message"'), 'Textarea defines aria-label="Write a message"')
assert(chatViewportTsx.includes('aria-label="Attach Photo, Video or Document"'), 'Paperclip button defines aria-label')
assert(chatViewportTsx.includes('aria-label="Stickers & Animated Packs"'), 'Stickers button defines aria-label')
assert(chatViewportTsx.includes('aria-label={slowModeSecondsLeft > 0 ? `Slow mode active: wait ${slowModeSecondsLeft}s` : \'Send message\'}'), 'Send button defines dynamic accessible aria-label')
assert(chatViewportTsx.includes('aria-label={!canSendMedia ? \'Voice messages restricted in this group\' : \'Record Voice Message\'}'), 'Voice record button defines dynamic accessible aria-label')

// 4. ChatList.tsx Search Accessibility
console.log('\n--- 4. ChatList.tsx Search Accessibility ---')
const chatListTsx = readFileSync(join(ROOT, 'src/components/ChatList.tsx'), 'utf-8')
assert(chatListTsx.includes('aria-label={t(\'app.search_placeholder\') || \'Search chats, media, and links\'}'), 'Search input defines accessible aria-label')
assert(chatListTsx.includes('aria-label={t(\'app.cancel\') || \'Clear search query\'}'), 'Search clear button defines accessible aria-label')

console.log(`\n==================================================`)
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`==================================================`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL ACCESSIBILITY & SCREEN-READER HARDENING CHECKS PASSED!')
  process.exit(0)
}
