import assert from 'node:assert';
import { TelegramReactionEngine } from '../src/services/telegramReactionEngine.ts';

console.log('🧪 Running Telegram Reaction Engine Verification (Phase 161)...');

let passed = 0;
const engine = TelegramReactionEngine.getInstance();

// 1. Add brand new reaction
const initial = [];
const res1 = engine.toggleReaction(initial, '🔥');
assert.strictEqual(res1.action, 'added');
assert.strictEqual(res1.nextReactions.length, 1);
assert.strictEqual(res1.nextReactions[0].emoji, '🔥');
assert.strictEqual(res1.nextReactions[0].count, 1);
assert.strictEqual(res1.nextReactions[0].chosen, true);
assert.strictEqual(res1.previousReactions.length, 0);
console.log('✅ Check 1: Brand new reaction addition passed');
passed++;

// 2. Increment existing unchosen reaction
const existing = [{ emoji: '👍', count: 5, chosen: false }];
const res2 = engine.toggleReaction(existing, '👍');
assert.strictEqual(res2.action, 'incremented');
assert.strictEqual(res2.nextReactions[0].count, 6);
assert.strictEqual(res2.nextReactions[0].chosen, true);
console.log('✅ Check 2: Increment existing unchosen reaction passed');
passed++;

// 3. Decrement existing chosen reaction (count > 1)
const multiChosen = [{ emoji: '🎉', count: 3, chosen: true }];
const res3 = engine.toggleReaction(multiChosen, '🎉');
assert.strictEqual(res3.action, 'decremented');
assert.strictEqual(res3.nextReactions[0].count, 2);
assert.strictEqual(res3.nextReactions[0].chosen, false);
console.log('✅ Check 3: Decrement multi-count chosen reaction passed');
passed++;

// 4. Remove single chosen reaction (count = 1)
const singleChosen = [{ emoji: '❤️', count: 1, chosen: true }];
const res4 = engine.toggleReaction(singleChosen, '❤️');
assert.strictEqual(res4.action, 'removed');
assert.strictEqual(res4.nextReactions.length, 0);
console.log('✅ Check 4: Remove single chosen reaction passed');
passed++;

// 5. Anonymous admin actor handling (resolves tdesktop #27419)
const resAnon = engine.toggleReaction([], '⚡', {
  id: 'user_123',
  isAnonymousAdmin: true,
  channelId: 'chan_999'
});
assert.strictEqual(resAnon.isAnonymous, true);
console.log('✅ Check 5: Anonymous admin reaction identification passed');
passed++;

// 6. Bot API webhook payload normalization
const userUpdate = {
  user: { id: 111, username: 'testuser' },
  new_reaction: [{ type: 'emoji', emoji: '🔥' }]
};
const normUser = engine.normalizeReactionUpdate(userUpdate);
assert.strictEqual(normUser.actorId, 111);
assert.strictEqual(normUser.actorType, 'user');
assert.strictEqual(normUser.isAnonymous, false);

const anonUpdate = {
  actor_chat: { id: -100999, title: 'Secret Group' },
  new_reaction: [{ type: 'emoji', emoji: '🔥' }]
};
const normAnon = engine.normalizeReactionUpdate(anonUpdate);
assert.strictEqual(normAnon.actorId, -100999);
assert.strictEqual(normAnon.actorType, 'channel');
assert.strictEqual(normAnon.isAnonymous, true);
console.log('✅ Check 6: Bot API reaction webhook payload normalization passed');
passed++;

console.log(`\n🎉 ALL ${passed}/6 CHECKS PASSED FOR TELEGRAM REACTION ENGINE!`);
