import assert from 'assert'
import { SwrCacheManager } from '../electron/swrCache.ts'

console.log('🧪 Starting SwrCacheManager Verification Tests (Layer 04 MM-084)...')

const cache = SwrCacheManager.getInstance()
cache.clear()

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runTests() {
  // Test 1: Cache Miss & Fresh Retrieval
  let fetchCount = 0
  const fetcher = async () => {
    fetchCount++
    return { name: 'Durov', timestamp: Date.now() }
  }

  const res1 = await cache.getOrRevalidate('user_1', fetcher, { freshTtlMs: 50, staleTtlMs: 500 })
  assert.strictEqual(res1.isFromCache, false, 'Initial call should be cache miss')
  assert.strictEqual(res1.isStale, false)
  assert.strictEqual(res1.data.name, 'Durov')
  assert.strictEqual(fetchCount, 1)
  console.log('  ✅ Cache miss & initial population passed')

  // Test 2: Fresh Hit
  const res2 = await cache.getOrRevalidate('user_1', fetcher, { freshTtlMs: 50, staleTtlMs: 500 })
  assert.strictEqual(res2.isFromCache, true, 'Immediate subsequent call should be cache hit')
  assert.strictEqual(res2.isStale, false)
  assert.strictEqual(fetchCount, 1, 'Fetcher must not be invoked on fresh hit')
  console.log('  ✅ Fresh cache hit passed')

  // Test 3: Stale-While-Revalidate Hit & Background Update
  await sleep(70) // Wait past freshTtl (50ms) but before staleTtl (500ms)

  let backgroundUpdated = false
  const updatedFetcher = async () => {
    fetchCount++
    return { name: 'Durov Updated', timestamp: Date.now() }
  }

  const res3 = await cache.getOrRevalidate('user_1', updatedFetcher, {
    freshTtlMs: 50,
    staleTtlMs: 500,
    onBackgroundUpdate: (fresh) => {
      backgroundUpdated = true
    },
  })

  // Must return old data immediately (0ms UI latency)
  assert.strictEqual(res3.isFromCache, true)
  assert.strictEqual(res3.isStale, true, 'Age past freshTtl must be reported as stale')
  assert.strictEqual(res3.data.name, 'Durov', 'Must return cached data immediately')

  // Wait for background revalidation
  await sleep(50)
  assert.strictEqual(backgroundUpdated, true, 'onBackgroundUpdate hook should have fired')
  assert.strictEqual(fetchCount, 2, 'Fetcher must be invoked in background')

  // Next read should be fresh with updated data
  const res4 = await cache.getOrRevalidate('user_1', fetcher)
  assert.strictEqual(res4.data.name, 'Durov Updated', 'Cache must have updated value')
  console.log('  ✅ Stale-While-Revalidate background update passed')

  // Test 4: Thundering Herd Protection (Concurrent In-Flight Dedup)
  cache.clear()
  let slowFetchCount = 0
  const slowFetcher = async () => {
    slowFetchCount++
    await sleep(40)
    return 'heavy_computation_result'
  }

  const concurrentCalls = [
    cache.getOrRevalidate('slow_key', slowFetcher),
    cache.getOrRevalidate('slow_key', slowFetcher),
    cache.getOrRevalidate('slow_key', slowFetcher),
    cache.getOrRevalidate('slow_key', slowFetcher),
  ]

  const results = await Promise.all(concurrentCalls)
  assert.strictEqual(slowFetchCount, 1, 'Slow fetcher must only be called ONCE for 4 concurrent requests')
  for (const r of results) {
    assert.strictEqual(r.data, 'heavy_computation_result')
  }
  console.log('  ✅ Thundering herd concurrent deduplication passed')

  // Test 5: Surgical Invalidation & Prefix Invalidation
  cache.clear()
  cache.set('acc_1_dialogs', ['d1', 'd2'])
  cache.set('acc_1_profile', { id: 1 })
  cache.set('acc_2_dialogs', ['d3'])

  assert.strictEqual(cache.size(), 3, 'Cache size should be 3')
  const invalidated = cache.invalidatePrefix('acc_1_')
  assert.strictEqual(invalidated, 2, 'Should invalidate exactly 2 keys for acc_1_')
  assert.strictEqual(cache.size(), 1, 'Cache size after invalidation should be 1')
  assert.strictEqual(cache.get('acc_1_dialogs'), null)
  assert.strictEqual(cache.get('acc_1_profile'), null)
  assert.ok(cache.get('acc_2_dialogs') !== null, 'acc_2_dialogs must remain intact')
  console.log('  ✅ Prefix and surgical invalidation passed')

  console.log('🎉 All SwrCacheManager Tests (Layer 04 MM-084) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
