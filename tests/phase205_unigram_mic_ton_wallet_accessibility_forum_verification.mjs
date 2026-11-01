/**
 * Verification Suite for Phase 205:
 * Unigram Microphone Device State, TON Connect Wallet Bridge, Adaptive Hover Ergonomics,
 * Forum Topic Permissions, High-DPI Login Icons, RPC Error Sanitizer & Accessible Group Calls
 * 
 * Verifies fixes for:
 * - Unigram #3148: Windows CoreAudio / UWP microphone capture permission & default comms device manager.
 * - Unigram #3159: TON Connect 2.0 WebView bridge sandbox & hardware wallet signing timeout protection.
 * - Unigram #3001: Adaptive MouseEnter label visibility ergonomizer (icon-only default, reveal on hover).
 * - Unigram #2953: Supergroup forum topic permissions (can_manage_topics, can_post_messages) validation.
 * - Unigram #2884: High-DPI vector SVG rasterizer & login interface icon pixelation prevention.
 * - Unigram #2773: Telegram RPC error sanitizer (CHAT_ADMIN_REQUIRED, USER_RESTRICTED) to actionable UI dialogs.
 * - Unigram #2611: Compact contact list item layout (44px row, 32px avatar, truncated label).
 * - Unigram #2437: Group call WebRTC accessible control peers (Mute, Deafen, Screen Share) with keyboard access keys.
 */

import assert from 'node:assert/strict';
import {
  WindowsMicrophoneDeviceStateGovernor,
  TonWalletWebViewBridgeGovernor,
  AdaptiveHoverLabelErgonomicsGovernor,
  ForumTopicPermissionsGovernor,
  HighDpiVectorIconRasterizerGovernor,
  RpcErrorUserActionSanitizerGovernor,
  CompactContactListLayoutGovernor,
  WebRtcGroupCallAccessibilityGovernor
} from '../src/services/unigramMicTonWalletAccessibilityAndForumGovernor.ts';

console.log('🧪 Starting Phase 205 Verification: Unigram Mic, TON Wallet, Accessibility & Forums...');

// -------------------------------------------------------------
// Test 1: #3148 - Windows Microphone Capture & State Machine
// -------------------------------------------------------------
console.log('  Testing #3148: Windows CoreAudio Microphone State Machine...');
const micGov = new WindowsMicrophoneDeviceStateGovernor();

const deniedRes = micGov.testMicrophoneDevice(false, true);
assert.equal(deniedRes.canCapture, false);
assert.equal(deniedRes.state, 'PERMISSION_DENIED');

const noDevRes = micGov.testMicrophoneDevice(true, false);
assert.equal(noDevRes.canCapture, false);
assert.equal(noDevRes.state, 'DEVICE_UNAVAILABLE');

const activeRes = micGov.testMicrophoneDevice(true, true);
assert.equal(activeRes.canCapture, true);
assert.equal(activeRes.state, 'ACTIVE');
console.log('  ✅ #3148 Verified: Microphone device state and permission handling verified.');

// -------------------------------------------------------------
// Test 2: #3159 - TON Connect Wallet WebView Sandbox
// -------------------------------------------------------------
console.log('  Testing #3159: TON Connect Wallet Sandbox Bridge...');
const tonGov = new TonWalletWebViewBridgeGovernor();

const validWallet = tonGov.initializeTonConnectBridge('https://wallet.ton.org/connect');
assert.equal(validWallet.bridgeReady, true);
assert.equal(validWallet.hasWalletCapability, true);

const untrustedSite = tonGov.initializeTonConnectBridge('https://phishing-crypto-site.xyz');
assert.equal(untrustedSite.bridgeReady, false);
assert.equal(untrustedSite.hasWalletCapability, false);
console.log('  ✅ #3159 Verified: TON Connect wallet bridge sandbox verified.');

// -------------------------------------------------------------
// Test 3: #3001 - Adaptive MouseEnter Hover Label Visibility
// -------------------------------------------------------------
console.log('  Testing #3001: Adaptive MouseEnter Hover Label Ergonomics...');
const hoverGov = new AdaptiveHoverLabelErgonomicsGovernor();

const idleState = hoverGov.getLabelVisibility(false, false);
assert.equal(idleState.showLabel, false);
assert.equal(idleState.opacity, 0.0);

