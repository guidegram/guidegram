import { randomUUID } from 'node:crypto'
import { Logger } from './telegram/logger'

export type TaskType = 'send-message' | 'send-reaction' | 'pin-message' | 'edit-message' | string

export interface QueuedTask {
  id: string
  type: TaskType
  accountId: string
  payload: Record<string, any>
  attempts: number
  maxAttempts: number
  createdAt: number
  lastAttemptAt?: number
  nextAttemptAt: number
  status: 'queued' | 'processing' | 'dead_letter'
  lastError?: string
}

export type TaskHandler = (task: QueuedTask) => Promise<any>

/**
 * OfflineQueue & Dead-Letter Queue (DLQ) Engine (Matt Murphy MM-019)
 * Resilient offline queue with exponential backoff and dead-letter routing
 * for failed mutations when connectivity drops or MTProto DCs are unreachable.
 */
export class OfflineQueue {
  private static instance: OfflineQueue
  private queue: Map<string, QueuedTask> = new Map()
  private deadLetters: Map<string, QueuedTask> = new Map()
  private handlers: Map<TaskType, TaskHandler> = new Map()
  private isProcessing = false
  private processInterval: NodeJS.Timeout | null = null
  private onStateChangeCallback?: () => void

  private constructor() {
    // Process queue every 2 seconds
    this.processInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        Logger.error('[OfflineQueue] processQueue uncaught error:', err)
      })
    }, 2000)
    if (this.processInterval.unref) {
      this.processInterval.unref()
    }
  }

  public static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue()
    }
    return OfflineQueue.instance
  }

  public registerHandler(type: TaskType, handler: TaskHandler): void {
    this.handlers.set(type, handler)
  }

  public setOnStateChange(cb: () => void): void {
    this.onStateChangeCallback = cb
  }

  /**
   * Enqueues an action for guaranteed offline/retry delivery.
   */
  public enqueue(
    type: TaskType,
    accountId: string,
    payload: Record<string, any>,
    maxAttempts = 5
  ): string {
    const id = randomUUID()
    const task: QueuedTask = {
      id,
      type,
      accountId,
      payload,
      attempts: 0,
      maxAttempts,
      createdAt: Date.now(),
      nextAttemptAt: Date.now(),
      status: 'queued',
    }

    this.queue.set(id, task)
    Logger.info(`[OfflineQueue] Task enqueued: ${type} (${id})`)
    this.notifyStateChange()
    return id
  }

  /**
   * Processes all pending tasks whose backoff window has expired.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const now = Date.now()
      const eligibleTasks = Array.from(this.queue.values()).filter(
        (t) => t.status === 'queued' && t.nextAttemptAt <= now
      )

      for (const task of eligibleTasks) {
        const handler = this.handlers.get(task.type)
        if (!handler) {
          Logger.warn(`[OfflineQueue] No handler registered for task type: ${task.type}`)
          this.moveToDeadLetter(task, `No handler registered for type: ${task.type}`)
          continue
        }

        task.status = 'processing'
        task.attempts++
        task.lastAttemptAt = Date.now()

        try {
          await handler(task)
          // Success: remove from active queue
          this.queue.delete(task.id)
          Logger.info(`[OfflineQueue] Task successfully executed: ${task.type} (${task.id})`)
          this.notifyStateChange()
        } catch (err: any) {
          const errMsg = err?.message || String(err)
          task.lastError = errMsg

          if (task.attempts >= task.maxAttempts) {
            Logger.error(`[OfflineQueue] Task exceeded max attempts (${task.maxAttempts}). Routing to DLQ: ${task.id}`)
            this.moveToDeadLetter(task, errMsg)
          } else {
            // Exponential backoff: 2s, 4s, 8s, 16s... up to 60s
            const delayMs = Math.min(2000 * Math.pow(2, task.attempts - 1), 60_000)
            task.nextAttemptAt = Date.now() + delayMs
            task.status = 'queued'
            Logger.warn(
              `[OfflineQueue] Task failed attempt ${task.attempts}/${task.maxAttempts}. Retry in ${delayMs}ms. Err: ${errMsg}`
            )
            this.notifyStateChange()
          }
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  private moveToDeadLetter(task: QueuedTask, error: string): void {
    this.queue.delete(task.id)
    task.status = 'dead_letter'
    task.lastError = error
    this.deadLetters.set(task.id, task)
    this.notifyStateChange()
  }

  public retryDeadLetter(id: string): boolean {
    const dlTask = this.deadLetters.get(id)
    if (!dlTask) return false

    this.deadLetters.delete(id)
    dlTask.attempts = 0
    dlTask.status = 'queued'
    dlTask.nextAttemptAt = Date.now()
    this.queue.set(id, dlTask)
    Logger.info(`[OfflineQueue] Task rescued from DLQ: ${id}`)
    this.notifyStateChange()
    return true
  }

  public purgeDeadLetters(): number {
    const count = this.deadLetters.size
    this.deadLetters.clear()
    this.notifyStateChange()
    return count
  }

  public getQueue(): QueuedTask[] {
    return Array.from(this.queue.values())
  }

  public getDeadLetters(): QueuedTask[] {
    return Array.from(this.deadLetters.values())
  }

  public getStats(): { pending: number; deadLetters: number } {
    return {
      pending: this.queue.size,
      deadLetters: this.deadLetters.size,
    }
  }

  public clear(): void {
    this.queue.clear()
    this.deadLetters.clear()
    this.notifyStateChange()
  }

  public destroy(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
    this.clear()
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      try {
        this.onStateChangeCallback()
      } catch (e) {
        // ignore
      }
    }
  }
}

export const offlineQueue = OfflineQueue.getInstance()
