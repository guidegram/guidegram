/**
 * Test Suite: Phase 103 Mini App Reload, Startup Recovery & Call Verification
 * 
 * Verifies fixes for:
 * - Ajaxy/telegram-tt #282: [Mini Apps] Correct Mini App reload (Preserving initData, theme, and iframe session)
 * - UnigramDev/Unigram #1214: Tray icon does not appear in tray (TaskbarCreated & Shell restart resilience)
 * - UnigramDev/Unigram #542: How do I make calls? (Call launch coordinator & permission prompts)
 * - tdlib/td #1758: UPDATE_APP_TO_LOGIN (Graceful version deprecation handling & upgrade banners)
 * - telegramdesktop/tdesktop #27482: telegram crashes on linux 4.14.16 (Glibc/Kernel compatibility fallback)
 * - telegramdesktop/tdesktop #27177: Crash at startup on LinuxMint (Safe mode recovery & cache flushing)
 * - telegramdesktop/tdesktop #2296: Telegram hangs on W10 Anniversary Update (DWM composition deadlock watchdog)
 */

import assert from 'node:assert';
import { miniAppReloadStartupRecoveryAndCallGovernor } from '../src/services/miniAppReloadStartupRecoveryAndCallGovernor.ts';

console.log('🧪 Starting Phase 103 Mini App Reload & Startup Recovery Verification Suite...');

// 1. Mini App Reload State Preserver
console.log('  Testing Mini App reload state preservation...');
miniAppReloadStartupRecoveryAndCallGovernor.registerMiniAppSession(
  'game_tap_bot',
  'https://tapper.app',
  'query_id=AAHd89&user_id=100',
  { bg_color: '#ffffff', text_color: '#000000' }
);
const reloadRes = miniAppReloadStartupRecoveryAndCallGovernor.reloadMiniApp('game_tap_bot');
assert.strictEqual(reloadRes.success, true);
assert.strictEqual(reloadRes.preservedParams.initData, 'query_id=AAHd89&user_id=100');
assert.strictEqual(reloadRes.preservedParams.themeParams.bg_color, '#ffffff');
assert.strictEqual(reloadRes.session?.reloadCount, 1);
console.log('  ✅ Mini App reload parameters preserved without data loss');

// 2. Taskbar / Shell Restart Resilience
console.log('  Testing system tray shell restart resilience...');
const shellRecovery = miniAppReloadStartupRecoveryAndCallGovernor.handleTaskbarCreatedMessage();
assert.strictEqual(shellRecovery.shellRestartDetected, true);
assert.strictEqual(shellRecovery.isCreated, true);
assert.strictEqual(shellRecovery.retryAttempts, 0);

// Retry on failure
const failedTry = miniAppReloadStartupRecoveryAndCallGovernor.ensureTrayIconCreated(true);
assert.strictEqual(failedTry.isCreated, false);
assert.strictEqual(failedTry.retryAttempts, 1);

const successTry = miniAppReloadStartupRecoveryAndCallGovernor.ensureTrayIconCreated(false);
assert.strictEqual(successTry.isCreated, true);
assert.strictEqual(successTry.retryAttempts, 0);
console.log('  ✅ TaskbarCreated message and tray recreation verified');

// 3. Call Launch Coordinator & Permissions
console.log('  Testing call launch permissions & dialing states...');
// Missing microphone
const deniedCall = miniAppReloadStartupRecoveryAndCallGovernor.initiateCall({
  targetUserId: 'user_bob',
  isVideo: false,
  hasAudioPermission: false,
  hasVideoPermission: true,
});
assert.strictEqual(deniedCall.status, 'permission_denied');
assert.ok(deniedCall.requiresPermissions.includes('microphone'));

// Granted permissions
const allowedCall = miniAppReloadStartupRecoveryAndCallGovernor.initiateCall({
  targetUserId: 'user_bob',
  isVideo: true,
  hasAudioPermission: true,
  hasVideoPermission: true,
});
assert.strictEqual(allowedCall.status, 'dialing');
assert.strictEqual(allowedCall.signalingReady, true);
assert.ok(allowedCall.callId.startsWith('call_user_bob_'));
console.log('  ✅ Call initiation and permission checking verified');

// 4. Version Deprecation Guard
console.log('  Testing app version deprecation and update banners...');
// Require version 3.0.0 (current is 2.5.4) -> mandatory_upgrade
const depStatus = miniAppReloadStartupRecoveryAndCallGovernor.checkAppVersion('3.0.0');
assert.strictEqual(depStatus.isDeprecated, true);
assert.strictEqual(depStatus.actionRequired, 'mandatory_upgrade');

// Require version 2.0.0 (current is 2.5.4) -> none
const okStatus = miniAppReloadStartupRecoveryAndCallGovernor.checkAppVersion('2.0.0');
assert.strictEqual(okStatus.isDeprecated, false);
assert.strictEqual(okStatus.actionRequired, 'none');
console.log('  ✅ Version deprecation handling verified');

// 5. Linux Kernel / Glibc Compatibility Fallback
console.log('  Testing Linux kernel 4.14 compatibility mode...');
const legacyLinux = miniAppReloadStartupRecoveryAndCallGovernor.evaluateLinuxEnvironment('4.14.16-generic');
assert.strictEqual(legacyLinux.isLegacyKernel, true);
assert.strictEqual(legacyLinux.executionMode, 'fallback_glibc_compat');

const modernLinux = miniAppReloadStartupRecoveryAndCallGovernor.evaluateLinuxEnvironment('6.8.0-generic');
assert.strictEqual(modernLinux.isLegacyKernel, false);
assert.strictEqual(modernLinux.executionMode, 'standard');
console.log('  ✅ Linux kernel compatibility detection verified');

// 6. Safe Mode Startup Recovery
console.log('  Testing safe mode crash loop recovery...');
// 1st crash
let recovery = miniAppReloadStartupRecoveryAndCallGovernor.recordStartupAttempt(true);
assert.strictEqual(recovery.safeModeActive, false);

// 2nd consecutive crash -> activate safe mode
recovery = miniAppReloadStartupRecoveryAndCallGovernor.recordStartupAttempt(true);
assert.strictEqual(recovery.safeModeActive, true);
assert.ok(recovery.clearedCaches.includes('shader'));
assert.ok(recovery.recoveryMessage?.includes('Safe Mode'));

// Successful start resets counter
recovery = miniAppReloadStartupRecoveryAndCallGovernor.recordStartupAttempt(false);
assert.strictEqual(recovery.safeModeActive, false);
assert.strictEqual(recovery.consecutiveCrashCount, 0);
console.log('  ✅ Safe mode startup recovery loop verified');

// 7. DWM Deadlock Watchdog
console.log('  Testing DWM composition unhang watchdog...');
const unhung = miniAppReloadStartupRecoveryAndCallGovernor.unhangDwmComposition();
assert.strictEqual(unhung.forceRepaintCount, 1);
assert.strictEqual(unhung.isCompositionFrozen, false);
console.log('  ✅ DWM composition watchdog verified');

console.log('✨ All Phase 103 Verification Tests Passed 100% Successfully!');
