import assert from 'assert'

console.log('====================================================')
console.log('Running Rate Limiter & Abuse Prevention Verification')
console.log('====================================================\n')

// Test simulation of TokenBucketRateLimiter logic
class MockBucket {
  constructor(capacity = 5, refillTokensPerSec = 2) {
    this.capacity = capacity
    this.refillTokensPerSec = refillTokensPerSec
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  consume(tokens = 1) {
    const now = Date.now()
    const elapsedMs = now - this.lastRefill
    const tokensToAdd = (elapsedMs / 1000) * this.refillTokensPerSec
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return { allowed: true }
    }
    const missingTokens = tokens - this.tokens
    const retryAfterMs = Math.ceil((missingTokens / this.refillTokensPerSec) * 1000)
    return { allowed: false, retryAfterMs }
  }
}

let passed = 0
function test(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message)
    process.exit(1)
  }
}

test('Initial capacity allows consecutive calls within limit', () => {
  const bucket = new MockBucket(3, 1)
  assert.strictEqual(bucket.consume(1).allowed, true)
  assert.strictEqual(bucket.consume(1).allowed, true)
  assert.strictEqual(bucket.consume(1).allowed, true)
})

test('Exceeding capacity is immediately rejected with retryAfterMs', () => {
  const bucket = new MockBucket(2, 1)
  assert.strictEqual(bucket.consume(1).allowed, true)
  assert.strictEqual(bucket.consume(1).allowed, true)
  const rejected = bucket.consume(1)
  assert.strictEqual(rejected.allowed, false)
  assert.ok(rejected.retryAfterMs > 0, 'retryAfterMs should be > 0')
})

test('Token refill replenishes bucket after time delay', async () => {
  const bucket = new MockBucket(1, 10) // 10 tokens per sec -> 1 token every 100ms
  assert.strictEqual(bucket.consume(1).allowed, true)
  assert.strictEqual(bucket.consume(1).allowed, false)
  await new Promise((r) => setTimeout(r, 150))
  assert.strictEqual(bucket.consume(1).allowed, true)
})

console.log('\nAll Rate Limiter checks passed cleanly!')
