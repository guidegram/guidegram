export interface RateLimitOptions {
  capacity: number
  refillTokensPerSec: number
}

interface Bucket {
  tokens: number
  lastRefill: number
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(private defaultOptions: RateLimitOptions = { capacity: 30, refillTokensPerSec: 10 }) {
    // MM-211: Clean up stale buckets every 5 minutes to prevent memory leak
    this.cleanupTimer = setInterval(() => this.cleanupStaleBuckets(), 5 * 60 * 1000)
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  public consume(key: string, tokens = 1, options?: Partial<RateLimitOptions>): { allowed: boolean; retryAfterMs?: number } {
    const capacity = options?.capacity ?? this.defaultOptions.capacity
    const refillTokensPerSec = options?.refillTokensPerSec ?? this.defaultOptions.refillTokensPerSec
    const now = Date.now()

    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now }
      this.buckets.set(key, bucket)
    } else {
      // Calculate refilled tokens
      const elapsedMs = now - bucket.lastRefill
      const tokensToAdd = (elapsedMs / 1000) * refillTokensPerSec
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens
      return { allowed: true }
    }

    const missingTokens = tokens - bucket.tokens
    const retryAfterMs = Math.ceil((missingTokens / refillTokensPerSec) * 1000)
    return { allowed: false, retryAfterMs }
  }

  public checkOrThrow(key: string, tokens = 1, options?: Partial<RateLimitOptions>): void {
    const result = this.consume(key, tokens, options)
    if (!result.allowed) {
      const seconds = ((result.retryAfterMs || 1000) / 1000).toFixed(1)
      throw new Error(`[RATE-LIMIT-EXCEEDED] Rate limit exceeded for '${key}'. Please retry after ${seconds}s.`)
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

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.buckets.clear()
  }
}

export const globalIpcRateLimiter = new TokenBucketRateLimiter({
  capacity: 60,
  refillTokensPerSec: 20,
})
