import assert from 'node:assert';
import { DesktopUltrawideLayoutSetupAndCaptionGovernor } from '../src/services/desktopUltrawideLayoutSetupAndCaptionGovernor.ts';

console.log('=== Phase 128 Verification: Desktop Ultrawide Layout, Setup & Caption Governor ===');

const governor = new DesktopUltrawideLayoutSetupAndCaptionGovernor();

// Test 1: Caption strict retention when dropping author only (#234)
{
  const sanitized = governor.sanitizeForwardPayload('Important media caption with detailed breakdown', {
    dropAuthor: true,
    dropCaptions: false
  });

  assert.strictEqual(sanitized.isCaptionRetained, true);
  assert.strictEqual(sanitized.preservedCaption, 'Important media caption with detailed breakdown');

  const dropped = governor.sanitizeForwardPayload('Caption to remove', {
    dropAuthor: true,
    dropCaptions: true
  });
  assert.strictEqual(dropped.isCaptionRetained, false);
  assert.strictEqual(dropped.preservedCaption, undefined);
  console.log('Test 1 Passed: Caption retention logic during anonymous forward verified.');
}

// Test 2: In-place uploaded document renaming (#240)
{
  const renamed = governor.renameUploadedDocument({
    documentId: 'doc-777',
    originalFileName: 'old_unnamed_invoice.pdf',
    newFileName: 'Invoice_2026_Q3:FINAL.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 204800
  });

  assert.strictEqual(renamed.documentId, 'doc-777');
  assert.strictEqual(renamed.updatedFileName, 'Invoice_2026_Q3_FINAL.pdf'); // Colon sanitized
  assert.strictEqual(renamed.sanitizedExtension, 'pdf');
  assert.strictEqual(renamed.attributePayload.fileName, 'Invoice_2026_Q3_FINAL.pdf');
  console.log('Test 2 Passed: In-place document renaming and character sanitization verified.');
}

// Test 3: Button vertical centering under fractional DPI (#235)
{
  const padding = governor.computeCenteredButtonPadding({
    containerHeightPx: 48,
    buttonHeightPx: 32,
    dpiScaleRatio: 1.25 // 125% DPI
  });

  // Scaled container = 60, scaled button = 40, total free = 20, half = 10
  assert.strictEqual(padding.topPaddingPx, 10);
  assert.strictEqual(padding.bottomPaddingPx, 10);
  assert.strictEqual(padding.alignedTopPx, 10);
  console.log('Test 3 Passed: Fractional DPI button vertical centering verified.');
}

// Test 4: Ultrawide 2560px Layout Adaptation (#200)
{
  const layout2560 = governor.calculateDesktopLayout(2560, 1440);

  assert.strictEqual(layout2560.isUltrawideActive, true);
  assert.strictEqual(layout2560.firstColumnWidthPx, 72);
  assert.strictEqual(layout2560.secondColumnWidthPx, 380);
  assert.strictEqual(layout2560.thirdColumnWidthPx, 600); // Expanded third column up to 600px (#198)
  assert.ok(layout2560.chatCanvasWidthPx > 1000);
  console.log('Test 4 Passed: 2560px ultrawide layout adaptation verified.');
}

// Test 5: Standard 1080p Layout Constraints
{
  const layout1080 = governor.calculateDesktopLayout(1920, 1080);

  assert.strictEqual(layout1080.isUltrawideActive, false);
  assert.strictEqual(layout1080.firstColumnWidthPx, 72);
  assert.strictEqual(layout1080.secondColumnWidthPx, 320);
  assert.ok(layout1080.thirdColumnWidthPx <= 460);
  console.log('Test 5 Passed: Standard 1080p layout boundary verified.');
}

// Test 6: Modern Setup Wizard Theme Generator (#197)
{
  const setup = governor.generateModernSetupTheme();
  assert.strictEqual(setup.themeName, 'ModernGlassmorphicDark');
  assert.ok(setup.styleSheet.includes('ModernGlassmorphicDark') || setup.styleSheet.includes('border-radius: 16px'));
  assert.ok(setup.steps.includes('AppearanceMode'));
  console.log('Test 6 Passed: Modern setup wizard theme verified.');
}

// Test 7: Build Disk Space Reclamation (#223)
{
  const recNeeded = governor.evaluateStorageReclamation(2000, 5000); // 2GB left
  assert.strictEqual(recNeeded.needsReclamation, true);
  assert.ok(recNeeded.reclaimableCaches.includes('ccache'));

  const recOk = governor.evaluateStorageReclamation(10000, 5000); // 10GB left
  assert.strictEqual(recOk.needsReclamation, false);
  console.log('Test 7 Passed: Storage reclamation evaluator verified.');
}

console.log('=== ALL PHASE 128 TESTS PASSED (100% HEALTH) ===');
