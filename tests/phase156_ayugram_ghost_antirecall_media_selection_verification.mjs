import assert from 'node:assert/strict';
import { AyuGramGhostAntiRecallMediaAndSelectionGovernor } from '../src/services/ayugramGhostAntiRecallMediaAndSelectionGovernor.ts';

console.log('🧪 Starting Phase 156: AyuGram AntiRecall, Forwarding, Selection, and Media Hardening Test Suite...');

const governor = new AyuGramGhostAntiRecallMediaAndSelectionGovernor();

// =========================================================================
// Test 1: AyuGram #203 - AntiRecall Edit History and Deletion Preservation
// =========================================================================
console.log('Testing AyuGram #203: AntiRecall post revision history and deletion preservation...');
{
  const chatId = '-100998877';
  const msgId = '555';

  // 1. Initial message
  const initial = governor.recordMessage(chatId, msgId, 'user_1', 'Original release announcement');
  assert.equal(initial.revisions.length, 1);
  assert.equal(initial.revisions[0].text, 'Original release announcement');

  // 2. Author edits message twice
  governor.recordMessageEdit(chatId, msgId, 'Edited: Release delayed');
  const secondEdit = governor.recordMessageEdit(chatId, msgId, 'Edited again: Release cancelled!');
  assert.equal(secondEdit.revisions.length, 3);
  assert.equal(secondEdit.currentText, 'Edited again: Release cancelled!');

  // 3. Author deletes message remotely
  const deleted = governor.recordMessageDeletion(chatId, msgId);
  assert.ok(deleted);
  assert.equal(deleted.isDeleted, true);
  assert.ok(deleted.deletedAt);

  // 4. Verify historical revisions remain intact locally
  const revisions = governor.getMessageRevisions(chatId, msgId);
  assert.equal(revisions.length, 3);
  assert.equal(revisions[0].text, 'Original release announcement');
  assert.equal(revisions[1].text, 'Edited: Release delayed');
  assert.equal(revisions[2].text, 'Edited again: Release cancelled!');
  console.log('✅ AyuGram #203: AntiRecall post revision history verified.');
}

// =========================================================================
// Test 2: AyuGram #169 - Deleted Messages Reconciliation and Tombstones
// =========================================================================
console.log('Testing AyuGram #169: Deleted messages gap reconciliation and tombstones...');
{
  const chatId = '-100998877';
  // Message 555 was already cached above. Messages 556 and 557 were never cached before deletion.
  const res = governor.reconcileDeletedMessageGaps(chatId, ['555', '556', '557']);

  assert.equal(res.preservedCount, 1); // 555 was preserved
  assert.equal(res.tombstonesCreated, 2); // 556 and 557 became tombstones
  assert.equal(res.tombstones.length, 2);
  assert.equal(res.tombstones[0].messageId, '556');
  assert.equal(res.tombstones[0].isPlaceholder, true);
  console.log('✅ AyuGram #169: Deleted messages gap reconciliation verified.');
}

// =========================================================================
// Test 3: AyuGram #84 - Advanced Forwarding and Content Copying Options
// =========================================================================
console.log('Testing AyuGram #84: Advanced forwarding privacy transformations...');
{
  // Case A: Standard native forward
  const native = governor.transformForwardPayload('chat_1', 'msg_1', 'Hello world', 'media_123', {
    dropAuthor: false,
    dropCaption: false,
    forwardAsCopy: false,
    stripSpoilers: false
  });
  assert.equal(native.mode, 'native_forward');
  assert.equal(native.authorHeaderSuppressed, false);
  assert.equal(native.text, 'Hello world');

  // Case B: Forward without author (dropAuthor)
  const dropAuthor = governor.transformForwardPayload('chat_1', 'msg_1', 'Secret text', undefined, {
    dropAuthor: true,
    dropCaption: false,
    forwardAsCopy: false,
    stripSpoilers: false
  });
  assert.equal(dropAuthor.mode, 'send_as_copy');
  assert.equal(dropAuthor.authorHeaderSuppressed, true);

  // Case C: Strip caption and spoilers
  const stripped = governor.transformForwardPayload('chat_1', 'msg_1', 'Check out ||classified|| details', 'media_123', {
    dropAuthor: true,
    dropCaption: false,
    forwardAsCopy: true,
    stripSpoilers: true
  });
  assert.equal(stripped.text, 'Check out classified details');
  console.log('✅ AyuGram #84: Advanced forwarding options verified.');
}

