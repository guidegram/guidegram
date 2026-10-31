import assert from 'node:assert';
import { DesktopFlatpakPackagingAndContentProtectionGovernor } from '../src/services/desktopFlatpakPackagingAndContentProtectionGovernor.ts';

console.log('=== Phase 133 Verification: Flatpak Packaging & Content Protection Governor ===');

const governor = new DesktopFlatpakPackagingAndContentProtectionGovernor();

// Test 1: Flatpak Manifest Generation with App ID (#196, #177)
{
  const { manifestYaml, metaInfoXml } = governor.generateFlatpakManifest({
    appId: 'io.github.guidegram.desktop',
    runtime: 'org.kde.Platform',
    runtimeVersion: '6.6',
    sdk: 'org.kde.Sdk',
    command: 'guidegram',
    finishArgs: [
      '--socket=wayland',
      '--socket=fallback-x11',
      '--share=network',
      '--share=ipc',
      '--socket=pulseaudio'
    ]
  });

  assert.ok(manifestYaml.includes('app-id: io.github.guidegram.desktop'));
  assert.ok(manifestYaml.includes('runtime: org.kde.Platform'));
  assert.ok(manifestYaml.includes('--socket=wayland'));
  assert.ok(metaInfoXml.includes('<id>io.github.guidegram.desktop</id>'));
  console.log('Test 1 Passed: Flatpak manifest and AppStream metadata generation verified.');
}

// Test 2: Protected Content Restriction for Standard Users (#190)
{
  const evalResult = governor.evaluateContentProtection({
    chatId: 1001,
    isChatProtected: true, // noforwards = true
    isCurrentUserAdmin: false,
    messageId: 50,
    hasMedia: true
  });

  assert.strictEqual(evalResult.canForward, false);
  assert.strictEqual(evalResult.canSaveMedia, false);
  assert.strictEqual(evalResult.canCopyText, false);
  assert.strictEqual(evalResult.watermarkRequired, true);
  assert.ok(evalResult.restrictionReason?.includes('restricted by the channel owner'));
  console.log('Test 2 Passed: Content protection noforwards enforcement verified.');
}

// Test 3: Protected Content Admin Permissions (Admin can copy text) (#190)
{
  const evalResult = governor.evaluateContentProtection({
    chatId: 1001,
    isChatProtected: true,
    isCurrentUserAdmin: true,
    messageId: 51,
    hasMedia: true
  });

  assert.strictEqual(evalResult.canForward, false); // Still cannot forward out
  assert.strictEqual(evalResult.canSaveMedia, false);
  assert.strictEqual(evalResult.canCopyText, true); // Admin text copy allowed
  console.log('Test 3 Passed: Admin text copy privilege in protected chat verified.');
}

// Test 4: Unprotected Normal Chat Permissions
{
  const evalResult = governor.evaluateContentProtection({
    chatId: 2002,
    isChatProtected: false,
    isCurrentUserAdmin: false,
    messageId: 100,
    hasMedia: true
  });

  assert.strictEqual(evalResult.canForward, true);
  assert.strictEqual(evalResult.canSaveMedia, true);
  assert.strictEqual(evalResult.canCopyText, true);
  assert.strictEqual(evalResult.watermarkRequired, false);
  console.log('Test 4 Passed: Normal unprotected chat permissions verified.');
}

// Test 5: Flatpak Permissions Full Compliance (#196, #180)
{
  const valid = governor.validateFlatpakPermissions([
    '--socket=wayland',
    '--socket=fallback-x11',
    '--share=network',
    '--socket=pulseaudio'
  ]);

  assert.strictEqual(valid.hasWaylandSocket, true);
  assert.strictEqual(valid.hasFallbackX11, true);
  assert.strictEqual(valid.hasNetworkShare, true);
  assert.strictEqual(valid.hasAudioServer, true);
  assert.strictEqual(valid.isFullyCompliant, true);
  console.log('Test 5 Passed: Flatpak full permission compliance verified.');
}

// Test 6: Flatpak Missing Permissions Detection
{
  const incomplete = governor.validateFlatpakPermissions([
    '--socket=wayland',
    '--share=network'
  ]);

  assert.strictEqual(incomplete.hasFallbackX11, false);
  assert.strictEqual(incomplete.isFullyCompliant, false);
  console.log('Test 6 Passed: Flatpak missing permissions detection verified.');
}

// Test 7: AppStream Launchable Desktop ID Match (#178, #177)
{
  const { metaInfoXml } = governor.generateFlatpakManifest({
    appId: 'io.github.guidegram.desktop',
    runtime: 'org.kde.Platform',
    runtimeVersion: '6.6',
    sdk: 'org.kde.Sdk',
    command: 'guidegram',
    finishArgs: []
  });

  assert.ok(metaInfoXml.includes('<launchable type="desktop-id">io.github.guidegram.desktop.desktop</launchable>'));
  console.log('Test 7 Passed: AppStream desktop-id synchronization verified.');
}

console.log('=== ALL PHASE 133 TESTS PASSED (100% HEALTH) ===');
