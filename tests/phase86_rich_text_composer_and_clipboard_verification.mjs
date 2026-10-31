import assert from 'node:assert';
import { RichTextComposerAndClipboardGovernor } from '../src/services/richTextComposerAndClipboardGovernor.ts';

console.log('🧪 Starting Phase 86 Rich Text Composer & Clipboard Verification Suite...');

const governor = new RichTextComposerAndClipboardGovernor();

// 1. Text Formatting & Markdown Links (TDesktop #2847, Kotatogram #325)
console.log('  Testing text formatting and markdown link generation...');
const base = 'Hello world from Guidegram';
const boldRes = governor.applyFormatting(base, { start: 0, end: 5 }, 'bold');
assert.strictEqual(boldRes.text, '**Hello** world from Guidegram');

const linkRes = governor.applyFormatting(base, { start: 17, end: 26 }, 'link', 'https://guidegram.org');
assert.strictEqual(linkRes.text, 'Hello world from [Guidegram](https://guidegram.org)');
console.log('  ✅ Text formatting and markdown links verified');

// 2. Multiline Blockquotes Formatting (morethanwords #453)
console.log('  Testing multiline blockquotes formatting...');
const multiline = 'Line 1\nLine 2\nLine 3';
const quoteRes = governor.applyFormatting(multiline, { start: 0, end: multiline.length }, 'quote');
assert.strictEqual(quoteRes.text, '> Line 1\n> Line 2\n> Line 3');
console.log('  ✅ Multiline blockquotes verified');

// 3. Clear Formatting (morethanwords #82)
console.log('  Testing clear all formatting...');
const formatted = 'Here is **bold**, __italic__, and [link](https://test.com)';
const clearRes = governor.clearFormatting(formatted, { start: 0, end: formatted.length });
assert.strictEqual(clearRes.text, 'Here is bold, italic, and link');
console.log('  ✅ Clear formatting verified');

// 4. HTML to Markdown Clipboard Conversion (Ajaxy #482)
console.log('  Testing clipboard HTML to markdown conversion...');
const htmlInput = '<p>Check <b>this</b> <a href="https://example.com">link</a> and <code>code</code>:</p><blockquote>First line<br>Second line</blockquote>';
const markdown = governor.parseHtmlToMarkdown(htmlInput);
assert.ok(markdown.includes('**this**'));
assert.ok(markdown.includes('[link](https://example.com)'));
assert.ok(markdown.includes('`code`'));
assert.ok(markdown.includes('> First line'));
assert.ok(markdown.includes('> Second line'));
console.log('  ✅ HTML to markdown clipboard conversion verified');

// 5. Undo / Redo Buffer (Ajaxy #367)
console.log('  Testing undo / redo buffer...');
governor.reset();
governor.pushState('First draft');
governor.pushState('Second draft with paste');
assert.strictEqual(governor.undo()?.text, 'First draft');
assert.strictEqual(governor.redo()?.text, 'Second draft with paste');
console.log('  ✅ Undo / redo buffer verified');

// 6. Zero-Length Backspace Bounds Guard (Ajaxy #363)
console.log('  Testing zero-length backspace crash guard...');
const emptyBackspace = governor.handleBackspace('', 0);
assert.strictEqual(emptyBackspace.changed, false);
assert.strictEqual(emptyBackspace.text, '');
assert.strictEqual(emptyBackspace.newCursorPos, 0);

// Non-empty backspace
const normalBackspace = governor.handleBackspace('AB', 2);
assert.strictEqual(normalBackspace.changed, true);
assert.strictEqual(normalBackspace.text, 'A');
assert.strictEqual(normalBackspace.newCursorPos, 1);
console.log('  ✅ Zero-length backspace crash guard verified');

// 7. Compose-key NFC Normalization (morethanwords #367)
console.log('  Testing compose-key NFC normalization...');
// Decomposed 'e' + combining acute accent -> NFC 'é'
const decomposed = 'e\u0301';
const normalized = governor.normalizeCompositionText(decomposed);
assert.strictEqual(normalized, 'é');
assert.strictEqual(normalized.length, 1);
console.log('  ✅ Compose-key NFC normalization verified');

console.log('✨ All Phase 86 Verification Tests Passed 100% Successfully!');
