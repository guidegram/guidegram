import assert from 'node:assert';
import {
  WindowShadowCompositingManager,
  UnquotedForwardCaptionBundler,
  DynamicFontScalingGovernor,
  SessionCorruptionRecoveryGovernor,
  SingleInstanceIpcLockRecovery,
  GraphicsRendererFallbackGovernor,
  TelegramDeepLinkRouter,
  DesktopWindowRenderingForwardAndLinkGovernor
} from '../src/services/desktopWindowRenderingForwardAndLinkGovernor.ts';

console.log('--- STARTING PHASE 116 VERIFICATION TEST SUITE ---');

// 1. WindowShadowCompositingManager tests (kotatogram/kotatogram-desktop#239)
console.log('Test 1: WindowShadowCompositingManager drop shadow compositing');
const shadowMgr = new WindowShadowCompositingManager();

const transpShadow = shadowMgr.computeShadowStyle({
  blurRadiusPx: 16,
  spreadRadiusPx: 2,
  shadowColor: 'rgba(0,0,0,0.3)',
  isTransparentWindowSupported: true
});
assert.strictEqual(transpShadow.useSimulatedBorder, false);
assert(transpShadow.boxShadowCss.includes('0px 8px 16px 2px rgba(0,0,0,0.3)'));

const opaqueBorder = shadowMgr.computeShadowStyle({
  blurRadiusPx: 16,
  spreadRadiusPx: 2,
  shadowColor: 'rgba(0,0,0,0.3)',
  isTransparentWindowSupported: false
});
assert.strictEqual(opaqueBorder.useSimulatedBorder, true);
assert.strictEqual(opaqueBorder.boxShadowCss, 'none');

// 2. UnquotedForwardCaptionBundler tests (kotatogram/kotatogram-desktop#162)
console.log('Test 2: UnquotedForwardCaptionBundler forward caption bundling');
const forwardBundler = new UnquotedForwardCaptionBundler();

const unquotedPhoto = {
  messageId: 555,
  hasMedia: true,
  mediaType: 'photo',
  mediaUrl: 'https://example.com/pic.jpg',
  captionText: 'Stunning sunset in Tehran',
  isUnquoted: true
};

// Retain caption: bundle with media
const bundledRes = forwardBundler.bundleForForward(unquotedPhoto, true);
assert.strictEqual(bundledRes.bundled, true);
assert.strictEqual(bundledRes.forwardedMediaPayload.captionText, 'Stunning sunset in Tehran');
assert.strictEqual(bundledRes.separateTextMessage, undefined);

// Discard/separate caption: split
const splitRes = forwardBundler.bundleForForward(unquotedPhoto, false);
assert.strictEqual(splitRes.bundled, false);
assert.strictEqual(splitRes.forwardedMediaPayload.captionText, undefined);
assert.strictEqual(splitRes.separateTextMessage, 'Stunning sunset in Tehran');

// 3. DynamicFontScalingGovernor tests (kotatogram/kotatogram-desktop#123)
console.log('Test 3: DynamicFontScalingGovernor UI font scaling');
const fontGov = new DynamicFontScalingGovernor();
assert.strictEqual(fontGov.getScaleMultiplier(), 1.0);

const scale125 = fontGov.setScale(1.25);
assert.strictEqual(scale125.multiplier, 1.25);
assert.strictEqual(scale125.effectiveSizePx, Math.round(13 * 1.25));

// Clamping bounds
const clampedMax = fontGov.setScale(3.5);
assert.strictEqual(clampedMax.multiplier, 2.0);
const clampedMin = fontGov.setScale(0.2);
assert.strictEqual(clampedMin.multiplier, 0.8);

// 4. SessionCorruptionRecoveryGovernor tests (telegramdesktop/tdesktop#24358)
console.log('Test 4: SessionCorruptionRecoveryGovernor session corruption recovery');
const sessionGov = new SessionCorruptionRecoveryGovernor();