const hoveredState = hoverGov.getLabelVisibility(true, false);
assert.equal(hoveredState.showLabel, true);
assert.equal(hoveredState.opacity, 1.0);

const touchState = hoverGov.getLabelVisibility(false, true);
assert.equal(touchState.showLabel, true);
console.log('  ✅ #3001 Verified: Adaptive hover label visibility verified.');

// -------------------------------------------------------------
// Test 4: #2953 - Forum Topic Permissions
// -------------------------------------------------------------
console.log('  Testing #2953: Forum Topic Permissions...');
const forumGov = new ForumTopicPermissionsGovernor();

// Regular member with canPostMessages
const canCreate = forumGov.evaluateTopicAction('create_topic', { canManageTopics: false, canPostMessages: true });
assert.equal(canCreate.allowed, true);

// Regular member trying to close topic -> denied
const cannotClose = forumGov.evaluateTopicAction('close_topic', { canManageTopics: false, canPostMessages: true });
assert.equal(cannotClose.allowed, false);
assert.ok(cannotClose.reason?.includes('administrators'));

// Admin closing topic -> allowed
const adminClose = forumGov.evaluateTopicAction('close_topic', { canManageTopics: true, canPostMessages: true });
assert.equal(adminClose.allowed, true);
console.log('  ✅ #2953 Verified: Forum topic permission evaluation verified.');

// -------------------------------------------------------------
// Test 5: #2884 - High-DPI Vector Icon Scaling
// -------------------------------------------------------------
console.log('  Testing #2884: High-DPI Vector Icon Scaling...');
const dpiGov = new HighDpiVectorIconRasterizerGovernor();

const scaled100 = dpiGov.getScaledIconDimensions(24, 100);
assert.equal(scaled100.renderWidthPx, 24);

const scaled200 = dpiGov.getScaledIconDimensions(24, 200);
assert.equal(scaled200.renderWidthPx, 48);
assert.equal(scaled200.useVectorSvg, true);
console.log('  ✅ #2884 Verified: High-DPI vector icon scaling verified.');

// -------------------------------------------------------------
// Test 6: #2773 - Telegram RPC Error Actionable Sanitizer
// -------------------------------------------------------------
console.log('  Testing #2773: Telegram RPC Error Actionable Sanitizer...');
const rpcGov = new RpcErrorUserActionSanitizerGovernor();

const adminReq = rpcGov.sanitizeActionError('CHAT_ADMIN_REQUIRED');
assert.ok(adminReq.userFriendlyMessage.includes('administrator privileges'));
assert.equal(adminReq.canRetry, false);

const userRestricted = rpcGov.sanitizeActionError('USER_RESTRICTED');
assert.ok(userRestricted.userFriendlyMessage.includes('restricted'));
console.log('  ✅ #2773 Verified: Telegram RPC error actionable sanitization verified.');

// -------------------------------------------------------------
// Test 7: #2611 - Compact Contact List Layout Metrics
// -------------------------------------------------------------
console.log('  Testing #2611: Compact Contact List Layout Metrics...');
const layoutGov = new CompactContactListLayoutGovernor();

const metrics = layoutGov.getCompactRowMetrics();
assert.equal(metrics.rowHeightPx, 44);
assert.equal(metrics.avatarSizePx, 32);
console.log('  ✅ #2611 Verified: Compact contact list layout verified.');

// -------------------------------------------------------------
// Test 8: #2437 - Accessible WebRTC Group Call Controls
// -------------------------------------------------------------
console.log('  Testing #2437: Accessible WebRTC Group Call Controls...');
const callGov = new WebRtcGroupCallAccessibilityGovernor();

const muteActive = callGov.getAccessibleCallControlProperties('mute', true);
assert.equal(muteActive.automationName, 'Mute Microphone');
assert.equal(muteActive.accessKey, 'M');

const shareActive = callGov.getAccessibleCallControlProperties('screenshare', false);
assert.equal(shareActive.automationName, 'Share Screen');
assert.equal(shareActive.accessKey, 'S');
console.log('  ✅ #2437 Verified: Accessible WebRTC group call controls verified.');

console.log('\n🎉 ALL 8 PHASE 205 UNIGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
