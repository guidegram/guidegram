import assert from 'node:assert/strict';
import { AccessibilityAndKeyboardShortcutsGuard } from '../src/services/accessibilityAndKeyboardShortcutsGuard.ts';

console.log('🧪 Starting Phase 25 Accessibility & Screen-Reader Verification Suite...');

// 1. Non-English / Persian Keymap Shortcut Normalization (tdesktop #4977)
{
  console.log('  Testing layout-independent shortcut normalization...');
  // User on Persian keyboard presses Ctrl+K:
  // event.code is 'KeyK', but event.key might be Persian letter 'ن' (Noon)
  const persianCtrlK = AccessibilityAndKeyboardShortcutsGuard.normalizeShortcut({
    code: 'KeyK',
    key: 'ن',
    ctrlKey: true
  });
  assert.strictEqual(persianCtrlK.canonicalKey, 'k');
  assert.strictEqual(persianCtrlK.signature, 'ctrl+k');

  // User on Russian keyboard presses Ctrl+Shift+M:
  // event.code is 'KeyM', event.key is 'ь'
  const russianCtrlShiftM = AccessibilityAndKeyboardShortcutsGuard.normalizeShortcut({
    code: 'KeyM',
    key: 'ь',
    ctrlKey: true,
    shiftKey: true
  });
  assert.strictEqual(russianCtrlShiftM.canonicalKey, 'm');
  assert.strictEqual(russianCtrlShiftM.signature, 'ctrl+shift+m');

  // Mac Command+F:
  const macCmdF = AccessibilityAndKeyboardShortcutsGuard.normalizeShortcut({
    code: 'KeyF',
    key: 'f',
    metaKey: true,
    platform: 'MacIntel'
  });
  assert.strictEqual(macCmdF.signature, 'meta+f');
  console.log('  ✅ Layout-independent shortcut normalization passed');
}

// 2. Focus Trap & Origin Restoration Stack (tdesktop #2541)
{
  console.log('  Testing focus trap & origin restoration...');
  // User was typing in 'chat-input-42', clicks profile photo opening 'modal-profile-viewer'
  AccessibilityAndKeyboardShortcutsGuard.pushFocusTrap('profile-viewer', 'chat-input-42');

  // Inside profile viewer, user opens full-size avatar viewer 'modal-media-viewer'
  AccessibilityAndKeyboardShortcutsGuard.pushFocusTrap('media-viewer', 'profile-avatar-button');

  // Media viewer closes -> focus returns to 'profile-avatar-button'
  const res1 = AccessibilityAndKeyboardShortcutsGuard.popFocusTrap('media-viewer');
  assert.strictEqual(res1.targetElementIdToFocus, 'profile-avatar-button');
  assert.strictEqual(res1.wasTriggerPreserved, true);

  // Profile viewer closes -> focus returns to original 'chat-input-42'
  const res2 = AccessibilityAndKeyboardShortcutsGuard.popFocusTrap('profile-viewer');
  assert.strictEqual(res2.targetElementIdToFocus, 'chat-input-42');
  assert.strictEqual(res2.wasTriggerPreserved, true);

  // Pop with empty stack -> falls back to default fallback element
  const res3 = AccessibilityAndKeyboardShortcutsGuard.popFocusTrap('unknown-modal', 'main-chat-input');
  assert.strictEqual(res3.targetElementIdToFocus, 'main-chat-input');
  assert.strictEqual(res3.wasTriggerPreserved, false);
  console.log('  ✅ Focus restoration stack passed');
}

// 3. Media Viewer Navigation Key Delegation (tdesktop #31440)
{
  console.log('  Testing media viewer key delegation...');
  assert.strictEqual(
    AccessibilityAndKeyboardShortcutsGuard.handleMediaViewerNavigationKey('ArrowRight', {}).action,
    'next'
  );
  assert.strictEqual(
    AccessibilityAndKeyboardShortcutsGuard.handleMediaViewerNavigationKey('ArrowLeft', {}).action,
    'prev'
  );
  assert.strictEqual(
    AccessibilityAndKeyboardShortcutsGuard.handleMediaViewerNavigationKey('Escape', {}).action,
    'close'
  );
  assert.strictEqual(
    AccessibilityAndKeyboardShortcutsGuard.handleMediaViewerNavigationKey('Space', {}).action,
    'togglePlay'
  );
  assert.strictEqual(
    AccessibilityAndKeyboardShortcutsGuard.handleMediaViewerNavigationKey('KeyF', {}).action,
    'toggleFullscreen'
  );
  assert.strictEqual(
    AccessibilityAndKeyboardShortcutsGuard.handleMediaViewerNavigationKey('KeyM', {}).action,
    'toggleMute'
  );
  console.log('  ✅ Media viewer key delegation passed');
}

// 4. Accessible Screen-Reader ARIA-Labels (tdesktop #476)
{
  console.log('  Testing screen-reader ARIA label generator...');
  const voiceAria = AccessibilityAndKeyboardShortcutsGuard.formatMessageAriaLabel({
    senderName: 'Sarah',
    timestampStr: '14:25',
    mediaType: 'voice',
    durationSeconds: 135,
    isOut: false
  });
  assert.ok(voiceAria.includes('Message from Sarah'));
  assert.ok(voiceAria.includes('Voice message, duration 2 minutes 15 seconds'));
  assert.ok(voiceAria.includes('at 14:25'));

  const outgoingAria = AccessibilityAndKeyboardShortcutsGuard.formatMessageAriaLabel({
    senderName: 'Me',
    timestampStr: '14:26',
    text: 'See you tomorrow',
    isOut: true,
    deliveryStatus: 'read'
  });
  assert.ok(outgoingAria.includes('Message from You'));
  assert.ok(outgoingAria.includes('content: "See you tomorrow"'));
  assert.ok(outgoingAria.includes('status: read'));
  console.log('  ✅ Screen-reader ARIA label generation passed');
}

// 5. Virtual Keyboard Viewport Scroll Alignment (tdesktop #218)
{
  console.log('  Testing virtual keyboard scroll alignment...');
  // Viewport height: 800px, Keyboard height: 300px -> visible area: 500px
  // Input bottom: 550px -> occluded by 50px + 16px margin = 66px scroll offset
  const scrollOffset = AccessibilityAndKeyboardShortcutsGuard.calculateVirtualKeyboardScrollOffset(
    550,
    800,
    300,
    16
  );
  assert.strictEqual(scrollOffset, 66);

  // Input bottom: 400px -> fully visible, scroll offset = 0
  const noScroll = AccessibilityAndKeyboardShortcutsGuard.calculateVirtualKeyboardScrollOffset(
    400,
    800,
    300,
    16
  );
  assert.strictEqual(noScroll, 0);
  console.log('  ✅ Virtual keyboard scroll alignment passed');
}

console.log('\n🎉 ALL Phase 25 verification checks passed green!');
