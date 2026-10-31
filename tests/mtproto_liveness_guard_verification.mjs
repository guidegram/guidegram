import { strict as assert } from 'node:assert';
import { MtprotoNetworkHardener } from '../dist-test-liveness/electron/telegram/mtprotoNetworkHardener.js';

console.log('🧪 Starting MtprotoNetworkHardener Liveness Guard Verification Suite...');

const hardener = MtprotoNetworkHardener.getInstance();

// 1. Singleton check
assert.ok(hardener);
console.log('  ✅ Check 1: Singleton instantiation verified');

const now = 100000;
const pingTimeout = 15000;

// 2. Scenario 1: Normal idle connection, no ping outstanding
const s1 = hardener.evaluateLiveness(
  now,
  now - 5000, // lastPongAt
  now - 5000, // lastPacketAt
  now - 5000, // lastBytesReadAt
  0,          // pingSentAt (none outstanding)
  pingTimeout
);
assert.strictEqual(s1.isHealthy, true);
assert.strictEqual(s1.reason, 'idle_within_timeout');
console.log('  ✅ Check 2: Idle connection without pending ping verified');

// 3. Scenario 2: Pong received after ping
const s2 = hardener.evaluateLiveness(
  now,
  now - 1000, // lastPongAt (arrived after ping)
  now - 1000, // lastPacketAt
  now - 1000, // lastBytesReadAt
  now - 2000, // pingSentAt
  pingTimeout
);
assert.strictEqual(s2.isHealthy, true);
assert.strictEqual(s2.reason, 'pong_received');
console.log('  ✅ Check 3: Pong received verification passed');

// 4. Scenario 3 (gotd/td #1861 CRITICAL CASE):
// Ping was sent 20s ago (> 15s pingTimeout). Pong has NOT arrived because it's queued behind a 100KB response.
// BUT raw bytes or valid packets are actively arriving (arrived 1s ago)!
const s3 = hardener.evaluateLiveness(
  now,
  now - 25000, // lastPongAt (stale)
  now - 500,   // lastPacketAt (active packet arrived 500ms ago)
  now - 100,   // lastBytesReadAt (raw bytes arrived 100ms ago)
  now - 20000, // pingSentAt (sent 20s ago, > pingTimeout!)
  pingTimeout
);
assert.strictEqual(s3.isHealthy, true, 'Connection MUST NOT be dropped when traffic is actively streaming!');
assert.strictEqual(s3.reason, 'packet_received');
console.log('  ✅ Check 4: Slow-link progress-aware ping immunity verified (gotd/td #1861 parity)');

// 5. Scenario 4: Raw socket bytes arriving without full packet yet
const s4 = hardener.evaluateLiveness(
  now,
  now - 30000, // lastPongAt (old)
  now - 25000, // lastPacketAt (old)
  now - 200,   // lastBytesReadAt (TCP chunk read 200ms ago)
  now - 20000, // pingSentAt (20s ago)
  pingTimeout
);
assert.strictEqual(s4.isHealthy, true);
assert.strictEqual(s4.reason, 'inbound_traffic_active');
console.log('  ✅ Check 5: Inbound raw byte stream extension verified');

// 6. Scenario 5: True Dead Connection (No pong, no packets, no bytes for 25s)
const s5 = hardener.evaluateLiveness(
  now,
  now - 25000,
  now - 25000,
  now - 25000,
  now - 20000, // ping sent 20s ago
  pingTimeout
);
assert.strictEqual(s5.isHealthy, false, 'Connection must be declared dead after full timeout with zero traffic');
assert.strictEqual(s5.reason, 'connection_dead');
console.log('  ✅ Check 6: Dead connection detection verified');

// 7. Telemetry inspection
const telemetry = hardener.getTelemetry();
assert.ok(telemetry.inboundTrafficSavedDropsCount >= 2, 'Must record false drops prevented');
console.log('  ✅ Check 7: False drop prevention telemetry verified');

console.log('🎉 ALL 7 CHECKS PASSED SUCCESSFULLY!');
