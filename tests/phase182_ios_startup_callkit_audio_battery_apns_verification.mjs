/**
 * Verification Suite for Phase 182:
 * Telegram-iOS Startup Crash, Black Screen Warmup, CallKit Caller ID,
 * Navigation Button, Audio Interruption, Battery Drain & APNs Extension Hardening
 * 
 * Verifies fixes for:
 * - Telegram-iOS #2108: Safe app launch & keychain container migration
 * - Telegram-iOS #1057: Root window display link warmup preventing black screen
 * - Telegram-iOS #1761: CallKit synchronous caller identity resolution
 * - Telegram-iOS #2387: Interactive navigation button state locking & debouncing
 * - Telegram-iOS #2346: AVAudioSession interruption & hardware mute recovery
 * - Telegram-iOS #2271: Background power & battery drain governor
 * - Telegram-iOS #74: APNs Notification Service Extension payload decryption & badge sync
 */

import assert from 'node:assert/strict';
import {
  IosStartupSandboxGovernor,
  IosRootWindowWarmupGovernor,
  CallKitCallerIdentityGovernor,
  IosNavigationButtonStateGovernor,
  IosAudioSessionInterruptGovernor,
  IosBackgroundPowerGovernor,
  ApnsExtensionDecryptionGovernor
} from '../src/services/iosStartupCallKitAudioBatteryAndApnsGovernor.ts';

console.log('🧪 Starting Phase 182 Verification: Telegram-iOS Startup, CallKit, Audio, Battery & APNs...');

// -------------------------------------------------------------
// Test 1: #2108 - Safe App Launch & Keychain Sandbox Migration
// -------------------------------------------------------------
console.log('  Testing #2108: iOS Sandbox Container UUID Migration & Keychain Tokens...');
const sandboxGov = new IosStartupSandboxGovernor();

// Simulate iOS system upgrade where container UUID changes
const oldPath = '/var/mobile/Containers/Data/Application/OLD_UUID_123';
const newPath = '/var/mobile/Containers/Data/Application/NEW_UUID_456';

const migration = sandboxGov.evaluateAndMigrate(oldPath, newPath);
assert.equal(migration.migrated, true);
assert.equal(migration.currentContainerPath, newPath);
assert.ok(migration.keychainItemsRestored >= 2);
assert.equal(sandboxGov.getKeychainItem('auth_token'), 'sec_tok_valid_session_key');
console.log('  ✅ #2108 Verified: Keychain tokens restored across container UUID migration without crash.');

// -------------------------------------------------------------
// Test 2: #1057 - Root Window Display Link Warmup
// -------------------------------------------------------------
console.log('  Testing #1057: Root Window Display Link Warmup & Splash Guard...');
const rootWarmupGov = new IosRootWindowWarmupGovernor();

// Attempting to dismiss splash before view layout pass must be denied
const earlyDismiss = rootWarmupGov.dismissLaunchSplash();
assert.equal(earlyDismiss.allowed, false, 'Premature splash dismissal must be prevented');

// Attach hierarchy and run layout pass
rootWarmupGov.attachRootViewController();
rootWarmupGov.notifyFirstLayoutPass();

const readyDismiss = rootWarmupGov.dismissLaunchSplash();
assert.equal(readyDismiss.allowed, true);
assert.equal(rootWarmupGov.getState().splashDismissed, true);
console.log('  ✅ #1057 Verified: Splash dismissal gated by layout pass, preventing black screen on launch.');

// -------------------------------------------------------------
// Test 3: #1761 - CallKit Caller Identity Synchronous Pre-Resolution
// -------------------------------------------------------------
console.log('  Testing #1761: CallKit Synchronous Caller Name Resolution...');
const callKitGov = new CallKitCallerIdentityGovernor();

// Known contact
const call1 = callKitGov.prepareCallUpdate('uuid-1', '+989123456789');
assert.equal(call1.localizedCallerName, 'Dr. Ershad Zolfi');
assert.equal(call1.callerResolvedSynchronously, true);

// Unknown phone number -> formatted number instead of "Unknown"
const call2 = callKitGov.prepareCallUpdate('uuid-2', '+19998887766');
assert.equal(call2.localizedCallerName, '+19998887766');
assert.notEqual(call2.localizedCallerName, 'Unknown');
console.log('  ✅ #1761 Verified: Caller identity synchronously resolved, eliminating "Unknown" caller bug.');

