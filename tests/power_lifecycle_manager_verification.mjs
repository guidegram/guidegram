import assert from 'assert'
import { PowerLifecycleManager } from '../electron/powerLifecycleManager.ts'

console.log('🧪 Starting Phase 49 Verification: System Wake/Sleep Network Socket Reconnect & Proxy Resync...')

// Mock dependencies
let checkpointCalledWith = null
let networkOfflineCalled = false
let networkOnlineCalled = false
let dohCacheCleared = false
let proxyPingCalled = false
let broadcasts = []

const mockPowerMonitorListeners = {}
const mockPowerMonitor = {
  on: (event, handler) => {
    mockPowerMonitorListeners[event] = handler
  },
}

const mockSqliteTuner = {
  checkpointWal: (_db, mode) => {
    checkpointCalledWith = mode
  },
}

const mockDb = { name: 'test_db' }

const mockNetworkReconnectManager = {
  onNetworkOffline: () => {
    networkOfflineCalled = true
  },
  onNetworkOnline: (factory) => {
    networkOnlineCalled = true
    // Simulate running reconnect factory for an account
    const action = factory('acc_1')
    action()
  },
}

const mockDohResolver = {
  clearCache: () => {
    dohCacheCleared = true
  },
}

const mockAccountManager = {
  getAccounts: () => [
    { id: 'acc_1', status: 'connected' },
    { id: 'acc_2', status: 'disconnected' },
    { id: 'acc_3', status: 'connecting' },
  ],
  reconnectAccount: async (accId) => ({ id: accId, status: 'connected' }),
}

const mockProxy = { enabled: true, host: '127.0.0.1', port: 1080 }

const broadcastWebContents = (channel, payload) => {
  broadcasts.push({ channel, payload })
}

const manager = new PowerLifecycleManager({
  powerMonitor: mockPowerMonitor,
  accountManager: mockAccountManager,
  networkReconnectManager: mockNetworkReconnectManager,
  dohResolver: mockDohResolver,
  sqliteTuner: mockSqliteTuner,
  getDatabase: () => mockDb,
  getProxyConfig: () => mockProxy,
  testProxyPing: async (_p) => {
    proxyPingCalled = true
    return 42
  },
  broadcastWebContents,
})

manager.resetTelemetry()

// Test 1: Native powerMonitor listener registration
console.log('\n--- Test 1: Native powerMonitor Listener Registration ---')
manager.init()
assert.ok(typeof mockPowerMonitorListeners['suspend'] === 'function', 'suspend listener registered')
assert.ok(typeof mockPowerMonitorListeners['resume'] === 'function', 'resume listener registered')
assert.ok(typeof mockPowerMonitorListeners['lock-screen'] === 'function', 'lock-screen listener registered')
assert.ok(typeof mockPowerMonitorListeners['unlock-screen'] === 'function', 'unlock-screen listener registered')
console.log('✅ Assertion 1 passed: All OS powerMonitor lifecycle hooks successfully bound.')

// Test 2: Suspend Execution
console.log('\n--- Test 2: Suspend Execution ---')
await manager.handleSuspend()
const telSuspend = manager.getTelemetry()
assert.strictEqual(telSuspend.totalSuspends, 1)
assert.strictEqual(telSuspend.isSuspended, true)
assert.ok(telSuspend.lastSuspendTimestamp > 0)
assert.strictEqual(checkpointCalledWith, 'PASSIVE', 'SQLite checkpointWal must be called with PASSIVE on sleep')
assert.strictEqual(networkOfflineCalled, true, 'networkReconnectManager.onNetworkOffline must be called')
assert.ok(broadcasts.some((b) => b.channel === 'system:power-suspended'), 'system:power-suspended broadcasted')
console.log('✅ Assertion 2 passed: Suspend flushes SQLite WAL, pauses reconnect backoff, and alerts renderer.')

