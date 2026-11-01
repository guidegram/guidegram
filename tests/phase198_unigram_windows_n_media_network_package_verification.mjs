/**
 * Verification Suite for Phase 198:
 * Unigram Windows N Media Feature Pack, AppContainer Loopback Isolation,
 * MSIX Certificate Trust, C++/WinRT Toolchain & WinUI 3 Modernization Governor
 * 
 * Verifies fixes for:
 * - Unigram #1370: Windows N edition detection (missing MFPlat.dll) & software FFmpeg media fallback.
 * - Unigram #2594: AppContainer network proxy loopback isolation & CheckNetIsolation exemption manager.
 * - Unigram #2694: Windows 11 MSIX sideloading package signature & root certificate trust validator.
 * - Unigram #2982, #2217, #950: C++/WinRT Visual Studio 2022 toolchain version & NuGet restore validator.
 * - Unigram #399: Windows PRI localization & BCP-47 multi-tier language fallback.
 * - Unigram #2562: Legacy WPF deprecation & modern WinUI 3 / DirectComposition pipeline auditor.
 */

import assert from 'node:assert/strict';
import {
  WindowsNMediaFeaturePackGovernor,
  AppContainerNetworkLoopbackGovernor,
  MsixPackageCertificateTrustGovernor,
  CppWinRtVs2022ToolchainGovernor,
  WindowsPriLocalizationGovernor,
  WinUi3RenderingMigrationGovernor
} from '../src/services/unigramWindowsNMediaNetworkAndPackageGovernor.ts';

console.log('🧪 Starting Phase 198 Verification: Unigram Windows N Media, AppContainer & MSIX...');

// -------------------------------------------------------------
// Test 1: #1370 - Windows N Media Feature Pack Absence & FFmpeg Fallback
// -------------------------------------------------------------
console.log('  Testing #1370: Windows N Media Feature Pack Absence Detection...');
const mfGov = new WindowsNMediaFeaturePackGovernor();

// Windows N edition: missing MFPlat.dll
const windowsNAudit = mfGov.checkMediaFoundationAvailability(['kernel32.dll', 'user32.dll']);
assert.equal(windowsNAudit.isWindowsN, true);
assert.equal(windowsNAudit.isMediaFoundationAvailable, false);
assert.equal(windowsNAudit.fallbackStrategy, 'SOFTWARE_FFMPEG');
assert.ok(windowsNAudit.diagnosticMessage.includes('Windows N edition'));

// Standard Windows edition: MFPlat.dll and MFReadWrite.dll present
const standardAudit = mfGov.checkMediaFoundationAvailability(['MFPlat.dll', 'MFReadWrite.dll', 'kernel32.dll']);
assert.equal(standardAudit.isWindowsN, false);
assert.equal(standardAudit.isMediaFoundationAvailable, true);
assert.equal(standardAudit.fallbackStrategy, 'NATIVE_MF');
console.log('  ✅ #1370 Verified: Windows N Media Feature Pack absence and fallback verified.');

// -------------------------------------------------------------
// Test 2: #2594 - AppContainer Network Loopback Isolation
// -------------------------------------------------------------
console.log('  Testing #2594: AppContainer Network Proxy Loopback Isolation...');
const netGov = new AppContainerNetworkLoopbackGovernor();

// Local proxy (e.g. 127.0.0.1:1080) without exemption
const blockedRes = netGov.evaluateProxyLoopbackAccess(false, true);
assert.equal(blockedRes.canConnect, false);
assert.equal(blockedRes.status, 'LOOPBACK_BLOCKED');
assert.ok(blockedRes.remediationCommand?.includes('CheckNetIsolation.exe LoopbackExempt'));

// Local proxy with loopback exemption granted
const allowedRes = netGov.evaluateProxyLoopbackAccess(true, true);
assert.equal(allowedRes.canConnect, true);
assert.equal(allowedRes.status, 'CONNECTED');
assert.equal(allowedRes.remediationCommand, null);
console.log('  ✅ #2594 Verified: AppContainer proxy loopback isolation & exemption verified.');

