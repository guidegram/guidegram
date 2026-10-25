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

console.log('📱 [TEST SUITE] Phase 73: Mobile & Touch Ergonomics Audit Verification')

// 1. Viewport Meta Verification
console.log('\n--- 1. Viewport Meta Tag ---')
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf-8')
assert(indexHtml.includes('viewport-fit=cover'), 'index.html includes viewport-fit=cover')
assert(indexHtml.includes('maximum-scale=1.0'), 'index.html includes maximum-scale=1.0')
assert(indexHtml.includes('user-scalable=no'), 'index.html includes user-scalable=no')

// 2. CSS Ergonomics Utilities
console.log('\n--- 2. CSS Touch Ergonomics & Safe Area Utilities ---')
const indexCss = readFileSync(join(ROOT, 'src/index.css'), 'utf-8')
assert(indexCss.includes('.touch-hit-slop'), 'src/index.css defines .touch-hit-slop class')
assert(indexCss.includes('.touch-hit-slop::after'), 'src/index.css defines .touch-hit-slop::after expander')
assert(indexCss.includes('min-width: 44px;') && indexCss.includes('min-height: 44px;'), 'Touch hit slop expands to at least 44x44px tap area')
assert(indexCss.includes('.touch-target-44'), 'src/index.css defines .touch-target-44')
assert(indexCss.includes('.touch-target-48'), 'src/index.css defines .touch-target-48')
assert(indexCss.includes('.safe-area-bottom'), 'src/index.css defines .safe-area-bottom')
assert(indexCss.includes('.safe-area-top'), 'src/index.css defines .safe-area-top')
assert(indexCss.includes('.safe-area-left'), 'src/index.css defines .safe-area-left')
assert(indexCss.includes('.safe-area-right'), 'src/index.css defines .safe-area-right')
assert(indexCss.includes('.safe-area-inset'), 'src/index.css defines .safe-area-inset')
assert(indexCss.includes('.touch-scroll-container'), 'src/index.css defines .touch-scroll-container with overscroll containment')
assert(indexCss.includes('@media (pointer: coarse)'), 'src/index.css defines coarse pointer touch overrides')

// 3. ChatViewport Touch Ergonomics
console.log('\n--- 3. ChatViewport Touch Slops ---')
const chatViewportTsx = readFileSync(join(ROOT, 'src/components/ChatViewport.tsx'), 'utf-8')
assert(chatViewportTsx.includes('touch-hit-slop min-w-[36px] min-h-[36px]'), 'ChatViewport header toolbar buttons have touch-hit-slop and min size')
assert(chatViewportTsx.includes('touch-hit-slop min-w-[40px] min-h-[40px]'), 'ChatViewport send and voice recorder buttons have touch-hit-slop min-w 40px')
assert(chatViewportTsx.includes('isAttachMenuOpen') && chatViewportTsx.includes('touch-hit-slop'), 'Paperclip attach button has touch-hit-slop')
assert(chatViewportTsx.includes('isStickerDrawerOpen') && chatViewportTsx.includes('touch-hit-slop'), 'Sticker picker drawer button has touch-hit-slop')
assert(chatViewportTsx.includes('setIsAiMenuOpen') && chatViewportTsx.includes('touch-hit-slop'), 'AI assistant button has touch-hit-slop')

// 4. ChatTabs Touch Ergonomics
console.log('\n--- 4. ChatTabs Touch Ergonomics ---')
const chatTabsTsx = readFileSync(join(ROOT, 'src/components/ChatTabs.tsx'), 'utf-8')
assert(chatTabsTsx.includes('touch-hit-slop min-h-[36px]'), 'ChatTabs folder tabs have touch-hit-slop and min-h-[36px]')

// 5. ChatList Touch Ergonomics
console.log('\n--- 5. ChatList Touch Ergonomics ---')
const chatListTsx = readFileSync(join(ROOT, 'src/components/ChatList.tsx'), 'utf-8')
assert(chatListTsx.includes('touch-hit-slop min-w-[32px] min-h-[32px]'), 'ChatList search cancel button has touch-hit-slop')
assert(chatListTsx.includes('touch-hit-slop min-h-[32px]'), 'ChatList search filter pills have touch-hit-slop')

console.log(`\n==================================================`)
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`==================================================`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL TOUCH ERGONOMICS VERIFICATION CHECKS PASSED!')
  process.exit(0)
}
