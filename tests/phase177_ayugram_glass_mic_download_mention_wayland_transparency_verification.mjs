import assert from 'node:assert/strict';
import {
  MicrophonePermissionPersistenceGovernor,
  LiquidGlassVibrancyGovernor,
  BatchMediaDownloadGovernor,
  InlineMentionFormatterGovernor,
  WaylandMiniAppCompositorGovernor,
  BurmeseTextNormalizerGovernor,
  WindowTransparencyGovernor
} from '../src/services/ayugramGlassMicDownloadMentionWaylandAndTransparencyGovernor.ts';

console.log('🧪 Starting Phase 177 Verification: AyuGram Mic, Glass, Download, Mention, Wayland & Transparency Hardening...');

// -------------------------------------------------------------
// Test 1: MicrophonePermissionPersistenceGovernor (Resolves #464)
// -------------------------------------------------------------
console.log('  Testing #464: Microphone Permission Caching & Loop Prevention...');
const micGov = new MicrophonePermissionPersistenceGovernor();

assert.equal(micGov.shouldPromptUser(), true); // First time -> must prompt
const grantedState = micGov.setPermission(true);
assert.equal(grantedState.isGranted, true);
assert.equal(grantedState.canRecordImmediately, true);

// Subsequent recordings -> MUST NOT prompt!
assert.equal(micGov.shouldPromptUser(), false);
console.log('  ✅ #464 Verified: Microphone permission cached, eliminating redundant prompts.');

// -------------------------------------------------------------
// Test 2: LiquidGlassVibrancyGovernor (Resolves #458)
// -------------------------------------------------------------
console.log('  Testing #458: macOS Liquid Glass Vibrancy & Backdrop Blur...');
const glassGov = new LiquidGlassVibrancyGovernor();

const glassConfig = glassGov.configureLiquidGlass(true, 0.35);
assert.equal(glassConfig.enabled, true);
assert.equal(glassConfig.blurRadiusPx, 24);
assert.equal(glassConfig.tintOpacity, 0.35);
assert.ok(glassConfig.activeBackdropFilter.includes('blur(24px)'));

const disabledGlass = glassGov.configureLiquidGlass(false);
assert.equal(disabledGlass.enabled, false);
assert.equal(disabledGlass.activeBackdropFilter, 'none');
console.log('  ✅ #458 Verified: Liquid Glass backdrop filters and opacity correctly computed.');

// -------------------------------------------------------------
// Test 3: BatchMediaDownloadGovernor (Resolves #409)
// -------------------------------------------------------------
console.log('  Testing #409: Large-Scale Batch Media Download Telemetry & Throttling...');
const downloadGov = new BatchMediaDownloadGovernor();

// 100 files, 40 completed, 40MB / 100MB
const progress = downloadGov.calculateProgress(100, 40, 100 * 1024 * 1024, 40 * 1024 * 1024);
assert.equal(progress.percent, 40);
assert.equal(progress.activeWorkers, 3, 'Max 3 concurrent download workers');
assert.ok(progress.formattedTelemetry.includes('Downloading 40/100 files'));
assert.ok(progress.formattedTelemetry.includes('40.0 MB / 100.0 MB (40%)'));
console.log('  ✅ #409 Verified: Batch media download telemetry and concurrency throttled cleanly.');

// -------------------------------------------------------------
// Test 4: InlineMentionFormatterGovernor (Resolves #398)
// -------------------------------------------------------------
console.log('  Testing #398: Create Custom Inline Mention Formatting...');
const mentionGov = new InlineMentionFormatterGovernor();

const mention = mentionGov.createMention('Ershad Zolfi', '123456789');
assert.equal(mention.isValid, true);
assert.equal(mention.displayText, 'Ershad Zolfi');
assert.equal(mention.userId, '123456789');
assert.equal(mention.markdownEquivalent, '[Ershad Zolfi](tg://user?id=123456789)');
assert.equal(mention.entityType, 'mention_name');
console.log('  ✅ #398 Verified: Inline mention entities created with valid markdown syntax.');

// -------------------------------------------------------------
// Test 5: WaylandMiniAppCompositorGovernor (Resolves #393)
// -------------------------------------------------------------
console.log('  Testing #393: Wayland Tiling Window Manager Mini App Crash Prevention...');
const waylandGov = new WaylandMiniAppCompositorGovernor();

// Wayland with Hyprland -> Must embed to avoid tiling crash!
const hyprlandLaunch = waylandGov.resolveLaunchMode(true, 'Hyprland');
assert.equal(hyprlandLaunch.launchMode, 'embedded_viewport');
assert.equal(hyprlandLaunch.crashPrevented, true);

// Standard X11 or Gnome Wayland -> Standard toplevel
const gnomeLaunch = waylandGov.resolveLaunchMode(true, 'Gnome Shell');
assert.equal(gnomeLaunch.launchMode, 'xdg_toplevel');
assert.equal(gnomeLaunch.crashPrevented, false);
console.log('  ✅ #393 Verified: Wayland tiling compositors safely route Mini Apps to embedded viewport.');

// -------------------------------------------------------------
// Test 6: BurmeseTextNormalizerGovernor (Resolves #390)
// -------------------------------------------------------------
console.log('  Testing #390: Burmese Zawgyi to Unicode Transcoding & Shaping...');
const burmeseGov = new BurmeseTextNormalizerGovernor();

// Zawgyi string with pre-vowel \u1031 followed by consonant \u1000
const zawgyiSample = '\u1031\u1000';
const shaped = burmeseGov.normalizeBurmese(zawgyiSample);

assert.equal(shaped.inputEncoding, 'zawgyi');
assert.equal(shaped.vowelDiacriticsReordered, true);
assert.equal(shaped.normalizedUnicode, '\u1000\u1031', 'Vowel \u1031 must follow consonant in standard Unicode');
console.log('  ✅ #390 Verified: Burmese text reordered and normalized to standard Unicode.');

// -------------------------------------------------------------
// Test 7: WindowTransparencyGovernor (Resolves #361)
// -------------------------------------------------------------
console.log('  Testing #361: Window Transparency Alpha & Contrast Protection...');
const transGov = new WindowTransparencyGovernor();

const transparentConfig = transGov.configureTransparency(0.65);
assert.equal(transparentConfig.windowAlpha, 0.65);
assert.equal(transparentConfig.bubbleOpacity, 0.90, 'Bubble opacity must stay >= 0.90 for readable contrast');
assert.equal(transparentConfig.contrastRatioSufficient, true);

// Clamping below 0.5
const clampedLow = transGov.configureTransparency(0.2);
assert.equal(clampedLow.windowAlpha, 0.5);
console.log('  ✅ #361 Verified: Window transparency alpha clamped with readable text bubble contrast.');

console.log('\n🎉 ALL 7 AYUGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
