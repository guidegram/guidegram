import { strict as assert } from 'node:assert';
import { StreamingTextAnimationGuard } from '../dist-test-stream/src/utils/streamingTextAnimationGuard.js';

console.log('🧪 Starting StreamingTextAnimationGuard Verification Suite...');

const guard = new StreamingTextAnimationGuard({ charactersPerSecond: 100 });

// 1. Initial State
const initTick = guard.tick();
assert.strictEqual(initTick.isComplete, true);
assert.strictEqual(initTick.revealedCharCount, 0);
assert.strictEqual(initTick.revealedLineIndex, 0);
assert.strictEqual(initTick.activeLine, null);
console.log('  ✅ Check 1: Initial empty state verified');

// 2. Multiline content update & normal tick
const multiLineText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
guard.updateContent(multiLineText);

assert.strictEqual(guard.getLayoutVersion(), 1);
const tick1 = guard.tick(performance.now());
assert.ok(tick1.revealedLineIndex >= 0);
assert.ok(tick1.activeLine !== null);
assert.strictEqual(tick1.activeLine.index, tick1.revealedLineIndex);
console.log('  ✅ Check 2: Multiline text update & tick verified');

// 3. Complete text reveal
const tickComplete = guard.tick(performance.now() + 5000);
assert.strictEqual(tickComplete.isComplete, true);
assert.strictEqual(tickComplete.revealedCharCount, multiLineText.length);
assert.strictEqual(tickComplete.revealedLineIndex, 4, 'Must be at last line (index 4)');
assert.ok(tickComplete.activeLine !== null);
console.log('  ✅ Check 3: Full text reveal completion verified');

// 4. THE CRITICAL CRASH TEST (tdesktop #31543): Shrunk draft mid-animation
// While animation is at line 4, an incoming draft update shrinks text to 1 short line!
const shrunkText = 'Short';
guard.updateContent(shrunkText);

assert.strictEqual(guard.getLayoutVersion(), 2);
// Tick immediately - MUST NOT throw out-of-bounds assertion or error!
const tickShrunk = guard.tick(performance.now());
assert.ok(tickShrunk.revealedLineIndex < 1, `Line index must be 0, got ${tickShrunk.revealedLineIndex}`);
assert.strictEqual(tickShrunk.revealedLineIndex, 0);
assert.ok(tickShrunk.activeLine !== null);
assert.strictEqual(tickShrunk.activeLine.index, 0);
assert.strictEqual(tickShrunk.revealedCharCount <= shrunkText.length, true);
console.log('  ✅ Check 4: Mid-flight text shrinkage out-of-bounds guard verified (tdesktop #31543 immunity)');

// 5. Shrunk to completely empty text
guard.updateContent('');
const tickEmpty = guard.tick(performance.now());
assert.strictEqual(tickEmpty.isComplete, true);
assert.strictEqual(tickEmpty.revealedCharCount, 0);
assert.strictEqual(tickEmpty.revealedLineIndex, 0);
assert.strictEqual(tickEmpty.activeLine, null);
console.log('  ✅ Check 5: Empty text transition immunity verified');

// 6. Reset & reuse
guard.reset();
assert.strictEqual(guard.getLayoutVersion(), 0);
console.log('  ✅ Check 6: Reset and reuse verified');

console.log('🎉 ALL 6 CHECKS PASSED SUCCESSFULLY!');
