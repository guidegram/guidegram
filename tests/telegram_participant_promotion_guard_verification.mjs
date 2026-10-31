import { strict as assert } from 'node:assert';
import { TelegramParticipantPromotionGuard } from '../dist-test-promo/src/utils/telegramParticipantPromotionGuard.js';

console.log('🧪 Starting TelegramParticipantPromotionGuard Verification Suite...');

const guard = TelegramParticipantPromotionGuard.getInstance();

// 1. Singleton check
assert.ok(guard);
assert.strictEqual(guard, TelegramParticipantPromotionGuard.getInstance(), 'Must be singleton');
console.log('  ✅ Check 1: Singleton instantiation verified');

const chatId = '-1001234567890';
const botId = '999888777';
const adminRights = {
  change_info: true,
  post_messages: true,
  delete_messages: true,
  invite_users: true
};

// 2. Synthesize optimistic admin
const optimistic = guard.synthesizeOptimisticAdmin(chatId, botId, adminRights, '111222', 'HelperBot');
assert.strictEqual(optimistic.isOptimistic, true);
assert.strictEqual(optimistic.customTitle, 'HelperBot');
assert.strictEqual(optimistic.adminRights.delete_messages, true);
console.log('  ✅ Check 2: Optimistic admin state synthesis verified');

// 3. Normal immediate server response
const immediateRes = await guard.refreshParticipantGuarded(chatId, botId, async () => {
  return {
    userId: botId,
    chatId,
    promotedBy: '111222',
    date: Math.floor(Date.now() / 1000),
    adminRights,
    customTitle: 'HelperBot',
    isOptimistic: false
  };
}, { maxRetries: 3, backoffMs: 10 });

assert.strictEqual(immediateRes.success, true);
assert.strictEqual(immediateRes.replicationLagDetected, false);
assert.strictEqual(immediateRes.attempts, 1);
assert.strictEqual(immediateRes.participant.isOptimistic, false);
console.log('  ✅ Check 3: Immediate server confirmation verified');

// 4. THE CRITICAL REPLICATION LAG CASE (TDesktop #31540):
// First 2 calls fail with USER_NOT_PARTICIPANT due to read-replica lag, 3rd succeeds
let attemptCounter = 0;
const lagRes = await guard.refreshParticipantGuarded(chatId, botId, async () => {
  attemptCounter++;
  if (attemptCounter <= 2) {
    throw new Error('RPCError 400: USER_NOT_PARTICIPANT');
  }
  return {
    userId: botId,
    chatId,
    promotedBy: '111222',
    date: Math.floor(Date.now() / 1000),
    adminRights,
    isOptimistic: false
  };
}, { maxRetries: 3, backoffMs: 20 });

assert.strictEqual(lagRes.success, true, 'Must succeed despite transient USER_NOT_PARTICIPANT');
assert.strictEqual(lagRes.replicationLagDetected, true, 'Must detect replication lag');
assert.strictEqual(lagRes.attempts, 3, 'Must have retried 3 times');
assert.strictEqual(lagRes.participant.isOptimistic, false);
console.log('  ✅ Check 4: Transient replication lag suppression verified (TDesktop #31540 parity)');

// 5. Persistent replication lag: falls back to optimistic state instead of throwing error
guard.synthesizeOptimisticAdmin(chatId, botId, adminRights, '111222');
const persistentLagRes = await guard.refreshParticipantGuarded(chatId, botId, async () => {
  throw new Error('USER_NOT_PARTICIPANT');
}, { maxRetries: 2, backoffMs: 10 });

assert.strictEqual(persistentLagRes.success, true);
assert.strictEqual(persistentLagRes.participant.isOptimistic, true, 'Must fallback to optimistic admin');
console.log('  ✅ Check 5: Optimistic fallback under persistent lag verified');

// 6. Unrelated error propagation
await assert.rejects(async () => {
  await guard.refreshParticipantGuarded(chatId, botId, async () => {
    throw new Error('NETWORK_TIMEOUT_DEADLINE_EXCEEDED');
  }, { maxRetries: 2, backoffMs: 10 });
}, /NETWORK_TIMEOUT_DEADLINE_EXCEEDED/);
console.log('  ✅ Check 6: Unrelated error propagation verified');

// 7. Telemetry inspection
const telemetry = guard.getTelemetry();
assert.ok(telemetry.promotionsCount >= 2);
assert.ok(telemetry.replicationLagsSuppressed >= 4);
console.log('  ✅ Check 7: Telemetry counters verified');

console.log('🎉 ALL 7 CHECKS PASSED SUCCESSFULLY!');
