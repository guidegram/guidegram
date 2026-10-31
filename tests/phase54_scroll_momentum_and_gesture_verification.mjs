import assert from 'node:assert/strict';
import { ScrollMomentumAndGestureGovernor } from '../src/services/scrollMomentumAndGestureGovernor.ts';

console.log('🧪 Starting Phase 54 Scroll Momentum, Overscroll Physics & Gesture Verification Suite...');

// 1. Wheel Delta Normalization & NaN Clamping (tdesktop #25986, kotatogram #254)
{
  console.log('  Testing wheel delta normalization & clamping...');
  // Pixel mode (deltaMode = 0)
  const normPixel = ScrollMomentumAndGestureGovernor.normalizeWheelDelta(0, 50, 0);
  assert.strictEqual(normPixel.pixelDeltaY, 50);
  assert.strictEqual(normPixel.isClamped, false);

  // Line mode (deltaMode = 1): 3 lines * 20px = 60px
  const normLine = ScrollMomentumAndGestureGovernor.normalizeWheelDelta(0, 3, 1);
  assert.strictEqual(normLine.pixelDeltaY, 60);

  // Extreme wheel event (> 400px clamped to 400px)
  const extremeWheel = ScrollMomentumAndGestureGovernor.normalizeWheelDelta(0, 1200, 0);
  assert.strictEqual(extremeWheel.pixelDeltaY, 400);
  assert.strictEqual(extremeWheel.isClamped, true);

  // NaN protection
  const nanWheel = ScrollMomentumAndGestureGovernor.normalizeWheelDelta(NaN, NaN, 0);
  assert.strictEqual(nanWheel.pixelDeltaX, 0);
  assert.strictEqual(nanWheel.pixelDeltaY, 0);
  console.log('  ✅ Wheel delta normalization and clamping verified');
}

// 2. Rubber-Band Damping Resistance
{
  console.log('  Testing rubber-band overscroll damping physics...');
  const offset0 = ScrollMomentumAndGestureGovernor.calculateRubberBandOffset(0);
  assert.strictEqual(offset0, 0);

  const offset50 = ScrollMomentumAndGestureGovernor.calculateRubberBandOffset(50, 120);
  assert.ok(offset50 > 0 && offset50 < 50);

  const offsetNegative = ScrollMomentumAndGestureGovernor.calculateRubberBandOffset(-100, 120);
  assert.ok(offsetNegative < 0 && offsetNegative > -100);
  console.log('  ✅ Rubber-band damping offset verified');
}

// 3. Drawer Swipe-Down Gesture Dismissal (tdesktop #3399)
{
  console.log('  Testing drawer swipe gesture dismissal...');
  // Minor swipe: 30px downward (< 100px) -> do not dismiss
  const minorSwipe = ScrollMomentumAndGestureGovernor.evaluateDrawerSwipeGesture(100, 130, 0.2);
  assert.strictEqual(minorSwipe.shouldDismiss, false);
  assert.strictEqual(minorSwipe.displacementY, 30);
  assert.ok(minorSwipe.opacityMultiplier > 0.8);

  // Deep swipe: 120px downward (>= 100px) -> dismiss
  const deepSwipe = ScrollMomentumAndGestureGovernor.evaluateDrawerSwipeGesture(100, 220, 0.3);
  assert.strictEqual(deepSwipe.shouldDismiss, true);
  assert.strictEqual(deepSwipe.displacementY, 120);

  // Fast flick swipe (velocity > 0.8) -> dismiss even at 50px
  const flickSwipe = ScrollMomentumAndGestureGovernor.evaluateDrawerSwipeGesture(100, 150, 1.2);
  assert.strictEqual(flickSwipe.shouldDismiss, true);
  console.log('  ✅ Drawer swipe gesture dismissal verified');
}

// 4. Folder Drop Target Collision (kotatogram #266)
{
  console.log('  Testing folder tab drop target collision...');
  const folders = [
    { folderId: 'folder_all', x: 0, y: 10, width: 80, height: 40 },
    { folderId: 'folder_work', x: 85, y: 10, width: 80, height: 40 },
    { folderId: 'folder_crypto', x: 170, y: 10, width: 80, height: 40 }
  ];

  // Pointer inside 'folder_work' tab (100, 25)
  const hit = ScrollMomentumAndGestureGovernor.resolveFolderDropTarget(100, 25, folders);
  assert.strictEqual(hit, 'folder_work');

  // Pointer outside any tab (300, 25)
  const miss = ScrollMomentumAndGestureGovernor.resolveFolderDropTarget(300, 25, folders);
  assert.strictEqual(miss, null);
  console.log('  ✅ Folder drop target collision verified');
}

// 5. Bot Action Transition Guard (Telegram-iOS #2313)
{
  console.log('  Testing bot action chat transition payload...');
  const transition = ScrollMomentumAndGestureGovernor.buildBotActionChatTransition(
    '@BotFather',
    'newbot',
    '@durov'
  );

  assert.strictEqual(transition.targetChat, '@BotFather');
  assert.strictEqual(transition.initialComposerText, '/newbot');
  assert.strictEqual(transition.shouldSwitchChat, true);

  // Already in BotFather chat
  const sameChatTransition = ScrollMomentumAndGestureGovernor.buildBotActionChatTransition(
    '@BotFather',
    '/help',
    '@BotFather'
  );
  assert.strictEqual(sameChatTransition.shouldSwitchChat, false);
  console.log('  ✅ Bot action chat transition verified');
}

console.log('✨ All Phase 54 Verification Tests Passed 100% Successfully!');
