/**
 * NetworkReconnectManager (Layer 11 Network Resilience & RFC 8961 / AWS Full Jitter Backoff)
 * 
 * Features:
 * 1. Full Jitter Exponential Backoff:
 *    temp = min(maxDelay, baseDelay * 2^attempt)
 *    delay = random(0.5 * temp, temp)
 *    Eliminates thundering herd spikes when Telegram DCs or local proxy connections fluctuate.
 * 2. Per-Account Isolated Schedule:
 *    Each account manages its own failure count, next retry timestamp, and backoff state.
 * 3. Network Online/Offline Staggering:
 *    When system returns from sleep or offline, all disconnected accounts are staggered
 *    with a short randomized delay (100ms - 1500ms) to prevent simultaneous socket storms.
 * 4. Reconnect Mutex / Debouncing:
 *    Prevents multiple overlapping reconnect promises for the same account.
 * 5. Full Telemetry & Diagnostics for Network Socket Auditing.
 */

export interface BackoffConfig {
  baseDelayMs: number
  maxDelayMs: number
  maxAttempts: number
  jitterRatio: number // Minimum percentage of calculated delay (e.g. 0.5 means [0.5 * delay, delay])
}

export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  maxAttempts: 10,
  jitterRatio: 0.5,
}

export type ReconnectStatus = 'idle' | 'scheduled' | 'reconnecting' | 'exhausted' | 'paused'

export interface AccountReconnectState {
  accountId: string
  attemptCount: number
  status: ReconnectStatus
  nextRetryTimestamp: number | null
  scheduledDelayMs: number | null
  lastError: string | null
  lastAttemptTimestamp: number | null
  successCount: number
}

export interface ReconnectTelemetry {
  totalScheduledAttempts: number
  totalSuccessfulReconnections: number
  totalExhaustedAccounts: number
  currentlyScheduledCount: number
  currentlyReconnectingCount: number
  accounts: Record<string, AccountReconnectState>
}

/**
 * Calculates exponential backoff with full jitter according to RFC 8961 / AWS recommendations.
 * Formula:
 *   temp = min(maxDelayMs, baseDelayMs * 2^attempt)
 *   delay = randomBetween(temp * jitterRatio, temp)
 */
export function calculateJitteredDelay(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG,
  randomFn: () => number = Math.random
): number {
  const safeAttempt = Math.max(0, Math.min(attempt, 20))
  const exponential = config.baseDelayMs * Math.pow(2, safeAttempt)
  const capped = Math.min(config.maxDelayMs, exponential)

  const minDelay = capped * Math.max(0.1, Math.min(0.9, config.jitterRatio))
  const randomFactor = randomFn()
  const jittered = minDelay + randomFactor * (capped - minDelay)

  return Math.round(jittered)
}

export class NetworkReconnectManager {
  private static instance: NetworkReconnectManager | null = null

  private config: BackoffConfig
  private accountStates: Map<string, AccountReconnectState> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private activeLocks: Set<string> = new Set()
  private isOffline: boolean = false

  // Global telemetry counters
  private totalScheduledAttempts = 0
  private totalSuccessfulReconnections = 0
  private totalExhaustedAccounts = 0

  public constructor(config: Partial<BackoffConfig> = {}) {
    this.config = { ...DEFAULT_BACKOFF_CONFIG, ...config }
  }

  public static getInstance(): NetworkReconnectManager {
    if (!NetworkReconnectManager.instance) {
      NetworkReconnectManager.instance = new NetworkReconnectManager()
    }
    return NetworkReconnectManager.instance
  }

  public static resetInstance(): void {
    if (NetworkReconnectManager.instance) {
      NetworkReconnectManager.instance.reset()
      NetworkReconnectManager.instance = null
    }
  }

  /**
   * Schedules a jittered reconnect attempt for an account after connection loss.
   */
  public scheduleReconnect(
    accountId: string,
    reconnectAction: () => Promise<boolean>,
    errorMsg?: string
  ): { scheduled: boolean; delayMs: number } {
    if (this.isOffline) {
      this.getOrCreateState(accountId, 'paused', errorMsg)
      return { scheduled: false, delayMs: 0 }
    }

    // Cancel existing timer if present
    this.cancelTimer(accountId)

    const state = this.getOrCreateState(accountId)
    state.lastError = errorMsg || null

    if (state.attemptCount >= this.config.maxAttempts) {
      state.status = 'exhausted'
      state.nextRetryTimestamp = null
      state.scheduledDelayMs = null
      this.totalExhaustedAccounts++
      return { scheduled: false, delayMs: 0 }
    }

    const delayMs = calculateJitteredDelay(state.attemptCount, this.config)
    state.status = 'scheduled'
    state.scheduledDelayMs = delayMs
    state.nextRetryTimestamp = Date.now() + delayMs
    this.totalScheduledAttempts++

    const timer = setTimeout(async () => {
      this.timers.delete(accountId)
      await this.executeReconnect(accountId, reconnectAction)
    }, delayMs)

    // Unref timer so it does not block Node process exit if running tests
    if (timer && typeof timer.unref === 'function') {
      timer.unref()
    }

    this.timers.set(accountId, timer)
    return { scheduled: true, delayMs }
  }

