import { AccountVaultManager } from '../electron/telegram/accountVaultManager.ts'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    failed++
    process.exitCode = 1
  } else {
    console.log(`✅ PASS: ${message}`)
    passed++
  }
}

async function runTests() {
  console.log('🧪 Starting Multi-Account Credential Vault Verification Suite (Layer 10 / Layer 08)...')

  const vault = new AccountVaultManager()

  // Test 1: Setting and reading within the same account
  console.log('\n--- Test 1: Same-Account Credential Storage & Retrieval ---')
  vault.setSecret('acc_alice', 'session_string', '1/AQAA_Alice_Telegram_Session_12345')
  vault.setSecret('acc_alice', 'phone', '+14155550199')

  const session = vault.getSecret('acc_alice', 'acc_alice', 'session_string')
  assert(session === '1/AQAA_Alice_Telegram_Session_12345', 'Alice retrieved her own session string cleanly')

  const phone = vault.getSecret('acc_alice', 'acc_alice', 'phone')
  assert(phone === '+14155550199', 'Alice retrieved her own phone number cleanly')

  // Test 2: Cross-Account Tenancy Isolation Violation
  console.log('\n--- Test 2: Cross-Account Access Denial ---')
  vault.setSecret('acc_bob', 'session_string', '1/AQAA_Bob_Telegram_Session_67890')

  let threwViolation = false
  try {
    // Bob maliciously tries to read Alice's session string!
    vault.getSecret('acc_bob', 'acc_alice', 'session_string')
  } catch (err) {
    threwViolation = true
    assert(err.message.includes('[AccountIsolationViolation]'), 'Isolation violation error thrown on cross-account read attempt')
  }
  assert(threwViolation === true, 'Unauthorized cross-account read strictly prevented')

  // Test 3: Authenticated AES-256-GCM Encryption
  console.log('\n--- Test 3: AES-256-GCM Authenticated Encryption ---')
  const secretData = 'MySuperSensitiveAuthKey_2026_Secure'
  const encrypted = vault.encryptForStorage('acc_alice', secretData)

  assert(encrypted.ivHex.length === 24, 'GCM IV is 96-bit (24 hex chars)')
  assert(encrypted.authTagHex.length === 32, 'GCM Auth tag is 128-bit (32 hex chars)')
  assert(!encrypted.ciphertextHex.includes(secretData), 'Ciphertext does not expose plaintext')

  const decrypted = vault.decryptFromStorage('acc_alice', encrypted)
  assert(decrypted === secretData, 'Decrypted plaintext matches original secret exactly')

  // Tamper test: Altering ciphertext or authTag must fail
  let tamperCaught = false
  const tampered = { ...encrypted, authTagHex: encrypted.authTagHex.slice(0, -2) + '00' }
  try {
    vault.decryptFromStorage('acc_alice', tampered)
  } catch {
    tamperCaught = true
  }
  assert(tamperCaught === true, 'Tampered ciphertext/authTag rejected by GCM decipher')

  // Test 4: Zero-Credential Memory Purge
  console.log('\n--- Test 4: Zero-Credential Memory Purge ---')
  assert(vault.listActiveAccounts().includes('acc_alice'), 'Alice is currently an active account in vault')
  const purgedItems = vault.purgeAccount('acc_alice')
  assert(purgedItems === 2, `Purged exactly 2 credentials for Alice [got ${purgedItems}]`)
  assert(!vault.listActiveAccounts().includes('acc_alice'), 'Alice compartment completely unmounted')
  assert(vault.getSecret('acc_alice', 'acc_alice', 'session_string') === null, 'Session string returns null after purge')

  // Bob must remain intact
  assert(vault.getSecret('acc_bob', 'acc_bob', 'session_string') === '1/AQAA_Bob_Telegram_Session_67890', 'Bob credential untouched by Alice purge')

  // Test 5: Telemetry Auditing
  console.log('\n--- Test 5: Telemetry Auditing ---')
  const telemetry = vault.getTelemetry()
  assert(telemetry.totalWrites >= 3, 'Recorded writes')
  assert(telemetry.totalReads >= 3, 'Recorded reads')
  assert(telemetry.isolationViolationsBlocked >= 1, 'Recorded blocked cross-account violation')
  assert(telemetry.totalPurges >= 1, 'Recorded account purge')

  console.log(`\n========================================`)
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
