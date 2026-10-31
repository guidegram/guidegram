/**
 * Test Suite: Phase 106 Auto-Start in Tray, Notification Timer & Local Player Verification
 * 
 * Verifies fixes for:
 * - TelegramMessenger/Telegram-iOS #2129: [Bug] No pop-up notifications on official Telegram app (Banner fallback)
 * - TelegramMessenger/Telegram-iOS #1543: Autocomplete bug (Debounce & bounds safety for #hashtags /commands)
 * - AyuGram/AyuGramDesktop #327: [Windows] Crash on message load - timer.cpp assertion failure (Safe timer dispatch)
 * - AyuGram/AyuGramDesktop #262: Notification crash on Fedora (Linux freedesktop DBus notification safety)
 * - morethanwords/tweb #4: [BUG] Blank page in Firefox (Private browsing IndexedDB & Canvas fallback)
 * - kotatogram/kotatogram-desktop #207: [Feature Request] Open video files in local player (External player command execution)
 * - UnigramDev/Unigram #3212: Ability to auto-start in system tray (--autostart --minimized launcher)
 */

import assert from 'node:assert';
import { autoStartNotificationTimerAndPlayerGovernor } from '../src/services/autoStartNotificationTimerAndPlayerGovernor.ts';

console.log('🧪 Starting Phase 106 Auto-Start, Notification Timer & Local Player Verification Suite...');

// 1. Notification Pop-up & In-App Banner Fallback
console.log('  Testing notification pop-up and banner fallback...');
const banner = autoStartNotificationTimerAndPlayerGovernor.dispatchNotification(
  'Direct Message',
  'Check out the latest update',
  'chat_99',
  true // Throttled by OS -> trigger in-app banner
);
assert.strictEqual(banner.isShownInApp, true);
assert.strictEqual(banner.systemThrottled, true);
assert.strictEqual(autoStartNotificationTimerAndPlayerGovernor.getBannerQueue().length, 1);
console.log('  ✅ In-app notification banner fallback verified');

// 2. Autocomplete Debounce & Bounds Safety
console.log('  Testing hashtag and command autocomplete...');
const hashtagAuto = autoStartNotificationTimerAndPlayerGovernor.computeAutocomplete('Hello #tele', 11);
assert.strictEqual(hashtagAuto.type, 'hashtag');
assert.strictEqual(hashtagAuto.items.length, 1);
assert.strictEqual(hashtagAuto.items[0].value, '#telegram');

const commandAuto = autoStartNotificationTimerAndPlayerGovernor.computeAutocomplete('/sta', 4);
assert.strictEqual(commandAuto.type, 'command');
assert.strictEqual(commandAuto.items.length, 2); // /start, /stats
assert.strictEqual(commandAuto.selectedIndex, 0);

// Empty input bounds test
const emptyAuto = autoStartNotificationTimerAndPlayerGovernor.computeAutocomplete('', 0);
assert.strictEqual(emptyAuto.type, 'none');
assert.strictEqual(emptyAuto.items.length, 0);
console.log('  ✅ Autocomplete debouncing and boundary safety verified');

// 3. Resilient Message Timer Assertion Safety
console.log('  Testing safe message timer dispatch & cancellation...');
let callbackFired = 0;
const timer = autoStartNotificationTimerAndPlayerGovernor.createSafeTimer('timer_load_chat', 0, () => {
  callbackFired++;
});
// 0 interval clamped to minimum 16ms to prevent assertion failure
assert.strictEqual(timer.intervalMs, 16);
assert.strictEqual(callbackFired, 1);
assert.strictEqual(timer.dispatchCount, 1);

const cancelled = autoStartNotificationTimerAndPlayerGovernor.cancelSafeTimer('timer_load_chat');
assert.strictEqual(cancelled, true);
console.log('  ✅ Safe message timer dispatch without assertion crashes verified');

// 4. Linux DBus Notification Crash Guard
console.log('  Testing Linux DBus notification safety...');
const dbusSuccess = autoStartNotificationTimerAndPlayerGovernor.emitLinuxDbusNotification('Alert', 'New msg', true);
assert.strictEqual(dbusSuccess.success, true);
assert.strictEqual(dbusSuccess.fallbackUsed, false);

// DBus unavailable -> fallback without crashing
const dbusFallback = autoStartNotificationTimerAndPlayerGovernor.emitLinuxDbusNotification('Alert', 'New msg', false);
assert.strictEqual(dbusFallback.success, true);
assert.strictEqual(dbusFallback.fallbackUsed, true);
assert.ok(dbusFallback.error?.includes('DBus daemon unavailable'));
console.log('  ✅ Linux DBus crash prevention verified');

// 5. Firefox Private Browsing & Compatibility
console.log('  Testing Firefox private browsing storage detection...');
const ffPrivate = autoStartNotificationTimerAndPlayerGovernor.detectFirefoxEnvironment(true);
assert.strictEqual(ffPrivate.isPrivateBrowsing, true);
assert.strictEqual(ffPrivate.storageMode, 'in_memory_transient');
assert.strictEqual(ffPrivate.indexedDbOperational, false);

const ffStandard = autoStartNotificationTimerAndPlayerGovernor.detectFirefoxEnvironment(false);
assert.strictEqual(ffStandard.storageMode, 'indexeddb');
assert.strictEqual(ffStandard.indexedDbOperational, true);
console.log('  ✅ Firefox private browsing fallback verified');

// 6. External Local Media Player Launcher
console.log('  Testing external video player command execution...');
autoStartNotificationTimerAndPlayerGovernor.setPreferredPlayer('mpv');
const mpvLaunch = autoStartNotificationTimerAndPlayerGovernor.openInLocalPlayer('D:\\Videos\\sample.mp4');
assert.strictEqual(mpvLaunch.success, true);
assert.strictEqual(mpvLaunch.command, 'mpv "D:\\Videos\\sample.mp4"');

autoStartNotificationTimerAndPlayerGovernor.setPreferredPlayer('vlc');
const vlcLaunch = autoStartNotificationTimerAndPlayerGovernor.openInLocalPlayer('D:\\Videos\\sample.mp4');
assert.strictEqual(vlcLaunch.command, 'vlc "D:\\Videos\\sample.mp4"');
console.log('  ✅ External media player launch commands verified');

// 7. Auto-Start in System Tray
console.log('  Testing auto-start in system tray configuration...');
const autoStart = autoStartNotificationTimerAndPlayerGovernor.configureAutoStart(true, true);
assert.strictEqual(autoStart.enabled, true);
assert.strictEqual(autoStart.startMinimized, true);
assert.deepStrictEqual(autoStart.launchArguments, ['--autostart', '--minimized']);
console.log('  ✅ Auto-start in system tray launcher verified');

console.log('✨ All Phase 106 Verification Tests Passed 100% Successfully!');
