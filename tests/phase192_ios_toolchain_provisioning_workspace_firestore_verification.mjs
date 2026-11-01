/**
 * Verification Suite for Phase 192:
 * Telegram-iOS Provisioning Profiles, Xcode Toolchain Compatibility,
 * Workspace Integrity & External Cloud Sync (Firestore) Governor
 * 
 * Verifies fixes for:
 * - Telegram-iOS #1178 & #752: Automated provisioning profile & bundle ID entitlement validation.
 * - Telegram-iOS #668: Deterministic development provisioning manifest generator.
 * - Telegram-iOS #1848 & #1235: Xcode 15/16 toolchain compatibility, linker flags (-ld_classic) & Swift concurrency.
 * - Telegram-iOS #328: Workspace & submodule structural integrity checks preventing missing .xcworkspace crashes.
 * - Telegram-iOS #495: Asynchronous external cloud storage / Firestore sync adapter with optimistic offline caching.
 */

import assert from 'node:assert/strict';
import {
  IosProvisioningProfileGovernor,
  XcodeToolchainCompatibilityGovernor,
  WorkspaceSubmoduleIntegrityGovernor,
  ExternalFirestoreSyncAdapterGovernor
} from '../src/services/iosToolchainProvisioningWorkspaceAndFirestoreGovernor.ts';

console.log('🧪 Starting Phase 192 Verification: Telegram-iOS Toolchain, Provisioning & Firestore...');

// -------------------------------------------------------------
// Test 1: #1178, #752, #668 - iOS Provisioning Profiles & Entitlements
// -------------------------------------------------------------
console.log('  Testing #1178, #752, #668: iOS Code Signing & Provisioning Profiles...');
const provGov = new IosProvisioningProfileGovernor();

// Generate development manifest
const manifest = provGov.generateDevelopmentManifest('org.guidegram.messenger', 'TEAM123456');
assert.equal(manifest.bundleIdentifier, 'org.guidegram.messenger');
assert.equal(manifest.teamIdentifier, 'TEAM123456');
assert.ok(manifest.entitlements.includes('aps-environment'));
assert.ok(manifest.entitlements.includes('com.apple.security.application-groups'));
assert.ok(manifest.entitlements.includes('keychain-access-groups'));

// Validate valid profile
const validRes = provGov.validateProfile(manifest, 'org.guidegram.messenger');
assert.equal(validRes.isValid, true);
assert.equal(validRes.isExpired, false);
assert.equal(validRes.missingEntitlements.length, 0);

// Validate expired profile
const expiredManifest = { ...manifest, expirationTimestampMs: Date.now() - 10000 };
const expiredRes = provGov.validateProfile(expiredManifest, 'org.guidegram.messenger');
assert.equal(expiredRes.isValid, false);
assert.equal(expiredRes.isExpired, true);
assert.ok(expiredRes.diagnosticMessage.includes('expired'));

// Validate bundle ID mismatch
const mismatchRes = provGov.validateProfile(manifest, 'org.other.app');
assert.equal(mismatchRes.isValid, false);
assert.ok(mismatchRes.diagnosticMessage.includes('Bundle identifier mismatch'));

// Validate missing entitlement
const partialManifest = { ...manifest, entitlements: ['aps-environment'] };
const missingRes = provGov.validateProfile(partialManifest, 'org.guidegram.messenger');
assert.equal(missingRes.isValid, false);
assert.ok(missingRes.missingEntitlements.includes('com.apple.security.application-groups'));
console.log('  ✅ #1178, #752, #668 Verified: Provisioning profile validation and generation verified.');

// -------------------------------------------------------------
// Test 2: #1848 & #1235 - Xcode Toolchain Compatibility & Linker Flags
// -------------------------------------------------------------
console.log('  Testing #1848 & #1235: Xcode Toolchain Linker & Concurrency Compatibility...');
const xcodeGov = new XcodeToolchainCompatibilityGovernor();

// Xcode 15: requires -ld_classic linker flag
const xcode15Res = xcodeGov.evaluateToolchain('15.4');
assert.equal(xcode15Res.isCompatible, true);
assert.equal(xcode15Res.recommendedLinkerFlag, '-Wl,-ld_classic');
assert.equal(xcode15Res.swiftConcurrencyMode, 'targeted');

