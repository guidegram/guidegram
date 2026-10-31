import assert from 'node:assert/strict';
import { WebBootstrapMediaCallAndNotificationGovernor } from '../src/services/webBootstrapMediaCallAndNotificationGovernor.ts';

console.log('🧪 Starting Phase 142: Web Client Bootstrap, Media, Video Call & Notification Hardening Tests...\n');

const governor = new WebBootstrapMediaCallAndNotificationGovernor();

// ============================================================================
// 1. Ajaxy/telegram-tt#380 - Telegram A is not loading (Bootstrap Chunk Error & Fallback)
// ============================================================================
console.log('👉 Testing Case 1: Web Client Bootstrap & Chunk Recovery (Ajaxy/telegram-tt#380)...');
const config = {
  appVersion: '1.42.0',
  timeoutMs: 8000,
  maxChunkRetries: 2,
};

const initialState = governor.initiateBootstrap(config);
assert.equal(initialState.status, 'loading');
assert.equal(initialState.retryCount, 0);

// First chunk error triggers recovery with cache-busting
const recoveringState = governor.handleBootstrapChunkError('ChunkLoadError: Loading chunk 404 failed', config);
assert.equal(recoveringState.status, 'recovering');
assert.equal(recoveringState.retryCount, 1);
assert.match(recoveringState.cacheBustVersion, /^1\.42\.0\.\d+$/);

// Second chunk error still recovers
governor.handleBootstrapChunkError('ChunkLoadError: retry failed', config);
assert.equal(governor.getBootstrapState().retryCount, 2);

// Third chunk error exceeds maxChunkRetries -> enters failed state
const failedState = governor.handleBootstrapChunkError('ChunkLoadError: permanent network issue', config);
assert.equal(failedState.status, 'failed');

// Marking success transitions to ready
const readyState = governor.markBootstrapSuccessful();
assert.equal(readyState.status, 'ready');
assert.equal(readyState.lastError, null);
console.log('✅ Case 1 passed: Bootstrap recovery & chunk error state machine robust.\n');

// ============================================================================
// 2. Ajaxy/telegram-tt#209 - Corrupted audio covers (ID3 Magic Bytes & Fallback Art)
// ============================================================================
console.log('👉 Testing Case 2: Corrupted Audio Cover Validation (Ajaxy/telegram-tt#209)...');
// Valid JPEG bytes
const validJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const jpegResult = governor.validateAndExtractAudioCover('Song Title', 'Artist Name', validJpegBytes);
assert.equal(jpegResult.isValid, true);
assert.equal(jpegResult.mimeType, 'image/jpeg');

// Corrupted binary with invalid magic bytes
const corruptedBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
const corruptResult = governor.validateAndExtractAudioCover('Bohemian Rhapsody', 'Queen', corruptedBytes);
assert.equal(corruptResult.isValid, false);
assert.equal(corruptResult.mimeType, 'image/svg+xml');
assert.ok(corruptResult.fallbackGradient);
assert.equal(corruptResult.fallbackGradient.initials, 'QB');
assert.match(corruptResult.fallbackGradient.fromColor, /^hsl\(\d+, 75%, 45%\)$/);

// Empty binary
const emptyResult = governor.validateAndExtractAudioCover('Test Track', '', null);
assert.equal(emptyResult.isValid, false);
assert.ok(emptyResult.fallbackGradient);
console.log('✅ Case 2 passed: Audio cover corruption safely handled with deterministic fallback.\n');

// ============================================================================
// 3. Ajaxy/telegram-tt#131 - Video calls state & track negotiation
// ============================================================================
console.log('👉 Testing Case 3: WebRTC Video Call State Machine (Ajaxy/telegram-tt#131)...');
const callConfig = {
  peerId: 'user_98765',
  enableVideo: true,
  enableAudio: true,
  targetResolution: '720p',
};

const callState = governor.initiateVideoCall(callConfig);
assert.equal(callState, 'initiating');

governor.transitionCallState('ringing');
governor.transitionCallState('connecting');
governor.transitionCallState('connected');

assert.equal(governor.getCallSummary().state, 'connected');
assert.equal(governor.getCallSummary().isCameraEnabled, true);

// Toggle camera
governor.toggleCamera(false);
assert.equal(governor.getCallSummary().isCameraEnabled, false);

// Toggle screen share -> overrides camera
governor.toggleScreenShare(true);
assert.equal(governor.getCallSummary().isScreenSharing, true);
assert.equal(governor.getCallSummary().isCameraEnabled, false);

// Terminate call
governor.transitionCallState('terminated');
assert.equal(governor.getCallSummary().state, 'terminated');
assert.equal(governor.getCallSummary().isScreenSharing, false);
console.log('✅ Case 3 passed: Video call state and tracks transition smoothly.\n');

// ============================================================================
// 4. Ajaxy/telegram-tt#113 - Menu background is not blurred in Firefox
// ============================================================================
console.log('👉 Testing Case 4: Firefox Backdrop-Filter Blur Fallback (Ajaxy/telegram-tt#113)...');
const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0';

