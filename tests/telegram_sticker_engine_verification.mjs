import { strict as assert } from 'node:assert';
import { TelegramStickerEngine } from '../dist-test-sticker/src/utils/telegramStickerEngine.js';

console.log('🧪 Starting TelegramStickerEngine Verification Suite...');

const engine = TelegramStickerEngine.getInstance();

// 1. Singleton instance check
assert.ok(engine, 'TelegramStickerEngine should be initialized');
assert.strictEqual(engine, TelegramStickerEngine.getInstance(), 'Must be singleton');
console.log('  ✅ Check 1: Singleton instantiation verified');

// 2. AddStickerToSet payload emits singular object, rejects array
const validSticker = {
  sticker: 'https://example.com/sticker.png',
  format: 'static',
  emoji_list: ['🔥', '👍'],
  keywords: ['fire', 'cool']
};

const addParts = engine.prepareAddStickerPayload({
  user_id: 12345678,
  name: 'test_pack_by_bot',
  sticker: validSticker
});

assert.strictEqual(addParts.length, 3, 'Should have 3 parts: user_id, name, sticker');
const stickerPart = addParts.find(p => p.name === 'sticker');
assert.ok(stickerPart, 'Sticker part must exist');
assert.strictEqual(stickerPart.isJson, true, 'isJson must be true');
assert.strictEqual(stickerPart.isArray, false, 'isArray must be FALSE for AddStickerToSet');

const parsedStickerObj = JSON.parse(stickerPart.value);
assert.strictEqual(Array.isArray(parsedStickerObj), false, 'Parsed sticker value MUST NOT be an array');
assert.strictEqual(parsedStickerObj.format, 'static');
assert.deepStrictEqual(parsedStickerObj.emoji_list, ['🔥', '👍']);
console.log('  ✅ Check 2: AddStickerToSet singular object serialization verified');

// 3. AddStickerToSet rejects accidental array
assert.throws(() => {
  engine.prepareAddStickerPayload({
    user_id: 12345678,
    name: 'test_pack_by_bot',
    sticker: [validSticker] // Accidental array
  });
}, /must be a single InputSticker object, not an Array/);
console.log('  ✅ Check 3: AddStickerToSet array rejection verified');

// 4. ReplaceStickerInSet payload emits singular object and includes old_sticker
const replaceParts = engine.prepareReplaceStickerPayload({
  user_id: 12345678,
  name: 'test_pack_by_bot',
  old_sticker: 'CAACAgIAAxkBAAE123...',
  sticker: validSticker
});

assert.strictEqual(replaceParts.length, 4, 'Should have 4 parts');
const replaceStickerPart = replaceParts.find(p => p.name === 'sticker');
assert.strictEqual(replaceStickerPart.isArray, false, 'isArray must be false for ReplaceStickerInSet');
const replaceOldPart = replaceParts.find(p => p.name === 'old_sticker');
assert.strictEqual(replaceOldPart.value, 'CAACAgIAAxkBAAE123...');
console.log('  ✅ Check 4: ReplaceStickerInSet verification passed');

// 5. CreateNewStickerSet accepts array of stickers (1..50)
const createParts = engine.prepareCreateStickerSetPayload({
  user_id: 12345678,
  name: 'new_pack_by_bot',
  title: 'My Custom Pack',
  stickers: [validSticker, { ...validSticker, emoji_list: ['🎉'] }],
  sticker_type: 'regular'
});

const stickersPart = createParts.find(p => p.name === 'stickers');
assert.ok(stickersPart, 'stickers part must exist');
assert.strictEqual(stickersPart.isArray, true, 'isArray must be true for CreateNewStickerSet');
const parsedStickers = JSON.parse(stickersPart.value);
assert.strictEqual(Array.isArray(parsedStickers), true, 'Must parse to an Array');
assert.strictEqual(parsedStickers.length, 2);
console.log('  ✅ Check 5: CreateNewStickerSet array serialization verified');

// 6. Validation catches empty emoji_list, invalid format, or empty stickers array
assert.throws(() => {
  engine.validateInputSticker({
    sticker: 'file_id',
    format: 'invalid_format',
    emoji_list: ['🔥']
  });
}, /Invalid sticker format/);

assert.throws(() => {
  engine.validateInputSticker({
    sticker: 'file_id',
    format: 'static',
    emoji_list: []
  });
}, /at least 1 emoji/);

assert.throws(() => {
  engine.prepareCreateStickerSetPayload({
    user_id: 12345678,
    name: 'empty_pack',
    title: 'Empty',
    stickers: []
  });
}, /non-empty 'stickers' array/);
console.log('  ✅ Check 6: Boundary validation rules verified');

console.log('🎉 ALL 6 CHECKS PASSED SUCCESSFULLY!');
