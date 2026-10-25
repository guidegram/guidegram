import assert from 'assert'
import { MtprotoAuditInspector } from '../electron/telegram/mtprotoAuditInspector.ts'

console.log('🧪 Starting Phase 51 Verification: Telegram MTProto TL-Schema Layer Parity Audit & Coverage...')

// Test 1: Full Audit Report Generation
console.log('\n--- Test 1: Full Audit Report Generation ---')
const report = MtprotoAuditInspector.generateAuditReport({
  status: 'connected',
  primaryDcId: 2,
  activeDataCenters: [1, 2, 4, 5],
})

assert.strictEqual(report.schemaLayer, 229, 'Schema Layer must be Layer 229+')
assert.strictEqual(report.totalNamespaces, 28, 'Must cover all 28 MTProto namespaces')
assert.strictEqual(report.totalFunctions, 859, 'Must audit all 859 MTProto RPC functions')
assert.strictEqual(report.totalConstructors, 1719, 'Must audit all 1719 MTProto constructors')
assert.strictEqual(report.overallCoveragePercentage, 100.0, 'Coverage must be 100%')
assert.strictEqual(report.connectionState, 'connected')
assert.strictEqual(report.primaryDcId, 2)
assert.deepStrictEqual(report.activeDataCenters, [1, 2, 4, 5])
console.log('✅ Assertion 1 passed: Comprehensive report generated across 859 methods and 28 namespaces.')

// Test 2: Core Namespace Method Counts Verification
console.log('\n--- Test 2: Core Namespace Method Counts Verification ---')
const nsMap = new Map(report.namespaces.map((ns) => [ns.name, ns]))
assert.strictEqual(nsMap.get('messages').methodCount, 261, 'messages has 261 methods')
assert.strictEqual(nsMap.get('account').methodCount, 128, 'account has 128 methods')
assert.strictEqual(nsMap.get('payments').methodCount, 76, 'payments has 76 methods')
assert.strictEqual(nsMap.get('channels').methodCount, 58, 'channels has 58 methods')
assert.strictEqual(nsMap.get('phone').methodCount, 43, 'phone has 43 methods')
assert.strictEqual(nsMap.get('bots').methodCount, 40, 'bots has 40 methods')
assert.strictEqual(nsMap.get('stories').methodCount, 33, 'stories has 33 methods')
assert.strictEqual(nsMap.get('auth').methodCount, 30, 'auth has 30 methods')
assert.strictEqual(nsMap.get('contacts').methodCount, 30, 'contacts has 30 methods')
assert.strictEqual(nsMap.get('wallet').methodCount, 26, 'wallet has 26 methods')
console.log('✅ Assertion 2 passed: All high-impact namespaces verified with exact method counts.')

// Test 3: Method Existence Checks
console.log('\n--- Test 3: Method Existence Checks ---')
assert.strictEqual(MtprotoAuditInspector.hasMethod('messages', 'sendMessage'), true)
assert.strictEqual(MtprotoAuditInspector.hasMethod('stories', 'sendStory'), true)
assert.strictEqual(MtprotoAuditInspector.hasMethod('payments', 'getStarGifts'), true)
assert.strictEqual(MtprotoAuditInspector.hasMethod('nonexistent_ns', 'foo'), false)
console.log('✅ Assertion 3 passed: Method existence checker functions correctly.')

console.log('\n🎉 ALL 3 ASSERTIONS PASSED: Telegram MTProto Layer Parity Audit verified!\n')
