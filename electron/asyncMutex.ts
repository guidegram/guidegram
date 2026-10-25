import { Logger } from './telegram/logger'

interface MutexQueueItem {
  resolve: () => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

/**
 * KeyedAsyncMutex (Layer 03 - MM-022: Resource Lock Resilience & Thundering Herd Defense)
 * Prevents concurrent connection races, MTProto AUTH_KEY_DUPLICATED errors,
 * and session state corruption across accounts.
 */
export class KeyedAsyncMutex {
  private static instance: KeyedAsyncMutex
  private lockedKeys = new Set<string>()
  private waitingQueues = new Map<string, MutexQueueItem[]>()
  private inFlightTasks = new Map<string, Promise<any>>()

  private constructor() {}

  public static getInstance(): KeyedAsyncMutex {
    if (!this.instance) {
      this.instance = new KeyedAsyncMutex()
    }
    return this.instance
  }

  /**
   * Checks if a key is currently locked.
   */
  public isLocked(key: string): boolean {
    return this.lockedKeys.has(key)
  }

  /**
   * Acquire a lock for a key. Resolves when the lock is acquired.
   * Rejects if timeout expires before lock is granted.
   */
  public async acquire(key: string, timeoutMs: number = 30_000): Promise<() => void> {
    if (!key || typeof key !== 'string') {
      throw new Error('[KeyedAsyncMutex] Missing or invalid mutex key')
    }

    if (!this.lockedKeys.has(key)) {
      this.lockedKeys.add(key)
      let released = false
      return () => {
        if (!released) {
          released = true
          this.release(key)
        }
      }
    }

    // Key is locked: enqueue waiter
    return new Promise<() => void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeWaiter(key, item)
        reject(new Error(`[KeyedAsyncMutex] Lock acquisition timed out after ${timeoutMs}ms for key: '${key}'`))
      }, timeoutMs)

      const item: MutexQueueItem = {
        resolve: () => {
          clearTimeout(timer)
          let released = false
          resolve(() => {
            if (!released) {
              released = true
              this.release(key)
            }
          })
        },
        reject: (err: Error) => {
          clearTimeout(timer)
          reject(err)
        },
        timer,
      }

      if (!this.waitingQueues.has(key)) {
        this.waitingQueues.set(key, [])
      }
      this.waitingQueues.get(key)!.push(item)
    })
  }

  private release(key: string): void {
    const queue = this.waitingQueues.get(key)
    if (queue && queue.length > 0) {
      const next = queue.shift()!
      if (queue.length === 0) {
        this.waitingQueues.delete(key)
      }
      // Hand over lock directly to next waiter
      next.resolve()
    } else {
      this.lockedKeys.delete(key)
    }
  }

  private removeWaiter(key: string, item: MutexQueueItem): void {
    const queue = this.waitingQueues.get(key)
    if (!queue) return
    const idx = queue.indexOf(item)
    if (idx !== -1) {
      queue.splice(idx, 1)
    }
    if (queue.length === 0) {
      this.waitingQueues.delete(key)
    }
  }

  /**
   * Runs a task exclusively under the lock for key.
   */
  public async runExclusive<T>(
    key: string,
    task: () => Promise<T>,
    timeoutMs: number = 30_000
  ): Promise<T> {
    const release = await this.acquire(key, timeoutMs)
    try {
      return await task()
    } finally {
      release()
    }
  }

  /**
   * Thundering herd dedup: If a task for key is already executing, returns the same Promise.
   * If not, executes the task under exclusive lock and caches the in-flight Promise.
   */
  public async runExclusiveDedup<T>(
    key: string,
    task: () => Promise<T>,
    timeoutMs: number = 30_000
  ): Promise<T> {
    const existing = this.inFlightTasks.get(key)
    if (existing) {
      Logger.info(`[KeyedAsyncMutex] Deduplicated concurrent task for key: '${key}'`)
      return existing as Promise<T>
    }

    const promise = (async () => {
      try {
        return await this.runExclusive(key, task, timeoutMs)
      } finally {
        this.inFlightTasks.delete(key)
      }
    })()

    this.inFlightTasks.set(key, promise)
    return promise
  }

  /**
   * Returns waiting queue length for a key.
   */
  public getQueueLength(key: string): number {
    return this.waitingQueues.get(key)?.length || 0
  }

  /**
   * Force resets all locks and queues.
   */
  public reset(): void {
    for (const [, queue] of this.waitingQueues) {
      for (const item of queue) {
        clearTimeout(item.timer)
        item.reject(new Error('[KeyedAsyncMutex] Mutex reset'))
      }
    }
    this.lockedKeys.clear()
    this.waitingQueues.clear()
    this.inFlightTasks.clear()
  }
}

export const keyedMutex = KeyedAsyncMutex.getInstance()
