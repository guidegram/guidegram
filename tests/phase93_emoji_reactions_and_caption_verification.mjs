import assert from 'node:assert';
import { EmojiReactionsAndCaptionGovernor } from '../src/services/emojiReactionsAndCaptionGovernor.ts';

console.log('🧪 Starting Phase 93 Emoji Autocomplete, Album Caption & Reaction Verification Suite...');

const governor = new EmojiReactionsAndCaptionGovernor();

// 1. Emoji Shortcode Trigger Parser (Kotatogram #275, morethanwords #211)
console.log('  Testing emoji trigger parser and false-positive guards...');
// Valid trigger: ":fire"
const validTrigger = governor.parseEmojiTrigger('Check out this :fire', 20);
assert.strictEqual(validTrigger.isTriggered, true);
assert.strictEqual(validTrigger.query, 'fire');

const emojis = governor.queryEmoji('fire');
assert.ok(emojis.some(e => e.symbol === '🔥' && e.shortcode === 'fire'));

// False positive: time string "The meeting is at 12:30"
const timeString = 'The meeting is at 12:30';
const falseTrigger = governor.parseEmojiTrigger(timeString, timeString.length);
assert.strictEqual(falseTrigger.isTriggered, false);
console.log('  ✅ Emoji shortcode trigger & false-positive guards verified');

// 2. Surrogate Pair Sanitation (morethanwords #115)
console.log('  Testing emoji surrogate pair sanitation...');
// Lone surrogate: '\uD83D' without matching low surrogate
const brokenSurrogate = 'Hello \uD83D World';
const sanitized = governor.sanitizeSurrogates(brokenSurrogate);
assert.strictEqual(sanitized, 'Hello  World');

// Valid emoji surrogate pair: '🔥' (\uD83D\uDD25) should be untouched
const validEmoji = 'Fire 🔥 burning';
assert.strictEqual(governor.sanitizeSurrogates(validEmoji), validEmoji);
console.log('  ✅ Emoji surrogate pair sanitation verified');

// 3. Reaction Toggle & Counter (Kotatogram #355)
console.log('  Testing message reaction toggle & counter...');
let reactions = [];
// User 1 reacts with 🔥
reactions = governor.toggleReaction(reactions, '🔥', 'user_1');
assert.strictEqual(reactions.length, 1);
assert.strictEqual(reactions[0].emoji, '🔥');
assert.strictEqual(reactions[0].count, 1);
assert.strictEqual(reactions[0].hasReacted, true);

// User 2 reacts with 🔥
reactions = governor.toggleReaction(reactions, '🔥', 'user_2');
assert.strictEqual(reactions[0].count, 2);

// User 1 un-reacts (toggles off)
reactions = governor.toggleReaction(reactions, '🔥', 'user_1');
assert.strictEqual(reactions[0].count, 1);
assert.strictEqual(reactions[0].hasReacted, false); // From user 1's perspective
console.log('  ✅ Message reaction toggle & counter verified');

// 4. Album Caption Anchoring (morethanwords #120)
console.log('  Testing album caption anchoring to first media item...');
const albumItems = [
  { id: 'img_1', type: 'photo', url: '/img1.jpg', isFirstInGroup: true },
  { id: 'img_2', type: 'photo', url: '/img2.jpg', isFirstInGroup: false },
  { id: 'img_3', type: 'photo', url: '/img3.jpg', isFirstInGroup: false }
];

const updatedAlbum = governor.updateAlbumCaption(albumItems, 'Photos from summer vacation');
assert.strictEqual(updatedAlbum[0].caption, 'Photos from summer vacation');
assert.strictEqual(updatedAlbum[0].isFirstInGroup, true);
assert.strictEqual(updatedAlbum[1].caption, undefined);
assert.strictEqual(updatedAlbum[2].caption, undefined);
console.log('  ✅ Album caption anchoring verified');

// 5. Auto-Caption Template Generation (Kotatogram #176, #401)
console.log('  Testing auto-caption generation with templates...');
// Disabled by default
assert.strictEqual(governor.formatFileCaption('document.pdf', 2 * 1024 * 1024), undefined);

// Enable with template
governor.setAutoCaptionSettings(true, 'File: {filename} ({size})');
const caption = governor.formatFileCaption('report_2026.docx', 3.5 * 1024 * 1024);
assert.strictEqual(caption, 'File: report_2026.docx (3.5 MB)');
console.log('  ✅ Auto-caption template generation verified');

// 6. Sender Corner Badge for Group Chats (TDesktop #194)
console.log('  Testing sender avatar corner badge in group chat lists...');
const groupBadge = governor.getGroupSenderBadge('group', 'https://avatar.com/user_ali.jpg');
assert.strictEqual(groupBadge.showBadge, true);
assert.strictEqual(groupBadge.badgeAvatarUrl, 'https://avatar.com/user_ali.jpg');

const channelBadge = governor.getGroupSenderBadge('channel', 'https://avatar.com/user_ali.jpg');
assert.strictEqual(channelBadge.showBadge, false);
console.log('  ✅ Sender avatar corner badge verified');

// 7. Story Bar Visibility Toggle (TDesktop #191)
console.log('  Testing story bar visibility toggle...');
assert.strictEqual(governor.isStoriesBarVisible(), true);
governor.setStoriesBarVisible(false);
assert.strictEqual(governor.isStoriesBarVisible(), false);
console.log('  ✅ Story bar visibility toggle verified');

console.log('✨ All Phase 93 Verification Tests Passed 100% Successfully!');
