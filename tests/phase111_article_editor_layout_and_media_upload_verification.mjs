import assert from 'node:assert';
import {
  ArticleEditorHeaderIndicator,
  ArticleToggleBlockGovernor,
  NestedChecklistToggleSerializer,
  MiniAppMediaUploadPreserver,
  MessageBubbleHeaderLayoutGovernor,
  CallParticipantTypographyGovernor,
  ChannelRssFeedGenerator,
  ArticleEditorLayoutAndMediaUploadGovernor
} from '../src/services/articleEditorLayoutAndMediaUploadGovernor.ts';

console.log('--- STARTING PHASE 111 VERIFICATION TEST SUITE ---');

// 1. ArticleEditorHeaderIndicator tests (telegramdesktop/tdesktop#31519)
console.log('Test 1: ArticleEditorHeaderIndicator focus size and breadcrumb');
const headerInd = new ArticleEditorHeaderIndicator();
const h1Info = headerInd.getHeaderFocusInfo(1);
assert.strictEqual(h1Info.fontSizePt, 28);
assert.strictEqual(h1Info.breadcrumbLabel, 'Title (H1)');

const h3Info = headerInd.getHeaderFocusInfo(3);
assert.strictEqual(h3Info.fontSizePt, 18);
assert.strictEqual(h3Info.breadcrumbLabel, 'Subheader (H3)');

// 2. ArticleToggleBlockGovernor tests (telegramdesktop/tdesktop#31499)
console.log('Test 2: ArticleToggleBlockGovernor prevent collapse on content edit');
const toggleGov = new ArticleToggleBlockGovernor();
const t1 = toggleGov.registerToggle('toggle_1', 'Click to expand summary', 'Hidden article secret details');
assert.strictEqual(t1.isCollapsed, false);

// Normal click on summary toggles collapse
const collapsed = toggleGov.handleToggleClick('toggle_1', 'summary');
assert.strictEqual(collapsed, true);

// Set editing mode active
toggleGov.setEditing('toggle_1', true);
assert.strictEqual(toggleGov.getToggle('toggle_1')?.isCollapsed, false, 'Should auto-expand when editing is initiated');

// Clicking inside content_editor must NEVER collapse toggle!
const stateAfterContentClick = toggleGov.handleToggleClick('toggle_1', 'content_editor');
assert.strictEqual(stateAfterContentClick, false, 'Must not collapse when clicking inside content editor');

// Clicking summary while editing must NOT collapse
const stateAfterSummaryClick = toggleGov.handleToggleClick('toggle_1', 'summary');
assert.strictEqual(stateAfterSummaryClick, false, 'Must not collapse on summary click while editing');

// Only explicit chevron click collapses while editing
const stateAfterChevronClick = toggleGov.handleToggleClick('toggle_1', 'chevron');
assert.strictEqual(stateAfterChevronClick, true);

// 3. NestedChecklistToggleSerializer tests (telegramdesktop/tdesktop#31452)
console.log('Test 3: NestedChecklistToggleSerializer lossless AST & safe markdown export');
const serializer = new NestedChecklistToggleSerializer();
const nodes = [
  { type: 'paragraph', text: 'Introduction to roadmap:' },
  {
    type: 'checklist',
    items: [
      {
        text: 'Milestone 1',
        checked: true,
        children: [
          {
            type: 'toggle',
            summary: 'Details of Milestone 1',
            children: [{ type: 'paragraph', text: 'All tasks completed on time.' }]
          }
        ]
      },
      { text: 'Milestone 2', checked: false }
    ]
  }
];

const astJson = serializer.serializeToAst(nodes);
const deserialized = serializer.deserializeFromAst(astJson);
assert.deepStrictEqual(deserialized, nodes, 'AST JSON round-trip must be 100% lossless');

const mdExport = serializer.exportSafeMarkdown(nodes);
assert(mdExport.includes('<details><summary>Details of Milestone 1</summary>'), 'Should preserve toggle blocks using details tags instead of flattening');
assert(mdExport.includes('- [x] Milestone 1'));

// 4. MiniAppMediaUploadPreserver tests (telegramdesktop/tdesktop#31444)
console.log('Test 4: MiniAppMediaUploadPreserver GIF animation preservation');
const uploadPreserver = new MiniAppMediaUploadPreserver();
// GIF89a magic bytes: 0x47 0x49 0x46 0x38 0x39 0x61
const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x10, 0x00, 0x10]);
const preservedResult = uploadPreserver.detectAndPreserveGif({
  filename: 'bot_avatar.gif',
  bytes: gifBytes,
  declaredMimeType: 'image/gif'
});
assert.strictEqual(preservedResult.isAnimatedGif, true);
assert.strictEqual(preservedResult.finalMimeType, 'image/gif');
assert.strictEqual(preservedResult.shouldTranscodeToStatic, false, 'Must preserve animated frames for Mini App avatar/description');

