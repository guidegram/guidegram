import { createHash } from 'node:crypto'
import { Logger } from './telegram/logger'

export interface IdempotencyRecord<T = any> {
  key: string
  status: 'pending' | 'completed' | 'failed'
  result?: T
  error?: any
  promise?: Promise<T>
  createdAt: number
  expiresAt: number
}

/**
 * IdempotencyManager (Matt Murphy MM-103)
 * Guarantees exactly-once execution for mutating requests (messages, reactions, state changes).
 * Prevents duplicate actions caused by network retries, UI double-clicks, or thundering requests.
 */
export class IdempotencyManager {
  private static instance: IdempotencyManager
  private records = new Map<string, IdempotencyRecord>()
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Periodically sweep expired records every 60 seconds (MM-211 Memory Hygiene)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000)
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  public static getInstance(): IdempotencyManager {
    if (!IdempotencyManager.instance) {
      IdempotencyManager.instance = new IdempotencyManager()
    }
    return IdempotencyManager.instance
  }

  /**
   * Generates a deterministic idempotency key from a namespace and arguments.
   */
  public generateKey(namespace: string, payload: unknown): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16)
    return `${namespace}:${hash}`
  }

  /**
   * Executes an operation with idempotency protection.
   * If a request with the same key is in-flight, deduplicates by attaching to the existing Promise.
   * If completed within ttlMs, returns the cached result.
   */
  public async execute<T>(
    key: string,
    operation: () => Promise<T>,
    ttlMs = 60_000
  ): Promise<T> {
    const existing = this.records.get(key)
    const now = Date.now()

    if (existing) {
      // If still pending, wait for the original in-flight operation
      if (existing.status === 'pending' && existing.promise) {
        Logger.info(`[Idempotency] Request deduplicated (in-flight match): ${key}`)
        return existing.promise as Promise<T>
      }

      // If completed and not expired, return cached result
      if (existing.status === 'completed' && existing.expiresAt > now) {
        Logger.info(`[Idempotency] Request deduplicated (cached match): ${key}`)
        return existing.result as T
      }
    }

    // New operation or expired record
    const promise = (async () => {
      try {
        const result = await operation()
        this.records.set(key, {
          key,
          status: 'completed',
          result,
          createdAt: now,
          expiresAt: Date.now() + ttlMs,
        })
        return result
      } catch (err) {
        // On error, mark as failed and remove quickly so real retries are not blocked
        this.records.delete(key)
        throw err
      }
    })()

    this.records.set(key, {
      key,
      status: 'pending',
      promise,
      createdAt: now,
      expiresAt: now + ttlMs,
    })

    return promise
  }

  /**
   * Cleans up expired records from memory
   */
  public cleanup(): number {
    const now = Date.now()
    let removed = 0
    for (const [key, record] of this.records.entries()) {
      if (record.status !== 'pending' && record.expiresAt <= now) {
        this.records.delete(key)
        removed++
      }
    }
    return removed
  }

  /**
   * Returns current count of tracked idempotency records
   */
  public getTrackedCount(): number {
    return this.records.size
  }

  /**
   * Clears all records (primarily for testing/teardown)
   */
  public clear(): void {
    this.records.clear()
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.records.clear()
  }
}

export const idempotencyManager = IdempotencyManager.getInstance()
