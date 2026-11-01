import assert from 'node:assert/strict';
import { IosKeyboardBadgeAudioAndScrollGovernor } from '../src/services/iosKeyboardBadgeAudioAndScrollGovernor.ts';

console.log('🧪 Starting Phase 157: Telegram iOS Keyboard, Badge, Audio, and Scroll Hardening Test Suite...');

const governor = new IosKeyboardBadgeAudioAndScrollGovernor();

// =========================================================================
// Test 1: Telegram-iOS #797 - Virtual Keyboard Height Offset Calculation
// =========================================================================
console.log('Testing Telegram-iOS #797: Virtual keyboard viewport offset and composer margin...');
{
  // Normal state: full window, no keyboard
  const stateNoKb = governor.calculateKeyboardOffset(844, 844, 0);
  assert.equal(stateNoKb.keyboardHeight, 0);
  assert.equal(stateNoKb.composerBottomMargin, 0);
  assert.equal(stateNoKb.isKeyboardOpen, false);

  // Keyboard appears on iPadOS / iOS: visual viewport shrinks to 500px, 344px keyboard
  const stateKb = governor.calculateKeyboardOffset(844, 500, 0);
  assert.equal(stateKb.keyboardHeight, 344);
  assert.equal(stateKb.composerBottomMargin, 344);
  assert.equal(stateKb.isKeyboardOpen, true);
  console.log('✅ Telegram-iOS #797: Virtual keyboard viewport offset verified.');
}

// =========================================================================
// Test 2: Telegram-iOS #645 - Phantom Ghost Badge Reconciliation
// =========================================================================
console.log('Testing Telegram-iOS #645: Phantom unread badge detection and reconciliation...');
{
  // Case A: App icon badge is stuck at 3, but all active chats have 0 unread
  const chatsAllRead = [
    { chatId: 'c1', unreadCount: 0 },
    { chatId: 'c2', unreadCount: 0 }
  ];
  const resGhost = governor.reconcileUnreadBadgeCount(3, chatsAllRead);
  assert.equal(resGhost.hasGhostBadge, true);
  assert.equal(resGhost.reconciledUnreadCount, 0);
  assert.equal(resGhost.phantomCountCleaned, 3);

  // Case B: Legitimate unread chats
  const chatsUnread = [
    { chatId: 'c1', unreadCount: 2 },
    { chatId: 'c2', unreadCount: 1 }
  ];
  const resNormal = governor.reconcileUnreadBadgeCount(3, chatsUnread);
  assert.equal(resNormal.hasGhostBadge, false);
  assert.equal(resNormal.reconciledUnreadCount, 3);
  assert.equal(resNormal.phantomCountCleaned, 0);
  console.log('✅ Telegram-iOS #645: Ghost badge reconciliation verified.');
}

// =========================================================================
// Test 3: Telegram-iOS #462 - Custom Notification Tones and Push Limit
// =========================================================================
console.log('Testing Telegram-iOS #462: Custom notification tones and iOS 30s limit validation...');
{
  // Valid custom tone
  const validTone = governor.registerCustomTone({
    toneId: 'bell_chime',
    name: 'Bell Chime',
    format: 'm4a',
    durationMs: 4500,
    filePath: '/tones/bell.m4a'
  });
  assert.equal(validTone.success, true);

  // Set tone for chat
  const assigned = governor.setChatTone('chat_vip', 'bell_chime');
  assert.equal(assigned, true);
  const fetched = governor.getChatTone('chat_vip');
  assert.equal(fetched.toneId, 'bell_chime');

  // Invalid: exceeds 30-second iOS push sound limit (e.g. 45 seconds)
  const tooLongTone = governor.registerCustomTone({
    toneId: 'song',
    name: 'Long Song',
    format: 'mp3',
    durationMs: 45000,
    filePath: '/tones/song.mp3'
  });
  assert.equal(tooLongTone.success, false);
  assert.ok(tooLongTone.error?.includes('exceeds iOS 30-second push limit'));
  console.log('✅ Telegram-iOS #462: Custom notification tones verified.');
}

