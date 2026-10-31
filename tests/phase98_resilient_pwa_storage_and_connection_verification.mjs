/**
 * Test Suite: Phase 98 Resilient PWA Storage, Connection & Input Verification
 * 
 * Verifies fixes for:
 * - Ajaxy/telegram-tt #13: Firefox storage partitioning causing random logout / session loss
 * - Ajaxy/telegram-tt #76: PWA standalone mode failing to reconnect / offline whiteout
 * - Ajaxy/telegram-tt #272: Safari WebKit Chinese/East Asian IME composition issues
 * - Ajaxy/telegram-tt #427: SPA opening to a blank white screen upon lazy chunk error
 * - UnigramDev/Unigram #2210: Toast push notification delivery failure & polling fallback
 * - tdlib/td #1331: Exceeding Telegram limits on sending messages (Flood Wait prevention)
 * - tdlib/td #1062: Connection problems with MTProto/WebSocket & DC failover
 */

import assert from 'node:assert';
import { resilientPwaStorageAndConnectionGovernor } from '../src/services/resilientPwaStorageAndConnectionGovernor.ts';

console.log('🧪 Starting Phase 98 Resilient PWA Storage & Connection Verification Suite...');

// 1. Firefox Storage Resilience
console.log('  Testing multi-tier session storage & retrieval...');
const saved = resilientPwaStorageAndConnectionGovernor.saveSessionToken('user_auth_key', 'auth_token_xyz_9988');
assert.strictEqual(saved, true);

const retrieved = resilientPwaStorageAndConnectionGovernor.getSessionToken('user_auth_key');
assert.strictEqual(retrieved, 'auth_token_xyz_9988');

const missing = resilientPwaStorageAndConnectionGovernor.getSessionToken('non_existent');
assert.strictEqual(missing, null);
console.log('  ✅ Multi-tier session storage verified');

// 2. PWA Standalone Mode & DC Failover
console.log('  Testing PWA standalone reconnect & DC failover...');
resilientPwaStorageAndConnectionGovernor.setPwaStandalone(true);
const statusInit = resilientPwaStorageAndConnectionGovernor.verifyConnection();
assert.strictEqual(statusInit.isOnline, true);
assert.strictEqual(statusInit.isStandalone, true);
assert.strictEqual(statusInit.activeDataCenter, 2);

// Simulate network failure & DC failover after 3 retries
resilientPwaStorageAndConnectionGovernor.verifyConnection(true); // attempt 1
resilientPwaStorageAndConnectionGovernor.verifyConnection(true); // attempt 2
const failoverStatus = resilientPwaStorageAndConnectionGovernor.verifyConnection(true); // attempt 3 -> triggers failover

assert.strictEqual(failoverStatus.isOnline, false);
assert.strictEqual(failoverStatus.reconnectAttempts, 3);
assert.strictEqual(failoverStatus.activeDataCenter, 3); // Failover from DC2 -> DC3

// Recovery
const recovered = resilientPwaStorageAndConnectionGovernor.verifyConnection(false);
assert.strictEqual(recovered.isOnline, true);
assert.strictEqual(recovered.reconnectAttempts, 0);
console.log('  ✅ PWA standalone reconnect & DC failover verified');

// 3. Safari WebKit Chinese/Asian IME Composition
console.log('  Testing Safari WebKit IME composition handling...');
resilientPwaStorageAndConnectionGovernor.configureSafariWebKit(true);
resilientPwaStorageAndConnectionGovernor.handleImeCompositionStart();

let imeState = resilientPwaStorageAndConnectionGovernor.getImeState();
assert.strictEqual(imeState.isComposing, true);

resilientPwaStorageAndConnectionGovernor.handleImeCompositionUpdate('你好');
imeState = resilientPwaStorageAndConnectionGovernor.getImeState();
assert.strictEqual(imeState.activeCompositionText, '你好');

const endResult = resilientPwaStorageAndConnectionGovernor.handleImeCompositionEnd('你好');
assert.strictEqual(endResult.text, '你好');
assert.strictEqual(endResult.shouldDispatch, false); // Prevents premature send on Safari

imeState = resilientPwaStorageAndConnectionGovernor.getImeState();
assert.strictEqual(imeState.isComposing, false);
assert.strictEqual(imeState.compositionConfirmed, true);
console.log('  ✅ Safari WebKit IME composition flow verified');

// 4. Blank Screen & Lazy Chunk Error Recovery
console.log('  Testing blank screen chunk reload recovery...');
const chunkRecovery = resilientPwaStorageAndConnectionGovernor.handleChunkLoadError('chunk-main-view.js');
assert.strictEqual(chunkRecovery.recovered, true);
assert.strictEqual(chunkRecovery.reloadTriggered, true);
assert.ok(chunkRecovery.recoveryUrl?.includes('chunk-main-view.js?t='));
console.log('  ✅ Chunk load error interception and cache-busted recovery verified');

// 5. Toast Push Notification Fallback
console.log('  Testing push notification failure & polling fallback...');
let pushRes = resilientPwaStorageAndConnectionGovernor.reportPushNotificationDelivery(false);
assert.strictEqual(pushRes.pollingFallback, false); // 1 failure

pushRes = resilientPwaStorageAndConnectionGovernor.reportPushNotificationDelivery(false);
assert.strictEqual(pushRes.pollingFallback, true); // 2 failures -> activate polling
assert.strictEqual(resilientPwaStorageAndConnectionGovernor.isPollingFallbackActive(), true);

// Recover push notifications
pushRes = resilientPwaStorageAndConnectionGovernor.reportPushNotificationDelivery(true);
assert.strictEqual(pushRes.pollingFallback, false);
console.log('  ✅ Push notification failure detection and polling fallback verified');

// 6. Proactive Flood Wait & Rate Limiter
console.log('  Testing proactive message rate limiter & flood-wait...');
const chatId = 'channel_news_1';
let rateResult = resilientPwaStorageAndConnectionGovernor.checkMessageRateLimit(chatId);
assert.strictEqual(rateResult.allowed, true);
assert.strictEqual(rateResult.remainingTokens, 19);

// Consume remaining tokens
for (let i = 0; i < 19; i++) {
  rateResult = resilientPwaStorageAndConnectionGovernor.checkMessageRateLimit(chatId);
  assert.strictEqual(rateResult.allowed, true);
}

// 21st send should be blocked by rate limiter
const blockedResult = resilientPwaStorageAndConnectionGovernor.checkMessageRateLimit(chatId);
assert.strictEqual(blockedResult.allowed, false);
assert.ok(blockedResult.waitMs > 0);
assert.ok(blockedResult.reason?.includes('FLOOD_PREVENT'));
console.log('  ✅ Proactive flood-wait rate limiter verified');

console.log('✨ All Phase 98 Verification Tests Passed 100% Successfully!');
