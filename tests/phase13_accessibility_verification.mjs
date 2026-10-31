import assert from 'node:assert';
import {
  ScreenReaderAnnouncementCoordinator,
  KeyboardShortcutsAndAccountSwitcher,
  DialogFocusTrapManager,
  FocusStealingPreventionGuard,
} from '../src/services/accessibilityAndKeyboardService.ts';

function runTests() {
  console.log('[Phase 13 Verification] Starting tests...');

  // --- Test 1: ScreenReaderAnnouncementCoordinator (#267, #693) ---
  const announcer = new ScreenReaderAnnouncementCoordinator();

  const announced1 = announcer.announceIncomingMessage('Sarah', 'See you at the meeting!', true, 'Design Team');
  assert.strictEqual(announced1, true);

  const latest1 = announcer.getLatestAnnouncement();
  assert.strictEqual(latest1?.mode, 'polite');
  assert.strictEqual(latest1?.message, 'New message from Sarah in Design Team: See you at the meeting!');

  // Rapid identical message within 500ms debounce
  const announcedDup = announcer.announceIncomingMessage('Sarah', 'See you at the meeting!', true, 'Design Team');
  assert.strictEqual(announcedDup, false, 'Rapid duplicate announcement must be debounced');

  // Assertive alert
  announcer.announceAlert('Call connection lost');
  assert.strictEqual(announcer.getLatestAnnouncement()?.mode, 'assertive');
  console.log('✓ Test 1: ScreenReaderAnnouncementCoordinator passed');

  // --- Test 2: KeyboardShortcutsAndAccountSwitcher (#8179, #1060) ---
  const shortcutMgr = new KeyboardShortcutsAndAccountSwitcher(5);
  let switchedAccountIndex = -1;

  shortcutMgr.onAccountSwitch(idx => {
    switchedAccountIndex = idx;
  });

  // Press Ctrl+2 to switch to second account
  const handledAccount = shortcutMgr.handleKeyDown({
    key: '2',
    ctrlKey: true,
  });
  assert.strictEqual(handledAccount, true);
  assert.strictEqual(switchedAccountIndex, 1);

  // Custom registered shortcut: Ctrl+K
  let searchTriggered = false;
  shortcutMgr.registerShortcut('ctrl+k', () => {
    searchTriggered = true;
  });

  const handledSearch = shortcutMgr.handleKeyDown({
    key: 'k',
    ctrlKey: true,
  });
  assert.strictEqual(handledSearch, true);
  assert.strictEqual(searchTriggered, true);

  // Regular letter 'k' pressed inside an input field
  const inputIgnored = shortcutMgr.handleKeyDown({
    key: 'k',
    targetTagName: 'INPUT',
  });
  assert.strictEqual(inputIgnored, false, 'Regular typing in input fields must pass through');
  console.log('✓ Test 2: KeyboardShortcutsAndAccountSwitcher passed');

  // --- Test 3: DialogFocusTrapManager (#268) ---
  const focusTrap = new DialogFocusTrapManager();
  const dialogElements = ['btn_cancel', 'input_name', 'btn_save'];

  focusTrap.openDialog('edit_profile_dialog', dialogElements, 'btn_open_profile');
  assert.strictEqual(focusTrap.isDialogOpen(), true);
  assert.strictEqual(focusTrap.getCurrentFocusedId(), 'btn_cancel');

  // Press Tab -> advances to next element
  const focus1 = focusTrap.handleTab(false);
  assert.strictEqual(focus1, 'input_name');

  const focus2 = focusTrap.handleTab(false);
  assert.strictEqual(focus2, 'btn_save');

  // Tab past last element loops back to first
  const focusLoop = focusTrap.handleTab(false);
  assert.strictEqual(focusLoop, 'btn_cancel');

  // Shift+Tab loops back to last element
  const focusBack = focusTrap.handleTab(true);
  assert.strictEqual(focusBack, 'btn_save');

  // Close dialog restores focus to trigger element
  const closeRes = focusTrap.closeDialog();
  assert.strictEqual(closeRes.restoreFocusToId, 'btn_open_profile');
  assert.strictEqual(focusTrap.isDialogOpen(), false);
  console.log('✓ Test 3: DialogFocusTrapManager passed');

  // --- Test 4: FocusStealingPreventionGuard (#1026) ---
  const focusGuard = new FocusStealingPreventionGuard();
  focusGuard.setForegroundState(false); // Guidegram is in the background

  const clickResult = focusGuard.onBackgroundNotificationClick();
  assert.strictEqual(clickResult.shouldFocusWindow, false, 'Must not aggressively steal window focus');
  assert.strictEqual(clickResult.showFlashNotice, true, 'Must gently flash tray / taskbar instead');
  console.log('✓ Test 4: FocusStealingPreventionGuard passed');

  console.log('[Phase 13 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
