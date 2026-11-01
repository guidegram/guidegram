import assert from 'node:assert/strict';
import { IosBrowserFormattingStickerBadgeAndMiniAppGovernor } from '../src/services/iosBrowserFormattingStickerBadgeAndMiniAppGovernor.ts';

console.log('🧪 Starting Phase 155: Telegram iOS In-App Browser, Formatting, Sticker, Badge, and Mini App Test Suite...');

const governor = new IosBrowserFormattingStickerBadgeAndMiniAppGovernor({
  appVersion: '1.2.3',
  osVersion: 'iOS 16.4',
  deviceModel: 'iPhone 14 Pro',
  partnerDomains: ['guidegram.org', 't.me']
});

// =========================================================================
// Test 1: Telegram-iOS #736 - In-App Browser User-Agent and Scheme Interception
// =========================================================================
console.log('Testing Telegram-iOS #736: In-app browser user agent and partner headers...');
{
  // Partner URL
  const resPartner = governor.generateInAppUserAgent({
    targetUrl: 'https://guidegram.org/welcome',
    isExternalLink: false
  });
  assert.equal(resPartner.shouldOpenInExternalBrowser, false);
  assert.ok(resPartner.userAgent.includes('Guidegram/1.2.3'));
  assert.ok(resPartner.userAgent.includes('iPhone 14 Pro'));
  assert.equal(resPartner.customHeaders['X-Guidegram-Client-Version'], '1.2.3');

  // External URL
  const resExternal = governor.generateInAppUserAgent({
    targetUrl: 'https://example.com/article',
    isExternalLink: true
  });
  assert.equal(resExternal.shouldOpenInExternalBrowser, true);

  // App protocol scheme
  const resScheme = governor.generateInAppUserAgent({
    targetUrl: 'tg://resolve?domain=test',
    isExternalLink: false
  });
  assert.equal(resScheme.shouldOpenInExternalBrowser, true);
  console.log('✅ Telegram-iOS #736: In-app browser User-Agent verified.');
}

// =========================================================================
// Test 2: Telegram-iOS #837 - Rich Text Formatting Range and Toggle
// =========================================================================
console.log('Testing Telegram-iOS #837: Rich text formatting and markdown entity injection...');
{
  const text = 'Hello awesome world';
  // Apply bold to "awesome" (index 6 to 13)
  const boldRes = governor.applyFormattingToRange(text, 6, 13, 'bold');
  assert.equal(boldRes.formattedText, 'Hello **awesome** world');
  assert.equal(boldRes.newSelectionStart, 8);
  assert.equal(boldRes.newSelectionEnd, 15);

  // Apply spoiler to "world" in already bold text
  const spoilerRes = governor.applyFormattingToRange(boldRes.formattedText, 18, 23, 'spoiler');
  assert.equal(spoilerRes.formattedText, 'Hello **awesome** ||world||');

  // Toggle off bold
  const unwrapRes = governor.applyFormattingToRange(boldRes.formattedText, 6, 17, 'bold');
  assert.equal(unwrapRes.formattedText, 'Hello awesome world');
  console.log('✅ Telegram-iOS #837: Rich text formatting range verified.');
}

// =========================================================================
// Test 3: Telegram-iOS #755 - Horizontal Sticker Pack Scrolling Synchronization
// =========================================================================
console.log('Testing Telegram-iOS #755: Sticker pack scroll sync and clamping...');
{
  const packs = [
    { id: 'pack_1', title: 'Ducks', thumbnailUrl: '', sectionOffsetTop: 0, itemCount: 20 },
    { id: 'pack_2', title: 'Cats', thumbnailUrl: '', sectionOffsetTop: 450, itemCount: 25 },
    { id: 'pack_3', title: 'Memes', thumbnailUrl: '', sectionOffsetTop: 950, itemCount: 30 }
  ];

  // At top
  const sync0 = governor.calculateStickerPackSync(packs, 0, 600);
  assert.equal(sync0.activePackIndex, 0);
  assert.equal(sync0.activePackId, 'pack_1');

  // Scrolled down into Cats section
  const syncCats = governor.calculateStickerPackSync(packs, 500, 600);
  assert.equal(syncCats.activePackIndex, 1);
  assert.equal(syncCats.activePackId, 'pack_2');

  // Deep scroll into Memes section
  const syncMemes = governor.calculateStickerPackSync(packs, 1200, 600);
  assert.equal(syncMemes.activePackIndex, 2);
  assert.equal(syncMemes.activePackId, 'pack_3');
  console.log('✅ Telegram-iOS #755: Sticker pack scroll sync verified.');
}

