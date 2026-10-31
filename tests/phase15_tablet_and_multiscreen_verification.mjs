import assert from 'node:assert';
import {
  LandscapeKeyboardScrollInviewGuard,
  MultiMonitorOrientationGuard,
  LandscapeVideoReturnRestorationGuard,
  TabletDualPaneLayoutManager,
} from '../src/services/tabletAndMultiScreenErgonomicsService.ts';

function runTests() {
  console.log('[Phase 15 Verification] Starting tests...');

  // --- Test 1: LandscapeKeyboardScrollInviewGuard (#3274) ---
  // Tablet landscape: 800px height, keyboard occupies 350px -> visible area = 450px
  // Input field is at top=500px, height=50px (covered by keyboard)
  const scrollRes = LandscapeKeyboardScrollInviewGuard.calculateInputScrollOffset(
    500, // inputTop
    50,  // inputHeight
    800, // viewportHeight
    350  // keyboardHeight
  );
  assert.strictEqual(scrollRes.needsScroll, true);
  assert.ok(scrollRes.targetScrollTop > 0);

  // Input already in visible area
  const noScrollRes = LandscapeKeyboardScrollInviewGuard.calculateInputScrollOffset(
    100, 50, 800, 350
  );
  assert.strictEqual(noScrollRes.needsScroll, false);
  console.log('✓ Test 1: LandscapeKeyboardScrollInviewGuard passed');

  // --- Test 2: MultiMonitorOrientationGuard (#24218) ---
  // Primary landscape monitor
  const primaryScreen = { width: 1920, height: 1080, isLandscape: true, scaleFactor: 1.0 };
  const boundsPrimary = MultiMonitorOrientationGuard.computeViewerBounds(1200, 800, primaryScreen);
  assert.strictEqual(boundsPrimary.renderedWidth, 1200);
  assert.strictEqual(boundsPrimary.renderedHeight, 800);
  assert.strictEqual(boundsPrimary.offsetX, 360);

  // Secondary portrait monitor (1080 x 1920)
  const portraitScreen = { width: 1080, height: 1920, isLandscape: false, scaleFactor: 1.0 };
  const boundsPortrait = MultiMonitorOrientationGuard.computeViewerBounds(1200, 800, portraitScreen);
  // Max width is 1080 * 0.95 = 1026 -> scale is 1026/1200 = 0.855 -> renderedWidth ~1026
  assert.ok(boundsPortrait.renderedWidth <= portraitScreen.width);
  assert.ok(boundsPortrait.renderedHeight <= portraitScreen.height);
  assert.ok(boundsPortrait.offsetX >= 0);
  assert.ok(boundsPortrait.offsetY >= 0);
  console.log('✓ Test 2: MultiMonitorOrientationGuard passed');

  // --- Test 3: LandscapeVideoReturnRestorationGuard (#320) ---
  const videoGuard = new LandscapeVideoReturnRestorationGuard();
  const initialWindow = { width: 1000, height: 700, x: 100, y: 100 };

  videoGuard.onEnterVideo(initialWindow);

  // OS or player shrunk window temporarily during transition
  const shrunkWindow = { width: 600, height: 400, x: 100, y: 100 };
  const restoredWindow = videoGuard.onExitVideo(shrunkWindow);

  assert.strictEqual(restoredWindow.width, 1000, 'Width must be restored to pre-video dimension');
  assert.strictEqual(restoredWindow.height, 700, 'Height must be restored');
  console.log('✓ Test 3: LandscapeVideoReturnRestorationGuard passed');

  // --- Test 4: TabletDualPaneLayoutManager (#1058) ---
  const mobile = TabletDualPaneLayoutManager.resolveLayoutMode(500);
  assert.strictEqual(mobile.mode, 'single_pane');
  assert.strictEqual(mobile.showRightSidebar, false);

  const tablet = TabletDualPaneLayoutManager.resolveLayoutMode(900);
  assert.strictEqual(tablet.mode, 'tablet_dual_pane');
  assert.strictEqual(tablet.chatListWidth, 320);
  assert.strictEqual(tablet.showRightSidebar, false);

  const desktop = TabletDualPaneLayoutManager.resolveLayoutMode(1400);
  assert.strictEqual(desktop.mode, 'desktop_triple_pane');
  assert.strictEqual(desktop.chatListWidth, 360);
  assert.strictEqual(desktop.showRightSidebar, true);
  console.log('✓ Test 4: TabletDualPaneLayoutManager passed');

  console.log('[Phase 15 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
