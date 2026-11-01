import assert from 'node:assert/strict';
import { CrossClientCdnAuthVideoNoteAndRecoveryGovernor } from '../src/services/crossClientCdnAuthVideoNoteAndRecoveryGovernor.ts';

console.log('🧪 Starting Phase 162: Cross-Client (TDLib & iOS) CDN, Auth, VideoNote, and Recovery Hardening Test Suite...');

const governor = new CrossClientCdnAuthVideoNoteAndRecoveryGovernor();

// =========================================================================
// Test 1: tdlib/td #3701 - CDN Range Request with Non-Zero Offset
// =========================================================================
console.log('Testing tdlib/td #3701: CDN partial range streaming with non-zero offset...');
{
  // User seeks to offset 300,000 bytes (part 2, since 128KB = 131,072 bytes per part)
  const cdnRes = governor.calculateCdnRangeRequest({
    fileId: 'video_file_7788',
    streamingOffset: 300000,
    requestLength: 65536,
    partSize: 131072,
    cdnDcId: 5
  });

  assert.equal(cdnRes.useCdn, true); // CDN acceleration remains enabled!
  assert.equal(cdnRes.partIndex, 2); // 300000 / 131072 = 2.288 -> part 2
  assert.equal(cdnRes.offsetInsidePart, 300000 % 131072);
  assert.ok(cdnRes.cdnEndpointUrl.includes('https://cdn5.telegram.org/part/video_file_7788/2'));
  console.log('✅ tdlib/td #3701: CDN range streaming verified.');
}

// =========================================================================
// Test 2: tdlib/td #173 - Video Note Message Caption Support
// =========================================================================
console.log('Testing tdlib/td #173: Video note caption formatting and backwards compatibility...');
{
  const vnWithCaption = governor.formatVideoNoteMessage('msg_vn_1', 'file_vn_1', 12, 'Check out this quick video note!');
  assert.equal(vnWithCaption.messageId, 'msg_vn_1');
  assert.equal(vnWithCaption.captionText, 'Check out this quick video note!');
  assert.equal(vnWithCaption.length, 240);

  const vnNoCaption = governor.formatVideoNoteMessage('msg_vn_2', 'file_vn_2', 5);
  assert.equal(vnNoCaption.captionText, undefined);
  console.log('✅ tdlib/td #173: Video note caption compatibility verified.');
}

// =========================================================================
// Test 3: tdlib/td #3617 - Message History Gap Detection and Backfill
// =========================================================================
console.log('Testing tdlib/td #3617: Message sequence gap detection and backfill range...');
{
  const chatId = 'chat_sync_1';

  // Normal consecutive message (id: 100)
  const noGap1 = governor.recordMessageAndDetectGaps(chatId, 100);
  assert.equal(noGap1, null);

  // Next consecutive message (id: 101)
  const noGap2 = governor.recordMessageAndDetectGaps(chatId, 101);
  assert.equal(noGap2, null);

  // Jump to id: 145! (Missing 102 through 144 = 43 messages gap)
  const gapDetected = governor.recordMessageAndDetectGaps(chatId, 145);
  assert.ok(gapDetected);
  assert.equal(gapDetected.gapStartId, 102);
  assert.equal(gapDetected.gapEndId, 144);
  assert.equal(gapDetected.missingCount, 43);
  console.log('✅ tdlib/td #3617: Message history gap backfill verified.');
}

// =========================================================================
// Test 4: Telegram-iOS #1291 - Multi-Channel Auth Fallback Progression
// =========================================================================
console.log('Testing Telegram-iOS #1291: Multi-channel auth fallback state machine...');
{
  const phone = '+15551234567';
  const initial = governor.initializeAuthFlow(phone);
  assert.equal(initial.currentChannel, 'in_app');
  assert.equal(initial.nextAvailableChannel, 'sms');

  // Advance channel (SMS)
  const stageSms = governor.advanceAuthChannel(phone);
  assert.equal(stageSms.currentChannel, 'sms');
  assert.equal(stageSms.nextAvailableChannel, 'email');

  // Advance channel (Email)
  const stageEmail = governor.advanceAuthChannel(phone);
  assert.equal(stageEmail.currentChannel, 'email');
  assert.equal(stageEmail.nextAvailableChannel, 'call');

  // Advance channel (Call)
  const stageCall = governor.advanceAuthChannel(phone);
  assert.equal(stageCall.currentChannel, 'call');
  assert.equal(stageCall.nextAvailableChannel, 'none');
  console.log('✅ Telegram-iOS #1291: Multi-channel auth fallback verified.');
}

// =========================================================================
// Test 5: Telegram-iOS #963 - Email Verification Code Validation
// =========================================================================
console.log('Testing Telegram-iOS #963: Email 6-digit verification code validation...');
{
  const validCode = governor.validateEmailAuthCode('123456');
  assert.equal(validCode.isValid, true);

  const invalidLength = governor.validateEmailAuthCode('12345');
  assert.equal(invalidLength.isValid, false);
  assert.ok(invalidLength.error?.includes('must be exactly 6 digits'));

  const invalidAlpha = governor.validateEmailAuthCode('12A456');
  assert.equal(invalidAlpha.isValid, false);
  console.log('✅ Telegram-iOS #963: Email verification code validation verified.');
}

// =========================================================================
// Test 6: Telegram-iOS #1105 - Force SMS Auth Code Bypass
// =========================================================================
console.log('Testing Telegram-iOS #1105: Force SMS verification code request...');
{
  const phone = '+447700900123';
  const status = governor.initializeAuthFlow(phone);
  assert.equal(governor.canForceSmsFallback(status), true);

  const forced = governor.advanceAuthChannel(phone, true);
  assert.equal(forced.currentChannel, 'sms');
  console.log('✅ Telegram-iOS #1105: Force SMS auth fallback verified.');
}

// =========================================================================
// Test 7: Telegram-iOS #1208 - Database Corruption Safe Recovery Mode
// =========================================================================
console.log('Testing Telegram-iOS #1208: Corrupted database auto-recovery and backup...');
{
  // Normal boot
  const healthy = governor.evaluateDatabaseHealthAndRecover(false);
  assert.equal(healthy.isHealthy, true);
  assert.equal(healthy.actionTaken, 'normal_boot');

  // Corrupted database detected
  const recovered = governor.evaluateDatabaseHealthAndRecover(true);
  assert.equal(recovered.isHealthy, true);
  assert.equal(recovered.recoveredFromCorrupt, true);
  assert.equal(recovered.actionTaken, 'repaired_and_restored');
  assert.ok(recovered.backupFileName?.startsWith('corrupted_db_backup_'));
  console.log('✅ Telegram-iOS #1208: Database crash recovery verified.');
}

console.log('🎉 Phase 162: All 7 Cross-Client hardening tests PASSED with 100% precision!');
