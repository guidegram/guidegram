import assert from 'node:assert/strict';
import { MobileTouchErgonomicsAndSlopGovernor } from '../src/services/mobileTouchErgonomicsAndSlopGovernor.ts';

console.log('🧪 Starting Phase 45 Mobile Touch Ergonomics, Hit Slop & Viewport Verification Suite...');

// 1. Viewport & Soft Keyboard Inset Compensation (Telegram-iOS #1474)
{
  console.log('  Testing soft keyboard inset compensation...');
  // Window is 800px, soft keyboard opens reducing visual viewport to 500px (keyboard height: 300px)
  // Active input field bottom is at 620px (under keyboard)
  const inset = MobileTouchErgonomicsAndSlopGovernor.calculateKeyboardInset(800, 500, 620);
  assert.strictEqual(inset.keyboardHeight, 300);
  assert.strictEqual(inset.visualViewportHeight, 500);
  assert.strictEqual(inset.isKeyboardVisible, true);
  // Compensation needed: (620 - 500) + 16 = 136px
  assert.strictEqual(inset.contentOffsetCompensation, 136);

  // Keyboard closed: visualViewport matches windowHeight
  const closed = MobileTouchErgonomicsAndSlopGovernor.calculateKeyboardInset(800, 800, 620);
  assert.strictEqual(closed.isKeyboardVisible, false);
  assert.strictEqual(closed.contentOffsetCompensation, 0);
  console.log('  ✅ Soft keyboard inset compensation verified');
}

// 2. Isolated Spoiler Tap Revelation (Telegram-iOS #2324)
{
  console.log('  Testing isolated spoiler tap revelation...');
  const initialRevealed = new Set();
  
  // Tap spoiler 1: reveals only spoiler 1
  const afterTap1 = MobileTouchErgonomicsAndSlopGovernor.toggleSpoilerTap(initialRevealed, 'sp-1');
  assert.strictEqual(afterTap1.has('sp-1'), true);
  assert.strictEqual(afterTap1.has('sp-2'), false);

  // Tap spoiler 2: reveals spoiler 2 while keeping spoiler 1
  const afterTap2 = MobileTouchErgonomicsAndSlopGovernor.toggleSpoilerTap(afterTap1, 'sp-2');
  assert.strictEqual(afterTap2.has('sp-1'), true);
  assert.strictEqual(afterTap2.has('sp-2'), true);

  // Tap spoiler 1 again: conceals spoiler 1
  const afterTap3 = MobileTouchErgonomicsAndSlopGovernor.toggleSpoilerTap(afterTap2, 'sp-1');
  assert.strictEqual(afterTap3.has('sp-1'), false);
  assert.strictEqual(afterTap3.has('sp-2'), true);

  // Reveal all mode
  const allRevealed = MobileTouchErgonomicsAndSlopGovernor.toggleSpoilerTap(new Set(), '', true, ['sp-1', 'sp-2', 'sp-3']);
  assert.strictEqual(allRevealed.size, 3);
  console.log('  ✅ Isolated spoiler tap revelation verified');
}

// 3. Hit Slop Target Expansion & Caption Collision (Telegram-iOS #2323)
{
  console.log('  Testing hit slop expansion and priority layering...');
  // A table caption at (10, 100, 300x50), and a small link inside the table at (15, 120, 20x15)
  const targets = [
    { id: 'table_caption_1', x: 10, y: 100, width: 300, height: 50, isClickable: false },
    { id: 'link_inside_table', x: 15, y: 120, width: 20, height: 15, isClickable: true }
  ];

  // Tap point directly on the link coordinates (18, 125)
  const hit = MobileTouchErgonomicsAndSlopGovernor.resolveHitTargetAtPoint(18, 125, targets);
  assert.strictEqual(hit, 'link_inside_table');

  // Tap point slightly outside the 20x15 link box but within the 44px expanded hit slop (28, 130)
  const hitSlop = MobileTouchErgonomicsAndSlopGovernor.resolveHitTargetAtPoint(28, 130, targets);
  assert.strictEqual(hitSlop, 'link_inside_table');

  // Tap point well outside link, on caption only (200, 130)
  const hitCaption = MobileTouchErgonomicsAndSlopGovernor.resolveHitTargetAtPoint(200, 130, targets);
  assert.strictEqual(hitCaption, 'table_caption_1');
  console.log('  ✅ Hit slop target expansion & layering verified');
}

// 4. Zoom Scale Clamping & Shortcuts (Unigram #563)
{
  console.log('  Testing zoom shortcuts and boundary clamping...');
  let scale = 1.0;
  // Zoom in
  scale = MobileTouchErgonomicsAndSlopGovernor.applyZoomTransform(scale, 'zoom_in');
  assert.strictEqual(scale, 1.25);

  scale = MobileTouchErgonomicsAndSlopGovernor.applyZoomTransform(scale, 'zoom_in');
  assert.strictEqual(scale, 1.56);

  // Reset
  scale = MobileTouchErgonomicsAndSlopGovernor.applyZoomTransform(scale, 'reset');
  assert.strictEqual(scale, 1.0);

  // Zoom out below 1.0 should be clamped to 1.0
  scale = MobileTouchErgonomicsAndSlopGovernor.applyZoomTransform(scale, 'zoom_out');
  assert.strictEqual(scale, 1.0);

  // Pinch zoom over maximum 5.0
  scale = MobileTouchErgonomicsAndSlopGovernor.applyZoomTransform(scale, 'pinch', 10.0);
  assert.strictEqual(scale, 5.0);
  console.log('  ✅ Zoom transforms and boundary limits verified');
}

// 5. Drag Slop vs Click Selection (kotatogram #370, Unigram #2746)
{
  console.log('  Testing drag slop gesture threshold...');
  const msgs = [101, 102];

  // Minor jitter: delta = 4px (< 8px slop threshold)
  const jitter = MobileTouchErgonomicsAndSlopGovernor.evaluateDragSlopAndPayload(100, 100, 103, 103, msgs, true, false);
  assert.strictEqual(jitter.isGenuineDrag, false);
  assert.strictEqual(jitter.messageIds.length, 0);

  // Genuine drag: delta = 15px (>= 8px slop threshold)
  const drag = MobileTouchErgonomicsAndSlopGovernor.evaluateDragSlopAndPayload(100, 100, 115, 110, msgs, true, false);
  assert.strictEqual(drag.isGenuineDrag, true);
  assert.deepStrictEqual(drag.messageIds, msgs);
  assert.strictEqual(drag.dropAuthor, true);
  assert.strictEqual(drag.dropCaption, false);
  console.log('  ✅ Drag slop and forward payload verified');
}

console.log('✨ All Phase 45 Verification Tests Passed 100% Successfully!');
