/**
 * Test Suite: Phase 104 Sticker Preview, GPU Image Cache & Wide Sidebar Verification
 * 
 * Verifies fixes for:
 * - Ajaxy/telegram-tt #254: [PERF] Loading images use immense GPU (Texture allocation & disposal cache)
 * - Ajaxy/telegram-tt #386: Youtube link preview with embed player (Sandboxed iframe preview)
 * - UnigramDev/Unigram #1611: Make previewing stickers better (Interactive sticker zoom & send)
 * - UnigramDev/Unigram #554: Telegram-Desktop-like sidebar for wide screens (3-column layout)
 * - UnigramDev/Unigram #2572: unable to pin Emoji/Gif/Sticker panel (Pinned drawer dock manager)
 * - morethanwords/tweb #114: Implement way for display stickers/emoji without wasm (CSS/WebP fallback)
 * - tdlib/td #3083: Test Accounts PHONE_CODE_INVALID (Test DC staging phone auth validation)
 */

import assert from 'node:assert';
import { stickerPreviewGpuAndWideSidebarGovernor } from '../src/services/stickerPreviewGpuAndWideSidebarGovernor.ts';

console.log('🧪 Starting Phase 104 Sticker Preview, GPU Cache & Wide Sidebar Verification Suite...');

// 1. GPU Image Cache & Texture Limiter
console.log('  Testing GPU texture allocation and eviction cache...');
// Allocate 40MB texture
const tex1 = stickerPreviewGpuAndWideSidebarGovernor.allocateTexture('tex_photo_1', 3162, 3162); // ~40MB
assert.strictEqual(tex1.allocated, true);
assert.strictEqual(tex1.evictedCount, 0);

// Allocate another 40MB texture -> triggers eviction of tex1 because total > 64MB
const tex2 = stickerPreviewGpuAndWideSidebarGovernor.allocateTexture('tex_photo_2', 3162, 3162);
assert.strictEqual(tex2.allocated, true);
assert.strictEqual(tex2.evictedCount, 1);

// Free texture
stickerPreviewGpuAndWideSidebarGovernor.releaseTexture('tex_photo_2');
assert.strictEqual(stickerPreviewGpuAndWideSidebarGovernor.getCurrentTextureMemoryBytes(), 0);
console.log('  ✅ GPU texture memory pool and eviction verified');

// 2. YouTube Link Preview & Sandboxed Player
console.log('  Testing YouTube link preview parsing...');
const ytUrl1 = 'https://youtu.be/dQw4w9WgXcQ';
const preview1 = stickerPreviewGpuAndWideSidebarGovernor.parseYouTubeUrl(ytUrl1);
assert.strictEqual(preview1?.videoId, 'dQw4w9WgXcQ');
assert.strictEqual(preview1?.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
assert.ok(preview1?.thumbnailUrl.includes('dQw4w9WgXcQ'));

const ytUrl2 = 'https://www.youtube.com/watch?v=9bZkp7q19f0&t=10s';
const preview2 = stickerPreviewGpuAndWideSidebarGovernor.parseYouTubeUrl(ytUrl2);
assert.strictEqual(preview2?.videoId, '9bZkp7q19f0');
console.log('  ✅ YouTube embed link preview verified');

// 3. Interactive Sticker Previewer
console.log('  Testing sticker preview modal lifecycle...');
const previewModel = stickerPreviewGpuAndWideSidebarGovernor.openStickerPreview({
  stickerId: 'stk_cat_cheer',
  packId: 'pack_cats_12',
  packTitle: 'Playful Cats',
  emoji: '🐱',
  thumbnailUrl: 'https://cdn.guidegram.app/stickers/cat.webp',
  isAnimated: true,
});
assert.strictEqual(previewModel.isOpen, true);
assert.strictEqual(previewModel.emoji, '🐱');

const active = stickerPreviewGpuAndWideSidebarGovernor.getActiveStickerPreview();
assert.strictEqual(active?.stickerId, 'stk_cat_cheer');

stickerPreviewGpuAndWideSidebarGovernor.closeStickerPreview();
assert.strictEqual(stickerPreviewGpuAndWideSidebarGovernor.getActiveStickerPreview(), null);
console.log('  ✅ Sticker preview modal verified');

// 4. Wide-Screen 3-Column Layout Governor
console.log('  Testing wide-screen 3-column layout...');
const layoutWide = stickerPreviewGpuAndWideSidebarGovernor.updateViewportWidth(1440);
assert.strictEqual(layoutWide.isWideScreen, true);

// Open right sidebar
const sidebarOpen = stickerPreviewGpuAndWideSidebarGovernor.toggleRightSidebar('shared_media');
assert.strictEqual(sidebarOpen.isRightSidebarOpen, true);
assert.strictEqual(sidebarOpen.sidebarContentType, 'shared_media');
assert.strictEqual(sidebarOpen.rightColumnWidth, 320);

// Shrink to mobile/narrow -> auto collapse right sidebar
const layoutNarrow = stickerPreviewGpuAndWideSidebarGovernor.updateViewportWidth(800);
assert.strictEqual(layoutNarrow.isWideScreen, false);
assert.strictEqual(layoutNarrow.isRightSidebarOpen, false);
console.log('  ✅ Wide-screen 3-column layout adaptation verified');

// 5. Pinned Emoji/Sticker Panel Manager
console.log('  Testing pinned emoji panel dock state...');
const panelPinned = stickerPreviewGpuAndWideSidebarGovernor.togglePinEmojiPanel();
assert.strictEqual(panelPinned.isPinned, true);

const panelTab = stickerPreviewGpuAndWideSidebarGovernor.setEmojiPanelTab('gifs');
assert.strictEqual(panelTab.activeTab, 'gifs');
console.log('  ✅ Pinned emoji panel state and tabs verified');

// 6. WASM-Free Sticker Fallback Renderer
console.log('  Testing WASM-free sticker rendering fallback...');
const wasmSupported = stickerPreviewGpuAndWideSidebarGovernor.resolveStickerRenderAsset('stk_stars', true);
assert.strictEqual(wasmSupported.renderMode, 'wasm_lottie');
assert.ok(wasmSupported.assetUrl.endsWith('.tgs'));

const wasmDisabled = stickerPreviewGpuAndWideSidebarGovernor.resolveStickerRenderAsset('stk_stars', false);
assert.strictEqual(wasmDisabled.renderMode, 'static_webp_thumbnail');
assert.ok(wasmDisabled.assetUrl.endsWith('.webp'));
console.log('  ✅ WASM-free sticker fallback verified');

// 7. Test DC Authentication Validator
console.log('  Testing Test DC phone code validation...');
const testValid = stickerPreviewGpuAndWideSidebarGovernor.validatePhoneAuthCode('+9996612345', '22222', true);
assert.strictEqual(testValid.isValid, true);
assert.strictEqual(testValid.isTestDc, true);

// Invalid code in production
const prodInvalid = stickerPreviewGpuAndWideSidebarGovernor.validatePhoneAuthCode('+12025550199', 'bad', false);
assert.strictEqual(prodInvalid.isValid, false);
assert.strictEqual(prodInvalid.error, 'PHONE_CODE_INVALID');
console.log('  ✅ Test DC staging phone authentication verified');

console.log('✨ All Phase 104 Verification Tests Passed 100% Successfully!');
