/**
 * Verification Suite for Phase 199:
 * AyuGram macOS Gatekeeper, Window Vibrancy, Homebrew Cask, Crowdin Japanese Localization,
 * Dynamic App Icons, Debian/AppImage Update & Arch PKGBUILD Build Recovery Governor
 * 
 * Verifies fixes for:
 * - AyuGram #273: macOS Gatekeeper quarantine removal (xattr -cr) & microphone AVCaptureDevice permissions.
 * - AyuGram #340: macOS 15/26 Tahoe titlebar vibrancy & AppKit NSVisualEffectView safe area layout.
 * - AyuGram #455: Homebrew cask binary verification & SHA-256 integrity validation.
 * - AyuGram #445: Crowdin localization synchronization & Japanese language typography tokenization.
 * - AyuGram #438: Dynamic desktop app icon runtime switcher (standard, aerogram, pride, dark neon).
 * - AyuGram #373: Debian APT package source verification & AppImage update channel manager.
 * - AyuGram #388 & #313: Arch Linux makepkg PKGBUILD build recovery & submodule checkout resolver.
 */

import assert from 'node:assert/strict';
import {
  MacOsGatekeeperAndPermissionGovernor,
  MacOsTahoeWindowVibrancyGovernor,
  HomebrewCaskLifecycleGovernor,
  CrowdinLocalizationAndJapaneseGovernor,
  DynamicDesktopIconSwitcherGovernor,
  DebianAptAndAppImageUpdateGovernor,
  ArchLinuxMakepkgBuildRecoveryGovernor
} from '../src/services/ayugramMacOsGatekeeperHomebrewAndDebianGovernor.ts';

console.log('🧪 Starting Phase 199 Verification: AyuGram macOS Gatekeeper, Homebrew & Packaging...');

// -------------------------------------------------------------
// Test 1: #273 - macOS Gatekeeper & Microphone Permissions
// -------------------------------------------------------------
console.log('  Testing #273: macOS Gatekeeper Quarantine & Mic Permissions...');
const gkGov = new MacOsGatekeeperAndPermissionGovernor();

// Quarantined and not notarized
const blockedGatekeeper = gkGov.evaluateGatekeeperQuarantine(true, false);
assert.equal(blockedGatekeeper.isLaunchBlocked, true);
assert.equal(blockedGatekeeper.status, 'QUARANTINED_UNNOTARIZED');
assert.ok(blockedGatekeeper.remediationCommand?.includes('xattr -cr'));

// Clean notarized app
const cleanGatekeeper = gkGov.evaluateGatekeeperQuarantine(false, true);
assert.equal(cleanGatekeeper.isLaunchBlocked, false);
assert.equal(cleanGatekeeper.remediationCommand, null);

// Microphone permissions
const micGranted = gkGov.checkMicrophoneAuthorization('granted');
assert.equal(micGranted.canRecord, true);
assert.equal(micGranted.shouldPrompt, false);

const micPrompt = gkGov.checkMicrophoneAuthorization('notDetermined');
assert.equal(micPrompt.canRecord, false);
assert.equal(micPrompt.shouldPrompt, true);
console.log('  ✅ #273 Verified: Gatekeeper quarantine removal and mic permissions verified.');

// -------------------------------------------------------------
// Test 2: #340 - macOS Tahoe Window Vibrancy & Insets
// -------------------------------------------------------------
console.log('  Testing #340: macOS 15+ Tahoe Window Vibrancy...');
const vibrancyGov = new MacOsTahoeWindowVibrancyGovernor();

const tahoeConfig = vibrancyGov.configureWindowVibrancy('15.1.0');
assert.equal(tahoeConfig.material, 'NSVisualEffectMaterialUnderWindowBackground');
assert.equal(tahoeConfig.safeInsetsPx.top, 38);

const sonomaConfig = vibrancyGov.configureWindowVibrancy('14.2.0');
assert.equal(sonomaConfig.safeInsetsPx.top, 28);
console.log('  ✅ #340 Verified: macOS window vibrancy and titlebar insets verified.');

