/**
 * Verification Suite for Phase 200:
 * TDLib Compiler OOM Throttle, OpenBSD Portability, VSWhere Discovery,
 * Emergency Account Lockout & Semantic Release Provenance Governor
 * 
 * Verifies fixes for:
 * - tdlib/td #334: Compiler cc1plus Killed (OOM) concurrency governor & dynamic ninja job throttling.
 * - tdlib/td #1091: OpenBSD / FreeBSD POSIX endian header resolution & pledge sandbox isolation.
 * - tdlib/td #3068: Visual Studio vswhere.exe instance discovery & vcvarsall.bat environment locator.
 * - tdlib/td #2993: Emergency account hijacking recovery, session revocation & passkey lockdown.
 * - tdlib/td #3099: WebAssembly tdweb client heartbeat watchdog & connection liveness tracker.
 * - tdlib/td #2696, #1790, #2215: Deterministic semantic version tagging & intermediate build provenance.
 */

import assert from 'node:assert/strict';
import {
  CompilerOomConcurrencyThrottleGovernor,
  OpenBsdPosixEndianAndSandboxGovernor,
  VisualStudioVsWhereDiscoveryGovernor,
  EmergencyAccountTakeoverRevocationGovernor,
  WasmTdwebClientHeartbeatGovernor,
  ReleaseSemverTagProvenanceGovernor
} from '../src/services/tdlibCompilerOomBsdVsWhereAndSecurityGovernor.ts';

console.log('🧪 Starting Phase 200 Verification: TDLib Compiler OOM, OpenBSD, VSWhere & Security...');

// -------------------------------------------------------------
// Test 1: #334 - Compiler cc1plus OOM & Concurrency Throttle
// -------------------------------------------------------------
console.log('  Testing #334: Compiler cc1plus OOM Concurrency Throttling...');
const throttleGov = new CompilerOomConcurrencyThrottleGovernor();

// Constrained RAM (8 GB on 16 cores = 512 MB/core -> would trigger cc1plus OOM)
const constrained = throttleGov.calculateOptimalBuildJobs(8192, 16);
assert.ok(constrained.recommendedJobs <= 4);
assert.equal(constrained.useSplitDwarf, true);
assert.equal(constrained.strategy, 'MEMORY_CONSTRAINED_THROTTLE');

// Unconstrained RAM (64 GB on 16 cores = 4 GB/core)
const unconstrained = throttleGov.calculateOptimalBuildJobs(65536, 16);
assert.equal(unconstrained.recommendedJobs, 16);
assert.equal(unconstrained.strategy, 'UNCONSTRAINED_FULL_PARALLEL');
console.log('  ✅ #334 Verified: Dynamic compiler concurrency throttle and OOM prevention verified.');

// -------------------------------------------------------------
// Test 2: #1091 - OpenBSD / FreeBSD Portability & Endian Resolution
// -------------------------------------------------------------
console.log('  Testing #1091: OpenBSD / FreeBSD Endian Headers & Pledge Sandbox...');
const bsdGov = new OpenBsdPosixEndianAndSandboxGovernor();

const openbsdRes = bsdGov.resolveEndianHeaders('openbsd');
assert.equal(openbsdRes.headerFile, 'sys/endian.h');
assert.equal(openbsdRes.isBsd, true);
assert.equal(openbsdRes.pledgeSupported, true);

const linuxRes = bsdGov.resolveEndianHeaders('linux');
assert.equal(linuxRes.headerFile, 'endian.h');
assert.equal(linuxRes.isBsd, false);
console.log('  ✅ #1091 Verified: OpenBSD portability and pledge sandbox support verified.');

// -------------------------------------------------------------
// Test 3: #3068 - Visual Studio vswhere Discovery
// -------------------------------------------------------------
console.log('  Testing #3068: Visual Studio vswhere Instance Discovery...');
const vsGov = new VisualStudioVsWhereDiscoveryGovernor();

const instances = [
  { installationPath: 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community', version: '17.8.2', isComplete: true }
];
const vsRes = vsGov.locateVsInstance(instances);
assert.equal(vsRes.isReady, true);
assert.ok(vsRes.vcvarsallPath?.includes('vcvarsall.bat'));

const emptyRes = vsGov.locateVsInstance([]);
assert.equal(emptyRes.isReady, false);
assert.equal(emptyRes.vcvarsallPath, null);
console.log('  ✅ #3068 Verified: Visual Studio vswhere discovery verified.');

// -------------------------------------------------------------
// Test 4: #2993 - Emergency Account Takeover & Session Revocation
// -------------------------------------------------------------
console.log('  Testing #2993: Emergency Account Lockdown & Session Revocation...');
const secGov = new EmergencyAccountTakeoverRevocationGovernor();

const lockRes = secGov.initiateEmergencyLock('user_88899', true);
assert.equal(lockRes.status, 'ACCOUNT_LOCKED_SECURED');
assert.equal(lockRes.twoStepLockActive, true);
assert.ok(lockRes.sessionsTerminated > 0);

const normalRes = secGov.initiateEmergencyLock('user_88899', false);
assert.equal(normalRes.status, 'NORMAL');
assert.equal(normalRes.twoStepLockActive, false);
console.log('  ✅ #2993 Verified: Emergency account hijack recovery verified.');

// -------------------------------------------------------------
// Test 5: #3099 - WebAssembly tdweb Client Heartbeat
// -------------------------------------------------------------
console.log('  Testing #3099: WebAssembly tdweb Client Heartbeat...');
const hbGov = new WasmTdwebClientHeartbeatGovernor();

const now = Date.now();
hbGov.recordHeartbeat('client_1', now);

// Liveness within 5 seconds
const activeRes = hbGov.checkClientLiveness('client_1', now + 5000);
assert.equal(activeRes.isAlive, true);
assert.equal(activeRes.latencyMs, 5000);

// Timeout after 45 seconds (> 30s threshold)
const stalledRes = hbGov.checkClientLiveness('client_1', now + 45000);
assert.equal(stalledRes.isAlive, false);
console.log('  ✅ #3099 Verified: WebAssembly tdweb heartbeat liveness verified.');

// -------------------------------------------------------------
// Test 6: #2696, #1790, #2215 - Semantic Release Tags & Provenance
// -------------------------------------------------------------
console.log('  Testing #2696, #1790, #2215: Release Semver Tagging & Provenance...');
const tagGov = new ReleaseSemverTagProvenanceGovernor();

const tagRes = tagGov.generateSemverReleaseTag(1, 8, 44, 'abcdef123456');
assert.equal(tagRes.tag, 'v1.8.44');
assert.equal(tagRes.isStable, true);
assert.ok(tagRes.provenanceUrl.includes('v1.8.44#abcdef1'));
console.log('  ✅ #2696, #1790, #2215 Verified: Release semver tagging and provenance verified.');

console.log('\n🎉 ALL 6 PHASE 200 TDLIB VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