// Xcode 16: requires -ld_classic and full Swift 6 concurrency
const xcode16Res = xcodeGov.evaluateToolchain('16.0');
assert.equal(xcode16Res.isCompatible, true);
assert.equal(xcode16Res.recommendedLinkerFlag, '-Wl,-ld_classic');
assert.equal(xcode16Res.swiftConcurrencyMode, 'complete');

// Xcode 14: classic toolchain without -ld_classic
const xcode14Res = xcodeGov.evaluateToolchain('14.3');
assert.equal(xcode14Res.recommendedLinkerFlag, '');
assert.equal(xcode14Res.swiftConcurrencyMode, 'minimal');
console.log('  ✅ #1848 & #1235 Verified: Xcode 15/16 linker flag and Swift concurrency adaptation verified.');

// -------------------------------------------------------------
// Test 3: #328 - Workspace & Submodule Layout Integrity
// -------------------------------------------------------------
console.log('  Testing #328: Workspace and Git Submodule Verification...');
const wsGov = new WorkspaceSubmoduleIntegrityGovernor();

// Missing workspace entirely
const missingWsRes = wsGov.checkWorkspaceLayout([
  'submodules/telegram-ios',
  'submodules/SSignalKit'
]);
assert.equal(missingWsRes.hasWorkspace, false);
assert.equal(missingWsRes.status, 'MISSING_WORKSPACE');
assert.ok(missingWsRes.remediationCommand?.includes('generateWorkspace'));

// Missing submodules
const uninitSmRes = wsGov.checkWorkspaceLayout([
  'Telegram-iOS.xcworkspace',
  'submodules/telegram-ios'
]);
assert.equal(uninitSmRes.hasWorkspace, true);
assert.equal(uninitSmRes.status, 'UNINITIALIZED_SUBMODULES');
assert.ok(uninitSmRes.missingSubmodules.includes('submodules/TelegramCore'));
assert.ok(uninitSmRes.remediationCommand?.includes('submodule update'));

// Complete valid workspace layout
const readyRes = wsGov.checkWorkspaceLayout([
  'Telegram-iOS.xcworkspace',
  'submodules/telegram-ios',
  'submodules/SSignalKit',
  'submodules/Postbox',
  'submodules/TelegramCore'
]);
assert.equal(readyRes.hasWorkspace, true);
assert.equal(readyRes.status, 'READY');
assert.equal(readyRes.missingSubmodules.length, 0);
assert.equal(readyRes.remediationCommand, null);
console.log('  ✅ #328 Verified: Workspace and submodule structural integrity checks verified.');

// -------------------------------------------------------------
// Test 4: #495 - External Cloud Firestore Sync Adapter
// -------------------------------------------------------------
console.log('  Testing #495: External Cloud Firestore Sync Adapter...');
const firestoreGov = new ExternalFirestoreSyncAdapterGovernor();

// Optimistic set & get cache
firestoreGov.setCache('users', 'user_100', { name: 'Alice', role: 'admin' });
const cachedUser = firestoreGov.getCache('users', 'user_100');
assert.equal(cachedUser.name, 'Alice');
assert.equal(cachedUser.role, 'admin');

// Enqueue sync operation
const syncRes = firestoreGov.enqueueSync('messages', 'msg_999', { text: 'Hello Cloud Sync' });
assert.equal(syncRes.queued, true);
assert.ok(syncRes.operationId.startsWith('messages_msg_999_'));
assert.equal(firestoreGov.getPendingCount(), 1);

// Optimistically available immediately
const cachedMsg = firestoreGov.getCache('messages', 'msg_999');
assert.equal(cachedMsg.text, 'Hello Cloud Sync');

// Flush pending queue
const flushRes = firestoreGov.flushPendingSync();
assert.equal(flushRes.processed, 1);
assert.equal(flushRes.remaining, 0);
assert.equal(firestoreGov.getPendingCount(), 0);
console.log('  ✅ #495 Verified: Firestore sync adapter and optimistic caching verified.');

console.log('\n🎉 ALL 4 PHASE 192 TELEGRAM-IOS VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
