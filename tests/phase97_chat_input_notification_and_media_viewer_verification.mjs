/**
 * Test Suite: Phase 97 Chat Input, Notification Deep-Link & Media Viewer Verification
 * 
 * Verifies fixes for:
 * - Ajaxy/telegram-tt #127: Mention at start of group message stalls incoming message listener
 * - Ajaxy/telegram-tt #71: Duplicate message dispatch on special characters/IME endings (^^)
 * - Ajaxy/telegram-tt #105: Inability to resize dialog list / sidebar width
 * - Ajaxy/telegram-tt #161: Fullscreen media viewer for images and videos with keyboard controls
 * - Ajaxy/telegram-tt #44: Audio player 404 error handling with stream fallback and cache
 * - UnigramDev/Unigram #1521: Action Center notification click failing to route to source channel/message
 * - tdlib/td #2715: Receive updates stream clogging under high event throughput
 */

import assert from 'node:assert';
import { chatInputNotificationAndMediaViewerGovernor } from '../src/services/chatInputNotificationAndMediaViewerGovernor.ts';

console.log('🧪 Starting Phase 97 Chat Input, Notification & Media Viewer Verification Suite...');

// 1. Mention parsing at start of message
console.log('  Testing safe mention parsing at index 0...');
const textWithInitialMention = '@durov hello world, checking message dispatch';
const mentions = chatInputNotificationAndMediaViewerGovernor.parseMentionsSafely(textWithInitialMention);
assert.strictEqual(mentions.length, 1);
assert.strictEqual(mentions[0].username, 'durov');
assert.strictEqual(mentions[0].offset, 0);

const dispatch1 = chatInputNotificationAndMediaViewerGovernor.dispatchMessageInput(
  'chat_group_100',
  textWithInitialMention
);
assert.strictEqual(dispatch1.accepted, true);
assert.strictEqual(dispatch1.mentions.length, 1);
assert.strictEqual(dispatch1.duplicateBlocked, false);
console.log('  ✅ Initial mention parsed safely without stream stalls');

// 2. Duplicate dispatch on ^^ endings and IME composition
console.log('  Testing duplicate dispatch prevention (^^ / IME)...');
const textWithCarets = 'Thanks for your help ^^';
const firstSend = chatInputNotificationAndMediaViewerGovernor.dispatchMessageInput(
  'chat_group_100',
  textWithCarets,
  { clientTime: 1000 }
);
assert.strictEqual(firstSend.accepted, true);

// Rapid second send with exact same text
const secondSend = chatInputNotificationAndMediaViewerGovernor.dispatchMessageInput(
  'chat_group_100',
  textWithCarets,
  { clientTime: 1200 }
);
assert.strictEqual(secondSend.accepted, false);
assert.strictEqual(secondSend.duplicateBlocked, true);
assert.strictEqual(secondSend.reason, 'duplicate_blocked_within_cooldown');

// IME composition active check
const imeSend = chatInputNotificationAndMediaViewerGovernor.dispatchMessageInput(
  'chat_group_100',
  'Typing in progress...',
  { isComposing: true }
);
assert.strictEqual(imeSend.accepted, false);
assert.strictEqual(imeSend.reason, 'ime_composition_active');
console.log('  ✅ IME composition and rapid duplicate dispatch blocked');

// 3. Resizable Dialog Layout
console.log('  Testing resizable dialog layout clamping & toggle...');
const initialLayout = chatInputNotificationAndMediaViewerGovernor.getDialogLayout();
assert.strictEqual(initialLayout.width, 360);

const resized = chatInputNotificationAndMediaViewerGovernor.setDialogWidth(500);
assert.strictEqual(resized.width, 500);

// Clamp to max
const clampedMax = chatInputNotificationAndMediaViewerGovernor.setDialogWidth(1200);
assert.strictEqual(clampedMax.width, 600);

// Clamp to min
const clampedMin = chatInputNotificationAndMediaViewerGovernor.setDialogWidth(100);
assert.strictEqual(clampedMin.width, 260);
assert.strictEqual(clampedMin.isCollapsed, true);
console.log('  ✅ Resizable dialog width clamped and persisted');

