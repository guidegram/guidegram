/**
 * Verification Suite for Phase 188:
 * AyuGram Checksum Guard, IP Telemetry Blocker, Antivirus Hygiene,
 * Media Device Permissions, Privacy Forwarding, Qt 6.10 QPA & Session Reconnect Hardening
 * 
 * Verifies fixes for:
 * - AyuGram #272: Release binary SHA-256 cryptographic checksum verification
 * - AyuGram #476: Rogue IP telemetry leak blocker enforcing proxy routing
 * - AyuGram #428: Zero-adware installer hygiene & antivirus false-positive suppression
 * - AyuGram #39: Camera & microphone permission loop prevention with settings link
 * - AyuGram #325: Granular message forward privacy (hide author, strip captions)
 * - AyuGram #193: Qt 6.10 ABI compatibility & QPA platform plugin fallback
 * - AyuGram #348: MTProto post-update session reconnect & DC failover governor
 */

import assert from 'node:assert/strict';
import {
  ReleaseChecksumGovernor,
  TelemetryIpLeakBlockerGovernor,
  InstallerAntivirusHygieneGovernor,
  MediaDevicePermissionGovernor,
  PrivacyForwardingGovernor,
  Qt6AbiCompatibilityGovernor,
  MtprotoSessionReconnectGovernor
} from '../src/services/ayugramChecksumTelemetryPermissionAndForwardGovernor.ts';

console.log('🧪 Starting Phase 188 Verification: Crossing the 1200 Milestone...');

// -------------------------------------------------------------
// Test 1: #272 - Release SHA-256 Checksum Verification
// -------------------------------------------------------------
console.log('  Testing #272: Release Archive SHA-256 Checksum Verification...');
const checksumGov = new ReleaseChecksumGovernor();

const samplePayload = 'Guidegram binary release package v10.5.0';
// Known sha256 for samplePayload
const expectedHash = 'f536fb823a310227d05a2dee87e65a4f394b7cc2fff25b5d99ef8648199d3df9';

const validCheck = checksumGov.verifyBuffer(samplePayload, expectedHash);
assert.equal(validCheck.isMatch, true);
assert.equal(validCheck.status, 'verified');

const tamperedCheck = checksumGov.verifyBuffer(samplePayload + '_tampered', expectedHash);
assert.equal(tamperedCheck.isMatch, false);
assert.equal(tamperedCheck.status, 'tampered_or_corrupted');
console.log('  ✅ #272 Verified: SHA-256 checksums verified and tampered archives rejected.');

// -------------------------------------------------------------
// Test 2: #476 - Rogue IP Telemetry Leak Blocker
// -------------------------------------------------------------
console.log('  Testing #476: Rogue IP Telemetry Leak Blocker...');
const ipGov = new TelemetryIpLeakBlockerGovernor();

// Suspicious Vodafone IP reported in issue #476
const blockedResult = ipGov.evaluateOutboundConnection('194.221.250.50', 443);
assert.equal(blockedResult.allowed, false);
assert.ok(blockedResult.reason.includes('Blocked suspicious hardcoded telemetry IP'));

// Official Telegram DC IP
const dcResult = ipGov.evaluateOutboundConnection('149.154.167.50', 443, false);
assert.equal(dcResult.allowed, true);
console.log('  ✅ #476 Verified: Rogue hardcoded telemetry IP dialer blocked.');

// -------------------------------------------------------------
// Test 3: #428 - Installer Antivirus Hygiene & Adware Guard
// -------------------------------------------------------------
console.log('  Testing #428: Installer Package File Audit & Adware Guard...');
const avGov = new InstallerAntivirusHygieneGovernor();

const cleanFileList = ['Guidegram.exe', 'Qt6Core.dll', 'resources.pak', 'translations.pak'];
const cleanAudit = avGov.auditPackageFiles(cleanFileList);
assert.equal(cleanAudit.clean, true);
assert.equal(cleanAudit.certificationReady, true);

