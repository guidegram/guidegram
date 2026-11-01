import assert from 'node:assert/strict';
import { TdlibFilePartTtlPresenceAndLogGovernor } from '../src/services/tdlibFilePartTtlPresenceAndLogGovernor.ts';

console.log('🧪 Starting Phase 153: TDLib File Part, Empty Photo, TTL Countdown, Chat ID, Presence & Log Tests...\n');

const governor = new TdlibFilePartTtlPresenceAndLogGovernor();

// ============================================================================
// 1. tdlib/td#550 - readFilePart Chunk Streaming
// ============================================================================
console.log('👉 Testing Case 1: readFilePart Query & Chunk Slicing (tdlib/td#550)...');
const partQuery = governor.buildReadFilePartQuery(101, 1024, 2048);
assert.equal(partQuery['@type'], 'readFilePart');
assert.equal(partQuery.file_id, 101);
assert.equal(partQuery.offset, 1024);
assert.equal(partQuery.count, 2048);

const fakeBuffer = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
const slice = governor.sliceFileChunk(fakeBuffer, 2, 4);
assert.equal(slice.length, 4);
assert.equal(slice[0], 30);
assert.equal(slice[3], 60);
console.log('✅ Case 1 passed: readFilePart queries and buffer slicing verified.\n');

// ============================================================================
// 2. tdlib/td#3583 - photoEmpty / photoSizeEmpty Graceful Handling
// ============================================================================
console.log('👉 Testing Case 2: photoEmpty Handling (tdlib/td#3583)...');
// Null or empty photo object
const emptyResult1 = governor.normalizePhotoObject(null);
assert.equal(emptyResult1.isEmpty, true);
assert.equal(emptyResult1.placeholderColor, '#2b313b');

// photoEmpty type
const emptyResult2 = governor.normalizePhotoObject({ '@type': 'photoEmpty', id: 0 });
assert.equal(emptyResult2.isEmpty, true);

// Valid photo with sizes
const validPhoto = {
  id: 12345,
  sizes: [
    { '@type': 'photoSize', width: 100, height: 100, photo: { id: 501 } },
    { '@type': 'photoSize', width: 800, height: 800, photo: { id: 502 } },
  ],
};
const validResult = governor.normalizePhotoObject(validPhoto);
assert.equal(validResult.isEmpty, false);
assert.equal(validResult.fileId, 502);
assert.equal(validResult.width, 800);
console.log('✅ Case 2 passed: photoEmpty and photoSizeEmpty handled without null crashes.\n');

// ============================================================================
// 3. tdlib/td#3768 - Auto-Delete TTL Self-Destruct Timer
// ============================================================================
console.log('👉 Testing Case 3: Auto-Delete TTL Timer (tdlib/td#3768)...');
const sentSec = 1700000000;
const ttlSec = 86400; // 24 hours

// 12 hours remaining
const midCheck = governor.calculateMessageTtlCountdown(sentSec, ttlSec, sentSec + 43200);
assert.equal(midCheck.hasTtl, true);
assert.equal(midCheck.remainingSeconds, 43200);
assert.equal(midCheck.isSelfDestructed, false);
assert.equal(midCheck.displayCountdown, '12h 0m left');

// Expired message
const expiredCheck = governor.calculateMessageTtlCountdown(sentSec, ttlSec, sentSec + 86401);
assert.equal(expiredCheck.isSelfDestructed, true);
assert.equal(expiredCheck.remainingSeconds, 0);
assert.equal(expiredCheck.displayCountdown, 'Expired');
console.log('✅ Case 3 passed: Auto-delete countdown accurately detects self-destruct state.\n');

// ============================================================================
// 4. tdlib/td#2591 - Chat ID Translation (Bot API <-> TDLib)
// ============================================================================
console.log('👉 Testing Case 4: Chat ID Translation (tdlib/td#2591)...');
// Bot API Channel ID to TDLib supergroup ID
const rawBotChannelId = '-1001234567890';
const supergroupId = governor.convertChatId(rawBotChannelId, 'tdlib_supergroup_id');
assert.equal(supergroupId, 1234567890);

