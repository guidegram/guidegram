import assert from 'node:assert/strict';
import { IosCarPlayWatchNotificationAndSplashGovernor } from '../src/services/iosCarPlayWatchNotificationAndSplashGovernor.ts';

console.log('🧪 Starting Phase 160: Telegram iOS CarPlay, Watch, Notification, and Splash Hardening Test Suite...');

const governor = new IosCarPlayWatchNotificationAndSplashGovernor();

// =========================================================================
// Test 1: Telegram-iOS #1960 - Siri & CarPlay Bot Recipient Resolution
// =========================================================================
console.log('Testing Telegram-iOS #1960: Siri bot recipient resolution and fuzzy match...');
{
  // Exact match with @
  const exact = governor.resolveSiriRecipient('@SupportBot');
  assert.ok(exact);
  assert.equal(exact.displayName, 'Guidegram Support');
  assert.equal(exact.isBot, true);
  assert.equal(exact.chatId, 'chat_support_bot');
  assert.equal(exact.score, 1.0);

  // Exact match without @
  const noAt = governor.resolveSiriRecipient('walletbot');
  assert.ok(noAt);
  assert.equal(noAt.displayName, 'Telegram Wallet');
  assert.equal(noAt.isBot, true);

  // Fuzzy match on display name
  const fuzzy = governor.resolveSiriRecipient('Support');
  assert.ok(fuzzy);
  assert.equal(fuzzy.displayName, 'Guidegram Support');

  // Unknown recipient -> Clean null, no crash
  const unknown = governor.resolveSiriRecipient('nonexistent_person_123');
  assert.equal(unknown, null);
  console.log('✅ Telegram-iOS #1960: Siri bot recipient resolution verified.');
}

// =========================================================================
// Test 2: Telegram-iOS #556 - Communication Notifications with Focus Bypass
// =========================================================================
console.log('Testing Telegram-iOS #556: Communication notifications format and VIP Focus bypass...');
{
  const notif = governor.formatCommunicationNotification('chat_101', 'Alice', 'Hey, are you free?', {
    avatarUrl: 'https://cdn.example.com/alice.jpg',
    isVip: true
  });
  assert.equal(notif.title, 'Alice');
  assert.equal(notif.body, 'Hey, are you free?');
  assert.equal(notif.senderName, 'Alice');
  assert.equal(notif.senderAvatarUrl, 'https://cdn.example.com/alice.jpg');
  assert.equal(notif.conversationIdentifier, 'chat_101');
  assert.equal(notif.isVipContact, true);
  assert.equal(notif.bypassFocusMode, true);
  console.log('✅ Telegram-iOS #556: Communication notifications verified.');
}

// =========================================================================
// Test 3: Telegram-iOS #505 - Cold Start Splash Screen Watchdog and Recovery
// =========================================================================
console.log('Testing Telegram-iOS #505: Cold start splash screen watchdog and fallback view...');
{
  // Case A: UI ready quickly (500ms) -> Healthy mount
  const fast = governor.evaluateColdStartHealth(500, true);
  assert.equal(fast.isMounted, true);
  assert.equal(fast.recoveredFromStall, false);
  assert.equal(fast.activeView, 'main_ui');

  // Case B: Startup stalled for 3500ms (> 3000ms max) -> Auto-recovery triggers
  const stalled = governor.evaluateColdStartHealth(3500, false);
  assert.equal(stalled.isMounted, true);
  assert.equal(stalled.recoveredFromStall, true);
  assert.equal(stalled.activeView, 'fallback_retry');
  console.log('✅ Telegram-iOS #505: Cold start splash screen watchdog verified.');
}

// =========================================================================
// Test 4: Telegram-iOS #438 - Apple Watch Quick Reply Ingestion and Haptics
// =========================================================================
console.log('Testing Telegram-iOS #438: Apple Watch quick reply and haptic feedback...');
{
  // Case A: Valid dictated text
  const validReply = governor.handleWatchQuickReply({
    watchReplyId: 'w_reply_1',
    chatId: 'chat_777',
    dictatedText: 'On my way now',
    timestamp: Date.now()
  });
  assert.equal(validReply.accepted, true);
  assert.equal(validReply.queuedForOutbox, true);
  assert.equal(validReply.hapticFeedback, 'success');

  // Case B: Empty text dictation
  const emptyReply = governor.handleWatchQuickReply({
    watchReplyId: 'w_reply_2',
    chatId: 'chat_777',
    dictatedText: '   ',
    timestamp: Date.now()
  });
  assert.equal(emptyReply.accepted, false);
  assert.equal(emptyReply.hapticFeedback, 'retry');
  assert.equal(emptyReply.error, 'Dictated text was empty');
  console.log('✅ Telegram-iOS #438: Apple Watch quick reply verified.');
}

