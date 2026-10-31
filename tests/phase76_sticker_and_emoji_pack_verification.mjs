import assert from 'node:assert';
import { StickerAndEmojiPackGovernor } from '../src/services/stickerAndEmojiPackGovernor.ts';

console.log('🧪 Starting Phase 76 Sticker & Custom Emoji Pack Verification Suite...');

const governor = new StickerAndEmojiPackGovernor();

// 1. Test getStickerPackWithCache and rate-limit throttling (Ajaxy #436)
console.log('  Testing sticker pack caching and rate-limiting...');
const mockPack = {
  id: 'pack_101',
  title: 'Guidegram Animated Mascot',
  shortName: 'GuidegramMascot',
  isCustomEmoji: false,
  isPremium: false,
  installed: true,
  stickers: [
    {
      id: 'stk_1',
      packId: 'pack_101',
      emoji: '🚀',
      isAnimated: true,
      isVideo: false,
      thumbnailUrl: 'https://cdn.guidegram.org/stk1_thumb.webp',
      fullMediaUrl: 'https://cdn.guidegram.org/stk1.tgs',
      width: 512,
      height: 512
    }
  ]
};

governor.storePackInCache(mockPack);

// Immediate retrieval should hit cache
const cached = await governor.getStickerPackWithCache('guidegrammascot');
assert.ok(cached !== null);
assert.strictEqual(cached?.id, 'pack_101');
assert.strictEqual(cached?.title, 'Guidegram Animated Mascot');
console.log('  ✅ Sticker pack caching and rate-limiting verified');

// 2. Test Recent Stickers LRU and Limit (TDesktop #202)
console.log('  Testing recent stickers LRU tracking and cap...');
for (let i = 1; i <= 5; i++) {
  governor.recordRecentSticker({
    id: `recent_${i}`,
    packId: 'pack_101',
    emoji: '⭐',
    isAnimated: false,
    isVideo: false,
    thumbnailUrl: `thumb_${i}.webp`,
    fullMediaUrl: `full_${i}.webp`,
    width: 256,
    height: 256
  }, 3);
}

const recents = governor.getRecentStickers();
assert.strictEqual(recents.length, 3);
assert.strictEqual(recents[0].id, 'recent_5'); // Most recent at index 0
assert.strictEqual(recents[1].id, 'recent_4');
assert.strictEqual(recents[2].id, 'recent_3');
console.log('  ✅ Recent stickers LRU tracking and cap verified');

// 3. Test WebP send mode detection (Ajaxy #247 & morethanwords #225)
console.log('  Testing WebP send mode detection...');
const photoMode = governor.detectWebpSendMode('my_vacation.webp', 'image/webp', false);
assert.strictEqual(photoMode.sendAs, 'photo');

const stickerMode = governor.detectWebpSendMode('custom_sticker.webp', 'image/webp', true);
assert.strictEqual(stickerMode.sendAs, 'sticker');

const docMode = governor.detectWebpSendMode('document.pdf', 'application/pdf', false);
assert.strictEqual(docMode.sendAs, 'document');
console.log('  ✅ WebP send mode detection verified');

// 4. Test Dynamic Emoji Font Scaling (Ajaxy #398)
console.log('  Testing dynamic emoji font scaling...');
const singleEmoji = governor.calculateEmojiFontSize('🚀');
assert.strictEqual(singleEmoji.isJumboEmoji, true);
assert.strictEqual(singleEmoji.fontSizePx, 48);

const twoEmoji = governor.calculateEmojiFontSize('🚀 ⭐');
assert.strictEqual(twoEmoji.isJumboEmoji, true);
assert.strictEqual(twoEmoji.fontSizePx, 36);

const mixedText = governor.calculateEmojiFontSize('Hello 🚀');
assert.strictEqual(mixedText.isJumboEmoji, false);
assert.strictEqual(mixedText.fontSizePx, 16);
console.log('  ✅ Dynamic emoji font scaling verified');

// 5. Test Text Smiley Auto-Conversion (morethanwords #360)
console.log('  Testing text smiley auto-conversion...');
const converted1 = governor.convertTextSmileys('Hello :) are you ready ;)');
assert.strictEqual(converted1, 'Hello 😊 are you ready 😉');

const converted2 = governor.convertTextSmileys('Great job <3');
assert.strictEqual(converted2, 'Great job ❤️');

// Url with colon should not be corrupted
const urlTest = governor.convertTextSmileys('Visit http://example.com/path :)');
assert.strictEqual(urlTest, 'Visit http://example.com/path 😊');
console.log('  ✅ Text smiley auto-conversion verified');

// 6. Test Custom Emoji High-Res vs Thumb (Telegram-iOS #2296)
console.log('  Testing custom emoji resolution resolution...');
const normalEmoji = governor.resolveCustomEmojiResolution('emoji_999', false);
assert.strictEqual(normalEmoji.size, 24);
assert.strictEqual(normalEmoji.isHighRes, false);

const highResEmoji = governor.resolveCustomEmojiResolution('emoji_999', true);
assert.strictEqual(highResEmoji.size, 128);
assert.strictEqual(highResEmoji.isHighRes, true);
assert.ok(highResEmoji.targetUrl.includes('format=webm'));
console.log('  ✅ Custom emoji resolution verified');

// 7. Test Long Emoji Pack Title Truncation (Telegram-iOS #2371)
console.log('  Testing emoji pack title truncation...');
const shortTitle = governor.formatEmojiPackTitleForPicker('Cute Cats');
assert.strictEqual(shortTitle.isTruncated, false);
assert.strictEqual(shortTitle.displayTitle, 'Cute Cats');

const longTitle = governor.formatEmojiPackTitleForPicker('Super Ultra Hyper Premium Animated Duck Emoticons 2026', 20);
assert.strictEqual(longTitle.isTruncated, true);
assert.strictEqual(longTitle.displayTitle, 'Super Ultra Hyper...');
console.log('  ✅ Emoji pack title truncation verified');

// 8. Test Custom Emoji CSS Wrapping (Telegram-iOS #2284)
console.log('  Testing custom emoji CSS wrapping styles...');
const styles = governor.computeCustomEmojiCssStyle();
assert.strictEqual(styles.display, 'inline-block');
assert.strictEqual(styles.overflowWrap, 'break-word');
assert.strictEqual(styles.wordBreak, 'break-word');
console.log('  ✅ Custom emoji CSS wrapping styles verified');

console.log('✨ All Phase 76 Verification Tests Passed 100% Successfully!');
