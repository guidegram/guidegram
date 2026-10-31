import assert from 'node:assert/strict'
import { SmoothScrollAndLayoutAnchor } from '../src/services/smoothScrollAndLayoutAnchor.ts'

console.log('--- [Phase 7: Horizon 2 - 60fps Scroll Anchoring & Navigation Verification] ---')

const anchorService = SmoothScrollAndLayoutAnchor.getInstance()

// 1. Test Bottom Proximity & Auto-Stick
console.log('[Test 1] Validating Bottom Proximity & Auto-Stick...')
// Case A: At bottom (distance = 0)
assert.equal(anchorService.isNearBottom(500, 1000, 500), true, 'ScrollTop=500, Height=1000, Client=500 is exactly at bottom')

// Case B: Within 40px of bottom
assert.equal(anchorService.isNearBottom(470, 1000, 500), true, 'Distance=30px is within 60px threshold')

// Case C: Far up in history
assert.equal(anchorService.isNearBottom(200, 1000, 500), false, 'Distance=300px must not trigger bottom stick')
console.log('✅ [Test 1 Passed] Bottom proximity accurately differentiates reading history vs active chat.')

// 2. Test Scroll Anchoring & Jump Prevention (#17254)
console.log('[Test 2] Validating Scroll Anchoring & Zero Jump Restoration...')
const visibleItems = [
  { id: 'msg_10', top: 300 },
  { id: 'msg_11', top: 380 },
  { id: 'msg_12', top: 450 },
]

// Capture anchor while reading msg_11 (scrollTop=350)
const anchor = anchorService.captureAnchor(350, 1000, 500, visibleItems)
assert.equal(anchor.messageId, 'msg_11', 'Must anchor to top-most visible item in reading view')
assert.equal(anchor.offsetFromTop, 30, 'Offset of msg_11 (380 - 350) must be 30px')

// 10 new messages loaded above, shifting msg_11 down to top=780, new scrollHeight=1400
const restoredScrollTop = anchorService.calculateRestoredScrollTop(anchor, 1400, 500, 780)
assert.equal(restoredScrollTop, 750, 'Restored scrollTop must be 780 - 30 = 750px (Zero Scroll Jump!)')
assert.equal(anchorService.getTelemetry().jumpsPrevented > 0, true, 'Telemetry must count prevented jump')
console.log('✅ [Test 2 Passed] Scroll anchor rigidly preserves user reading position without jumping.')

// 3. Test Keyboard Navigation Steps (#16300)
console.log('[Test 3] Validating Keyboard Navigation Steps...')
const currentScroll = 200
const scrollHeight = 2000
const clientHeight = 600

const stepDown = anchorService.calculateKeyboardStep('ArrowDown', currentScroll, scrollHeight, clientHeight)
assert.equal(stepDown, 260, 'ArrowDown must step +60px')

const stepUp = anchorService.calculateKeyboardStep('ArrowUp', currentScroll, scrollHeight, clientHeight)
assert.equal(stepUp, 140, 'ArrowUp must step -60px')

const stepEnd = anchorService.calculateKeyboardStep('End', currentScroll, scrollHeight, clientHeight)
assert.equal(stepEnd, 1400, 'End must jump to bottom (2000 - 600)')

const stepHome = anchorService.calculateKeyboardStep('Home', currentScroll, scrollHeight, clientHeight)
assert.equal(stepHome, 0, 'Home must jump to top (0)')
console.log('✅ [Test 3 Passed] Keyboard navigation steps correctly calculated.')

// 4. Test Link Preview Toggle (#687)
console.log('[Test 4] Validating Link Preview Toggle...')
anchorService.setLinkPreviewsEnabled(false)
assert.equal(anchorService.getLinkPreviewsEnabled(), false, 'Link previews must be disableable to avoid layout shifts')
anchorService.setLinkPreviewsEnabled(true)
assert.equal(anchorService.getLinkPreviewsEnabled(), true, 'Link previews re-enabled')
console.log('✅ [Test 4 Passed] Link preview toggle works as expected.')
console.log('--- ALL PHASE 7 SMOOTH SCROLL & ANCHORING CHECKS PASSED (100% GREEN) ---')
