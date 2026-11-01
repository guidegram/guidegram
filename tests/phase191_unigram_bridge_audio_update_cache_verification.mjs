/**
 * Verification Suite for Phase 191:
 * Unigram Desktop Bridge AppContainer Sandbox, Store Update Auto-Restart,
 * WASAPI Audio Capture, Global Desktop Shortcuts, Channel Invite Subscription,
 * Chat Gradient Wallpaper & Storage Cache Retention Governor
 * 
 * Verifies fixes for:
 * - Unigram #2176: Desktop Bridge / AppContainer sandbox security & redirected filesystem isolation.
 * - Unigram #3232: Store package update detection, state serialization & clean auto-restart.
 * - Unigram #3262: Windows WASAPI microphone capture, buffer underrun guard & mode fallback.
 * - Unigram #2837: Global desktop keyboard shortcuts registry (Ctrl+N, Ctrl+Shift+M, Ctrl+W, F5).
 * - Unigram #2349: Channel invite link subscription resolver preventing "Chat doesn't exist" errors.
 * - Unigram #2387: Dynamic theme chat gradient wallpaper generator with auto-dimming.
 * - Unigram #2320: Accessible "Keep media" cache retention slider & automated eviction scheduler.
 */

import assert from 'node:assert/strict';
import {
  DesktopBridgeAppContainerGovernor,
  StoreUpdateRestartLifecycleGovernor,
  WindowsWasapiAudioCaptureGovernor,
  GlobalDesktopShortcutsGovernor,
  ChannelInviteSubscriptionGovernor,
  ChatGradientWallpaperGovernor,
  CacheRetentionStorageGovernor
} from '../src/services/unigramBridgeAudioUpdateAndCacheGovernor.ts';

console.log('🧪 Starting Phase 191 Verification: Unigram Desktop Bridge, Audio, Update & Cache...');

// -------------------------------------------------------------
// Test 1: #2176 - Desktop Bridge AppContainer Isolation
// -------------------------------------------------------------
console.log('  Testing #2176: AppContainer Virtualized Filesystem & Sandbox Security...');
const appContainerGov = new DesktopBridgeAppContainerGovernor();

const uwpContext = appContainerGov.evaluateSandbox('app_container');
assert.equal(uwpContext.isAppContainer, true);
assert.ok(uwpContext.virtualizedLocalDataPath.includes('Packages\\Guidegram.Desktop_8wekyb3d8bbwe\\LocalState'));
assert.equal(uwpContext.hasNetworkAccess, true);
assert.equal(uwpContext.requiresFullTrust, false);

const win32Context = appContainerGov.evaluateSandbox('standard_win32');
assert.equal(win32Context.isAppContainer, false);
assert.ok(win32Context.virtualizedLocalDataPath.includes('AppData\\Local\\Guidegram.Desktop'));
console.log('  ✅ #2176 Verified: AppContainer sandbox virtualization and isolation verified.');

// -------------------------------------------------------------
// Test 2: #3232 - Microsoft Store Update Auto-Restart
// -------------------------------------------------------------
console.log('  Testing #3232: Store Update State Preservation & Auto-Restart...');
const storeGov = new StoreUpdateRestartLifecycleGovernor();

const preserved = storeGov.prepareForPackageRestart('chat_100293', 'Hello world draft', {
  x: 200,
  y: 150,
  width: 1440,
  height: 900
});
assert.equal(preserved.activeChatId, 'chat_100293');
assert.equal(preserved.composerDraft, 'Hello world draft');
assert.equal(preserved.windowBounds.width, 1440);
assert.ok(preserved.savedAt > 0);

const restored = storeGov.restoreStateAfterRestart();
assert.ok(restored !== null);
assert.equal(restored?.activeChatId, 'chat_100293');
assert.equal(restored?.composerDraft, 'Hello world draft');

// Subsequent restore returns null since state is consumed
assert.equal(storeGov.restoreStateAfterRestart(), null);
console.log('  ✅ #3232 Verified: Store package update state preservation and restore verified.');

// -------------------------------------------------------------
// Test 3: #3262 - Windows WASAPI Audio Capture & Recovery
// -------------------------------------------------------------
console.log('  Testing #3262: Windows WASAPI Audio Capture & Fallback...');
const wasapiGov = new WindowsWasapiAudioCaptureGovernor();

const startRes = wasapiGov.startRecording('exclusive');
assert.equal(startRes.success, true);
assert.equal(startRes.activeMode, 'exclusive');
assert.equal(wasapiGov.getState().isCapturing, true);

// Device unplug / underrun interruption -> seamless recovery to shared mode
const recoveryRes = wasapiGov.handleDeviceInterruption();
assert.equal(recoveryRes.recovered, true);
assert.equal(recoveryRes.newMode, 'shared');
assert.equal(wasapiGov.getState().bufferUnderrunCount, 1);
assert.equal(wasapiGov.getState().mode, 'shared');

const stopState = wasapiGov.stopRecording();
assert.equal(stopState.isCapturing, false);
console.log('  ✅ #3262 Verified: WASAPI capture and shared mode fallback verified.');

// -------------------------------------------------------------
// Test 4: #2837 - Global Desktop Shortcuts Registry
// -------------------------------------------------------------
console.log('  Testing #2837: Global Desktop Shortcuts...');
const shortcutGov = new GlobalDesktopShortcutsGovernor();

