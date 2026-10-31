import assert from 'node:assert';
import { MtprotoNetworkHardener } from '../electron/telegram/mtprotoNetworkHardener.ts';

console.log('Testing MtprotoNetworkHardener Killswitch Circuit Breaker (tdesktop #30042 Guard)...');

const hardener = MtprotoNetworkHardener.getInstance();

// 1. Instant rejection under 100ms (e.g. 1ms socket connect rejected by iptables/WFP)
const result1 = hardener.calculateKillswitchGuardedDelay(0, 2, undefined, 1500, () => 0.5);
assert.strictEqual(result1.isInstantRejection, true, 'Sub-100ms connection should be flagged as instant rejection');
assert.strictEqual(result1.delayMs, 1875, '1500ms * 1.0 + 375ms jitter = 1875ms');

// 2. Refusal error with snippet (ECONNREFUSED) even if elapsed time is > 100ms
const result2 = hardener.calculateKillswitchGuardedDelay(1, 150, 'connect ECONNREFUSED 149.154.167.50:443', 1500, () => 0);
assert.strictEqual(result2.isInstantRejection, true, 'ECONNREFUSED snippet should trigger circuit breaker');
assert.strictEqual(result2.delayMs, 2250, '1500ms * 1.5^1 = 2250ms with 0 jitter');

// 3. Normal slow timeout (e.g. 10000ms timeout with no refusal error)
const result3 = hardener.calculateKillswitchGuardedDelay(0, 10000, 'ETIMEDOUT', 1500, () => 0);
assert.strictEqual(result3.isInstantRejection, false, 'Standard timeout should not trip instant rejection clamp');
assert.strictEqual(result3.delayMs, 0, 'No delay clamp returned for standard timeout');

// 4. Max clamp capping at 30,000ms
const result4 = hardener.calculateKillswitchGuardedDelay(10, 5, 'WSAECONNREFUSED', 1500, () => 0);
assert.strictEqual(result4.isInstantRejection, true);
assert.ok(result4.delayMs <= 30000, 'Delay should be capped at 30,000ms');

// 5. Telemetry counter verification
const telemetry = hardener.getTelemetry();
assert.ok(telemetry.instantRejectionClampsCount >= 3, 'Telemetry counter should record instant rejection clamps');

console.log('ALL 5 MTPROTO KILLSWITCH CIRCUIT BREAKER CHECKS PASSED SUCCESSFULLY!');
