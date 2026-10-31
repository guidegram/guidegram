import assert from 'node:assert';
import {
  SwipeToReplyAndFocusManager,
  PullToNextChannelGestureGuard,
  ArchivedUnreadBadgeCalculator,
  SafeContextMenuPositioner,
} from '../src/services/mobileTouchAndSwipeActionsGuard.ts';

function runTests() {
  console.log('[Phase 21 Verification] Starting tests...');

  // --- Test 1: SwipeToReplyAndFocusManager (#276, #2662) ---
  const replyMgr = new SwipeToReplyAndFocusManager();

  // Sub-threshold swipe (30px)
  const swipeSub = replyMgr.onSwipeMove(30, 'msg_101');
  assert.strictEqual(swipeSub.isTriggered, false);
  assert.strictEqual(swipeSub.focusComposer, false);

  // Full swipe (70px)
  const swipeFull = replyMgr.onSwipeMove(70, 'msg_101');
  assert.strictEqual(swipeFull.isTriggered, true);
  assert.strictEqual(swipeFull.focusComposer, true, 'Input must be auto-focused upon reply trigger (#276)');

  const endRes = replyMgr.onSwipeEnd();
  assert.strictEqual(endRes.shouldReply, true);
  assert.strictEqual(endRes.messageId, 'msg_101');
  console.log('✓ Test 1: SwipeToReplyAndFocusManager passed');

  // --- Test 2: PullToNextChannelGestureGuard (#31449) ---
  const pullGuard = new PullToNextChannelGestureGuard(false); // default disabled

  // Overscroll 150px while disabled
  const disabledPull = pullGuard.onBottomOverscroll(150);
  assert.strictEqual(disabledPull.canTriggerNextChannel, false, 'Must not jump to next channel when disabled (#31449)');

  // Enable option
  pullGuard.setPullToNextChannelEnabled(true);
  const enabledPull = pullGuard.onBottomOverscroll(130);
  assert.strictEqual(enabledPull.canTriggerNextChannel, true);
  assert.strictEqual(enabledPull.overscrollProgress, 1.0);
  console.log('✓ Test 2: PullToNextChannelGestureGuard passed');

  // --- Test 3: ArchivedUnreadBadgeCalculator (#147) ---
  const badgeCalc = new ArchivedUnreadBadgeCalculator(false); // exclude archived by default
  const chats = [
    { isArchived: false, isMuted: false, unreadCount: 5 },
    { isArchived: true, isMuted: false, unreadCount: 20 },
    { isArchived: false, isMuted: true, unreadCount: 10 },
  ];

  const badgeDefault = badgeCalc.calculateBadge(chats);
  assert.strictEqual(badgeDefault.activeUnread, 5);
  assert.strictEqual(badgeDefault.archivedUnread, 30);
  assert.strictEqual(badgeDefault.badgeCount, 5, 'Archived and muted chats must not inflate badge counter (#147)');

  // Setting enabled to include all
  badgeCalc.setIncludeArchived(true);
  const badgeAll = badgeCalc.calculateBadge(chats);
  assert.strictEqual(badgeAll.badgeCount, 35);
  console.log('✓ Test 3: ArchivedUnreadBadgeCalculator passed');

  // --- Test 4: SafeContextMenuPositioner (#7) ---
  // Normal click at (100, 100) in 1000x800 viewport with 200x150 menu
  const posNormal = SafeContextMenuPositioner.calculatePosition(100, 100, 200, 150, 1000, 800);
  assert.strictEqual(posNormal.x, 100);
  assert.strictEqual(posNormal.y, 100);
  assert.strictEqual(posNormal.flippedX, false);
  assert.strictEqual(posNormal.flippedY, false);

  // Click at (950, 750) near bottom-right edge
  const posEdge = SafeContextMenuPositioner.calculatePosition(950, 750, 200, 150, 1000, 800);
  assert.strictEqual(posEdge.flippedX, true, 'Must flip horizontally away from right edge');
  assert.strictEqual(posEdge.flippedY, true, 'Must flip vertically away from bottom edge');
  assert.strictEqual(posEdge.x, 750);
  assert.strictEqual(posEdge.y, 600);
  console.log('✓ Test 4: SafeContextMenuPositioner passed');

  console.log('[Phase 21 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
