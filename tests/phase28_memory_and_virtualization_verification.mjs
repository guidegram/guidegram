import assert from 'node:assert/strict';
import { MemoryHeapAndVirtualizationGovernor } from '../src/services/memoryHeapAndVirtualizationGovernor.ts';

console.log('🧪 Starting Phase 28 Memory Footprint & Virtualization Verification Suite...');

// 1. Account Scope Subscription Lifecycle (Unigram #3486)
{
  console.log('  Testing account subscription disposal on switch/logout...');
  let unSub1Called = false;
  let unSub2Called = false;

  MemoryHeapAndVirtualizationGovernor.registerAccountSubscription('acc_user_1', () => {
    unSub1Called = true;
  });
  MemoryHeapAndVirtualizationGovernor.registerAccountSubscription('acc_user_1', () => {
    unSub2Called = true;
  });

  // Switch to account 2 -> dispose account 1
  const disposeRes = MemoryHeapAndVirtualizationGovernor.disposeAccountScope('acc_user_1');
  assert.strictEqual(disposeRes.disposedCount, 2);
  assert.strictEqual(unSub1Called, true, 'Unsubscribe 1 must be called');
  assert.strictEqual(unSub2Called, true, 'Unsubscribe 2 must be called');

  // Dispose non-existent returns 0
  const disposeEmpty = MemoryHeapAndVirtualizationGovernor.disposeAccountScope('acc_user_999');
  assert.strictEqual(disposeEmpty.disposedCount, 0);
  console.log('  ✅ Account subscription scope lifecycle passed');
}

// 2. Compositor Occlusion & Timeline Suspension (Telegram-iOS #2383)
{
  console.log('  Testing compositor occlusion when Mini App sheet is open...');
  const occludedState = MemoryHeapAndVirtualizationGovernor.evaluateCompositorOcclusion(
    true,
    'mini-app-sheet-game',
    true // Sheet fully covers chat
  );
  assert.strictEqual(occludedState.isChatTimelineSuspended, true);
  assert.strictEqual(occludedState.shouldPauseBackgroundRaf, true);
  assert.strictEqual(occludedState.activeSheetId, 'mini-app-sheet-game');

  const regularState = MemoryHeapAndVirtualizationGovernor.evaluateCompositorOcclusion(
    false,
    null,
    false
  );
  assert.strictEqual(regularState.isChatTimelineSuspended, false);
  assert.strictEqual(regularState.shouldPauseBackgroundRaf, false);
  console.log('  ✅ Compositor occlusion evaluation passed');
}

// 3. Generational Buffer Pool & Double-Free Prevention (AyuGram #314)
{
  console.log('  Testing buffer pool generational tracking & anti-double-free...');
  const buf = MemoryHeapAndVirtualizationGovernor.acquireBuffer(1024 * 1024); // 1MB buffer
  assert.strictEqual(buf.inUse, true);
  assert.ok(buf.generation > 0);

  // Normal release
  const release1 = MemoryHeapAndVirtualizationGovernor.releaseBufferSafely(buf);
  assert.strictEqual(release1.success, true);

  // Double release attempt -> must be safely intercepted without crashing
  const release2 = MemoryHeapAndVirtualizationGovernor.releaseBufferSafely(buf);
  assert.strictEqual(release2.success, false);
  assert.ok(release2.error?.includes('Double free'), 'Must prevent double-free');
  console.log('  ✅ Anti-double-free buffer pool passed');
}

// 4. Iterative Reply Thread Traversal & Anti-Stack-Smashing (tdesktop #16673)
{
  console.log('  Testing iterative reply thread traversal on deep message chains...');
  const store = new Map();

  // Create deep chain: 1000 -> 999 -> 998 -> ... -> 1
  for (let i = 1; i <= 300; i++) {
    store.set(i, {
      id: i,
      replyToMsgId: i > 1 ? i - 1 : undefined,
      text: `Message ${i}`
    });
  }

  // Traversal must complete iteratively without recursion or stack smashing
  const result = MemoryHeapAndVirtualizationGovernor.traverseReplyThreadSafely(300, store, 150);
  assert.strictEqual(result.hasCycle, false);
  assert.strictEqual(result.depthReached, 150, 'Must respect maxDepth clamp');
  assert.strictEqual(result.chain[0], 300);
  assert.strictEqual(result.chain[1], 299);

  // Circular reply reference test
  store.set(500, { id: 500, replyToMsgId: 501, text: 'A' });
  store.set(501, { id: 501, replyToMsgId: 500, text: 'B' }); // Loop!
  const cycleResult = MemoryHeapAndVirtualizationGovernor.traverseReplyThreadSafely(500, store, 50);
  assert.strictEqual(cycleResult.hasCycle, true, 'Must detect reply cycle');
  console.log('  ✅ Iterative thread traversal passed');
}

// 5. Shared Synchronized Emoji Animation Clock (Unigram #1692)
{
  console.log('  Testing synchronized emoji animation clock...');
  // 30fps animation, 60 frames total (2000ms loop)
  const frame1 = MemoryHeapAndVirtualizationGovernor.computeSynchronizedEmojiFrame(0, 30, 60);
  assert.strictEqual(frame1.currentFrame, 0);

  const frame2 = MemoryHeapAndVirtualizationGovernor.computeSynchronizedEmojiFrame(1000, 30, 60); // 1 sec elapsed
  assert.strictEqual(frame2.currentFrame, 30); // 30 frames in 1s

  const frame3 = MemoryHeapAndVirtualizationGovernor.computeSynchronizedEmojiFrame(2000, 30, 60); // exactly at cycle
  assert.strictEqual(frame3.currentFrame, 0); // wrapped
  console.log('  ✅ Synchronized emoji clock passed');
}

console.log('\n🎉 ALL Phase 28 verification checks passed green!');