// Native support
const supportedStyle = governor.resolveBackdropBlurStyle(chromeUA, true);
assert.equal(supportedStyle.supportsBackdropFilter, true);
assert.match(supportedStyle.backdropFilter, /blur/);

// Unsupported / Firefox fallback mode
const firefoxFallback = governor.resolveBackdropBlurStyle(firefoxUA, false);
assert.equal(firefoxFallback.supportsBackdropFilter, false);
assert.equal(firefoxFallback.backdropFilter, 'none');
assert.equal(firefoxFallback.backgroundColor, 'rgba(28, 33, 39, 0.96)');
assert.ok(firefoxFallback.border);
console.log('✅ Case 4 passed: Backdrop blur fallback prevents unreadable menu text in Firefox.\n');

// ============================================================================
// 5. Ajaxy/telegram-tt#75 - Ctrl+Up keybind for "reply to previous message"
// ============================================================================
console.log('👉 Testing Case 5: Ctrl+Up Reply Keyboard Navigation (Ajaxy/telegram-tt#75)...');
const history = [
  { id: 101, text: 'Hello there', senderId: 1, timestamp: 1000 },
  { id: 102, text: 'How are you?', senderId: 2, timestamp: 2000 },
];

// Ctrl+Up with empty input triggers reply to latest message
const replyResult = governor.handleComposerKeydown({
  key: 'ArrowUp',
  ctrlKey: true,
  currentInputText: '',
  messageHistory: history,
});
assert.equal(replyResult.handled, true);
assert.equal(replyResult.action, 'reply');
assert.equal(replyResult.replyToMessageId, 102);

// Ctrl+Up with existing text in input is ignored
const ignoredResult = governor.handleComposerKeydown({
  key: 'ArrowUp',
  ctrlKey: true,
  currentInputText: 'Typing some text...',
  messageHistory: history,
});
assert.equal(ignoredResult.handled, false);

// Escape key cancels active reply
const cancelResult = governor.handleComposerKeydown({
  key: 'Escape',
  currentInputText: '',
  activeReplyMessageId: 102,
  messageHistory: history,
});
assert.equal(cancelResult.handled, true);
assert.equal(cancelResult.action, 'cancel_reply');
assert.equal(cancelResult.replyToMessageId, null);
console.log('✅ Case 5 passed: Ctrl+Up keyboard shortcut replies smoothly without text loss.\n');

// ============================================================================
// 6. Ajaxy/telegram-tt#49 - .JPEG vs .JPG Quick Send Option Normalization
// ============================================================================
console.log('👉 Testing Case 6: JPEG and JPG Quick Send Normalization (Ajaxy/telegram-tt#49)...');
const jpegUpload = governor.normalizeMediaUpload('vacation_photo.JPEG', 'image/jpeg');
assert.equal(jpegUpload.normalizedExtension, 'jpg');
assert.equal(jpegUpload.canonicalMimeType, 'image/jpeg');
assert.equal(jpegUpload.isQuickSendEligible, true);

const jpgUpload = governor.normalizeMediaUpload('portrait.jpg', 'image/jpeg');
assert.equal(jpgUpload.normalizedExtension, 'jpg');
assert.equal(jpgUpload.canonicalMimeType, 'image/jpeg');
assert.equal(jpgUpload.isQuickSendEligible, true);

const pdfUpload = governor.normalizeMediaUpload('report.pdf', 'application/pdf');
assert.equal(pdfUpload.isQuickSendEligible, false);
console.log('✅ Case 6 passed: .JPEG and .JPG treat quick send options identically.\n');

// ============================================================================
// 7. Ajaxy/telegram-tt#11 - Disable background notifications & quiet hours
// ============================================================================
console.log('👉 Testing Case 7: Background Notifications & Quiet Hours (Ajaxy/telegram-tt#11)...');
// Foreground check
const fgCheck = governor.shouldDeliverNotification(12345, true);
assert.equal(fgCheck.deliver, false);
assert.equal(fgCheck.reason, 'app_in_foreground');

// Normal background check
const bgCheck = governor.shouldDeliverNotification(12345, false);
assert.equal(bgCheck.deliver, true);
assert.equal(bgCheck.reason, 'ok');

// Muted chat
governor.updateNotificationSettings({ mutedChatIds: new Set([12345]) });
const mutedCheck = governor.shouldDeliverNotification(12345, false);
assert.equal(mutedCheck.deliver, false);
assert.equal(mutedCheck.reason, 'chat_muted');

// Quiet hours check
governor.updateNotificationSettings({
  mutedChatIds: new Set(),
  quietHours: { enabled: true, startHour: 22, endHour: 8 },
});
const nightTime = new Date('2026-11-01T23:30:00');
const quietCheck = governor.shouldDeliverNotification(999, false, nightTime);
assert.equal(quietCheck.deliver, false);
assert.equal(quietCheck.reason, 'quiet_hours_active');

const dayTime = new Date('2026-11-01T14:30:00');
const dayCheck = governor.shouldDeliverNotification(999, false, dayTime);
assert.equal(dayCheck.deliver, true);
console.log('✅ Case 7 passed: Background notification controls and quiet hours active.\n');

console.log('🎉 ALL 7 PHASE 142 HARDENING TESTS PASSED WITH 100% SUCCESS!');
