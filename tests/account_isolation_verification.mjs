import assert from 'assert'
import { AccountIsolationGuard } from '../electron/telegram/accountIsolationGuard.ts'

console.log('🧪 Starting AccountIsolationGuard Verification Tests (Layer 10 Multi-Tenancy)...')

// Test 1: assertSafeAccountId validation
assert.strictEqual(AccountIsolationGuard.assertSafeAccountId('user_12345'), 'user_12345')
assert.strictEqual(AccountIsolationGuard.assertSafeAccountId('bot-token-main'), 'bot-token-main')

assert.throws(() => {
  AccountIsolationGuard.assertSafeAccountId('../malicious_path')
}, /Untrusted accountId format/, 'Path traversal accountId must throw')

assert.throws(() => {
  AccountIsolationGuard.assertSafeAccountId('user 123;rm')
}, /Untrusted accountId format/, 'Command injection characters in accountId must throw')

assert.throws(() => {
  AccountIsolationGuard.assertSafeAccountId('')
}, /Missing or invalid accountId/, 'Empty accountId must throw')
console.log('  ✅ Account ID sanitation & boundary enforcement passed')

// Test 2: isAccountAuthorized
const activeAccounts = ['acc_1', 'acc_2', 'acc_3']
assert.strictEqual(AccountIsolationGuard.isAccountAuthorized('acc_1', activeAccounts), true)
assert.strictEqual(AccountIsolationGuard.isAccountAuthorized('acc_99', activeAccounts), false)
assert.strictEqual(AccountIsolationGuard.isAccountAuthorized('', activeAccounts), false)
console.log('  ✅ Account tenancy authorization check passed')

// Test 3: Total memory purge on session termination
const accessHashes = new Map()
accessHashes.set('acc_1_peer_100', 'hash_100')
accessHashes.set('acc_1_peer_200', 'hash_200')
accessHashes.set('acc_2_peer_100', 'hash_2_100')
accessHashes.set('acc_2_peer_300', 'hash_2_300')

const rawMessages = new Map()
rawMessages.set('acc_1_msg_1', { text: 'private data from acc 1' })
rawMessages.set('acc_2_msg_1', { text: 'private data from acc 2' })

const activeDownloads = new Map()
let aborted = false
activeDownloads.set('acc_1_media_99', { abort: () => { aborted = true } })
activeDownloads.set('acc_2_media_99', { abort: () => {} })

const purgedCount = AccountIsolationGuard.purgeAccountCaches('acc_1', [
  accessHashes,
  rawMessages,
  activeDownloads,
])

assert.strictEqual(purgedCount, 4, 'Should have purged 4 items belonging to acc_1')
assert.strictEqual(accessHashes.has('acc_1_peer_100'), false, 'acc_1 peer hash must be deleted')
assert.strictEqual(accessHashes.has('acc_1_peer_200'), false, 'acc_1 peer hash must be deleted')
assert.strictEqual(accessHashes.has('acc_2_peer_100'), true, 'acc_2 peer hash must remain intact')
assert.strictEqual(rawMessages.has('acc_1_msg_1'), false, 'acc_1 raw message must be deleted')
assert.strictEqual(rawMessages.has('acc_2_msg_1'), true, 'acc_2 raw message must remain intact')
assert.strictEqual(activeDownloads.has('acc_1_media_99'), false, 'acc_1 active download must be removed')
assert.strictEqual(activeDownloads.has('acc_2_media_99'), true, 'acc_2 active download must remain intact')

console.log('  ✅ Memory purge and zero cross-account leakage passed')
console.log('🎉 All AccountIsolationGuard Tests (Layer 10) PASSED successfully!')
