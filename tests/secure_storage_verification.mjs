import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { SecureStorage } from '../electron/telegram/secureStorage'
import { SessionStore } from '../electron/telegram/sessionStore'

async function runTests() {
  console.log('🧪 Starting SecureStorage & RLS Isolation Verification Tests (MM-088)...')

  // Test 1: Encryption & Decryption roundtrip
  const sessionData = '1BvBMDFy...example_mtproto_long_session_token_xyz_987654321...'
  const encrypted = SecureStorage.encrypt(sessionData)
  assert.ok(encrypted.startsWith('ENC:'), 'Encrypted payload must have ENC: prefix')
  assert.notEqual(encrypted, sessionData, 'Encrypted payload must never equal plaintext')

  const decrypted = SecureStorage.decrypt(encrypted)
  assert.equal(decrypted, sessionData, 'Decrypted output must match original plaintext exactly')
  console.log('  ✅ Encryption & Decryption roundtrip passed')

  // Test 2: Legacy unencrypted fallback
  const legacyPlaintext = 'legacy_session_unencrypted_12345'
  const legacyDecrypted = SecureStorage.decrypt(legacyPlaintext)
  assert.equal(legacyDecrypted, legacyPlaintext, 'Legacy unencrypted strings must be returned transparently')
  console.log('  ✅ Legacy session string backward compatibility passed')

  // Test 3: Path traversal & RLS sandbox enforcement
  assert.throws(() => {
    SecureStorage.sanitizeAccountId('../../../etc/passwd')
  }, /violates isolation bounds|Invalid accountId/)

  const sanitized = SecureStorage.sanitizeAccountId('acc_12345-user')
  assert.equal(sanitized, 'acc_12345-user')
  console.log('  ✅ Path traversal defense & account sandbox sanitization passed')

  // Test 4: End-to-end SessionStore integration with transparent migration
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guidegram-test-session-'))
  try {
    const store = new SessionStore(tempDir)
    const testAccId = 'acc_test_99'
    const testSecret = 'secret_session_data_42'

    // Write session
    store.saveSessionString(testAccId, testSecret)

    // Verify file on disk is encrypted!
    const sessionFile = path.join(tempDir, 'sessions', `session_${testAccId}.txt`)
    assert.ok(fs.existsSync(sessionFile), 'Session file must exist')
    const rawDiskContent = fs.readFileSync(sessionFile, 'utf-8').trim()
    assert.ok(rawDiskContent.startsWith('ENC:'), 'File on disk must be encrypted with ENC: prefix')

    // Read back via getSessionString
    const retrieved = store.getSessionString(testAccId)
    assert.equal(retrieved, testSecret, 'Retrieved session must match original secret')

    // Test legacy migration: manually write an unencrypted file
    const legacyFile = path.join(tempDir, 'sessions', 'session_legacy_user.txt')
    fs.writeFileSync(legacyFile, 'raw_legacy_secret', 'utf-8')
    const migrated = store.getSessionString('legacy_user')
    assert.equal(migrated, 'raw_legacy_secret')
    // Check disk content was transparently upgraded to encrypted!
    const upgradedDisk = fs.readFileSync(legacyFile, 'utf-8').trim()
    assert.ok(upgradedDisk.startsWith('ENC:'), 'Legacy session file must be transparently upgraded to encrypted')

    console.log('  ✅ SessionStore encrypted persistence & transparent migration passed')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('🎉 All SecureStorage & RLS Tests (MM-088) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
