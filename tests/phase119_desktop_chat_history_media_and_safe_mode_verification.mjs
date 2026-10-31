import assert from 'node:assert';
import {
  StuckChatPaginationRecoveryGovernor,
  LiveStreamPipPlayerManager,
  CustomBubbleSizingGovernor,
  ImageDecoderFallbackManager,
  LegacyOsPolyfillGovernor,
  LinuxWindowManagerCompositingGovernor,
  SafeModeCrashRecoveryGovernor,
  DesktopChatHistoryMediaAndSafeModeGovernor
} from '../src/services/desktopChatHistoryMediaAndSafeModeGovernor.ts';

console.log('--- STARTING PHASE 119 VERIFICATION TEST SUITE ---');

// 1. StuckChatPaginationRecoveryGovernor tests (kotatogram/kotatogram-desktop#344)
console.log('Test 1: StuckChatPaginationRecoveryGovernor stuck pagination hole-fill');
const paginationGov = new StuckChatPaginationRecoveryGovernor();

// First attempt: normal loading
const attempt1 = paginationGov.recordLoadingAttempt('chat_100', 500, 600);
assert.strictEqual(attempt1.shouldForceHoleFill, false);
assert.strictEqual(attempt1.offsetId, 500);

// Second attempt at same boundary: force hole-fill
const attempt2 = paginationGov.recordLoadingAttempt('chat_100', 500, 600);
assert.strictEqual(attempt2.shouldForceHoleFill, true);
assert.strictEqual(attempt2.offsetId, 450, 'Must jump 50 messages back to unblock loading hole');

// 2. LiveStreamPipPlayerManager tests (kotatogram/kotatogram-desktop#343)
console.log('Test 2: LiveStreamPipPlayerManager live stream PIP & docking');
const pipMgr = new LiveStreamPipPlayerManager();
assert.strictEqual(pipMgr.getActiveStream(), null);

// Start floating stream
pipMgr.startStream('stream_99', 'https://stream.guidegram.org/live.m3u8', false);
assert.strictEqual(pipMgr.getActiveStream()?.isFloatingPip, true);
assert.strictEqual(pipMgr.getActiveStream()?.isDockedInTab, false);

// Toggle to docked tab
pipMgr.toggleDockingMode();
assert.strictEqual(pipMgr.getActiveStream()?.isFloatingPip, false);
assert.strictEqual(pipMgr.getActiveStream()?.isDockedInTab, true);

pipMgr.stopStream();
assert.strictEqual(pipMgr.getActiveStream(), null);

// 3. CustomBubbleSizingGovernor tests (kotatogram/kotatogram-desktop#340)
console.log('Test 3: CustomBubbleSizingGovernor bubble width & corner radius customization');
const bubbleGov = new CustomBubbleSizingGovernor();

const initialCfg = bubbleGov.getConfig();
assert.strictEqual(initialCfg.maxWidthPercentage, 70);
assert.strictEqual(initialCfg.borderRadiusPx, 12);

// Custom sizing
bubbleGov.setBubbleSizing(85, 18);
assert.strictEqual(bubbleGov.getConfig().maxWidthPercentage, 85);
assert.strictEqual(bubbleGov.getConfig().borderRadiusPx, 18);

const outgoingCss = bubbleGov.computeBubbleCss(true);
assert(outgoingCss.includes('max-width: 85%'));
assert(outgoingCss.includes('border-radius: 18px'));
assert(outgoingCss.includes('margin-left: auto'));

// Clamping bounds: max 95%, min 40%
bubbleGov.setBubbleSizing(150, 40);
assert.strictEqual(bubbleGov.getConfig().maxWidthPercentage, 95);
assert.strictEqual(bubbleGov.getConfig().borderRadiusPx, 24);

// 4. ImageDecoderFallbackManager tests (kotatogram/kotatogram-desktop#249)
console.log('Test 4: ImageDecoderFallbackManager pure software fallback image decoding');
const imgDecoder = new ImageDecoderFallbackManager();
const dummyBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);

// Native decoder available
const nativeRes = imgDecoder.decodeImageData(dummyBytes, true);
assert.strictEqual(nativeRes.success, true);
assert.strictEqual(nativeRes.decoderUsed, 'native_libjpeg');

// Native decoder fails (libjpeg.so missing) -> pure software fallback used
const fallbackRes = imgDecoder.decodeImageData(dummyBytes, false);
assert.strictEqual(fallbackRes.success, true);
assert.strictEqual(fallbackRes.decoderUsed, 'pure_js_wasm_fallback');

// 5. LegacyOsPolyfillGovernor tests (kotatogram/kotatogram-desktop#83)
console.log('Test 5: LegacyOsPolyfillGovernor macOS legacy feature detection');
const legacyGov = new LegacyOsPolyfillGovernor();

const macModern = legacyGov.detectCapabilities('macOS 14.5');
assert.strictEqual(macModern.requiresPolyfill, false);

const macHighSierra = legacyGov.detectCapabilities('macOS 10.13.6');
assert.strictEqual(macHighSierra.requiresPolyfill, true);
assert.strictEqual(macHighSierra.supportsIntersectionObserver, false);

// 6. LinuxWindowManagerCompositingGovernor tests (kotatogram/kotatogram-desktop#395)
console.log('Test 6: LinuxWindowManagerCompositingGovernor Unity compositing workaround');
const wmGov = new LinuxWindowManagerCompositingGovernor();

const unityHints = wmGov.computeWindowHints('Unity 7 (Compiz)');
assert.strictEqual(unityHints.useSoftwareShadow, true, 'Unity must use software shadows to prevent crash');

const gnomeHints = wmGov.computeWindowHints('GNOME Shell');
assert.strictEqual(gnomeHints.useSoftwareShadow, false);

// 7. SafeModeCrashRecoveryGovernor tests (kotatogram/kotatogram-desktop#223)
console.log('Test 7: SafeModeCrashRecoveryGovernor early crash safe mode recovery');
const safeModeGov = new SafeModeCrashRecoveryGovernor();
assert.strictEqual(safeModeGov.isSafeMode(), false);

// First crash: no safe mode yet
const crash1 = safeModeGov.recordCrash('Error: Bus error in native render thread');
assert.strictEqual(crash1.safeModeEnabled, false);

// Second consecutive crash: trigger safe mode & disable GPU
const crash2 = safeModeGov.recordCrash('Error: Bus error in native render thread');
assert.strictEqual(crash2.safeModeEnabled, true);
assert.strictEqual(crash2.disableGpuAcceleration, true);
assert.strictEqual(crash2.resetCorruptedCaches, true);
assert.strictEqual(safeModeGov.isSafeMode(), true);

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopChatHistoryMediaAndSafeModeGovernor();
assert(masterGov.pagination instanceof StuckChatPaginationRecoveryGovernor);
assert(masterGov.liveStream instanceof LiveStreamPipPlayerManager);
assert(masterGov.bubbleSizing instanceof CustomBubbleSizingGovernor);
assert(masterGov.imageDecoder instanceof ImageDecoderFallbackManager);
assert(masterGov.legacyOs instanceof LegacyOsPolyfillGovernor);
assert(masterGov.windowManager instanceof LinuxWindowManagerCompositingGovernor);
assert(masterGov.safeMode instanceof SafeModeCrashRecoveryGovernor);

console.log('--- ALL PHASE 119 VERIFICATION TESTS PASSED (100%) ---');
