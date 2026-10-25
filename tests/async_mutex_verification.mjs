import assert from 'assert'
import { KeyedAsyncMutex } from '../electron/asyncMutex.ts'

console.log('🧪 Starting KeyedAsyncMutex Verification Tests (Layer 03 MM-022)...')

const mutex = KeyedAsyncMutex.getInstance()
mutex.reset()

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runTests() {
  // Test 1: Sequential Mutual Exclusion on the Same Key
  const executionOrder = []
  const task1 = async () => {
    executionOrder.push('t1_start')
    await sleep(30)
    executionOrder.push('t1_end')
    return 1
  }

  const task2 = async () => {
    executionOrder.push('t2_start')
    await sleep(10)
    executionOrder.push('t2_end')
    return 2
  }

  const p1 = mutex.runExclusive('acc_1', task1)
  const p2 = mutex.runExclusive('acc_1', task2)

  const [r1, r2] = await Promise.all([p1, p2])
  assert.strictEqual(r1, 1)
  assert.strictEqual(r2, 2)
  assert.deepStrictEqual(
    executionOrder,
    ['t1_start', 't1_end', 't2_start', 't2_end'],
    'Tasks on same key must execute strictly sequentially without interleaving'
  )
  assert.strictEqual(mutex.isLocked('acc_1'), false, 'Key should be unlocked after completion')
  console.log('  ✅ Sequential mutual exclusion passed')

  // Test 2: Independent Parallel Execution on Different Keys
  const parallelOrder = []
  const pTaskA = mutex.runExclusive('acc_A', async () => {
    parallelOrder.push('A_start')
    await sleep(30)
    parallelOrder.push('A_end')
  })
  const pTaskB = mutex.runExclusive('acc_B', async () => {
    parallelOrder.push('B_start')
    await sleep(10)
    parallelOrder.push('B_end')
  })

  await Promise.all([pTaskA, pTaskB])
  assert.strictEqual(parallelOrder[0], 'A_start')
  assert.strictEqual(parallelOrder[1], 'B_start')
  assert.strictEqual(parallelOrder[2], 'B_end') // B finishes before A because it's shorter and runs in parallel
  assert.strictEqual(parallelOrder[3], 'A_end')
  console.log('  ✅ Independent parallel execution across keys passed')

  // Test 3: Thundering Herd Deduplication
  let executionCount = 0
  const heavyConnect = async () => {
    executionCount++
    await sleep(40)
    return { status: 'connected', time: Date.now() }
  }

  const dedupResults = await Promise.all([
    mutex.runExclusiveDedup('acc_herd', heavyConnect),
    mutex.runExclusiveDedup('acc_herd', heavyConnect),
    mutex.runExclusiveDedup('acc_herd', heavyConnect),
    mutex.runExclusiveDedup('acc_herd', heavyConnect),
  ])

  assert.strictEqual(executionCount, 1, 'Heavy task must only be executed ONCE across concurrent callers')
  for (const res of dedupResults) {
    assert.strictEqual(res.status, 'connected')
    assert.strictEqual(res.time, dedupResults[0].time)
  }
  console.log('  ✅ Thundering herd deduplication passed')

  // Test 4: Lock Timeout Protection
  const releaseLock = await mutex.acquire('acc_timeout')
  assert.strictEqual(mutex.isLocked('acc_timeout'), true)

  let timedOut = false
  try {
    await mutex.runExclusive('acc_timeout', async () => 'never_reached', 50)
  } catch (err) {
    timedOut = true
    assert.ok(err.message.includes('timed out'), 'Should fail with timeout error')
  }
  assert.strictEqual(timedOut, true, 'Lock acquisition should time out gracefully')

  releaseLock()
  assert.strictEqual(mutex.isLocked('acc_timeout'), false)
  console.log('  ✅ Lock acquisition timeout protection passed')

  console.log('🎉 All KeyedAsyncMutex Tests (Layer 03 MM-022) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
