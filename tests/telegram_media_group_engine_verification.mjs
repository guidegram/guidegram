import assert from 'node:assert';
import {
  isAnimationMedia,
  getMediaGroupType,
  canGroupTogether,
  validateMediaGroup,
  partitionMediaIntoTelegramAlbums,
  assignAlbumCaptions
} from '../src/utils/telegramMediaGroupEngine.ts';

console.log('🧪 Running Telegram Media Group Engine Verification...');

let passed = 0;

// 1. Animation detection
assert.strictEqual(isAnimationMedia({ mediaType: 'animation' }), true);
assert.strictEqual(isAnimationMedia({ mediaType: 'gif' }), true);
assert.strictEqual(isAnimationMedia({ mimeType: 'image/gif' }), true);
assert.strictEqual(isAnimationMedia({ name: 'funny_cat.GIF' }), true);
assert.strictEqual(isAnimationMedia({ mediaType: 'photo', name: 'picture.jpg' }), false);
console.log('✅ Check 1: Animation (GIF) detection passed');
passed++;

// 2. Media group type classification
assert.strictEqual(getMediaGroupType({ mediaType: 'photo' }), 'visual');
assert.strictEqual(getMediaGroupType({ mediaType: 'video' }), 'visual');
assert.strictEqual(getMediaGroupType({ mediaType: 'audio' }), 'audio');
assert.strictEqual(getMediaGroupType({ mediaType: 'document' }), 'document');
assert.strictEqual(getMediaGroupType({ mediaType: 'animation' }), null);
console.log('✅ Check 2: Media group type classification passed');
passed++;

// 3. Can group together (homogeneity rules)
assert.strictEqual(canGroupTogether({ mediaType: 'photo' }, { mediaType: 'video' }), true);
assert.strictEqual(canGroupTogether({ mediaType: 'audio' }, { mediaType: 'audio' }), true);
assert.strictEqual(canGroupTogether({ mediaType: 'photo' }, { mediaType: 'audio' }), false);
assert.strictEqual(canGroupTogether({ mediaType: 'document' }, { mediaType: 'video' }), false);
assert.strictEqual(canGroupTogether({ mediaType: 'animation' }, { mediaType: 'photo' }), false);
console.log('✅ Check 3: Group compatibility passed');
passed++;

// 4. Validate media group (Valid Visual Group)
const validVisualGroup = [
  { mediaType: 'photo', id: 1 },
  { mediaType: 'video', id: 2 },
  { mediaType: 'photo', id: 3 }
];
const res1 = validateMediaGroup(validVisualGroup);
assert.strictEqual(res1.valid, true);
assert.strictEqual(res1.groupType, 'visual');
assert.strictEqual(res1.itemCount, 3);
console.log('✅ Check 4: Valid visual group validation passed');
passed++;

// 5. Reject < 2 or > 10 items
const singleItem = [{ mediaType: 'photo', id: 1 }];
assert.strictEqual(validateMediaGroup(singleItem).valid, false);

const elevenItems = Array.from({ length: 11 }, (_, i) => ({ mediaType: 'photo', id: i + 1 }));
assert.strictEqual(validateMediaGroup(elevenItems).valid, false);
console.log('✅ Check 5: Boundary item count clamps passed');
passed++;

// 6. Reject animation in media group (Teloxide #1121 core bug)
const groupWithAnimation = [
  { mediaType: 'photo', id: 1 },
  { mediaType: 'animation', id: 2 }
];
const resAnim = validateMediaGroup(groupWithAnimation);
assert.strictEqual(resAnim.valid, false);
assert.match(resAnim.error, /animation \(GIF\)/);
console.log('✅ Check 6: Animation in media group rejection passed');
passed++;

// 7. Reject mixed incompatible types
const mixedGroup = [
  { mediaType: 'photo', id: 1 },
  { mediaType: 'audio', id: 2 }
];
const resMixed = validateMediaGroup(mixedGroup);
assert.strictEqual(resMixed.valid, false);
assert.match(resMixed.error, /Cannot mix visual with audio/);
console.log('✅ Check 7: Incompatible types rejection passed');
passed++;

// 8. Auto-partitioning: 14 items split into 10 + 4
const fourteenPhotos = Array.from({ length: 14 }, (_, i) => ({ mediaType: 'photo', name: `p${i + 1}.jpg` }));
const chunks = partitionMediaIntoTelegramAlbums(fourteenPhotos);
assert.strictEqual(chunks.length, 2);
assert.strictEqual(chunks[0].isGroup, true);
assert.strictEqual(chunks[0].items.length, 10);
assert.strictEqual(chunks[1].isGroup, true);
assert.strictEqual(chunks[1].items.length, 4);
console.log('✅ Check 8: 14 items auto-partitioning into 10+4 passed');
passed++;

// 9. Auto-partitioning: Heterogeneous list (3 photos, 1 GIF, 2 docs)
const heterogeneous = [
  { mediaType: 'photo', name: 'p1.jpg' },
  { mediaType: 'video', name: 'v2.mp4' },
  { mediaType: 'photo', name: 'p3.jpg' },
  { mediaType: 'animation', name: 'funny.gif' },
  { mediaType: 'document', name: 'd1.pdf' },
  { mediaType: 'document', name: 'd2.pdf' }
];
const heteroChunks = partitionMediaIntoTelegramAlbums(heterogeneous);
assert.strictEqual(heteroChunks.length, 3);
// Chunk 0: Visual album (3 items)
assert.strictEqual(heteroChunks[0].isGroup, true);
assert.strictEqual(heteroChunks[0].groupType, 'visual');
assert.strictEqual(heteroChunks[0].items.length, 3);
// Chunk 1: Isolated GIF (standalone)
assert.strictEqual(heteroChunks[1].isGroup, false);
assert.strictEqual(heteroChunks[1].items.length, 1);
assert.strictEqual(heteroChunks[1].items[0].mediaType, 'animation');
// Chunk 2: Document album (2 items)
assert.strictEqual(heteroChunks[2].isGroup, true);
assert.strictEqual(heteroChunks[2].groupType, 'document');
assert.strictEqual(heteroChunks[2].items.length, 2);
console.log('✅ Check 9: Heterogeneous media stream partitioning passed');
passed++;

// 10. Caption assignment invariant
const itemsForCaption = [
  { name: 'p1.jpg', caption: 'old1' },
  { name: 'p2.jpg', caption: 'old2' },
  { name: 'p3.jpg' }
];
const captioned = assignAlbumCaptions(itemsForCaption, 'Master Caption');
assert.strictEqual(captioned[0].caption, 'Master Caption');
assert.strictEqual(captioned[1].caption, undefined);
assert.strictEqual(captioned[2].caption, undefined);
console.log('✅ Check 10: Master caption distribution passed');
passed++;

console.log(`\n🎉 ALL ${passed}/10 CHECKS PASSED FOR TELEGRAM MEDIA GROUP ENGINE!`);
