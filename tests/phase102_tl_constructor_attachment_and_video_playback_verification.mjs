/**
 * Test Suite: Phase 102 TL Constructor, Attachment & Video Playback Verification
 * 
 * Verifies fixes for:
 * - Ajaxy/telegram-tt #58: Error: Could not find a matching Constructor ID (MTProto TL schema unknown constructor)
 * - Ajaxy/telegram-tt #26: Downloading large attachments does not work (Chunked ranged download)
 * - Ajaxy/telegram-tt #22: Opening website from notification asks to login every time (Cross-tab auth hydration)
 * - UnigramDev/Unigram #1493: Crash while clicking advanced setting (Safe settings hydration)
 * - tdlib/td #2725: Long delay when receiving messages on Android (Adaptive keepalive ping governor)
 * - telegramdesktop/tdesktop #26784: Telegram Linux app crashes while trying to play video (Video decode fallback)
 * - telegramdesktop/tdesktop #24953: Web App not showing up on ubuntu i3 (Tiling WM window geometry initialization)
 */

import assert from 'node:assert';
import { tlConstructorAttachmentAndVideoPlaybackGovernor } from '../src/services/tlConstructorAttachmentAndVideoPlaybackGovernor.ts';

console.log('🧪 Starting Phase 102 TL Constructor & Attachment Verification Suite...');

// 1. TL Deserialization Unknown Constructor Fallback
console.log('  Testing TL constructor deserialization & unknown fallback...');
const knownBuffer = new Uint8Array([1, 2, 3, 4]);
const knownResult = tlConstructorAttachmentAndVideoPlaybackGovernor.deserializeConstructor(0x5a686d7c, knownBuffer);
assert.strictEqual(knownResult.success, true);
assert.strictEqual(knownResult.isUnknownConstructorFallback, false);
assert.strictEqual(knownResult.data._type, 'message');

// Unknown constructor
const unknownResult = tlConstructorAttachmentAndVideoPlaybackGovernor.deserializeConstructor(0x99aabbcc, knownBuffer);
assert.strictEqual(unknownResult.success, true);
assert.strictEqual(unknownResult.isUnknownConstructorFallback, true);
assert.ok(unknownResult.warning?.includes('safely wrapped'));
console.log('  ✅ Unknown constructor deserialization fallback verified');

// 2. Chunked Large Attachment Downloader
console.log('  Testing chunked attachment stream assembly...');
const fileId = 'attach_large_video_100mb';
const totalSize = 10000;
const startProgress = tlConstructorAttachmentAndVideoPlaybackGovernor.startChunkedDownload(fileId, totalSize);
assert.strictEqual(startProgress.status, 'downloading');
assert.strictEqual(startProgress.downloadedBytes, 0);

tlConstructorAttachmentAndVideoPlaybackGovernor.processChunk(fileId, 4000);
let p = tlConstructorAttachmentAndVideoPlaybackGovernor.getDownloadProgress(fileId);
assert.strictEqual(p?.percentage, 40);
assert.strictEqual(p?.status, 'downloading');

tlConstructorAttachmentAndVideoPlaybackGovernor.processChunk(fileId, 6000);
p = tlConstructorAttachmentAndVideoPlaybackGovernor.getDownloadProgress(fileId);
assert.strictEqual(p?.percentage, 100);
assert.strictEqual(p?.status, 'completed');
console.log('  ✅ Chunked large attachment download progress verified');

// 3. Cross-Tab Auth Hydration from Notifications
console.log('  Testing cross-tab notification auth hydration...');
tlConstructorAttachmentAndVideoPlaybackGovernor.storeAuthSession('session_jwt_xyz', 'user_9988', 'notification_deep_link');
const authHydrated = tlConstructorAttachmentAndVideoPlaybackGovernor.hydrateSessionFromNotification();
assert.strictEqual(authHydrated.isAuthenticated, true);
assert.strictEqual(authHydrated.session?.userId, 'user_9988');
assert.strictEqual(authHydrated.session?.source, 'notification_deep_link');
console.log('  ✅ Cross-tab session hydration verified');

// 4. Advanced Settings Safe View Model
console.log('  Testing advanced settings dialog crash prevention...');
// Corrupt / null input
const fallbackVm = tlConstructorAttachmentAndVideoPlaybackGovernor.getAdvancedSettingsViewModel(null);
assert.strictEqual(fallbackVm.isSafeFallbackRendered, true);
assert.strictEqual(fallbackVm.hardwareAccelerationEnabled, false);
assert.strictEqual(fallbackVm.gpuRenderer, 'Software Renderer (Safe Fallback)');

// Valid input
const validVm = tlConstructorAttachmentAndVideoPlaybackGovernor.getAdvancedSettingsViewModel({
  hardwareAcceleration: true,
  gpuRenderer: 'NVIDIA RTX 4090',
  telemetry: false,
});
assert.strictEqual(validVm.isSafeFallbackRendered, false);
assert.strictEqual(validVm.gpuRenderer, 'NVIDIA RTX 4090');
console.log('  ✅ Advanced settings dialog safe view model verified');

// 5. Adaptive Keepalive Ping Governor
console.log('  Testing adaptive keepalive ping intervals...');
// Foreground
tlConstructorAttachmentAndVideoPlaybackGovernor.setAppBackgroundState(false);
const fgCheck = tlConstructorAttachmentAndVideoPlaybackGovernor.checkKeepalivePingNeeded(Date.now() + 16000);
assert.strictEqual(fgCheck.pingNeeded, true);
assert.strictEqual(fgCheck.interval, 15000);

// Background
tlConstructorAttachmentAndVideoPlaybackGovernor.setAppBackgroundState(true);
const bgCheck = tlConstructorAttachmentAndVideoPlaybackGovernor.checkKeepalivePingNeeded(Date.now());
assert.strictEqual(bgCheck.interval, 60000);
console.log('  ✅ Adaptive keepalive interval governor verified');

// 6. Video Decode Fallback
console.log('  Testing video hardware decode crash fallback...');
const vidUrl = 'https://cdn.guidegram.app/videos/clip_1080p.mp4';
const initialVid = tlConstructorAttachmentAndVideoPlaybackGovernor.configureVideoPlayback(vidUrl, 'video/mp4');
assert.strictEqual(initialVid.decoderMode, 'hardware');

// Simulate decode failure
const fallbackVid = tlConstructorAttachmentAndVideoPlaybackGovernor.handleVideoDecodeError(vidUrl);
assert.strictEqual(fallbackVid.decoderMode, 'software_canvas');
assert.strictEqual(fallbackVid.hardwareAccelerationAllowed, false);
console.log('  ✅ Video decode hardware-to-software fallback verified');

// 7. Tiling WM (i3/Sway) WebApp Viewport Governor
console.log('  Testing tiling window manager 0x0 viewport compensation...');
const clampedViewport = tlConstructorAttachmentAndVideoPlaybackGovernor.initializeTilingWmViewport('win_app_1', 0, 0);
assert.strictEqual(clampedViewport.width, 320);
assert.strictEqual(clampedViewport.height, 480);
assert.strictEqual(clampedViewport.forceRedrawTriggered, true);
console.log('  ✅ Tiling window manager viewport initialization verified');

console.log('✨ All Phase 102 Verification Tests Passed 100% Successfully!');
