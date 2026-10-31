import assert from 'node:assert';
import { WebChatSyncMediaPlaybackAndBotKeyboardGovernor } from '../src/services/webChatSyncMediaPlaybackAndBotKeyboardGovernor.ts';

console.log('=== Phase 139 Verification: Web Chat Sync, Media Playback & Keyboard Governor ===');

const governor = new WebChatSyncMediaPlaybackAndBotKeyboardGovernor();

// Test 1: Chat List Gap Recovery & Future Offset Rollover (#726)
{
  const futureCursor = {
    offsetDate: 1900000000, // Stale far-future date
    offsetId: 500,
    offsetPeerId: 1001,
    hasGapDetected: false
  };

  const recovered = governor.reconcileChatListPagination(futureCursor, 1750000000);
  assert.strictEqual(recovered.offsetDate, 0); // Reset to fresh top of chat list
  assert.strictEqual(recovered.offsetId, 0);

  const normalCursor = {
    offsetDate: 1740000000,
    offsetId: 120,
    offsetPeerId: 2002,
    hasGapDetected: false
  };
  const preserved = governor.reconcileChatListPagination(normalCursor, 1750000000);
  assert.strictEqual(preserved.offsetDate, 1740000000);
  console.log('Test 1 Passed: Chat list gap detection and cursor reset verified.');
}

// Test 2: Granular Playback Speed Slider (0.5x to 2.5x) (#595)
{
  const speed13 = governor.clampAndValidatePlaybackSpeed(1.30);
  assert.strictEqual(speed13.currentSpeed, 1.30);
  assert.strictEqual(speed13.preservesPitch, true);

  const speed125 = governor.clampAndValidatePlaybackSpeed(1.26); // Rounds to nearest 0.05 step
  assert.strictEqual(speed125.currentSpeed, 1.25);

  const speedExceeded = governor.clampAndValidatePlaybackSpeed(5.0);
  assert.strictEqual(speedExceeded.currentSpeed, 2.5); // Clamped to max
  console.log('Test 2 Passed: Granular playback speed slider and pitch preservation verified.');
}

// Test 3: Multi-Image Drag-and-Drop Batch Processing (#411)
{
  const droppedFiles = [
    { name: 'photo1.jpg', sizeBytes: 204800, mimeType: 'image/jpeg', isImage: true },
    { name: 'photo2.png', sizeBytes: 512000, mimeType: 'image/png', isImage: true },
    { name: 'photo3.webp', sizeBytes: 150000, mimeType: 'image/webp', isImage: true },
    { name: 'report.pdf', sizeBytes: 1048576, mimeType: 'application/pdf', isImage: false }
  ];

  const batch = governor.processBatchDroppedFiles(droppedFiles);
  assert.strictEqual(batch.totalFiles, 4);
  assert.strictEqual(batch.willFormAlbum, true);
  assert.strictEqual(batch.imagesToGroupInAlbum.length, 3);
  assert.strictEqual(batch.standaloneDocuments.length, 1);
  assert.strictEqual(batch.standaloneDocuments[0].name, 'report.pdf');
  console.log('Test 3 Passed: Multi-image drag-and-drop batch album grouping verified.');
}

// Test 4: MP4 Fast-Start Moov Atom Pre-Flight (#685)
{
  // Header with 'moov' atom at byte 10
  const headerWithMoov = new Uint8Array(64);
  headerWithMoov[10] = 0x6d; // 'm'
  headerWithMoov[11] = 0x6f; // 'o'
  headerWithMoov[12] = 0x6f; // 'o'
  headerWithMoov[13] = 0x76; // 'v'

  const fastStartCheck = governor.inspectMp4StreamingCapability(headerWithMoov);
  assert.strictEqual(fastStartCheck.canStreamInstantly, true);
  assert.strictEqual(fastStartCheck.needsFastStartOptimization, false);

  // Header without 'moov' (needs optimization)
  const headerNoMoov = new Uint8Array(64);
  const slowStartCheck = governor.inspectMp4StreamingCapability(headerNoMoov);
  assert.strictEqual(slowStartCheck.canStreamInstantly, false);
  assert.strictEqual(slowStartCheck.needsFastStartOptimization, true);
  console.log('Test 4 Passed: MP4 fast-start moov atom inspection verified.');
}

// Test 5: Change Phone Number Workflow State Machine (#715)
{
  let state = {
    currentPhone: '+989121111111',
    newPhone: '',
    step: 'enter_new_phone'
  };

  state = governor.advancePhoneNumberChange(state, { phone: '+989122222222' });
  assert.strictEqual(state.step, 'enter_code');
  assert.strictEqual(state.newPhone, '+989122222222');
  assert.ok(state.phoneCodeHash?.startsWith('hash-'));

  state = governor.advancePhoneNumberChange(state, { code: '12345' });
  assert.strictEqual(state.step, 'completed');
  assert.strictEqual(state.currentPhone, '+989122222222');
  console.log('Test 5 Passed: Change phone number verification flow verified.');
}

// Test 6: Bot Reply Keyboard Location Request Handling (#394)
{
  // Permission not granted -> Prompt
  const promptOutcome = governor.handleBotLocationRequest(false);
  assert.strictEqual(promptOutcome.action, 'prompt_permission');

  // Permission granted -> Send location payload
  const sendOutcome = governor.handleBotLocationRequest(true, { lat: 35.6892, lon: 51.3890 });
  assert.strictEqual(sendOutcome.action, 'send_location_payload');
  assert.strictEqual(sendOutcome.latitude, 35.6892);
  assert.strictEqual(sendOutcome.longitude, 51.3890);
  console.log('Test 6 Passed: Bot keyboard location request flow verified.');
}

// Test 7: Batch Drop Single Image (No album formed)
{
  const singleImage = [{ name: 'avatar.jpg', sizeBytes: 10000, mimeType: 'image/jpeg', isImage: true }];
  const res = governor.processBatchDroppedFiles(singleImage);
  assert.strictEqual(res.willFormAlbum, false);
  assert.strictEqual(res.imagesToGroupInAlbum.length, 1);
  console.log('Test 7 Passed: Single image drop without album grouping verified.');
}

console.log('=== ALL PHASE 139 TESTS PASSED (100% HEALTH) ===');
