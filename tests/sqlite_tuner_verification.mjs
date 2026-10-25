import test from 'node:test'
import assert from 'node:assert/strict'
import { SqliteTuner } from '../electron/telegram/sqliteTuner.ts'

test('SqliteTuner: applyHardenedPragmas executes all 7 production pragmas', () => {
  const appliedPragmas = []
  const mockDb = {
    pragma: (str) => {
      appliedPragmas.push(str)
    }
  }

  const result = SqliteTuner.applyHardenedPragmas(mockDb)
  assert.equal(result, true)
  assert.equal(appliedPragmas.length, 7)
  assert.ok(appliedPragmas.includes('journal_mode = WAL'))
  assert.ok(appliedPragmas.includes('synchronous = NORMAL'))
  assert.ok(appliedPragmas.includes('busy_timeout = 5000'))
  assert.ok(appliedPragmas.includes('cache_size = -64000'))
  assert.ok(appliedPragmas.includes('temp_store = MEMORY'))
  assert.ok(appliedPragmas.includes('mmap_size = 268435456'))
  assert.ok(appliedPragmas.includes('foreign_keys = ON'))
})

test('SqliteTuner: checkpointWal calls wal_checkpoint with specified mode', () => {
  let executedPragma = ''
  const mockDb = {
    pragma: (str) => {
      executedPragma = str
      return [{ busy: 0, log: 12, checkpointed: 12 }]
    }
  }

  const res = SqliteTuner.checkpointWal(mockDb, 'TRUNCATE')
  assert.equal(executedPragma, 'wal_checkpoint(TRUNCATE)')
  assert.equal(res.busy, 0)
  assert.equal(res.log, 12)
  assert.equal(res.checkpointed, 12)
})

test('SqliteTuner: getPragmaStatus returns complete SQLite health telemetry', () => {
  const mockDb = {
    pragma: (name) => {
      if (name === 'journal_mode') return 'wal'
      if (name === 'synchronous') return 1
      if (name === 'busy_timeout') return 5000
      if (name === 'cache_size') return -64000
      if (name === 'temp_store') return 2
      if (name === 'mmap_size') return 268435456
      if (name === 'foreign_keys') return 1
      return null
    }
  }

  const status = SqliteTuner.getPragmaStatus(mockDb)
  assert.equal(status.journalMode, 'wal')
  assert.equal(status.synchronous, 1)
  assert.equal(status.busyTimeout, 5000)
  assert.equal(status.cacheSize, -64000)
  assert.equal(status.mmapSize, 268435456)
  assert.equal(status.foreignKeys, true)
})

test('SqliteTuner: Graceful resilience on null or faulty database handles', () => {
  assert.equal(SqliteTuner.applyHardenedPragmas(null), false)
  const checkpoint = SqliteTuner.checkpointWal(null)
  assert.deepEqual(checkpoint, { busy: 0, log: 0, checkpointed: 0 })

  const faultyDb = {
    pragma: () => { throw new Error('Database locked') }
  }
  assert.equal(SqliteTuner.applyHardenedPragmas(faultyDb), false)
})
