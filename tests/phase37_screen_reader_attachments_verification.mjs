import assert from 'node:assert/strict';
import { ScreenReaderAttachmentsAndTypographyGovernor } from '../src/services/screenReaderAttachmentsAndTypographyGovernor.ts';

console.log('🧪 Starting Phase 37 Screen-Reader Attachments & Media Verification Suite...');

// 1. Accessible File Attachment Menu Options (Ajaxy/telegram-tt #89, #128)
{
  console.log('  Testing accessible attachment menu generation...');
  const options = ScreenReaderAttachmentsAndTypographyGovernor.getAccessibleAttachmentOptions();
  assert.strictEqual(options.length, 4);
  assert.strictEqual(options[0].type, 'photo');
  assert.ok(options[0].ariaDescription.includes('compression'));
  assert.strictEqual(options[1].type, 'file');
  assert.ok(options[1].ariaDescription.includes('uncompressed'));
  console.log('  ✅ Attachment options passed');
}

// 2. Safe CJK / Persian Font Weight Normalization (morethanwords/tweb #110, tdesktop #31497)
{
  console.log('  Testing safe font-weight normalization...');
  // CJK font with requested 500 -> normalized to 400
  const weight1 = ScreenReaderAttachmentsAndTypographyGovernor.resolveSafeFontWeight(500, 'Noto Sans CJK SC', true);
  assert.strictEqual(weight1, 400);

  // CJK font with requested 600 -> normalized to 700
  const weight2 = ScreenReaderAttachmentsAndTypographyGovernor.resolveSafeFontWeight(600, 'Noto Sans CJK SC', true);
  assert.strictEqual(weight2, 700);

  // Latin font retains 500
  const weight3 = ScreenReaderAttachmentsAndTypographyGovernor.resolveSafeFontWeight(500, 'Inter', false);
  assert.strictEqual(weight3, 500);
  console.log('  ✅ Font weight normalization passed');
}

// 3. Smart Autofocus Evaluation (morethanwords/tweb #210)
{
  console.log('  Testing chat autofocus evaluation...');
  // Normal desktop: should autofocus
  const desk = ScreenReaderAttachmentsAndTypographyGovernor.evaluateChatAutofocus(false, false, false);
  assert.strictEqual(desk.shouldAutofocus, true);

  // When modal is active: must NOT autofocus (prevents stealing modal focus)
  const modal = ScreenReaderAttachmentsAndTypographyGovernor.evaluateChatAutofocus(true, false, false);
  assert.strictEqual(modal.shouldAutofocus, false);

  // Touch device: must NOT autofocus (prevents virtual keyboard screen takeover)
  const touch = ScreenReaderAttachmentsAndTypographyGovernor.evaluateChatAutofocus(false, false, true);
  assert.strictEqual(touch.shouldAutofocus, false);
  console.log('  ✅ Chat autofocus evaluation passed');
}

// 4. Media Viewer Zoom Shortcuts (morethanwords/tweb #111)
{
  console.log('  Testing media viewer zoom shortcuts...');
  // Zoom In: Ctrl + '+'
  const zoomIn = ScreenReaderAttachmentsAndTypographyGovernor.handleMediaZoom('+', true, 1.0, 0.25);
  assert.strictEqual(zoomIn.isZoomAction, true);
  assert.strictEqual(zoomIn.action, 'zoom_in');
  assert.strictEqual(zoomIn.newZoomLevel, 1.25);

  // Zoom Out: Ctrl + '-'
  const zoomOut = ScreenReaderAttachmentsAndTypographyGovernor.handleMediaZoom('-', true, 1.25, 0.25);
  assert.strictEqual(zoomOut.isZoomAction, true);
  assert.strictEqual(zoomOut.action, 'zoom_out');
  assert.strictEqual(zoomOut.newZoomLevel, 1.0);

  // Reset Zoom: Ctrl + '0'
  const zoomReset = ScreenReaderAttachmentsAndTypographyGovernor.handleMediaZoom('0', true, 2.5);
  assert.strictEqual(zoomReset.isZoomAction, true);
  assert.strictEqual(zoomReset.action, 'reset_zoom');
  assert.strictEqual(zoomReset.newZoomLevel, 1.0);
  console.log('  ✅ Media zoom shortcuts passed');
}

// 5. Global Search Shortcut Resolver (TDesktop-x64 #71, morethanwords/tweb #747)
{
  console.log('  Testing search shortcuts...');
  assert.strictEqual(
    ScreenReaderAttachmentsAndTypographyGovernor.isSearchShortcut({ key: 'k', ctrlKey: true }),
    true
  );
  assert.strictEqual(
    ScreenReaderAttachmentsAndTypographyGovernor.isSearchShortcut({ key: 'F3' }),
    true
  );
  // Ctrl+Shift+T (should NOT trigger search, preserved for browser reopen tab)
  assert.strictEqual(
    ScreenReaderAttachmentsAndTypographyGovernor.isSearchShortcut({ key: 't', ctrlKey: true, shiftKey: true }),
    false
  );
  console.log('  ✅ Search shortcuts passed');
}

console.log('\n🎉 ALL Phase 37 verification checks passed green!');
