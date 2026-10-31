import assert from 'node:assert';
import {
  MessageSelectionPreservationGuard,
  NotificationDeduplicationEngine,
  TextUtilitiesAssertionGuard,
  EdgeSwipeGestureDisambiguator,
} from '../src/services/e2eBehavioralRegressionGuard.ts';

function runTests() {
  console.log('[Phase 14 Verification] Starting tests...');

  // --- Test 1: MessageSelectionPreservationGuard (#31495) ---
  const selGuard = new MessageSelectionPreservationGuard();
  selGuard.setSelection('chat_101', [1001, 1002, 1003]);
  assert.deepStrictEqual(selGuard.getSelectedIds(), [1001, 1002, 1003]);

  let copiedBuffer = '';
  const copyRes = selGuard.onCopyToClipboard(txt => {
    copiedBuffer = txt;
  }, 'Three selected messages');

  assert.strictEqual(copyRes.success, true);
  assert.strictEqual(copyRes.selectionPreserved, true, 'Selection MUST NOT be wiped on copy (#31495)');
  assert.deepStrictEqual(selGuard.getSelectedIds(), [1001, 1002, 1003]);
  assert.strictEqual(copiedBuffer, 'Three selected messages');

  // Explicit cancel clears selection
  selGuard.clearSelection('escape');
  assert.strictEqual(selGuard.getSelectedIds().length, 0);
  console.log('✓ Test 1: MessageSelectionPreservationGuard passed');

  // --- Test 2: NotificationDeduplicationEngine (#835) ---
  const dedupe = new NotificationDeduplicationEngine(60000, 5);
  const peerId = 98765;
  const msgId = 555;

  assert.strictEqual(dedupe.shouldAnnounceNotification(peerId, msgId), true);
  assert.strictEqual(dedupe.shouldAnnounceNotification(peerId, msgId), false, 'Duplicate within 60s must be suppressed');

  // Different message passes
  assert.strictEqual(dedupe.shouldAnnounceNotification(peerId, 556), true);
  console.log('✓ Test 2: NotificationDeduplicationEngine passed');

  // --- Test 3: TextUtilitiesAssertionGuard (#364) ---
  assert.strictEqual(TextUtilitiesAssertionGuard.safeSlice('Guidegram', 0, 5), 'Guide');
  assert.strictEqual(TextUtilitiesAssertionGuard.safeSlice('Short', 0, 100), 'Short');
  assert.strictEqual(TextUtilitiesAssertionGuard.safeSlice('Negative', -10, 3), 'Neg');
  assert.strictEqual(TextUtilitiesAssertionGuard.safeSlice(null, 0, 5), '');

  assert.strictEqual(TextUtilitiesAssertionGuard.safeCharAt('ABC', 1), 'B');
  assert.strictEqual(TextUtilitiesAssertionGuard.safeCharAt('ABC', 99, '?'), '?');
  assert.strictEqual(TextUtilitiesAssertionGuard.safeCharAt(undefined, 0, 'default'), 'default');
  console.log('✓ Test 3: TextUtilitiesAssertionGuard passed');

  // --- Test 4: EdgeSwipeGestureDisambiguator (#2009) ---
  const swipe = new EdgeSwipeGestureDisambiguator();
  const screenWidth = 375;

  // Vertical scroll starting at x=10px (left edge) with dy=40px, dx=5px
  const allowScroll = swipe.shouldAllowChatScroll(10, 5, 40, screenWidth);
  assert.strictEqual(allowScroll, true, 'Predominantly vertical swipe at edge must allow chat scroll');

  // Horizontal swipe starting at x=5px with dx=50px, dy=2px (intentional edge drawer swipe)
  const blockScrollForDrawer = swipe.shouldAllowChatScroll(5, 50, 2, screenWidth);
  assert.strictEqual(blockScrollForDrawer, false, 'Horizontal edge swipe reserved for drawer/camera');

  // Inner scroll (x=100px)
  const innerScroll = swipe.shouldAllowChatScroll(100, 20, 20, screenWidth);
  assert.strictEqual(innerScroll, true);
  console.log('✓ Test 4: EdgeSwipeGestureDisambiguator passed');

  console.log('[Phase 14 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
