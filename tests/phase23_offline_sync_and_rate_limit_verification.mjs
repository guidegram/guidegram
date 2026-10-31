import assert from 'node:assert';
import {
  LocalDraftPrivacyAndSyncGovernor,
  OfflineEntityCacheManager,
  FloodWaitAndRateLimitParser,
  LocalOfflineChannelArchiveViewer,
} from '../src/services/offlineSyncAndRateLimitGovernor.ts';

function runTests() {
  console.log('[Phase 23 Verification] Starting tests...');

  // --- Test 1: LocalDraftPrivacyAndSyncGovernor (#486) ---
  const draftGov = new LocalDraftPrivacyAndSyncGovernor(true);
  const draft1 = draftGov.saveLocalDraft('chat_1', 'Hello world');
  assert.strictEqual(draft1.isCloudSyncPermitted, true);

  // Mark chat_2 as local-only
  draftGov.setPeerLocalOnly('chat_2', true);
  const draft2 = draftGov.saveLocalDraft('chat_2', 'Private note');
  assert.strictEqual(draft2.isCloudSyncPermitted, false, 'Peer marked local-only must never sync to cloud (#486)');

  // Disable cloud sync globally
  draftGov.setCloudSyncEnabled(false);
  const draft3 = draftGov.saveLocalDraft('chat_1', 'Updated text');
  assert.strictEqual(draft3.isCloudSyncPermitted, false);
  console.log('✓ Test 1: LocalDraftPrivacyAndSyncGovernor passed');

  // --- Test 2: OfflineEntityCacheManager (#378, #375) ---
  const entityCache = new OfflineEntityCacheManager();
  const mockMembers = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
  entityCache.setCachedMembers('channel_100', mockMembers);

  // Online request
  const onlineRes = entityCache.getMembersWithOfflineFallback('channel_100', true);
  assert.strictEqual(onlineRes.members.length, 2);
  assert.strictEqual(onlineRes.isOfflineSnapshot, false);

  // Offline request
  const offlineRes = entityCache.getMembersWithOfflineFallback('channel_100', false);
  assert.strictEqual(offlineRes.members.length, 2);
  assert.strictEqual(offlineRes.isOfflineSnapshot, true, 'Offline request must flag isOfflineSnapshot: true (#378)');

  // Contacts offline fallback
  entityCache.setCachedContacts([{ id: 10, name: 'Charlie' }]);
  const contactsOffline = entityCache.getContactsWithOfflineFallback(false);
  assert.strictEqual(contactsOffline.contacts.length, 1);
  assert.strictEqual(contactsOffline.isOfflineSnapshot, true);
  console.log('✓ Test 2: OfflineEntityCacheManager passed');

  // --- Test 3: FloodWaitAndRateLimitParser (#682) ---
  const floodParser = new FloodWaitAndRateLimitParser();

  // Pattern 1: FLOOD_WAIT_45
  const res1 = floodParser.parseFloodWaitError('RPCError: 420 FLOOD_WAIT_45');
  assert.strictEqual(res1.isRateLimited, true);
  assert.strictEqual(res1.retryAfterSec, 45);

  // Pattern 2: TDLib {"code":429,"message":"Too Many Requests: retry after 86400"}
  const tdlibError = { code: 429, message: 'Too Many Requests: retry after 86400' };
  const res2 = floodParser.parseFloodWaitError(tdlibError);
  assert.strictEqual(res2.isRateLimited, true);
  assert.strictEqual(res2.retryAfterSec, 86400);

  // Action lock test
  floodParser.registerRateLimit('send_channel_msg', 10);
  assert.strictEqual(floodParser.isActionBlocked('send_channel_msg', Date.now()), true);
  assert.strictEqual(floodParser.isActionBlocked('send_channel_msg', Date.now() + 15000), false);
  console.log('✓ Test 3: FloodWaitAndRateLimitParser passed');

  // --- Test 4: LocalOfflineChannelArchiveViewer (#512) ---
  const archiveViewer = new LocalOfflineChannelArchiveViewer();
  const messages = [
    { id: 1, text: 'Important announcement' },
    { id: 2, text: 'Community rules' },
  ];
  archiveViewer.saveChannelSnapshot('banned_channel_99', messages);

  const archive = archiveViewer.getChannelArchive('banned_channel_99');
  assert.strictEqual(archive.available, true);
  assert.strictEqual(archive.messages.length, 2);
  assert.strictEqual(archive.isReadOnly, true, 'Offline channel archive must be strictly read-only (#512)');
  console.log('✓ Test 4: LocalOfflineChannelArchiveViewer passed');

  console.log('[Phase 23 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
