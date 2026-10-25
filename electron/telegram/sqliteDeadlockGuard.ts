/**
 * SqliteDeadlockGuard (MM-088 / Layer 08 Database Reliability & Deadlock Prevention)
 * 
 * Protects SQLite operations against concurrent lock contention, deadlocks, and write starvation:
 * 1. Deadlock & Lock Detection:
 *    Identifies SQLITE_BUSY (5), SQLITE_LOCKED (6), SQLITE_BUSY_RECOVERY (261),
 *    SQLITE_BUSY_SNAPSHOT (517), and SQLITE_LOCKED_SHAREDCACHE (262).
 * 2. Immediate Transaction Pattern (BEGIN IMMEDIATE):
 *    Prevents classic SQLite lock escalation deadlocks (where two connections hold SHARED
 *    locks and both attempt to upgrade to RESERVED/EXCLUSIVE locks simultaneously).
 * 3. Exponential Jitter Backoff Retry:
 *    Retries lock-contended operations with decorrelated jittered delays.
 * 4. Safe Rollback Guarantee:
 *    Ensures failed transactions roll back cleanly to release locks before retrying.
 * 5. Telemetry & Metrics:
 *    Tracks total deadlocks, retries succeeded, and abort rates.
 */

export interface SqliteRetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  useImmediate?: boolean
  label?: string
}

export const DEFAULT_SQLITE_RETRY_OPTIONS: Required<SqliteRetryOptions> = {
  maxRetries: 5,
  baseDelayMs: 25,
  maxDelayMs: 1500,
  useImmediate: true,
  label: 'sqlite_op',
}

export interface SqliteDeadlockTelemetry {
  totalOperations: number
  deadlocksEncountered: number
  retriesSucceeded: number
  operationsFailed: number
  maxRetriesObserved: number
}

export class SqliteDeadlockGuard {
  private static instance: SqliteDeadlockGuard | null = null

  // Telemetry metrics
  private totalOperations: number = 0
  private deadlocksEncountered: number = 0
  private retriesSucceeded: number = 0
  private operationsFailed: number = 0
  private maxRetriesObserved: number = 0

  public static getInstance(): SqliteDeadlockGuard {
    if (!SqliteDeadlockGuard.instance) {
      SqliteDeadlockGuard.instance = new SqliteDeadlockGuard()
    }
    return SqliteDeadlockGuard.instance
  }

  public static resetInstance(): void {
    if (SqliteDeadlockGuard.instance) {
      SqliteDeadlockGuard.instance.reset()
      SqliteDeadlockGuard.instance = null
    }
  }

  /**
   * Evaluates whether an error represents an SQLite lock contention or deadlock condition.
   */
  public isDeadlockOrBusy(err: any): boolean {
    if (!err) return false

    // 1. Check numeric or string error code
    const code = err.code || err.errno || err.extendedCode
    if (
      code === 'SQLITE_BUSY' ||
      code === 'SQLITE_LOCKED' ||
      code === 'SQLITE_BUSY_RECOVERY' ||
      code === 'SQLITE_BUSY_SNAPSHOT' ||
      code === 'SQLITE_LOCKED_SHAREDCACHE' ||
      code === 5 || // SQLITE_BUSY
      code === 6 || // SQLITE_LOCKED
      code === 261 || // SQLITE_BUSY_RECOVERY
      code === 517 || // SQLITE_BUSY_SNAPSHOT
      code === 262 // SQLITE_LOCKED_SHAREDCACHE
    ) {
      return true
    }

    // 2. Check error message text
    const message = (err.message || String(err)).toLowerCase()
    return (
      message.includes('database is locked') ||
      message.includes('table is locked') ||
      message.includes('database table is locked') ||
      message.includes('database is busy') ||
      message.includes('sqlite_busy') ||
      message.includes('sqlite_locked') ||
      message.includes('cannot start a transaction within a transaction') ||
      message.includes('resource temporarily unavailable')
    )
  }

  /**
   * Executes a database transaction with BEGIN IMMEDIATE and automatic deadlock retry.
   */
  public async executeTransaction<T>(
    db: any,
    transactionFn: () => Promise<T> | T,
    options: SqliteRetryOptions = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_SQLITE_RETRY_OPTIONS, ...options }
    this.totalOperations++

