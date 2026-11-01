import assert from 'node:assert/strict';
import {
  DesktopAdaptiveLayoutGovernor,
  GroupStickerSuppressorGovernor,
  MonospaceClickToCopyGovernor,
  ForwardedMessageDateGovernor,
  TimestampGranularityGovernor,
  MarkdownTableRendererGovernor,
  PerChatAntiRecallGovernor
} from '../src/services/ayugramLayoutStickerTableAndRecallGovernor.ts';

console.log('🧪 Starting Phase 168 Verification: AyuGram Desktop Features & Hardening...');

// -------------------------------------------------------------
// Test 1: DesktopAdaptiveLayoutGovernor (Resolves #484)
// -------------------------------------------------------------
console.log('  Testing #484: Adaptive Layout DPI Breakpoint & Element Reachability...');
const layoutGov = new DesktopAdaptiveLayoutGovernor();

const bpCompact = layoutGov.computeBreakpoint(600, 1.0);
assert.equal(bpCompact.layoutMode, 'compact');

const bpWideHiDpi = layoutGov.computeBreakpoint(1920, 1.5);
// 1920 / 1.5 = 1280 (wide)
assert.equal(bpWideHiDpi.layoutMode, 'wide');

// Element reachable test: element at 750px with viewport 500px and current scroll 0 -> not visible, requires scroll
const bounds = layoutGov.ensureElementReachable(750, 40, 500, 0);
assert.equal(bounds.isVisible, false);
assert.equal(bounds.requiredScrollOffsetPx, 500); // 750 - 250 = 500

// When scrolled to 600px, element is visible
const boundsScrolled = layoutGov.ensureElementReachable(750, 40, 500, 600);
assert.equal(boundsScrolled.isVisible, true);
console.log('  ✅ #484 Verified: Adaptive layout DPI scaling and element reachability validated.');

// -------------------------------------------------------------
// Test 2: GroupStickerSuppressorGovernor (Resolves #481)
// -------------------------------------------------------------
console.log('  Testing #481: Group Sticker Pack Hiding & Auto-Suggest Filtering...');
const stickerGov = new GroupStickerSuppressorGovernor();

const sampleStickers = [
  { id: 's1', setId: 'general_pack', isGroupSpecific: false, emoji: '🔥', thumbnailUrl: 't1' },
  { id: 's2', setId: 'channel_pack', isGroupSpecific: true, owningChatId: 'chat_100', emoji: '🎉', thumbnailUrl: 't2' },
  { id: 's3', setId: 'other_channel_pack', isGroupSpecific: true, owningChatId: 'chat_200', emoji: '🚀', thumbnailUrl: 't3' }
];

// Without hiding, all 3 are returned
const allStickers = stickerGov.filterStickerSuggestions(sampleStickers, 'chat_100');
assert.equal(allStickers.length, 3);

// Hide group stickers for chat_100
stickerGov.setChatGroupStickersHidden('chat_100', true);
const filtered = stickerGov.filterStickerSuggestions(sampleStickers, 'chat_100');
assert.equal(filtered.length, 2);
assert.equal(filtered.find(s => s.id === 's2'), undefined, 's2 from chat_100 must be hidden');
assert.ok(filtered.find(s => s.id === 's1'));
assert.ok(filtered.find(s => s.id === 's3'));
console.log('  ✅ #481 Verified: Group stickers cleanly suppressed in chat.');

// -------------------------------------------------------------
// Test 3: MonospaceClickToCopyGovernor (Resolves #471)
// -------------------------------------------------------------
console.log('  Testing #471: Monospace Code Block Click-to-Copy...');
const monoGov = new MonospaceClickToCopyGovernor();

const copyResult = monoGov.attachClickToCopy({
  blockId: 'code_block_99',
  rawText: '  const token = "GUIDEGRAM_AUTH_2026"; \n',
  language: 'typescript'
});

assert.equal(copyResult.blockId, 'code_block_99');
assert.equal(copyResult.copiedText, 'const token = "GUIDEGRAM_AUTH_2026";');
assert.equal(copyResult.consumedEvent, true);
assert.ok(copyResult.toastMessage.includes('Copied'));
console.log('  ✅ #471 Verified: Monospace click-to-copy extracts trimmed text and emits toast.');

