import assert from 'node:assert/strict';
import { ProcessPriorityAndStorageEncryptionGuard } from '../src/services/processPriorityAndStorageEncryptionGuard.ts';

console.log('🧪 Starting Phase 34 Process Priority & Storage Encryption Verification Suite...');

// 1. Thread Priority Fallback without Admin Privileges (tdesktop #16189)
{
  console.log('  Testing thread priority fallback...');
  const resNonAdmin = ProcessPriorityAndStorageEncryptionGuard.resolveSafeThreadPriority('realtime', false);
  assert.strictEqual(resNonAdmin.appliedPriority, 'high');
  assert.strictEqual(resNonAdmin.fallbackUsed, true);
  assert.ok(resNonAdmin.reason.includes('CAP_SYS_NICE'));

  const resAdmin = ProcessPriorityAndStorageEncryptionGuard.resolveSafeThreadPriority('realtime', true);
  assert.strictEqual(resAdmin.appliedPriority, 'high');
  assert.strictEqual(resAdmin.fallbackUsed, false);
  console.log('  ✅ Thread priority fallback passed');
}

// 2. Encrypted Home Folder Fallback Redirection (tdesktop #29873)
{
  console.log('  Testing safe data directory resolution on restricted/encrypted FS...');
  // Primary directory writable -> use primary
  const normalRes = ProcessPriorityAndStorageEncryptionGuard.resolveSafeDataDirectory(
    '/home/user/.local/share/guidegram',
    '/tmp/guidegram',
    true
  );
  assert.strictEqual(normalRes.selectedPath, '/home/user/.local/share/guidegram');
  assert.strictEqual(normalRes.isFallback, false);

  // Primary directory encrypted without lock support -> fallback to temp
  const fallbackRes = ProcessPriorityAndStorageEncryptionGuard.resolveSafeDataDirectory(
    '/home/user/.local/share/guidegram',
    '/tmp/guidegram',
    false
  );
  assert.strictEqual(fallbackRes.selectedPath, '/tmp/guidegram');
  assert.strictEqual(fallbackRes.isFallback, true);
  assert.ok(fallbackRes.warning?.includes('restricted or encrypted'));
  console.log('  ✅ Safe directory fallback passed');
}

// 3. Audio Notification Player Fallback (tdesktop #7144)
{
  console.log('  Testing sound player fallback when native libcanberra is missing...');
  const native = ProcessPriorityAndStorageEncryptionGuard.resolveNotificationPlayer(true);
  assert.strictEqual(native.playerType, 'native-canberra');
  assert.strictEqual(native.canPlaySound, true);

  const fallback = ProcessPriorityAndStorageEncryptionGuard.resolveNotificationPlayer(false);
  assert.strictEqual(fallback.playerType, 'webaudio-fallback');
  assert.strictEqual(fallback.canPlaySound, true);
  console.log('  ✅ Notification sound player fallback passed');
}

// 4. Inline Bot Query Result Caching & TTL (tdesktop #4580)
{
  console.log('  Testing inline bot result caching & LRU/TTL...');
  const items = [
    { id: '1', type: 'photo', thumbUrl: 'https://example.com/p1.jpg' },
    { id: '2', type: 'photo', thumbUrl: 'https://example.com/p2.jpg' }
  ];

  ProcessPriorityAndStorageEncryptionGuard.cacheInlineResults('query_cats', items, 300);
  const cached = ProcessPriorityAndStorageEncryptionGuard.getCachedInlineResults('query_cats');
  assert.strictEqual(cached?.length, 2);
  assert.strictEqual(cached[0].id, '1');

  // Non-existent key
  assert.strictEqual(ProcessPriorityAndStorageEncryptionGuard.getCachedInlineResults('query_dogs'), null);
  console.log('  ✅ Inline bot query caching passed');
}

// 5. Key Exchange Exponential Backoff Retry (tdesktop #27365)
{
  console.log('  Testing secret chat key exchange handshake backoff...');
  const initialState = {
    chatId: 100,
    stage: 'init',
    attempts: 0,
    maxAttempts: 3
  };

  // Attempt 1 fails
  const step1 = ProcessPriorityAndStorageEncryptionGuard.stepKeyExchange(initialState, false);
  assert.strictEqual(step1.nextState.attempts, 1);
  assert.strictEqual(step1.nextState.stage, 'waiting_response');
  assert.strictEqual(step1.backoffDelayMs, 500); // 500 * 2^0
  assert.strictEqual(step1.canRetry, true);

  // Attempt 2 succeeds
  const step2 = ProcessPriorityAndStorageEncryptionGuard.stepKeyExchange(step1.nextState, true, 'fingerprint_abc123');
  assert.strictEqual(step2.nextState.stage, 'completed');
  assert.strictEqual(step2.nextState.authKeyFingerprint, 'fingerprint_abc123');
  assert.strictEqual(step2.canRetry, false);
  console.log('  ✅ Key exchange retry backoff passed');
}

console.log('\n🎉 ALL Phase 34 verification checks passed green!');
