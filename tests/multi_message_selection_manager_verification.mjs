/**
 * Multi-Message Selection Manager Verification Suite
 */

import { MultiMessageSelectionManager } from '../dist-test-select/multiMessageSelectionManager.js';
import assert from 'node:assert';

console.log('--- Starting Multi-Message Selection Manager Verification ---');

const manager = new MultiMessageSelectionManager({ retainSelectionOnCopy: true });

const messages = [
  { id: 10, date: 1700000010, senderName: 'Alice', text: 'First point' },
  { id: 20, date: 1700000020, senderName: 'Bob', text: 'Second point' },
  { id: 30, date: 1700000030, senderName: 'Alice', text: 'Third point' },
  { id: 40, date: 1700000040, senderName: 'Charlie', text: 'Fourth point' },
];

// 1. Toggle selection
manager.toggleMessage(10);
manager.toggleMessage(30);
assert.strictEqual(manager.getSelectedCount(), 2, 'Must have 2 selected messages');
assert.strictEqual(manager.isSelected(10), true);
assert.strictEqual(manager.isSelected(30), true);
assert.strictEqual(manager.isSelected(20), false);
console.log('✅ Check 1 Passed: Individual message toggling verified.');

// 2. Format and Copy with Selection Retention (The TDesktop #31505 fix)
const copyResult = manager.formatAndCopySelected(messages, { includeSender: true });
assert.strictEqual(copyResult.copiedCount, 2, 'Must copy 2 messages');
assert.strictEqual(copyResult.selectionRetained, true, 'Selection MUST be retained after copying');
assert.strictEqual(manager.getSelectedCount(), 2, 'Manager selection count must remain 2 after copy');
assert.ok(copyResult.formattedText.includes('[Alice]\nFirst point'), 'Transcript must include formatted Alice message');
assert.ok(copyResult.formattedText.includes('[Alice]\nThird point'), 'Transcript must include formatted second Alice message');
console.log('✅ Check 2 Passed: Copying messages preserves selection state without wiping it.');

// 3. Chronological sorting verification
// Select out-of-order
manager.clear();
manager.toggleMessage(40);
manager.toggleMessage(20);
manager.toggleMessage(10);

const orderedCopy = manager.formatAndCopySelected(messages, { includeSender: false });
const expectedText = 'First point\n\nSecond point\n\nFourth point';
assert.strictEqual(orderedCopy.formattedText, expectedText, 'Messages must be sorted in ascending timeline order');
console.log('✅ Check 3 Passed: Messages formatted in strict chronological order regardless of selection sequence.');

// 4. Range selection (Shift+Click)
manager.clear();
const rangeIds = manager.selectRange(20, 40, messages);
assert.strictEqual(rangeIds.length, 3, 'Range from 20 to 40 must select 3 messages (20, 30, 40)');
assert.strictEqual(manager.isSelected(20), true);
assert.strictEqual(manager.isSelected(30), true);
assert.strictEqual(manager.isSelected(40), true);
assert.strictEqual(manager.isSelected(10), false);
console.log('✅ Check 4 Passed: Range selection selects contiguous message block.');

// 5. Explicit clear (Esc / cancel button)
manager.clear();
assert.strictEqual(manager.getSelectedCount(), 0, 'Clear must empty selection');
console.log('✅ Check 5 Passed: Explicit clear empties selection.');

console.log('🎉 ALL 5 MULTI-MESSAGE SELECTION CHECKS PASSED!');