    const beginSql = opts.useImmediate ? 'BEGIN IMMEDIATE;' : 'BEGIN;'
    let attempt = 0

    while (attempt <= opts.maxRetries) {
      let inTransaction = false
      try {
        if (db) {
          if (typeof db.exec === 'function') {
            db.exec(beginSql)
          } else if (typeof db.run === 'function') {
            await db.run(beginSql)
          }
          inTransaction = true
        }

        const result = await transactionFn()

        if (db && inTransaction) {
          if (typeof db.exec === 'function') {
            db.exec('COMMIT;')
          } else if (typeof db.run === 'function') {
            await db.run('COMMIT;')
          }
          inTransaction = false
        }

        if (attempt > 0) {
          this.retriesSucceeded++
        }
        return result
      } catch (err: any) {
        // Rollback immediately if transaction was opened
        if (db && inTransaction) {
          try {
            if (typeof db.exec === 'function') {
              db.exec('ROLLBACK;')
            } else if (typeof db.run === 'function') {
              await db.run('ROLLBACK;')
            }
          } catch {
            // Rollback might fail if connection was dropped
          }
          inTransaction = false
        }

        if (this.isDeadlockOrBusy(err) && attempt < opts.maxRetries) {
          attempt++
          this.deadlocksEncountered++
          if (attempt > this.maxRetriesObserved) {
            this.maxRetriesObserved = attempt
          }

          const delay = this.calculateBackoffDelay(attempt, opts.baseDelayMs, opts.maxDelayMs)
          await this.sleep(delay)
          continue
        }

        this.operationsFailed++
        throw err
      }
    }

    this.operationsFailed++
    throw new Error(`[SqliteDeadlockGuard] Transaction '${opts.label}' exceeded max retries (${opts.maxRetries}).`)
  }

  /**
   * General execution wrapper for non-transactional SQLite statements with deadlock retry.
   */
  public async execute<T>(
    operationFn: () => Promise<T> | T,
    options: SqliteRetryOptions = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_SQLITE_RETRY_OPTIONS, ...options }
    this.totalOperations++
    let attempt = 0

    while (attempt <= opts.maxRetries) {
      try {
        const result = await operationFn()
        if (attempt > 0) {
          this.retriesSucceeded++
        }
        return result
      } catch (err: any) {
        if (this.isDeadlockOrBusy(err) && attempt < opts.maxRetries) {
          attempt++
          this.deadlocksEncountered++
          if (attempt > this.maxRetriesObserved) {
            this.maxRetriesObserved = attempt
          }

          const delay = this.calculateBackoffDelay(attempt, opts.baseDelayMs, opts.maxDelayMs)
          await this.sleep(delay)
          continue
        }

        this.operationsFailed++
        throw err
      }
    }

    this.operationsFailed++
    throw new Error(`[SqliteDeadlockGuard] Operation '${opts.label}' exceeded max retries (${opts.maxRetries}).`)
  }

  /**
   * Calculates exponential delay with randomized jitter for SQLite retry.
   */
  public calculateBackoffDelay(attempt: number, baseMs: number, maxMs: number): number {
    const exponential = baseMs * Math.pow(2, attempt - 1)
    const capped = Math.min(maxMs, exponential)
    const jitter = Math.random() * (capped * 0.5)
    return Math.round(capped + jitter)
  }

  public getTelemetry(): SqliteDeadlockTelemetry {
    return {
      totalOperations: this.totalOperations,
      deadlocksEncountered: this.deadlocksEncountered,
      retriesSucceeded: this.retriesSucceeded,
      operationsFailed: this.operationsFailed,
      maxRetriesObserved: this.maxRetriesObserved,
    }
  }

  public reset(): void {
    this.totalOperations = 0
    this.deadlocksEncountered = 0
    this.retriesSucceeded = 0
    this.operationsFailed = 0
    this.maxRetriesObserved = 0
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const sqliteDeadlockGuard = SqliteDeadlockGuard.getInstance()
