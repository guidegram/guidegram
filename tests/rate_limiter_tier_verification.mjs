import test from 'node:test'
import assert from 'node:assert/strict'
import { TokenBucketRateLimiter, RATE_LIMIT_TIERS } from '../electron/rateLimiter.ts'

test('TokenBucketRateLimiter: Auth tier enforces strict 5-request burst limit', () => {
  const limiter = new TokenBucketRateLimiter()

  try {
    // 5 allowed
    for (let i = 0; i < 5; i++) {
      const res = limiter.consumeMethod('telegram:send-code', 'acc1')
      assert.equal(res.allowed, true, `Auth attempt ${i + 1} should be allowed`)
    }

    // 6th throttled
    const blocked = limiter.consumeMethod('telegram:send-code', 'acc1')
    assert.equal(blocked.allowed, false, '6th auth attempt should be throttled')
    assert.ok(blocked.retryAfterMs && blocked.retryAfterMs > 0, 'Retry delay should be positive')

    const metrics = limiter.getMetrics()
    assert.equal(metrics.totalRequests, 6)
    assert.equal(metrics.allowedRequests, 5)
    assert.equal(metrics.throttledRequests, 1)
    assert.equal(metrics.violationsByMethod['telegram:send-code'], 1)
  } finally {
    limiter.destroy()
  }
})

test('TokenBucketRateLimiter: Heavy write tier enforces 15-request burst limit', () => {
  const limiter = new TokenBucketRateLimiter()

  try {
    for (let i = 0; i < 15; i++) {
      const res = limiter.consumeMethod('telegram:send-message', 'acc2')
      assert.equal(res.allowed, true, `Message ${i + 1} should be allowed`)
    }

    const blocked = limiter.consumeMethod('telegram:send-message', 'acc2')
    assert.equal(blocked.allowed, false, '16th message should be throttled')
    assert.equal(limiter.getMetrics().violationsByMethod['telegram:send-message'], 1)
  } finally {
    limiter.destroy()
  }
})

test('TokenBucketRateLimiter: Independent accounts have isolated buckets', () => {
  const limiter = new TokenBucketRateLimiter()

  try {
    // Exhaust acc1 auth
    for (let i = 0; i < 5; i++) {
      limiter.consumeMethod('telegram:send-code', 'acc1')
    }
    assert.equal(limiter.consumeMethod('telegram:send-code', 'acc1').allowed, false)

    // acc2 should still have full quota
    const acc2Res = limiter.consumeMethod('telegram:send-code', 'acc2')
    assert.equal(acc2Res.allowed, true, 'acc2 should have fresh quota')
  } finally {
    limiter.destroy()
  }
})

test('TokenBucketRateLimiter: checkOrThrowMethod throws descriptive error on violation', () => {
  const limiter = new TokenBucketRateLimiter()

  try {
    for (let i = 0; i < 5; i++) {
      limiter.checkOrThrowMethod('telegram:check-password', 'acc1')
    }

    assert.throws(
      () => limiter.checkOrThrowMethod('telegram:check-password', 'acc1'),
      /\[RATE-LIMIT-EXCEEDED\] Rate limit exceeded for method 'telegram:check-password'/
    )
  } finally {
    limiter.destroy()
  }
})

test('TokenBucketRateLimiter: Telemetry metrics reset cleanly', () => {
  const limiter = new TokenBucketRateLimiter()

  try {
    limiter.consume('key1')
    limiter.consume('key1', 999) // trigger violation
    assert.ok(limiter.getMetrics().totalRequests > 0)

    limiter.resetMetrics()
    const metrics = limiter.getMetrics()
    assert.equal(metrics.totalRequests, 0)
    assert.equal(metrics.allowedRequests, 0)
    assert.equal(metrics.throttledRequests, 0)
  } finally {
    limiter.destroy()
  }
})