// =========================================================================
// Test 4: Telegram-iOS #238 - Physical Bluetooth Keyboard Input Shortcuts
// =========================================================================
console.log('Testing Telegram-iOS #238: Physical keyboard input shortcuts and send mode...');
{
  // Default: enter_to_send
  const sendRes = governor.handlePhysicalKeyboardInput({
    key: 'Enter',
    code: 'Enter',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    composerText: 'Hello world'
  });
  assert.equal(sendRes.action, 'send');

  // Shift+Enter creates newline
  const newlineRes = governor.handlePhysicalKeyboardInput({
    key: 'Enter',
    code: 'Enter',
    metaKey: false,
    ctrlKey: false,
    shiftKey: true,
    altKey: false,
    composerText: 'Line 1'
  });
  assert.equal(newlineRes.action, 'newline');
  assert.equal(newlineRes.newText, 'Line 1\n');

  // Switch mode to cmd_enter_to_send
  governor.setSendShortcutPreference('cmd_enter_to_send');
  const enterOnly = governor.handlePhysicalKeyboardInput({
    key: 'Enter',
    code: 'Enter',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    composerText: 'Line 1'
  });
  assert.equal(enterOnly.action, 'newline'); // In cmd mode, plain Enter is newline

  const cmdEnter = governor.handlePhysicalKeyboardInput({
    key: 'Enter',
    code: 'Enter',
    metaKey: true, // Cmd key on iPad
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    composerText: 'Line 1'
  });
  assert.equal(cmdEnter.action, 'send');

  // Arrow up on empty text recalls last message for edit
  const arrowUp = governor.handlePhysicalKeyboardInput({
    key: 'ArrowUp',
    code: 'ArrowUp',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    composerText: ''
  });
  assert.equal(arrowUp.action, 'edit_last_message');
  console.log('✅ Telegram-iOS #238: Physical keyboard shortcuts verified.');
}

// =========================================================================
// Test 5: Telegram-iOS #139 - Channel Metadata Sanitizer (Unpaired Surrogates)
// =========================================================================
console.log('Testing Telegram-iOS #139: Channel metadata surrogate repair and truncation...');
{
  // String with unpaired high surrogate '\uD800' (broken emoji)
  const corruptTitle = 'Awesome Channel \uD800 broken';
  const sanitized = governor.sanitizeChannelMetadata(corruptTitle, 'Clean channel description');
  assert.equal(sanitized.hasUnpairedSurrogates, true);
  assert.ok(!sanitized.title.includes('\uD800'));
  assert.ok(sanitized.title.includes('\uFFFD')); // Replaced with Unicode replacement char

  // Excessive length truncation
  const longAbout = 'A'.repeat(1200);
  const truncated = governor.sanitizeChannelMetadata('Normal Title', longAbout);
  assert.equal(truncated.wasTruncated, true);
  assert.equal(truncated.about.length, 1024);
  console.log('✅ Telegram-iOS #139: Channel metadata sanitizer verified.');
}

// =========================================================================
// Test 6: Telegram-iOS #1045 - M4A Audio Playback Preparation
// =========================================================================
console.log('Testing Telegram-iOS #1045: M4A/AAC audio decode and duration estimation...');
{
  // User gesture unlocks audio context
  governor.unlockAudioContextOnUserGesture();

  const m4aStatus = governor.prepareM4aAudioPlayback('audio/m4a', 64000); // 64000 bytes at 8000 B/s = 8 seconds
  assert.equal(m4aStatus.canPlay, true);
  assert.equal(m4aStatus.format, 'm4a');
  assert.equal(m4aStatus.isAudioContextUnlocked, true);
  assert.equal(m4aStatus.durationSeconds, 8);

  // Empty payload error handling
  const emptyStatus = governor.prepareM4aAudioPlayback('audio/m4a', 0);
  assert.equal(emptyStatus.canPlay, false);
  assert.equal(emptyStatus.error, 'Empty audio file payload');
  console.log('✅ Telegram-iOS #1045: M4A audio playback preparation verified.');
}

// =========================================================================
// Test 7: Telegram-iOS #1070 - Mini App Nested Scroll Containment
// =========================================================================
console.log('Testing Telegram-iOS #1070: Mini App nested scroll containment and sheet dismiss suppression...');
{
  // Scrolling in middle of list (scrollTop = 150): dismiss must be suppressed
  const midScroll = governor.evaluateNestedScrollTouch(150, 1000, 400, -20);
  assert.equal(midScroll.allowInternalScroll, true);
  assert.equal(midScroll.suppressBottomSheetDismiss, true);

  // At top of list pulling down (touchDeltaY > 0): bottom sheet dismiss allowed if desired
  const topPullDown = governor.evaluateNestedScrollTouch(0, 1000, 400, 30);
  assert.equal(topPullDown.suppressBottomSheetDismiss, false);
  console.log('✅ Telegram-iOS #1070: Mini App nested scroll containment verified.');
}

console.log('🎉 Phase 157: All 7 Telegram iOS hardening tests PASSED with 100% precision!');