  /**
   * Executes the reconnect action with mutual exclusion locking.
   */
  public async executeReconnect(
    accountId: string,
    reconnectAction: () => Promise<boolean>
  ): Promise<boolean> {
    if (this.activeLocks.has(accountId)) {
      // Reconnect already executing for this account
      return false
    }

    const state = this.getOrCreateState(accountId)
    this.activeLocks.add(accountId)
    state.status = 'reconnecting'
    state.lastAttemptTimestamp = Date.now()
    state.attemptCount++

    let success = false
    try {
      success = await reconnectAction()
    } catch (err: any) {
      state.lastError = err?.message || String(err)
      success = false
    } finally {
      this.activeLocks.delete(accountId)
    }

    if (success) {
      this.onAccountConnected(accountId)
    } else {
      // Schedule next backoff attempt if not exhausted
      if (state.attemptCount < this.config.maxAttempts) {
        this.scheduleReconnect(accountId, reconnectAction, state.lastError || 'Reconnect failed')
      } else {
        state.status = 'exhausted'
        state.nextRetryTimestamp = null
        state.scheduledDelayMs = null
        this.totalExhaustedAccounts++
      }
    }

    return success
  }

  /**
   * Called when an account successfully connects. Resets backoff count.
   */
  public onAccountConnected(accountId: string): void {
    this.cancelTimer(accountId)
    const state = this.getOrCreateState(accountId)
    state.attemptCount = 0
    state.status = 'idle'
    state.nextRetryTimestamp = null
    state.scheduledDelayMs = null
    state.lastError = null
    state.successCount++
    this.totalSuccessfulReconnections++
  }

  /**
   * Cancels any pending reconnect timer for an account.
   */
  public cancelTimer(accountId: string): void {
    const timer = this.timers.get(accountId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(accountId)
    }
    const state = this.accountStates.get(accountId)
    if (state && state.status === 'scheduled') {
      state.status = 'idle'
      state.nextRetryTimestamp = null
      state.scheduledDelayMs = null
    }
  }

  /**
   * Called when network goes offline. Pauses pending timers.
   */
  public onNetworkOffline(): void {
    this.isOffline = true
    for (const [accountId, timer] of this.timers.entries()) {
      clearTimeout(timer)
      const state = this.accountStates.get(accountId)
      if (state) state.status = 'paused'
    }
    this.timers.clear()
  }

  /**
   * Called when network returns online. Immediately resumes reconnecting all
   * disconnected/paused accounts with randomized staggering (100ms - 1500ms) to prevent socket storms.
   */
  public onNetworkOnline(
    reconnectActionFactory: (accountId: string) => (() => Promise<boolean>)
  ): void {
    this.isOffline = false

    for (const [accountId, state] of this.accountStates.entries()) {
      if (state.status === 'paused' || state.status === 'exhausted' || state.attemptCount > 0) {
        // Reset attempt count to give a fresh round on network restoration
        state.attemptCount = 0
        state.status = 'idle'

        // Stagger initial reconnect between 100ms and 1500ms
        const staggerDelay = Math.round(100 + Math.random() * 1400)
        state.status = 'scheduled'
        state.scheduledDelayMs = staggerDelay
        state.nextRetryTimestamp = Date.now() + staggerDelay

        const timer = setTimeout(async () => {
          this.timers.delete(accountId)
          const action = reconnectActionFactory(accountId)
          if (action) {
            await this.executeReconnect(accountId, action)
          }
        }, staggerDelay)

        if (timer && typeof timer.unref === 'function') {
          timer.unref()
        }
        this.timers.set(accountId, timer)
      }
    }
  }

  /**
   * Resets all states, timers, and locks.
   */
  public reset(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.accountStates.clear()
    this.activeLocks.clear()
    this.isOffline = false
    this.totalScheduledAttempts = 0
    this.totalSuccessfulReconnections = 0
    this.totalExhaustedAccounts = 0
  }

  /**
   * Returns current telemetry across all accounts.
   */
  public getTelemetry(): ReconnectTelemetry {
    let currentlyScheduled = 0
    let currentlyReconnecting = 0
    const accountsRecord: Record<string, AccountReconnectState> = {}

    for (const [id, state] of this.accountStates.entries()) {
      if (state.status === 'scheduled') currentlyScheduled++
      if (state.status === 'reconnecting') currentlyReconnecting++
      accountsRecord[id] = { ...state }
    }

    return {
      totalScheduledAttempts: this.totalScheduledAttempts,
      totalSuccessfulReconnections: this.totalSuccessfulReconnections,
      totalExhaustedAccounts: this.totalExhaustedAccounts,
      currentlyScheduledCount: currentlyScheduled,
      currentlyReconnectingCount: currentlyReconnecting,
      accounts: accountsRecord,
    }
  }

  private getOrCreateState(
    accountId: string,
    initialStatus: ReconnectStatus = 'idle',
    lastError?: string
  ): AccountReconnectState {
    let state = this.accountStates.get(accountId)
    if (!state) {
      state = {
        accountId,
        attemptCount: 0,
        status: initialStatus,
        nextRetryTimestamp: null,
        scheduledDelayMs: null,
        lastError: lastError || null,
        lastAttemptTimestamp: null,
        successCount: 0,
      }
      this.accountStates.set(accountId, state)
    }
    return state
  }
}

export const networkReconnectManager = NetworkReconnectManager.getInstance()
