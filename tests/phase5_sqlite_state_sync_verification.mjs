import assert from 'node:assert/strict'
import { LocalDatabaseOptimizer } from '../electron/telegram/localDatabaseOptimizer.ts'

console.log('--- [Phase 5: Local Database Integrity & Instant Message State Sync Verification] ---')

const optimizer = LocalDatabaseOptimizer.getInstance()

// 1. Test Monotonic Message State Synchronization (#4261)
console.log('[Test 1] Validating Monotonic Message State Synchronization across Accounts...')

// Initial state for Account A in Chat 100
const state1 = optimizer.syncMessageState({
  accountId: 'acc_1',
  chatId: 'chat_100',
  readInboxMaxId: 50,
  readOutboxMaxId: 40,
  unreadCount: 5,
  updatedAt: Date.now(),
})

assert.equal(state1.readInboxMaxId, 50, 'Inbox max ID must be 50')
assert.equal(state1.unreadCount, 5, 'Unread count must be 5')

// In-order update: advanced to ID 60
const state2 = optimizer.syncMessageState({
  accountId: 'acc_1',
  chatId: 'chat_100',
  readInboxMaxId: 60,
  readOutboxMaxId: 45,
  unreadCount: 2,
  updatedAt: Date.now(),
})
assert.equal(state2.readInboxMaxId, 60, 'Inbox max ID must advance to 60')

// Out-of-order network push packet arrives late with old ID 48
const stateStale = optimizer.syncMessageState({
  accountId: 'acc_1',
  chatId: 'chat_100',
  readInboxMaxId: 48,
  readOutboxMaxId: 42,
  unreadCount: 7,
  updatedAt: Date.now(),
})

// Monotonic invariant: must NOT regress back to 48!
assert.equal(stateStale.readInboxMaxId, 60, 'Monotonic guard must prevent read state regression to 48')
assert.equal(optimizer.getTelemetry().syncConflictsResolved > 0, true, 'Conflict must be recorded in telemetry')

console.log('✅ [Test 1 Passed] Monotonic state synchronization successfully prevents unread state desync.')

// 2. Test Non-blocking Database Optimization (#62, #902)
console.log('[Test 2] Validating SQLite Integrity Check & Incremental Vacuum Pipeline...')

let pragmaCalls = []
let execCalls = []

const mockDb = {
  pragma: (sql, opts) => {
    pragmaCalls.push(sql)
    if (sql.includes('quick_check')) return 'ok'
    if (sql.includes('wal_checkpoint')) return [{ busy: 0, log: 10, checkpointed: 10 }]
    return null
  },
  exec: (sql) => {
    execCalls.push(sql)
  }
}

const report = await optimizer.optimizeDatabase(mockDb)

assert.equal(report.isIntegrityOk, true, 'Integrity check must report OK')
assert.ok(execCalls.some(s => s.includes('PRAGMA incremental_vacuum')), 'Must trigger incremental vacuum')
assert.ok(execCalls.some(s => s.includes('PRAGMA optimize')), 'Must execute PRAGMA optimize')
assert.equal(optimizer.getTelemetry().optimizationsCount > 0, true, 'Optimization count must increment')

console.log('✅ [Test 2 Passed] SQLite optimization and integrity check pipeline verified.')
console.log('--- ALL PHASE 5 LOCAL DATABASE HARDENING CHECKS PASSED (100% GREEN) ---')
