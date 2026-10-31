import assert from 'node:assert';
import {
  FramePacingAndHighRefreshRateClock,
  SafeTextAnimationRenderer,
  ReducedMotionAndAnimationEnforcer,
  LayoutThrashingMitigator,
} from '../src/services/frameRateAndMotionService.ts';

function runTests() {
  console.log('[Phase 12 Verification] Starting tests...');

  // --- Test 1: FramePacingAndHighRefreshRateClock (#6312) ---
  const clock = new FramePacingAndHighRefreshRateClock(60);
  const t0 = 1000;
  clock.tick(t0);

  const tickNormal = clock.tick(t0 + 16.6);
  assert.strictEqual(tickNormal.isStepSafe, true);
  assert.ok(Math.abs(tickNormal.deltaMs - 16.6) < 0.1);

  // Simulated 500ms background tab lag spike
  const tickLag = clock.tick(t0 + 16.6 + 500);
  assert.strictEqual(tickLag.isStepSafe, false, 'Large jump must be flagged unsafe');
  assert.ok(tickLag.deltaMs <= 33.4, 'Delta must be strictly clamped to prevent physics blowup');
  console.log('✓ Test 1: FramePacingAndHighRefreshRateClock passed');

  // --- Test 2: SafeTextAnimationRenderer (#31543 SIGABRT Defense) ---
  const lineLayouts = [
    { width: 200, height: 20, charCount: 30 },
    { width: 180, height: 20, charCount: 25 },
  ];

  // Normal reveal at 50% on line 0
  const revealNormal = SafeTextAnimationRenderer.computeSafeLineReveal(lineLayouts, 0, 0.5);
  assert.strictEqual(revealNormal.visibleChars, 15);
  assert.strictEqual(revealNormal.lineWidth, 100);
  assert.strictEqual(revealNormal.isComplete, false);

  // Out-of-bounds line index that previously crashed competitor via std::vector assertion
  const revealOutOfBounds = SafeTextAnimationRenderer.computeSafeLineReveal(lineLayouts, 999, 1.0);
  assert.strictEqual(revealOutOfBounds.visibleChars, 25, 'Clamped to last line');
  assert.strictEqual(revealOutOfBounds.lineWidth, 180);
  assert.strictEqual(revealOutOfBounds.isComplete, true);

  // Negative index defense
  const revealNegative = SafeTextAnimationRenderer.computeSafeLineReveal(lineLayouts, -5, 0.2);
  assert.strictEqual(revealNegative.visibleChars, 6, 'Clamped to first line');
  console.log('✓ Test 2: SafeTextAnimationRenderer passed');

  // --- Test 3: ReducedMotionAndAnimationEnforcer (#31544, #341) ---
  const motionEnforcer = new ReducedMotionAndAnimationEnforcer(true, false);
  assert.strictEqual(motionEnforcer.shouldAnimate(), true);
  assert.strictEqual(motionEnforcer.getEffectiveDuration(300), 300);

  // User explicitly disables animations in settings (#341)
  motionEnforcer.setAnimationsEnabled(false);
  assert.strictEqual(motionEnforcer.shouldAnimate(), false);
  assert.strictEqual(motionEnforcer.getEffectiveDuration(300), 0, 'Duration must snap to 0ms');

  // User re-enables, but system OS has prefers-reduced-motion active
  motionEnforcer.setAnimationsEnabled(true);
  motionEnforcer.setSystemReducedMotion(true);
  assert.strictEqual(motionEnforcer.shouldAnimate(), false, 'System setting must take precedence');
  assert.strictEqual(motionEnforcer.getEffectiveDuration(300), 0);
  console.log('✓ Test 3: ReducedMotionAndAnimationEnforcer passed');

  // --- Test 4: LayoutThrashingMitigator (#1272) ---
  const mitigator = new LayoutThrashingMitigator();
  const executionOrder = [];

  // Interleaved scheduling
  mitigator.scheduleWrite(() => executionOrder.push('write_1'));
  mitigator.scheduleRead(() => executionOrder.push('read_1'));
  mitigator.scheduleWrite(() => executionOrder.push('write_2'));
  mitigator.scheduleRead(() => executionOrder.push('read_2'));

  const result = mitigator.flushSync();
  assert.strictEqual(result.readsExecuted, 2);
  assert.strictEqual(result.writesExecuted, 2);

  // Invariant: all reads must execute strictly before any writes
  assert.deepStrictEqual(executionOrder, ['read_1', 'read_2', 'write_1', 'write_2']);
  console.log('✓ Test 4: LayoutThrashingMitigator passed');

  console.log('[Phase 12 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
