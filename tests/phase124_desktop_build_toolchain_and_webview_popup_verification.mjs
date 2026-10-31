import assert from 'node:assert';
import { DesktopBuildToolchainAndWebviewPopupGovernor } from '../src/services/desktopBuildToolchainAndWebviewPopupGovernor.ts';

console.log('=== Phase 124 Verification: Desktop Build Toolchain & Webview Popup Governor ===');

const governor = new DesktopBuildToolchainAndWebviewPopupGovernor();

// Test 1: Minimum CMake version enforcement & submodules check (#4275, #117)
{
  const planOldCmake = governor.generateBuildDiagnosticPlan({
    compiler: 'gcc',
    compilerVersion: '13.2',
    cmakeVersion: '3.16.3', // Too old for modern Telegram build
    qtVersion: '6.5.0',
    hasSubmodulesInitialized: false,
    targetPlatform: 'linux',
    cxxStandard: 'c++20'
  });

  assert.strictEqual(planOldCmake.isSupported, false);
  assert.ok(planOldCmake.warnings.some(w => w.includes('CMake version 3.16.3 is too old')));
  assert.ok(planOldCmake.submoduleActions.includes('git submodule update --init --recursive'));
  console.log('Test 1 Passed: Legacy CMake & uninitialized submodules detection verified.');
}

// Test 2: Visual Studio 2022 C++20 compiler flags (#26646)
{
  const planVS2022 = governor.generateBuildDiagnosticPlan({
    compiler: 'msvc',
    compilerVersion: '19.38', // VS2022 v143
    cmakeVersion: '3.28.1',
    qtVersion: '6.6.2',
    hasSubmodulesInitialized: true,
    targetPlatform: 'windows',
    cxxStandard: 'c++20'
  });

  assert.strictEqual(planVS2022.isSupported, true);
  assert.ok(planVS2022.requiredCmakeFlags.includes('/std:c++20'));
  assert.ok(planVS2022.requiredCmakeFlags.includes('/utf-8'));
  console.log('Test 2 Passed: VS2022 C++20 toolchain configuration verified.');
}

// Test 3: Qt 6.8 Deprecation Shims & API compatibility (#464)
{
  const planQt68 = governor.generateBuildDiagnosticPlan({
    compiler: 'clang',
    compilerVersion: '17.0',
    cmakeVersion: '3.29.0',
    qtVersion: '6.8.0',
    hasSubmodulesInitialized: true,
    targetPlatform: 'linux',
    cxxStandard: 'c++20'
  });

  assert.strictEqual(planQt68.isSupported, true);
  assert.strictEqual(planQt68.inferredQtTarget, 'qt6_8_modern');
  assert.ok(planQt68.apiCompatPatches.includes('QT6_8_QFONT_METRICS_ADVANCE_SHIM'));
  assert.ok(planQt68.apiCompatPatches.includes('QT6_8_QPAINTERPATH_STROKE_SHIM'));
  assert.ok(planQt68.requiredCmakeFlags.includes('-DDISABLE_QT68_DEPRECATION_WARNINGS=ON'));
  console.log('Test 3 Passed: Qt 6.8 API change shims & deprecation suppression verified.');
}

// Test 4: Qt 5 legacy support on Arch Linux (#260)
{
  const planQt5 = governor.generateBuildDiagnosticPlan({
    compiler: 'gcc',
    compilerVersion: '12.2',
    cmakeVersion: '3.25.0',
    qtVersion: '5.15.10',
    hasSubmodulesInitialized: true,
    targetPlatform: 'linux',
    cxxStandard: 'c++17'
  });

  assert.strictEqual(planQt5.isSupported, true);
  assert.strictEqual(planQt5.inferredQtTarget, 'qt5_compat');
  assert.ok(planQt5.apiCompatPatches.includes('QT5_HIGH_DPI_SCALING_SHIM'));
  console.log('Test 4 Passed: Qt 5 compatibility shims on Linux verified.');
}

// Test 5: Snap sandbox WebApp OAuth popup routing (#27363)
{
  const resultOAuth = governor.dispatchWebviewPopup({
    parentConfinement: 'strict_snap',
    targetUrl: 'https://oauth.telegram.org/auth?bot_id=123',
    isOAuthFlow: true,
    hasNativeWebEngineSupport: true,
    supportsXdgDesktopPortal: true
  });

  assert.strictEqual(resultOAuth.routeAction, 'xdg_portal_external_browser');
  assert.ok(resultOAuth.sandboxToken?.startsWith('portal-token-'));
  assert.ok(resultOAuth.auditMessage.includes('org.freedesktop.portal.OpenURI'));
  console.log('Test 5 Passed: Snap sandbox OAuth popup portal redirection verified.');
}

// Test 6: Snap sandbox WebApp non-OAuth popup with isolated WebEngine (#27363)
{
  const resultPopup = governor.dispatchWebviewPopup({
    parentConfinement: 'strict_snap',
    targetUrl: 'https://webapp.guidegram.io/modal?id=456',
    isOAuthFlow: false,
    hasNativeWebEngineSupport: true,
    supportsXdgDesktopPortal: true
  });

  assert.strictEqual(resultPopup.routeAction, 'isolated_popup_window');
  assert.strictEqual(resultPopup.sandboxToken, 'snap-isolated-popup-token');
  console.log('Test 6 Passed: Snap sandbox isolated modal WebEngine popup verified.');
}

// Test 7: Untrusted protocol blocking
{
  const resultBlocked = governor.dispatchWebviewPopup({
    parentConfinement: 'native',
    targetUrl: 'javascript:alert(1)',
    isOAuthFlow: false,
    hasNativeWebEngineSupport: true,
    supportsXdgDesktopPortal: false
  });

  assert.strictEqual(resultBlocked.routeAction, 'blocked_untrusted');
  console.log('Test 7 Passed: Insecure / script protocol URL rejection verified.');
}

console.log('=== ALL PHASE 124 TESTS PASSED (100% HEALTH) ===');
