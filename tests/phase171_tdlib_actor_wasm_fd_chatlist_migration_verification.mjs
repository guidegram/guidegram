import assert from 'node:assert/strict';
import {
  ActorMailboxTeardownGovernor,
  WasmFileChunkBoundsGovernor,
  PostAuthSessionHandoverGovernor,
  FileDescriptorPoolGovernor,
  MainChatListPositionGovernor,
  GroupUpgradeHistoryBridgingGovernor,
  DynamicStorageRelocationGovernor
} from '../src/services/tdlibActorWasmFdChatListAndMigrationGovernor.ts';

console.log('🧪 Starting Phase 171 Verification: TDLib Actor, WASM Bounds, FD Pool, Chat List & Migration Hardening...');

// -------------------------------------------------------------
// Test 1: ActorMailboxTeardownGovernor (Resolves #3437)
// -------------------------------------------------------------
console.log('  Testing #3437: Actor Mailbox Teardown & Check mailbox_.empty() Guard...');
const actorGov = new ActorMailboxTeardownGovernor();

actorGov.postMessage({ id: 'msg_1', targetActorId: 'net_worker_1', payload: 'ping', status: 'pending' });
actorGov.postMessage({ id: 'msg_2', targetActorId: 'db_worker_1', payload: 'query', status: 'pending' });

const teardownRes = actorGov.drainAndTeardown();
assert.equal(teardownRes.mailboxEmpty, true);
assert.equal(teardownRes.drainedCount, 2);
assert.equal(teardownRes.cancelledCount, 2);
assert.equal(teardownRes.teardownSafe, true);

// Once teardown initiated, rejecting incoming messages
const postAfterTeardown = actorGov.postMessage({ id: 'msg_3', targetActorId: 'net_worker_1', payload: 'test', status: 'pending' });
assert.equal(postAfterTeardown, false);
console.log('  ✅ #3437 Verified: Actor mailbox completely drained before destruction.');

// -------------------------------------------------------------
// Test 2: WasmFileChunkBoundsGovernor (Resolves #3411)
// -------------------------------------------------------------
console.log('  Testing #3411: WASM File Chunk Bounds & Out-of-Bounds Clamping...');
const wasmGov = new WasmFileChunkBoundsGovernor();

const totalSize = 100000; // 100 KB
const offset = 96000;
const requested = 32768; // 32 KB request -> 96000 + 32768 = 128768 > 100000 (would crash in raw Uint8Array!)

const slice = wasmGov.calculateChunkSlice(totalSize, offset, requested);
assert.equal(slice.isOutOfBounds, false);
assert.equal(slice.clampedCount, 4000); // 100000 - 96000 = 4000
assert.equal(slice.isLastChunk, true);

// Test beyond total size
const outOfBoundsSlice = wasmGov.calculateChunkSlice(totalSize, 105000, 4096);
assert.equal(outOfBoundsSlice.isOutOfBounds, true);
assert.equal(outOfBoundsSlice.clampedCount, 0);
console.log('  ✅ #3411 Verified: WASM file chunk calculations strictly clamped to file bounds.');

// -------------------------------------------------------------
// Test 3: PostAuthSessionHandoverGovernor (Resolves #3351)
// -------------------------------------------------------------
console.log('  Testing #3351: Post-Auth Session Handover & Non-Hanging Ready State...');
const authGov = new PostAuthSessionHandoverGovernor();

const handoverRes = authGov.executeHandoverPipeline();
assert.equal(handoverRes.currentStage, 'ready');
assert.equal(handoverRes.authorizationStateReadyDelivered, true);
assert.equal(handoverRes.isHanging, false);
console.log('  ✅ #3351 Verified: Post-auth session handover delivers authorizationStateReady without hang.');

// -------------------------------------------------------------
// Test 4: FileDescriptorPoolGovernor (Resolves #2538)
// -------------------------------------------------------------
console.log('  Testing #2538: File Descriptor Pool LRU Eviction & EMFILE Prevention...');
const fdGov = new FileDescriptorPoolGovernor(3); // Capacity = 3

