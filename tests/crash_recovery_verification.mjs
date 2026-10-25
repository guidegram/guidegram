import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CrashRecoveryManager } from '../electron/crashRecovery'

async function runTests() {
  console.log('🧪 Starting CrashRecoveryManager Verification Tests (MM-205)...')
  const manager = CrashRecoveryManager.getInstance()
  manager.purgeCrashReports()

  // Test 1: Record crash dump to disk
  const sampleError = new Error('Test V8 out of memory simulation')
  const dumpPath = manager.recordCrash('main', sampleError)
  assert.ok(fs.existsSync(dumpPath), 'Crash report file must exist on disk')

  const parsed = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'))
  assert.equal(parsed.processType, 'main')
  assert.equal(parsed.error.message, 'Test V8 out of memory simulation')
  assert.ok(parsed.system.nodeVersion, 'System nodeVersion must be captured')
  assert.ok(parsed.system.memoryUsage, 'System memoryUsage must be captured')
  console.log('  ✅ Synchronous crash report generation and disk persistence passed')

  // Test 2: Get crash reports
  const reports = manager.getCrashReports()
  assert.ok(reports.length >= 1, 'At least 1 report must be retrieved')
  assert.equal(reports[0].id, parsed.id)
  console.log('  ✅ Crash report retrieval and parsing passed')

  // Test 3: Handle renderer crash with reload
  let reloaded = false
  const mockWin = {
    isDestroyed: () => false,
    webContents: {
      reload: () => {
        reloaded = true
      },
    },
  }

  manager.handleRendererCrash(mockWin, { reason: 'crashed', exitCode: 139 })
  // Wait 1.1s for auto-reload timer
  await new Promise((r) => setTimeout(r, 1200))
  assert.equal(reloaded, true, 'Auto-reload must be triggered after first crash')
  console.log('  ✅ Renderer crash auto-reload recovery passed')

  // Test 4: Purge crash reports
  const purged = manager.purgeCrashReports()
  assert.ok(purged >= 1, 'Purge must delete accumulated reports')
  assert.equal(manager.getCrashReports().length, 0)
  console.log('  ✅ Crash reports purge passed')

  console.log('🎉 All CrashRecovery Tests (MM-205) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