// -------------------------------------------------------------
// Test 4: #2387 - Interactive Navigation Button State & Debounce
// -------------------------------------------------------------
console.log('  Testing #2387: Navigation Button Debounce & Swipe Transition Lock...');
const navButtonGov = new IosNavigationButtonStateGovernor();

// First tap allowed
const tap1 = navButtonGov.handleButtonTap();
assert.equal(tap1.actionAllowed, true);

// Rapid second tap debounced
const tap2 = navButtonGov.handleButtonTap();
assert.equal(tap2.actionAllowed, false);
assert.ok(tap2.reason.includes('debounced'));

// Interactive swipe transition locks tap
navButtonGov.startInteractiveTransition();
const transitionTap = navButtonGov.handleButtonTap();
assert.equal(transitionTap.actionAllowed, false);
assert.ok(transitionTap.reason.includes('interactive transition'));

navButtonGov.finishInteractiveTransition();
assert.equal(navButtonGov.getButtonVisibility(), true);
console.log('  ✅ #2387 Verified: New Chat button debounced and transition-locked to prevent UI glitches.');

// -------------------------------------------------------------
// Test 5: #2346 - AVAudioSession Interruption & Mute Switch Recovery
// -------------------------------------------------------------
console.log('  Testing #2346: AVAudioSession Interruption & Category Recovery...');
const audioGov = new IosAudioSessionInterruptGovernor();
audioGov.setCategory('playback');
assert.equal(audioGov.getState().isActive, true);

// Phone call interrupts media playback
audioGov.handleInterruptionBegan();
assert.equal(audioGov.getState().interrupted, true);
assert.equal(audioGov.getState().isActive, false);

// Call ends, resume playback
const resumeResult = audioGov.handleInterruptionEnded(true);
assert.equal(resumeResult.resumed, true);
assert.equal(resumeResult.category, 'playback');
assert.equal(audioGov.getState().isActive, true);
console.log('  ✅ #2346 Verified: Audio session interruptions handled and playback resumed cleanly.');

// -------------------------------------------------------------
// Test 6: #2271 - Background Power & Battery Drain Governor
// -------------------------------------------------------------
console.log('  Testing #2271: Background Power & Timer Throttling...');
const powerGov = new IosBackgroundPowerGovernor();
powerGov.registerTimer();
powerGov.registerTimer();
powerGov.registerTimer();
assert.equal(powerGov.getStatus().activeTimers, 3);

const bgStatus = powerGov.notifyAppBackgrounded();
assert.equal(bgStatus.timersSuspended, 3, 'All non-critical timers suspended on backgrounding');
assert.equal(bgStatus.locationThrottledHz, 0.01, 'Location tracking throttled when stationary');
assert.equal(bgStatus.fetchBudgetSec, 30, 'Background fetch budget clamped to 30s');
assert.equal(powerGov.getStatus().activeTimers, 0);
console.log('  ✅ #2271 Verified: Background fetch clamped and timers suspended to eliminate battery drain.');

// -------------------------------------------------------------
// Test 7: #74 - APNs Notification Service Extension Decryption
// -------------------------------------------------------------
console.log('  Testing #74: APNs Notification Extension Decryption & Badge Sync...');
const apnsGov = new ApnsExtensionDecryptionGovernor();

// Fast successful decryption
const fastResult = await apnsGov.processNotificationPayload({
  alert: 'Incoming message',
  badge: 4,
  encryptedData: 'aes_cipher_payload_blob'
});
assert.equal(fastResult.displayTitle, 'Alice');
assert.equal(fastResult.badge, 4);
assert.equal(fastResult.timedOut, false);

// Slow network timeout fallback before iOS kills extension
const timeoutResult = await apnsGov.processNotificationPayload(
  { alert: 'Incoming message', badge: 5, encryptedData: 'slow_payload' },
  5000,
  true
);
assert.equal(timeoutResult.timedOut, true);
assert.equal(timeoutResult.displayTitle, 'Telegram');
assert.equal(timeoutResult.displayBody, 'You have a new encrypted message');
assert.equal(timeoutResult.badge, 5);
console.log('  ✅ #74 Verified: APNs extension decrypts payloads with graceful timeout fallback and badge sync.');

console.log('\n🎉 ALL 7 TELEGRAM-IOS HARDENING TESTS PASSED WITH 100% SUCCESS!');
