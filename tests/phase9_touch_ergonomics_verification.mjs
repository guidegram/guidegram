import assert from 'node:assert';
import {
  TouchGestureAndKineticScrollGuard,
  VirtualKeyboardAndViewportManager,
  TouchTargetAndHitSlopExpander,
  WindowFullscreenGuard,
} from '../src/services/touchAndViewportErgonomicsService.ts';

function runTests() {
  console.log('[Phase 9 Verification] Starting tests...');

  // --- Test 1: TouchGestureAndKineticScrollGuard (#1570) ---
  const touchGuard = new TouchGestureAndKineticScrollGuard();
  const t0 = 1000;
  touchGuard.onTouchStart(100, 200, t0);

  const move1 = touchGuard.onTouchMove(100, 205, t0 + 16);
  assert.strictEqual(move1.isScrolling, false, 'Initial sub-threshold jitter should not trigger scroll');

  const move2 = touchGuard.onTouchMove(100, 240, t0 + 32);
  assert.strictEqual(move2.isScrolling, true, 'Moving beyond 10px must trigger active scroll');
  assert.strictEqual(move2.deltaY, 35);

  const velocityFast = touchGuard.onTouchEnd(100, 300, t0 + 50);
  assert.strictEqual(velocityFast.isKinetic, true, 'High velocity swipe must trigger kinetic scrolling');
  assert.ok(velocityFast.vy > 1.0);
  console.log('✓ Test 1: TouchGestureAndKineticScrollGuard passed');

  // --- Test 2: VirtualKeyboardAndViewportManager (#1410) ---
  const viewportMgr = new VirtualKeyboardAndViewportManager();

  // Desktop / full screen mode
  const normalInset = viewportMgr.updateViewport(900, 900);
  assert.strictEqual(normalInset.isKeyboardVisible, false);
  assert.strictEqual(normalInset.keyboardHeight, 0);
  assert.strictEqual(viewportMgr.computeContainerBottomOffset(16), 16);

  // Mobile virtual keyboard opened (height reduced to 580px, keyboard takes 320px)
  const keyboardInset = viewportMgr.updateViewport(900, 580);
  assert.strictEqual(keyboardInset.isKeyboardVisible, true);
  assert.strictEqual(keyboardInset.keyboardHeight, 320);
  assert.strictEqual(viewportMgr.computeContainerBottomOffset(16), 336, 'Composer must be pushed above keyboard');
  console.log('✓ Test 2: VirtualKeyboardAndViewportManager passed');

  // --- Test 3: TouchTargetAndHitSlopExpander (#4358) ---
  // Small 20x20px close icon
  const hitBox = TouchTargetAndHitSlopExpander.calculateHitSlop(20, 20);
  assert.strictEqual(hitBox.meetsWcagStandard, true);
  assert.strictEqual(hitBox.expandedPaddingX, 12);
  assert.strictEqual(hitBox.expandedPaddingY, 12);
  assert.strictEqual(hitBox.effectiveWidth, 44);
  assert.strictEqual(hitBox.effectiveHeight, 44);

  // Tap 5px outside the visual element boundary (within hit slop)
  const isHit = TouchTargetAndHitSlopExpander.isWithinTargetWithHitSlop(
    95, 95,   // tap coordinates
    100, 100, // element top-left
    20, 20    // element size
  );
  assert.strictEqual(isHit, true, 'Tap inside hit slop padding must register as hit');

  // Tap 20px outside (outside hit slop)
  const isMiss = TouchTargetAndHitSlopExpander.isWithinTargetWithHitSlop(
    80, 80,
    100, 100,
    20, 20
  );
  assert.strictEqual(isMiss, false, 'Tap outside hit slop must not hit');
  console.log('✓ Test 3: TouchTargetAndHitSlopExpander passed');

  // --- Test 4: WindowFullscreenGuard (#1710) ---
  const fsGuard = new WindowFullscreenGuard();
  const now = 2000;

  const firstToggle = fsGuard.setFullscreenState(true, now);
  assert.strictEqual(firstToggle, true);
  assert.strictEqual(fsGuard.getState(), true);

  // Rapid accidental double-tap 100ms later
  const rapidToggle = fsGuard.setFullscreenState(false, now + 100);
  assert.strictEqual(rapidToggle, false, 'Rapid bounce toggle must be blocked');
  assert.strictEqual(fsGuard.getState(), true, 'Fullscreen state must be preserved');

  // Intentional toggle 1000ms later
  const validToggle = fsGuard.setFullscreenState(false, now + 1000);
  assert.strictEqual(validToggle, true);
  assert.strictEqual(fsGuard.getState(), false);
  console.log('✓ Test 4: WindowFullscreenGuard passed');

  console.log('[Phase 9 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
