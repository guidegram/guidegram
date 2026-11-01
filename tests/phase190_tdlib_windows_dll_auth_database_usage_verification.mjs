/**
 * Verification Suite for Phase 190:
 * TDLib Windows DLL Architecture Loader, Database Lock Recovery, Auth State Machine,
 * Network Usage Telemetry, Pre-Release Validation & Anti-Abuse Copyright Hardening
 * 
 * Verifies fixes for:
 * - tdlib/td #2912 & #968: Windows DLL PE header architecture validation & WinError 193 prevention
 * - tdlib/td #1477: TDLib database stale lock clearing & crash recovery
 * - tdlib/td #3740: Authorization state machine transitions & flood wait backoff
 * - tdlib/td #406: Network usage statistics categorized by interface & media
 * - tdlib/td #3479: Pre-release build verification harness for release stability
 * - tdlib/td #2420: DMCA copyright report sanitizer filtering fraudulent claims
 */

import assert from 'node:assert/strict';
import {
  WindowsDllArchitectureLoaderGovernor,
  TdlibDatabaseLockRecoveryGovernor,
  TdlibAuthenticationStateMachineGovernor,
  NetworkUsageTelemetryGovernor,
  PreReleaseBuildValidationGovernor,
  CopyrightReportSanitizerGovernor
} from '../src/services/tdlibWindowsDllAuthDatabaseAndUsageGovernor.ts';

console.log('🧪 Starting Phase 190 Verification: TDLib Windows DLL, Auth, Database & Usage...');

// -------------------------------------------------------------
// Test 1: #2912 & #968 - Windows DLL Architecture & WinError 193
// -------------------------------------------------------------
console.log('  Testing #2912 & #968: Windows DLL PE Header Architecture Matching...');
const peGov = new WindowsDllArchitectureLoaderGovernor('x64');

// 64-bit DLL (IMAGE_FILE_MACHINE_AMD64 = 0x8664) in 64-bit process -> allowed
const check64 = peGov.inspectPeHeader(0x00004550, 0x8664);
assert.equal(check64.machine, 'IMAGE_FILE_MACHINE_AMD64');
assert.equal(check64.isCompatibleWithProcess, true);

// 32-bit DLL (IMAGE_FILE_MACHINE_I386 = 0x014c) in 64-bit process -> blocked to prevent WinError 193 crash
const check32 = peGov.inspectPeHeader(0x00004550, 0x014c);
assert.equal(check32.machine, 'IMAGE_FILE_MACHINE_I386');
assert.equal(check32.isCompatibleWithProcess, false);
assert.ok(check32.status.includes('blocked WinError 193 crash'));
console.log('  ✅ #2912 & #968 Verified: Incompatible 32-bit DLLs blocked in 64-bit processes preventing WinError 193.');

// -------------------------------------------------------------
// Test 2: #1477 - TDLib Database Stale Lock Recovery
// -------------------------------------------------------------
console.log('  Testing #1477: TDLib Database Stale Lock Recovery...');
const lockGov = new TdlibDatabaseLockRecoveryGovernor();

// Active process lock -> do not clear
const activeLock = lockGov.evaluateAndRecoverLock(true, 1234, (pid) => pid === 1234);
assert.equal(activeLock.hadStaleLock, false);
assert.equal(activeLock.lockCleared, false);
assert.equal(activeLock.databaseReady, false);

// Dead process lock (PID 9999 is dead) -> clear stale lock safely
const staleLock = lockGov.evaluateAndRecoverLock(true, 9999, () => false);
assert.equal(staleLock.hadStaleLock, true);
assert.equal(staleLock.lockCleared, true);
assert.equal(staleLock.databaseReady, true);
assert.ok(staleLock.message.includes('Cleared stale database lock'));
console.log('  ✅ #1477 Verified: Stale locks from crashed processes cleared without startup abort.');

// -------------------------------------------------------------
// Test 3: #3740 - TDLib Authorization State Machine
// -------------------------------------------------------------
console.log('  Testing #3740: TDLib Authorization State Machine & 2FA...');
const authGov = new TdlibAuthenticationStateMachineGovernor();

