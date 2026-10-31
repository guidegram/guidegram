import assert from 'node:assert';
import { SecretChatAndEphemeralGovernor } from '../src/services/secretChatAndEphemeralGovernor.ts';

console.log('🧪 Starting Phase 77 Secret Chats & Ephemeral Self-Destruct Verification Suite...');

const governor = new SecretChatAndEphemeralGovernor();

// 1. Test secret chat initiation and key fingerprint (tdesktop #871, #5 & kotatogram #8)
console.log('  Testing secret chat initiation & key exchange...');
const chat1 = governor.requestSecretChat('user_bob', 10);
assert.strictEqual(chat1.peerId, 'user_bob');
assert.strictEqual(chat1.status, 'requesting');
assert.strictEqual(chat1.ttlSeconds, 10);
assert.ok(chat1.keyFingerprint.length > 10);
console.log('  ✅ Secret chat initiation & key fingerprint verified');

// 2. Test acceptance and cancellation on invalid key (Unigram #2451)
console.log('  Testing secret chat acceptance & key validation...');
assert.throws(() => {
  governor.acceptSecretChat(chat1.id, '');
}, /canceled: invalid peer key hash/);

const chat2 = governor.requestSecretChat('user_alice', 5);
const accepted = governor.acceptSecretChat(chat2.id, 'peer_dh_valid_hash_123');
assert.strictEqual(accepted.status, 'active');
console.log('  ✅ Secret chat acceptance verified');

// 3. Test Ephemeral Message posting and self-destruct countdown (tdlib #945)
console.log('  Testing ephemeral message posting & countdown...');
const msg1 = governor.postEphemeralMessage(chat2.id, 'user_me', 'Burn after reading message');
assert.strictEqual(msg1.chatId, chat2.id);
assert.strictEqual(msg1.ttlSeconds, 5);
assert.strictEqual(msg1.isDestroyed, false);
assert.strictEqual(msg1.viewedAt, undefined);

// View message at t=1000
const viewRes = governor.markMessageViewed(chat2.id, msg1.id, 1000);
assert.strictEqual(viewRes.willExpireAt, 1000 + 5 * 1000); // 6000ms

// Purge at t=5000 (not expired yet)
const purge1 = governor.purgeExpiredMessages(5000);
assert.strictEqual(purge1.count, 0);
assert.strictEqual(governor.getMessages(chat2.id).length, 1);

// Purge at t=6001 (expired)
const purge2 = governor.purgeExpiredMessages(6001);
assert.strictEqual(purge2.count, 1);
assert.strictEqual(purge2.purgedMessageIds[0], msg1.id);
assert.strictEqual(governor.getMessages(chat2.id).length, 0);
console.log('  ✅ Ephemeral message self-destruct purge verified');

// 4. Test screen security and screenshot alerts (Unigram #881 & #3473)
console.log('  Testing screen security and screenshot alert dispatch...');
assert.strictEqual(governor.getSecretChat(chat2.id)?.screenSecurityEnabled, true);
governor.setScreenSecurity(chat2.id, false);
assert.strictEqual(governor.getSecretChat(chat2.id)?.screenSecurityEnabled, false);

const alertEvent = governor.recordScreenshotTaken(chat2.id, 'user_alice');
assert.strictEqual(alertEvent.alertMessage, 'user_alice took a screenshot!');
const msgsAfterAlert = governor.getMessages(chat2.id);
assert.ok(msgsAfterAlert.some(m => m.text.includes('took a screenshot!')));
console.log('  ✅ Screen security and screenshot alerts verified');

// 5. Test discard secret chat and total local memory purge (AyuGram #140)
console.log('  Testing secret chat discard and memory purge...');
const discarded = governor.discardSecretChat(chat2.id);
assert.strictEqual(discarded, true);
assert.strictEqual(governor.getSecretChat(chat2.id)?.status, 'discarded');
assert.strictEqual(governor.getMessages(chat2.id).length, 0);

// Posting to discarded chat should throw
assert.throws(() => {
  governor.postEphemeralMessage(chat2.id, 'user_me', 'Failed message');
}, /Cannot post message to inactive or discarded secret chat/);
console.log('  ✅ Secret chat discard and memory purge verified');

console.log('✨ All Phase 77 Verification Tests Passed 100% Successfully!');