// TDLib supergroup ID back to Bot API channel ID
const backToBotId = governor.convertChatId(supergroupId, 'bot_api_channel_id');
assert.equal(backToBotId, '-1001234567890');

// Basic group ID preserves negative sign
const basicGroupId = governor.convertChatId('-987654321', 'bot_api_channel_id');
assert.equal(basicGroupId, -987654321);
console.log('✅ Case 4 passed: Chat ID conventions convert bi-directionally without corruption.\n');

// ============================================================================
// 5. tdlib/td#1260 - Online Presence Manager & Idle Tracking
// ============================================================================
console.log('👉 Testing Case 5: Online Presence & Idle Detection (tdlib/td#1260)...');
const tNow = 1000000;

// User active in focused app
const activeState = governor.updatePresenceState(true, tNow - 5000, tNow, 60000);
assert.equal(activeState.isOnline, true);
assert.equal(activeState.reason, 'user_active');
assert.equal(activeState.tdlibQuery.value.value, true);

// App unfocused (minimized / tab hidden)
const unfocusedState = governor.updatePresenceState(false, tNow - 5000, tNow, 60000);
assert.equal(unfocusedState.isOnline, false);
assert.equal(unfocusedState.reason, 'app_unfocused');

// App focused but user idle > 60s
const idleState = governor.updatePresenceState(true, tNow - 70000, tNow, 60000);
assert.equal(idleState.isOnline, false);
assert.equal(idleState.reason, 'user_idle');
console.log('✅ Case 5 passed: Online presence accurately tracks window focus and user idle states.\n');

// ============================================================================
// 6. tdlib/td#926 - Log Management & Size Limiter
// ============================================================================
console.log('👉 Testing Case 6: Log Rotation & Verbosity (tdlib/td#926)...');
const logConfig = governor.configureLogManagement(2, 5 * 1024 * 1024, 'guidegram_tdlib.log');
assert.equal(logConfig.verbosityLevel, 2);
assert.equal(logConfig.maxLogSizeBytes, 5 * 1024 * 1024);
assert.equal(logConfig.tdlibQuery['@type'], 'setLogStream');
assert.equal(logConfig.tdlibQuery.log_stream.max_file_size, 5 * 1024 * 1024);
console.log('✅ Case 6 passed: Log file rotation and verbosity level bounded.\n');

// ============================================================================
// 7. tdlib/td#312 - E.164 Phone Normalization & Anti-Spam Throttle
// ============================================================================
console.log('👉 Testing Case 7: Phone Normalization & Spam Throttle (tdlib/td#312)...');
const t0 = 5000000;

// Formatted phone normalized to E.164
const phone1 = governor.normalizePhoneNumber('+1 (689) 292-0247', t0);
assert.equal(phone1.isValid, true);
assert.equal(phone1.e164Phone, '+16892920247');

// Immediate resubmission within 5s throttle window is blocked
const phoneSpam = governor.normalizePhoneNumber('+1 (689) 292-0247', t0 + 1000);
assert.equal(phoneSpam.isValid, false);
assert.ok(phoneSpam.error.includes('rate limited'));
assert.ok(phoneSpam.cooldownRemainingMs > 0);

// Submission after 6s cooldown succeeds
const phoneAfterCooldown = governor.normalizePhoneNumber('+98 912 345 6789', t0 + 6000);
assert.equal(phoneAfterCooldown.isValid, true);
assert.equal(phoneAfterCooldown.e164Phone, '+989123456789');
console.log('✅ Case 7 passed: Phone normalization and anti-ban submission throttle verified.\n');

console.log('🎉 ALL 7 PHASE 153 HARDENING TESTS PASSED WITH 100% SUCCESS!');