// 4. Fullscreen Media Viewer
console.log('  Testing fullscreen media viewer lifecycle and hotkeys...');
const media = chatInputNotificationAndMediaViewerGovernor.openFullscreenMedia(
  'https://cdn.guidegram.app/media/photo_123.jpg',
  'image',
  1.77
);
assert.strictEqual(media.isOpen, true);
assert.strictEqual(media.isFullscreen, true);
assert.strictEqual(media.zoomLevel, 1.0);

// Zoom in
const zoomResult = chatInputNotificationAndMediaViewerGovernor.handleViewerKeyEvent('+');
assert.strictEqual(zoomResult.handled, true);
assert.strictEqual(zoomResult.state.zoomLevel, 1.25);

// Escape key to close
const escResult = chatInputNotificationAndMediaViewerGovernor.handleViewerKeyEvent('Escape');
assert.strictEqual(escResult.handled, true);
assert.strictEqual(escResult.state.isOpen, false);
assert.strictEqual(escResult.state.isFullscreen, false);
console.log('  ✅ Fullscreen media viewer and hotkey navigation verified');

// 5. Audio Player 404 Fallback
console.log('  Testing audio player 404 handling and cached fallback...');
const trackId = 'voice_note_99';
const primaryUrl = 'https://stream.guidegram.app/voice_note_99.ogg';
const cachedFallback = 'blob:guidegram/voice_cache_99';

chatInputNotificationAndMediaViewerGovernor.registerAudioFallback(trackId, cachedFallback);

// Play with simulated 404
const audioPlay = chatInputNotificationAndMediaViewerGovernor.playAudio(trackId, primaryUrl, 404);
assert.strictEqual(audioPlay.status, 'fallback_playing');
assert.strictEqual(audioPlay.url, cachedFallback);
assert.strictEqual(audioPlay.fallbackAttempted, true);

// Uncached track 404
const uncachedPlay = chatInputNotificationAndMediaViewerGovernor.playAudio('missing_track', 'https://missing.mp3', 404);
assert.strictEqual(uncachedPlay.status, 'error');
assert.ok(uncachedPlay.error?.includes('404'));
console.log('  ✅ Resilient audio player fallback and 404 handling verified');

// 6. Action Center Notification Deep-Link Router
console.log('  Testing Action Center notification routing...');
const payloadChannel = {
  channel_id: '-100123456789',
  message_id: '456',
};
const route = chatInputNotificationAndMediaViewerGovernor.parseNotificationPayload(payloadChannel);
assert.strictEqual(route.chatId, '-100123456789');
assert.strictEqual(route.channelId, '-100123456789');
assert.strictEqual(route.messageId, 456);
assert.strictEqual(route.action, 'scroll_to_message');

const payloadTopic = {
  chat_id: 'supergroup_12',
  topic_id: '88',
};
const routeTopic = chatInputNotificationAndMediaViewerGovernor.parseNotificationPayload(payloadTopic);
assert.strictEqual(routeTopic.chatId, 'supergroup_12');
assert.strictEqual(routeTopic.topicId, 88);
assert.strictEqual(routeTopic.action, 'open_thread');
console.log('  ✅ Notification deep-link payload parsed and routed accurately');

// 7. Uncloggable Update Dispatcher
console.log('  Testing update queue prioritization and high-watermark drop...');
// Enqueue normal updates
for (let i = 0; i < 505; i++) {
  chatInputNotificationAndMediaViewerGovernor.enqueueUpdate({
    id: `upd_${i}`,
    type: 'user_status',
    priority: i < 500 ? 'low' : 'high',
    payload: { userId: i },
    timestamp: Date.now(),
  });
}

// Bounded queue: length should be capped around maxQueueSize
assert.ok(chatInputNotificationAndMediaViewerGovernor.getQueueLength() <= 500);

// High priority update should be at the front
const drained = chatInputNotificationAndMediaViewerGovernor.drainUpdates(5);
assert.strictEqual(drained[0].priority, 'high');
console.log('  ✅ Update dispatcher handles backpressure without clogging');

console.log('✨ All Phase 97 Verification Tests Passed 100% Successfully!');
