import assert from 'node:assert/strict';
import { ScreenReaderAriaAndKeyboardNavGovernor } from '../src/services/screenReaderAriaAndKeyboardNavGovernor.ts';

console.log('🧪 Starting Phase 55 Screen-Reader ARIA & Keyboard Navigation Verification Suite...');

// 1. Chat Keyboard Scroll Engine (telegram-tt #401)
{
  console.log('  Testing chat keyboard scrolling shortcuts...');
  // PageUp when composer is unfocused -> scrolls up 450px
  const pageUp = ScreenReaderAriaAndKeyboardNavGovernor.evaluateChatKeyboardScroll('PageUp', false, false);
  assert.strictEqual(pageUp.action, 'scroll_page_up');
  assert.strictEqual(pageUp.scrollOffsetPx, -450);
  assert.strictEqual(pageUp.shouldPreventDefault, true);

  // PageDown when composer is focused but Alt key held -> scrolls down
  const pageDownAlt = ScreenReaderAriaAndKeyboardNavGovernor.evaluateChatKeyboardScroll('PageDown', true, true);
  assert.strictEqual(pageDownAlt.action, 'scroll_page_down');
  assert.strictEqual(pageDownAlt.scrollOffsetPx, 450);

  // Home with Alt -> jump to top
  const home = ScreenReaderAriaAndKeyboardNavGovernor.evaluateChatKeyboardScroll('Home', true, false);
  assert.strictEqual(home.action, 'scroll_top');

  // Normal typing keys (e.g. 'a') do not trigger scroll
  const typing = ScreenReaderAriaAndKeyboardNavGovernor.evaluateChatKeyboardScroll('a', false, true);
  assert.strictEqual(typing.action, 'none');
  console.log('  ✅ Chat keyboard scrolling verified');
}

// 2. Keyboard Accessible File Download Controls (telegram-tt #545)
{
  console.log('  Testing accessible file download ARIA props...');
  // Idle state
  const idle = ScreenReaderAriaAndKeyboardNavGovernor.buildAccessibleFileControl('document.pdf', '2.5 MB', false);
  assert.strictEqual(idle.role, 'button');
  assert.strictEqual(idle.tabIndex, 0);
  assert.strictEqual(idle.ariaLabel, 'Download document.pdf, size 2.5 MB');
  assert.strictEqual(idle.ariaBusy, false);

  // Triggered via Enter key press
  const enterPress = ScreenReaderAriaAndKeyboardNavGovernor.buildAccessibleFileControl('document.pdf', '2.5 MB', false, 'Enter');
  assert.strictEqual(enterPress.onKeyDownAction, 'trigger_download');

  // Triggered via Space key press
  const spacePress = ScreenReaderAriaAndKeyboardNavGovernor.buildAccessibleFileControl('document.pdf', '2.5 MB', false, ' ');
  assert.strictEqual(spacePress.onKeyDownAction, 'trigger_download');

  // Busy downloading state
  const busy = ScreenReaderAriaAndKeyboardNavGovernor.buildAccessibleFileControl('document.pdf', '2.5 MB', true);
  assert.strictEqual(busy.ariaBusy, true);
  console.log('  ✅ Accessible file download controls verified');
}

// 3. Modal Focus Trap & Escape Dismissal (telegram-tt #383)
{
  console.log('  Testing modal focus trap and Escape handler...');
  // Forward Tab from index 0 to 1
  const tabForward = ScreenReaderAriaAndKeyboardNavGovernor.evaluateModalFocusTrap('Tab', false, 3, 0);
  assert.strictEqual(tabForward.nextIndex, 1);
  assert.strictEqual(tabForward.shouldPreventDefault, true);

  // Wrap around: Forward Tab from last index (2) back to 0
  const tabWrap = ScreenReaderAriaAndKeyboardNavGovernor.evaluateModalFocusTrap('Tab', false, 3, 2);
  assert.strictEqual(tabWrap.nextIndex, 0);

  // Reverse Tab (Shift+Tab) from index 0 wraps to 2
  const shiftTabWrap = ScreenReaderAriaAndKeyboardNavGovernor.evaluateModalFocusTrap('Tab', true, 3, 0);
  assert.strictEqual(shiftTabWrap.nextIndex, 2);

  // Escape dismisses modal
  const escape = ScreenReaderAriaAndKeyboardNavGovernor.evaluateModalFocusTrap('Escape', false, 3, 1);
  assert.strictEqual(escape.shouldClose, true);
  console.log('  ✅ Modal focus trap verified');
}

// 4. Accessible Tablist Arrow Navigation (telegram-tt #106)
{
  console.log('  Testing ARIA tablist arrow key navigation...');
  // ArrowRight moves from tab 0 to 1
  const right = ScreenReaderAriaAndKeyboardNavGovernor.navigateTablist('ArrowRight', 0, 4);
  assert.strictEqual(right.nextActiveIndex, 1);
  assert.strictEqual(right.shouldPreventDefault, true);

  // ArrowLeft wraps from tab 0 to tab 3
  const leftWrap = ScreenReaderAriaAndKeyboardNavGovernor.navigateTablist('ArrowLeft', 0, 4);
  assert.strictEqual(leftWrap.nextActiveIndex, 3);

  // End key jumps to last tab
  const end = ScreenReaderAriaAndKeyboardNavGovernor.navigateTablist('End', 1, 4);
  assert.strictEqual(end.nextActiveIndex, 3);
  console.log('  ✅ Tablist arrow navigation verified');
}

// 5. Screen-Reader ARIA Live Region Announcement (tweb #145)
{
  console.log('  Testing ARIA live region announcement text...');
  const announcement = ScreenReaderAriaAndKeyboardNavGovernor.formatIncomingMessageAnnouncement(
    'Sina',
    'Hey, are you free for a call?',
    'Design Group'
  );

  assert.ok(announcement.text.includes('New message from Sina'));
  assert.ok(announcement.text.includes('in Design Group'));
  assert.strictEqual(announcement.politeness, 'polite');
  console.log('  ✅ Screen-reader ARIA live announcements verified');
}

console.log('✨ All Phase 55 Verification Tests Passed 100% Successfully!');
