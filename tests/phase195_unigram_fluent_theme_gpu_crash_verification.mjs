/**
 * Verification Suite for Phase 195:
 * Unigram Fluent Design Icons, Dynamic Theme Accents, AppContainer Least-Privilege,
 * Win2D / WARP GPU Fallback & Startup Safe-Mode Crash Recovery Governor
 * 
 * Verifies fixes for:
 * - Unigram #1221: Windows 11 Fluent Design adaptive icons and asset plate scaling.
 * - Unigram #1142: Dynamic custom theme generator derived from Windows system accent tokens.
 * - Unigram #1297 & #1139: AppContainer least-privilege manifest auditor & runFullTrust minimizer.
 * - Unigram #1210: Black screen prevention via DirectX/Win2D GPU failure detection & WARP software fallback.
 * - Unigram #2460, #2887, #2027: Consecutive startup crash counter, automatic Safe-Mode activation & unhandled exception interceptor.
 */

import assert from 'node:assert/strict';
import {
  UnigramFluentIconAndThemeGovernor,
  AppContainerSecurityManifestGovernor,
  Win2dGpuWarpFallbackGovernor,
  StartupCrashRecoverySafeModeGovernor
} from '../src/services/unigramFluentThemeGpuAndCrashRecoveryGovernor.ts';

console.log('🧪 Starting Phase 195 Verification: Unigram Fluent Theme, AppContainer & Crash Recovery...');

// -------------------------------------------------------------
// Test 1: #1221 & #1142 - Fluent Icons & Dynamic System Accent Themes
// -------------------------------------------------------------
console.log('  Testing #1221 & #1142: Fluent Design Icons & Dynamic System Theme Accents...');
const themeGov = new UnigramFluentIconAndThemeGovernor();

const darkTheme = themeGov.deriveCustomThemeFromSystem('#0078D4', true);
assert.equal(darkTheme.accentColor, '#0078D4');
assert.equal(darkTheme.background, '#1F1F1F');
assert.equal(darkTheme.text, '#FFFFFF');
assert.equal(darkTheme.isDark, true);

const lightTheme = themeGov.deriveCustomThemeFromSystem('#0078D4', false);
assert.equal(lightTheme.background, '#F3F3F3');
assert.equal(lightTheme.text, '#000000');
assert.equal(lightTheme.isDark, false);

const iconsDark = themeGov.getFluentIconAssets(true);
assert.equal(iconsDark.plateSize, 44);
assert.ok(iconsDark.iconPath.includes('icon_dark.svg'));
assert.equal(iconsDark.hasAdaptivePlate, true);
console.log('  ✅ #1221 & #1142 Verified: Fluent Design icons and dynamic Windows theme accents verified.');

// -------------------------------------------------------------
// Test 2: #1297 & #1139 - AppContainer Least-Privilege Capability Auditor
// -------------------------------------------------------------
console.log('  Testing #1297 & #1139: AppContainer Capability & Least-Privilege Boundary...');
const secGov = new AppContainerSecurityManifestGovernor();

// Safe AppContainer package
const safeAudit = secGov.auditPackageCapabilities(['internetClient', 'privateNetworkClientServer']);
assert.equal(safeAudit.isLeastPrivilege, true);
assert.equal(safeAudit.isAppContainerSafe, true);
assert.equal(safeAudit.prohibitedCapabilities.length, 0);

// Dangerous package with runFullTrust
const dangerousAudit = secGov.auditPackageCapabilities(['internetClient', 'runFullTrust']);
assert.equal(dangerousAudit.isLeastPrivilege, false);
assert.equal(dangerousAudit.isAppContainerSafe, false);
assert.ok(dangerousAudit.prohibitedCapabilities.includes('runFullTrust'));
assert.ok(dangerousAudit.statusMessage.includes('High-risk'));
console.log('  ✅ #1297 & #1139 Verified: AppContainer capability auditing verified.');

// -------------------------------------------------------------
// Test 3: #1210 - Win2D GPU Black Screen Prevention & WARP Fallback
// -------------------------------------------------------------
console.log('  Testing #1210: Win2D GPU Acceleration & WARP Software Fallback...');
const gpuGov = new Win2dGpuWarpFallbackGovernor();

// Healthy GPU hardware
const healthyGpu = gpuGov.initializeRenderingDevice(true, false);
assert.equal(healthyGpu.renderer, 'DirectX_Hardware');
assert.equal(healthyGpu.isHardwareAccelerated, true);

// GPU driver crash during startup
const crashedGpu = gpuGov.initializeRenderingDevice(true, true);
assert.equal(crashedGpu.renderer, 'DirectX_WARP_Software');
assert.equal(crashedGpu.isHardwareAccelerated, false);
assert.ok(crashedGpu.reason.includes('driver crash'));

// Headless or virtual machine without hardware GPU
const noGpu = gpuGov.initializeRenderingDevice(false, false);
assert.equal(noGpu.renderer, 'DirectX_WARP_Software');
assert.equal(noGpu.isHardwareAccelerated, false);
console.log('  ✅ #1210 Verified: Win2D GPU failure detection & WARP fallback verified.');

// -------------------------------------------------------------
// Test 4: #2460, #2887, #2027 - Safe-Mode Crash Recovery & Exception Interceptor
// -------------------------------------------------------------
console.log('  Testing #2460, #2887, #2027: Startup Safe-Mode & Exception Interceptor...');
const crashGov = new StartupCrashRecoverySafeModeGovernor();

// Clean first start
const initStrategy = crashGov.evaluateStartupStrategy();
assert.equal(initStrategy.mode, 'NORMAL');
assert.equal(initStrategy.actionTaken, null);

// First crash intercepted
const err1 = new Error('Database locked on startup');
const intercept1 = crashGov.interceptUnhandledException(err1);
assert.equal(intercept1.intercepted, true);
assert.equal(intercept1.dumpSaved, true);
assert.equal(crashGov.getConsecutiveCrashCount(), 1);

// Strategy after 1 crash is still NORMAL
assert.equal(crashGov.evaluateStartupStrategy().mode, 'NORMAL');

// Second crash intercepted (consecutive)
const err2 = new Error('Access violation in D3D11.dll');
crashGov.interceptUnhandledException(err2);
assert.equal(crashGov.getConsecutiveCrashCount(), 2);

// Strategy after 2 consecutive crashes: SAFE_MODE active!
const safeModeStrategy = crashGov.evaluateStartupStrategy();
assert.equal(safeModeStrategy.mode, 'SAFE_MODE');
assert.ok(safeModeStrategy.actionTaken?.includes('Safe-Mode active'));

// Successful launch resets crash counter
crashGov.resetCrashCount();
assert.equal(crashGov.getConsecutiveCrashCount(), 0);
assert.equal(crashGov.evaluateStartupStrategy().mode, 'NORMAL');
console.log('  ✅ #2460, #2887, #2027 Verified: Startup crash recovery and safe-mode escalation verified.');

console.log('\n🎉 ALL 4 PHASE 195 UNIGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
