import assert from 'node:assert';
import { DesktopPackageConfinementAndRuntimeLaunchGovernor } from '../src/services/desktopPackageConfinementAndRuntimeLaunchGovernor.ts';

console.log('=== Phase 123 Verification: Desktop Package Confinement & Runtime Launch Governor ===');

const governor = new DesktopPackageConfinementAndRuntimeLaunchGovernor();

// Test 1: Wayland aarch64 on Fedora Snap with Software GL Fallback (#17321)
{
  const diag = governor.diagnoseAndPrepareLaunch({
    platform: 'linux',
    architecture: 'aarch64',
    confinement: 'strict_snap',
    displayServer: 'wayland',
    osRelease: 'Fedora 35',
    envVars: { WAYLAND_DISPLAY: 'wayland-0' },
    availableSockets: {
      waylandSocketExists: true,
      x11SocketExists: true,
      pulseaudioSocketExists: true,
      pipewireSocketExists: true,
      dbusSessionSocketExists: true
    },
    installedDependencies: ['KCoreAddons', 'Qt6Core']
  });

  assert.strictEqual(diag.canLaunchSafely, true);
  assert.strictEqual(diag.activeDisplayBackend, 'wayland_with_xcb_fallback_software_gl');
  assert.strictEqual(diag.mitigatedEnvOverrides['QT_QPA_PLATFORM'], 'wayland;xcb');
  assert.strictEqual(diag.mitigatedEnvOverrides['LIBGL_ALWAYS_SOFTWARE'], '1');
  console.log('Test 1 Passed: Wayland aarch64 snap crash mitigation verified.');
}

// Test 2: Kubuntu 25.04 & Ubuntu 24.04 Snap without D-Bus / Audio sockets (#29332, #30437, #7324)
{
  const diag = governor.diagnoseAndPrepareLaunch({
    platform: 'linux',
    architecture: 'x86_64',
    confinement: 'strict_snap',
    displayServer: 'wayland',
    osRelease: 'Kubuntu 25.04',
    envVars: {},
    availableSockets: {
      waylandSocketExists: false, // Broken socket inside snap
      x11SocketExists: true,
      pulseaudioSocketExists: false,
      pipewireSocketExists: false,
      dbusSessionSocketExists: false
    },
    installedDependencies: [] // Host KCoreAddons missing (#25073)
  });

  assert.strictEqual(diag.canLaunchSafely, true);
  assert.strictEqual(diag.activeDisplayBackend, 'xcb'); // Falls back to X11
  assert.strictEqual(diag.mitigatedEnvOverrides['QT_QPA_PLATFORMTHEME'], 'xdgdesktopportal');
  assert.strictEqual(diag.mitigatedEnvOverrides['DBUS_SESSION_BUS_ADDRESS'], 'autolaunch:');
  assert.strictEqual(diag.mitigatedEnvOverrides['PULSE_SERVER'], '');
  console.log('Test 2 Passed: Snap sandbox socket isolation & missing KCoreAddons fallback verified.');
}

// Test 3: Windows 10 source build prerequisite detection (#26012)
{
  const diagFail = governor.diagnoseAndPrepareLaunch({
    platform: 'win32',
    architecture: 'x86_64',
    confinement: 'windows_native',
    displayServer: 'windows_gdi_directx',
    osRelease: 'Windows 10',
    envVars: {},
    availableSockets: {
      waylandSocketExists: false,
      x11SocketExists: false,
      pulseaudioSocketExists: false,
      pipewireSocketExists: false,
      dbusSessionSocketExists: false
    },
    installedDependencies: []
  });

  assert.strictEqual(diagFail.canLaunchSafely, false);
  assert.ok(diagFail.missingDependencies.includes('MSVC_v143'));
  assert.ok(diagFail.missingDependencies.includes('CMake_3.24+'));

  const diagPass = governor.diagnoseAndPrepareLaunch({
    platform: 'win32',
    architecture: 'x86_64',
    confinement: 'windows_native',
    displayServer: 'windows_gdi_directx',
    osRelease: 'Windows 10',
    envVars: {},
    availableSockets: {
      waylandSocketExists: false,
      x11SocketExists: false,
      pulseaudioSocketExists: false,
      pipewireSocketExists: false,
      dbusSessionSocketExists: false
    },
    installedDependencies: ['MSVC_v143', 'CMake_3.24+']
  });

  assert.strictEqual(diagPass.canLaunchSafely, true);
  console.log('Test 3 Passed: Windows 10 source build environment validation verified.');
}

// Test 4: Atomic Updater Checksum Mismatch Abort (#16884)
{
  const updateResult = governor.executeAtomicPackageUpdate({
    targetVersion: '5.14.3',
    packageType: 'native_rpm_deb',
    expectedSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    actualSha256: 'corrupted_hash_payload_123',
    binarySize: 52428800,
    smokeTestPassed: true
  });

  assert.strictEqual(updateResult.status, 'aborted');
  assert.strictEqual(governor.getActiveVersion(), '5.14.2');
  assert.ok(updateResult.failureReason?.includes('Checksum mismatch'));
  console.log('Test 4 Passed: Checksum integrity failure prevention verified.');
}

// Test 5: Atomic Updater Glibc Mismatch Prevention on Fedora/Ubuntu (#30437, #16884)
{
  const updateResult = governor.executeAtomicPackageUpdate({
    targetVersion: '5.14.3',
    packageType: 'native_rpm_deb',
    expectedSha256: 'valid_sha256_mock_abc',
    actualSha256: 'valid_sha256_mock_abc',
    binarySize: 52428800,
    requiredGlibcVersion: '2.38',
    systemGlibcVersion: '2.34', // Outdated system glibc
    smokeTestPassed: true
  });

  assert.strictEqual(updateResult.status, 'aborted');
  assert.strictEqual(governor.getActiveVersion(), '5.14.2');
  assert.ok(updateResult.failureReason?.includes('System libc (2.34) is older than binary requirement (2.38)'));
  console.log('Test 5 Passed: Glibc ABI incompatibility detection verified.');
}

// Test 6: Atomic Updater Smoke Test Failure & Automatic Rollback
{
  const updateResult = governor.executeAtomicPackageUpdate({
    targetVersion: '5.14.3',
    packageType: 'strict_snap',
    expectedSha256: 'valid_sha256_mock_def',
    actualSha256: 'valid_sha256_mock_def',
    binarySize: 52428800,
    smokeTestPassed: false // Staged binary fails launch
  });

  assert.strictEqual(updateResult.status, 'rolled_back');
  assert.strictEqual(governor.getActiveVersion(), '5.14.2');
  console.log('Test 6 Passed: Smoke test failure rollback verified.');
}

// Test 7: Successful Atomic Update Execution
{
  const updateResult = governor.executeAtomicPackageUpdate({
    targetVersion: '5.14.3',
    packageType: 'strict_snap',
    expectedSha256: 'valid_sha256_mock_ghi',
    actualSha256: 'valid_sha256_mock_ghi',
    binarySize: 52428800,
    requiredGlibcVersion: '2.34',
    systemGlibcVersion: '2.38',
    smokeTestPassed: true
  });

  assert.strictEqual(updateResult.status, 'applied');
  assert.strictEqual(governor.getActiveVersion(), '5.14.3');
  console.log('Test 7 Passed: Successful atomic package update verified.');
}

console.log('=== ALL PHASE 123 TESTS PASSED (100% HEALTH) ===');
