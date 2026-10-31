import assert from 'node:assert';
import { AccessiblePollAndSecretChatGovernor } from '../src/services/accessiblePollAndSecretChatGovernor.ts';

console.log('🧪 Starting Phase 96 Accessible Polls & Secret Chat Verification Suite...');

const governor = new AccessiblePollAndSecretChatGovernor();

// 1. Poll Creation & Serialization (AyuGram #332)
console.log('  Testing poll creation & options serialization...');
const poll = governor.createPollMessage('poll_1', 'Which is the best messaging protocol?', [
  'MTProto',
  'Matrix',
  'Signal Protocol'
]);
assert.strictEqual(poll.id, 'poll_1');
assert.strictEqual(poll.options.length, 3);
assert.strictEqual(poll.totalVoters, 0);
assert.strictEqual(poll.isAnonymous, true);
console.log('  ✅ Poll creation & options serialization verified');

// 2. Voting & Percentage Recalculation
console.log('  Testing vote casting & percentage calculation...');
const votedPoll = governor.castVote(poll, ['opt_0']);
assert.strictEqual(votedPoll.totalVoters, 1);
assert.strictEqual(votedPoll.options[0].voterCount, 1);
assert.strictEqual(votedPoll.options[0].percentage, 100);
assert.strictEqual(votedPoll.options[0].isChosen, true);
assert.strictEqual(votedPoll.options[1].percentage, 0);
console.log('  ✅ Vote casting & percentage calculation verified');

// 3. Accessible ARIA Labels for Poll Options (Unigram #2738, #2339)
console.log('  Testing accessible ARIA labels for poll options...');
const optionAria = governor.getAccessiblePollOptionAria(votedPoll.options[0], votedPoll.totalVoters);
assert.ok(optionAria.includes('MTProto: 1 votes (100%)'));
assert.ok(optionAria.includes('chosen by you'));

const summaryAria = governor.getAccessiblePollSummaryAria(votedPoll);
assert.ok(summaryAria.includes('Anonymous Poll'));
assert.ok(summaryAria.includes('Total votes: 1'));
console.log('  ✅ Accessible ARIA labels for poll options verified');

// 4. Secret Chat Formatted Captions (tdlib #935)
console.log('  Testing secret chat photo message formattedText caption...');
const secretMsg = governor.serializeSecretChatPhotoMessage(
  'sec_msg_10',
  '-10055',
  'https://media.com/secret_photo.enc',
  'Check this sensitive diagram',
  [{ type: 'bold', offset: 11, length: 9 }],
  30 // 30s TTL
);
assert.strictEqual(secretMsg.caption.text, 'Check this sensitive diagram');
assert.strictEqual(secretMsg.caption.entities.length, 1);
assert.strictEqual(secretMsg.caption.entities[0].type, 'bold');
assert.strictEqual(secretMsg.ttlSeconds, 30);
console.log('  ✅ Secret chat formattedText caption verified');

// 5. Secret Chat Peer Hydration (tdlib #1024)
console.log('  Testing secret chat peer resolution...');
governor.registerSecretChat('sec_chat_99', 'user_arash', 'hash_123', 'key_456');
const resolved = governor.resolveSecretChat('sec_chat_99');
assert.strictEqual(resolved.found, true);
assert.strictEqual(resolved.peer?.peerId, 'user_arash');

const missing = governor.resolveSecretChat('sec_chat_unknown');
assert.strictEqual(missing.found, false);
console.log('  ✅ Secret chat peer resolution verified');

// 6. API Secret Leak Sanitization (Ajaxy #342)
console.log('  Testing client configuration API secret sanitization...');
const dirtyConfig = {
  api_id: 123456,
  api_hash: 'super_secret_server_hash_xyz',
  bot_token: '12345:bot_secret_token',
  gateway_url: 'https://gateway.guidegram.org'
};
const cleanConfig = governor.sanitizeClientConfig(dirtyConfig);
assert.strictEqual(cleanConfig.api_id, 123456);
assert.strictEqual(cleanConfig.gateway_url, 'https://gateway.guidegram.org');
assert.strictEqual(cleanConfig.api_hash, undefined);
assert.strictEqual(cleanConfig.bot_token, undefined);
console.log('  ✅ API secret leak sanitization verified');

console.log('✨ All Phase 96 Verification Tests Passed 100% Successfully!');
