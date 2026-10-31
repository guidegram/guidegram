import assert from 'node:assert/strict';
import { FrameRateAndCompositorGovernor } from '../src/services/frameRateAndCompositorGovernor.ts';

console.log('🧪 Starting Phase 57 Frame-Rate, Motion & Compositor Optimization Verification Suite...');

const governor = new FrameRateAndCompositorGovernor();

// 1. Background Animation Suspension (morethanwords/tweb #252)
console.log('  Testing background animation loop suspension...');
governor.setVisibilityState(false);
assert.equal(governor.shouldExecuteAnimationTick(), true, 'Foreground tick should be permitted');

governor.setVisibilityState(true);
assert.equal(governor.shouldExecuteAnimationTick(), false, 'Background tick should be suspended');
assert.equal(governor.shouldExecuteAnimationTick(true), true, 'Forced background tick should be permitted when requested');
console.log('  ✅ Background animation suspension verified');

// 2. Spring Physics 60fps Convergence & Delta Clamping (telegramdesktop/tdesktop #30795)
console.log('  Testing spring physics convergence and time delta clamping...');
let springState = {
  current: 0,
  target: 100,
  velocity: 0,
  settled: false,
};

const config = { stiffness: 200, damping: 25, mass: 1, precision: 0.01 };

// Simulate 120 steps with 16ms dt (60fps simulation)
let steps = 0;
while (!springState.settled && steps < 200) {
  springState = governor.stepSpring(springState, config, 0.016);
  steps++;
}

assert.equal(springState.settled, true, 'Spring must settle within reasonable steps');
assert.equal(springState.current, 100, 'Spring final position must be equal to target');
assert.equal(springState.velocity, 0, 'Spring final velocity must be zero');

// Test delta clamping on long lag spike (e.g. 500ms freeze)
const lagSpikeState = { current: 0, target: 50, velocity: 0, settled: false };
const nextAfterLag = governor.stepSpring(lagSpikeState, config, 0.5);
assert.ok(!isNaN(nextAfterLag.current), 'Position must not be NaN after long lag spike');
assert.ok(nextAfterLag.current < 50, 'Position must not catapult past target due to clamped dt');
console.log('  ✅ Spring physics convergence & delta clamping verified');

// 3. Two-Phase Read/Write Batching to eliminate Layout Thrashing (UnigramDev/Unigram #3430)
console.log('  Testing two-phase Read/Write batch queue execution...');
const executionLog = [];

governor.queueWrite(() => {
  executionLog.push('write-1');
});
governor.queueRead(() => {
  executionLog.push('read-1');
});
governor.queueWrite(() => {
  executionLog.push('write-2');
});
governor.queueRead(() => {
  executionLog.push('read-2');
});

const flushResult = governor.flushBatch();
assert.equal(flushResult.readsExecuted, 2);
assert.equal(flushResult.writesExecuted, 2);

// Critical invariant: ALL reads must execute before any writes execute!
assert.deepEqual(
  executionLog,
  ['read-1', 'read-2', 'write-1', 'write-2'],
  'All read callbacks must execute before any write callbacks to prevent layout thrashing'
);
console.log('  ✅ Two-phase Read/Write batch queue verified');

// 4. Nested Scroll & Drawer Compositor Hints (UnigramDev/Unigram #1332)
console.log('  Testing CSS compositor containment hints calculation...');
const scrollHints = governor.computeCompositorHints({ isScrollContainer: true });
assert.equal(scrollHints.contain, 'layout style paint');
assert.equal(scrollHints.willChange, 'scroll-position');

const drawerHints = governor.computeCompositorHints({ isNestedDrawer: true });
assert.equal(drawerHints.contain, 'layout paint');
assert.equal(drawerHints.willChange, 'transform');
assert.equal(drawerHints.transform, 'translateZ(0)');
console.log('  ✅ Compositor containment hints verified');

// 5. Audio Spectrum Visualizer Throttling (AyuGram/AyuGramDesktop #248)
console.log('  Testing audio spectrum visualizer throttling...');
governor.setVisibilityState(false); // Foreground

const playingFocused = governor.evaluateVisualizerExecution({
  isPlaying: true,
  isMuted: false,
  isVisible: true,
  windowFocused: true,
});
assert.equal(playingFocused.shouldRender, true);
assert.equal(playingFocused.targetFps, 60);

const playingBlurred = governor.evaluateVisualizerExecution({
  isPlaying: true,
  isMuted: false,
  isVisible: true,
  windowFocused: false,
});
assert.equal(playingBlurred.shouldRender, true);
assert.equal(playingBlurred.targetFps, 30);

const mutedState = governor.evaluateVisualizerExecution({
  isPlaying: true,
  isMuted: true,
  isVisible: true,
  windowFocused: true,
});
assert.equal(mutedState.shouldRender, false);
assert.equal(mutedState.targetFps, 0);

const hiddenState = governor.evaluateVisualizerExecution({
  isPlaying: true,
  isMuted: false,
  isVisible: false,
  windowFocused: true,
});
assert.equal(hiddenState.shouldRender, false);
assert.equal(hiddenState.targetFps, 0);
console.log('  ✅ Audio spectrum visualizer throttling verified');

// 6. Hardware Video Compositing Style Verification (AyuGram/AyuGramDesktop #387)
console.log('  Testing hardware video compositing layer verification...');
assert.equal(
  governor.isHardwareVideoCompositingOptimal({
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
  }),
  true
);

assert.equal(
  governor.isHardwareVideoCompositingOptimal({
    transform: 'none',
    backfaceVisibility: 'visible',
  }),
  false
);
console.log('  ✅ Hardware video compositing verification verified');

console.log('✨ All Phase 57 Verification Tests Passed 100% Successfully!');
