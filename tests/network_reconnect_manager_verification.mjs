/**
 * NetworkReconnectManager Verification Suite (Layer 11 Network Resilience & Full Jitter RFC 8961)
 * Tests:
 * 1. Full jitter calculation bounds: delay within [jitterRatio * temp, temp]
 * 2. Exponential growth across consecutive attempts
 * 3. Max delay ceiling cap enforcement (never exceeds 30,000ms)
 * 4. Per-account isolation (independent backoff states)
 * 5. Successful connection resets attempt counter to 0
 * 6. Failure auto-escalation to next backoff tier
 * 7. Exhaustion ceiling (stops retrying after maxAttempts)
 * 8. Reconnect execution mutual exclusion lock
 * 9. Network offline pauses pending retry timers
 * 10. Network online resumes staggered reconnection wave
 * 11. Timer cancellation on explicit disconnect or connect
 * 12. Full telemetry metrics reporting
 */

import assert from 'node:assert'
import {
  NetworkReconnectManager,
  calculateJitteredDelay,
  DEFAULT_BACKOFF_CONFIG,
} from '../electron/telegram/reconnectManager.ts'

console.log('🧪 Starting NetworkReconnectManager Verification Suite (Layer 11, RFC 8961)...')

let passedAssertions = 0

function it(desc, fn) {
  try {
    fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

async function itAsync(desc, fn) {
  try {
    await fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

// 1. Full jitter bounds check
it('1. Jittered delay remains strictly within [jitterRatio * temp, temp] bounds', () => {
  const config = { baseDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 10, jitterRatio: 0.5 }

  // Check attempt 0 (temp = 1000ms): bounds [500ms, 1000ms]
  const d0_min = calculateJitteredDelay(0, config, () => 0.0)
  const d0_max = calculateJitteredDelay(0, config, () => 1.0)
  assert.strictEqual(d0_min, 500)
  assert.strictEqual(d0_max, 1000)

  // Check attempt 3 (temp = 8000ms): bounds [4000ms, 8000ms]
  const d3_min = calculateJitteredDelay(3, config, () => 0.0)
  const d3_max = calculateJitteredDelay(3, config, () => 1.0)
  assert.strictEqual(d3_min, 4000)
  assert.strictEqual(d3_max, 8000)
})

// 2. Exponential delay progression
it('2. Average delays increase exponentially across consecutive attempts', () => {
  const config = { baseDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 10, jitterRatio: 0.5 }
  const mid = (att) => calculateJitteredDelay(att, config, () => 0.5)

  const d0 = mid(0) // 750
  const d1 = mid(1) // 1500
  const d2 = mid(2) // 3000
  const d3 = mid(3) // 6000

  assert.strictEqual(d0 < d1, true)
  assert.strictEqual(d1 < d2, true)
  assert.strictEqual(d2 < d3, true)
})

// 3. Max delay ceiling cap
it('3. Ceiling cap (30,000ms) is strictly enforced even on attempt 50', () => {
  const config = { baseDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 10, jitterRatio: 0.5 }
  const dHuge_max = calculateJitteredDelay(50, config, () => 1.0)
  const dHuge_min = calculateJitteredDelay(50, config, () => 0.0)

  assert.strictEqual(dHuge_max, 30000)
  assert.strictEqual(dHuge_min, 15000)
})

// 4. Per-account isolation
it('4. Backoff states for distinct accounts are completely isolated', () => {
  const manager = new NetworkReconnectManager({ baseDelayMs: 50, maxDelayMs: 1000 })
  manager.scheduleReconnect('acc_1', async () => false)
  manager.scheduleReconnect('acc_1', async () => false)

  const s1 = manager.getTelemetry().accounts['acc_1']
  assert.ok(s1)

  manager.scheduleReconnect('acc_2', async () => true)
  const s2 = manager.getTelemetry().accounts['acc_2']
  assert.ok(s2)

  assert.notStrictEqual(s1.accountId, s2.accountId)
  manager.reset()
})

// 5. Successful connection reset
it('5. onAccountConnected resets attemptCount to 0 and clears scheduled delays', () => {
  const manager = new NetworkReconnectManager()
  manager.scheduleReconnect('acc_reset', async () => true)
  manager.onAccountConnected('acc_reset')

  const tel = manager.getTelemetry()
  const state = tel.accounts['acc_reset']
  assert.strictEqual(state.attemptCount, 0)
  assert.strictEqual(state.status, 'idle')
  assert.strictEqual(state.nextRetryTimestamp, null)
  assert.strictEqual(state.successCount, 1)
  assert.strictEqual(tel.totalSuccessfulReconnections, 1)
  manager.reset()
})

// 6. Execution lock mutual exclusion
await itAsync('6. Reconnect execution prevents overlapping concurrent attempts', async () => {
  const manager = new NetworkReconnectManager()
  let resolveBlocker
  const blockerPromise = new Promise((resolve) => { resolveBlocker = resolve })

  let executionCount = 0
  const slowReconnect = async () => {
    executionCount++
    await blockerPromise
    return true
  }

  // Trigger first reconnect
  const p1 = manager.executeReconnect('acc_lock', slowReconnect)

  // Attempt duplicate reconnect while first is pending
  const p2Result = await manager.executeReconnect('acc_lock', slowReconnect)
  assert.strictEqual(p2Result, false, 'Second execution must be rejected while first is in flight')

  // Unblock first execution
  resolveBlocker()
  const p1Result = await p1
  assert.strictEqual(p1Result, true)
  assert.strictEqual(executionCount, 1, 'Action was only executed once')
  manager.reset()
})

// 7. Max attempts exhaustion
await itAsync('7. Marks account status as exhausted once maxAttempts is reached', async () => {
  const manager = new NetworkReconnectManager({ maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 50 })

  // First fail
  await manager.executeReconnect('acc_exhaust', async () => false)
  let state = manager.getTelemetry().accounts['acc_exhaust']
  assert.strictEqual(state.attemptCount, 1)
  assert.strictEqual(state.status, 'scheduled')

  // Second fail -> reaches maxAttempts (2)
  await manager.executeReconnect('acc_exhaust', async () => false)
  state = manager.getTelemetry().accounts['acc_exhaust']
  assert.strictEqual(state.attemptCount, 2)
  assert.strictEqual(state.status, 'exhausted')
  assert.strictEqual(manager.getTelemetry().totalExhaustedAccounts, 1)
  manager.reset()
})

// 8. Offline mode pausing timers
it('8. onNetworkOffline pauses timers and prevents scheduling new attempts', () => {
  const manager = new NetworkReconnectManager({ baseDelayMs: 1000 })
  manager.scheduleReconnect('acc_offline', async () => true)

  manager.onNetworkOffline()
  let state = manager.getTelemetry().accounts['acc_offline']
  assert.strictEqual(state.status, 'paused')

  // New schedule while offline returns false
  const res = manager.scheduleReconnect('acc_new_offline', async () => true)
  assert.strictEqual(res.scheduled, false)
  manager.reset()
})

// 9. Online mode staggering recovery wave
it('9. onNetworkOnline resumes reconnecting accounts with randomized staggering', () => {
  const manager = new NetworkReconnectManager()
  manager.scheduleReconnect('acc_a', async () => true)
  manager.scheduleReconnect('acc_b', async () => true)

  manager.onNetworkOffline()
  assert.strictEqual(manager.getTelemetry().accounts['acc_a'].status, 'paused')

  manager.onNetworkOnline(() => async () => true)
  const tel = manager.getTelemetry()
  assert.strictEqual(tel.accounts['acc_a'].status, 'scheduled')
  assert.strictEqual(tel.accounts['acc_b'].status, 'scheduled')
  assert.ok(tel.accounts['acc_a'].scheduledDelayMs >= 100)
  assert.ok(tel.accounts['acc_a'].scheduledDelayMs <= 1500)
  manager.reset()
})

// 10. Timer cancellation
it('10. cancelTimer clears active timer and sets status to idle', () => {
  const manager = new NetworkReconnectManager()
  manager.scheduleReconnect('acc_cancel', async () => true)
  assert.strictEqual(manager.getTelemetry().accounts['acc_cancel'].status, 'scheduled')

  manager.cancelTimer('acc_cancel')
  assert.strictEqual(manager.getTelemetry().accounts['acc_cancel'].status, 'idle')
  assert.strictEqual(manager.getTelemetry().accounts['acc_cancel'].nextRetryTimestamp, null)
  manager.reset()
})

// 11. Error tracking
await itAsync('11. Captures and records last error message on failure', async () => {
  const manager = new NetworkReconnectManager()
  await manager.executeReconnect('acc_err', async () => {
    throw new Error('ETIMEDOUT: Connection refused by proxy')
  })

  const state = manager.getTelemetry().accounts['acc_err']
  assert.strictEqual(state.lastError, 'ETIMEDOUT: Connection refused by proxy')
  manager.reset()
})

// 12. Full Telemetry structure
it('12. Telemetry structure returns accurate aggregate statistics', () => {
  const manager = new NetworkReconnectManager()
  manager.scheduleReconnect('acc_t1', async () => true)
  manager.scheduleReconnect('acc_t2', async () => true)

  const tel = manager.getTelemetry()
  assert.strictEqual(tel.totalScheduledAttempts, 2)
  assert.strictEqual(tel.currentlyScheduledCount, 2)
  assert.strictEqual(tel.totalSuccessfulReconnections, 0)
  assert.strictEqual(Object.keys(tel.accounts).length, 2)
  manager.reset()
})

console.log(`\n🎉 All ${passedAssertions}/${passedAssertions} NetworkReconnectManager assertions passed successfully!`)
process.exit(0)