const newChatAction = shortcutGov.resolveShortcut({ key: 'n', ctrlKey: true, shiftKey: false, altKey: false });
assert.equal(newChatAction, 'new_chat');

const muteAction = shortcutGov.resolveShortcut({ key: 'm', ctrlKey: true, shiftKey: true, altKey: false });
assert.equal(muteAction, 'toggle_mute');

const closeAction = shortcutGov.resolveShortcut({ key: 'w', ctrlKey: true, shiftKey: false, altKey: false });
assert.equal(closeAction, 'close_chat');

const searchAction = shortcutGov.resolveShortcut({ key: 'f', ctrlKey: true, shiftKey: false, altKey: false });
assert.equal(searchAction, 'search');

const refreshAction = shortcutGov.resolveShortcut({ key: 'f5', ctrlKey: false, shiftKey: false, altKey: false });
assert.equal(refreshAction, 'refresh_folders');

const unmappedAction = shortcutGov.resolveShortcut({ key: 'x', ctrlKey: false, shiftKey: false, altKey: false });
assert.equal(unmappedAction, null);
console.log('  ✅ #2837 Verified: Desktop keyboard shortcuts correctly dispatched.');

// -------------------------------------------------------------
// Test 5: #2349 - Channel Invite Subscription Resolver
// -------------------------------------------------------------
console.log('  Testing #2349: Channel Invite Subscription Resolver...');
const inviteGov = new ChannelInviteSubscriptionGovernor();

// Valid private invite link
const privateInvite = inviteGov.resolveInviteLinkOrUsername('https://t.me/+AbCdEfGh1234');
assert.equal(privateInvite.resolved, true);
assert.equal(privateInvite.targetType, 'private_invite');
assert.ok(privateInvite.channelId?.startsWith('chan_invite_'));

// Short / invalid invite link
const badInvite = inviteGov.resolveInviteLinkOrUsername('https://t.me/+short');
assert.equal(badInvite.resolved, false);
assert.equal(badInvite.targetType, 'expired_link');
assert.ok(badInvite.errorMessage?.includes('expired or invalid'));

// Public username with @
const publicUsername = inviteGov.resolveInviteLinkOrUsername('@durov');
assert.equal(publicUsername.resolved, true);
assert.equal(publicUsername.targetType, 'public_channel');
assert.equal(publicUsername.channelId, 'chan_pub_durov');

// Plain username
const plainUsername = inviteGov.resolveInviteLinkOrUsername('telegram');
assert.equal(plainUsername.resolved, true);
assert.equal(plainUsername.targetType, 'public_channel');
assert.equal(plainUsername.channelId, 'chan_pub_telegram');
console.log('  ✅ #2349 Verified: Channel invite and username subscription resolution verified.');

// -------------------------------------------------------------
// Test 6: #2387 - Chat Gradient Wallpaper Generator
// -------------------------------------------------------------
console.log('  Testing #2387: Chat Gradient Wallpaper & Dark Mode Dimming...');
const wallpaperGov = new ChatGradientWallpaperGovernor();

const preset = {
  angleDeg: 135,
  stops: [
    { color: '#ffffff', offsetPercent: 0 },
    { color: '#888888', offsetPercent: 100 }
  ]
};

const lightCss = wallpaperGov.generateGradientCss(preset, false);
assert.ok(lightCss.includes('linear-gradient(135deg'));
assert.ok(lightCss.includes('#ffffff 0%'));
assert.ok(lightCss.includes('#888888 100%'));

const darkCss = wallpaperGov.generateGradientCss(preset, true);
assert.ok(darkCss.includes('linear-gradient(135deg'));
assert.ok(darkCss.includes('rgb(')); // dimmed hex turns into rgb()
console.log('  ✅ #2387 Verified: Wallpaper gradient generation and dark mode dimming verified.');

// -------------------------------------------------------------
// Test 7: #2320 - Cache Retention Storage Governor
// -------------------------------------------------------------
console.log('  Testing #2320: Cache Retention Storage Governor & Slider...');
const cacheGov = new CacheRetentionStorageGovernor();

const sliderMeta = cacheGov.getSliderMetadata();
assert.equal(sliderMeta.min, 0);
assert.equal(sliderMeta.max, 3);
assert.equal(sliderMeta.steps.length, 4);
assert.equal(sliderMeta.steps[0].label, '3 Days');
assert.equal(sliderMeta.steps[3].label, 'Forever');

const now = Date.now();
const twoDaysAgo = now - 2 * 86400000;
const fiveDaysAgo = now - 5 * 86400000;

// 3 Days retention (stepIndex 0)
assert.equal(cacheGov.shouldEvictFile(twoDaysAgo, 0, now), false); // 2 days < 3 days -> keep
assert.equal(cacheGov.shouldEvictFile(fiveDaysAgo, 0, now), true);  // 5 days > 3 days -> evict

// Forever retention (stepIndex 3)
assert.equal(cacheGov.shouldEvictFile(fiveDaysAgo, 3, now), false); // Forever -> never evict
console.log('  ✅ #2320 Verified: Keep media retention intervals and cache eviction logic verified.');

console.log('\n🎉 ALL 7 PHASE 191 UNIGRAM VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
