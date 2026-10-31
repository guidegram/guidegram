/**
 * Test Suite: Phase 108 Plugin Sandbox, Sticker & CDN Verification
 * 
 * Verifies fixes for:
 * - morethanwords/tweb #196: [BUG] Stickers are not shown (Sticker hydration & static thumbnail fallback)
 * - TDesktop-x64/tdesktop #193: Language pack download mirror fallback (cdn.jsdelivr.net multi-CDN)
 * - TDesktop-x64/tdesktop #192: Do not hover Emojis (Emoji hover tooltip suppression)
 * - AyuGram/AyuGramDesktop #230: Plugins (Safe plugin sandboxing & permission validation)
 * - kotatogram/kotatogram-desktop #142: Compatibility with latest Telegram (MTProto layer negotiation)
 * - kotatogram/kotatogram-desktop #388: VA-API / libva hardware acceleration probe & software decode fallback
 * - morethanwords/tweb #389: [BUG] Cannot access web.telegram.org/k/ (Multi-origin web routing & SW recovery)
 */

import assert from 'node:assert';
import { pluginSandboxStickerAndCdnGovernor } from '../src/services/pluginSandboxStickerAndCdnGovernor.ts';

console.log('🧪 Starting Phase 108 Plugin Sandbox, Sticker & CDN Verification Suite...');

// 1. Sticker Hydration & Thumbnail Fallback
console.log('  Testing sticker thumbnail fallback on decoder failure...');
const animatedSticker = pluginSandboxStickerAndCdnGovernor.resolveStickerSource(
  'stk_dog_1',
  'https://cdn.guidegram.app/stickers/dog.tgs',
  'https://cdn.guidegram.app/stickers/dog.webp',
  false
);
assert.strictEqual(animatedSticker.isFallbackThumbnail, false);
assert.strictEqual(animatedSticker.renderSourceUrl, 'https://cdn.guidegram.app/stickers/dog.tgs');

// Decode error -> fallback thumbnail
const fallbackSticker = pluginSandboxStickerAndCdnGovernor.resolveStickerSource(
  'stk_dog_1',
  'https://cdn.guidegram.app/stickers/dog.tgs',
  'https://cdn.guidegram.app/stickers/dog.webp',
  true
);
assert.strictEqual(fallbackSticker.isFallbackThumbnail, true);
assert.strictEqual(fallbackSticker.renderSourceUrl, 'https://cdn.guidegram.app/stickers/dog.webp');
console.log('  ✅ Sticker thumbnail fallback on decode failure verified');

// 2. Multi-CDN Language Pack Resolver
console.log('  Testing multi-CDN language pack mirrors...');
const cdnNormal = pluginSandboxStickerAndCdnGovernor.resolveLanguagePackCdn('fa', false);
assert.ok(cdnNormal.activeCdn.includes('cdn.jsdelivr.net'));

const cdnFallback = pluginSandboxStickerAndCdnGovernor.resolveLanguagePackCdn('fa', true);
assert.ok(cdnFallback.activeCdn.includes('raw.githubusercontent.com'));
console.log('  ✅ Language pack multi-CDN resolution and fallback verified');

// 3. Emoji Hover Tooltip Suppressor
console.log('  Testing emoji hover tooltip toggle...');
const hoverDisabled = pluginSandboxStickerAndCdnGovernor.setEmojiHoverPreview(false);
assert.strictEqual(hoverDisabled.hoverPreviewEnabled, false);
assert.strictEqual(hoverDisabled.animateOnHover, false);

const hoverEnabled = pluginSandboxStickerAndCdnGovernor.setEmojiHoverPreview(true);
assert.strictEqual(hoverEnabled.hoverPreviewEnabled, true);
console.log('  ✅ Emoji hover tooltip toggle verified');

// 4. Sandboxed Plugin Loader & Permissions
console.log('  Testing plugin manifest validation and permission sandbox...');
const validManifest = {
  id: 'plugin_sound_effects',
  name: 'Sound Effects Mod',
  version: '1.0.0',
  permissions: ['storage', 'ui'],
  entryPoint: 'index.js',
};
const pluginRes = pluginSandboxStickerAndCdnGovernor.validatePluginManifest(validManifest);
assert.strictEqual(pluginRes.isAllowed, true);
assert.deepStrictEqual(pluginRes.grantedPermissions, ['storage', 'ui']);

const invalidManifest = {
  id: '',
  name: 'Broken Mod',
  version: '0.1',
  permissions: [],
  entryPoint: '',
};
const brokenRes = pluginSandboxStickerAndCdnGovernor.validatePluginManifest(invalidManifest);
assert.strictEqual(brokenRes.isAllowed, false);
console.log('  ✅ Plugin sandboxing and permission validation verified');

// 5. MTProto Layer Negotiation
console.log('  Testing MTProto layer negotiation...');
const modernServer = pluginSandboxStickerAndCdnGovernor.negotiateMtprotoLayer(190);
assert.strictEqual(modernServer.isCompatible, true);
assert.strictEqual(modernServer.negotiatedLayer, 188); // Client cap

const olderServer = pluginSandboxStickerAndCdnGovernor.negotiateMtprotoLayer(145);
assert.strictEqual(olderServer.isCompatible, true);
assert.strictEqual(olderServer.negotiatedLayer, 145); // Server cap
console.log('  ✅ MTProto layer negotiation verified');

// 6. VA-API Hardware Acceleration Probe
console.log('  Testing VA-API hardware acceleration probe...');
const hwProbe = pluginSandboxStickerAndCdnGovernor.probeVaapiSupport(true, true);
assert.strictEqual(hwProbe.isVaapiAvailable, true);
assert.strictEqual(hwProbe.preferredDecoder, 'vaapi_hardware');

const swProbe = pluginSandboxStickerAndCdnGovernor.probeVaapiSupport(false, false);
assert.strictEqual(swProbe.isVaapiAvailable, false);
assert.strictEqual(swProbe.preferredDecoder, 'software_cpu');
console.log('  ✅ VA-API probe and software CPU decode fallback verified');

// 7. Multi-Origin Web Client Routing
console.log('  Testing multi-origin web routing (/k and /a)...');
const routeK = pluginSandboxStickerAndCdnGovernor.resolveWebClientRoute('/k/chat_1');
assert.strictEqual(routeK.routeType, 'web_k');
assert.strictEqual(routeK.resolvedOrigin, 'https://web.guidegram.app/k/');

const routeA = pluginSandboxStickerAndCdnGovernor.resolveWebClientRoute('/a/chat_1');
assert.strictEqual(routeA.routeType, 'web_a');
assert.strictEqual(routeA.resolvedOrigin, 'https://web.guidegram.app/a/');
console.log('  ✅ Web client multi-origin routing verified');

console.log('✨ All Phase 108 Verification Tests Passed 100% Successfully!');
