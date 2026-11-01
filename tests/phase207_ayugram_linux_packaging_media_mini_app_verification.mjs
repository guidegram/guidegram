import assert from 'node:assert';
import {
  ArchDebianLinuxDynamicLoaderGovernor,
  MessageInputAttachmentVisibilityGovernor,
  NowPlayingPresenceBroadcasterGovernor,
  AvatarUploadAspectCropGovernor,
  MiniAppSandboxAndAndroidPageLifecycleGovernor
} from '../src/services/ayugramLinuxPackagingMediaAndMiniAppGovernor.ts';

console.log('--- STARTING PHASE 207 VERIFICATION SUITE: AYUGRAM PENULTIMATE HARDENING ---');

// 1. #465 & #453: Arch & Debian Dynamic Loader and Packaging Governor
console.log('Testing #465 & #453: ArchDebianLinuxDynamicLoaderGovernor...');
const loaderGovernor = new ArchDebianLinuxDynamicLoaderGovernor();

const archFiles = ['/usr/lib/libstdc++.so.6', '/usr/lib/libQt5Core.so.5'];
const archCheck = loaderGovernor.inspectLibrary('arch', 'libstdc++.so.6', archFiles);
assert.strictEqual(archCheck.found, true, 'libstdc++ should be found on Arch');
assert.strictEqual(archCheck.resolvedPath, '/usr/lib/libstdc++.so.6');

const debianFiles = ['/usr/lib/x86_64-linux-gnu/libssl.so.3'];
const debianCheck = loaderGovernor.inspectLibrary('debian', 'libssl.so.3', debianFiles);
assert.strictEqual(debianCheck.found, true, 'libssl should be found on Debian multi-arch');
assert.strictEqual(debianCheck.resolvedPath, '/usr/lib/x86_64-linux-gnu/libssl.so.3');

const debSpec = loaderGovernor.generateDebSpec('amd64');
assert.strictEqual(debSpec.architecture, 'amd64');
assert.strictEqual(debSpec.dependencies.some(d => d.includes('libqt5gui5')), true, 'Qt5 GUI dependency required');
assert.strictEqual(debSpec.multiArch, 'foreign');

console.log('✓ Arch & Debian Linux ABI dynamic loader and package spec verified.');

// 2. #447: Message Input Accessory Controls Visibility Governor
console.log('Testing #447: MessageInputAttachmentVisibilityGovernor...');
const inputGovernor = new MessageInputAttachmentVisibilityGovernor();

// Idle empty input
const idleState = inputGovernor.resolveControlsState('', false, 0);
assert.strictEqual(idleState.isMicButtonVisible, true, 'Mic button visible when idle');
assert.strictEqual(idleState.isSendButtonVisible, false, 'Send button hidden when idle');
assert.strictEqual(idleState.attachmentTrayExpanded, false);

// Typing text
const typingState = inputGovernor.resolveControlsState('Hello Guidegram', false, 0);
assert.strictEqual(typingState.isSendButtonVisible, true, 'Send button visible when typing');
assert.strictEqual(typingState.isMicButtonVisible, false, 'Mic button hidden when typing');
assert.strictEqual(typingState.hasText, true);

// With attachment
const fileAttachedState = inputGovernor.resolveControlsState('', false, 2);
assert.strictEqual(fileAttachedState.isSendButtonVisible, true, 'Send button visible with files');
assert.strictEqual(fileAttachedState.attachmentTrayExpanded, true, 'Attachment tray expanded');

// Recording audio
const recordingState = inputGovernor.resolveControlsState('', true, 0);
assert.strictEqual(recordingState.isAttachButtonVisible, false, 'Attach button hidden while recording');
assert.strictEqual(recordingState.hasAudioRecording, true);

console.log('✓ Message input accessory controls visibility verified.');

// 3. #435: "Now Playing" Media Status Broadcaster Governor
console.log('Testing #435: NowPlayingPresenceBroadcasterGovernor...');
const nowPlayingGovernor = new NowPlayingPresenceBroadcasterGovernor();

const track = {
  trackId: 'track_901',
  title: 'Nocturne in C Sharp Minor',
  artist: 'Chopin',
  durationSeconds: 240,
  isPlaying: true
};

