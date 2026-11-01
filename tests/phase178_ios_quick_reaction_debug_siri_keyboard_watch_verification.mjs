import assert from 'node:assert/strict';
import {
  QuickReactionToggleGovernor,
  DebugProfileIdExposureGovernor,
  SiriKitIntentSafetyGovernor,
  KeyboardSafeAreaLayoutGovernor,
  WatchOSCompanionSyncGovernor,
  WatchOSStandaloneCellularGovernor,
  SiriShortcutsDonationGovernor
} from '../src/services/iosQuickReactionDebugSiriKeyboardAndWatchGovernor.ts';

console.log('🧪 Starting Phase 178 Verification: iOS Quick Reaction, Debug ID, Siri, Keyboard & WatchOS Hardening...');

// -------------------------------------------------------------
// Test 1: QuickReactionToggleGovernor (Resolves #696)
// -------------------------------------------------------------
console.log('  Testing #696: Accidental Quick Reaction Double-Tap Disabling...');
const reactionGov = new QuickReactionToggleGovernor();

// Default enabled
const initialTap = reactionGov.handleDoubleTap();
assert.equal(initialTap.reactionSent, true);
assert.equal(initialTap.emoji, '👍');

// Disable quick reactions
reactionGov.configureQuickReaction(false);
const disabledTap = reactionGov.handleDoubleTap();
assert.equal(disabledTap.reactionSent, false, 'Double tap must be suppressed when quick reaction is disabled');

// Re-enable with custom emoji
reactionGov.configureQuickReaction(true, '🔥');
const customTap = reactionGov.handleDoubleTap();
assert.equal(customTap.reactionSent, true);
assert.equal(customTap.emoji, '🔥');
console.log('  ✅ #696 Verified: Quick reactions can be toggled and customized.');

// -------------------------------------------------------------
// Test 2: DebugProfileIdExposureGovernor (Resolves #2317)
// -------------------------------------------------------------
console.log('  Testing #2317: Profile Raw IDs in Debug Mode...');
const debugGov = new DebugProfileIdExposureGovernor();

// When debug mode is inactive, returns null
assert.equal(debugGov.generateDebugBanner({ userId: '987654321', peerType: 'user' }), null);

// Enable debug mode
debugGov.setDebugMode(true);
const banner = debugGov.generateDebugBanner({ userId: '987654321', peerType: 'user', dcId: 5 });
assert.notEqual(banner, null);
assert.equal(banner.userId, '987654321');
assert.equal(banner.copyableString, '987654321');
assert.ok(banner.formattedDebugBanner.includes('[Debug] ID: 987654321'));
console.log('  ✅ #2317 Verified: Raw Profile IDs exposed in Debug mode with one-tap copy.');

// -------------------------------------------------------------
// Test 3: SiriKitIntentSafetyGovernor (Resolves #2308)
// -------------------------------------------------------------
console.log('  Testing #2308: SiriKit Intent Crash Guard on Nil or Empty Payload...');
const siriGov = new SiriKitIntentSafetyGovernor();

// Nil recipient
const nilRecipient = siriGov.sanitizeIntentPayload(null, 'Hello');
assert.equal(nilRecipient.isSafe, false);
assert.equal(nilRecipient.intentStatus, 'fallback_prompt');

// Empty text
const emptyText = siriGov.sanitizeIntentPayload('Alice', '   ');
assert.equal(emptyText.isSafe, false);
assert.equal(emptyText.intentStatus, 'rejected_empty');

// Valid payload
const valid = siriGov.sanitizeIntentPayload('Alice', 'See you at 5');
assert.equal(valid.isSafe, true);
assert.equal(valid.intentStatus, 'resolved');
assert.equal(valid.sanitizedRecipient, 'Alice');
console.log('  ✅ #2308 Verified: SiriKit intent nil values sanitized, preventing crashes.');

// -------------------------------------------------------------
// Test 4: KeyboardSafeAreaLayoutGovernor (Resolves #1123)
// -------------------------------------------------------------
console.log('  Testing #1123: iOS 17 Keyboard Safe Area Offset & Input Visibility...');
const keyboardGov = new KeyboardSafeAreaLayoutGovernor();

// Keyboard closed
const closedLayout = keyboardGov.calculateComposerOffset(0, 34);
assert.equal(closedLayout.computedComposerBottomOffset, 0);

// Keyboard open at 336px with 34px bottom safe area inset
const openLayout = keyboardGov.calculateComposerOffset(336, 34);
assert.equal(openLayout.computedComposerBottomOffset, 336);
assert.equal(openLayout.isInputFullyVisible, true);
console.log('  ✅ #1123 Verified: Input composer positioned flush with top of keyboard without clipping.');

// -------------------------------------------------------------
// Test 5: WatchOSCompanionSyncGovernor (Resolves #691)
// -------------------------------------------------------------
console.log('  Testing #691: Apple Watch WCSession Memory Budget Clamping...');
const watchSyncGov = new WatchOSCompanionSyncGovernor();

const bulkMessages = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  text: `Message number ${i} in large chat`
}));

const slice = watchSyncGov.buildSafeTransferSlice(bulkMessages);
assert.equal(slice.requestedCount, 500);
assert.equal(slice.clampedCount, 20, 'Watch sync must clamp to 20 messages');
assert.equal(slice.isSafeForWatchRam, true);
console.log('  ✅ #691 Verified: Watch sync clamped to 20 messages, preventing watchOS 8 RAM spike.');

// -------------------------------------------------------------
// Test 6: WatchOSStandaloneCellularGovernor (Resolves #415)
// -------------------------------------------------------------
console.log('  Testing #415: Apple Watch Standalone Cellular Direct Sockets...');
const watchCellularGov = new WatchOSStandaloneCellularGovernor();

// Phone reachable
const pairedTransport = watchCellularGov.resolveTransport({
  isPhonePaired: true,
  isPhoneReachable: true,
  hasCellularOrWifi: true
});
assert.equal(pairedTransport.activeTransport, 'phone_companion_wc_session');

// Phone out of range, cellular active
const standaloneTransport = watchCellularGov.resolveTransport({
  isPhonePaired: true,
  isPhoneReachable: false,
  hasCellularOrWifi: true
});
assert.equal(standaloneTransport.activeTransport, 'standalone_watch_sockets');
console.log('  ✅ #415 Verified: Standalone cellular sockets activated when iPhone companion unreachable.');

// -------------------------------------------------------------
// Test 7: SiriShortcutsDonationGovernor (Resolves #190)
// -------------------------------------------------------------
console.log('  Testing #190: Siri Shortcuts App Intent Donation...');
const shortcutGov = new SiriShortcutsDonationGovernor();

const donation = shortcutGov.donateSendMessageShortcut('chat_445', 'Dr. Ershad');
assert.equal(donation.activityType, 'org.telegram.SendMessageIntent');
assert.equal(donation.targetChatId, 'chat_445');
assert.equal(donation.suggestedInvocationPhrase, 'Send message to Dr. Ershad');
assert.equal(donation.isEligibleForPrediction, true);
console.log('  ✅ #190 Verified: Siri Shortcuts donation created for iOS Shortcuts automation.');

console.log('\n🎉 ALL 7 TELEGRAM-IOS HARDENING TESTS PASSED WITH 100% SUCCESS!');