// -------------------------------------------------------------
// Test 3: #2694 - MSIX Certificate Trust & Sideloading
// -------------------------------------------------------------
console.log('  Testing #2694: MSIX Package Certificate Trust & Sideloading...');
const msixGov = new MsixPackageCertificateTrustGovernor();

// Untrusted root
const untrustedRes = msixGov.verifyPackageSignature('CN=Guidegram Beta', true, false);
assert.equal(untrustedRes.canInstall, false);
assert.equal(untrustedRes.status, 'UNTRUSTED_ROOT');

// Developer mode disabled
const noDevModeRes = msixGov.verifyPackageSignature('CN=Guidegram Beta', false, true);
assert.equal(noDevModeRes.canInstall, false);
assert.equal(noDevModeRes.status, 'DEVELOPER_MODE_REQUIRED');

// Valid trusted root + developer mode
const trustedRes = msixGov.verifyPackageSignature('CN=Guidegram Beta', true, true);
assert.equal(trustedRes.canInstall, true);
assert.equal(trustedRes.status, 'TRUSTED');
console.log('  ✅ #2694 Verified: MSIX package certificate trust verification verified.');

// -------------------------------------------------------------
// Test 4: #2982, #2217, #950 - C++/WinRT Visual Studio 2022 Toolchain
// -------------------------------------------------------------
console.log('  Testing #2982, #2217, #950: C++/WinRT Toolchain & NuGet Restore...');
const toolchainGov = new CppWinRtVs2022ToolchainGovernor();

// Outdated components
const badToolchain = toolchainGov.verifyBuildToolchain('17.2.0', '1.0.19', false);
assert.equal(badToolchain.canCompile, false);
assert.ok(badToolchain.missingComponents.includes('VS2022_17.5+'));
assert.ok(badToolchain.missingComponents.includes('NuGet_Packages'));

// Valid modern toolchain
const goodToolchain = toolchainGov.verifyBuildToolchain('17.8.2', '2.0.22', true);
assert.equal(goodToolchain.canCompile, true);
assert.equal(goodToolchain.missingComponents.length, 0);
console.log('  ✅ #2982, #2217, #950 Verified: C++/WinRT toolchain & NuGet verification verified.');

// -------------------------------------------------------------
// Test 5: #399 - Windows PRI Localization & BCP-47 Fallback
// -------------------------------------------------------------
console.log('  Testing #399: Windows PRI Localization Fallback...');
const priGov = new WindowsPriLocalizationGovernor();

// Direct match
assert.equal(priGov.resolveLocalizedResource('settings_title', 'fa').text, 'تنظیمات');

// Language prefix match (fa-IR -> fa)
assert.equal(priGov.resolveLocalizedResource('settings_title', 'fa-IR').text, 'تنظیمات');

// English fallback
assert.equal(priGov.resolveLocalizedResource('settings_title', 'ja-JP').text, 'Settings');
console.log('  ✅ #399 Verified: Windows PRI localization & multi-tier fallback verified.');

// -------------------------------------------------------------
// Test 6: #2562 - Modern UI Framework Migration (WPF vs WinUI 3)
// -------------------------------------------------------------
console.log('  Testing #2562: Modern UI Framework Migration...');
const uiGov = new WinUi3RenderingMigrationGovernor();

const wpfAudit = uiGov.auditUiFramework('WPF');
assert.equal(wpfAudit.isModern, false);
assert.equal(wpfAudit.hasDirectComposition, false);

const winuiAudit = uiGov.auditUiFramework('WinUI3');
assert.equal(winuiAudit.isModern, true);
assert.equal(winuiAudit.hasDirectComposition, true);
assert.equal(winuiAudit.supportsXamlIslands, true);
console.log('  ✅ #2562 Verified: WinUI 3 modern DirectComposition pipeline verified.');

console.log('\n🎉 ALL 6 PHASE 198 UNIGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