// Valid session
const validJson = JSON.stringify({
  authKey: '12345678901234567890123456789012',
  userId: 424242,
  dcId: 2
});
const validLoad = sessionGov.validateAndRecoverSession(validJson);
assert.strictEqual(validLoad.action, 'load_session');
assert.strictEqual(validLoad.session?.userId, 424242);

// Corrupted json
const corruptJson = '{ authKey: corrupted_truncated...';
const corruptLoad = sessionGov.validateAndRecoverSession(corruptJson);
assert.strictEqual(corruptLoad.recovered, true);
assert.strictEqual(corruptLoad.action, 'corrupted_backup_created');
assert.strictEqual(corruptLoad.session, null);

// 5. SingleInstanceIpcLockRecovery tests (telegramdesktop/tdesktop#6949)
console.log('Test 5: SingleInstanceIpcLockRecovery stale process lock cleanup');
const ipcLockGov = new SingleInstanceIpcLockRecovery();

// Process is actually running: lock cannot be acquired
const activeLock = ipcLockGov.verifyAndCleanLock('/tmp/guidegram.lock', (pid) => true, 1234);
assert.strictEqual(activeLock.staleLockRemoved, false);
assert.strictEqual(activeLock.canAcquireInstance, false);

// Process is dead (PID not found): lock cleared safely
const staleLock = ipcLockGov.verifyAndCleanLock('/tmp/guidegram.lock', (pid) => false, 9999);
assert.strictEqual(staleLock.staleLockRemoved, true);
assert.strictEqual(staleLock.canAcquireInstance, true);

// 6. GraphicsRendererFallbackGovernor tests (telegramdesktop/tdesktop#31477)
console.log('Test 6: GraphicsRendererFallbackGovernor software rasterizer fallback');
const renderGov = new GraphicsRendererFallbackGovernor();
assert.strictEqual(renderGov.getRenderer(), 'hardware_webgl');

// First crash: stay hardware
const crash1 = renderGov.recordGraphicsCrash();
assert.strictEqual(crash1.switchedToSoftware, false);
assert.strictEqual(renderGov.getRenderer(), 'hardware_webgl');

// Second consecutive crash: fallback to software rasterizer
const crash2 = renderGov.recordGraphicsCrash();
assert.strictEqual(crash2.switchedToSoftware, true);
assert.strictEqual(renderGov.getRenderer(), 'software_rasterizer');

// 7. TelegramDeepLinkRouter tests (kotatogram/kotatogram-desktop#248)
console.log('Test 7: TelegramDeepLinkRouter t.me URL deep linking');
const router = new TelegramDeepLinkRouter();

const postLink = router.parseLink('https://t.me/durov/128');
assert.strictEqual(postLink.type, 'channel_post');
assert.strictEqual(postLink.target, 'durov');
assert.strictEqual(postLink.postId, 128);

const inviteLink = router.parseLink('https://t.me/+AbCdEfGhIj');
assert.strictEqual(inviteLink.type, 'joinchat');
assert.strictEqual(inviteLink.target, 'AbCdEfGhIj');

const botLink = router.parseLink('https://t.me/BotFather?start=help');
assert.strictEqual(botLink.type, 'bot_start');
assert.strictEqual(botLink.target, 'BotFather');
assert.strictEqual(botLink.startParam, 'help');

const userLink = router.parseLink('https://t.me/guidegram_dev');
assert.strictEqual(userLink.type, 'username');
assert.strictEqual(userLink.target, 'guidegram_dev');

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopWindowRenderingForwardAndLinkGovernor();
assert(masterGov.windowShadow instanceof WindowShadowCompositingManager);
assert(masterGov.forwardBundler instanceof UnquotedForwardCaptionBundler);
assert(masterGov.fontScaling instanceof DynamicFontScalingGovernor);
assert(masterGov.sessionRecovery instanceof SessionCorruptionRecoveryGovernor);
assert(masterGov.ipcLock instanceof SingleInstanceIpcLockRecovery);
assert(masterGov.rendererFallback instanceof GraphicsRendererFallbackGovernor);
assert(masterGov.linkRouter instanceof TelegramDeepLinkRouter);

console.log('--- ALL PHASE 116 VERIFICATION TESTS PASSED (100%) ---');
