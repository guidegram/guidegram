import assert from 'node:assert';
import {
  CrashAndOutOfMemoryGuard,
  HeapAndWorkerThrottleManager,
  SessionAuthCacheGuard,
  VirtualizedEmojiPaletteCache,
} from '../src/services/heapAndVirtualizationProfiler.ts';

function runTests() {
  console.log('[Phase 10 Verification] Starting tests...');

  // --- Test 1: CrashAndOutOfMemoryGuard (#28201) ---
  const oomGuard = new CrashAndOutOfMemoryGuard(100); // 100 MB limit
  let tier1Executed = false;
  let tier2Executed = false;

  oomGuard.registerTier1Cleanup(() => {
    tier1Executed = true;
  });
  oomGuard.registerTier2Cleanup(() => {
    tier2Executed = true;
  });

  // Normal usage: 50MB / 100MB (50%)
  const evalNormal = oomGuard.evaluateMemoryPressure(50 * 1024 * 1024);
  assert.strictEqual(evalNormal.level, 'normal');
  assert.strictEqual(tier1Executed, false);
  assert.strictEqual(tier2Executed, false);

  // Moderate usage: 80MB / 100MB (80%) -> Tier 1 cleanup
  const evalMod = oomGuard.evaluateMemoryPressure(80 * 1024 * 1024);
  assert.strictEqual(evalMod.level, 'moderate');
  assert.strictEqual(tier1Executed, true);
  assert.strictEqual(tier2Executed, false);

  // Reset flags
  tier1Executed = false;

  // Critical usage: 95MB / 100MB (95%) -> Tier 1 & 2 cleanup
  const evalCrit = oomGuard.evaluateMemoryPressure(95 * 1024 * 1024);
  assert.strictEqual(evalCrit.level, 'critical');
  assert.strictEqual(tier1Executed, true);
  assert.strictEqual(tier2Executed, true);
  console.log('✓ Test 1: CrashAndOutOfMemoryGuard passed');

  // --- Test 2: HeapAndWorkerThrottleManager (#30504) ---
  const workerMgr = new HeapAndWorkerThrottleManager();
  assert.strictEqual(workerMgr.getAiEditorEnabled(), true);

  // Disable experimental AI editor
  workerMgr.setAiEditorEnabled(false);
  assert.strictEqual(workerMgr.getAiEditorEnabled(), false);

  workerMgr.registerWorker('parser_worker_1');
  workerMgr.registerWorker('syntax_worker_2');
  const throttled = workerMgr.throttleBackgroundWorkers();
  assert.strictEqual(throttled.suspendedCount, 2);
  console.log('✓ Test 2: HeapAndWorkerThrottleManager passed');

  // --- Test 3: SessionAuthCacheGuard (#960) ---
  const sessionGuard = new SessionAuthCacheGuard(3600 * 1000);
  sessionGuard.saveSession('secret_auth_token_xyz');

  const sess = sessionGuard.getSession();
  assert.strictEqual(sess?.isValid, true);
  assert.strictEqual(sess?.token, 'secret_auth_token_xyz');

  sessionGuard.touchSession();
  assert.ok(sess.lastValidatedAt > 0);

  sessionGuard.invalidate();
  assert.strictEqual(sessionGuard.getSession(), null);
  console.log('✓ Test 3: SessionAuthCacheGuard passed');

  // --- Test 4: VirtualizedEmojiPaletteCache (#2886) ---
  const emojis = Array.from({ length: 1500 }, (_, i) => `emoji_${i}`);
  const palette = new VirtualizedEmojiPaletteCache(emojis, 64);

  // At top (scrollTop = 0)
  const windowTop = palette.getWindow(0, 40, 8);
  assert.strictEqual(windowTop.startIndex, 0);
  assert.ok(windowTop.visibleItems.length <= 80, 'Must only render small window, not 1500 elements');
  assert.strictEqual(windowTop.totalCount, 1500);

  // Scrolled down (scrollTop = 400px -> row 10)
  const windowScrolled = palette.getWindow(400, 40, 8);
  assert.ok(windowScrolled.startIndex >= 64, 'Start index must advance with scroll');
  assert.ok(windowScrolled.visibleItems.length <= 80);
  console.log('✓ Test 4: VirtualizedEmojiPaletteCache passed');

  console.log('[Phase 10 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