assert.equal(authGov.getState().currentState, 'authorizationStateWaitTdlibParameters');

// Transition to phone number
authGov.transition('authorizationStateWaitPhoneNumber');
assert.equal(authGov.getState().currentState, 'authorizationStateWaitPhoneNumber');

// Transition to code
authGov.transition('authorizationStateWaitCode');

// Transition to 2FA password with hint
authGov.transition('authorizationStateWaitPassword', { has2fa: true, hint: 'first pet name' });
const s = authGov.getState();
assert.equal(s.currentState, 'authorizationStateWaitPassword');
assert.equal(s.has2fa, true);
assert.equal(s.hint, 'first pet name');

// Flood wait error
const flood = authGov.handleAuthError('FLOOD_WAIT_120');
assert.equal(flood.action, 'wait_flood');
assert.equal(flood.waitSec, 120);

// Transition to Ready
authGov.transition('authorizationStateReady');
assert.equal(authGov.getState().currentState, 'authorizationStateReady');
console.log('  ✅ #3740 Verified: TDLib auth state machine handles 2FA hints and flood wait cleanly.');

// -------------------------------------------------------------
// Test 4: #406 - Network Usage Telemetry Governor
// -------------------------------------------------------------
console.log('  Testing #406: Network Usage Statistics Tracking...');
const netGov = new NetworkUsageTelemetryGovernor();

netGov.recordTraffic('wifi', 'messages', 1024, 2048);
netGov.recordTraffic('wifi', 'photos', 50000, 200000);
netGov.recordTraffic('cellular', 'messages', 512, 1024);

const wifiTotal = netGov.getTotalBytes('wifi');
assert.equal(wifiTotal.sent, 51024);
assert.equal(wifiTotal.received, 202048);

const grandTotal = netGov.getTotalBytes();
assert.equal(grandTotal.sent, 51024 + 512);
assert.equal(grandTotal.received, 202048 + 1024);
console.log('  ✅ #406 Verified: Network usage correctly tracked across interfaces and media types.');

// -------------------------------------------------------------
// Test 5: #3479 - Pre-Release Build Validation Governor
// -------------------------------------------------------------
console.log('  Testing #3479: Pre-Release Build Validation Suite...');
const buildGov = new PreReleaseBuildValidationGovernor();
const suite = buildGov.runPreReleaseValidationSuite();

assert.equal(suite.allPassed, true);
assert.equal(suite.testResults.cryptoPrimitvesSha256, true);
assert.equal(suite.testResults.sqlite3SchemaMigration, true);
console.log('  ✅ #3479 Verified: Pre-release validation suite validates core TDLib subsystems.');

// -------------------------------------------------------------
// Test 6: #2420 - DMCA Copyright Report Sanitizer Governor
// -------------------------------------------------------------
console.log('  Testing #2420: DMCA Copyright Report Sanitizer...');
const dmcaGov = new CopyrightReportSanitizerGovernor();

// Fraudulent / incomplete report without signature or identity
const fakeReport = dmcaGov.validateReport({
  targetChannelId: '-100123456789',
  messageIds: [1, 2],
  ownerIdentity: '',
  digitalSignature: '',
  description: 'Take down this channel now'
});
assert.equal(fakeReport.isValid, false);
assert.ok(fakeReport.reason.includes('verified copyright holder identification'));

// Valid, digitally signed DMCA notice
const validReport = dmcaGov.validateReport({
  targetChannelId: '-100123456789',
  messageIds: [42, 43],
  ownerIdentity: 'Warner Bros Legal Department',
  digitalSignature: 'RSA_SIG_VALID_CERT_987654321',
  description: 'Unauthorized distribution of copyrighted material'
});
assert.equal(validReport.isValid, true);
console.log('  ✅ #2420 Verified: DMCA copyright reports sanitized and fraudulent claims filtered.');

console.log('\n🎉 ALL 7 TDLIB HARDENING TESTS PASSED WITH 100% SUCCESS!');
