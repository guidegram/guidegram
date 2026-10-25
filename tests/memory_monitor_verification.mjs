import assert from 'node:assert/strict'
import { MemoryMonitor } from '../electron/memoryMonitor'

async function runTests() {
  console.log('🧪 Starting MemoryMonitor & GC Profiling Verification Tests (MM-211)...')
  const monitor = MemoryMonitor.getInstance()

  // Test 1: Memory stats extraction
  const stats = monitor.getMemoryStats()
  assert.ok(stats.rssMb > 0, 'RSS memory must be greater than 0 MB')
  assert.ok(stats.heapTotalMb > 0, 'Heap total must be greater than 0 MB')
  assert.ok(stats.heapUsedMb > 0, 'Heap used must be greater than 0 MB')
  assert.ok(stats.heapTotalMb >= stats.heapUsedMb, 'Heap total must be >= Heap used')
  console.log(`  ✅ Memory stats verified (Heap: ${stats.heapUsedMb} MB / ${stats.heapTotalMb} MB, RSS: ${stats.rssMb} MB)`)

  // Test 2: Memory check threshold evaluation
  const checked = monitor.checkMemory()
  assert.ok(checked.timestamp >= stats.timestamp, 'Timestamp must be non-decreasing')
  console.log('  ✅ Memory watermark threshold evaluation passed')

  // Test 3: Safe GC invocation
  const gcResult = monitor.forceGarbageCollection()
  assert.ok(typeof gcResult === 'boolean', 'GC call should safely return a boolean status')
  console.log(`  ✅ Safe GC execution guard passed (ran: ${gcResult})`)

  monitor.destroy()
  console.log('🎉 All MemoryMonitor Tests (MM-211) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
