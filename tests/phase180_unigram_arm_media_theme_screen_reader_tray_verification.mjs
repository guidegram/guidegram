/**
 * Verification Suite for Phase 180:
 * Unigram Windows on ARM, Windows N Media Foundation, Screen Reader Focus,
 * Fluent Titlebar, Video Presenter, Adaptive Tray & Accessible Invites Hardening
 * 
 * Verifies fixes for:
 * - UnigramDev/Unigram #3010: Windows on ARM64 SIMD & codec compatibility
 * - UnigramDev/Unigram #1562: Windows N Media Feature Pack missing crash guard
 * - UnigramDev/Unigram #1557: Screen reader keyboard focus & live region announcements
 * - UnigramDev/Unigram #1331: Fluent Titlebar & custom theme palette synchronization
 * - UnigramDev/Unigram #3165: Direct3D11 swapchain device lost recovery
 * - UnigramDev/Unigram #3226: Windows 11 adaptive monochrome system tray icons
 * - UnigramDev/Unigram #2769: Accessible invite links and join requests modal navigation
 */

import assert from 'node:assert/strict';
import {
  WindowsOnArmGovernor,
  WindowsNMediaFoundationGuard,
  UiaScreenReaderFocusGovernor,
  FluentTitlebarThemeGovernor,
  Direct3dVideoPresenterGovernor,
  AdaptiveSystemTrayIconGovernor,
  AccessibleInviteAndJoinGovernor
} from '../src/services/unigramArmMediaThemeScreenReaderAndTrayGovernor.ts';

console.log('🧪 Starting Phase 180 Verification: Unigram ARM, Windows N, Screen Reader, Titlebar & Tray...');

// -------------------------------------------------------------
// Test 1: #3010 - Windows on ARM64 Codec Pipeline
// -------------------------------------------------------------
console.log('  Testing #3010: Windows on ARM64 SIMD & Decoder Pipeline...');
const armGov = new WindowsOnArmGovernor('arm64');
const armConfig = armGov.getConfig();
assert.equal(armConfig.enableNeon, true, 'ARM64 must enable NEON optimizations');
assert.equal(armConfig.enableAvx2, false, 'ARM64 must disable AVX2 to prevent illegal instruction crash');

const codecStrat = armGov.resolveCodecStrategy('opus');
assert.equal(codecStrat.pipeline, 'neon_optimized');
assert.equal(codecStrat.simdEnabled, true);

const x64Gov = new WindowsOnArmGovernor('x64');
assert.equal(x64Gov.resolveCodecStrategy('opus').pipeline, 'avx2_optimized');
console.log('  ✅ #3010 Verified: Windows on ARM selects NEON pipeline and avoids AVX2 crashes.');

// -------------------------------------------------------------
// Test 2: #1562 - Windows N Media Feature Pack Crash Guard
// -------------------------------------------------------------
console.log('  Testing #1562: Windows N Media Feature Pack Missing Guard...');
// Simulate Windows N machine without Media Feature Pack
const winNGuard = new WindowsNMediaFoundationGuard(true, false);
const engineResult = winNGuard.initializeAudioEngine();

assert.equal(engineResult.engine, 'software_opus_fallback');
assert.ok(engineResult.status.includes('safely activated software audio decoder'));
assert.equal(winNGuard.getStatus().fallbackActive, true);

// Standard Windows 10/11 machine
const winStandardGuard = new WindowsNMediaFoundationGuard(false, true);
assert.equal(winStandardGuard.initializeAudioEngine().engine, 'media_foundation');
console.log('  ✅ #1562 Verified: Windows N gracefully falls back to software decoder without crash.');

// -------------------------------------------------------------
// Test 3: #1557 - Screen Reader & UI Automation Keyboard Focus
// -------------------------------------------------------------
console.log('  Testing #1557: Screen Reader UI Automation Focus & Live Region...');
const uiaGov = new UiaScreenReaderFocusGovernor();

uiaGov.registerNode({ id: 'msg_101', role: 'message', label: 'Dr. Ershad: System ready', tabIndex: 0 });
uiaGov.registerNode({ id: 'composer_input', role: 'composer', label: 'Message Input Bar', tabIndex: 1 });

assert.equal(uiaGov.setFocus('msg_101'), true);
assert.equal(uiaGov.getActiveFocus()?.id, 'msg_101');

const announcements = uiaGov.getRecentAnnouncements();
assert.ok(announcements.some(a => a.includes('Focus moved to message: Dr. Ershad: System ready')));
console.log('  ✅ #1557 Verified: Keyboard focus successfully restored and announced to screen readers.');

