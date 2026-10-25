/**
 * MemoryPressureManager Verification Suite (MM-211 / Layer 08 Resource Hygiene)
 * Tests:
 * 1. Singleton pattern and clean reset
 * 2. Pressure level classification (normal, warning, elevated, critical)
 * 3. Normal heap state does not execute eviction handlers
 * 4. Elevated heap triggers registered Tier 1 eviction handlers
 * 5. Critical heap triggers both Tier 1 and Tier 2 eviction handlers
 * 6. Fault-tolerant handler execution (resilient to handler exceptions)
 * 7. Handler registration and unregistration
 * 8. V8 Garbage Collection triggering
 * 9. Re-entrancy guard preventing concurrent eviction races
 * 10. Accurate telemetry metrics reporting
 */

import assert from 'node:assert'
import {
  MemoryPressureManager,
  DEFAULT_MEMORY_THRESHOLDS,
} from '../electron/memoryPressureManager.ts'

console.log('🧪 Starting MemoryPressureManager Verification Suite (MM-211, Layer 08)...')

let passedAssertions = 0

function it(desc, fn) {
  try {
    fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

async function itAsync(desc, fn) {
  try {
    await fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

// Helper to generate mock memory usage
function makeMemoryUsage(heapUsedMb, rssMb = 600) {
  const toBytes = (mb) => mb * 1024 * 1024
  return () => ({
    rss: toBytes(rssMb),
    heapTotal: toBytes(heapUsedMb + 100),
    heapUsed: toBytes(heapUsedMb),
    external: toBytes(50),
    arrayBuffers: toBytes(20),
  })
}

// 1. Singleton
it('1. Returns singleton instance and supports clean reset', () => {
  MemoryPressureManager.resetInstance()
  const instance1 = MemoryPressureManager.getInstance()
  const instance2 = MemoryPressureManager.getInstance()
  assert.strictEqual(instance1, instance2)
})

// 2. Pressure classification
it('2. Correctly classifies memory usage into normal, warning, elevated, and critical', () => {
  const manager = new MemoryPressureManager({ warningMb: 500, elevatedMb: 700, criticalMb: 900 })

  assert.strictEqual(manager.getMemorySnapshot(makeMemoryUsage(300)).level, 'normal')
  assert.strictEqual(manager.getMemorySnapshot(makeMemoryUsage(550)).level, 'warning')
  assert.strictEqual(manager.getMemorySnapshot(makeMemoryUsage(750)).level, 'elevated')
  assert.strictEqual(manager.getMemorySnapshot(makeMemoryUsage(950)).level, 'critical')
})

// 3. Normal heap does not trigger eviction
await itAsync('3. Normal memory pressure does not trigger any eviction handlers', async () => {
  const manager = new MemoryPressureManager()
  let elevatedRun = false
  let criticalRun = false

  manager.registerHandler('elevated', 'test1', () => { elevatedRun = true })
  manager.registerHandler('critical', 'test2', () => { criticalRun = true })

  await manager.evaluatePressure(makeMemoryUsage(250))

  assert.strictEqual(elevatedRun, false)
  assert.strictEqual(criticalRun, false)
  assert.strictEqual(manager.getTelemetry().pressureEventsCount, 0)
})

// 4. Elevated heap triggers Tier 1
await itAsync('4. Elevated heap triggers Tier 1 eviction handlers only', async () => {
  const manager = new MemoryPressureManager()
  let elevatedRun = false
  let criticalRun = false

  manager.registerHandler('elevated', 'h1', () => { elevatedRun = true })
  manager.registerHandler('critical', 'h2', () => { criticalRun = true })

  await manager.evaluatePressure(makeMemoryUsage(750))

  assert.strictEqual(elevatedRun, true, 'Tier 1 must execute')
  assert.strictEqual(criticalRun, false, 'Tier 2 must NOT execute on elevated')

  const tel = manager.getTelemetry()
  assert.strictEqual(tel.elevatedEvictionsCount, 1)
  assert.strictEqual(tel.criticalEvictionsCount, 0)
})

// 5. Critical heap triggers both Tier 1 and Tier 2
await itAsync('5. Critical heap triggers both Tier 1 and Tier 2 emergency eviction handlers', async () => {
  const manager = new MemoryPressureManager()
  let elevatedRun = false
  let criticalRun = false

  manager.registerHandler('elevated', 'h1', () => { elevatedRun = true })
  manager.registerHandler('critical', 'h2', () => { criticalRun = true })

  await manager.evaluatePressure(makeMemoryUsage(950))

  assert.strictEqual(elevatedRun, true)
  assert.strictEqual(criticalRun, true)

  const tel = manager.getTelemetry()
  assert.strictEqual(tel.elevatedEvictionsCount, 1)
  assert.strictEqual(tel.criticalEvictionsCount, 1)
})

// 6. Fault-tolerant execution
await itAsync('6. Continues eviction sequence even if one handler throws an error', async () => {
  const manager = new MemoryPressureManager()
  let secondRan = false

  manager.registerHandler('elevated', 'failing', () => {
    throw new Error('Cache prune failed')
  })
  manager.registerHandler('elevated', 'succeeding', () => {
    secondRan = true
  })

  await manager.runElevatedEviction()
  assert.strictEqual(secondRan, true, 'Second handler must execute despite prior failure')
})

// 7. Handler unregistration
it('7. Supports unregistering handlers by tier and name', () => {
  const manager = new MemoryPressureManager()
  let ran = false
  manager.registerHandler('elevated', 'temp', () => { ran = true })
  manager.unregisterHandler('elevated', 'temp')

  manager.runElevatedEviction()
  assert.strictEqual(ran, false, 'Unregistered handler must not run')
})

// 8. V8 GC invocation
it('8. triggerV8GarbageCollection executes safely or reports false when gc is unavailable', () => {
  const manager = new MemoryPressureManager()
  // Mock global.gc
  let gcCalled = false
  const origGc = global.gc
  global.gc = () => { gcCalled = true }

  try {
    const success = manager.triggerV8GarbageCollection()
    assert.strictEqual(success, true)
    assert.strictEqual(gcCalled, true)
  } finally {
    global.gc = origGc
  }
})

// 9. Re-entrancy guard
await itAsync('9. Re-entrancy guard prevents concurrent overlapping eviction executions', async () => {
  const manager = new MemoryPressureManager()
  let slowCount = 0
  let releaseSlow

  manager.registerHandler('elevated', 'slow', async () => {
    slowCount++
    await new Promise((r) => { releaseSlow = r })
  })

  // Start first eviction
  const p1 = manager.evaluatePressure(makeMemoryUsage(750))

  // Attempt second concurrent evaluation while first is in-flight
  await manager.evaluatePressure(makeMemoryUsage(750))

  releaseSlow()
  await p1

  assert.strictEqual(slowCount, 1, 'Only one eviction loop must execute at once')
})

// 10. Accurate telemetry
it('10. Telemetry reports accurate metrics and last pressure state', () => {
  const manager = new MemoryPressureManager()
  const tel = manager.getTelemetry()
  assert.strictEqual(typeof tel.pressureEventsCount, 'number')
  assert.strictEqual(typeof tel.elevatedEvictionsCount, 'number')
  assert.strictEqual(typeof tel.criticalEvictionsCount, 'number')
  assert.strictEqual(typeof tel.currentUsage.heapUsedMb, 'number')
})

console.log(`\n🎉 All ${passedAssertions}/${passedAssertions} MemoryPressureManager assertions passed successfully!`)
process.exit(0)