// -------------------------------------------------------------
// Test 3: #455 - Homebrew Cask Formula Lifecycle
// -------------------------------------------------------------
console.log('  Testing #455: Homebrew Cask Formula SHA-256...');
const brewGov = new HomebrewCaskLifecycleGovernor();

// Valid 64-char SHA256 hex
const validCask = brewGov.validateCaskFormula(
  'ayugram',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'monterey'
);
assert.equal(validCask.isValid, true);

// Invalid SHA
const invalidCask = brewGov.validateCaskFormula('ayugram', 'bad_sha', 'monterey');
assert.equal(invalidCask.isValid, false);
console.log('  ✅ #455 Verified: Homebrew cask validation verified.');

// -------------------------------------------------------------
// Test 4: #445 - Crowdin Localization & Japanese Tokenizer
// -------------------------------------------------------------
console.log('  Testing #445: Crowdin Localization & Japanese Typography...');
const crowdinGov = new CrowdinLocalizationAndJapaneseGovernor();

// Japanese tokenization
const jpTokens = crowdinGov.tokenizeJapaneseText('こんにちは世界！');
assert.ok(jpTokens.length >= 2);
assert.equal(jpTokens[0], 'こんにちは'); // Hiragana
assert.equal(jpTokens[1], '世界'); // Kanji

const bundleSync = crowdinGov.syncCrowdinBundle('ayugram_desktop', ['en', 'fa', 'ru', 'ja']);
assert.equal(bundleSync.synced, true);
assert.equal(bundleSync.totalLanguages, 4);
assert.equal(bundleSync.hasJapanese, true);
console.log('  ✅ #445 Verified: Crowdin Japanese localization & tokenization verified.');

// -------------------------------------------------------------
// Test 5: #438 - Dynamic Desktop App Icon Switcher
// -------------------------------------------------------------
console.log('  Testing #438: Dynamic Desktop App Icon Switching...');
const iconGov = new DynamicDesktopIconSwitcherGovernor();

const transIcon = iconGov.switchAppIcon('aerogram_trans');
assert.equal(transIcon.activeIcon, 'icon_aerogram_trans.png');
assert.equal(transIcon.dockBadgeColor, '#5BCEFA');

const neonIcon = iconGov.switchAppIcon('dark_neon');
assert.equal(neonIcon.dockBadgeColor, '#00FFA3');

const defIcon = iconGov.switchAppIcon('default');
assert.equal(defIcon.activeIcon, 'icon_default.png');
console.log('  ✅ #438 Verified: Dynamic desktop app icon switching verified.');

// -------------------------------------------------------------
// Test 6: #373 - Debian APT & AppImage Update Channel
// -------------------------------------------------------------
console.log('  Testing #373: Debian & AppImage Update Channel...');
const updateGov = new DebianAptAndAppImageUpdateGovernor();

const updateNeeded = updateGov.checkRepositoryUpdates('5.4.1', '5.5.0');
assert.equal(updateNeeded.updateAvailable, true);
assert.equal(updateNeeded.updateSource, 'appimage');

const upToDate = updateGov.checkRepositoryUpdates('5.5.0', '5.5.0');
assert.equal(upToDate.updateAvailable, false);
console.log('  ✅ #373 Verified: Debian / AppImage update channel verified.');

// -------------------------------------------------------------
// Test 7: #388 & #313 - Arch Linux Makepkg PKGBUILD Build Recovery
// -------------------------------------------------------------
console.log('  Testing #388 & #313: Arch Linux Makepkg Error Recovery...');
const archGov = new ArchLinuxMakepkgBuildRecoveryGovernor();

const submodRecovery = archGov.recoverBuildFailure('fatal: not a git repository (or any of the parent directories): .git');
assert.equal(submodRecovery.recovered, true);
assert.ok(submodRecovery.remediationAction.includes('submodule update'));

const stripRecovery = archGov.recoverBuildFailure('strip: unable to copy file: permission denied');
assert.equal(stripRecovery.recovered, true);
assert.ok(stripRecovery.remediationAction.includes('--nostrip'));
console.log('  ✅ #388 & #313 Verified: Arch Linux makepkg error recovery verified.');

console.log('\n🎉 ALL 7 PHASE 199 AYUGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
