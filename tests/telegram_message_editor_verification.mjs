import assert from 'node:assert';
import {
  determineEditMode,
  getMaxAllowedLength,
  canEditMessage,
  validateEditRequest
} from '../src/utils/telegramMessageEditor.ts';

console.log('🧪 Running Telegram Message Editor Verification (Phase 160)...');

let passed = 0;
const now = 1700000000;

// 1. determineEditMode
assert.strictEqual(determineEditMode({ id: 1, date: now, text: 'Hello' }), 'text');
assert.strictEqual(determineEditMode({ id: 2, date: now, mediaType: 'photo' }), 'caption');
assert.strictEqual(determineEditMode({ id: 3, date: now, mediaType: 'video' }), 'caption');
assert.strictEqual(determineEditMode({ id: 4, date: now, mediaType: 'document' }), 'caption');
assert.strictEqual(determineEditMode({ id: 5, date: now, mediaType: 'photo' }, true), 'media');
console.log('✅ Check 1: Edit mode classification passed');
passed++;

// 2. Length limits
assert.strictEqual(getMaxAllowedLength('text'), 4096);
assert.strictEqual(getMaxAllowedLength('caption'), 1024);
console.log('✅ Check 2: Max allowed length bounds passed');
passed++;

// 3. 48-Hour edit window
// Fresh message (1 hour old)
assert.strictEqual(canEditMessage({ id: 1, date: now - 3600, isOutgoing: true }, false, now), true);
// Expired message (50 hours old)
assert.strictEqual(canEditMessage({ id: 2, date: now - 50 * 3600, isOutgoing: true }, false, now), false);
// Channel message 50 hours old -> Allowed
assert.strictEqual(canEditMessage({ id: 3, date: now - 50 * 3600, isOutgoing: true, isChannel: true }, false, now), true);
// Saved message 100 hours old -> Allowed
assert.strictEqual(canEditMessage({ id: 4, date: now - 100 * 3600, isOutgoing: true, isSavedMessages: true }, false, now), true);
// Incoming non-admin message -> Disallowed
assert.strictEqual(canEditMessage({ id: 5, date: now - 3600, isOutgoing: false }, false, now), false);
console.log('✅ Check 3: 48-hour Telegram edit window invariant passed');
passed++;

// 4. Reject identical text (MESSAGE_NOT_MODIFIED)
const resIdentical = validateEditRequest(
  { id: 1, date: now - 100, text: 'Same text', isOutgoing: true },
  'Same text',
  { currentTimeSec: now }
);
assert.strictEqual(resIdentical.valid, false);
assert.match(resIdentical.error, /MESSAGE_NOT_MODIFIED/);
console.log('✅ Check 4: Idempotency MESSAGE_NOT_MODIFIED rejection passed');
passed++;

// 5. Reject caption length overflow (> 1024 chars)
const longCaption = 'A'.repeat(1025);
const resCapOverflow = validateEditRequest(
  { id: 1, date: now - 100, mediaType: 'photo', text: 'Old', isOutgoing: true },
  longCaption,
  { currentTimeSec: now }
);
assert.strictEqual(resCapOverflow.valid, false);
assert.match(resCapOverflow.error, /Media caption exceeds Telegram limit of 1024/);
console.log('✅ Check 5: Media caption 1024-character clamp passed');
passed++;

// 6. Valid text message edit
const resValidText = validateEditRequest(
  { id: 1, date: now - 100, text: 'Old text', isOutgoing: true },
  'New updated text',
  { currentTimeSec: now }
);
assert.strictEqual(resValidText.valid, true);
assert.strictEqual(resValidText.mode, 'text');
assert.strictEqual(resValidText.normalizedText, 'New updated text');
console.log('✅ Check 6: Valid text message edit passed');
passed++;

// 7. Valid media caption edit
const resValidCap = validateEditRequest(
  { id: 2, date: now - 100, mediaType: 'video', text: 'Old caption', isOutgoing: true },
  'Fresh new caption',
  { currentTimeSec: now }
);
assert.strictEqual(resValidCap.valid, true);
assert.strictEqual(resValidCap.mode, 'caption');
assert.strictEqual(resValidCap.normalizedText, 'Fresh new caption');
console.log('✅ Check 7: Valid media caption edit passed');
passed++;

console.log(`\n🎉 ALL ${passed}/7 CHECKS PASSED FOR TELEGRAM MESSAGE EDITOR!`);
