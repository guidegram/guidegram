import assert from 'node:assert/strict';
import { WebCrossChatStorageDpiAndParticipantsGovernor } from '../src/services/webCrossChatStorageDpiAndParticipantsGovernor.ts';

console.log('🧪 Starting Phase 146: Group Migration, HiDPI, Participants, Storage, Notification Dedupe, Intl & Cross-Chat Reply Tests...\n');

const governor = new WebCrossChatStorageDpiAndParticipantsGovernor();

// ============================================================================
// 1. Ajaxy/telegram-tt#447 - Group-to-Supergroup Migration Routing
// ============================================================================
console.log('👉 Testing Case 1: Group Migration Routing (Ajaxy/telegram-tt#447)...');
governor.registerGroupMigration(-5001, -1001234567890, 4200);

const unmigrated = governor.resolveActiveChatPeer(-9999);
assert.equal(unmigrated.isMigrated, false);
assert.equal(unmigrated.effectiveChatId, -9999);

const migrated = governor.resolveActiveChatPeer(-5001);
assert.equal(migrated.isMigrated, true);
assert.equal(migrated.effectiveChatId, -1001234567890);
assert.equal(migrated.migrationDetails.maxMessageId, 4200);
console.log('✅ Case 1 passed: Migrated groups route seamlessly to supergroups.\n');

// ============================================================================
// 2. Ajaxy/telegram-tt#440 - HiDPI Canvas Scaling & Razor-Sharp Rendering
// ============================================================================
console.log('👉 Testing Case 2: HiDPI Canvas Scaling (Ajaxy/telegram-tt#440)...');
const metricsRetina = governor.calculateHiDpiCanvasMetrics(800, 600, 2.0);
assert.equal(metricsRetina.logicalWidth, 800);
assert.equal(metricsRetina.logicalHeight, 600);
assert.equal(metricsRetina.physicalWidth, 1600);
assert.equal(metricsRetina.physicalHeight, 1200);
assert.equal(metricsRetina.cssStyle.width, '800px');
assert.equal(metricsRetina.cssStyle.height, '600px');

// Excessive DPR clamped to 3.0 to protect GPU VRAM
const metricsClamped = governor.calculateHiDpiCanvasMetrics(800, 600, 4.5);
assert.equal(metricsClamped.dpr, 3.0);
assert.equal(metricsClamped.physicalWidth, 2400);
console.log('✅ Case 2 passed: HiDPI metrics prevent blurry rendering and clamp VRAM usage.\n');

// ============================================================================
// 3. Ajaxy/telegram-tt#435 - Paginated Participants with Privacy & Flood Backoff
// ============================================================================
console.log('👉 Testing Case 3: Paginated Participants (Ajaxy/telegram-tt#435)...');
// Normal pagination test
const mockFetch = async (offset, limit) => {
  const all = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` }));
  return { items: all.slice(offset, offset + limit) };
};

const result = await governor.fetchParticipantsSafely(100, 40, mockFetch);
assert.equal(result.participants.length, 100);
assert.equal(result.isComplete, true);
assert.equal(result.isHiddenByAdmin, false);

// Hidden by admin test
const mockRestrictedFetch = async () => ({ items: [], isRestricted: true });
const restrictedResult = await governor.fetchParticipantsSafely(100, 50, mockRestrictedFetch);
assert.equal(restrictedResult.isHiddenByAdmin, true);
assert.equal(restrictedResult.participants.length, 0);
console.log('✅ Case 3 passed: Participants pagination and privacy restrictions handled cleanly.\n');

// ============================================================================
// 4. Ajaxy/telegram-tt#421 - Firefox Private Browsing Storage Fallback
// ============================================================================
console.log('👉 Testing Case 4: Firefox Storage Quota Fallback (Ajaxy/telegram-tt#421)...');
assert.equal(governor.getStorageEngineType(), 'indexeddb');

// Simulate IndexedDB lock in Firefox private window
governor.setIndexedDbAvailability(false);
assert.equal(governor.getStorageEngineType(), 'memory');

governor.setStorageItem('auth_token', 'test_token_123');
assert.equal(governor.getStorageItem('auth_token'), 'test_token_123');
governor.removeStorageItem('auth_token');
assert.equal(governor.getStorageItem('auth_token'), null);
console.log('✅ Case 4 passed: In-memory storage fallback prevents crashes in private browsing.\n');

// ============================================================================
// 5. Ajaxy/telegram-tt#393 - Notification Deduplication
// ============================================================================
console.log('👉 Testing Case 5: Notification Deduplication (Ajaxy/telegram-tt#393)...');
const t0 = 100000;
const firstDispatch = governor.shouldDispatchNotification('chat_10', 501, t0, 5000);
assert.equal(firstDispatch, true);

// Same message 1 second later -> suppressed
const dupDispatch = governor.shouldDispatchNotification('chat_10', 501, t0 + 1000, 5000);
assert.equal(dupDispatch, false);

// Different message -> allowed
const diffDispatch = governor.shouldDispatchNotification('chat_10', 502, t0 + 1000, 5000);
assert.equal(diffDispatch, true);

// Same message after TTL (6s later) -> allowed
const expiredDispatch = governor.shouldDispatchNotification('chat_10', 501, t0 + 6000, 5000);
assert.equal(expiredDispatch, true);
console.log('✅ Case 5 passed: Sliding window notification deduplication prevents duplicate popups.\n');

// ============================================================================
// 6. Ajaxy/telegram-tt#371 - Intl.ListFormat WebKit Fallback Polyfill
// ============================================================================
console.log('👉 Testing Case 6: Intl.ListFormat WebKit Polyfill (Ajaxy/telegram-tt#371)...');
const list0 = governor.safeFormatList([]);
assert.equal(list0, '');

const list1 = governor.safeFormatList(['Alice']);
assert.equal(list1, 'Alice');

const list2 = governor.safeFormatList(['Alice', 'Bob']);
assert.ok(list2.includes('Alice') && list2.includes('Bob'));

const list3 = governor.safeFormatList(['Alice', 'Bob', 'Charlie']);
assert.ok(list3.includes('Alice') && list3.includes('Charlie'));
console.log('✅ Case 6 passed: List formatting behaves reliably without breaking older WebKit.\n');

// ============================================================================
// 7. Ajaxy/telegram-tt#353 - Cross-Chat Reply 2.0 Payload Builder
// ============================================================================
console.log('👉 Testing Case 7: Cross-Chat Reply 2.0 (Ajaxy/telegram-tt#353)...');
const replyPayload = governor.buildCrossChatReplyPayload(
  { id: 'channel_news', title: 'Tech News Daily' },
  { id: 998, text: 'Breaking: New major release announced today!', senderName: 'Editor' },
  'direct_user_42'
);

assert.equal(replyPayload.destinationChatId, 'direct_user_42');
assert.equal(replyPayload.sourceChatId, 'channel_news');
assert.equal(replyPayload.sourceChatTitle, 'Tech News Daily');
assert.equal(replyPayload.sourceMessageId, 998);
assert.equal(replyPayload.senderName, 'Editor');

// Disallows cross-chat reply from secret chat
assert.throws(() => {
  governor.buildCrossChatReplyPayload(
    { id: 'secret_chat_1', title: 'Secret Conversation', isSecret: true },
    { id: 1, text: 'Secret note', senderName: 'Bob' },
    'other_chat'
  );
}, /secret chats/);
console.log('✅ Case 7 passed: Cross-chat reply 2.0 payload constructed with security guards.\n');

console.log('🎉 ALL 7 PHASE 146 HARDENING TESTS PASSED WITH 100% SUCCESS!');
