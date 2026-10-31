import assert from 'node:assert';
import { ForumTopicAndThreadGovernor } from '../src/services/forumTopicAndThreadGovernor.ts';

console.log('🧪 Starting Phase 74 Forum Topics & Thread Isolation Verification Suite...');

const governor = new ForumTopicAndThreadGovernor();

// 1. Test topic registration & pinned priority ordering
console.log('  Testing topic registration and pinned sorting...');
governor.registerTopic('-100123456', {
  id: 1,
  title: 'General',
  iconColor: 0x6c757d,
  isGeneral: true,
  isClosed: false,
  isHidden: false,
  isPinned: false,
  unreadCount: 0,
  readInboxMaxId: 10,
  readOutboxMaxId: 10,
  isMuted: false,
  lastMessageId: 100,
  lastMessageDate: 1000
});

governor.registerTopic('-100123456', {
  id: 2,
  title: 'Rules & FAQ',
  iconColor: 0x007bff,
  isGeneral: false,
  isClosed: false,
  isHidden: false,
  isPinned: true,
  unreadCount: 0,
  readInboxMaxId: 5,
  readOutboxMaxId: 5,
  lastMessageId: 50,
  lastMessageDate: 800
});

governor.registerTopic('-100123456', {
  id: 3,
  title: 'Discussions',
  iconColor: 0x28a745,
  isGeneral: false,
  isClosed: false,
  isHidden: false,
  isPinned: false,
  unreadCount: 2,
  readInboxMaxId: 20,
  readOutboxMaxId: 20,
  lastMessageId: 200,
  lastMessageDate: 1500
});

const sortedTopics = governor.getTopics('-100123456');
assert.strictEqual(sortedTopics[0].id, 2); // Pinned 'Rules & FAQ' must be first
assert.strictEqual(sortedTopics[1].id, 3); // Highest lastMessageDate (1500)
assert.strictEqual(sortedTopics[2].id, 1); // General (1000)
console.log('  ✅ Topic registration and pinned priority verified');

// 2. Test topic deletion fallback (tdesktop #31533)
console.log('  Testing safe topic deletion fallback...');
const delResult = governor.handleTopicDeletion('-100123456', 3, 3);
assert.strictEqual(delResult.safeToClose, true);
assert.strictEqual(delResult.fallbackTopicId, 1); // Falls back to General (id: 1)
assert.strictEqual(governor.getTopics('-100123456').length, 2);
console.log('  ✅ Safe topic deletion fallback verified');

// 3. Test ghost topic pruning after channelDifferenceTooLong (Telegram-iOS #2404)
console.log('  Testing ghost topic difference synchronization...');
// Remote active topics only has topic id: 1
const syncResult = governor.syncTopicDifference('-100123456', [1]);
assert.strictEqual(syncResult.removedCount, 1); // Removed topic 2
assert.strictEqual(syncResult.remainingCount, 1); // Only General (1) remains
console.log('  ✅ Ghost topic difference synchronization verified');

// 4. Test topic mute notifications (Unigram #3220)
console.log('  Testing per-topic mute settings...');
assert.strictEqual(governor.isTopicMuted('-100123456', 1), false);
governor.setTopicMute('-100123456', 1, true, Date.now() + 60000);
assert.strictEqual(governor.isTopicMuted('-100123456', 1), true);
console.log('  ✅ Per-topic mute settings verified');

// 5. Test topic read state and checkmarks (tdesktop #31431 & iOS #2386)
console.log('  Testing topic read state & double checkmarks...');
governor.addTopicMessage('-100123456', 1, {
  id: 101,
  topicId: 1,
  senderId: 'user_me',
  senderName: 'Me',
  text: 'Hello topic!',
  isOutgoing: true,
  isRead: false
});

let msgs = governor.getTopicMessages('-100123456', 1);
assert.strictEqual(msgs[0].isRead, false);

// Mark read outbox up to 101
governor.updateTopicReadState('-100123456', 1, 101, true);
msgs = governor.getTopicMessages('-100123456', 1);
assert.strictEqual(msgs[0].isRead, true); // Double checkmark active
console.log('  ✅ Topic read state and double checkmarks verified');

// 6. Test sender avatar resolution inside topic views (tdesktop #31427)
console.log('  Testing sender avatar resolution in topic view...');
governor.registerSenderAvatar('user_alice', 'https://cdn.guidegram.org/avatars/alice.jpg');
const resolvedAvatar = governor.resolveSenderAvatarInTopic('-100123456', 1, 'user_alice');
assert.strictEqual(resolvedAvatar, 'https://cdn.guidegram.org/avatars/alice.jpg');
const fallback = governor.resolveSenderAvatarInTopic('-100123456', 1, 'user_unknown', 'default.png');
assert.strictEqual(fallback, 'default.png');
console.log('  ✅ Sender avatar resolution verified');

// 7. Test ghost deleted messages retention across topic switches (AyuGram #454)
console.log('  Testing deleted message ghost retention in topics...');
governor.addTopicMessage('-100123456', 1, {
  id: 102,
  topicId: 1,
  senderId: 'user_bob',
  senderName: 'Bob',
  text: 'Secret message that was deleted',
  isOutgoing: false,
  isRead: true,
  isGhostDeleted: false
});

const retained = governor.retainTopicDeletedMessage('-100123456', 1, 102);
assert.strictEqual(retained, true);
const topic1Messages = governor.getTopicMessages('-100123456', 1);
const deletedMsg = topic1Messages.find(m => m.id === 102);
assert.strictEqual(deletedMsg?.isGhostDeleted, true);
console.log('  ✅ Ghost message retention verified');

// 8. Test slash command thread creation from All Messages (tdesktop #31451)
console.log('  Testing slash command thread creation from All Messages...');
const cmd1 = governor.handleSlashCommandInAllMessages('-100123456', '/help');
assert.strictEqual(cmd1.createNewThread, true);
assert.strictEqual(cmd1.newTopicTitle, 'Thread: /help');

const cmd2 = governor.handleSlashCommandInAllMessages('-100123456', '/bug Report login failure');
assert.strictEqual(cmd2.createNewThread, true);
assert.strictEqual(cmd2.newTopicTitle, 'Report login failure');

const nonCmd = governor.handleSlashCommandInAllMessages('-100123456', 'Just regular text');
assert.strictEqual(nonCmd.createNewThread, false);
console.log('  ✅ Slash command thread creation verified');

console.log('✨ All Phase 74 Verification Tests Passed 100% Successfully!');
