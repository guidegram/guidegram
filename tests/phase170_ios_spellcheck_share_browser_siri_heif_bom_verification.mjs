import assert from 'node:assert/strict';
import {
  MultilingualSpellcheckGovernor,
  IPadSharePopoverAnchorGovernor,
  InAppBrowserSafeAreaGovernor,
  SiriAnnounceWatermarkGovernor,
  ProfessionalHeifTranscoderGovernor,
  StoriesPublishingSheetGovernor,
  CjkBomEntityNormalizerGovernor
} from '../src/services/iosSpellcheckShareBrowserSiriHeifAndBomGovernor.ts';

console.log('🧪 Starting Phase 170 Verification: iOS Spellcheck, Share Popover, Browser, Siri Watermark, HEIF & BOM Hardening...');

// -------------------------------------------------------------
// Test 1: MultilingualSpellcheckGovernor (Resolves #2401)
// -------------------------------------------------------------
console.log('  Testing #2401: Multilingual Spellcheck False Positive Suppression...');
const spellGov = new MultilingualSpellcheckGovernor();

const bulgarianText = 'Здравейте, как сте днес?';
const res = spellGov.evaluateSpellcheck(bulgarianText, 'en-US');

assert.equal(res.detectedLocale, 'bg-BG');
assert.equal(res.isDictionarySupported, false);
assert.equal(res.suppressUnderlines, true, 'Must suppress red underlines when system dictionary is missing');
console.log('  ✅ #2401 Verified: Cyrillic/Bulgarian spellcheck false positives suppressed.');

// -------------------------------------------------------------
// Test 2: IPadSharePopoverAnchorGovernor (Resolves #2391)
// -------------------------------------------------------------
console.log('  Testing #2391: iPad Share Popover Anchor & Large File Memory Stream...');
const popoverGov = new IPadSharePopoverAnchorGovernor();

const smallFileAnchor = popoverGov.configurePopoverAnchor({
  containerWidth: 1024,
  containerHeight: 768,
  fileSizeBytes: 2 * 1024 * 1024,
  sourceButtonId: 'share_bar_btn'
});
assert.equal(smallFileAnchor.sourceViewId, 'share_bar_btn');
assert.equal(smallFileAnchor.usesMemoryMappedFileStream, false);

const largeFileAnchor = popoverGov.configurePopoverAnchor({
  containerWidth: 1024,
  containerHeight: 768,
  fileSizeBytes: 50 * 1024 * 1024 // 50MB > 15MB threshold
});
assert.equal(largeFileAnchor.usesMemoryMappedFileStream, true);
assert.ok(largeFileAnchor.sourceRect.x > 0);
console.log('  ✅ #2391 Verified: Popover anchor and memory-mapped file streaming configured.');

// -------------------------------------------------------------
// Test 3: InAppBrowserSafeAreaGovernor (Resolves #2347)
// -------------------------------------------------------------
console.log('  Testing #2347: In-App Browser Safe Area & Fixed Header Overlap Prevention...');
const browserGov = new InAppBrowserSafeAreaGovernor();

const safeArea = browserGov.generateSafeAreaFix(44, 47);
assert.equal(safeArea.topChromeHeightPx, 91);
assert.ok(safeArea.injectedCss.includes('--tg-browser-chrome-offset: 91px'));
assert.ok(safeArea.injectedCss.includes('padding-top: var(--tg-browser-chrome-offset)'));
console.log('  ✅ #2347 Verified: In-app browser safe area CSS injection prevents top bleed.');

// -------------------------------------------------------------
// Test 4: SiriAnnounceWatermarkGovernor (Resolves #2339)
// -------------------------------------------------------------
console.log('  Testing #2339: AirPods Siri Announce Watermark Deduplication...');
const siriGov = new SiriAnnounceWatermarkGovernor();

// First message at t = 1000 -> Should announce
const msg1 = siriGov.shouldAnnounceMessage('chat_101', 'm1', 1000);
assert.equal(msg1.shouldAnnounce, true);

