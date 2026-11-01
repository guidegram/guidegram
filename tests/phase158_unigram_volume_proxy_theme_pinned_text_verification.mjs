import assert from 'node:assert/strict';
import { UnigramVolumeProxyThemePinnedAndTextGovernor } from '../src/services/unigramVolumeProxyThemePinnedAndTextGovernor.ts';

console.log('🧪 Starting Phase 158: Unigram Volume, Proxy, UI Scale, Pinned Messages, Theme, and Text Hardening Test Suite...');

const governor = new UnigramVolumeProxyThemePinnedAndTextGovernor();

// =========================================================================
// Test 1: Unigram #2685 - Bluetooth Audio Volume Normalization
// =========================================================================
console.log('Testing Unigram #2685: Bluetooth volume safe attenuation and fade-in...');
{
  // Normal speaker: base volume 0.8
  const speakerRes = governor.calculateEffectiveAudioVolume({
    deviceType: 'speaker',
    baseVolume: 0.8,
    bluetoothSafeAttenuation: 0.7,
    enableFadeIn: false
  });
  assert.equal(speakerRes.effectiveGain, 0.8);
  assert.equal(speakerRes.attenuationApplied, false);
  assert.equal(speakerRes.fadeInDurationMs, 0);

  // Bluetooth device: attenuation applied (0.8 * 0.7 = 0.56)
  const btRes = governor.calculateEffectiveAudioVolume({
    deviceType: 'bluetooth',
    baseVolume: 0.8,
    bluetoothSafeAttenuation: 0.7,
    enableFadeIn: true
  });
  assert.equal(btRes.effectiveGain, 0.56);
  assert.equal(btRes.attenuationApplied, true);
  assert.equal(btRes.fadeInDurationMs, 100);
  console.log('✅ Unigram #2685: Bluetooth volume normalization verified.');
}

// =========================================================================
// Test 2: Unigram #877 - Proxy Detection and Multi-Stage Ping
// =========================================================================
console.log('Testing Unigram #877: Proxy reachability check and latency measurement...');
{
  const proxy = {
    proxyId: 'p1',
    server: 'proxy.telegram.org',
    port: 443,
    protocol: 'mtproto',
    secretOrPassword: 'dd00'
  };

  // Case A: Online proxy with 65ms ping
  const onlineRes = governor.testProxyConnection(proxy, 65);
  assert.equal(onlineRes.status, 'online');
  assert.equal(onlineRes.pingMs, 65);

  // Case B: Unreachable proxy
  const unreachableRes = governor.testProxyConnection(proxy, undefined, 'unreachable');
  assert.equal(unreachableRes.status, 'unreachable');

  // Case C: Auth failure
  const authFailedRes = governor.testProxyConnection(proxy, undefined, 'auth_failed');
  assert.equal(authFailedRes.status, 'auth_failed');
  console.log('✅ Unigram #877: Proxy detection and ping verified.');
}

// =========================================================================
// Test 3: Unigram #2287 - Dynamic UI Scale and DPI Governor
// =========================================================================
console.log('Testing Unigram #2287: UI zoom factor scaling and font/avatar calculation...');
{
  // 100% standard scale
  const scale100 = governor.setUiScale(100);
  assert.equal(scale100.scalePercentage, 100);
  assert.equal(scale100.effectiveZoomFactor, 1.0);
  assert.equal(scale100.scaledFontSizePx, 14);
  assert.equal(scale100.avatarSizePx, 40);

  // 150% high-DPI zoom
  const scale150 = governor.setUiScale(150);
  assert.equal(scale150.scalePercentage, 150);
  assert.equal(scale150.effectiveZoomFactor, 1.5);
  assert.equal(scale150.scaledFontSizePx, 21);
  assert.equal(scale150.avatarSizePx, 60);

  // Clamping check (> 300% clamped to 300%)
  const scaleOver = governor.setUiScale(400);
  assert.equal(scaleOver.scalePercentage, 300);
  console.log('✅ Unigram #2287: Dynamic UI scale verified.');
}

