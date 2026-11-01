import assert from 'node:assert/strict';
import { IosKeyboardMiniAppDiceAndQuoteGovernor } from '../src/services/iosKeyboardMiniAppDiceAndQuoteGovernor.ts';

console.log('🧪 Starting Phase 165: Telegram iOS Keyboard, Mini App, Dice, and Quote Hardening Test Suite...');

const governor = new IosKeyboardMiniAppDiceAndQuoteGovernor();

// =========================================================================
// Test 1: Telegram-iOS #1385 - Mini App Keyboard Done Accessory Bar
// =========================================================================
console.log('Testing Telegram-iOS #1385: Mini App input focus and Done accessory toolbar...');
{
  const focused = governor.evaluateKeyboardAccessory(true);
  assert.equal(focused.showDoneAccessoryBar, true);
  assert.equal(focused.accessoryHeightPx, 44);

  const blurred = governor.evaluateKeyboardAccessory(false);
  assert.equal(blurred.showDoneAccessoryBar, false);
  assert.equal(blurred.accessoryHeightPx, 0);
  console.log('✅ Telegram-iOS #1385: Mini App keyboard accessory verified.');
}

// =========================================================================
// Test 2: Telegram-iOS #1122 - Chat Scroll Keyboard Dismissal
// =========================================================================
console.log('Testing Telegram-iOS #1122: Keyboard dismissal on chat list drag scroll...');
{
  // User drags downwards by 35px while keyboard is open -> dismiss keyboard
  const dragDismiss = governor.handleChatListDrag(35, true);
  assert.equal(dragDismiss.dismissKeyboard, true);
  assert.equal(dragDismiss.reason, 'drag_scroll_threshold_exceeded');

  // Small jitter drag (5px) -> do not dismiss
  const smallDrag = governor.handleChatListDrag(5, true);
  assert.equal(smallDrag.dismissKeyboard, false);

  // Keyboard already closed
  const noKb = governor.handleChatListDrag(50, false);
  assert.equal(noKb.dismissKeyboard, false);
  console.log('✅ Telegram-iOS #1122: Chat scroll keyboard dismiss verified.');
}

// =========================================================================
// Test 3: Telegram-iOS #2420 - Mini App Header Glass Contrast
// =========================================================================
console.log('Testing Telegram-iOS #2420: Header button glass contrast calculation...');
{
  // Dark header color (#111827)
  const darkHeader = governor.calculateHeaderGlassStyle('#111827');
  assert.equal(darkHeader.isDarkHeader, true);
  assert.equal(darkHeader.iconColor, '#ffffff'); // White icon on dark header!
  assert.ok(darkHeader.buttonGlassBackground.includes('255, 255, 255'));

  // Light header color (#f3f4f6)
  const lightHeader = governor.calculateHeaderGlassStyle('#f3f4f6');
  assert.equal(lightHeader.isDarkHeader, false);
  assert.equal(lightHeader.iconColor, '#000000'); // Black icon on light header!
  assert.ok(lightHeader.buttonGlassBackground.includes('0, 0, 0'));
  console.log('✅ Telegram-iOS #2420: Header glass contrast verified.');
}

// =========================================================================
// Test 4: Telegram-iOS #2419 - Short List Overscroll Clamping
// =========================================================================
console.log('Testing Telegram-iOS #2419: Excessive upward scrolling prevention on short lists...');
{
  const totalContentHeight = 150; // Only 2 chats (~150px)
  const viewportHeight = 700;

  // Excessive pull down of 200px -> clamped to 40px
  const pullExcess = governor.clampShortListOverscroll(totalContentHeight, viewportHeight, 200);
  assert.equal(pullExcess.clampedOffset, 40);
  assert.equal(pullExcess.excessiveScrollingPrevented, true);

  // Normal pull of 20px -> allowed
  const pullNormal = governor.clampShortListOverscroll(totalContentHeight, viewportHeight, 20);
  assert.equal(pullNormal.clampedOffset, 20);
  assert.equal(pullNormal.excessiveScrollingPrevented, false);
  console.log('✅ Telegram-iOS #2419: Short list overscroll clamping verified.');
}

// =========================================================================
// Test 5: Telegram-iOS #2407 - Animated Dice State Machine
// =========================================================================
console.log('Testing Telegram-iOS #2407: Animated dice roll and outcome frame landing...');
{
  const dice = governor.initializeDiceAnimation('🎲', 5);
  assert.equal(dice.emoji, '🎲');
  assert.equal(dice.outcomeValue, 5);
  assert.equal(dice.isCompleted, false);

  // Animation finishes after 1200ms
  const completed = governor.completeDiceAnimation(dice);
  assert.equal(completed.isCompleted, true);
  assert.equal(completed.currentFrame, 5); // Landed exactly on outcome frame 5
  console.log('✅ Telegram-iOS #2407: Animated dice state machine verified.');
}

// =========================================================================
// Test 6: Telegram-iOS #2393 - Expandable Quote Multi-line Line Breaks
// =========================================================================
console.log('Testing Telegram-iOS #2393: Multi-line line breaks in expandable blockquotes...');
{
  const multiline = 'First paragraph.\nSecond paragraph.\nThird paragraph.\nFourth paragraph.\nFifth paragraph.';

  // Collapsed state: shows top 3 lines, preserves line breaks
  const collapsed = governor.renderExpandableQuote(multiline, false);
  assert.equal(collapsed.isExpandable, true);
  assert.equal(collapsed.isExpanded, false);
  assert.equal(collapsed.formattedHtmlOrLines.length, 3);
  assert.equal(collapsed.formattedHtmlOrLines[0], 'First paragraph.');
  assert.equal(collapsed.formattedHtmlOrLines[1], 'Second paragraph.');

  // Expanded state: shows all 5 lines
  const expanded = governor.renderExpandableQuote(multiline, true);
  assert.equal(expanded.isExpanded, true);
  assert.equal(expanded.formattedHtmlOrLines.length, 5);
  console.log('✅ Telegram-iOS #2393: Expandable quote line breaks verified.');
}

// =========================================================================
// Test 7: Telegram-iOS #1158 - Video Duration Badge Formatter
// =========================================================================
console.log('Testing Telegram-iOS #1158: Video duration badge calculation and formatting...');
{
  // 135 seconds = 2 min 15 sec -> "02:15"
  const shortVid = governor.formatVideoDurationBadge(135);
  assert.equal(shortVid.formattedBadge, '02:15');
  assert.equal(shortVid.isOverOneHour, false);

  // 3665 seconds = 1 hr 1 min 5 sec -> "1:01:05"
  const longVid = governor.formatVideoDurationBadge(3665);
  assert.equal(longVid.formattedBadge, '1:01:05');
  assert.equal(longVid.isOverOneHour, true);
  console.log('✅ Telegram-iOS #1158: Video duration badge verified.');
}

console.log('🎉 Phase 165: All 7 Telegram iOS hardening tests PASSED with 100% precision!');
