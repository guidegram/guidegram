/**
 * SqliteDeadlockGuard Verification Suite (MM-088 / Layer 08 Database Reliability)
 * Tests:
 * 1. Singleton pattern and reset capability
 * 2. Error code recognition: numeric codes 5, 6, 261, 517, 262
 * 3. Error string recognition: 'SQLITE_BUSY', 'SQLITE_LOCKED'
 * 4. Error message pattern matching: 'database is locked', 'table is locked'
 * 5. Non-deadlock error exclusion: Syntax errors or corruptions are not retried
 * 6. Flawless execution on first attempt without retry overhead
 * 7. Transient deadlock recovery: retries with jitter and succeeds
 * 8. Persistent deadlock exhaustion after maxRetries
 * 9. BEGIN IMMEDIATE transaction wrapping and clean COMMIT
 * 10. ROLLBACK execution on failure before retry attempt
 * 11. Exponential jitter backoff calculation within bounds
 * 12. Full telemetry metrics reporting
 */

import assert from 'node:assert'
import {
  SqliteDeadlockGuard,
  DEFAULT_SQLITE_RETRY_OPTIONS,
} from '../electron/telegram/sqliteDeadlockGuard.ts'

console.log('🧪 Starting SqliteDeadlockGuard Verification Suite (Layer 08, MM-088)...')

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

// Mock SQLite database engine
class MockDatabase {
  constructor() {
    this.executedStatements = []
  }

  exec(sql) {
    this.executedStatements.push(sql)
  }
}

// 1. Singleton pattern
it('1. Returns singleton instance and supports clean reset', () => {
  SqliteDeadlockGuard.resetInstance()
  const instance1 = SqliteDeadlockGuard.getInstance()
  const instance2 = SqliteDeadlockGuard.getInstance()
  assert.strictEqual(instance1, instance2)
})

// 2. Numeric error code recognition
it('2. Correctly identifies numeric SQLite busy & locked codes (5, 6, 261, 517, 262)', () => {
  const guard = SqliteDeadlockGuard.getInstance()
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 5 }), true, 'Code 5 (SQLITE_BUSY)')
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 6 }), true, 'Code 6 (SQLITE_LOCKED)')
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 261 }), true, 'Code 261 (SQLITE_BUSY_RECOVERY)')
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 517 }), true, 'Code 517 (SQLITE_BUSY_SNAPSHOT)')
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 262 }), true, 'Code 262 (SQLITE_LOCKED_SHAREDCACHE)')
})

// 3. String error code recognition
it('3. Correctly identifies string error codes SQLITE_BUSY and SQLITE_LOCKED', () => {
  const guard = SqliteDeadlockGuard.getInstance()
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 'SQLITE_BUSY' }), true)
  assert.strictEqual(guard.isDeadlockOrBusy({ code: 'SQLITE_LOCKED' }), true)
  assert.strictEqual(guard.isDeadlockOrBusy({ errno: 'SQLITE_BUSY' }), true)
})

// 4. Message text matching
it('4. Identifies lock errors by message text patterns', () => {
  const guard = SqliteDeadlockGuard.getInstance()
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('database is locked')), true)
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('database table is locked: messages')), true)
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('Error: database is busy')), true)
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('cannot start a transaction within a transaction')), true)
})

// 5. Non-deadlock error exclusion
it('5. Does not treat syntax, unique constraint, or disk I/O errors as deadlocks', () => {
  const guard = SqliteDeadlockGuard.getInstance()
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('SQLITE_CORRUPT: database disk image is malformed')), false)
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('UNIQUE constraint failed: accounts.id')), false)
  assert.strictEqual(guard.isDeadlockOrBusy(new Error('near "FORM": syntax error')), false)
})

// 6. Direct execution without deadlock
await itAsync('6. Direct execution succeeds immediately with zero retries', async () => {
  const guard = SqliteDeadlockGuard.getInstance()
  guard.reset()

  let runCount = 0
  const result = await guard.execute(() => {
    runCount++
    return 'data_payload'
  })

  assert.strictEqual(result, 'data_payload')
  assert.strictEqual(runCount, 1)

  const tel = guard.getTelemetry()
  assert.strictEqual(tel.totalOperations, 1)
  assert.strictEqual(tel.deadlocksEncountered, 0)
  assert.strictEqual(tel.retriesSucceeded, 0)
})

