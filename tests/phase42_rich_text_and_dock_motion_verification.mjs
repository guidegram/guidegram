import assert from 'node:assert/strict';
import { RichTextFormattingAndDockMotionGovernor } from '../src/services/richTextFormattingAndDockMotionGovernor.ts';

console.log('🧪 Starting Phase 42 Rich Text Formatting & Dock Motion Verification Suite...');

// 1. Markdown Parsing to Message Entities & CJK Characters (tdesktop #330, #7775, #2128)
{
  console.log('  Testing Markdown parsing to Telegram MessageEntities...');
  const md = 'Hello **World** and **你好世界** with `codeBlock`';
  const parsed = RichTextFormattingAndDockMotionGovernor.parseMarkdownToEntities(md);

  assert.strictEqual(parsed.plainText, 'Hello World and 你好世界 with codeBlock');
  assert.strictEqual(parsed.entities.length, 3);
  assert.strictEqual(parsed.entities[0].type, 'bold');
  assert.strictEqual(parsed.entities[1].type, 'bold');
  assert.strictEqual(parsed.entities[2].type, 'code');
  assert.ok(parsed.htmlOutput.includes('<strong>你好世界</strong>'));
  assert.ok(parsed.htmlOutput.includes('<code>codeBlock</code>'));
  console.log('  ✅ Markdown parsing passed');
}

// 2. Dock Icon Bounce Policy (tdesktop #897)
{
  console.log('  Testing dock bounce suppression policy...');
  // Disabled by user preference
  const disabled = RichTextFormattingAndDockMotionGovernor.evaluateDockBounce({
    disableDockBounce: true,
    isUrgentMessage: false,
    isWindowFocused: false
  });
  assert.strictEqual(disabled.shouldBounceOnce, false);
  assert.strictEqual(disabled.shouldBounceCritical, false);

  // Normal bounce when unfocused
  const normal = RichTextFormattingAndDockMotionGovernor.evaluateDockBounce({
    disableDockBounce: false,
    isUrgentMessage: false,
    isWindowFocused: false
  });
  assert.strictEqual(normal.shouldBounceOnce, true);

  // Critical bounce on urgent call
  const urgent = RichTextFormattingAndDockMotionGovernor.evaluateDockBounce({
    disableDockBounce: false,
    isUrgentMessage: true,
    isWindowFocused: false
  });
  assert.strictEqual(urgent.shouldBounceCritical, true);
  console.log('  ✅ Dock bounce policy passed');
}

// 3. Multi-Monitor 125% DPI Scale Normalization (tdesktop #26393)
{
  console.log('  Testing DPI-normalized media bounds...');
  // 1920x1080 screen with 125% DPI scale (scale = 1.25)
  const bounds = RichTextFormattingAndDockMotionGovernor.calculateDpiNormalizedMediaBounds(1920, 1080, 1.25, 16);
  assert.strictEqual(bounds.scaleFactor, 1.25);
  // (1920 - 32) / 1.25 = 1510.4 -> 1510
  assert.strictEqual(bounds.maxWidthPx, 1510);
  assert.ok(bounds.maxWidthPx < 1920, 'Normalized width must fit within scaled viewport');
  console.log('  ✅ DPI scale normalization passed');
}

console.log('\n🎉 ALL Phase 42 verification checks passed green!');