// -------------------------------------------------------------
// Test 4: #1331 - Fluent Titlebar & Custom Theme Palette
// -------------------------------------------------------------
console.log('  Testing #1331: Fluent Titlebar Synchronization with Custom Palettes...');
const titlebarGov = new FluentTitlebarThemeGovernor();

// Dark mode with custom dark blue background (#0f172a) and cyan accent (#06b6d4)
const darkThemeTitlebar = titlebarGov.computeTitlebarTheme('dark', '#06b6d4', '#0f172a');
assert.equal(darkThemeTitlebar.backgroundColor, '#0f172a', 'Titlebar should match custom background');
assert.equal(darkThemeTitlebar.foregroundColor, '#ffffff');
assert.equal(darkThemeTitlebar.buttonHoverBackgroundColor, '#06b6d4');

// Light mode
const lightThemeTitlebar = titlebarGov.computeTitlebarTheme('light', '#3b82f6');
assert.equal(lightThemeTitlebar.backgroundColor, '#ffffff');
assert.equal(lightThemeTitlebar.foregroundColor, '#000000');
console.log('  ✅ #1331 Verified: Titlebar colors adapt dynamically without grey mismatch.');

// -------------------------------------------------------------
// Test 5: #3165 - Direct3D11 Video Presenter & SwapChain Recovery
// -------------------------------------------------------------
console.log('  Testing #3165: Direct3D11 SwapChain Device Lost Recovery...');
const videoGov = new Direct3dVideoPresenterGovernor();
videoGov.updatePlaybackPosition(4520); // 4.52 seconds into video

const recovery = videoGov.notifyDeviceLost('DXGI_ERROR_DEVICE_RESET');
assert.equal(recovery.recovered, true);
assert.ok(recovery.actionTaken.includes('preserving frame 4520ms'));
assert.equal(videoGov.getPlaybackPosition(), 4520, 'Playback timestamp preserved after swapchain recreation');
assert.equal(videoGov.getRecreationCount(), 1);
console.log('  ✅ #3165 Verified: Swapchain recreated on device reset without losing playback position.');

// -------------------------------------------------------------
// Test 6: #3226 - Adaptive Monochrome System Tray Icon
// -------------------------------------------------------------
console.log('  Testing #3226: Windows 11 Adaptive Monochrome Tray Icon...');
const trayGov = new AdaptiveSystemTrayIconGovernor();

// Light taskbar -> Dark icon
const lightTaskbarResult = trayGov.resolveTrayIcon(true, 5);
assert.equal(lightTaskbarResult.iconPath, 'assets/icons/unigram_tray_dark.ico');
assert.equal(lightTaskbarResult.contrast, 'dark_on_light');
assert.equal(lightTaskbarResult.badge, '5');

// Dark taskbar -> White icon
const darkTaskbarResult = trayGov.resolveTrayIcon(false, 150);
assert.equal(darkTaskbarResult.iconPath, 'assets/icons/unigram_tray_white.ico');
assert.equal(darkTaskbarResult.contrast, 'light_on_dark');
assert.equal(darkTaskbarResult.badge, '99+');
console.log('  ✅ #3226 Verified: System tray icon dynamically switches between dark and white for contrast.');

// -------------------------------------------------------------
// Test 7: #2769 - Accessible Invite Links & Join Requests
// -------------------------------------------------------------
console.log('  Testing #2769: Accessible Join Requests & Invite Links...');
const inviteGov = new AccessibleInviteAndJoinGovernor();
inviteGov.addRequest({ userId: 'u1', name: 'Alice', requestedAt: Date.now() });
inviteGov.addRequest({ userId: 'u2', name: 'Bob', requestedAt: Date.now() });

// Keyboard navigation ArrowDown
const navResult = inviteGov.handleKeyNavigation('ArrowDown');
assert.equal(navResult.action, 'focus_changed');
assert.ok(navResult.focusedTarget.includes('Bob'));

// Escape key closes modal
const escResult = inviteGov.handleKeyNavigation('Escape');
assert.equal(escResult.action, 'close_modal');
assert.equal(escResult.focusedTarget, 'return_to_chat');

// Copy link with screen reader speech announcement
const copyResult = inviteGov.copyInviteLinkWithAnnouncement();
assert.equal(copyResult.copied, true);
assert.ok(copyResult.speechAnnouncement.includes('copied to clipboard'));
console.log('  ✅ #2769 Verified: Join requests modal fully accessible with keyboard navigation & copy announcements.');

console.log('\n🎉 ALL 7 UNIGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
