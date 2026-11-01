/**
 * Verification Suite for Phase 181:
 * AyuGram macOS Gatekeeper, Arch Dynamic Soname, SIGSEGV Guard,
 * SponsorBlock, Flatpak XDG Notification & Local MCP Bridge Hardening
 * 
 * Verifies fixes for:
 * - AyuGram #271: macOS Gatekeeper quarantine attestation & ad-hoc codesign recovery
 * - AyuGram #449: Arch Linux dynamic library soname fallback (FFmpeg libavfilter)
 * - AyuGram #459: Abseil ABI versioned namespace & shared library compatibility
 * - AyuGram #339: POSIX SIGSEGV crash handler & emergency SQLite WAL flush
 * - AyuGram #450: SponsorBlock channel sponsored messages filter & video segment skip
 * - AyuGram #369: Linux Flatpak XDG portal notification sanitizer & in-app fallback
 * - AyuGram #513: Secure opt-in Local MCP JSON-RPC bridge
 */

import assert from 'node:assert/strict';
import {
  MacOsGatekeeperAttestationGovernor,
  DynamicSonameFallbackGovernor,
  PosixCrashSignalGuard,
  SponsorBlockChannelGovernor,
  XdgPortalNotificationGovernor,
  LocalMcpBridgeGovernor
} from '../src/services/ayugramGatekeeperSonameCrashSponsorAndMcpGovernor.ts';

console.log('🧪 Starting Phase 181 Verification: AyuGram Gatekeeper, Soname, Crash, SponsorBlock & MCP...');

// -------------------------------------------------------------
// Test 1: #271 - macOS Gatekeeper & Quarantine Remediation
// -------------------------------------------------------------
console.log('  Testing #271: macOS Gatekeeper & Quarantine Evaluation...');
const gatekeeperGov = new MacOsGatekeeperAttestationGovernor();

// Quarantined bundle with invalid/missing signature
const evaluation = gatekeeperGov.evaluateBundle('/Applications/AyuGram.app', true, 'invalid');
assert.equal(evaluation.isQuarantined, true);
assert.equal(evaluation.signatureValid, false);
assert.ok(evaluation.remediationCommand?.includes('xattr -cr "/Applications/AyuGram.app"'));
assert.ok(evaluation.remediationCommand?.includes('codesign --force --deep --sign -'));

// Valid signed bundle
const cleanEvaluation = gatekeeperGov.evaluateBundle('/Applications/AyuGram.app', false, 'valid', 'TEAM12345');
assert.equal(cleanEvaluation.remediationCommand, null, 'Clean valid bundle requires no remediation');
console.log('  ✅ #271 Verified: macOS Gatekeeper quarantine and signing defects diagnosed with recovery command.');

// -------------------------------------------------------------
// Test 2: #449 - FFmpeg Dynamic Soname Fallback
// -------------------------------------------------------------
console.log('  Testing #449: FFmpeg Dynamic Soname Fallback on Arch Linux...');
const sonameGov = new DynamicSonameFallbackGovernor();

// System has libavfilter.so.10, but binary asks for libavfilter.so.11
const res1 = sonameGov.resolveSoname('libavfilter', 'libavfilter.so.11', 'bundled/libavfilter.so');
assert.equal(res1.source, 'host_system');
assert.equal(res1.resolvedSoname, 'libavfilter.so.10', 'Should fall back to available system version');
assert.equal(res1.status, 'fallback_used');
console.log('  ✅ #449 Verified: Dynamic soname fallback resolves available host library.');

// -------------------------------------------------------------
// Test 3: #459 - Abseil ABI Compatibility & Bundled Fallback
// -------------------------------------------------------------
console.log('  Testing #459: Abseil ABI Compatibility & Bundled Fallback...');
// Request non-existent Abseil library on host
const res2 = sonameGov.resolveSoname('libabsl_nonexistent', 'libabsl_new.so.2608', 'bundled/libabsl_shim.so');
assert.equal(res2.source, 'bundled_fallback');
assert.equal(res2.resolvedSoname, 'bundled/libabsl_shim.so');
console.log('  ✅ #459 Verified: Abseil version collision safely redirected to bundled shim.');

// -------------------------------------------------------------
// Test 4: #339 - POSIX SIGSEGV Guard & WAL Flusher
// -------------------------------------------------------------
console.log('  Testing #339: POSIX SIGSEGV Signal Guard & Emergency WAL Flusher...');
const crashGuard = new PosixCrashSignalGuard();
let walFlushedFlag = false;

crashGuard.registerWalFlusher(() => {
  walFlushedFlag = true;
});

