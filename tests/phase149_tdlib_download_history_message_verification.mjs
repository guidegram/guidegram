import assert from 'node:assert/strict';
import { TdlibFileDownloadHistoryAndMessageGovernor } from '../src/services/tdlibFileDownloadHistoryAndMessageGovernor.ts';

console.log('🧪 Starting Phase 149: TDLib Parallel Download, History Offset, Viewport Sync, Buffer GC & Delete Updates Tests...\n');

const governor = new TdlibFileDownloadHistoryAndMessageGovernor();

// ============================================================================
// 1. tdlib/td#1068 & #3470 - Parallel Chunked File Downloads & Premium
// ============================================================================
console.log('👉 Testing Case 1: Parallel Chunked Download Plan (tdlib/td#1068, #3470)...');
const fileBytes = 5 * 1024 * 1024; // 5 MB

// Basic user: 512KB chunks, concurrency = 3
const basicPlan = governor.createParallelDownloadPlan(fileBytes, false);
assert.equal(basicPlan.isPremium, false);
assert.equal(basicPlan.chunkSize, 512 * 1024);
assert.equal(basicPlan.concurrency, 3);
assert.equal(basicPlan.chunks.length, 10); // 5MB / 512KB = 10 chunks

// Premium user: 1MB chunks, concurrency = 8
const premiumPlan = governor.createParallelDownloadPlan(fileBytes, true);
assert.equal(premiumPlan.isPremium, true);
assert.equal(premiumPlan.chunkSize, 1024 * 1024);
assert.equal(premiumPlan.concurrency, 8);
assert.equal(premiumPlan.chunks.length, 5); // 5MB / 1MB = 5 chunks
console.log('✅ Case 1 passed: Multi-part parallel download plan scales with Premium.\n');

// ============================================================================
// 2. tdlib/td#1668 - Channel Latency & OpenChat Viewport Sync
// ============================================================================
console.log('👉 Testing Case 2: OpenChat Viewport Sync (tdlib/td#1668)...');
const sync1 = governor.syncChatViewport(1001);
assert.equal(sync1.activeChatOpened, 1001);
assert.equal(sync1.previousChatClosed, null);

const sync2 = governor.syncChatViewport(1002);
assert.equal(sync2.activeChatOpened, 1002);
assert.equal(sync2.previousChatClosed, 1001);
assert.equal(governor.getActiveOpenChatId(), 1002);
console.log('✅ Case 2 passed: Viewport synchronization closes inactive chats to reduce latency.\n');

// ============================================================================
// 3. tdlib/td#702 - getChatHistory Offset Calculation & Pagination Gap
// ============================================================================
console.log('👉 Testing Case 3: getChatHistory Offset Calculation (tdlib/td#702)...');
const olderQuery = governor.buildGetChatHistoryQuery(500, 42, 'older', 20);
assert.equal(olderQuery['@type'], 'getChatHistory');
assert.equal(olderQuery.from_message_id, 42);
assert.equal(olderQuery.offset, 0);
assert.equal(olderQuery.limit, 20);

const newerQuery = governor.buildGetChatHistoryQuery(500, 42, 'newer', 20);
assert.equal(newerQuery.offset, -20);

const aroundQuery = governor.buildGetChatHistoryQuery(500, 42, 'around', 20);
assert.equal(aroundQuery.offset, -10);
console.log('✅ Case 3 passed: fromMessageId pagination offsets correctly calculated.\n');

// ============================================================================
// 4. tdlib/td#148 - Message Memory Deallocation & Decrypted Buffer GC
// ============================================================================
console.log('👉 Testing Case 4: Message Buffer Garbage Collection (tdlib/td#148)...');
const messages = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  chatId: 500,
  date: 1000 + i,
  text: `Message ${i + 1}`,
  heavyMediaBuffer: new Uint8Array(1024 * 10), // 10KB
}));

// Visible range is messages 40 to 60 with margin of 10 (range 30 to 70 is safe)
const gcResult = governor.reclaimOffscreenMessageMemory(messages, { startIndex: 40, endIndex: 60 }, 10);
assert.equal(gcResult.purgedCount, 59); // 30 before (0..29) + 29 after (71..99) = 59 messages outside margin
assert.ok(gcResult.reclaimedBytes > 0);
assert.equal(messages[0].heavyMediaBuffer, null); // Reclaimed
assert.ok(messages[45].heavyMediaBuffer !== null); // In visible window, preserved
console.log('✅ Case 4 passed: Offscreen media buffers deallocated to reclaim memory.\n');

// ============================================================================
// 5. tdlib/td#692 - Strict @type JSON Injection
// ============================================================================
console.log('👉 Testing Case 5: Strict @type JSON Injection (tdlib/td#692)...');
const dirtyQuery = {
  chat_id: 12345,
  text: 'Hello world',
  unused: undefined,
  extra_null: null,
};
const cleanQuery = governor.sanitizeTdlibQuery(dirtyQuery, 'sendMessage');
assert.equal(cleanQuery['@type'], 'sendMessage');
assert.equal(cleanQuery.chat_id, 12345);
assert.equal('unused' in cleanQuery, false);
assert.equal('extra_null' in cleanQuery, false);
console.log('✅ Case 5 passed: Outgoing TDLib queries injected with strict @type and sanitized.\n');

// ============================================================================
// 6. tdlib/td#464 - UpdateFile Event Dispatcher
// ============================================================================
console.log('👉 Testing Case 6: UpdateFile Event Listener (tdlib/td#464)...');
let receivedPercent = 0;
governor.registerFileProgressListener(999, (evt) => {
  receivedPercent = evt.percent;
});

const progressEvt = {
  id: 999,
  size: 1000,
  expected_size: 1000,
  downloaded_prefix_size: 650,
  is_downloading_active: true,
  is_downloading_completed: false,
};
const resProgress = governor.handleUpdateFile(progressEvt);
assert.equal(resProgress.percent, 65);
assert.equal(receivedPercent, 65);

const completedEvt = {
  id: 999,
  size: 1000,
  expected_size: 1000,
  downloaded_prefix_size: 1000,
  is_downloading_active: false,
  is_downloading_completed: true,
};
const resCompleted = governor.handleUpdateFile(completedEvt);
assert.equal(resCompleted.percent, 100);
assert.equal(resCompleted.isComplete, true);
console.log('✅ Case 6 passed: UpdateFile progress broadcast and completion listener verified.\n');

// ============================================================================
// 7. tdlib/td#366 - updateDeleteMessages Cache Invalidation
// ============================================================================
console.log('👉 Testing Case 7: updateDeleteMessages Local Cache Cleanup (tdlib/td#366)...');
const cache = new Map([
  [1, { id: 1, chatId: 777, text: 'Keep me' }],
  [2, { id: 2, chatId: 777, text: 'Delete me 1' }],
  [3, { id: 3, chatId: 777, text: 'Delete me 2' }],
  [4, { id: 4, chatId: 888, text: 'Other chat' }],
]);

const delResult = governor.handleDeleteMessages(777, [2, 3], cache);
assert.equal(delResult.deletedCount, 2);
assert.equal(delResult.remainingCount, 2);
assert.equal(cache.has(2), false);
assert.equal(cache.has(3), false);
assert.equal(cache.has(1), true);
assert.equal(cache.has(4), true);
console.log('✅ Case 7 passed: Deleted messages purged cleanly from local cache.\n');

console.log('🎉 ALL 7 PHASE 149 HARDENING TESTS PASSED WITH 100% SUCCESS!');
