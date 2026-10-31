import assert from 'node:assert';
import { DesktopWinGetSavedMessagesAndWebBuildGovernor } from '../src/services/desktopWinGetSavedMessagesAndWebBuildGovernor.ts';

console.log('=== Phase 134 Verification: WinGet, Saved Messages & Web Build Governor ===');

const governor = new DesktopWinGetSavedMessagesAndWebBuildGovernor();

// Test 1: WinGet Package Manifest Generation (#107)
{
  const { versionYaml, installerYaml } = governor.generateWinGetManifest({
    packageIdentifier: 'Guidegram.GuidegramDesktop',
    packageVersion: '5.14.3',
    installerUrl: 'https://github.com/guidegram/desktop/releases/download/v5.14.3/guidegram-setup.exe',
    installerSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    publisher: 'Guidegram Open Source Project',
    license: 'GPL-3.0'
  });

  assert.ok(versionYaml.includes('PackageIdentifier: Guidegram.GuidegramDesktop'));
  assert.ok(versionYaml.includes('PackageVersion: 5.14.3'));
  assert.ok(installerYaml.includes('InstallerSha256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'));
  assert.ok(installerYaml.includes('/VERYSILENT /NORESTART'));
  console.log('Test 1 Passed: WinGet version and installer manifest generation verified.');
}

// Test 2: Fast Navigation to "Saved Messages" (#70)
{
  const target = governor.resolveSavedMessagesNavigation(987654321);
  assert.strictEqual(target.chatId, 987654321);
  assert.strictEqual(target.peerType, 'saved_messages');
  assert.strictEqual(target.isSelfChat, true);
  console.log('Test 2 Passed: Saved Messages quick navigation dispatch verified.');
}

// Test 3: UTF-8 Byte Order Mark (BOM) Sanitization (#61)
{
  const contentWithBom = '\uFEFF[Desktop Entry]\nType=Application\nName=Guidegram';
  const cleanResult = governor.stripByteOrderMark(contentWithBom);
  assert.strictEqual(cleanResult.hadBom, true);
  assert.strictEqual(cleanResult.sanitizedContent.charCodeAt(0), 91); // '['
  assert.strictEqual(cleanResult.sanitizedContent.startsWith('[Desktop Entry]'), true);

  const cleanNoBom = governor.stripByteOrderMark('[Desktop Entry]\nName=Test');
  assert.strictEqual(cleanNoBom.hadBom, false);
  console.log('Test 3 Passed: UTF-8 BOM detection and removal verified.');
}

// Test 4: Web Client Build Plan with pnpm & peer conflicts (#269)
{
  const planPnpm = governor.planWebClientBuild({
    packageManager: 'pnpm',
    nodeVersion: '20.11.0',
    hasPeerDependencyConflicts: true,
    enableSourceMaps: false
  });

  assert.strictEqual(planPnpm.installCommand, 'pnpm install --shamefully-hoist');
  assert.strictEqual(planPnpm.buildCommand, 'pnpm run build');
  assert.strictEqual(planPnpm.resolvedEnvironmentFlags['GENERATE_SOURCEMAP'], 'false');
  console.log('Test 4 Passed: pnpm build plan with dependency hoisting verified.');
}

// Test 5: Web Client Build Plan with npm legacy peer deps (#175)
{
  const planNpm = governor.planWebClientBuild({
    packageManager: 'npm',
    nodeVersion: '20.11.0',
    hasPeerDependencyConflicts: true,
    enableSourceMaps: true
  });

  assert.strictEqual(planNpm.installCommand, 'npm install --legacy-peer-deps');
  assert.strictEqual(planNpm.resolvedEnvironmentFlags['GENERATE_SOURCEMAP'], undefined);
  console.log('Test 5 Passed: npm legacy peer dependencies fallback verified.');
}

// Test 6: UI Grammar & Punctuation Sanitization (#100)
{
  const sanitized = governor.sanitizeUiGrammar('Hello   world  ,  this is   a test  .  ');
  assert.strictEqual(sanitized, 'Hello world, this is a test.');
  console.log('Test 6 Passed: Punctuation and multi-space grammar cleanup verified.');
}

// Test 7: Standard npm ci build plan
{
  const standardNpm = governor.planWebClientBuild({
    packageManager: 'npm',
    nodeVersion: '20.11.0',
    hasPeerDependencyConflicts: false,
    enableSourceMaps: false
  });

  assert.strictEqual(standardNpm.installCommand, 'npm ci');
  console.log('Test 7 Passed: Standard clean npm ci build execution plan verified.');
}

console.log('=== ALL PHASE 134 TESTS PASSED (100% HEALTH) ===');