const signalResult = crashGuard.handleFatalSignal('SIGSEGV');
assert.equal(signalResult.handled, true);
assert.equal(signalResult.walFlushed, true);
assert.equal(walFlushedFlag, true, 'Emergency WAL flush callback must be executed');
assert.equal(signalResult.exitCode, 139); // 128 + 11 (SIGSEGV)
assert.equal(crashGuard.getCrashDumpsCount(), 1);
console.log('  ✅ #339 Verified: Fatal SIGSEGV intercepted and database journal flushed to prevent corruption.');

// -------------------------------------------------------------
// Test 5: #450 - SponsorBlock Channel Ads & Segment Skip
// -------------------------------------------------------------
console.log('  Testing #450: SponsorBlock Channel Ads & Video Segment Skip...');
const sponsorGov = new SponsorBlockChannelGovernor();

// Channel sponsored messages
assert.equal(sponsorGov.isSponsoredMessage({ is_sponsored: true }), true);
assert.equal(sponsorGov.isSponsoredMessage({ is_promoted: true }), true);
assert.equal(sponsorGov.isSponsoredMessage({ text: 'Normal chat post' }), false);

// Video sponsor segment skip
const segments = [
  { startSec: 30, endSec: 65, category: 'sponsor' },
  { startSec: 120, endSec: 135, category: 'interaction' }
];

const skipCheck = sponsorGov.shouldSkipVideoSegment(45, segments);
assert.equal(skipCheck.shouldSkip, true);
assert.equal(skipCheck.skipToSec, 65, 'Should skip to end of sponsor segment');
assert.equal(skipCheck.category, 'sponsor');

const normalCheck = sponsorGov.shouldSkipVideoSegment(10, segments);
assert.equal(normalCheck.shouldSkip, false);
console.log('  ✅ #450 Verified: Channel ads filtered and video sponsor segments skipped.');

// -------------------------------------------------------------
// Test 6: #369 - Linux Flatpak XDG Portal Notification Sanitizer
// -------------------------------------------------------------
console.log('  Testing #369: Linux Flatpak XDG Portal Notification Sanitizer...');
const portalGov = new XdgPortalNotificationGovernor();

const badPayload = {
  title: 'Alert',
  body: 'A'.repeat(700), // Exceeds 500 chars
  imageUri: 'data:image/png;base64,invalid_binary_blob_causing_portal_dbus_crash'
};

const sanitizedResult = portalGov.sanitizeForPortal(badPayload);
assert.equal(sanitizedResult.portalCompatible, true);
assert.ok(sanitizedResult.sanitized.body.length <= 500, 'Body should be clamped to 500 characters');
assert.equal(sanitizedResult.sanitized.imageUri, undefined, 'Invalid data URI must be stripped to prevent crash');
console.log('  ✅ #369 Verified: Portal notification sanitized preventing Flatpak D-Bus crash.');

// -------------------------------------------------------------
// Test 7: #513 - Secure Local MCP JSON-RPC Server Bridge
// -------------------------------------------------------------
console.log('  Testing #513: Secure Local MCP JSON-RPC Server Bridge...');
const mcpGov = new LocalMcpBridgeGovernor();

// Initially disabled
const disabledCall = mcpGov.handleJsonRpc({ jsonrpc: '2.0', method: 'tools/list', id: 1 });
assert.ok(disabledCall.error);
assert.equal(disabledCall.error.code, -32000);

// Enable server with token
const token = 'sec_mcp_token_987654321';
mcpGov.enableServer(token);

// Unauthorized call
const unauthCall = mcpGov.handleJsonRpc({ jsonrpc: '2.0', method: 'tools/list', id: 2 }, 'wrong_token');
assert.equal(unauthCall.error?.code, -32001);

// Authorized tools/list
const listCall = mcpGov.handleJsonRpc({ jsonrpc: '2.0', method: 'tools/list', id: 3 }, token);
assert.ok(listCall.result?.tools);
assert.ok(listCall.result.tools.some(t => t.name === 'telegram_search_channels'));

// Authorized tools/call
const toolCall = mcpGov.handleJsonRpc({
  jsonrpc: '2.0',
  method: 'tools/call',
  params: { name: 'telegram_search_channels', arguments: { query: 'crypto' } },
  id: 4
}, token);
assert.ok(toolCall.result?.content);
assert.ok(toolCall.result.content[0].text.includes('telegram_search_channels executed successfully'));

console.log('  ✅ #513 Verified: Local MCP server bridge provides authenticated, scoped tool endpoints.');

console.log('\n🎉 ALL 7 AYUGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
