/**
 * Verification Suite for Phase 185:
 * Telegram-iOS AppConfig Parser, Extension AppGroup Sync, Enterprise Manifest,
 * Biometric Security, Anti-Phishing URL Scanner & Opus Header Hardening
 * 
 * Verifies fixes for:
 * - Telegram-iOS #28: APP_CONFIG_DATA remote configuration decoding & feature gating
 * - Telegram-iOS #670 & #866: App Extension bundle ID prefixes & App Group entitlements
 * - Telegram-iOS #1490: Enterprise OTA distribution itms-services manifest generation
 * - Telegram-iOS #585: Biometric & passcode exponential lockout with memory sanitization
 * - Telegram-iOS #1187: Anti-phishing, punycode & malicious domain detection
 * - Telegram-iOS #168: Opus audio codec C-header include resolution & frame validation
 */

import assert from 'node:assert/strict';
import {
  IosAppConfigDataGovernor,
  IosAppExtensionGroupGovernor,
  IosEnterpriseManifestGovernor,
  IosBiometricLockoutGovernor,
  IosAntiPhishingUrlScannerGovernor,
  IosOpusHeaderCompatibilityGovernor
} from '../src/services/iosConfigExtensionSecurityPhishingAndOpusGovernor.ts';

console.log('🧪 Starting Phase 185 Verification: Telegram-iOS Config, Extensions, Security & Opus...');

// -------------------------------------------------------------
// Test 1: #28 - Remote APP_CONFIG_DATA Feature Flag Governor
// -------------------------------------------------------------
console.log('  Testing #28: Remote APP_CONFIG_DATA Parsing & Feature Gating...');
const configGov = new IosAppConfigDataGovernor();

const mockRemoteConfig = JSON.stringify({
  min_version: '10.5.0',
  blocked_countries: ['KP', 'SY'],
  features: {
    stories: true,
    crypto_wallet: false,
    channel_boost: true
  },
  max_group_size: 500000,
  experimental_voice_enabled: true
});

const applyResult = configGov.parseAndApplyConfig(mockRemoteConfig);
assert.equal(applyResult.success, true);
assert.equal(configGov.isFeatureAllowed('stories'), true);
assert.equal(configGov.isFeatureAllowed('crypto_wallet'), false);
assert.equal(configGov.isFeatureAllowed('stories', 'KP'), false, 'Feature must be blocked for restricted country');
assert.equal(configGov.isFeatureAllowed('stories', 'US'), true);
assert.equal(configGov.getConfig().maxGroupSize, 500000);
console.log('  ✅ #28 Verified: APP_CONFIG_DATA safely parsed with feature and country gating.');

// -------------------------------------------------------------
// Test 2: #670 & #866 - App Extension Group & Provisioning Entitlements
// -------------------------------------------------------------
console.log('  Testing #670 & #866: Extension Bundle ID & App Group Entitlements...');
const extGov = new IosAppExtensionGroupGovernor();

const validExt = extGov.validateExtensionConfiguration(
  'org.telegram.Telegram-iOS',
  'org.telegram.Telegram-iOS.ShareExtension',
  ['group.org.telegram.TelegramGroup', 'keychain-access-groups']
);
assert.equal(validExt.hasValidPrefix, true);
assert.equal(validExt.entitlementsValid, true);

const invalidExt = extGov.validateExtensionConfiguration(
  'org.telegram.Telegram-iOS',
  'com.random.extension',
  []
);
assert.equal(invalidExt.hasValidPrefix, false);
assert.equal(invalidExt.entitlementsValid, false);
console.log('  ✅ #670 & #866 Verified: Extension bundle prefixes and App Group entitlements verified.');

// -------------------------------------------------------------
// Test 3: #1490 - Enterprise OTA itms-services Manifest
// -------------------------------------------------------------
console.log('  Testing #1490: Enterprise OTA Manifest Plist & Deep Link...');
const otaGov = new IosEnterpriseManifestGovernor();

const plist = otaGov.generateManifestPlist({
  ipaHttpsUrl: 'https://enterprise.guidegram.app/downloads/Guidegram-10.5.ipa',
  bundleId: 'org.telegram.Telegram-iOS',
  bundleVersion: '10.5.0',
  title: 'Guidegram Enterprise',
  iconHttpsUrl: 'https://enterprise.guidegram.app/icon.png'
});

