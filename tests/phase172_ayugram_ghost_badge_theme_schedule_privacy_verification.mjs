import assert from 'node:assert/strict';
import {
  GhostModeBadgeSyncGovernor,
  SystemDarkThemeSyncGovernor,
  ScheduledMessageCancelGovernor,
  SelfDeletedOutgoingRecallGovernor,
  ProactivePresencePollingGovernor,
  GhostUnreadBookmarkGovernor,
  ForwardedSenderPrivacyGovernor
} from '../src/services/ayugramGhostBadgeThemeScheduleAndPrivacyGovernor.ts';

console.log('🧪 Starting Phase 172 Verification: AyuGram Ghost Badge, Theme, Schedule, Anti-Recall & Privacy Hardening...');

// -------------------------------------------------------------
// Test 1: GhostModeBadgeSyncGovernor (Resolves #508)
// -------------------------------------------------------------
console.log('  Testing #508: Ghost Mode Notification Badge Desync Prevention...');
const badgeGov = new GhostModeBadgeSyncGovernor();

badgeGov.updateServerUnread(15);
assert.equal(badgeGov.getState().displayedBadge, 15);

// Enable Ghost Mode & read 5 messages locally
badgeGov.setGhostMode(true);
badgeGov.markLocalChatRead(5);
assert.equal(badgeGov.getState().localUnreadCount, 10);
assert.equal(badgeGov.getState().displayedBadge, 10, 'Displayed badge must reflect local reading in ghost mode');
assert.equal(badgeGov.getState().serverUnreadCount, 15, 'Server unread remains untouched');
console.log('  ✅ #508 Verified: Ghost Mode badge reflects local reading without server desync.');

// -------------------------------------------------------------
// Test 2: SystemDarkThemeSyncGovernor (Resolves #495)
// -------------------------------------------------------------
console.log('  Testing #495: Dynamic System Dark/Light Theme Switching...');
const themeGov = new SystemDarkThemeSyncGovernor();

const darkState = themeGov.handleSystemThemeChange(true);
assert.equal(darkState.appTheme, 'dark');
assert.equal(darkState.activePaletteId, 'palette_midnight_dark');

const lightState = themeGov.handleSystemThemeChange(false);
assert.equal(lightState.appTheme, 'light');
assert.equal(lightState.activePaletteId, 'palette_day_light');
console.log('  ✅ #495 Verified: OS dark mode events trigger reactive palette updates.');

// -------------------------------------------------------------
// Test 3: ScheduledMessageCancelGovernor (Resolves #466)
// -------------------------------------------------------------
console.log('  Testing #466: Scheduled Message Queue & Atomic Cancelation...');
const scheduleGov = new ScheduledMessageCancelGovernor();

const futureTime = Date.now() + 60000;
scheduleGov.scheduleMessage({
  id: 'sched_100',
  chatId: 'chat_77',
  text: 'Happy New Year!',
  sendTimestampMs: futureTime,
  isCancelled: false
});

assert.equal(scheduleGov.getPendingMessages().length, 1);
const cancelRes = scheduleGov.cancelScheduledMessage('sched_100');
assert.equal(cancelRes.success, true);
assert.equal(cancelRes.cancelledItem?.isCancelled, true);
assert.equal(scheduleGov.getPendingMessages().length, 0);
console.log('  ✅ #466 Verified: Scheduled messages can be atomically cancelled.');

// -------------------------------------------------------------
// Test 4: SelfDeletedOutgoingRecallGovernor (Resolves #424)
// -------------------------------------------------------------
console.log('  Testing #424: Self-Deleted Outgoing Messages in Anti-Recall...');
const recallGov = new SelfDeletedOutgoingRecallGovernor();

const archivedOutgoing = recallGov.interceptDeleteEvent({
  messageId: 'out_msg_999',
  chatId: 'chat_alpha',
  text: 'Self deleted confidential note',
  isOutgoing: true
});

assert.equal(archivedOutgoing.retainedInArchive, true);
assert.equal(archivedOutgoing.isOutgoing, true);
assert.equal(recallGov.getArchivedMessage('out_msg_999')?.text, 'Self deleted confidential note');
console.log('  ✅ #424 Verified: Outgoing self-deleted messages preserved in anti-recall archive.');

// -------------------------------------------------------------
// Test 5: ProactivePresencePollingGovernor (Resolves #417)
// -------------------------------------------------------------
console.log('  Testing #417: Proactive Presence Polling & TTL Stale Decay...');
const presenceGov = new ProactivePresencePollingGovernor();

const now = Date.now();
presenceGov.recordPresence('user_alice', true, now);

// Immediately check: online and not stale
const activeCheck = presenceGov.evaluatePresence('user_alice', now + 10000);
assert.equal(activeCheck?.isOnline, true);
assert.equal(activeCheck?.isStale, false);

// Check after TTL expired (130 seconds later > 120 sec TTL)
const staleCheck = presenceGov.evaluatePresence('user_alice', now + 130000);
assert.equal(staleCheck?.isOnline, false, 'Stale presence must decay to offline');
assert.equal(staleCheck?.isStale, true);
console.log('  ✅ #417 Verified: Presence TTL decay prevents stuck online status.');

// -------------------------------------------------------------
// Test 6: GhostUnreadBookmarkGovernor (Resolves #372)
// -------------------------------------------------------------
console.log('  Testing #372: Ghost Mode Local Unread Bookmarking...');
const bookmarkGov = new GhostUnreadBookmarkGovernor();

// User read up to message 450 locally, but server read mark is still at 400
const bookmark = bookmarkGov.trackLocalReading('chat_vip', 450, 400);
assert.equal(bookmark.hasLocalUnreadGap, true);
assert.equal(bookmark.lastLocallyReadMessageId, 450);
assert.equal(bookmark.serverMarkedMessageId, 400);
console.log('  ✅ #372 Verified: Local reading bookmark tracks unread gap in Ghost Mode.');

// -------------------------------------------------------------
// Test 7: ForwardedSenderPrivacyGovernor (Resolves #366)
// -------------------------------------------------------------
console.log('  Testing #366: Forwarded Sender Privacy Masking...');
const privacyGov = new ForwardedSenderPrivacyGovernor();

// Scenario A: Mask original sender
const masked = privacyGov.sanitizeForwardHeader({
  senderId: 'user_12345',
  senderName: 'Whistleblower',
  hideSender: true
});
assert.equal(masked.maskSender, true);
assert.equal(masked.sanitizedHeader, 'Forwarded message');
assert.equal(masked.originalSenderId, '');

// Scenario B: Normal forward
const normal = privacyGov.sanitizeForwardHeader({
  senderId: 'user_67890',
  senderName: 'Bob',
  hideSender: false
});
assert.equal(normal.maskSender, false);
assert.equal(normal.sanitizedHeader, 'Forwarded from Bob');
console.log('  ✅ #366 Verified: Forwarded sender privacy mask strips identifying information.');

console.log('\n🎉 ALL 7 AYUGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
