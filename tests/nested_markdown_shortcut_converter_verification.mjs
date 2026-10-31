/**
 * Nested Markdown Shortcut Converter Verification Suite
 * Verifies shortcut evaluation and expansion in toggles and blockquotes (TDesktop #31518)
 */

import { NestedMarkdownShortcutConverter } from '../dist-test-shortcut/nestedMarkdownShortcutConverter.js';
import assert from 'node:assert';

console.log('--- Starting Nested Markdown Shortcut Converter Verification ---');

const converter = new NestedMarkdownShortcutConverter();

// 1. Blockquote shortcut ('> ') inside toggle context
const toggleContext = { containerType: 'toggle', depth: 1 };
const res1 = converter.evaluateLineShortcut('> Quote inside toggle', toggleContext);
assert.strictEqual(res1.expanded, true, 'Should expand > shortcut');
assert.strictEqual(res1.blockType, 'blockquote', 'Should be blockquote');
assert.strictEqual(res1.remainingText, 'Quote inside toggle');
assert.strictEqual(res1.appliedPrefix, '> ');
console.log('✅ Check 1 Passed: Blockquote shortcut expanded in toggle context.');

// 2. Checklist / Task shortcut ('[] ' and '[ ] ')
const res2a = converter.evaluateLineShortcut('[] Todo item 1', toggleContext);
assert.strictEqual(res2a.expanded, true);
assert.strictEqual(res2a.blockType, 'checklist');
assert.strictEqual(res2a.appliedPrefix, '☐ ');
assert.strictEqual(res2a.remainingText, 'Todo item 1');

const res2b = converter.evaluateLineShortcut('[ ] Todo item 2', toggleContext);
assert.strictEqual(res2b.expanded, true);
assert.strictEqual(res2b.blockType, 'checklist');
assert.strictEqual(res2b.appliedPrefix, '☐ ');
assert.strictEqual(res2b.remainingText, 'Todo item 2');
console.log('✅ Check 2 Passed: Checklist shortcuts expanded with unicode checkmark box.');

// 3. Bullet list ('- ' or '* ')
const res3 = converter.evaluateLineShortcut('- Bullet item', toggleContext);
assert.strictEqual(res3.expanded, true);
assert.strictEqual(res3.blockType, 'bullet_list');
assert.strictEqual(res3.appliedPrefix, '• ');
assert.strictEqual(res3.remainingText, 'Bullet item');
console.log('✅ Check 3 Passed: Bullet list shortcuts expanded.');

// 4. Code block ('```')
const res4 = converter.evaluateLineShortcut('```typescript', toggleContext);
assert.strictEqual(res4.expanded, true);
assert.strictEqual(res4.blockType, 'code_block');
assert.strictEqual(res4.prefixRemoved, '```');
assert.strictEqual(res4.remainingText, 'typescript');
console.log('✅ Check 4 Passed: Code block shortcut expanded.');

// 5. Ordered list ('1. ')
const res5 = converter.evaluateLineShortcut('1. First item', toggleContext);
assert.strictEqual(res5.expanded, true);
assert.strictEqual(res5.blockType, 'ordered_list');
assert.strictEqual(res5.appliedPrefix, '1. ');
assert.strictEqual(res5.remainingText, 'First item');
console.log('✅ Check 5 Passed: Ordered list shortcut expanded.');

// 6. Regular text does NOT expand
const res6 = converter.evaluateLineShortcut('Just plain text', toggleContext);
assert.strictEqual(res6.expanded, false);
assert.strictEqual(res6.blockType, 'paragraph');
assert.strictEqual(res6.remainingText, 'Just plain text');
console.log('✅ Check 6 Passed: Plain text retained without expansion.');

// 7. Full document buffer expansion inside nested toggle
const buffer = [
  '# Header',
  '> Nested quote in toggle',
  '[] Actionable task',
  '- Bullet point',
  'Normal line'
];
const expandedBuffer = converter.expandDocumentBuffer(buffer, toggleContext);
assert.deepStrictEqual(expandedBuffer, [
  '# Header',
  '> Nested quote in toggle',
  '☐ Actionable task',
  '• Bullet point',
  'Normal line'
]);
console.log('✅ Check 7 Passed: Document buffer successfully expanded in nested container.');

console.log('🎉 ALL 7 NESTED MARKDOWN SHORTCUT CONVERTER CHECKS PASSED!');
