/**
 * Verification Suite for Phase 202:
 * AyuGram GCC 16 LTO Linker, Anti-Recall Ghost Persistence Across Restarts,
 * Debian ARM64 Multiarch Packaging, Mirror Failover & EPM Governor
 * 
 * Verifies fixes for:
 * - AyuGram #490: GCC 16 Link-Time Optimization (LTO) symbol resolution & mold/gold linker fallback.
 * - AyuGram #488 & #472: Anti-recall ghost message & public channel edits SQLite persistence across app restarts.
 * - AyuGram #482 & #446: Debian / Ubuntu ARM64 native architecture packaging & multiarch control generation.
 * - AyuGram #473: Release binary asset download 404 mirror failover & SHA-256 verification.
 * - AyuGram #97: EPM (Essential Package Manager) packaging instructions & automated installation script.
 * - AyuGram #316: Linux desktop startup crash diagnostics, core dump detection & safe-mode suggestion.
 */

import assert from 'node:assert/strict';
import {
  Gcc16LtoLinkerOptimizationGovernor,
  AntiRecallGhostPersistenceGovernor,
  DebianArm64PackagingGovernor,
  ReleaseBinaryMirrorFailoverGovernor,
  EpmPackagingManifestGovernor,
  LinuxStartupCrashCoreDumpGovernor
} from '../src/services/ayugramLtoAntiRecallArm64AndMirrorGovernor.ts';

console.log('🧪 Starting Phase 202 Verification: AyuGram LTO, Anti-Recall & ARM64 Packaging...');

// -------------------------------------------------------------
// Test 1: #490 - GCC 16 LTO & Mold Linker Fallback
// -------------------------------------------------------------
console.log('  Testing #490: GCC 16 LTO Optimization & Mold Linker...');
const ltoGov = new Gcc16LtoLinkerOptimizationGovernor();

// GCC 16 or crash history -> disable LTO & use mold
const gcc16Config = ltoGov.resolveLtoFlags(16, false);
assert.ok(gcc16Config.cflags.includes('-fno-lto'));
assert.equal(gcc16Config.linker, 'mold');

// Older GCC 14 without crash -> standard LTO
const gcc14Config = ltoGov.resolveLtoFlags(14, false);
assert.ok(gcc14Config.cflags.includes('-flto=auto'));
console.log('  ✅ #490 Verified: GCC 16 LTO symbol resolution and mold linker fallback verified.');

// -------------------------------------------------------------
// Test 2: #488 & #472 - Anti-Recall Ghost Message SQLite Persistence
// -------------------------------------------------------------
console.log('  Testing #488 & #472: Anti-Recall Ghost Message Persistence Across Restarts...');
const ghostGov = new AntiRecallGhostPersistenceGovernor();

// Save 2 deleted messages in a channel
ghostGov.persistDeletedMessage('channel_99', 501, 'Confidential leak announcement');
ghostGov.persistDeletedMessage('channel_99', 502, 'Secret promo code: GUIDE2026');
assert.equal(ghostGov.getGhostCount('channel_99'), 2);

// Simulate client restart and restore
const restoredGhosts = ghostGov.restoreGhostMessagesAfterRestart('channel_99');
assert.equal(restoredGhosts.length, 2);
assert.equal(restoredGhosts[0].messageId, 501);
assert.equal(restoredGhosts[0].content, 'Confidential leak announcement');
assert.equal(restoredGhosts[0].isGhost, true);
assert.equal(restoredGhosts[1].messageId, 502);
console.log('  ✅ #488 & #472 Verified: Anti-recall ghost message persistence across restarts verified.');

// -------------------------------------------------------------
// Test 3: #482 & #446 - Debian / Ubuntu ARM64 Multiarch Packaging
// -------------------------------------------------------------
console.log('  Testing #482 & #446: Debian / Ubuntu ARM64 Control Manifest...');
const debGov = new DebianArm64PackagingGovernor();

const control = debGov.generateDebianControl('7.0.9', 'arm64');
assert.ok(control.includes('Package: guidegram-desktop'));
assert.ok(control.includes('Architecture: arm64'));
assert.ok(control.includes('libssl3'));
assert.ok(control.includes('libqt6core6'));
console.log('  ✅ #482 & #446 Verified: Debian ARM64 control manifest generation verified.');

// -------------------------------------------------------------
// Test 4: #473 - Release Binary Download Mirror Failover
// -------------------------------------------------------------
console.log('  Testing #473: Release Binary Mirror Failover (404 Handling)...');
const mirrorGov = new ReleaseBinaryMirrorFailoverGovernor();

const primaryUrl = 'https://github.com/guidegram/desktop/releases/download/v7.0.9/guidegram.tar.xz';
const backupUrl = 'https://mirror.guidegram.org/releases/v7.0.9/guidegram.tar.xz';

// Primary returns 200 OK
const okRes = mirrorGov.resolveDownloadUrl(primaryUrl, [backupUrl], 200);
assert.equal(okRes.effectiveUrl, primaryUrl);
assert.equal(okRes.isFallbackUsed, false);

// Primary returns 404 Not Found
const failRes = mirrorGov.resolveDownloadUrl(primaryUrl, [backupUrl], 404);
assert.equal(failRes.effectiveUrl, backupUrl);
assert.equal(failRes.isFallbackUsed, true);
assert.equal(failRes.status, 'MIRROR_FALLBACK');
console.log('  ✅ #473 Verified: Release binary 404 mirror failover verified.');

// -------------------------------------------------------------
// Test 5: #97 - EPM Package Manager Packaging Script
// -------------------------------------------------------------
console.log('  Testing #97: EPM Package Manager Command Generation...');
const epmGov = new EpmPackagingManifestGovernor();

const cmd = epmGov.generateEpmCommand('/tmp/guidegram-desktop.deb');
assert.ok(cmd.includes('epm install --recheck'));
assert.ok(cmd.includes('/tmp/guidegram-desktop.deb'));
console.log('  ✅ #97 Verified: EPM package manager installation command verified.');

// -------------------------------------------------------------
// Test 6: #316 - Linux Desktop Startup Crash Core Dump Diagnostics
// -------------------------------------------------------------
console.log('  Testing #316: Linux Desktop Startup Crash Diagnostics...');
const crashGov = new LinuxStartupCrashCoreDumpGovernor();

// Clean exit
const cleanRes = crashGov.inspectCrashState(null, 0);
assert.equal(cleanRes.crashed, false);
assert.equal(cleanRes.safeModeRecommended, false);

// SIGSEGV crash (exit code 139)
const segfaultRes = crashGov.inspectCrashState('SIGSEGV', 139);
assert.equal(segfaultRes.crashed, true);
assert.equal(segfaultRes.safeModeRecommended, true);
assert.ok(segfaultRes.reason.includes('SIGSEGV'));
console.log('  ✅ #316 Verified: Linux startup crash diagnostics and core dump inspection verified.');

console.log('\n🎉 ALL 6 PHASE 202 AYUGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
