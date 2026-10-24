import assert from 'node:assert/strict'
import { OfflineQueue } from '../electron/offlineQueue'

async function runTests() {
  console.log('🧪 Starting OfflineQueue & Dead-Letter Queue (DLQ) Verification Tests (MM-019)...')
  const queue = OfflineQueue.getInstance()
  queue.clear()

  // Test 1: Successful processing
  let handledCount = 0
  queue.registerHandler('test-success', async (task) => {
    handledCount++
    assert.equal(task.payload.msg, 'hello')
  })

  const taskId1 = queue.enqueue('test-success', 'acc1', { msg: 'hello' })
  assert.equal(queue.getStats().pending, 1)

  await queue.processQueue()
  assert.equal(handledCount, 1)
  assert.equal(queue.getStats().pending, 0)
  console.log('  ✅ Successful task handling passed')

  // Test 2: Transient failure and exponential backoff
  let failAttempts = 0
  queue.registerHandler('test-retry', async (task) => {
    failAttempts++
    if (failAttempts < 3) {
      throw new Error(`Transient network failure attempt ${failAttempts}`)
    }
  })

  const taskId2 = queue.enqueue('test-retry', 'acc1', { data: 123 }, 4)
  // First attempt fails
  await queue.processQueue()
  assert.equal(failAttempts, 1)
  const pendingTasks = queue.getQueue()
  assert.equal(pendingTasks.length, 1)
  assert.equal(pendingTasks[0].attempts, 1)
  assert.ok(pendingTasks[0].nextAttemptAt > Date.now(), 'Backoff delay must be set in the future')

  // Force nextAttemptAt to now to test retry
  pendingTasks[0].nextAttemptAt = Date.now() - 100
  await queue.processQueue()
  assert.equal(failAttempts, 2)
  assert.equal(pendingTasks[0].attempts, 2)

  // Force nextAttemptAt to now for successful 3rd attempt
  pendingTasks[0].nextAttemptAt = Date.now() - 100
  await queue.processQueue()
  assert.equal(failAttempts, 3)
  assert.equal(queue.getStats().pending, 0, 'Task should be removed after success')
  console.log('  ✅ Transient failure & exponential backoff passed')

  // Test 3: Dead-Letter Queue (DLQ) routing when maxAttempts exceeded
  queue.registerHandler('test-dlq', async () => {
    throw new Error('Fatal peer authorization error')
  })

  const taskId3 = queue.enqueue('test-dlq', 'acc1', { fatal: true }, 2)
  const dlqTask = queue.getQueue()[0]

  // Attempt 1
  await queue.processQueue()
  assert.equal(dlqTask.attempts, 1)
  assert.equal(queue.getStats().deadLetters, 0)

  // Attempt 2 (reaches maxAttempts 2)
  dlqTask.nextAttemptAt = Date.now() - 100
  await queue.processQueue()
  assert.equal(queue.getStats().pending, 0)
  assert.equal(queue.getStats().deadLetters, 1)

  const deadLetters = queue.getDeadLetters()
  assert.equal(deadLetters.length, 1)
  assert.equal(deadLetters[0].id, taskId3)
  assert.equal(deadLetters[0].status, 'dead_letter')
  assert.ok(deadLetters[0].lastError.includes('Fatal peer authorization'))
  console.log('  ✅ DLQ routing on max attempts exceeded passed')

  // Test 4: Rescue from DLQ
  const rescued = queue.retryDeadLetter(taskId3)
  assert.equal(rescued, true)
  assert.equal(queue.getStats().deadLetters, 0)
  assert.equal(queue.getStats().pending, 1)
  const rescuedTask = queue.getQueue()[0]
  assert.equal(rescuedTask.attempts, 0)
  assert.equal(rescuedTask.status, 'queued')
  console.log('  ✅ Rescue from DLQ passed')

  // Test 5: Purge DLQ
  queue.clear()
  queue.enqueue('test-dlq', 'acc1', {}, 1)
  await queue.processQueue()
  assert.equal(queue.getStats().deadLetters, 1)
  const purged = queue.purgeDeadLetters()
  assert.equal(purged, 1)
  assert.equal(queue.getStats().deadLetters, 0)
  console.log('  ✅ Purge DLQ passed')

  queue.destroy()
  console.log('🎉 All OfflineQueue & DLQ Tests (MM-019) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