const fd1 = fdGov.acquireDescriptor('/files/photo1.jpg');
const fd2 = fdGov.acquireDescriptor('/files/photo2.jpg');
const fd3 = fdGov.acquireDescriptor('/files/photo3.jpg');
assert.equal(fdGov.getOpenCount(), 3);

// Re-accessing fd1 updates its lastAccessTime
fdGov.acquireDescriptor('/files/photo1.jpg');

// Acquiring fd4 evicts oldest (fd2)
const fd4 = fdGov.acquireDescriptor('/files/photo4.jpg');
assert.equal(fdGov.getOpenCount(), 3);
assert.equal(fd2.isOpen, false);
console.log('  ✅ #2538 Verified: FD pool evicts LRU handles, preventing EMFILE descriptor exhaustion.');

// -------------------------------------------------------------
// Test 5: MainChatListPositionGovernor (Resolves #2430)
// -------------------------------------------------------------
console.log('  Testing #2430: Main Chat List Pin & Order Key Sorting...');
const chatGov = new MainChatListPositionGovernor();

chatGov.updatePosition({ chatId: 'c1', order: 1000n, isPinned: false, chatList: 'main' });
chatGov.updatePosition({ chatId: 'c2', order: 500n, isPinned: true, chatList: 'main' }); // Pinned!
chatGov.updatePosition({ chatId: 'c3', order: 2000n, isPinned: false, chatList: 'main' });
chatGov.updatePosition({ chatId: 'c4_archived', order: 9999n, isPinned: false, chatList: 'archive' });

const mainChats = chatGov.getOrderedChatList('main');
assert.equal(mainChats.length, 3);
assert.equal(mainChats[0].chatId, 'c2', 'Pinned chat must be at top regardless of order key');
assert.equal(mainChats[1].chatId, 'c3', 'c3 order 2000 > c1 order 1000');
assert.equal(mainChats[2].chatId, 'c1');
console.log('  ✅ #2430 Verified: Main chat list correctly sorted by pinned status and monotonic order keys.');

// -------------------------------------------------------------
// Test 6: GroupUpgradeHistoryBridgingGovernor (Resolves #1002)
// -------------------------------------------------------------
console.log('  Testing #1002: Seamless Group Upgrade History Bridging...');
const bridgeGov = new GroupUpgradeHistoryBridgingGovernor();

const bridged = bridgeGov.bridgeHistory({
  supergroupId: 'supergroup_100',
  legacyGroupId: 'legacy_group_50',
  supergroupMessages: [
    { id: 2, text: 'Welcome to the upgraded supergroup!' },
    { id: 1, text: 'Channel features now active.' }
  ],
  legacyGroupMessages: [
    { id: 105, text: 'Last message in basic group before upgrade.' },
    { id: 104, text: 'Hello basic group.' }
  ]
});

assert.equal(bridged.length, 4);
assert.equal(bridged[0].isLegacyGroupMessage, false);
assert.equal(bridged[2].isLegacyGroupMessage, true);
assert.equal(bridged[2].chatId, 'supergroup_100', 'Legacy messages mapped seamlessly to supergroup view');
console.log('  ✅ #1002 Verified: Group upgrade history stitched seamlessly across migration boundary.');

// -------------------------------------------------------------
// Test 7: DynamicStorageRelocationGovernor (Resolves #380)
// -------------------------------------------------------------
console.log('  Testing #380: Dynamic Storage Relocation without TDLib Restart...');
const storageGov = new DynamicStorageRelocationGovernor('/internal_storage/tdlib');

const moveRes = storageGov.relocateStorage('/sdcard/Android/data/org.guidegram/files', 142);
assert.equal(moveRes.success, true);
assert.equal(moveRes.oldPath, '/internal_storage/tdlib');
assert.equal(moveRes.newPath, '/sdcard/Android/data/org.guidegram/files');
assert.equal(moveRes.relocatedFileCount, 142);
assert.equal(moveRes.requiresRestart, false);
assert.equal(storageGov.getCurrentPath(), '/sdcard/Android/data/org.guidegram/files');
console.log('  ✅ #380 Verified: Storage relocation executed at runtime without client restart.');

console.log('\n🎉 ALL 7 TDLIB HARDENING TESTS PASSED WITH 100% SUCCESS!');