// -------------------------------------------------------------
// Test 4: ForwardedMessageDateGovernor (Resolves #456)
// -------------------------------------------------------------
console.log('  Testing #456: Forwarded Message Header Original Date Rendering...');
const forwardGov = new ForwardedMessageDateGovernor();

// Timestamp for 2026-10-31 15:30:00 UTC
const ts = 1793460600;
const header = forwardGov.formatForwardHeader({
  senderName: 'Alice',
  originalDateTimestamp: ts,
  includeOriginalDate: true
});

assert.equal(header.senderName, 'Alice');
assert.ok(header.fullHeaderText.includes('Forwarded from Alice • 2026-10-31 15:30 UTC'));
console.log('  ✅ #456 Verified: Forwarded message header displays original posting date and time.');

// -------------------------------------------------------------
// Test 5: TimestampGranularityGovernor (Resolves #439)
// -------------------------------------------------------------
console.log('  Testing #439: Message Timestamp Seconds Granularity...');
const timeGov = new TimestampGranularityGovernor();

// Date: 2026-11-01 05:22:45 UTC
const testDateMs = Date.UTC(2026, 10, 1, 5, 22, 45);

const standardFormat = timeGov.formatMessageTimestamp(testDateMs, false);
assert.equal(standardFormat, '05:22');

const detailedFormat = timeGov.formatMessageTimestamp(testDateMs, true);
assert.equal(detailedFormat, '05:22:45');
console.log('  ✅ #439 Verified: Message timestamp seconds toggle formatting correctly.');

// -------------------------------------------------------------
// Test 6: MarkdownTableRendererGovernor (Resolves #425)
// -------------------------------------------------------------
console.log('  Testing #425: Markdown Table Parsing & Formatting...');
const tableGov = new MarkdownTableRendererGovernor();

const markdownText = `
| Asset | Price | Trend |
|:---|:---:|---:|
| TON | $5.20 | +4.2% |
| BTC | $95,000 | +1.8% |
| ETH | $3,500 | -0.5% |
`;

const parsed = tableGov.parseMarkdownTable(markdownText);
assert.notEqual(parsed, null);
assert.equal(parsed.columnCount, 3);
assert.equal(parsed.headers[0].text, 'Asset');
assert.equal(parsed.headers[0].alignment, 'left');
assert.equal(parsed.headers[1].text, 'Price');
assert.equal(parsed.headers[1].alignment, 'center');
assert.equal(parsed.headers[2].text, 'Trend');
assert.equal(parsed.headers[2].alignment, 'right');

assert.equal(parsed.rows.length, 3);
assert.equal(parsed.rows[0][0].text, 'TON');
assert.equal(parsed.rows[0][1].text, '$5.20');
assert.equal(parsed.rows[0][2].text, '+4.2%');
console.log('  ✅ #425 Verified: Markdown tables parsed with column alignments and structured cells.');

// -------------------------------------------------------------
// Test 7: PerChatAntiRecallGovernor (Resolves #412)
// -------------------------------------------------------------
console.log('  Testing #412: Per-Chat Anti-Recall Overrides...');
const recallGov = new PerChatAntiRecallGovernor();

// By default, global is true -> retained
assert.equal(recallGov.shouldRetainDeletedMessage('chat_a', false, true), true);

// Override chat_a to 'respect_deletion' (e.g. sensitive private chat)
recallGov.setPerChatRecallRule('chat_a', 'respect_deletion');
assert.equal(recallGov.shouldRetainDeletedMessage('chat_a', false, true), false);
assert.equal(recallGov.shouldRetainDeletedMessage('chat_a', true, true), false);

// Override chat_b to 'save_media_only'
recallGov.setPerChatRecallRule('chat_b', 'save_media_only');
assert.equal(recallGov.shouldRetainDeletedMessage('chat_b', false, true), false); // text deleted -> discarded
assert.equal(recallGov.shouldRetainDeletedMessage('chat_b', true, false), true); // media deleted -> saved even if global is false

// Override chat_c to 'save_all'
recallGov.setPerChatRecallRule('chat_c', 'save_all');
assert.equal(recallGov.shouldRetainDeletedMessage('chat_c', false, false), true);
console.log('  ✅ #412 Verified: Per-chat anti-recall rules take precedence over global settings.');

console.log('\n🎉 ALL 7 AYUGRAM DESKTOP HARDENING TESTS PASSED WITH 100% SUCCESS!');
