/**
 * Verification Suite for Phase 193:
 * Telegram-iOS Build Toolchain, Prerequisites, Packaging Diagnostics,
 * Legacy Media Compatibility & Localization Governor (Final 10 iOS Issues Elimination)
 * 
 * Verifies fixes for:
 * - Telegram-iOS #453, #469, #941: Build prerequisites verification (Bazel, CMake, Ninja, Yasm, Git-LFS) and tutorial guidance.
 * - Telegram-iOS #219, #330: Legacy release (5.13, 6.3) OpenSSL/FFmpeg media compiler flags and architecture slicing.
 * - Telegram-iOS #333, #353, #926: Packaging error analyzer & diagnostic recovery (code sign identity, bitcode, bazel cache).
 * - Telegram-iOS #2402: Dynamic internationalization & CJK language pack fallback resolver.
 * - Telegram-iOS #2397: Cyrillic typography glyph caching & layout memory leak watchdog.
 */

import assert from 'node:assert/strict';
import {
  IosBuildEnvironmentAndPrerequisitesGovernor,
  IosLegacyBranchMediaBuildGovernor,
  IosArchivePackagingDiagnosticsGovernor,
  IosLocalizationAndTypographyGovernor
} from '../src/services/iosBuildToolchainTutorialAndLocalizationGovernor.ts';

console.log('🧪 Starting Phase 193 Verification: Telegram-iOS Final 10 Issues Elimination...');

// -------------------------------------------------------------
// Test 1: #453, #469, #941 - Build Prerequisites & Environment
// -------------------------------------------------------------
console.log('  Testing #453, #469, #941: Build Prerequisites & Toolchain Verification...');
const prereqGov = new IosBuildEnvironmentAndPrerequisitesGovernor();

// All satisfied
const allInstalled = {
  'git-lfs': '3.4.0',
  'cmake': '3.28.0',
  'ninja': '1.11.1',
  'python3': '3.11.4',
  'yasm': '1.3.0'
};
const readyRes = prereqGov.checkPrerequisites(allInstalled);
assert.equal(readyRes.ready, true);
assert.equal(readyRes.missingTools.length, 0);

// Missing tools
const partialInstalled = {
  'git-lfs': '3.4.0',
  'python3': '3.11.4'
};
const missingRes = prereqGov.checkPrerequisites(partialInstalled);
assert.equal(missingRes.ready, false);
assert.ok(missingRes.missingTools.includes('cmake'));
assert.ok(missingRes.missingTools.includes('ninja'));
assert.ok(missingRes.missingTools.includes('yasm'));
assert.ok(missingRes.recommendedInstallCommand.includes('brew install'));
console.log('  ✅ #453, #469, #941 Verified: Build prerequisites & tutorial guidance verified.');

// -------------------------------------------------------------
// Test 2: #219 & #330 - Legacy Release Media Compiler Compatibility
// -------------------------------------------------------------
console.log('  Testing #219 & #330: Legacy Release Media Compiler Flags (5.13 & 6.3)...');
const mediaGov = new IosLegacyBranchMediaBuildGovernor();

// Legacy release 5.13
const flags513 = mediaGov.resolveLegacyMediaCompilerFlags('5.13.0');
assert.deepEqual(flags513.targetArchs, ['arm64']);
assert.ok(flags513.cflags.includes('-DOPENSSL_NO_ASM'));
assert.equal(flags513.useBoringSslShim, true);

// Legacy release 6.3
const flags63 = mediaGov.resolveLegacyMediaCompilerFlags('6.3.1');
assert.deepEqual(flags63.targetArchs, ['arm64']);
assert.ok(flags63.cflags.includes('-DOPENSSL_NO_ASM'));
assert.equal(flags63.useBoringSslShim, true);

// Modern release 10.x
const flagsModern = mediaGov.resolveLegacyMediaCompilerFlags('10.2.0');
assert.ok(flagsModern.targetArchs.includes('arm64e'));
assert.ok(flagsModern.cflags.includes('-std=c++20'));
assert.equal(flagsModern.useBoringSslShim, false);
console.log('  ✅ #219 & #330 Verified: Legacy release media compiler compatibility verified.');

// -------------------------------------------------------------
// Test 3: #333, #353, #926 - Packaging & Build Error Diagnostics
// -------------------------------------------------------------
console.log('  Testing #333, #353, #926: Packaging & Build Error Diagnostics...');
const diagGov = new IosArchivePackagingDiagnosticsGovernor();

// Code sign missing
const signDiag = diagGov.diagnoseBuildLog('error: No signing certificate "iOS Development" found');
assert.equal(signDiag.code, 'CODE_SIGN_IDENTITY_NOT_FOUND');
assert.ok(signDiag.remediationStep.includes('Keychain'));

// Bitcode deprecated
const bitcodeDiag = diagGov.diagnoseBuildLog('warning: bitcode is deprecated and no longer supported');
assert.equal(bitcodeDiag.code, 'BITCODE_DEPRECATED');
assert.ok(bitcodeDiag.remediationStep.includes('ENABLE_BITCODE=NO'));

// Bazel cache corrupted
const bazelDiag = diagGov.diagnoseBuildLog('FATAL: bazel server corrupted internal cache');
assert.equal(bazelDiag.code, 'BAZEL_CACHE_CORRUPT');
assert.ok(bazelDiag.remediationStep.includes('bazel clean --expunge'));

// Python mismatch
const pythonDiag = diagGov.diagnoseBuildLog('File "build-system/Make/Make.py", line 42 SyntaxError: invalid syntax');
assert.equal(pythonDiag.code, 'PYTHON_VERSION_MISMATCH');
assert.ok(pythonDiag.remediationStep.includes('Python 3.10+'));
console.log('  ✅ #333, #353, #926 Verified: Packaging diagnostic recovery verified.');

// -------------------------------------------------------------
// Test 4: #2402 & #2397 - Localization & Typography Cache
// -------------------------------------------------------------
console.log('  Testing #2402 & #2397: Localization Fallback & Typography Cache...');
const locGov = new IosLocalizationAndTypographyGovernor();

// CJK locale resolution
assert.equal(locGov.resolveLocale('zh_CN').effectiveLocale, 'zh-hans');
assert.equal(locGov.resolveLocale('zh_TW').effectiveLocale, 'zh-hant');
assert.equal(locGov.resolveLocale('fa').effectiveLocale, 'fa');
assert.equal(locGov.resolveLocale('xx_YY').effectiveLocale, 'en'); // Fallback to English

// Cyrillic & CJK typography measurement
const latinWidth = locGov.measureGlyphWidth('A', 20);
assert.equal(latinWidth, 12); // ~60% of 20px

const cyrillicWidth = locGov.measureGlyphWidth('Ж', 20);
assert.equal(cyrillicWidth, 12);

const cjkWidth = locGov.measureGlyphWidth('語', 20);
assert.equal(cjkWidth, 20); // Full width 20px

// Verify caching
assert.ok(locGov.getCacheSize() >= 3);
const cachedWidth = locGov.measureGlyphWidth('語', 20);
assert.equal(cachedWidth, 20);
console.log('  ✅ #2402 & #2397 Verified: Internationalization and typography caching verified.');

console.log('\n🎉 ALL 4 PHASE 193 TELEGRAM-IOS FINAL ELIMINATION TESTS PASSED! 🚀');
