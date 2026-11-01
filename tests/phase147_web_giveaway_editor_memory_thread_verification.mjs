import assert from 'node:assert/strict';
import { WebGiveawayEditorMemoryAndThreadGovernor } from '../src/services/webGiveawayEditorMemoryAndThreadGovernor.ts';

console.log('🧪 Starting Phase 147: Stars Giveaway, Message Editor, Memory LRU, Context Slices, Threads & Chunks Tests...\n');

const governor = new WebGiveawayEditorMemoryAndThreadGovernor();

// ============================================================================
// 1. Ajaxy/telegram-tt#415 - Stars Giveaway Configuration Validator
// ============================================================================
console.log('👉 Testing Case 1: Stars Giveaway Configuration (Ajaxy/telegram-tt#415)...');
// Valid configuration
const validGiveaway = governor.validateStarsGiveawayConfig({
  totalStars: 500,
  winnersCount: 5,
  durationDays: 7,
  countries: ['US', 'DE'],
});
assert.equal(validGiveaway.isValid, true);
assert.equal(validGiveaway.starsPerWinner, 100);
assert.equal(validGiveaway.errors.length, 0);

// Invalid: not enough stars per winner (< 50)
const invalidGiveaway = governor.validateStarsGiveawayConfig({
  totalStars: 100,
  winnersCount: 5, // 100 / 5 = 20 < 50
  durationDays: 7,
});
assert.equal(invalidGiveaway.isValid, false);
assert.ok(invalidGiveaway.errors.some((e) => e.includes('at least 50 stars per winner')));
console.log('✅ Case 1 passed: Stars giveaway validation enforces strict economy rules.\n');

// ============================================================================
// 2. Ajaxy/telegram-tt#413 - Message Editor (48h Window vs Saved Messages)
// ============================================================================
console.log('👉 Testing Case 2: Message Editability (Ajaxy/telegram-tt#413)...');
const nowSec = 1700000000;

// Standard chat message sent 1 hour ago (within 48h)
const recentMsg = {
  id: 100,
  date: nowSec - 3600,
  senderId: 42,
  isOutgoing: true,
  isSavedMessages: false,
};
const recentResult = governor.evaluateMessageEditability(recentMsg, 42, nowSec);
assert.equal(recentResult.canEdit, true);
assert.equal(recentResult.canEditCaption, true);
assert.ok(recentResult.remainingEditTimeSeconds > 0);

// Message sent 50 hours ago (exceeds 48h limit)
const oldMsg = {
  id: 101,
  date: nowSec - 50 * 3600,
  senderId: 42,
  isOutgoing: true,
  isSavedMessages: false,
};
const oldResult = governor.evaluateMessageEditability(oldMsg, 42, nowSec);
assert.equal(oldResult.canEdit, false);
assert.equal(oldResult.remainingEditTimeSeconds, 0);

// Saved Messages message sent 1 year ago -> INFINITE EDIT WINDOW!
const savedOldMsg = {
  id: 102,
  date: nowSec - 365 * 86400,
  senderId: 42,
  isOutgoing: true,
  isSavedMessages: true,
};
const savedResult = governor.evaluateMessageEditability(savedOldMsg, 42, nowSec);
assert.equal(savedResult.canEdit, true);
assert.equal(savedResult.remainingEditTimeSeconds, Infinity);
console.log('✅ Case 2 passed: 48-hour edit window and Saved Messages infinite edits verified.\n');

// ============================================================================
// 3. Ajaxy/telegram-tt#400 - Memory Consumption & LRU Blob Cache Reclaimer
// ============================================================================
console.log('👉 Testing Case 3: LRU Blob Cache & Memory Reclaiming (Ajaxy/telegram-tt#400)...');
const revokedUrls = [];
const mockRevoke = (url) => revokedUrls.push(url);

// Fill cache up to capacity (max 50 items)
for (let i = 1; i <= 55; i++) {
  governor.cacheMediaBlob(`blob_${i}`, `blob:http://localhost/${i}`, 1024 * 100, mockRevoke);
}

