import assert from 'node:assert/strict';
import { FrameRateAndMotionSpringGuard } from '../src/services/frameRateAndMotionSpringGuard.ts';

console.log('🧪 Starting Phase 24 Frame-Rate, Motion & Multi-Monitor Verification Suite...');

// 1. Kinetic Momentum & Spring Restoration Physics (tdesktop #6746)
{
  console.log('  Testing kinetic momentum decay...');
  let state = {
    position: 100,
    velocity: 1000, // 1000 px/s
    target: 100,
    isResting: false,
    isOvershooting: false
  };

  const minBound = 0;
  const maxBound = 1000;

  // Step 16ms (1 frame @ 60fps)
  state = FrameRateAndMotionSpringGuard.stepKineticMotion(state, minBound, maxBound, 16);
  assert.ok(state.position > 100, 'Position must advance with positive velocity');
  assert.ok(state.velocity < 1000, 'Velocity must decay due to friction');
  assert.strictEqual(state.isOvershooting, false, 'Must not overshoot within bounds');

  console.log('  Testing boundary overshoot and spring restoration...');
  // Force position out of bounds (overshoot above 1000)
  state = {
    position: 1050,
    velocity: 500,
    target: 1000,
    isResting: false,
    isOvershooting: false
  };

  // Run multiple spring steps
  for (let i = 0; i < 30; i++) {
    state = FrameRateAndMotionSpringGuard.stepKineticMotion(state, minBound, maxBound, 16);
  }

  assert.ok(state.position < 1050, 'Spring force must pull back towards 1000');
  console.log('    Spring pulled position back to:', state.position.toFixed(2));

  // Run until rest
  for (let i = 0; i < 120; i++) {
    state = FrameRateAndMotionSpringGuard.stepKineticMotion(state, minBound, maxBound, 16);
    if (state.isResting) break;
  }

  assert.strictEqual(state.isResting, true, 'Spring must settle into rest');
  assert.strictEqual(state.position, 1000, 'Settled position must be exactly at boundary');
  console.log('  ✅ Kinetic momentum & spring restoration passed');
}

// 2. High-Frequency Wheel Delta Coalescing (tdesktop #8347 & #26343)
{
  console.log('  Testing high-refresh-rate wheel delta coalescing...');
  let delta = null;
  delta = FrameRateAndMotionSpringGuard.coalesceWheelDeltas(delta, 10, 20, 1000);
  delta = FrameRateAndMotionSpringGuard.coalesceWheelDeltas(delta, 15, 30, 1002);
  delta = FrameRateAndMotionSpringGuard.coalesceWheelDeltas(delta, -5, 10, 1004);

  assert.strictEqual(delta.eventCount, 3);
  assert.strictEqual(delta.deltaX, 20); // 10 + 15 - 5
  assert.strictEqual(delta.deltaY, 60); // 20 + 30 + 10
  assert.strictEqual(delta.lastTimestamp, 1004);
  console.log('  ✅ Wheel delta coalescing passed');
}

// 3. Subpixel DPR Snapping & Anti-Flicker GPU Layering (tdesktop #5963, #31500)
{
  console.log('  Testing anti-flicker style properties and subpixel snapping...');
  const styles = FrameRateAndMotionSpringGuard.getAntiFlickerStyleProps(12.333, 45.666, 2, true);
  // With DPR = 2, snapped to nearest 0.5px:
  // 12.333 * 2 = 24.666 -> round = 25 -> 25 / 2 = 12.5px
  // 45.666 * 2 = 91.332 -> round = 91 -> 91 / 2 = 45.5px
  assert.strictEqual(styles.transform, 'translate3d(12.5px, 45.5px, 0px)');
  assert.strictEqual(styles.backfaceVisibility, 'hidden');
  assert.strictEqual(styles.willChange, 'transform');

  const idleStyles = FrameRateAndMotionSpringGuard.getAntiFlickerStyleProps(10, 20, 1, false);
  assert.strictEqual(idleStyles.willChange, undefined, 'willChange should be omitted when idle to release GPU layer');
  console.log('  ✅ Anti-flicker style properties passed');
}

// 4. Multi-Monitor Safe Viewport Menu Clamping (tdesktop #7099, #8708)
{
  console.log('  Testing multi-monitor context menu bounds clamping...');
  const displays = [
    { x: 0, y: 0, width: 1920, height: 1080 }, // Primary monitor
    { x: 1920, y: 0, width: 1920, height: 1080 } // Secondary monitor to right
  ];

  // Request menu near the right boundary of primary monitor
  const clamped1 = FrameRateAndMotionSpringGuard.clampContextMenuCoordinates(
    1850,
    500,
    200, // width
    300, // height
    displays
  );

  assert.strictEqual(clamped1.displayIndex, 0);
  assert.ok(clamped1.x + 200 <= 1920 - 8, 'Menu must not overflow primary monitor right edge');
  assert.strictEqual(clamped1.placement, 'bottom-left', 'Placement flipped horizontally');

  // Request menu on secondary monitor bottom edge
  const clamped2 = FrameRateAndMotionSpringGuard.clampContextMenuCoordinates(
    2500,
    1000,
    200,
    300,
    displays
  );

  assert.strictEqual(clamped2.displayIndex, 1);
  assert.ok(clamped2.y + 300 <= 1080 - 8, 'Menu must not overflow secondary monitor bottom edge');
  assert.strictEqual(clamped2.placement, 'top-right', 'Placement flipped vertically');
  console.log('  ✅ Multi-monitor context menu clamping passed');
}

// 5. Smart Typography & Non-Destructive Caret Compensation (tdesktop #522, Unigram #832)
{
  console.log('  Testing smart typography replacement without caret jumping...');
  const input = 'Hello -- world >> next << prev ...';
  const result = FrameRateAndMotionSpringGuard.applySmartTypography(input, input.length);

  assert.strictEqual(result.transformedText, 'Hello — world » next « prev …');
  assert.strictEqual(result.hasReplaced, true);
  // Length difference:
  // '--' (2) -> '—' (1): -1
  // '>>' (2) -> '»' (1): -1
  // '<<' (2) -> '«' (1): -1
  // '...' (3) -> '…' (1): -2
  // Total diff: -5
  assert.strictEqual(result.newCaretPosition, input.length - 5);
  console.log('  ✅ Smart typography passed');
}

console.log('\n🎉 ALL Phase 24 verification checks passed green!');