const dirtyFileList = ['Guidegram.exe', 'sponsored_toolbar.dll', 'adware_helper.exe'];
const dirtyAudit = avGov.auditPackageFiles(dirtyFileList);
assert.equal(dirtyAudit.clean, false);
assert.equal(dirtyAudit.suspiciousFiles.length, 2);
console.log('  ✅ #428 Verified: Clean installer packaging audited without adware.');

// -------------------------------------------------------------
// Test 4: #39 - Media Device Permission Loop Prevention
// -------------------------------------------------------------
console.log('  Testing #39: Media Device Permission Loop Prevention...');
const permGov = new MediaDevicePermissionGovernor();

// Initially not determined -> can prompt
const p1 = permGov.requestPermission('mic');
assert.equal(p1.state, 'not_determined');
assert.equal(p1.canPrompt, true);

// User denies permission
permGov.setPermission('mic', 'denied');
const p2 = permGov.requestPermission('mic');
assert.equal(p2.state, 'denied');
assert.equal(p2.canPrompt, false, 'Must NOT trigger repeated OS permission loops');
assert.equal(p2.settingsDeepLink, 'ms-settings:privacy-microphone');
console.log('  ✅ #39 Verified: Denied permissions route to system settings without loop.');

// -------------------------------------------------------------
// Test 5: #325 - Privacy Forwarding Options
// -------------------------------------------------------------
console.log('  Testing #325: Privacy Forwarding Transformations...');
const forwardGov = new PrivacyForwardingGovernor();

const original = {
  senderId: 987654,
  senderName: 'Alice Secret',
  text: 'Sensitive briefing document',
  hasMedia: true
};

const forwarded = forwardGov.transformForwardedMessage(original, {
  dropAuthorName: true,
  dropCaptions: true,
  spoilerMedia: true
});

assert.equal(forwarded.originalSenderId, 0);
assert.equal(forwarded.originalSenderName, '');
assert.equal(forwarded.forwardHeaderVisible, false);
assert.equal(forwarded.text, '', 'Caption stripped');
assert.equal(forwarded.mediaSpoiler, true, 'Media marked with spoiler mask');
console.log('  ✅ #325 Verified: Author attribution, captions and spoiler flags transformed for privacy.');

// -------------------------------------------------------------
// Test 6: #193 - Qt 6.10 ABI Compatibility & QPA Fallback
// -------------------------------------------------------------
console.log('  Testing #193: Qt 6.10 ABI Compatibility & Platform Plugin...');
const qtGov = new Qt6AbiCompatibilityGovernor();

const wayland610 = qtGov.resolvePlatformPlugin('6.10.1', 'wayland');
assert.equal(wayland610.pluginName, 'wayland-egl');
assert.equal(wayland610.environmentFlags['QT_QPA_PLATFORM'], 'wayland;xcb');

const xcbRes = qtGov.resolvePlatformPlugin('6.10.1', 'xcb');
assert.equal(xcbRes.pluginName, 'xcb');
console.log('  ✅ #193 Verified: Qt 6.10 platform plugins dynamically selected with environment flags.');

// -------------------------------------------------------------
// Test 7: #348 - MTProto Post-Update Session Reconnect
// -------------------------------------------------------------
console.log('  Testing #348: MTProto Post-Update Session Reconnect & Backoff...');
const reconnectGov = new MtprotoSessionReconnectGovernor();

// TCP RST triggers exponential backoff
const rec1 = reconnectGov.handleSocketDisconnect('TCP_RST');
assert.equal(rec1.action, 'reconnect');
assert.equal(rec1.backoffMs, 200);

const rec2 = reconnectGov.handleSocketDisconnect('TCP_RST');
assert.equal(rec2.action, 'reconnect');
assert.equal(rec2.backoffMs, 400);

// DC migration triggers instant failover
const failover = reconnectGov.handleSocketDisconnect('DC_MIGRATION');
assert.equal(failover.action, 'dc_failover');
assert.equal(failover.backoffMs, 200);

reconnectGov.resetOnConnectionEstablished();
console.log('  ✅ #348 Verified: MTProto connection safely reconnects after update with backoff.');

console.log('\n🎉 ALL 7 AYUGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
console.log('🏆 1200 RESOLVED MILESTONE OFFICIALLY CROSSED!');
