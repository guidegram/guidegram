import assert from 'node:assert/strict';
import { MediaPickerAndStoryComposerGovernor } from '../src/services/mediaPickerAndStoryComposerGovernor.ts';

console.log('🧪 Starting Phase 68 Media Picker & Story Composer Verification Suite...');

const governor = new MediaPickerAndStoryComposerGovernor();

// 1. Natural Alphanumeric File Sorting (kotatogram/kotatogram-desktop #172)
console.log('  Testing natural alphanumeric file sorting...');
const unorderedFiles = [
  { name: 'document10.pdf' },
  { name: 'document1.pdf' },
  { name: 'document2.pdf' },
  { name: 'document20.pdf' },
  { name: 'document3.pdf' },
];

const sorted = governor.sortFilesNaturally(unorderedFiles);
assert.deepEqual(
  sorted.map((f) => f.name),
  ['document1.pdf', 'document2.pdf', 'document3.pdf', 'document10.pdf', 'document20.pdf'],
  'Files must sort in natural human numeric order'
);
console.log('  ✅ Natural alphanumeric file sorting verified');

// 2. Album Creation, 10-item Cap & Reordering (morethanwords/tweb #119)
console.log('  Testing album creation and reordering...');
const rawItems = Array.from({ length: 14 }, (_, i) => ({
  id: `item_${i}`,
  file: { name: `photo_${i}.jpg`, size: 1024, type: 'image/jpeg' },
  type: 'photo',
  orderIndex: i,
}));

const albumRes = governor.createAlbum(rawItems);
assert.equal(albumRes.isCapped, true, 'Albums with >10 items must be capped');
assert.equal(albumRes.albumItems.length, 10);
assert.equal(albumRes.albumItems[0].orderIndex, 0);
assert.equal(albumRes.albumItems[9].orderIndex, 9);

// Reorder item from index 0 to index 3
const reordered = governor.reorderAlbumItem(albumRes.albumItems, 0, 3);
assert.equal(reordered[3].id, 'item_0');
assert.equal(reordered[3].orderIndex, 3);
assert.equal(reordered[0].id, 'item_1');
console.log('  ✅ Album creation & reordering verified');

// 3. Per-Item Video Mute Preservation (TelegramMessenger/Telegram-iOS #2366)
console.log('  Testing per-item video mute state preservation...');
const mixedAlbum = [
  { id: 'p1', file: { name: 'photo1.jpg', size: 100, type: 'image/jpeg' }, type: 'photo', orderIndex: 0 },
  { id: 'v1', file: { name: 'vid1.mp4', size: 200, type: 'video/mp4' }, type: 'video', orderIndex: 1, isMuted: false },
  { id: 'v2', file: { name: 'vid2.mp4', size: 300, type: 'video/mp4' }, type: 'video', orderIndex: 2, isMuted: false },
];

const muteResult = governor.toggleAlbumVideoMute(mixedAlbum, 'v1', true);
assert.equal(muteResult.albumPreserved, true, 'Album must remain grouped');
assert.equal(muteResult.items[1].isMuted, true);
assert.equal(muteResult.items[2].isMuted, false);
console.log('  ✅ Per-item video mute preservation verified');

// 4. Mixed Media Clipboard Parsing (TelegramMessenger/Telegram-iOS #2367)
console.log('  Testing mixed media clipboard parsing (.mov + photos)...');
const clipboardRaw = [
  { name: 'screenshot.png', type: 'image/png', size: 5000 },
  { name: 'clip.mov', type: 'video/quicktime', size: 25000 },
  { name: 'document.txt', type: 'text/plain', size: 200 }, // Non-media, should be ignored
];

const parsedMedia = governor.parseClipboardMediaItems(clipboardRaw);
assert.equal(parsedMedia.length, 2);
assert.equal(parsedMedia[0].type, 'photo');
assert.equal(parsedMedia[1].type, 'video');
console.log('  ✅ Mixed media clipboard parsing verified');

// 5. Aspect-Ratio Clamping & Lock (UnigramDev/Unigram #3239)
console.log('  Testing aspect-ratio lock computation...');
// Standard 1080x1920 portrait clamped to 9:16 vertical story
const storyDim = governor.computeLockedAspectRatio(1080, 1920, '9:16');
assert.equal(storyDim.targetWidth, 1080);
assert.equal(storyDim.targetHeight, 1920);

// Arbitrary 1200x800 clamped to 16:9 cinematic
const cinematicDim = governor.computeLockedAspectRatio(1200, 800, '16:9');
assert.equal(cinematicDim.targetWidth, 1200);
assert.equal(cinematicDim.targetHeight, 675); // 1200 / (16/9)
console.log('  ✅ Aspect-ratio lock computation verified');

// 6. Story Composition Validation (morethanwords/tweb #253)
console.log('  Testing story composition validation...');
// Free tier user with 250 char caption -> invalid
const invalidStory = governor.validateStoryComposition({
  mediaType: 'video',
  mediaUrl: 'https://cdn.guidegram.app/stories/vid_1.mp4',
  durationSeconds: 15,
  caption: 'A'.repeat(250),
  privacy: 'public',
  isPremiumUser: false,
  aspectRatio: '9:16',
});
assert.equal(invalidStory.isValid, false);
assert.ok(invalidStory.errors[0].includes('200'));

// Premium tier user with 250 char caption -> valid!
const validPremiumStory = governor.validateStoryComposition({
  mediaType: 'video',
  mediaUrl: 'https://cdn.guidegram.app/stories/vid_1.mp4',
  durationSeconds: 15,
  caption: 'A'.repeat(250),
  privacy: 'public',
  isPremiumUser: true,
  aspectRatio: '9:16',
});
assert.equal(validPremiumStory.isValid, true);
console.log('  ✅ Story composition validation verified');

console.log('✨ All Phase 68 Verification Tests Passed 100% Successfully!');