// Old or duplicate message at t = 950 -> Must be suppressed!
const oldMsg = siriGov.shouldAnnounceMessage('chat_101', 'm0', 950);
assert.equal(oldMsg.shouldAnnounce, false);
assert.ok(oldMsg.suppressionReason?.includes('older than or equal to last announced watermark'));

// Same timestamp redelivery at t = 1000 -> Must be suppressed!
const dupMsg = siriGov.shouldAnnounceMessage('chat_101', 'm1_dup', 1000);
assert.equal(dupMsg.shouldAnnounce, false);

// Newer message at t = 1500 -> Should announce
const msg2 = siriGov.shouldAnnounceMessage('chat_101', 'm2', 1500);
assert.equal(msg2.shouldAnnounce, true);
console.log('  ✅ #2339 Verified: Siri Announce Notification watermark deduplication validated.');

// -------------------------------------------------------------
// Test 5: ProfessionalHeifTranscoderGovernor (Resolves #2337)
// -------------------------------------------------------------
console.log('  Testing #2337: Sony FX3 10-bit Rec.2100 HEIF Image Transcoding...');
const heifGov = new ProfessionalHeifTranscoderGovernor();

const fx3Photo = heifGov.inspectAndNormalizeHeif({
  mimeType: 'image/heif',
  bitDepth: 10,
  colorSpace: 'Rec2100_HLG'
});
assert.equal(fx3Photo.isHeif, true);
assert.equal(fx3Photo.requiresTranscoding, true);
assert.equal(fx3Photo.targetFormat, 'image/jpeg');

const standardJpeg = heifGov.inspectAndNormalizeHeif({
  mimeType: 'image/jpeg',
  bitDepth: 8,
  colorSpace: 'sRGB'
});
assert.equal(standardJpeg.requiresTranscoding, false);
console.log('  ✅ #2337 Verified: 10-bit Rec.2100 HEIF images flagged for transcoding.');

// -------------------------------------------------------------
// Test 6: StoriesPublishingSheetGovernor (Resolves #2329)
// -------------------------------------------------------------
console.log('  Testing #2329: Stories Publishing Sheet Dynamic Scrollability...');
const storiesGov = new StoriesPublishingSheetGovernor();

// On compact device (height 667px, usable 567px) with 720px content -> Must be scrollable!
const compactLayout = storiesGov.calculateSheetLayout(667, 720);
assert.equal(compactLayout.isScrollable, true);
assert.equal(compactLayout.actionButtonsVisible, true);

// On iPad (height 1024px, usable 924px) with 720px content -> Non-scrollable fits cleanly
const padLayout = storiesGov.calculateSheetLayout(1024, 720);
assert.equal(padLayout.isScrollable, false);
console.log('  ✅ #2329 Verified: Stories publishing sheet dynamic scrolling layout verified.');

// -------------------------------------------------------------
// Test 7: CjkBomEntityNormalizerGovernor (Resolves #2321)
// -------------------------------------------------------------
console.log('  Testing #2321: UTF-8 BOM Stripping & Chinese Entity Offset Normalization...');
const bomGov = new CjkBomEntityNormalizerGovernor();

const rawInputWithBom = '\uFEFF**你好世界**';
const rawEntities = [
  { type: 'bold', offset: 1, length: 4 } // offset shifted by BOM in raw stream
];

const normalized = bomGov.stripBomAndNormalizeEntities(rawInputWithBom, rawEntities);
assert.equal(normalized.bomRemoved, true);
assert.equal(normalized.cleanedText, '**你好世界**');
assert.equal(normalized.entities[0].offset, 0, 'Offset must be realigned to 0 after BOM removal');
assert.equal(normalized.entities[0].length, 4);
console.log('  ✅ #2321 Verified: UTF-8 BOM stripped and entity offsets correctly aligned.');

console.log('\n🎉 ALL 7 TELEGRAM-IOS HARDENING TESTS PASSED WITH 100% SUCCESS!');
