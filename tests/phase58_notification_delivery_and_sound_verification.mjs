import assert from 'node:assert/strict';
import { NotificationDeliveryAndSoundGovernor } from '../src/services/notificationDeliveryAndSoundGovernor.ts';

console.log('🧪 Starting Phase 58 Notification Delivery, Sound Governor & Badge Verification Suite...');

const governor = new NotificationDeliveryAndSoundGovernor();

// 1. AudioContext Gesture Unlock (Ajaxy/telegram-tt #205, morethanwords/tweb #214)
console.log('  Testing audio context gesture unlock...');
assert.equal(governor.isAudioUnlocked(), false);
governor.unlockAudioContext();
assert.equal(governor.isAudioUnlocked(), true);
console.log('  ✅ Audio context unlock verified');

// 2. Soft Mute Burst Throttling & Mention Override (TDesktop-x64/tdesktop #229)
console.log('  Testing soft-mute burst throttling...');
governor.setNotificationVolume(0.85);

const msg1 = {
  id: 'n1',
  chatId: 'group_101',
  messageId: 501,
  senderName: 'Alice',
  previewText: 'Hello team',
  isMuted: false,
  hasMention: false,
  timestamp: 1000,
};

// 1st message in chat: Should play sound
const d1 = governor.evaluateSoundDelivery(msg1, 1000);
assert.equal(d1.shouldPlaySound, true);
assert.equal(d1.volume, 0.85);
assert.equal(d1.isBurstSuppressed, false);
assert.equal(d1.duckBackgroundAudio, true);

// 2nd rapid message in same chat (1 second later): Should be soft-muted / burst suppressed!
const msg2 = { ...msg1, id: 'n2', messageId: 502, previewText: 'Second line', timestamp: 2000 };
const d2 = governor.evaluateSoundDelivery(msg2, 2000);
assert.equal(d2.shouldPlaySound, false);
assert.equal(d2.isBurstSuppressed, true);

// 3rd message in same chat with MENTION: Mention MUST override soft mute!
const msg3 = { ...msg1, id: 'n3', messageId: 503, hasMention: true, timestamp: 2500 };
const d3 = governor.evaluateSoundDelivery(msg3, 2500);
assert.equal(d3.shouldPlaySound, true);
assert.equal(d3.isBurstSuppressed, false);

// 4th message after burst window (5 seconds later): Should play sound again
const msg4 = { ...msg1, id: 'n4', messageId: 504, timestamp: 8000 };
const d4 = governor.evaluateSoundDelivery(msg4, 8000);
assert.equal(d4.shouldPlaySound, true);
assert.equal(d4.isBurstSuppressed, false);
console.log('  ✅ Soft-mute burst throttling & mention override verified');

// 3. Audio Ducking (Ajaxy/telegram-tt #369)
console.log('  Testing audio ducking calculation...');
const normalMediaVolume = 0.8;
const duckedVolume = governor.computeDuckedAudioVolume(normalMediaVolume);
assert.equal(duckedVolume, 0.32, 'Ducked volume should be reduced to 40% of normal level');
console.log('  ✅ Audio ducking calculation verified');

// 4. Muted vs Active vs Mention Badge Calculation (UnigramDev/Unigram #1255)
console.log('  Testing badge aggregation and styling...');
// Only muted chats
const mutedChatsOnly = [
  { unreadCount: 5, isMuted: true, mentionCount: 0 },
  { unreadCount: 12, isMuted: true, mentionCount: 0 },
];
const bMuted = governor.calculateBadges(mutedChatsOnly);
assert.equal(bMuted.badgeStyle, 'muted');
assert.equal(bMuted.totalUnreadCount, 17);
assert.equal(bMuted.displayText, '17');

// Active chats present
const mixedChats = [
  ...mutedChatsOnly,
  { unreadCount: 3, isMuted: false, mentionCount: 0 },
];
const bActive = governor.calculateBadges(mixedChats);
assert.equal(bActive.badgeStyle, 'active');
assert.equal(bActive.unmutedUnreadCount, 3);
assert.equal(bActive.displayText, '3');

// Mention present (Highest priority)
const mentionChats = [
  ...mixedChats,
  { unreadCount: 1, isMuted: false, mentionCount: 2 },
];
const bMention = governor.calculateBadges(mentionChats);
assert.equal(bMention.badgeStyle, 'mention');
assert.equal(bMention.totalMentions, 2);
assert.equal(bMention.displayText, '@2');
console.log('  ✅ Badge aggregation and priority styling verified');

// 5. Deep-link Notification Target Resolution (kotatogram/kotatogram-desktop #3)
console.log('  Testing notification navigation deep link resolution...');
const navTarget = governor.resolveNotificationNavigation({
  chatId: 'supergroup_88',
  threadId: 42,
  messageId: 9912,
});

assert.equal(navTarget.chatId, 'supergroup_88');
assert.equal(navTarget.threadId, 42);
assert.equal(navTarget.messageId, 9912);
assert.equal(navTarget.url, 'guidegram://chat/supergroup_88/thread/42?msgId=9912');
console.log('  ✅ Notification deep link navigation verified');

console.log('✨ All Phase 58 Verification Tests Passed 100% Successfully!');
