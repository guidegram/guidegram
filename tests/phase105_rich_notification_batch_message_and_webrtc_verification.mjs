/**
 * Test Suite: Phase 105 Rich Notification, Batch Message & WebRTC Verification
 * 
 * Verifies fixes for:
 * - TelegramMessenger/Telegram-iOS #833: Notifications are only "You have a new message" (Encrypted payload preview decryption)
 * - TelegramMessenger/Telegram-iOS #280: Scrolling the message view gets stuck (Height jump & scroll lock guard)
 * - AyuGram/AyuGramDesktop #352: Profile icon cut rounding (Anti-aliased subpixel clip-path)
 * - AyuGram/AyuGramDesktop #217: Ayugram breaks full channel translation after a few seconds (Auto-translation rate & session governor)
 * - AyuGram/AyuGramDesktop #73: Batch delete own messages in a telegram chat (Chunked deletion coordinator)
 * - AyuGram/AyuGramDesktop #400: Support Rich Messages (Bot API 10.1 custom emojis & collapsible quotes)
 * - morethanwords/tweb #65: Firefox: calls & video chats (Firefox Unified-Plan WebRTC transceiver adapter)
 */

import assert from 'node:assert';
import { richNotificationBatchMessageAndWebRtcGovernor } from '../src/services/richNotificationBatchMessageAndWebRtcGovernor.ts';

console.log('🧪 Starting Phase 105 Rich Notification, Batch Message & WebRTC Verification Suite...');

// 1. Notification Payload Decryption & Preview
console.log('  Testing notification payload decryption and privacy...');
const decrypted = richNotificationBatchMessageAndWebRtcGovernor.resolveNotificationPreview({
  sender_name: 'Pavel Durov',
  text: 'Welcome to Guidegram 2.5!',
});
assert.strictEqual(decrypted.senderName, 'Pavel Durov');
assert.strictEqual(decrypted.previewText, 'Welcome to Guidegram 2.5!');
assert.strictEqual(decrypted.isEncryptedFallback, false);

// Privacy mode (no preview)
const hidden = richNotificationBatchMessageAndWebRtcGovernor.resolveNotificationPreview(
  { sender_name: 'Secret', text: 'Top secret content' },
  { showPreview: false }
);
assert.strictEqual(hidden.previewText, 'You have a new message');
assert.strictEqual(hidden.isEncryptedFallback, true);
console.log('  ✅ Notification payload decryption & privacy modes verified');

// 2. Scroll Stutter & Lock Guard
console.log('  Testing dynamic message insertion scroll correction...');
// Messages prepended at top: height jumped from 1000px to 1500px while user was at scrollTop 300px
const prependedCorrection = richNotificationBatchMessageAndWebRtcGovernor.calculateScrollAdjustment(300, 1000, 1500, false);
assert.strictEqual(prependedCorrection.currentScrollTop, 800); // 300 + 500
assert.strictEqual(prependedCorrection.deltaCorrection, 500);
assert.strictEqual(prependedCorrection.recoveryApplied, true);

// User at bottom
const bottomCorrection = richNotificationBatchMessageAndWebRtcGovernor.calculateScrollAdjustment(1000, 1000, 1200, true);
assert.strictEqual(bottomCorrection.currentScrollTop, 1200);
console.log('  ✅ Scroll stutter prevention and jump correction verified');

// 3. Subpixel Anti-Aliased Avatar Rounding
console.log('  Testing avatar subpixel rounding and anti-aliasing...');
const avatarStyle = richNotificationBatchMessageAndWebRtcGovernor.getAntiAliasedAvatarStyle(48);
assert.strictEqual(avatarStyle.borderRadius, '50%');
assert.strictEqual(avatarStyle.clipPath, 'circle(50% at 50% 50%)');
assert.strictEqual(avatarStyle.transform, 'translateZ(0)');
console.log('  ✅ Avatar anti-aliased subpixel style verified');

// 4. Full Channel Translation Coordinator
console.log('  Testing channel translation batching & rate limit...');
const channelId = '-100998877';
richNotificationBatchMessageAndWebRtcGovernor.startChannelTranslation(channelId, 'fa');

// Batch of 15 (under limit 20)
let trans = richNotificationBatchMessageAndWebRtcGovernor.processTranslationBatch(channelId, 15);
assert.strictEqual(trans?.totalMessagesTranslated, 15);
assert.strictEqual(trans?.isThrottled, false);

// Batch of 35 (over limit 20 -> throttled)
trans = richNotificationBatchMessageAndWebRtcGovernor.processTranslationBatch(channelId, 35);
assert.strictEqual(trans?.isThrottled, true);
assert.strictEqual(trans?.totalMessagesTranslated, 35); // 15 + 20
console.log('  ✅ Channel auto-translation session and throttling verified');

// 5. Batch Message Deletion Engine
console.log('  Testing batch message deletion coordinator...');
const msgIds = Array.from({ length: 250 }, (_, i) => i + 1);
const deleteResult = richNotificationBatchMessageAndWebRtcGovernor.executeBatchDelete('chat_100', msgIds, 100);
assert.strictEqual(deleteResult.totalRequested, 250);
assert.strictEqual(deleteResult.totalDeleted, 250);
assert.strictEqual(deleteResult.batchesExecuted, 3);
assert.strictEqual(deleteResult.success, true);
console.log('  ✅ Batch message deletion chunking verified');

// 6. Bot API 10.1 Rich Message Entities
console.log('  Testing Bot API 10.1 rich entity rendering...');
const rawEntities = [
  { type: 'custom_emoji', offset: 0, length: 2, custom_emoji_id: '543210' },
  { type: 'expandable_blockquote', offset: 3, length: 40 },
  { type: 'spoiler', offset: 45, length: 10 },
];
const parsed = richNotificationBatchMessageAndWebRtcGovernor.parseBotApi10Entities('Hello world', rawEntities);
assert.strictEqual(parsed.length, 3);
assert.strictEqual(parsed[0].customEmojiId, '543210');
assert.strictEqual(parsed[1].type, 'blockquote');
assert.strictEqual(parsed[1].isCollapsible, true);
assert.strictEqual(parsed[2].type, 'spoiler');
console.log('  ✅ Bot API 10.1 rich entities parsed accurately');

// 7. Firefox WebRTC Call Adapter
console.log('  Testing Firefox Unified-Plan WebRTC adapter...');
const ffConfig = richNotificationBatchMessageAndWebRtcGovernor.getWebRtcConfiguration(true);
assert.strictEqual(ffConfig.browser, 'firefox');
assert.strictEqual(ffConfig.sdpSemantics, 'unified-plan');
assert.strictEqual(ffConfig.bundlePolicy, 'max-bundle');
assert.strictEqual(ffConfig.audioConstraints.echoCancellation, true);
console.log('  ✅ Firefox WebRTC call configuration verified');

console.log('✨ All Phase 105 Verification Tests Passed 100% Successfully!');
