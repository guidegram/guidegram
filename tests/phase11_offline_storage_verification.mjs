import assert from 'node:assert';
import {
  StorageUsageAndDeepPurgeManager,
  SavedMessagesSublistGuard,
  OfflineChatExporter,
  OptimisticOutboxManager,
} from '../src/services/offlineStorageAndExportManager.ts';

function runTests() {
  console.log('[Phase 11 Verification] Starting tests...');

  // --- Test 1: StorageUsageAndDeepPurgeManager (#1587) ---
  const storageMgr = new StorageUsageAndDeepPurgeManager();
  storageMgr.recordSize('media', 50000);
  storageMgr.recordSize('stickers', 15000);
  storageMgr.recordSize('database', 20000);
  storageMgr.recordSize('cache', 35000);

  const breakdown = storageMgr.getBreakdown();
  assert.strictEqual(breakdown.mediaBytes, 50000);
  assert.strictEqual(breakdown.totalBytes, 120000);

  // Deep purge media
  const purgeRes = storageMgr.deepPurgeCategory('media', () => 50000);
  assert.strictEqual(purgeRes.success, true);
  assert.strictEqual(purgeRes.purgedBytes, 50000);
  assert.strictEqual(storageMgr.getBreakdown().mediaBytes, 0);
  assert.strictEqual(storageMgr.getBreakdown().totalBytes, 70000);
  console.log('✓ Test 1: StorageUsageAndDeepPurgeManager passed');

  // --- Test 2: SavedMessagesSublistGuard (#31448) ---
  // Dangerous inputs that previously triggered null pointer SIGSEGV in tdesktop
  const rawItems = [
    null,
    undefined,
    {}, // empty object with no peerId or id
    { id: 101, text: 'Remember to deploy', peerId: 12345, senderName: 'Me' },
    { id: 102, action: { _: 'messageActionPinMessage' }, peerId: 12345, isService: true },
    'random string junk',
  ];

  const sanitized = SavedMessagesSublistGuard.sanitizeSavedSublist(rawItems);
  assert.strictEqual(sanitized.length, 2, 'Must safely discard corrupted or null items');
  assert.strictEqual(sanitized[0].id, 101);
  assert.strictEqual(sanitized[0].isService, false);
  assert.strictEqual(sanitized[1].id, 102);
  assert.strictEqual(sanitized[1].isService, true);
  console.log('✓ Test 2: SavedMessagesSublistGuard passed');

  // --- Test 3: OfflineChatExporter (#126) ---
  const exportJson = OfflineChatExporter.exportToJson('Guidegram Core Team', sanitized);
  const parsed = JSON.parse(exportJson);
  assert.strictEqual(parsed.chatTitle, 'Guidegram Core Team');
  assert.strictEqual(parsed.totalMessages, 2);

  const exportMd = OfflineChatExporter.exportToMarkdown('Guidegram Core Team', sanitized);
  assert.ok(exportMd.includes('# Chat Export: Guidegram Core Team'));
  assert.ok(exportMd.includes('Remember to deploy'));
  console.log('✓ Test 3: OfflineChatExporter passed');

  // --- Test 4: OptimisticOutboxManager ---
  const outbox = new OptimisticOutboxManager();
  const queued = outbox.enqueueMessage(12345, 'Hello world while offline');
  assert.strictEqual(queued.status, 'pending');
  assert.ok(queued.tempId.startsWith('temp_'));

  assert.strictEqual(outbox.getPendingMessages().length, 1);

  // Network reconnects and server gives permanent ID
  const reconciled = outbox.reconcileSentMessage(queued.tempId, 999888);
  assert.strictEqual(reconciled, true);
  assert.strictEqual(outbox.getPendingMessages().length, 0);

  const cleared = outbox.clearSent();
  assert.strictEqual(cleared, 1);
  console.log('✓ Test 4: OptimisticOutboxManager passed');

  console.log('[Phase 11 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
