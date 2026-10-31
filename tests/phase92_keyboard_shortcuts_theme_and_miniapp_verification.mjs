import assert from 'node:assert';
import { KeyboardShortcutsThemeAndMiniAppGovernor } from '../src/services/keyboardShortcutsThemeAndMiniAppGovernor.ts';

console.log('🧪 Starting Phase 92 Keyboard Shortcuts, Theme & Mini App Verification Suite...');

const governor = new KeyboardShortcutsThemeAndMiniAppGovernor();

// 1. Keyboard Send Evaluation (morethanwords #100, #71, #24)
console.log('  Testing keyboard send evaluation (Enter vs Ctrl+Enter)...');
// Mode: Enter (default)
governor.setSendMode('enter');
assert.strictEqual(
  governor.shouldSendMessage({ key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }),
  true
);
// Shift+Enter should NOT send (inserts newline)
assert.strictEqual(
  governor.shouldSendMessage({ key: 'Enter', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }),
  false
);

// Mode: Ctrl+Enter
governor.setSendMode('ctrl_enter');
// Plain enter should NOT send
assert.strictEqual(
  governor.shouldSendMessage({ key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }),
  false
);
// Ctrl+Enter sends
assert.strictEqual(
  governor.shouldSendMessage({ key: 'Enter', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false }),
  true
);
// Cmd+Enter (macOS) sends
assert.strictEqual(
  governor.shouldSendMessage({ key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: true, altKey: false }),
  true
);
console.log('  ✅ Keyboard send evaluation verified');

// 2. Mini App Custom Aspect Ratio & Viewport (morethanwords #518, TDesktop #31283)
console.log('  Testing Mini App custom aspect ratio & viewport calculation...');
const standardView = governor.calculateMiniAppViewport('bot_game', 'standard', 1920, 1080);
assert.strictEqual(standardView.mode, 'standard');
assert.strictEqual(standardView.width, 420);
assert.strictEqual(standardView.height, 640);

// Register custom 16:9 landscape aspect ratio for 3D game
governor.setCustomAspectRatio('bot_game', 16 / 9);
const customView = governor.calculateMiniAppViewport('bot_game', 'custom_aspect', 1920, 1080);
assert.strictEqual(customView.mode, 'custom_aspect');
assert.strictEqual(Math.round(customView.aspectRatio * 100), Math.round((16 / 9) * 100));
console.log('  ✅ Mini App custom aspect ratio verified');

// 3. Theme Color Parsing & Bug #550 Guard (Ajaxy #550, morethanwords #228)
console.log('  Testing theme color parsing and malformed #hsla(...) crash guard...');
// Standard hex
const hexColor = governor.parseColorSafely('#ff5722');
assert.strictEqual(hexColor.valid, true);
assert.strictEqual(hexColor.hex, '#ff5722');

// Bug #550 reproduction: #hsla(210, 100%, 50%, 0.8)
const malformedHsla = governor.parseColorSafely('#hsla(210, 100%, 50%, 0.8)');
assert.strictEqual(malformedHsla.valid, true);
assert.ok(malformedHsla.hex.startsWith('#'));
assert.ok(malformedHsla.rgba.startsWith('rgba('));

// Invalid garbage string
const invalidColor = governor.parseColorSafely('completely_broken_color');
assert.strictEqual(invalidColor.valid, false);
assert.strictEqual(invalidColor.hex, '#0088cc'); // Safe default
console.log('  ✅ Theme color parsing and crash guard verified');

// 4. Roboto Font Weight 600 Fallback (Ajaxy #397)
console.log('  Testing Roboto font weight 600 fallback...');
assert.strictEqual(governor.getResolvedFontWeight('Roboto, sans-serif', 600), 700);
assert.strictEqual(governor.getResolvedFontWeight('Inter, sans-serif', 600), 600);
console.log('  ✅ Roboto font weight fallback verified');

// 5. Bot Description Media Attachments (morethanwords #136)
console.log('  Testing bot description media parsing...');
const botBio = 'Welcome to Guidegram Bot! Demo: https://guidegram.org/assets/demo.gif and poster: https://guidegram.org/poster.jpg';
const media = governor.parseBotDescriptionMedia(botBio);
assert.strictEqual(media.length, 2);
assert.strictEqual(media[0].type, 'animation');
assert.strictEqual(media[0].url, 'https://guidegram.org/assets/demo.gif');
assert.strictEqual(media[1].type, 'photo');
assert.strictEqual(media[1].url, 'https://guidegram.org/poster.jpg');
console.log('  ✅ Bot description media parsing verified');

console.log('✨ All Phase 92 Verification Tests Passed 100% Successfully!');
