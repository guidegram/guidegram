import assert from 'node:assert/strict';
import { UnigramMediaEditorAccessibilityAndTrayGovernor } from '../src/services/unigramMediaEditorAccessibilityAndTrayGovernor.ts';

console.log('🧪 Starting Phase 163: Unigram Media Editor, Tray, Accessibility, and Font Hardening Test Suite...');

const governor = new UnigramMediaEditorAccessibilityAndTrayGovernor();

// =========================================================================
// Test 1: Unigram #1534 - Media Editor Crop Clamping and Inking Transform
// =========================================================================
console.log('Testing Unigram #1534: Crop boundaries clamping and inking coordinate transform...');
{
  // 1:1 aspect ratio preset on 1000x800 image
  const cropSquare = governor.clampCropRect(
    { x: 50, y: 50, width: 900, height: 700 },
    1000,
    800,
    '1:1'
  );
  assert.equal(cropSquare.width, 700);
  assert.equal(cropSquare.height, 700);
  assert.ok(cropSquare.x + cropSquare.width <= 1000);
  assert.ok(cropSquare.y + cropSquare.height <= 800);

  // Inking coordinate transformation
  const rawPoint = { x: 120, y: 150 };
  const transformed = governor.transformInkingPoint(rawPoint, cropSquare);
  assert.equal(transformed.x, 120 - cropSquare.x);
  assert.equal(transformed.y, 150 - cropSquare.y);
  console.log('✅ Unigram #1534: Crop clamping and inking transform verified.');
}

// =========================================================================
// Test 2: Unigram #1128 - System Tray Minimize and Taskbar Toggle
// =========================================================================
console.log('Testing Unigram #1128: System tray minimize and taskbar visibility...');
{
  governor.setTrayConfig({ minimizeToTray: true });
  const minResult = governor.handleWindowMinimize();
  assert.equal(minResult.windowState, 'tray_hidden');
  assert.equal(minResult.showTaskbarItem, false);

  const restoreResult = governor.restoreWindowFromTray();
  assert.equal(restoreResult.windowState, 'normal');
  assert.equal(restoreResult.showTaskbarItem, true);
  console.log('✅ Unigram #1128: System tray minimize verified.');
}

// =========================================================================
// Test 3: Unigram #805 - Photo Viewer Overlay Toggle and Autohide
// =========================================================================
console.log('Testing Unigram #805: Photo viewer overlay tap toggle and zoom autohide...');
{
  // Normal tap: toggles visibility from true to false
  const tapOff = governor.toggleViewerOverlay(true, false);
  assert.equal(tapOff.isOverlayVisible, false);
  assert.equal(tapOff.reason, 'user_tap_toggle');

  // Tap again: toggles from false to true
  const tapOn = governor.toggleViewerOverlay(false, false);
  assert.equal(tapOn.isOverlayVisible, true);

  // User pinches or zooms into photo: overlay auto-hides!
  const zoomHide = governor.toggleViewerOverlay(true, true);
  assert.equal(zoomHide.isOverlayVisible, false);
  assert.equal(zoomHide.reason, 'autohide_during_zoom_pan');
  console.log('✅ Unigram #805: Photo viewer overlay autohide verified.');
}

// =========================================================================
// Test 4: Unigram #548 - Message List Keyboard Navigation
// =========================================================================
console.log('Testing Unigram #548: Message list PageUp/PageDown and Home/End scroll...');
{
  const viewportHeight = 600;
  const maxScroll = 5000;

  // PageDown from 1000 -> 1600
  const scrollDown = governor.computeKeyboardScroll('page_down', 1000, viewportHeight, maxScroll);
  assert.equal(scrollDown, 1600);

  // PageUp from 1600 -> 1000
  const scrollUp = governor.computeKeyboardScroll('page_up', 1600, viewportHeight, maxScroll);
  assert.equal(scrollUp, 1000);

  // Home -> 0 (jump to top)
  const homeScroll = governor.computeKeyboardScroll('home', 1000, viewportHeight, maxScroll);
  assert.equal(homeScroll, 0);

  // End -> 5000 (jump to bottom)
  const endScroll = governor.computeKeyboardScroll('end', 1000, viewportHeight, maxScroll);
  assert.equal(endScroll, 5000);
  console.log('✅ Unigram #548: Message list keyboard navigation verified.');
}

// =========================================================================
// Test 5: Unigram #2790 - Notification Avatar Local URI and Fallback
// =========================================================================
console.log('Testing Unigram #2790: Notification avatar local file URI and initials fallback...');
{
  // Remote avatar available -> cached local file URI
  const cached = governor.getNotificationAvatarUri('usr_44', 'Alice Smith', 'https://cdn.example.com/alice.jpg');
  assert.equal(cached.isFallback, false);
  assert.ok(cached.avatarUri.startsWith('file:///C:/Users/appdata/guidegram/avatars/usr_44.png'));

  // No remote avatar -> SVG initials fallback
  const fallback = governor.getNotificationAvatarUri('usr_99', 'Bob');
  assert.equal(fallback.isFallback, true);
  assert.ok(fallback.avatarUri.startsWith('data:image/svg+xml'));
  assert.ok(fallback.avatarUri.includes('B'));
  console.log('✅ Unigram #2790: Notification avatar cache verified.');
}

// =========================================================================
// Test 6: Unigram #2777 - Screen Reader Accessibility Announcements
// =========================================================================
console.log('Testing Unigram #2777: Screen reader aria-live announcements queue...');
{
  const announcement = governor.queueScreenReaderAnnouncement('Sarah', 'Can we meet tomorrow?');
  assert.ok(announcement.id.startsWith('announcement_'));
  assert.equal(announcement.text, 'New message from Sarah: Can we meet tomorrow?');
  assert.equal(announcement.priority, 'polite');
  console.log('✅ Unigram #2777: Screen reader accessibility verified.');
}

// =========================================================================
// Test 7: Unigram #3242 - Font Glyph Localization and OpenType Tags
// =========================================================================
console.log('Testing Unigram #3242: CJK and Persian localized font stack and lang tags...');
{
  // Traditional Chinese (Taiwan/HK)
  const tc = governor.getLocalizedFontStack('zh-Hant');
  assert.equal(tc.langTag, 'zh-Hant');
  assert.ok(tc.fontFamily.includes('Microsoft JhengHei'));
  assert.equal(tc.isRtl, false);

  // Simplified Chinese
  const sc = governor.getLocalizedFontStack('zh-CN');
  assert.equal(sc.langTag, 'zh-Hans');
  assert.ok(sc.fontFamily.includes('Microsoft YaHei'));

  // Persian
  const fa = governor.getLocalizedFontStack('fa');
  assert.equal(fa.langTag, 'fa');
  assert.ok(fa.fontFamily.includes('Vazirmatn'));
  assert.equal(fa.isRtl, true);
  console.log('✅ Unigram #3242: Font glyph localization verified.');
}

console.log('🎉 Phase 163: All 7 Unigram hardening tests PASSED with 100% precision!');
