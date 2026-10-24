import assert from 'node:assert/strict'
import { IdempotencyManager } from '../electron/idempotency'

async function runTests() {
  console.log('🧪 Starting IdempotencyManager Verification Tests (MM-103)...')
  const manager = IdempotencyManager.getInstance()
  manager.clear()

  // Test 1: In-flight deduplication
  let callCount = 0
  const slowOp = async () => {
    callCount++
    await new Promise((r) => setTimeout(r, 50))
    return { success: true, count: callCount }
  }

  const key1 = 'test:in-flight:1'
  const [res1, res2, res3] = await Promise.all([
    manager.execute(key1, slowOp, 5000),
    manager.execute(key1, slowOp, 5000),
    manager.execute(key1, slowOp, 5000),
  ])

  assert.equal(callCount, 1, 'Operation must only be executed once across parallel in-flight calls')
  assert.equal(res1.count, 1)
  assert.equal(res2.count, 1)
  assert.equal(res3.count, 1)
  console.log('  ✅ In-flight deduplication passed')

  // Test 2: Cached result deduplication
  const resCached = await manager.execute(key1, slowOp, 5000)
  assert.equal(callCount, 1, 'Operation must not re-execute if within TTL')
  assert.equal(resCached.count, 1)
  console.log('  ✅ Cache TTL deduplication passed')

  // Test 3: Failure handling & eviction
  let failCount = 0
  const failingOp = async () => {
    failCount++
    throw new Error('Network timeout simulation')
  }

  const keyFail = 'test:fail:1'
  await assert.rejects(async () => {
    await manager.execute(keyFail, failingOp)
  }, /Network timeout/)

  // Immediate retry after failure should be allowed to run
  let recoverCount = 0
  const recoveredRes = await manager.execute(keyFail, async () => {
    recoverCount++
    return 'recovered'
  })
  assert.equal(recoveredRes, 'recovered')
  assert.equal(recoverCount, 1)
  console.log('  ✅ Failure eviction & retry recovery passed')

  // Test 4: Key generation determinism
  const k1 = manager.generateKey('send-message', { accountId: 'acc1', chatId: 123, text: 'hello' })
  const k2 = manager.generateKey('send-message', { accountId: 'acc1', chatId: 123, text: 'hello' })
  const k3 = manager.generateKey('send-message', { accountId: 'acc1', chatId: 123, text: 'world' })
  assert.equal(k1, k2, 'Keys with identical arguments must match')
  assert.notEqual(k1, k3, 'Keys with different arguments must differ')
  console.log('  ✅ Key generation determinism passed')

  // Test 5: Cleanup sweeps expired
  manager.clear()
  await manager.execute('test:expire', async () => 'done', 10) // 10ms ttl
  await new Promise((r) => setTimeout(r, 20))
  const removed = manager.cleanup()
  assert.equal(removed, 1, 'Cleanup should sweep expired records')
  assert.equal(manager.getTrackedCount(), 0)
  console.log('  ✅ Cleanup sweep passed')

  manager.destroy()
  console.log('🎉 All Idempotency Tests (MM-103) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
