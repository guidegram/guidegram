/**
 * Test Suite: Phase 107 AdBlock, Web Share URL & Message Radius Verification
 * 
 * Verifies fixes for:
 * - AyuGram/AyuGramDesktop #60: AdBlock for channel content (Filtering sponsored messages)
 * - AyuGram/AyuGramDesktop #462: Frequent crashes during daily usage + severe lag when blocked messages accumulate (Bounded buffer)
 * - morethanwords/tweb #346: [BUG] Cannot open https://telegram.me/share/?url=<message> with Telegram Web (Share URL decoder)
 * - kotatogram/kotatogram-desktop #389: no icon on taskbar onwayland (Wayland app_id mapping)
 * - TelegramMessenger/Telegram-iOS #791: Crashes on 32-bit legacy devices (Integer safe bounds)
 * - TDesktop-x64/tdesktop #248: Add Alt+Shift+Up/Down to cycle through your editable messages (Shortcut accelerator)
 * - TDesktop-x64/tdesktop #125: Add a "large message radius" toggle (Configurable bubble radius 4px - 18px)
 */

import assert from 'node:assert';
import { adBlockWebShareAndMessageRadiusGovernor } from '../src/services/adBlockWebShareAndMessageRadiusGovernor.ts';

console.log('🧪 Starting Phase 107 AdBlock, Web Share & Message Radius Verification Suite...');

// 1. Channel Content AdBlock & Sponsored Filtering
console.log('  Testing channel sponsored ad filtering...');
const normalMsg = {
  id: 1,
  chatId: 'chan_1',
  text: 'Regular post',
  isSponsored: false,
  senderId: 'admin',
  timestamp: Date.now(),
};
const sponsoredMsg = {
  id: 2,
  chatId: 'chan_1',
  text: 'Subscribe to external crypto channel!',
  isSponsored: true,
  senderId: 'sponsor_bot',
  timestamp: Date.now(),
};

assert.strictEqual(adBlockWebShareAndMessageRadiusGovernor.filterChannelMessage(normalMsg).shouldDisplay, true);
assert.strictEqual(adBlockWebShareAndMessageRadiusGovernor.filterChannelMessage(sponsoredMsg).shouldDisplay, false);
console.log('  ✅ Sponsored message filtering verified');

// 2. Blocked Message Buffer Memory Cap & Eviction
console.log('  Testing blocked message buffer high-watermark eviction...');
adBlockWebShareAndMessageRadiusGovernor.clearBlockedBuffer();

// Fill beyond max 500 buffer
for (let i = 0; i < 520; i++) {
  adBlockWebShareAndMessageRadiusGovernor.filterChannelMessage({
    id: 1000 + i,
    chatId: 'chan_spam',
    text: `Spam promo ${i}`,
    isSponsored: true,
    senderId: 'bot',
    timestamp: Date.now(),
  });
}

const bufferState = adBlockWebShareAndMessageRadiusGovernor.getBlockedBufferState();
assert.ok(bufferState.currentBufferSize <= 500);
assert.strictEqual(bufferState.evictedCount, 50); // Evicted first 50 when reaching 500
console.log('  ✅ Blocked message buffer memory bounds and eviction verified');

// 3. Web Share URL Parameter Parser
console.log('  Testing web share URL parameter parsing...');
const rawUrl = 'https://t.me/share/url?url=https%3A%2F%2Fguidegram.app&text=Check%20out%20Guidegram';
const parsedShare = adBlockWebShareAndMessageRadiusGovernor.parseShareUrl(rawUrl);
assert.strictEqual(parsedShare.isValid, true);
assert.strictEqual(parsedShare.url, 'https://guidegram.app');
assert.strictEqual(parsedShare.text, 'Check out Guidegram');
assert.strictEqual(parsedShare.fullSharedContent, 'Check out Guidegram\nhttps://guidegram.app');

const invalidShare = adBlockWebShareAndMessageRadiusGovernor.parseShareUrl('https://t.me/random');
assert.strictEqual(invalidShare.isValid, false);
console.log('  ✅ Web share URL parsing and content aggregation verified');

// 4. Wayland App ID Taskbar Integration
console.log('  Testing Wayland app_id desktop integration...');
const waylandConfig = adBlockWebShareAndMessageRadiusGovernor.configureWaylandIntegration(true);
assert.strictEqual(waylandConfig.appId, 'guidegram');
assert.strictEqual(waylandConfig.desktopFileName, 'guidegram.desktop');
assert.strictEqual(waylandConfig.iconResolved, true);
console.log('  ✅ Wayland desktop taskbar icon mapping verified');

// 5. 32-Bit Legacy Integer Safety Guard
console.log('  Testing 32-bit integer overflow protection...');
const safeInt = adBlockWebShareAndMessageRadiusGovernor.sanitizeInteger32(123456);
assert.strictEqual(safeInt.safeNumber, 123456);
assert.strictEqual(safeInt.isOverflowPrevented, false);

// 64-bit integer overflow on 32-bit pointer (e.g. 5000000000)
const overflowInt = adBlockWebShareAndMessageRadiusGovernor.sanitizeInteger32(5000000000);
assert.strictEqual(overflowInt.safeNumber, 2147483647);
assert.strictEqual(overflowInt.isOverflowPrevented, true);
console.log('  ✅ 32-bit architecture integer safety verified');

// 6. Editable Message Shortcut Cycler
console.log('  Testing editable message shortcut history navigation...');
adBlockWebShareAndMessageRadiusGovernor.registerEditableMessage('m1', 'First message');
adBlockWebShareAndMessageRadiusGovernor.registerEditableMessage('m2', 'Second message');
adBlockWebShareAndMessageRadiusGovernor.resetCycleIndex();

// Cycle up -> returns most recent ('Second message')
const cycle1 = adBlockWebShareAndMessageRadiusGovernor.cycleEditableMessage('up');
assert.strictEqual(cycle1.message?.text, 'Second message');

// Cycle up again -> returns older ('First message')
const cycle2 = adBlockWebShareAndMessageRadiusGovernor.cycleEditableMessage('up');
assert.strictEqual(cycle2.message?.text, 'First message');

// Cycle down -> returns back to 'Second message'
const cycle3 = adBlockWebShareAndMessageRadiusGovernor.cycleEditableMessage('down');
assert.strictEqual(cycle3.message?.text, 'Second message');
console.log('  ✅ Editable message keyboard cycling verified');

// 7. Message Bubble Radius Toggle
console.log('  Testing message bubble corner radius toggle...');
const compactRadius = adBlockWebShareAndMessageRadiusGovernor.setMessageBubbleRadius(false);
assert.strictEqual(compactRadius.radiusPx, 6);
assert.strictEqual(compactRadius.isLargeRadius, false);

const largeRadius = adBlockWebShareAndMessageRadiusGovernor.setMessageBubbleRadius(true);
assert.strictEqual(largeRadius.radiusPx, 16);
assert.strictEqual(largeRadius.isLargeRadius, true);
console.log('  ✅ Message bubble corner radius toggle verified');

console.log('✨ All Phase 107 Verification Tests Passed 100% Successfully!');
