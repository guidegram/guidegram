import assert from 'node:assert/strict';
import { TouchErgonomicsAndGestureGovernor } from '../src/services/touchErgonomicsAndGestureGovernor.ts';

console.log('🧪 Starting Phase 27 Touch Ergonomics & Gesture Verification Suite...');

// 1. Precision Touchpad & Pinch-to-Zoom Normalization (tdesktop #30992)
{
  console.log('  Testing precision touchpad pinch-to-zoom normalization...');
  const pinchEvent = {
    deltaX: 0,
    deltaY: -30,
    ctrlKey: true,
    deltaMode: 0
  };

  const pinchRes = TouchErgonomicsAndGestureGovernor.normalizeTouchpadWheel(pinchEvent);
  assert.strictEqual(pinchRes.isPinchToZoom, true);
  assert.ok(pinchRes.zoomFactorDelta > 0, 'Zoom in factor should be positive');
  assert.strictEqual(pinchRes.normalizedDeltaY, 0);

  // Two-finger scroll
  const scrollEvent = {
    deltaX: 15,
    deltaY: 45,
    ctrlKey: false,
    deltaMode: 0
  };
  const scrollRes = TouchErgonomicsAndGestureGovernor.normalizeTouchpadWheel(scrollEvent);
  assert.strictEqual(scrollRes.isPinchToZoom, false);
  assert.strictEqual(scrollRes.normalizedDeltaX, 15);
  assert.strictEqual(scrollRes.normalizedDeltaY, 45);
  console.log('  ✅ Touchpad normalization passed');
}

// 2. Reaction Popover Placement Clamping (Ajaxy/telegram-tt #446)
{
  console.log('  Testing reaction popover viewport bounds clamping...');
  const triggerRect = { left: 10, top: 200, width: 30, height: 30 };
  const popoverWidth = 240;
  const popoverHeight = 50;
  const viewportWidth = 360; // Mobile screen width
  const viewportHeight = 640;

  const placement = TouchErgonomicsAndGestureGovernor.calculateReactionPopoverPlacement(
    triggerRect,
    popoverWidth,
    popoverHeight,
    viewportWidth,
    viewportHeight
  );

  assert.ok(placement.x >= 8, 'Popover X must not overflow screen left edge');
  assert.ok(placement.x + popoverWidth <= viewportWidth - 8, 'Popover X must not overflow screen right edge');
  assert.strictEqual(placement.isFlippedAbove, true, 'Should place above trigger when space available');
  assert.ok(placement.arrowOffsetPx >= 12, 'Arrow should align above trigger');
  console.log('  ✅ Reaction popover placement passed');
}

// 3. Body Scroll Lock Management (morethanwords/tweb #406)
{
  console.log('  Testing modal body scroll lock governor...');
  const lock1 = TouchErgonomicsAndGestureGovernor.acquireScrollLock();
  assert.strictEqual(lock1.shouldLockBody, true);
  assert.strictEqual(lock1.lockCount, 1);

  const lock2 = TouchErgonomicsAndGestureGovernor.acquireScrollLock();
  assert.strictEqual(lock2.shouldLockBody, false, 'Nested lock should not trigger duplicate lock');
  assert.strictEqual(lock2.lockCount, 2);

  const unlock1 = TouchErgonomicsAndGestureGovernor.releaseScrollLock();
  assert.strictEqual(unlock1.shouldUnlockBody, false);
  assert.strictEqual(unlock1.lockCount, 1);

  const unlock2 = TouchErgonomicsAndGestureGovernor.releaseScrollLock();
  assert.strictEqual(unlock2.shouldUnlockBody, true, 'Final unlock should release body lock');
  assert.strictEqual(unlock2.lockCount, 0);
  console.log('  ✅ Scroll lock governor passed');
}

// 4. Pull-to-Refresh State & Anti-Infinite Spin Timeout (Ajaxy/telegram-tt #236)
{
  console.log('  Testing pull-to-refresh state machine & timeout...');
  const stateActive = TouchErgonomicsAndGestureGovernor.updatePullToRefresh(50, 72, 500);
  assert.strictEqual(stateActive.isTimedOut, false);
  assert.ok(stateActive.progress > 0 && stateActive.progress < 1);

  // Exceeded 8000ms timeout
  const stateTimeout = TouchErgonomicsAndGestureGovernor.updatePullToRefresh(50, 72, 8500);
  assert.strictEqual(stateTimeout.isTimedOut, true, 'Must abort infinite spin on timeout');
  assert.strictEqual(stateTimeout.isTriggered, false);
  assert.strictEqual(stateTimeout.progress, 0);
  console.log('  ✅ Pull-to-refresh passed');
}

// 5. Accessible Touch Target Bounds (morethanwords/tweb #281)
{
  console.log('  Testing accessible hit target bounds expansion...');
  // 24x24 reaction button
  const hitBounds = TouchErgonomicsAndGestureGovernor.computeAccessibleHitBounds(
    { x: 100, y: 100, width: 24, height: 24 },
    44
  );
  assert.strictEqual(hitBounds.width, 44);
  assert.strictEqual(hitBounds.height, 44);
  assert.strictEqual(hitBounds.paddingHorizontal, 10);
  assert.strictEqual(hitBounds.paddingVertical, 10);
  console.log('  ✅ Touch target expansion passed');
}

// 6. Stale Reaction Badge Purging (tdesktop #31421)
{
  console.log('  Testing stale unread reaction pointer reconciliation...');
  const knownMessages = new Set([101, 102, 105]);
  const reactionPointers = [101, 103, 105, 999]; // 103 and 999 are deleted

  const reconciliation = TouchErgonomicsAndGestureGovernor.reconcileUnreadReactionPointers(
    reactionPointers,
    knownMessages
  );
  assert.deepStrictEqual(reconciliation.validMsgIds, [101, 105]);
  assert.strictEqual(reconciliation.purgedCount, 2);
  console.log('  ✅ Stale reaction badge reconciliation passed');
}

console.log('\n🎉 ALL Phase 27 verification checks passed green!');