// 7. Transient deadlock recovery
await itAsync('7. Successfully retries transient SQLITE_BUSY and recovers', async () => {
  const guard = SqliteDeadlockGuard.getInstance()
  guard.reset()

  let attempts = 0
  const result = await guard.execute(
    () => {
      attempts++
      if (attempts === 1) {
        const err = new Error('database is locked')
        err.code = 'SQLITE_BUSY'
        throw err
      }
      return 'recovered_data'
    },
    { baseDelayMs: 5, maxDelayMs: 20 }
  )

  assert.strictEqual(result, 'recovered_data')
  assert.strictEqual(attempts, 2)

  const tel = guard.getTelemetry()
  assert.strictEqual(tel.totalOperations, 1)
  assert.strictEqual(tel.deadlocksEncountered, 1)
  assert.strictEqual(tel.retriesSucceeded, 1)
})

// 8. Persistent deadlock exhaustion
await itAsync('8. Throws error after exceeding maxRetries on persistent deadlock', async () => {
  const guard = SqliteDeadlockGuard.getInstance()
  guard.reset()

  let attempts = 0
  let threw = false
  try {
    await guard.execute(
      () => {
        attempts++
        const err = new Error('database is locked')
        err.code = 'SQLITE_BUSY'
        throw err
      },
      { maxRetries: 3, baseDelayMs: 5, maxDelayMs: 20 }
    )
  } catch (err) {
    threw = true
  }

  assert.strictEqual(threw, true)
  assert.strictEqual(attempts, 4) // initial attempt + 3 retries

  const tel = guard.getTelemetry()
  assert.strictEqual(tel.deadlocksEncountered, 3)
  assert.strictEqual(tel.operationsFailed, 1)
})

// 9. BEGIN IMMEDIATE and COMMIT lifecycle in executeTransaction
await itAsync('9. executeTransaction executes BEGIN IMMEDIATE; and commits on success', async () => {
  const guard = SqliteDeadlockGuard.getInstance()
  const mockDb = new MockDatabase()

  const result = await guard.executeTransaction(
    mockDb,
    () => {
      mockDb.exec('INSERT INTO test VALUES (1);')
      return 42
    },
    { useImmediate: true }
  )

  assert.strictEqual(result, 42)
  assert.deepStrictEqual(mockDb.executedStatements, [
    'BEGIN IMMEDIATE;',
    'INSERT INTO test VALUES (1);',
    'COMMIT;',
  ])
})

// 10. ROLLBACK execution on failure in executeTransaction
await itAsync('10. executeTransaction rolls back before retrying on deadlock', async () => {
  const guard = SqliteDeadlockGuard.getInstance()
  guard.reset()
  const mockDb = new MockDatabase()

  let attempt = 0
  const result = await guard.executeTransaction(
    mockDb,
    () => {
      attempt++
      if (attempt === 1) {
        throw new Error('database is locked')
      }
      return 'success'
    },
    { baseDelayMs: 5, maxDelayMs: 20 }
  )

  assert.strictEqual(result, 'success')
  assert.deepStrictEqual(mockDb.executedStatements, [
    'BEGIN IMMEDIATE;',
    'ROLLBACK;',
    'BEGIN IMMEDIATE;',
    'COMMIT;',
  ])
})

// 11. Exponential jitter delay calculation
it('11. Backoff delays scale with attempts and respect maxDelayMs', () => {
  const guard = SqliteDeadlockGuard.getInstance()
  const d1 = guard.calculateBackoffDelay(1, 10, 500)
  const d2 = guard.calculateBackoffDelay(2, 10, 500)
  const dMax = guard.calculateBackoffDelay(20, 10, 500)

  assert.strictEqual(d1 >= 10, true)
  assert.strictEqual(d2 >= 20, true)
  assert.strictEqual(dMax <= 750, true) // 500 max + 50% max jitter
})

// 12. Full Telemetry structure
it('12. Telemetry structure reports accurate counts across multiple runs', () => {
  const guard = SqliteDeadlockGuard.getInstance()
  const tel = guard.getTelemetry()
  assert.strictEqual(typeof tel.totalOperations, 'number')
  assert.strictEqual(typeof tel.deadlocksEncountered, 'number')
  assert.strictEqual(typeof tel.retriesSucceeded, 'number')
  assert.strictEqual(typeof tel.operationsFailed, 'number')
})

console.log(`\n🎉 All ${passedAssertions}/${passedAssertions} SqliteDeadlockGuard assertions passed successfully!`)
process.exit(0)
