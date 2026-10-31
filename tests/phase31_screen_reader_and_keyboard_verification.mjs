import assert from 'node:assert/strict';
import { ScreenReaderAndKeyboardNavigatorGuard } from '../src/services/screenReaderAndKeyboardNavigatorGuard.ts';

console.log('🧪 Starting Phase 31 Screen-Reader & Keyboard Navigation Verification Suite...');

// 1. Message-by-Message Arrow-Key Navigation (morethanwords/tweb #711)
{
  console.log('  Testing message roving tabindex arrow navigation...');
  const msgIds = [101, 102, 103, 104, 105];
  const senders = new Map([
    [101, 'Ali'],
    [102, 'Sara'],
    [103, 'Reza'],
    [104, 'Mina'],
    [105, 'Ershad']
  ]);

  // Navigate Down from index 0
  const step1 = ScreenReaderAndKeyboardNavigatorGuard.navigateMessageList(0, 'down', msgIds, senders);
  assert.strictEqual(step1.focusedIndex, 1);
  assert.strictEqual(step1.focusedMessageId, 102);
  assert.strictEqual(step1.ariaAnnouncement, 'Message 2 of 5 from Sara');

  // Navigate Up from index 1
  const step2 = ScreenReaderAndKeyboardNavigatorGuard.navigateMessageList(1, 'up', msgIds, senders);
  assert.strictEqual(step2.focusedIndex, 0);
  assert.strictEqual(step2.focusedMessageId, 101);

  // Navigate Up at top boundary (clamps at 0)
  const step3 = ScreenReaderAndKeyboardNavigatorGuard.navigateMessageList(0, 'up', msgIds, senders);
  assert.strictEqual(step3.focusedIndex, 0);

  // Navigate to Last
  const step4 = ScreenReaderAndKeyboardNavigatorGuard.navigateMessageList(0, 'last', msgIds, senders);
  assert.strictEqual(step4.focusedIndex, 4);
  assert.strictEqual(step4.focusedMessageId, 105);
  console.log('  ✅ Arrow-key navigation passed');
}

// 2. Accessibility Mode Toggle & Prompt (morethanwords/tweb #716, #746)
{
  console.log('  Testing accessibility mode activation...');
  const resOn = ScreenReaderAndKeyboardNavigatorGuard.setAccessibilityMode(true);
  assert.strictEqual(resOn.isActive, true);
  assert.ok(resOn.systemPrompt.includes('Accessibility mode enabled'));

  const resOff = ScreenReaderAndKeyboardNavigatorGuard.setAccessibilityMode(false);
  assert.strictEqual(resOff.isActive, false);
  console.log('  ✅ Accessibility mode toggle passed');
}

// 3. WCAG 2.1 AAA Contrast Ratio Calculation (morethanwords/tweb #224)
{
  console.log('  Testing WCAG contrast ratio calculation...');
  // Black on White (#000000 on #FFFFFF) -> 21:1 (AAA)
  const highContrast = ScreenReaderAndKeyboardNavigatorGuard.calculateWcagContrast('#000000', '#FFFFFF');
  assert.strictEqual(highContrast.isWcagAaPassed, true);
  assert.strictEqual(highContrast.isWcagAaaPassed, true);
  assert.strictEqual(highContrast.contrastRatio, 21);

  // Low contrast: Light grey (#CCCCCC on #FFFFFF) -> ~1.6:1 (Fails AA & AAA)
  const lowContrast = ScreenReaderAndKeyboardNavigatorGuard.calculateWcagContrast('#CCCCCC', '#FFFFFF');
  assert.strictEqual(lowContrast.isWcagAaPassed, false);
  assert.strictEqual(lowContrast.isWcagAaaPassed, false);
  assert.strictEqual(lowContrast.recommendedTextColor, '#000000');
  console.log('  ✅ WCAG contrast calculation passed');
}

// 4. FreeDesktop Portal Color Scheme Resolution (tdesktop #17061)
{
  console.log('  Testing FreeDesktop portal color scheme resolution...');
  assert.strictEqual(ScreenReaderAndKeyboardNavigatorGuard.resolveFreedesktopColorScheme(1), 'dark');
  assert.strictEqual(ScreenReaderAndKeyboardNavigatorGuard.resolveFreedesktopColorScheme(2), 'light');
  assert.strictEqual(ScreenReaderAndKeyboardNavigatorGuard.resolveFreedesktopColorScheme(0), 'no-preference');
  console.log('  ✅ FreeDesktop color scheme passed');
}

// 5. Folder Navigation Shortcut Digit Sanitization (kotatogram #269)
{
  console.log('  Testing folder shortcut index resolution (Ctrl+1..9)...');
  // Ctrl+1 with 4 folders available -> targets folder 0 (Valid)
  const f1 = ScreenReaderAndKeyboardNavigatorGuard.resolveFolderShortcutIndex(1, 4);
  assert.strictEqual(f1.isValid, true);
  assert.strictEqual(f1.targetFolderIndex, 0);

  // Ctrl+5 with only 4 folders -> invalid out of bounds
  const f5 = ScreenReaderAndKeyboardNavigatorGuard.resolveFolderShortcutIndex(5, 4);
  assert.strictEqual(f5.isValid, false);
  assert.strictEqual(f5.targetFolderIndex, null);
  console.log('  ✅ Folder shortcut resolution passed');
}

// 6. Unfocused Auto-Scroll Evaluation (kotatogram #263, #280)
{
  console.log('  Testing unfocused auto-scroll evaluation...');
  // Background window + at bottom -> should auto-scroll
  const auto1 = ScreenReaderAndKeyboardNavigatorGuard.evaluateUnfocusedAutoScroll(false, true, true);
  assert.strictEqual(auto1.shouldAutoScroll, true);

  // Background window + scrolled up reading history -> do NOT auto-scroll (preserve anchor)
  const auto2 = ScreenReaderAndKeyboardNavigatorGuard.evaluateUnfocusedAutoScroll(false, false, true);
  assert.strictEqual(auto2.shouldAutoScroll, false);
  console.log('  ✅ Unfocused auto-scroll evaluation passed');
}

console.log('\n🎉 ALL Phase 31 verification checks passed green!');