assert.ok(plist.includes('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(plist.includes('<string>https://enterprise.guidegram.app/downloads/Guidegram-10.5.ipa</string>'));
assert.ok(plist.includes('<string>org.telegram.Telegram-iOS</string>'));

const deepLink = otaGov.generateDeepLink('https://enterprise.guidegram.app/manifest.plist');
assert.ok(deepLink.startsWith('itms-services://?action=download-manifest&url='));
console.log('  ✅ #1490 Verified: Enterprise OTA manifest plist and itms-services deep link generated.');

// -------------------------------------------------------------
// Test 4: #585 - Biometric Lockout & Memory Sanitization
// -------------------------------------------------------------
console.log('  Testing #585: Biometric Lockout & Memory Sanitization...');
const bioGov = new IosBiometricLockoutGovernor();
assert.equal(bioGov.getCachedBiometricKey(), 'secure_biometric_auth_token_999');

// 4 failed attempts -> no lockout yet
bioGov.registerFailedAttempt();
bioGov.registerFailedAttempt();
bioGov.registerFailedAttempt();
const att4 = bioGov.registerFailedAttempt();
assert.equal(att4.isLocked, false);
assert.equal(bioGov.isLockedOut(), false);

// 5th failed attempt -> 1 minute lockout
const att5 = bioGov.registerFailedAttempt();
assert.equal(att5.isLocked, true);
assert.equal(att5.lockoutSeconds, 60);
assert.equal(bioGov.isLockedOut(), true);
assert.equal(bioGov.getCachedBiometricKey(), null, 'Sensitive keys wiped upon lockout');

bioGov.resetOnSuccess();
assert.equal(bioGov.isLockedOut(), false);
console.log('  ✅ #585 Verified: Biometric lockout enforces delay and scrubs authentication keys from memory.');

// -------------------------------------------------------------
// Test 5: #1187 - Anti-Phishing & Punycode URL Scanner
// -------------------------------------------------------------
console.log('  Testing #1187: Anti-Phishing & Punycode Scanner...');
const urlGov = new IosAntiPhishingUrlScannerGovernor();

// Punycode homograph attack
const punyResult = urlGov.scanUrl('https://xn--telegrm-11a.org/login');
assert.equal(punyResult.isSuspicious, true);
assert.equal(punyResult.threatType, 'punycode_homograph');
assert.equal(punyResult.recommendedAction, 'warn_user');

// Direct IP hostname
const ipResult = urlGov.scanUrl('http://194.221.250.50/auth');
assert.equal(ipResult.isSuspicious, true);
assert.equal(ipResult.threatType, 'ip_hostname');

// Malicious blacklist domain
const blackResult = urlGov.scanUrl('https://telegram-free-gift.com/claim');
assert.equal(blackResult.isSuspicious, true);
assert.equal(blackResult.threatType, 'malicious_domain');
assert.equal(blackResult.recommendedAction, 'block');

// Legitimate Telegram URL
const legitResult = urlGov.scanUrl('https://t.me/guidegram');
assert.equal(legitResult.isSuspicious, false);
assert.equal(legitResult.recommendedAction, 'allow');
console.log('  ✅ #1187 Verified: Phishing, punycode and impersonation URLs detected and blocked.');

// -------------------------------------------------------------
// Test 6: #168 - Opus Audio Codec Header & Frame Parameter Governor
// -------------------------------------------------------------
console.log('  Testing #168: Opus Header Search Path & Frame Bytes Calculation...');
const opusGov = new IosOpusHeaderCompatibilityGovernor();

const standardHeader = opusGov.resolveIncludeHeader('<opus/opus.h>');
assert.equal(standardHeader.status, 'ok');

const customHeader = opusGov.resolveIncludeHeader('custom/path.h');
assert.equal(customHeader.status, 'shimmed');
assert.equal(customHeader.resolvedHeader, '#include "shims/opus_compat.h"');

// 48kHz, mono, 20ms frame:
// Samples = 48000 * 0.02 = 960 samples
// Frame bytes = 960 * 1 channel * 2 bytes/sample = 1920 bytes
const formatCheck = opusGov.validateFormat({
  sampleRate: 48000,
  channels: 1,
  frameDurationMs: 20
});
assert.equal(formatCheck.valid, true);
assert.equal(formatCheck.frameBytes, 1920);

// Invalid sample rate
const invalidFormat = opusGov.validateFormat({
  sampleRate: 44100, // Opus only supports 8k, 12k, 16k, 24k, 48k
  channels: 1,
  frameDurationMs: 20
});
assert.equal(invalidFormat.valid, false);
console.log('  ✅ #168 Verified: Opus C header includes resolved and frame buffer parameters validated.');

console.log('\n🎉 ALL 7 TELEGRAM-IOS HARDENING TESTS PASSED WITH 100% SUCCESS!');