// =========================================================================
// Test 4: Telegram-iOS #1461 - App Icon Badge Counter Calculation
// =========================================================================
console.log('Testing Telegram-iOS #1461: App icon badge calculation with muted chats and mentions...');
{
  const chats = [
    { chatId: '1', isMuted: false, unreadCount: 5, unreadMentions: 0, unreadReactions: 0 },
    { chatId: '2', isMuted: true, unreadCount: 20, unreadMentions: 2, unreadReactions: 1 },
    { chatId: '3', isMuted: false, unreadCount: 3, unreadMentions: 1, unreadReactions: 0 }
  ];

  // Standard: exclude muted chats, count unread messages, but include mentions/reactions in muted chats
  const badgeStandard = governor.calculateAppBadgeCount(chats, {
    includeMutedChats: false,
    countUnreadMessagesVsChats: 'messages',
    includeUnreadMentionsAndReactions: true
  });
  // Chat 1: 5 unread
  // Chat 2 (muted): 2 mentions + 1 reaction = 3
  // Chat 3: 3 unread
  // Total = 5 + 3 + 3 = 11
  assert.equal(badgeStandard, 11);

  // Chat count mode (count chats with unread messages, not total messages)
  const badgeChats = governor.calculateAppBadgeCount(chats, {
    includeMutedChats: false,
    countUnreadMessagesVsChats: 'chats',
    includeUnreadMentionsAndReactions: false
  });
  // Chat 1: 1 (has unread)
  // Chat 2 (muted): 0 (muted, mentions excluded)
  // Chat 3: 1 (has unread)
  // Total = 2
  assert.equal(badgeChats, 2);
  console.log('✅ Telegram-iOS #1461: App icon badge counter verified.');
}

// =========================================================================
// Test 5: Telegram-iOS #808 - Quick Reaction Double-Tap Toggle
// =========================================================================
console.log('Testing Telegram-iOS #808: Quick reaction toggle and double-tap suppression...');
{
  governor.setQuickReactionConfig(true, '🔥');
  const resEnabled = governor.handleDoubleTapReaction('msg_100');
  assert.equal(resEnabled.actionTriggered, 'react');
  assert.equal(resEnabled.emoji, '🔥');

  // Disable quick reaction to avoid accidental double-taps
  governor.setQuickReactionConfig(false);
  const resDisabled = governor.handleDoubleTapReaction('msg_100');
  assert.equal(resDisabled.actionTriggered, 'open_menu');
  assert.equal(resDisabled.emoji, undefined);
  console.log('✅ Telegram-iOS #808: Quick reaction toggle verified.');
}

// =========================================================================
// Test 6: Telegram-iOS #161 - Channel Restriction and Sensitive Content
// =========================================================================
console.log('Testing Telegram-iOS #161: Channel restriction evaluation and sensitivity bypass...');
{
  const restrictions = [
    { platform: 'ios', reason: 'pornography', description: 'Explicit material' }
  ];

  // Default: sensitive content disabled on iOS -> access denied
  governor.setSensitiveContentFilter(false);
  const checkDenied = governor.checkChannelAccess(restrictions, 'ios');
  assert.equal(checkDenied.canAccess, false);
  assert.ok(checkDenied.restrictionNotice?.includes('contains sensitive content'));

  // With user bypass enabled
  governor.setSensitiveContentFilter(true);
  const checkAllowed = governor.checkChannelAccess(restrictions, 'ios');
  assert.equal(checkAllowed.canAccess, true);
  assert.equal(checkAllowed.displayWarning, true);

  // On Web platform -> Allowed with warning
  const checkWeb = governor.checkChannelAccess(restrictions, 'web');
  assert.equal(checkWeb.canAccess, true);
  console.log('✅ Telegram-iOS #161: Channel restriction evaluation verified.');
}

// =========================================================================
// Test 7: Telegram-iOS #1377 - Mini App Safe Area Insets and CSS Variables
// =========================================================================
console.log('Testing Telegram-iOS #1377: Mini App safe area insets and CSS variables...');
{
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };
  const res = governor.computeMiniAppSafeAreaCssVariables(insets, true);

  assert.equal(res.cssVariables['--tg-safe-area-inset-top'], '47px');
  assert.equal(res.cssVariables['--tg-safe-area-inset-bottom'], '34px');
  assert.equal(res.cssVariables['--tg-content-safe-area-inset-top'], '47px');
  assert.equal(res.cssVariables['--tg-content-safe-area-inset-bottom'], '34px');

  assert.equal(res.viewportChangeEvent.isStateStable, true);
  assert.equal(res.viewportChangeEvent.isExpanded, true);
  assert.deepEqual(res.viewportChangeEvent.safeAreaInsets, insets);
  console.log('✅ Telegram-iOS #1377: Mini App safe area insets verified.');
}

console.log('🎉 Phase 155: All 7 Telegram iOS hardening tests PASSED with 100% precision!');
