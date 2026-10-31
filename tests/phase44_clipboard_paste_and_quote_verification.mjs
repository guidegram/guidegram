import assert from 'node:assert/strict';
import { ClipboardPasteAndQuoteReplyGovernor } from '../src/services/clipboardPasteAndQuoteReplyGovernor.ts';
import { nestedMarkdownShortcutConverter } from '../src/utils/nestedMarkdownShortcutConverter.ts';

console.log('🧪 Starting Phase 44 Clipboard Paste, Quote Reply & Nested Markdown Verification Suite...');

// 1. Sniff Clipboard Image / Bitmap (tdesktop #31476)
{
  console.log('  Testing clipboard image & bitmap detection...');
  const types = ['text/plain', 'image/png'];
  const sizes = { 'text/plain': 15, 'image/png': 204800 };
  const detected = ClipboardPasteAndQuoteReplyGovernor.inspectClipboardData(types, sizes);

  assert.strictEqual(detected.hasImage, true);
  assert.strictEqual(detected.mimeType, 'image/png');
  assert.strictEqual(detected.byteLength, 204800);
  assert.ok(detected.fileName.startsWith('pasted_image_'));
  assert.ok(detected.fileName.endsWith('.png'));

  // Negative test: plain text only
  const noImage = ClipboardPasteAndQuoteReplyGovernor.inspectClipboardData(['text/plain'], { 'text/plain': 10 });
  assert.strictEqual(noImage.hasImage, false);
  console.log('  ✅ Clipboard image detection verified');
}

// 2. Quote-Reply Payload with Full Quote Metadata for Bots (tdesktop #31487)
{
  console.log('  Testing quote-reply payload delivery...');
  const fullText = 'The quick brown fox jumps over the lazy dog and runs away.';
  const quoteSelection = 'fox jumps over';
  const payload = ClipboardPasteAndQuoteReplyGovernor.buildQuoteReplyPayload(1001, fullText, quoteSelection);

  assert.strictEqual(payload.replyToMsgId, 1001);
  assert.strictEqual(payload.quoteText, 'fox jumps over');
  assert.strictEqual(payload.quoteOffset, 16);
  assert.strictEqual(payload.quoteLength, 14);
  assert.strictEqual(payload.isCustomQuote, true);

  // Full message quote fallback
  const fallbackPayload = ClipboardPasteAndQuoteReplyGovernor.buildQuoteReplyPayload(1002, fullText);
  assert.strictEqual(fallbackPayload.replyToMsgId, 1002);
  assert.strictEqual(fallbackPayload.quoteText, fullText);
  assert.strictEqual(fallbackPayload.quoteOffset, 0);
  assert.strictEqual(fallbackPayload.isCustomQuote, false);
  console.log('  ✅ Quote-reply payload delivery verified');
}

// 3. Mixed Image and Video Album Grouping (tdesktop #31455)
{
  console.log('  Testing mixed image/video album grouping...');
  const items = [
    { type: 'photo', filePath: '/tmp/img1.jpg', byteSize: 500000 },
    { type: 'video', filePath: '/tmp/clip1.mp4', byteSize: 5000000 },
    { type: 'photo', filePath: '/tmp/img2.png', byteSize: 800000 }
  ];

  const grouped = ClipboardPasteAndQuoteReplyGovernor.groupMediaAlbum(items, 'album_unique_123');
  assert.strictEqual(grouped.length, 3);
  assert.strictEqual(grouped[0].groupedId, 'album_unique_123');
  assert.strictEqual(grouped[1].groupedId, 'album_unique_123');
  assert.strictEqual(grouped[2].groupedId, 'album_unique_123');
  assert.strictEqual(grouped[0].type, 'photo');
  assert.strictEqual(grouped[1].type, 'video');

  // Single item shouldn't be forced into an album
  const single = ClipboardPasteAndQuoteReplyGovernor.groupMediaAlbum([items[0]]);
  assert.strictEqual(single[0].groupedId, undefined);
  console.log('  ✅ Mixed media album grouping verified');
}

// 4. Pasted LaTeX Equation Parsing (tdesktop #31438)
{
  console.log('  Testing LaTeX equations auto-formatting...');
  const latexSource = 'Calculus formula $$f(x) = \\int_0^1 x^2 dx$$ and inline $E=mc^2$ equation.';
  const parsed = ClipboardPasteAndQuoteReplyGovernor.parsePastedLatex(latexSource);

  assert.strictEqual(parsed.latexBlockCount, 2);
  assert.ok(parsed.formattedText.includes('```latex\nf(x) = \\int_0^1 x^2 dx\n```'));
  assert.ok(parsed.formattedText.includes('`E=mc^2`'));
  console.log('  ✅ Pasted LaTeX equation formatting verified');
}

// 5. Enter Key Handling After Autocomplete Suggestions (kotatogram #474)
{
  console.log('  Testing Enter key dispatch in composer...');
  // Autocomplete menu is open and an item is highlighted -> select suggestion
  const selectAction = ClipboardPasteAndQuoteReplyGovernor.evaluateComposerKeyDown('Enter', false, true, true);
  assert.strictEqual(selectAction.action, 'select_autocomplete');
  assert.strictEqual(selectAction.shouldPreventDefault, true);

  // Autocomplete closed, normal Enter -> send message
  const sendAction = ClipboardPasteAndQuoteReplyGovernor.evaluateComposerKeyDown('Enter', false, false, false);
  assert.strictEqual(sendAction.action, 'send_message');
  assert.strictEqual(sendAction.shouldPreventDefault, true);

  // Shift+Enter -> newline
  const newlineAction = ClipboardPasteAndQuoteReplyGovernor.evaluateComposerKeyDown('Enter', true, false, false);
  assert.strictEqual(newlineAction.action, 'insert_newline');
  assert.strictEqual(newlineAction.shouldPreventDefault, false);
  console.log('  ✅ Enter key composer dispatch verified');
}

// 6. Nested Markdown Shortcut Expansion (tdesktop #31518)
{
  console.log('  Testing nested markdown shortcut expansions...');
  const resQuote = nestedMarkdownShortcutConverter.evaluateLineShortcut('> Important note');
  assert.strictEqual(resQuote.expanded, true);
  assert.strictEqual(resQuote.blockType, 'blockquote');
  assert.strictEqual(resQuote.remainingText, 'Important note');

  const resChecklist = nestedMarkdownShortcutConverter.evaluateLineShortcut('[ ] Todo item');
  assert.strictEqual(resChecklist.expanded, true);
  assert.strictEqual(resChecklist.blockType, 'checklist');
  assert.strictEqual(resChecklist.appliedPrefix, '☐ ');

  const resList = nestedMarkdownShortcutConverter.evaluateLineShortcut('- Item 1');
  assert.strictEqual(resList.expanded, true);
  assert.strictEqual(resList.blockType, 'bullet_list');
  assert.strictEqual(resList.appliedPrefix, '• ');

  const docLines = ['> Quote line', '- List line', 'Regular line'];
  const expandedDoc = nestedMarkdownShortcutConverter.expandDocumentBuffer(docLines, { containerType: 'toggle', depth: 1 });
  assert.strictEqual(expandedDoc[0], '> Quote line');
  assert.strictEqual(expandedDoc[1], '• List line');
  assert.strictEqual(expandedDoc[2], 'Regular line');
  console.log('  ✅ Nested markdown shortcuts expansion verified');
}

console.log('✨ All Phase 44 Verification Tests Passed 100% Successfully!');
