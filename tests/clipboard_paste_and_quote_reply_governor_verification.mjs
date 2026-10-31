/**
 * Clipboard Paste and Quote Reply Governor Verification Suite
 */

import { ClipboardPasteAndQuoteReplyGovernor } from '../dist-test-clip/clipboardPasteAndQuoteReplyGovernor.js';
import assert from 'node:assert';

console.log('--- Starting Clipboard Paste and Quote Reply Governor Verification ---');

// 1. inspectClipboardData
const imgData = ClipboardPasteAndQuoteReplyGovernor.inspectClipboardData(
  ['text/plain', 'image/png'],
  { 'image/png': 12040 }
);
assert.strictEqual(imgData.hasImage, true);
assert.strictEqual(imgData.mimeType, 'image/png');
assert.strictEqual(imgData.byteLength, 12040);
assert.ok(imgData.fileName?.endsWith('.png'));

const noImg = ClipboardPasteAndQuoteReplyGovernor.inspectClipboardData(['text/plain'], {});
assert.strictEqual(noImg.hasImage, false);
console.log('✅ Check 1 Passed: Clipboard image inspection works cleanly.');

// 2. buildQuoteReplyPayload
const quote1 = ClipboardPasteAndQuoteReplyGovernor.buildQuoteReplyPayload(
  42,
  'Hello world this is a test quote',
  'world this'
);
assert.strictEqual(quote1.replyToMsgId, 42);
assert.strictEqual(quote1.quoteText, 'world this');
assert.strictEqual(quote1.quoteOffset, 6);
assert.strictEqual(quote1.quoteLength, 10);
assert.strictEqual(quote1.isCustomQuote, true);

const quoteDefault = ClipboardPasteAndQuoteReplyGovernor.buildQuoteReplyPayload(
  42,
  'Full message'
);
assert.strictEqual(quoteDefault.isCustomQuote, false);
assert.strictEqual(quoteDefault.quoteText, 'Full message');
console.log('✅ Check 2 Passed: Quote reply payload formatting verified.');

// 3. groupMediaAlbum
const items = [
  { type: 'photo', filePath: '/path/1.jpg', byteSize: 100 },
  { type: 'video', filePath: '/path/2.mp4', byteSize: 200 }
];
const grouped = ClipboardPasteAndQuoteReplyGovernor.groupMediaAlbum(items);
assert.strictEqual(grouped.length, 2);
assert.ok(grouped[0].groupedId);
assert.strictEqual(grouped[0].groupedId, grouped[1].groupedId);

// Single item returns clone without mandatory groupedId
const single = ClipboardPasteAndQuoteReplyGovernor.groupMediaAlbum([items[0]]);
assert.strictEqual(single.length, 1);
console.log('✅ Check 3 Passed: Media album grouping verified.');

// 4. parsePastedLatex
const latex = ClipboardPasteAndQuoteReplyGovernor.parsePastedLatex(
  'Here is inline $E=mc^2$ and block $$\\int_0^1 x dx$$ math.'
);
assert.strictEqual(latex.latexBlockCount, 2);
assert.ok(latex.formattedText.includes('`E=mc^2`'));
assert.ok(latex.formattedText.includes('```latex\n\\int_0^1 x dx\n```'));
console.log('✅ Check 4 Passed: LaTeX equation parsing verified.');

// 5. evaluateComposerKeyDown
const enterWithAuto = ClipboardPasteAndQuoteReplyGovernor.evaluateComposerKeyDown('Enter', false, true, true);
assert.strictEqual(enterWithAuto.action, 'select_autocomplete');
assert.strictEqual(enterWithAuto.shouldPreventDefault, true);

const enterNormal = ClipboardPasteAndQuoteReplyGovernor.evaluateComposerKeyDown('Enter', false, false, false);
assert.strictEqual(enterNormal.action, 'send_message');
assert.strictEqual(enterNormal.shouldPreventDefault, true);

const shiftEnter = ClipboardPasteAndQuoteReplyGovernor.evaluateComposerKeyDown('Enter', true, false, false);
assert.strictEqual(shiftEnter.action, 'insert_newline');
assert.strictEqual(shiftEnter.shouldPreventDefault, false);
console.log('✅ Check 5 Passed: Keyboard event dispatching verified.');

console.log('🎉 ALL 5 CLIPBOARD PASTE & QUOTE REPLY GOVERNOR CHECKS PASSED!');
