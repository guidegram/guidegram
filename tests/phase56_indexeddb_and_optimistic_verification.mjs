import assert from 'node:assert/strict';
import { IndexedDbAndOptimisticReconciliationGovernor } from '../src/services/indexedDbAndOptimisticReconciliationGovernor.ts';

console.log('🧪 Starting Phase 56 IndexedDB, Session Keepalive & Optimistic Reconciliation Verification Suite...');

// 1. Empty IndexedDB / Valid Auth Session Auto-Hydration (telegram-tt #491)
{
  console.log('  Testing cold-start session hydration decisions...');
  // Valid auth token exists, but cached dialog count is 0 (empty IndexedDB) -> bootstrap cloud
  const decision1 = IndexedDbAndOptimisticReconciliationGovernor.evaluateSessionHydration(true, 0);
  assert.strictEqual(decision1.canProceedToApp, true);
  assert.strictEqual(decision1.needsCloudBootstrap, true);
  assert.strictEqual(decision1.action, 'bootstrap_cloud_data');

  // Valid auth token and cached data exists -> normal render
  const decision2 = IndexedDbAndOptimisticReconciliationGovernor.evaluateSessionHydration(true, 25);
  assert.strictEqual(decision2.canProceedToApp, true);
  assert.strictEqual(decision2.needsCloudBootstrap, false);
  assert.strictEqual(decision2.action, 'render_normal');

  // No auth token -> redirect to login
  const decision3 = IndexedDbAndOptimisticReconciliationGovernor.evaluateSessionHydration(false, 0);
  assert.strictEqual(decision3.canProceedToApp, false);
  assert.strictEqual(decision3.action, 'redirect_login');
  console.log('  ✅ Session hydration decision verified');
}

// 2. Token Keepalive Refresh (telegram-tt #389)
{
  console.log('  Testing session token keepalive refresh calculation...');
  const t0 = 1000;
  const tExpiry = 2000; // 1000s duration, threshold 75% = t0 + 750 = 1750

  // At t = 1500 (50% elapsed) -> do not refresh yet
  assert.strictEqual(IndexedDbAndOptimisticReconciliationGovernor.shouldRefreshToken(t0, tExpiry, 1500), false);

  // At t = 1800 (80% elapsed) -> refresh required
  assert.strictEqual(IndexedDbAndOptimisticReconciliationGovernor.shouldRefreshToken(t0, tExpiry, 1800), true);

  // Expired token
  assert.strictEqual(IndexedDbAndOptimisticReconciliationGovernor.shouldRefreshToken(t0, tExpiry, 2100), true);
  console.log('  ✅ Token keepalive refresh verified');
}

// 3. Cross-Device Monotonic Read State (Unigram #547)
{
  console.log('  Testing monotonic cross-device read state reconciliation...');
  const current = {
    chatId: 'chat_123',
    readInboxMaxId: 100,
    readOutboxMaxId: 50,
    unreadCount: 10
  };

  // Stale packet arrives with lower message ID (readInboxMaxId: 90) -> must be ignored
  const staleUpdate = { readInboxMaxId: 90 };
  const res1 = IndexedDbAndOptimisticReconciliationGovernor.reconcileMonotonicReadState(current, staleUpdate);
  assert.strictEqual(res1.readInboxMaxId, 100);

  // Forward packet arrives (readInboxMaxId: 105) -> advance max ID and decrease unread
  const forwardUpdate = { readInboxMaxId: 105 };
  const res2 = IndexedDbAndOptimisticReconciliationGovernor.reconcileMonotonicReadState(current, forwardUpdate);
  assert.strictEqual(res2.readInboxMaxId, 105);
  assert.strictEqual(res2.unreadCount, 5);
  console.log('  ✅ Monotonic read state reconciliation verified');
}

// 4. Stuck Upload Progress Watchdog (tdesktop #31277)
{
  console.log('  Testing stuck upload progress watchdog...');
  const now = 100000;
  const activeUpload = {
    uploadId: 'up_video_01',
    bytesUploaded: 500000,
    totalBytes: 5000000,
    lastProgressTimestamp: now - 10000, // 10s ago (< 45s timeout)
    isStuck: false,
    status: 'uploading'
  };

  // 10s progress -> still uploading normally
  const step1 = IndexedDbAndOptimisticReconciliationGovernor.evaluateUploadProgress(activeUpload, now);
  assert.strictEqual(step1.isStuck, false);
  assert.strictEqual(step1.status, 'uploading');

  // Stalled for 50s (> 45s timeout) -> flagged as stuck_retryable
  const stalledUpload = { ...activeUpload, lastProgressTimestamp: now - 50000 };
  const step2 = IndexedDbAndOptimisticReconciliationGovernor.evaluateUploadProgress(stalledUpload, now);
  assert.strictEqual(step2.isStuck, true);
  assert.strictEqual(step2.status, 'stuck_retryable');

  // Fully completed
  const completedUpload = { ...activeUpload, bytesUploaded: 5000000 };
  const step3 = IndexedDbAndOptimisticReconciliationGovernor.evaluateUploadProgress(completedUpload, now);
  assert.strictEqual(step3.status, 'completed');
  assert.strictEqual(step3.isStuck, false);
  console.log('  ✅ Stuck upload watchdog verified');
}

// 5. Safe Download Directory Fallback (tdesktop #8043)
{
  console.log('  Testing safe storage target path resolution...');
  // Target folder writable
  const writable = IndexedDbAndOptimisticReconciliationGovernor.resolveSafeDownloadTarget(true, '/downloads', '/tmp');
  assert.strictEqual(writable.resolvedDirPath, '/downloads');
  assert.strictEqual(writable.isUsingFallback, false);

  // Target folder read-only -> falls back to temp
  const readOnly = IndexedDbAndOptimisticReconciliationGovernor.resolveSafeDownloadTarget(false, '/read_only_dir', '/tmp');
  assert.strictEqual(readOnly.resolvedDirPath, '/tmp');
  assert.strictEqual(readOnly.isUsingFallback, true);
  console.log('  ✅ Safe download directory fallback verified');
}

console.log('✨ All Phase 56 Verification Tests Passed 100% Successfully!');