// =========================================================================
// Test 5: Telegram-iOS #75 - CarPlay Audio Readout and Ducking
// =========================================================================
console.log('Testing Telegram-iOS #75: CarPlay audio readout and long text safety truncation...');
{
  // Short message
  const shortReadout = governor.prepareCarPlayReadout('Bob', 'See you at 5');
  assert.equal(shortReadout.speechPrompt, 'Bob says: See you at 5');
  assert.equal(shortReadout.shouldTruncateLongText, false);
  assert.equal(shortReadout.duckAudioCategory, 'AVAudioSessionCategoryPlaybackWithDuckOthers');

  // Long message (300 chars) -> Safe truncation for driving safety
  const longText = 'A'.repeat(300);
  const longReadout = governor.prepareCarPlayReadout('Bob', longText);
  assert.equal(longReadout.shouldTruncateLongText, true);
  assert.ok(longReadout.speechPrompt.endsWith('...'));
  console.log('✅ Telegram-iOS #75: CarPlay audio readout verified.');
}

// =========================================================================
// Test 6: Telegram-iOS #1673 - Notification Debounce and Burst Aggregation
// =========================================================================
console.log('Testing Telegram-iOS #1673: Notification burst aggregation and vibration suppression...');
{
  const chatId = 'chat_flood_999';

  // Message 1 of burst: First alert, sound enabled
  const burst1 = governor.processIncomingNotificationBurst(chatId, 'Dave', 'Hey');
  assert.equal(burst1.messageCount, 1);
  assert.equal(burst1.suppressSoundForBurst, false);

  // Message 2 of burst (rapid succession): Aggregated, sound suppressed
  const burst2 = governor.processIncomingNotificationBurst(chatId, 'Dave', 'Are you there?');
  assert.equal(burst2.messageCount, 2);
  assert.equal(burst2.suppressSoundForBurst, true);
  assert.ok(burst2.summaryText.includes('Dave sent 2 messages'));

  // Message 3 of burst
  const burst3 = governor.processIncomingNotificationBurst(chatId, 'Dave', 'Urgent!');
  assert.equal(burst3.messageCount, 3);
  assert.equal(burst3.suppressSoundForBurst, true);
  assert.ok(burst3.summaryText.includes('Dave sent 3 messages: Urgent!'));
  console.log('✅ Telegram-iOS #1673: Notification burst aggregation verified.');
}

// =========================================================================
// Test 7: Telegram-iOS #1301 - Phantom Push Deduplication and Suppression
// =========================================================================
console.log('Testing Telegram-iOS #1301: Phantom push suppression for already read/deleted messages...');
{
  // Case A: Normal unread push
  const resNormal = governor.shouldDisplayPushNotification('push_tok_1', false, false);
  assert.equal(resNormal.shouldDisplay, true);

  // Case B: Duplicate push token
  const resDup = governor.shouldDisplayPushNotification('push_tok_1', false, false);
  assert.equal(resDup.shouldDisplay, false);
  assert.ok(resDup.reason.includes('Duplicate APNS push'));

  // Case C: Message already read on another device
  const resRead = governor.shouldDisplayPushNotification('push_tok_2', true, false);
  assert.equal(resRead.shouldDisplay, false);
  assert.ok(resRead.reason.includes('already read'));

  // Case D: Message deleted on another device
  const resDeleted = governor.shouldDisplayPushNotification('push_tok_3', false, true);
  assert.equal(resDeleted.shouldDisplay, false);
  assert.ok(resDeleted.reason.includes('was deleted'));
  console.log('✅ Telegram-iOS #1301: Phantom push deduplication verified.');
}

console.log('🎉 Phase 160: All 7 Telegram iOS hardening tests PASSED with 100% precision!');
