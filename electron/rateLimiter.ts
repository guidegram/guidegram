export interface RateLimitOptions {
  capacity: number
  refillTokensPerSec: number
}

export type RateLimitTier = 'auth' | 'heavy_write' | 'standard' | 'read_heavy'

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitOptions> = {
  auth: { capacity: 5, refillTokensPerSec: 0.5 }, // Strict: 5 burst, 1 token per 2s
  heavy_write: { capacity: 15, refillTokensPerSec: 3 }, // Send message, upload, forward
  standard: { capacity: 60, refillTokensPerSec: 20 }, // Normal IPC queries
  read_heavy: { capacity: 120, refillTokensPerSec: 50 }, // Cached reads, history, dialogs
}

// Method-level tier assignments
export const IPC_METHOD_TIERS: Record<string, RateLimitTier> = {
  // Auth endpoints
  'telegram:send-code': 'auth',
  'telegram:sign-in': 'auth',
  'telegram:sign-in-bot': 'auth',
  'telegram:check-password': 'auth',

  // Heavy write endpoints
  'telegram:send-message': 'heavy_write',
  'telegram:send-media': 'heavy_write',
  'telegram:forward-messages': 'heavy_write',
  'telegram:delete-messages': 'heavy_write',
  'telegram:send-story': 'heavy_write',
  'telegram:edit-message': 'heavy_write',

  // Read heavy endpoints
  'telegram:get-dialogs': 'read_heavy',
  'telegram:get-messages': 'read_heavy',
  'telegram:get-chat-details': 'read_heavy',
  'telegram:get-shared-media': 'read_heavy',
  'telegram:get-dialog-filters': 'read_heavy',
}

interface Bucket {
  tokens: number
  lastRefill: number
}

export interface RateLimiterMetrics {
  totalRequests: number
  allowedRequests: number
  throttledRequests: number
  activeBuckets: number
  violationsByMethod: Record<string, number>
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>()
  private cleanupTimer: NodeJS.Timeout | null = null

  // Telemetry counters (MM-052)
  private totalRequests = 0
  private allowedRequests = 0
  private throttledRequests = 0
  private violationsByMethod = new Map<string, number>()

  private defaultOptions: RateLimitOptions

  constructor(defaultOptions: RateLimitOptions = { capacity: 60, refillTokensPerSec: 20 }) {
    this.defaultOptions = defaultOptions
    // MM-211: Clean up stale buckets every 5 minutes to prevent memory leak
    this.cleanupTimer = setInterval(() => this.cleanupStaleBuckets(), 5 * 60 * 1000)
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  public consume(
    key: string,
    tokens = 1,
    options?: Partial<RateLimitOptions>
  ): { allowed: boolean; retryAfterMs?: number } {
    this.totalRequests++
    const capacity = options?.capacity ?? this.defaultOptions.capacity
    const refillTokensPerSec = options?.refillTokensPerSec ?? this.defaultOptions.refillTokensPerSec
    const now = Date.now()

    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now }
      this.buckets.set(key, bucket)
    } else {
      const elapsedMs = now - bucket.lastRefill
      const tokensToAdd = (elapsedMs / 1000) * refillTokensPerSec
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens
      this.allowedRequests++
      return { allowed: true }
    }

    this.throttledRequests++
    const missingTokens = tokens - bucket.tokens
    const retryAfterMs = Math.ceil((missingTokens / refillTokensPerSec) * 1000)
    return { allowed: false, retryAfterMs }
  }

  /**
   * Consumes tokens for a specific IPC method, automatically applying its tier profile.
   */
  public consumeMethod(
    method: string,
    accountId?: string,
    tokens = 1
  ): { allowed: boolean; retryAfterMs?: number } {
    const tier = IPC_METHOD_TIERS[method] || 'standard'
    const tierOptions = RATE_LIMIT_TIERS[tier]
    const bucketKey = `${method}:${accountId || 'global'}`

    const res = this.consume(bucketKey, tokens, tierOptions)
    if (!res.allowed) {
      const currentViolations = this.violationsByMethod.get(method) || 0
      this.violationsByMethod.set(method, currentViolations + 1)
    }

    return res
  }

  /**
   * Enforces rate limit for an IPC method or throws descriptive error.
   */
  public checkOrThrowMethod(method: string, accountId?: string, tokens = 1): void {
    const result = this.consumeMethod(method, accountId, tokens)
    if (!result.allowed) {
      const seconds = ((result.retryAfterMs || 1000) / 1000).toFixed(1)
      throw new Error(`[RATE-LIMIT-EXCEEDED] Rate limit exceeded for method '${method}'. Please retry after ${seconds}s.`)
    }
  }

  public checkOrThrow(key: string, tokens = 1, options?: Partial<RateLimitOptions>): void {
    const result = this.consume(key, tokens, options)
    if (!result.allowed) {
      const seconds = ((result.retryAfterMs || 1000) / 1000).toFixed(1)
      throw new Error(`[RATE-LIMIT-EXCEEDED] Rate limit exceeded for '${key}'. Please retry after ${seconds}s.`)
    }
  }

  /**
   * Returns current telemetry snapshot.
   */
  public getMetrics(): RateLimiterMetrics {
    const violationsObj: Record<string, number> = {}
    for (const [m, count] of this.violationsByMethod.entries()) {
      violationsObj[m] = count
    }

    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      throttledRequests: this.throttledRequests,
      activeBuckets: this.buckets.size,
      violationsByMethod: violationsObj,
    }
  }

  private cleanupStaleBuckets(): void {
    const now = Date.now()
    const maxIdleMs = 10 * 60 * 1000 // 10 minutes idle
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxIdleMs) {
        this.buckets.delete(key)
      }
    }
  }

  public resetMetrics(): void {
    this.totalRequests = 0
    this.allowedRequests = 0
    this.throttledRequests = 0
    this.violationsByMethod.clear()
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.buckets.clear()
    this.violationsByMethod.clear()
  }
}

export const globalIpcRateLimiter = new TokenBucketRateLimiter({
  capacity: 60,
  refillTokensPerSec: 20,
})
