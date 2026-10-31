/**
 * Test Suite: Phase 101 System Tray, URL State & Animation Verification
 * 
 * Verifies fixes for:
 * - Ajaxy/telegram-tt #217: Chat ID remains in address bar after closing chat with <Esc>
 * - Ajaxy/telegram-tt #14: Missing translations with remote platform fallback
 * - Ajaxy/telegram-tt #85: Minimum required browser version evaluation
 * - Ajaxy/telegram-tt #63: Emoji input multi-codepoint / modifier parsing bugs
 * - UnigramDev/Unigram #1122: Linking Action Center notifications to system tray process
 * - UnigramDev/Unigram #1009: Notification area (system tray) icon and unread badge manager
 * - telegramdesktop/tdesktop #6647: Crash on aarch64/armhf when rendering complex animated stickers
 */

import assert from 'node:assert';
import { systemTrayUrlStateAndAnimationGovernor } from '../src/services/systemTrayUrlStateAndAnimationGovernor.ts';

console.log('🧪 Starting Phase 101 System Tray, URL State & Animation Verification Suite...');

// 1. URL State Sync on Close / Esc
console.log('  Testing URL state synchronization on chat close...');
const openedUrl = systemTrayUrlStateAndAnimationGovernor.setActiveChat('chat_engineering_88');
assert.strictEqual(openedUrl, '/#chat_engineering_88');
assert.strictEqual(systemTrayUrlStateAndAnimationGovernor.getActiveChatId(), 'chat_engineering_88');

const closeResult = systemTrayUrlStateAndAnimationGovernor.closeActiveChatViaEscape();
assert.strictEqual(closeResult.newUrl, '/');
assert.strictEqual(closeResult.closedChatId, 'chat_engineering_88');
assert.strictEqual(systemTrayUrlStateAndAnimationGovernor.getActiveChatId(), null);
console.log('  ✅ URL state cleared cleanly on Esc without leaving orphan hash');

// 2. Translation Fallback Synchronization
console.log('  Testing translation platform fallback...');
// Known local key
const localText = systemTrayUrlStateAndAnimationGovernor.translate('chat.send');
assert.strictEqual(localText, 'ارسال');

// Remote platform key missing locally
const remoteText = systemTrayUrlStateAndAnimationGovernor.translate('chat.pinned_message');
assert.strictEqual(remoteText, 'پیام سنجاق‌شده');

// Key absent everywhere -> defaultFallback
const missingText = systemTrayUrlStateAndAnimationGovernor.translate('unknown.action', 'عمل پیش‌فرض');
assert.strictEqual(missingText, 'عمل پیش‌فرض');
console.log('  ✅ Remote translation fallback and caching verified');

// 3. Minimum Browser Version Evaluator
console.log('  Testing browser version evaluation...');
const modernChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const modernReport = systemTrayUrlStateAndAnimationGovernor.evaluateBrowserCompatibility(modernChrome);
assert.strictEqual(modernReport.isCompatible, true);
assert.strictEqual(modernReport.browserName, 'Chrome');
assert.strictEqual(modernReport.browserVersion, 128);

const legacyChrome = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.0.0 Safari/537.36';
const legacyReport = systemTrayUrlStateAndAnimationGovernor.evaluateBrowserCompatibility(legacyChrome);
assert.strictEqual(legacyReport.isCompatible, false);
assert.ok(legacyReport.upgradeRecommendation?.includes('below minimum'));
console.log('  ✅ Browser environment compatibility banner verified');

// 4. Robust Emoji & Modifier Parsing
console.log('  Testing multi-codepoint emoji and skin tone parsing...');
const emojiStr = 'Hello 👋🏽 from Guidegram 👩‍💻 team!';
const tokens = systemTrayUrlStateAndAnimationGovernor.parseEmojiString(emojiStr);
assert.strictEqual(tokens.length, 2);

// Wave with skin tone
assert.strictEqual(tokens[0].raw, '👋🏽');
assert.ok(tokens[0].modifiers?.includes('skin_tone'));

// Woman technologist (ZWJ sequence)
assert.strictEqual(tokens[1].raw, '👩‍💻');
assert.strictEqual(tokens[1].isCombined, true);
console.log('  ✅ Multi-codepoint emoji modifiers parsed accurately');

// 5. System Tray & Notification Area Icon
console.log('  Testing system tray badge and notification restore...');
const trayUnread = systemTrayUrlStateAndAnimationGovernor.updateTrayBadge(7);
assert.strictEqual(trayUnread.unreadCount, 7);
assert.strictEqual(trayUnread.iconType, 'unread');
assert.strictEqual(trayUnread.tooltip, 'Guidegram (7 unread)');

const restored = systemTrayUrlStateAndAnimationGovernor.handleNotificationClickFromTray();
assert.strictEqual(restored.restored, true);
assert.strictEqual(restored.state.isWindowVisible, true);
console.log('  ✅ System tray badge and Action Center notification bridge verified');

// 6. Safe Animated Sticker Rasterizer for ARM/Linux
console.log('  Testing animated sticker render safety on ARM/x64...');
// x64 with SIMD
const x64Render = systemTrayUrlStateAndAnimationGovernor.resolveStickerRenderMode({
  stickerId: 'sticker_fire_1',
  architecture: 'x64',
  forceSoftwareFallback: false,
  hasSimdSupport: true,
});
assert.strictEqual(x64Render.mode, 'hardware_lottie');
assert.strictEqual(x64Render.fpsTarget, 60);

// ARM64 without SIMD -> graceful software canvas fallback (prevents SIGILL/crash)
const armRender = systemTrayUrlStateAndAnimationGovernor.resolveStickerRenderMode({
  stickerId: 'sticker_fire_1',
  architecture: 'arm64',
  forceSoftwareFallback: false,
  hasSimdSupport: false,
});
assert.strictEqual(armRender.mode, 'software_canvas');
assert.strictEqual(armRender.fpsTarget, 30);
console.log('  ✅ ARM/aarch64 animated sticker software fallback verified');

console.log('✨ All Phase 101 Verification Tests Passed 100% Successfully!');