const baseTime = 1700000000000;
// Normal broadcast
const broadcast1 = nowPlayingGovernor.broadcastStatus('user_1', 'chat_public', track, ['chat_public'], false, baseTime);
assert.strictEqual(broadcast1.canBroadcast, true);
assert.strictEqual(broadcast1.reason, 'SUCCESS');
assert.strictEqual(broadcast1.broadcastPayload.text.includes('Chopin'), true);

// Rapid follow-up broadcast throttled
const broadcastThrottled = nowPlayingGovernor.broadcastStatus('user_1', 'chat_public', track, ['chat_public'], false, baseTime + 1000);
assert.strictEqual(broadcastThrottled.canBroadcast, false);
assert.strictEqual(broadcastThrottled.reason, 'RATE_LIMITED');

// Privacy restricted chat
const broadcastPrivate = nowPlayingGovernor.broadcastStatus('user_1', 'chat_secret', track, ['chat_public'], true, baseTime + 5000);
assert.strictEqual(broadcastPrivate.canBroadcast, false);
assert.strictEqual(broadcastPrivate.reason, 'PRIVACY_RESTRICTED');

console.log('✓ "Now Playing" status broadcast & privacy controls verified.');

// 4. #433: Avatar Aspect Ratio & Center Crop Governor
console.log('Testing #433: AvatarUploadAspectCropGovernor...');
const cropGovernor = new AvatarUploadAspectCropGovernor();

// Landscape 1920x1080 -> center square 1080x1080 -> capped at 640x640
const landscapeCrop = cropGovernor.calculateCenterCrop(1920, 1080);
assert.strictEqual(landscapeCrop.cropSize, 1080);
assert.strictEqual(landscapeCrop.cropX, 420, 'Center crop horizontal offset');
assert.strictEqual(landscapeCrop.cropY, 0);
assert.strictEqual(landscapeCrop.outputWidth, 640, 'Max dimension downsampled to 640');
assert.strictEqual(landscapeCrop.outputHeight, 640);

// Small square 400x400 -> 400x400
const squareCrop = cropGovernor.calculateCenterCrop(400, 400);
assert.strictEqual(squareCrop.cropX, 0);
assert.strictEqual(squareCrop.cropY, 0);
assert.strictEqual(squareCrop.outputWidth, 400);

console.log('✓ Avatar upload aspect ratio preservation & circular center crop verified.');

// 5. #426, #416 & #448: Mini App Sandbox, Android Lifecycle & Localization Governor
console.log('Testing #426, #416 & #448: MiniAppSandboxAndAndroidPageLifecycleGovernor...');
const appLifecycleGovernor = new MiniAppSandboxAndAndroidPageLifecycleGovernor();

// Mini App registration & WebGL recovery
const appState = appLifecycleGovernor.registerMiniApp('mini_app_trading', 'https://game.example.com');
assert.strictEqual(appState.isSandboxed, true);
assert.strictEqual(appState.webGlCrashed, false);

const recovery = appLifecycleGovernor.handleMiniAppWebGlCrash('mini_app_trading');
assert.strictEqual(recovery.recovered, true);
assert.strictEqual(recovery.newState.recoveryCount, 1);

// Android page lifecycle
const pauseState = appLifecycleGovernor.handleAndroidLifecycleEvent('chat_view_1', 'PAUSE', { scrollY: 1540 });
assert.strictEqual(pauseState.isBackgrounded, true);
assert.strictEqual(pauseState.memoryReleased, true);
assert.deepStrictEqual(pauseState.preservedStateSnapshot, { scrollY: 1540 });

const resumeState = appLifecycleGovernor.handleAndroidLifecycleEvent('chat_view_1', 'RESUME');
assert.strictEqual(resumeState.isBackgrounded, false);
assert.strictEqual(resumeState.memoryReleased, false);

// Localization #448
const zhText = appLifecycleGovernor.resolveTranslation('chat.send', 'zh-Hans');
assert.strictEqual(zhText, '发送', 'Chinese Simplified translation match');

const enText = appLifecycleGovernor.resolveTranslation('chat.send', 'en');
assert.strictEqual(enText, 'Send');

const fallbackText = appLifecycleGovernor.resolveTranslation('chat.attach', 'unknown-locale');
assert.strictEqual(fallbackText, 'Attach File', 'Fallback to English');

console.log('✓ Mini App WebGL sandbox recovery, Android background lifecycle & zh-Hans localization verified.');

console.log('--- ALL PHASE 207 VERIFICATION SUITE CHECKS PASSED: 8 AYUGRAM ISSUES HARDENED! ---');