// =========================================================================
// Test 4: Unigram #3152 - Multiple Pinned Messages Sync and Carousel Navigation
// =========================================================================
console.log('Testing Unigram #3152: Multiple pinned messages carousel navigation...');
{
  const chatId = '-100123456';
  governor.setPinnedMessages(chatId, ['msg_10', 'msg_20', 'msg_30']);

  // Initially at index 0 (msg_10)
  // Navigate next -> index 1 (msg_20)
  const nav1 = governor.navigatePinnedCarousel(chatId, 'next');
  assert.equal(nav1.currentIndex, 1);
  assert.equal(nav1.currentMessageId, 'msg_20');

  // Navigate next -> index 2 (msg_30)
  const nav2 = governor.navigatePinnedCarousel(chatId, 'next');
  assert.equal(nav2.currentIndex, 2);
  assert.equal(nav2.currentMessageId, 'msg_30');

  // Navigate next -> circular wrap back to index 0 (msg_10)
  const navWrap = governor.navigatePinnedCarousel(chatId, 'next');
  assert.equal(navWrap.currentIndex, 0);
  assert.equal(navWrap.currentMessageId, 'msg_10');

  // Navigate prev -> wrap to last (msg_30)
  const navPrev = governor.navigatePinnedCarousel(chatId, 'prev');
  assert.equal(navPrev.currentIndex, 2);
  assert.equal(navPrev.currentMessageId, 'msg_30');
  console.log('✅ Unigram #3152: Multiple pinned messages carousel verified.');
}

// =========================================================================
// Test 5: Unigram #2774 - System Theme Sync and Contrast Governor
// =========================================================================
console.log('Testing Unigram #2774: Theme sync and contrast ratio calculation...');
{
  const light = governor.applyThemeSync('light');
  assert.equal(light.background, '#ffffff');
  assert.equal(light.foreground, '#000000');
  assert.ok(light.contrastRatio >= 4.5);

  const dark = governor.applyThemeSync('dark');
  assert.equal(dark.background, '#0e1621');
  assert.equal(dark.foreground, '#ffffff');
  assert.ok(dark.contrastRatio >= 4.5);

  const highContrast = governor.applyThemeSync('high_contrast');
  assert.equal(highContrast.background, '#000000');
  assert.equal(highContrast.primary, '#ffff00');
  assert.equal(highContrast.contrastRatio, 21.0);
  console.log('✅ Unigram #2774: Theme sync and contrast verified.');
}

// =========================================================================
// Test 6: Unigram #3171 - Line Break Whitespace and Control Character Sanitizer
// =========================================================================
console.log('Testing Unigram #3171: Soft hyphen, zero-width space, and line ending cleanup...');
{
  // Message with \r\n, trailing spaces, soft hyphen (\u00AD), and zero-width space (\u200B)
  const dirty = 'First line \u00AD  \r\nSecond line\u200B   \r\nThird line';
  const cleaned = governor.sanitizeLineEndings(dirty);
  assert.equal(cleaned, 'First line\nSecond line\nThird line');
  console.log('✅ Unigram #3171: Line break whitespace sanitizer verified.');
}

// =========================================================================
// Test 7: Unigram #3016 - Text Input Space Normalization
// =========================================================================
console.log('Testing Unigram #3016: Non-breaking space normalization and consecutive spaces...');
{
  // Input containing non-breaking spaces (\u00A0) and thin spaces (\u2009)
  const inputWithNbsp = 'Hello\u00A0world\u2009example';
  const normalized = governor.normalizeSpacesForInput(inputWithNbsp, true);
  assert.equal(normalized, 'Hello world example');

  // Input with consecutive spaces inside code
  const codeIndent = '    def foo():';
  const preserved = governor.normalizeSpacesForInput(codeIndent, true);
  assert.equal(preserved, '    def foo():');
  console.log('✅ Unigram #3016: Text input space normalization verified.');
}

console.log('🎉 Phase 158: All 7 Unigram hardening tests PASSED with 100% precision!');
