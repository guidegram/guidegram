import assert from 'node:assert/strict';
import { HighDpiAndDisplayScalingGovernor } from '../src/services/highDpiAndDisplayScalingGovernor.ts';

console.log('🧪 Starting Phase 64 High-DPI & Display Scaling Verification Suite...');

const governor = new HighDpiAndDisplayScalingGovernor();

// 1. Crisp Canvas Dimensions for High-DPI (AyuGram/AyuGramDesktop #237)
console.log('  Testing crisp canvas physical dimension scaling...');
// Logical 400x300 on 1.5x Windows display scaling
const canvas15 = governor.computeCrispCanvasDimensions(400, 300, 1.5);
assert.equal(canvas15.physicalWidth, 600);
assert.equal(canvas15.physicalHeight, 450);
assert.equal(canvas15.cssStyle.width, '400px');
assert.equal(canvas15.cssStyle.height, '300px');

// Logical 400x300 on 2.0x Retina display
const canvas20 = governor.computeCrispCanvasDimensions(400, 300, 2.0);
assert.equal(canvas20.physicalWidth, 800);
assert.equal(canvas20.physicalHeight, 600);
console.log('  ✅ Crisp canvas scaling verified');

// 2. Vector Emoji Render Dimension & Asset Tier (Ajaxy/telegram-tt #538 & TelegramMessenger/Telegram-iOS #2292)
console.log('  Testing vector emoji render size calculation...');
// Regular 32px emoji on 3x Retina display
const emojiRetina = governor.computeVectorEmojiRenderSize(32, false, 3.0);
assert.equal(emojiRetina.assetTier, '@3x');
assert.equal(emojiRetina.targetRenderDimension, 96);

// Enlarged / Fullscreen emoji (4x scale) on 2x display
const emojiFullscreen = governor.computeVectorEmojiRenderSize(32, true, 2.0);
assert.equal(emojiFullscreen.assetTier, '@2x');
assert.equal(emojiFullscreen.targetRenderDimension, 256); // 32 * 4 * 2
console.log('  ✅ Vector emoji render sizing verified');

// 3. Multi-Monitor Target Display Resolution (telegramdesktop/tdesktop #28836)
console.log('  Testing multi-monitor target display topology resolver...');
governor.updateMonitors([
  {
    id: 'monitor_laptop',
    isPrimary: true,
    scaleFactor: 1.5,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  },
  {
    id: 'monitor_external_4k',
    isPrimary: false,
    scaleFactor: 2.0,
    bounds: { x: 1920, y: 0, width: 3840, height: 2160 },
    workArea: { x: 1920, y: 0, width: 3840, height: 2100 },
  },
]);

// Window located on external 4K monitor (e.g. x: 2200, y: 100)
const target4k = governor.resolveTargetMonitor({ x: 2200, y: 100, width: 1000, height: 800 });
assert.equal(target4k.id, 'monitor_external_4k');
assert.equal(target4k.scaleFactor, 2.0);

// Window located on primary laptop display (e.g. x: 100, y: 100)
const targetLaptop = governor.resolveTargetMonitor({ x: 100, y: 100, width: 800, height: 600 });
assert.equal(targetLaptop.id, 'monitor_laptop');
console.log('  ✅ Multi-monitor target display resolver verified');

// 4. DPI Switch Hysteresis & Loop Suppression (AyuGram/AyuGramDesktop #494)
console.log('  Testing DPI change oscillation loop suppression...');
// First scale acknowledgement
const ack1 = governor.shouldAcknowledgeDpiChange(1.5, 1000);
assert.equal(ack1, true);

// Rapid tiny jitter (scale 1.52 within 50ms) -> must be suppressed!
const ackJitter = governor.shouldAcknowledgeDpiChange(1.52, 1050);
assert.equal(ackJitter, false, 'Rapid micro-DPI jitter must be suppressed to prevent infinite resize loop');

// Intentional monitor move (scale 2.0 after debounce) -> must be acknowledged
const ackLegitMove = governor.shouldAcknowledgeDpiChange(2.0, 1500);
assert.equal(ackLegitMove, true);
console.log('  ✅ DPI switch hysteresis verified');

// 5. Smart Image Preview Fit without Overscaling (UnigramDev/Unigram #3243)
console.log('  Testing smart image preview fit dimensions...');
// Small 200x200 avatar on 1920x1080 viewport without allowOverscale -> remains 200x200 (100% natural)
const smallImage = governor.computeSmartImagePreviewFit(200, 200, 1920, 1080, false);
assert.equal(smallImage.renderWidth, 200);
assert.equal(smallImage.renderHeight, 200);
assert.equal(smallImage.scale, 1.0);
assert.equal(smallImage.isOverscaled, false);

// Huge 4000x3000 photo on 1920x1080 viewport -> scaled down proportionally
const hugeImage = governor.computeSmartImagePreviewFit(4000, 3000, 1920, 1080, false);
assert.ok(hugeImage.renderWidth <= 1920);
assert.ok(hugeImage.renderHeight <= 1080);
assert.ok(hugeImage.scale < 1.0);
console.log('  ✅ Smart image preview fit verified');

console.log('✨ All Phase 64 Verification Tests Passed 100% Successfully!');