// 5 items should have been evicted and revoked
assert.equal(revokedUrls.length, 5);
assert.equal(revokedUrls[0], 'blob:http://localhost/1');
assert.equal(governor.getCachedBlob('blob_1'), null);
assert.equal(governor.getCachedBlob('blob_55'), 'blob:http://localhost/55');
console.log('✅ Case 3 passed: Memory consumption contained via LRU eviction and blob URL revoking.\n');

// ============================================================================
// 4. Ajaxy/telegram-tt#382 - Context Slice Notifications
// ============================================================================
console.log('👉 Testing Case 4: Context Slice Subscriptions (Ajaxy/telegram-tt#382)...');
const prevState = { typingUserId: 10, unreadCount: 5, theme: 'dark' };
const nextStateTypingOnly = { typingUserId: 20, unreadCount: 5, theme: 'dark' };

// Component watching only unreadCount does NOT re-render on typing changes
const unreadSlice = governor.filterStateUpdateNotifications(prevState, nextStateTypingOnly, ['unreadCount']);
assert.equal(unreadSlice.hasChanged, false);

// Component watching typingUserId DOES notify
const typingSlice = governor.filterStateUpdateNotifications(prevState, nextStateTypingOnly, ['typingUserId']);
assert.equal(typingSlice.hasChanged, true);
assert.equal(typingSlice.changedKeys[0], 'typingUserId');
console.log('✅ Case 4 passed: Selective context slices prevent full-tree re-render thrashing.\n');

// ============================================================================
// 5. Ajaxy/telegram-tt#360 - Open Chat Thread by Username
// ============================================================================
console.log('👉 Testing Case 5: Username Thread Routing (Ajaxy/telegram-tt#360)...');
const threadRoute1 = governor.parseUsernameThreadRoute('@dev_community/thread/88');
assert.equal(threadRoute1.isValid, true);
assert.equal(threadRoute1.username, 'dev_community');
assert.equal(threadRoute1.threadId, 88);
assert.equal(threadRoute1.canonicalDeepLink, 'tg://resolve?domain=dev_community&thread=88');

const threadRoute2 = governor.parseUsernameThreadRoute('https://t.me/tech_forum/105');
assert.equal(threadRoute2.isValid, true);
assert.equal(threadRoute2.username, 'tech_forum');
assert.equal(threadRoute2.threadId, 105);
console.log('✅ Case 5 passed: Username thread URLs and custom deep links resolved smoothly.\n');

// ============================================================================
// 6. Ajaxy/telegram-tt#429 - Packaged Electron Async Chunk Path Normalization
// ============================================================================
console.log('👉 Testing Case 6: Packaged Electron Async Chunk Paths (Ajaxy/telegram-tt#429)...');
const devChunk = governor.resolvePackagedAsyncChunkPath('calls.async.js', false, '/app');
assert.equal(devChunk, './calls.async.js');

const prodChunk = governor.resolvePackagedAsyncChunkPath('calls.async.js', true, 'C:\\Users\\User\\AppData\\Guidegram');
assert.equal(prodChunk, 'file://C:/Users/User/AppData/Guidegram/dist/calls.async.js');
console.log('✅ Case 6 passed: Packaged Electron async chunk paths normalized cleanly.\n');

// ============================================================================
// 7. Ajaxy/telegram-tt#437 - Telegram API ID / API Hash Validator
// ============================================================================
console.log('👉 Testing Case 7: API Credentials Validation (Ajaxy/telegram-tt#437)...');
const validCreds = governor.validateApiCredentials('1234567', '0123456789abcdef0123456789abcdef');
assert.equal(validCreds.isValid, true);
assert.equal(validCreds.cleanApiId, 1234567);
assert.equal(validCreds.cleanApiHash, '0123456789abcdef0123456789abcdef');

const invalidCreds = governor.validateApiCredentials('bad_id', 'not_a_valid_hash');
assert.equal(invalidCreds.isValid, false);
assert.equal(invalidCreds.errors.length, 2);
console.log('✅ Case 7 passed: Telegram API credentials format checked with clear diagnostics.\n');

console.log('🎉 ALL 7 PHASE 147 HARDENING TESTS PASSED WITH 100% SUCCESS!');