// =========================================================================
// Test 4: AyuGram #284 - Bulk Message Range Selection and Filtering
// =========================================================================
console.log('Testing AyuGram #284: Shift-click range selection and filtering...');
{
  const visibleIds = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];

  // Range 12 to 17
  const sel = governor.selectMessageRange('12', '17', visibleIds);
  assert.equal(sel.rangeCount, 6);
  assert.deepEqual(sel.selectedMessageIds, ['12', '13', '14', '15', '16', '17']);

  // Filtered range (only even IDs)
  const selFiltered = governor.selectMessageRange('12', '17', visibleIds, (id) => parseInt(id, 10) % 2 === 0);
  assert.deepEqual(selFiltered.selectedMessageIds, ['12', '14', '16']);
  console.log('✅ AyuGram #284: Bulk message range selection verified.');
}

// =========================================================================
// Test 5: AyuGram #362 - Video Aspect Ratio Fit Calculations (Contain vs Cover)
// =========================================================================
console.log('Testing AyuGram #362: Video aspect ratio containment to prevent cropping...');
{
  const containerW = 400;
  const containerH = 600;

  // Ultra-wide 16:9 video in 400x600 container
  const videoW = 1920;
  const videoH = 1080;

  // Contain mode: 100% visible, letterboxed top/bottom, zero cropping
  const containFit = governor.calculateVideoAspectFit(containerW, containerH, videoW, videoH, false);
  assert.equal(containFit.fitMode, 'contain');
  assert.equal(containFit.isCropped, false);
  assert.equal(containFit.renderedWidth, 400);
  assert.equal(containFit.renderedHeight, 225); // 400 / (1920/1080) = 225
  assert.equal(containFit.offsetY, Math.round((600 - 225) / 2)); // 188px padding

  // Cover mode: cropped
  const coverFit = governor.calculateVideoAspectFit(containerW, containerH, videoW, videoH, true);
  assert.equal(coverFit.fitMode, 'cover');
  assert.equal(coverFit.isCropped, true);
  assert.equal(coverFit.renderedHeight, 600);
  console.log('✅ AyuGram #362: Video aspect ratio containment verified.');
}

// =========================================================================
// Test 6: AyuGram #33 - Idle Sleep/Wake Socket Teardown & Heartbeat Governor
// =========================================================================
console.log('Testing AyuGram #33: Sleep/wake time gap detection and socket teardown...');
{
  const lastHeartbeat = 1000000;
  const expectedInterval = 30000; // 30s

  // Normal ping 25s later
  const normal = governor.checkSleepWakeGapAndReconcile(lastHeartbeat, lastHeartbeat + 25000, expectedInterval);
  assert.equal(normal.sleepDetected, false);
  assert.equal(normal.actionRequired, 'none');

  // Sleep wake event: 10 minutes later (600,000ms gap)
  const wake = governor.checkSleepWakeGapAndReconcile(lastHeartbeat, lastHeartbeat + 600000, expectedInterval);
  assert.equal(wake.sleepDetected, true);
  assert.equal(wake.actionRequired, 'full_socket_teardown_and_gc');
  console.log('✅ AyuGram #33: Idle sleep/wake reconnection governor verified.');
}

// =========================================================================
// Test 7: AyuGram #294 - Microphone Permission Loop Breaker
// =========================================================================
console.log('Testing AyuGram #294: Microphone permission loop breaker and OS settings prompt...');
{
  // Attempt 1: Granted
  const res1 = governor.requestMicrophonePermission(false);
  assert.equal(res1.status, 'granted');

  // Attempt 2: Denied
  const res2 = governor.requestMicrophonePermission(true);
  assert.equal(res2.status, 'denied');
  assert.equal(res2.openSettingsPrompt, true);

  // Attempt 3: Denied
  governor.requestMicrophonePermission(true);

  // Attempt 4: Exceeds 3 attempts in 10s -> Loop Breaker triggers!
  const res4 = governor.requestMicrophonePermission(false);
  assert.equal(res4.status, 'loop_prevented');
  assert.ok(res4.message.includes('Too many permission requests'));
  assert.equal(res4.openSettingsPrompt, true);
  console.log('✅ AyuGram #294: Microphone permission loop breaker verified.');
}

console.log('🎉 Phase 156: All 7 AyuGram hardening tests PASSED with 100% precision!');