// Test 3: Resume Execution (Wake from Sleep)
console.log('\n--- Test 3: Resume Execution (Wake from Sleep) ---')
const resumeResult = await manager.handleResume(15000)
const telResume = manager.getTelemetry()
assert.strictEqual(telResume.totalResumes, 1)
assert.strictEqual(telResume.isSuspended, false)
assert.strictEqual(telResume.lastSleepDurationMs, 15000)
assert.strictEqual(dohCacheCleared, true, 'DoH resolver cache must be cleared upon resume')
assert.strictEqual(networkOnlineCalled, true, 'networkReconnectManager.onNetworkOnline must be triggered')
assert.strictEqual(telResume.zombieSocketsTornDown, 2, 'Two candidate accounts (connected + connecting) flagged for reconnect')
assert.strictEqual(telResume.proxyPingsConducted, 1, 'Active proxy latency ping initiated')
assert.ok(broadcasts.some((b) => b.channel === 'system:power-resumed'), 'system:power-resumed broadcasted')
console.log('✅ Assertion 3 passed: Resume purges stale DNS, refreshes zombie sockets, resyncs proxy, and triggers reconnect wave.')

// Test 4: Screen Lock / Unlock Handlers
console.log('\n--- Test 4: Screen Lock / Unlock Handlers ---')
manager.handleLockScreen()
manager.handleUnlockScreen()
const telLock = manager.getTelemetry()
assert.strictEqual(telLock.totalLocks, 1)
assert.strictEqual(telLock.totalUnlocks, 1)
assert.ok(broadcasts.some((b) => b.channel === 'system:power-lock-screen'), 'system:power-lock-screen broadcasted')
assert.ok(broadcasts.some((b) => b.channel === 'system:power-unlock-screen'), 'system:power-unlock-screen broadcasted')
console.log('✅ Assertion 4 passed: Lock/unlock screen events properly audited and forwarded to UI.')

// Test 5: Simulated Lifecycle Methods
console.log('\n--- Test 5: Simulated Lifecycle Methods ---')
await manager.simulateSuspend()
const simRes = await manager.simulateResume(8000)
assert.strictEqual(simRes.sleepDurationMs, 8000)
assert.strictEqual(manager.getTelemetry().totalSuspends, 2)
assert.strictEqual(manager.getTelemetry().totalResumes, 2)
console.log('✅ Assertion 5 passed: Simulation methods work flawlessly for diagnostics and automated testing.')

// Test 6: Fault Tolerance (Graceful Degradation on Faulty Subsystems)
console.log('\n--- Test 6: Fault Tolerance (Graceful Degradation) ---')
const brokenManager = new PowerLifecycleManager({
  sqliteTuner: {
    checkpointWal: () => {
      throw new Error('Disk IO locked')
    },
  },
  dohResolver: {
    clearCache: () => {
      throw new Error('Memory error')
    },
  },
  getDatabase: () => ({}),
})
// Should not throw
await brokenManager.handleSuspend()
await brokenManager.handleResume(1000)
assert.strictEqual(brokenManager.getTelemetry().totalSuspends, 1)
assert.strictEqual(brokenManager.getTelemetry().totalResumes, 1)
console.log('✅ Assertion 6 passed: Exceptions in subsystem listeners are safely caught and isolated.')

// Test 7: Telemetry Reset
console.log('\n--- Test 7: Telemetry Reset ---')
manager.resetTelemetry()
const cleanTel = manager.getTelemetry()
assert.strictEqual(cleanTel.totalSuspends, 0)
assert.strictEqual(cleanTel.totalResumes, 0)
assert.strictEqual(cleanTel.totalLocks, 0)
assert.strictEqual(cleanTel.totalUnlocks, 0)
assert.strictEqual(cleanTel.isSuspended, false)
console.log('✅ Assertion 7 passed: resetTelemetry restores clean operational state.')

console.log('\n🎉 ALL 7 ASSERTIONS PASSED: System Wake/Sleep Network Socket Reconnect & Proxy Resync verified!\n')
