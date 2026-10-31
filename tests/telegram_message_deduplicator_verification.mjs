import { strict as assert } from 'node:assert';
import { TelegramMessageDeduplicator } from '../dist-test-dedup/src/utils/telegramMessageDeduplicator.js';

console.log('🧪 Starting TelegramMessageDeduplicator Verification Suite...');

const nowSec = Math.floor(Date.now() / 1000);
const nowMs = nowSec * 1000;

// Instantiate with fixed epoch for test determinism
const deduplicator = TelegramMessageDeduplicator.getInstance({
  maxEntriesPerPeer: 5,
  maxTotalEntries: 20,
  catchUpPolicy: 'live_only',
  connectionEpochMs: nowMs,
  clockSkewGraceMs: 2000
});

// 1. Singleton check
assert.ok(deduplicator);
console.log('  ✅ Check 1: Singleton instantiation verified');

// 2. Normal live message acceptance
const liveMsg = {
  id: 1001,
  peerId: '-1001234567890',
  date: nowSec + 1, // Fresh message
  out: false,
  fromId: '987654321'
};

const d1 = deduplicator.evaluate(liveMsg, '111222333');
assert.strictEqual(d1.shouldProcess, true);
assert.strictEqual(d1.reason, 'new_live_message');
assert.strictEqual(d1.isDuplicate, false);
assert.strictEqual(d1.isCatchUp, false);
console.log('  ✅ Check 2: Live message acceptance verified');

// 3. Immediate duplicate rejection
const d2 = deduplicator.evaluate(liveMsg, '111222333');
assert.strictEqual(d2.shouldProcess, false);
assert.strictEqual(d2.reason, 'duplicate_suppressed');
assert.strictEqual(d2.isDuplicate, true);
console.log('  ✅ Check 3: Duplicate suppression verified');

// 4. Outgoing self-message echo suppression
const outMsg = {
  id: 1002,
  peerId: '-1001234567890',
  date: nowSec + 2,
  out: true,
  fromId: '111222333'
};
const d3 = deduplicator.evaluate(outMsg, '111222333');
assert.strictEqual(d3.shouldProcess, false);
assert.strictEqual(d3.reason, 'self_echo_suppressed');
console.log('  ✅ Check 4: Outgoing message echo suppression verified');

// 5. Matching currentUserId self-echo suppression (even if out flag is missing)
const selfMsg = {
  id: 1003,
  peerId: '-1001234567890',
  date: nowSec + 3,
  out: false,
  fromId: '111222333' // Same as current user
};
const d4 = deduplicator.evaluate(selfMsg, '111222333');
assert.strictEqual(d4.shouldProcess, false);
assert.strictEqual(d4.reason, 'self_echo_suppressed');
console.log('  ✅ Check 5: User ID self-origin echo suppression verified');

// 6. Historical catch-up dropped under live_only
const oldMsg = {
  id: 500,
  peerId: '-1001234567890',
  date: nowSec - 3600, // 1 hour old (catch-up replay)
  out: false,
  fromId: '987654321'
};
const d5 = deduplicator.evaluate(oldMsg, '111222333');
assert.strictEqual(d5.shouldProcess, false);
assert.strictEqual(d5.reason, 'historical_dropped');
assert.strictEqual(d5.isCatchUp, true);
console.log('  ✅ Check 6: Historical catch-up drop under live_only verified');

// 7. Telemetry inspection
const telemetry = deduplicator.getTelemetry();
assert.strictEqual(telemetry.duplicateCount, 1);
assert.strictEqual(telemetry.historicalDroppedCount, 1);
assert.strictEqual(telemetry.processedCount, 1);
assert.ok(telemetry.trackedPeers >= 1);
console.log('  ✅ Check 7: Telemetry counters verified');

console.log('🎉 ALL 7 CHECKS PASSED SUCCESSFULLY!');