const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
const nonGifResult = uploadPreserver.detectAndPreserveGif({
  filename: 'photo.jpg',
  bytes: jpegBytes,
  declaredMimeType: 'image/jpeg'
});
assert.strictEqual(nonGifResult.isAnimatedGif, false);

// 5. MessageBubbleHeaderLayoutGovernor tests (telegramdesktop/tdesktop#31399)
console.log('Test 5: MessageBubbleHeaderLayoutGovernor badge overlap prevention');
const bubbleGov = new MessageBubbleHeaderLayoutGovernor();

// Wide attachment (300px): inline layout
const inlineLayout = bubbleGov.computeHeaderLayout({
  senderName: 'John Doe',
  senderNameWidthPx: 70,
  roleBadgeText: 'Admin',
  roleBadgeWidthPx: 45,
  attachmentWidthPx: 300,
  bubblePaddingPx: 8
});
assert.strictEqual(inlineLayout.layoutMode, 'inline');
assert.strictEqual(inlineLayout.requiresBadgeWrap, false);

// Narrow attachment (100px): stacked layout to prevent badge overlapping sender name
const stackedLayout = bubbleGov.computeHeaderLayout({
  senderName: 'Long Username Admin',
  senderNameWidthPx: 95,
  roleBadgeText: 'Founder',
  roleBadgeWidthPx: 50,
  attachmentWidthPx: 100,
  bubblePaddingPx: 8
});
assert.strictEqual(stackedLayout.layoutMode, 'stacked', 'Must stack header above narrow image to avoid overlap');
assert.strictEqual(stackedLayout.requiresBadgeWrap, true);

// 6. CallParticipantTypographyGovernor tests (telegramdesktop/tdesktop#31264)
console.log('Test 6: CallParticipantTypographyGovernor descender clipping prevention');
const callGov = new CallParticipantTypographyGovernor();

assert.strictEqual(callGov.detectDescenders('Gregory'), true); // has 'g', 'y'
assert.strictEqual(callGov.detectDescenders('ALICE'), false);

const withDescenderBox = callGov.computeCardBoundingBox({
  fontSizePx: 14,
  fontFamily: 'Inter',
  hasDescenders: true
});
assert.strictEqual(withDescenderBox.bottomPaddingPx, 6, 'Guaranteed bottom clearance for descenders');

const withoutDescenderBox = callGov.computeCardBoundingBox({
  fontSizePx: 14,
  fontFamily: 'Inter',
  hasDescenders: false
});
assert.strictEqual(withoutDescenderBox.bottomPaddingPx, 2);

// 7. ChannelRssFeedGenerator tests (telegramdesktop/tdesktop#1640)
console.log('Test 7: ChannelRssFeedGenerator public channel RSS/Atom feed conversion');
const rssGen = new ChannelRssFeedGenerator();
const rssXml = rssGen.generateRss2Feed(
  {
    channelUsername: 'guidegram_news',
    channelTitle: 'Guidegram Official News',
    channelDescription: 'Official announcements and release notes',
    channelUrl: 'https://t.me/guidegram_news'
  },
  [
    {
      id: '101',
      title: 'Guidegram v2.4 Released',
      text: 'Exciting new features with call quality resilience and RSS support.',
      date: new Date('2026-10-31T12:00:00Z'),
      mediaUrl: 'https://cdn.guidegram.org/news/101.jpg',
      mediaMimeType: 'image/jpeg',
      mediaLengthBytes: 154200
    }
  ]
);

assert(rssXml.includes('<rss version="2.0">'));
assert(rssXml.includes('<title>Guidegram v2.4 Released</title>'));
assert(rssXml.includes('<enclosure url="https://cdn.guidegram.org/news/101.jpg" type="image/jpeg" length="154200" />'));

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new ArticleEditorLayoutAndMediaUploadGovernor();
assert(masterGov.headerIndicator instanceof ArticleEditorHeaderIndicator);
assert(masterGov.toggleGovernor instanceof ArticleToggleBlockGovernor);
assert(masterGov.astSerializer instanceof NestedChecklistToggleSerializer);
assert(masterGov.uploadPreserver instanceof MiniAppMediaUploadPreserver);
assert(masterGov.bubbleLayout instanceof MessageBubbleHeaderLayoutGovernor);
assert(masterGov.callTypography instanceof CallParticipantTypographyGovernor);
assert(masterGov.rssGenerator instanceof ChannelRssFeedGenerator);

console.log('--- ALL PHASE 111 VERIFICATION TESTS PASSED (100%) ---');
