/**
 * Verification Suite for Phase 196:
 * AyuGram Desktop Linux Shared Library SONAME Resolution, Unread State Sync,
 * Modern GCC/Clang Conformance, Display Backend Fallback & QR Login Governor
 * 
 * Verifies fixes for:
 * - AyuGram #155, #475, #363: Arch Linux rolling-release SONAME resolution (libicu, libssl) & bundled RPATH fallback.
 * - AyuGram #345, #311: Desktop message unread synchronization & read receipt acknowledgement pipeline.
 * - AyuGram #457: GCC 14/15/16 & Clang-22 modern C++ standard conformance (-include <cstdint>, -Wno-error).
 * - AyuGram #405: Desktop display platform fallback (Wayland -> XCB) on immediate compositor launch crash.
 * - AyuGram #491: QR code login session token expiration & automatic lifecycle refresh.
 */

import assert from 'node:assert/strict';
import {
  LinuxSharedLibrarySonameGovernor,
  DesktopUnreadMessageSyncGovernor,
  ModernGccClangCompilerConformanceGovernor,
  DesktopDisplayBackendFallbackGovernor,
  QrCodeLoginSessionGovernor
} from '../src/services/ayugramLinuxSharedLibSyncAndCompilerGovernor.ts';

console.log('🧪 Starting Phase 196 Verification: AyuGram Linux Shared Libs, Unread Sync & Compiler...');

// -------------------------------------------------------------
// Test 1: #155, #475, #363 - Linux Dynamic Shared Library SONAME & RPATH
// -------------------------------------------------------------
console.log('  Testing #155, #475, #363: Linux SONAME & RPATH Resolution...');
const sonameGov = new LinuxSharedLibrarySonameGovernor();

// Exact match
const exactMatch = sonameGov.resolveLibrary('libcrypto.so.3', ['libcrypto.so.3', 'libc.so.6']);
assert.equal(exactMatch.found, true);
assert.equal(exactMatch.status, 'SYSTEM_NATIVE');
assert.equal(exactMatch.fallbackRpath, null);

// Rolling release minor version bump (Arch Linux libicuuc.so.74 vs 73)
const rollingMatch = sonameGov.resolveLibrary('libicuuc.so.73', ['libicuuc.so.74', 'libc.so.6']);
assert.equal(rollingMatch.found, true);
assert.equal(rollingMatch.resolvedLib, 'libicuuc.so.74');
assert.equal(rollingMatch.status, 'SYSTEM_NATIVE');

// Missing completely -> bundled RPATH fallback
const bundledFallback = sonameGov.resolveLibrary('libcustomcodec.so.1', ['libc.so.6']);
assert.equal(bundledFallback.found, true);
assert.equal(bundledFallback.status, 'BUNDLED_RPATH_FALLBACK');
assert.equal(bundledFallback.fallbackRpath, '$ORIGIN/lib');
console.log('  ✅ #155, #475, #363 Verified: Linux SONAME and bundled RPATH fallback verified.');

// -------------------------------------------------------------
// Test 2: #345 & #311 - Desktop Message Unread State & Read Receipt Ack
// -------------------------------------------------------------
console.log('  Testing #345 & #311: Message Unread Sync & Read Receipt Acknowledgement...');
const syncGov = new DesktopUnreadMessageSyncGovernor();

syncGov.processIncomingMessage('chat_500', 101);
syncGov.processIncomingMessage('chat_500', 102);
assert.equal(syncGov.getUnreadCount('chat_500'), 2);

// Successful read receipt
const ackSuccess = syncGov.acknowledgeReadReceipt('chat_500', 102, true);
assert.equal(ackSuccess.syncedWithServer, true);
assert.equal(ackSuccess.pendingRetry, false);
assert.equal(syncGov.getUnreadCount('chat_500'), 0);

// Failed network ACK -> pending retry flag
syncGov.processIncomingMessage('chat_500', 103);
const ackFailed = syncGov.acknowledgeReadReceipt('chat_500', 103, false);
assert.equal(ackFailed.syncedWithServer, false);
assert.equal(ackFailed.pendingRetry, true);
console.log('  ✅ #345 & #311 Verified: Desktop message unread synchronization verified.');

// -------------------------------------------------------------
// Test 3: #457 - GCC 14+ & Clang Modern C++ Conformance
// -------------------------------------------------------------
console.log('  Testing #457: GCC 14+ & Clang C++20 Compiler Flags...');
const compilerGov = new ModernGccClangCompilerConformanceGovernor();

const gccFlags = compilerGov.resolveFlags('gcc', 14);
assert.ok(gccFlags.includes('-std=c++20'));
assert.ok(gccFlags.includes('-Wno-error=deprecated-declarations'));
assert.ok(gccFlags.includes('-include'));
assert.ok(gccFlags.includes('cstdint'));

const clangFlags = compilerGov.resolveFlags('clang', 18);
assert.ok(clangFlags.includes('-fbracket-depth=1024'));
assert.ok(clangFlags.includes('cstdint'));
console.log('  ✅ #457 Verified: Modern GCC and Clang compiler flags verified.');

// -------------------------------------------------------------
// Test 4: #405 - Desktop Display Backend Fallback (Wayland -> XCB)
// -------------------------------------------------------------
console.log('  Testing #405: Desktop Display Backend Fallback...');
const displayGov = new DesktopDisplayBackendFallbackGovernor();

// Healthy Wayland
const waylandRes = displayGov.selectDisplayBackend('wayland', true, false);
assert.equal(waylandRes.activeBackend, 'wayland');
assert.ok(waylandRes.envVarValue.includes('wayland'));

// Wayland crash history -> safe XCB fallback
const fallbackRes = displayGov.selectDisplayBackend('wayland', true, true);
assert.equal(fallbackRes.activeBackend, 'xcb');
assert.equal(fallbackRes.envVarValue, 'QT_QPA_PLATFORM=xcb');
assert.ok(fallbackRes.reason.includes('crash history'));
console.log('  ✅ #405 Verified: Wayland to XCB display platform fallback verified.');

// -------------------------------------------------------------
// Test 5: #491 - QR Code Login Session Lifecycle
// -------------------------------------------------------------
console.log('  Testing #491: QR Code Login Session Token Expiry...');
const qrGov = new QrCodeLoginSessionGovernor();

const now = Date.now();
const token = qrGov.generateSessionToken(now);
assert.ok(token.token.startsWith('qr_auth_'));
assert.equal(qrGov.isTokenExpired(token, now + 10000), false);
assert.equal(qrGov.isTokenExpired(token, now + 50000), true);

const refreshed = qrGov.refreshSessionToken(now + 50000);
assert.ok(refreshed.token !== token.token);
assert.equal(qrGov.isTokenExpired(refreshed, now + 55000), false);
console.log('  ✅ #491 Verified: QR code login token lifecycle & refresh verified.');

console.log('\n🎉 ALL 5 PHASE 196 AYUGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
