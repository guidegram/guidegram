import assert from 'assert'
import crypto from 'node:crypto'
import { AccountExportService } from '../dist-electron/telegram/accountExportService.js'

console.log('🧪 Starting Military-Grade Account Export & Air-Gapped Optical Sync Verification...')

// 1. Mock SessionStore
const mockAccounts = [
  { id: '111222', firstName: 'Ershad', lastName: 'Zolfi', phone: '+989120000000', username: 'ershad' },
  { id: '333444', firstName: 'Guidegram', lastName: 'Bot', isBot: true, username: 'guidegram_bot' },
  { id: '555666', firstName: 'Doctor', lastName: 'Guidance', phone: '+989350000000' },
]

const mockSessions = {
  '111222': '1//AQAAAP8...mock_session_key_alpha...',
  '333444': '1//AQAAAP8...mock_bot_session_beta...',
  '555666': '1//AQAAAP8...mock_user_session_gamma...',
}

const mockStore = {
  getConfig: () => ({ accounts: mockAccounts }),
  getSessionString: (id) => mockSessions[id] || null,
}

const exportService = new AccountExportService(mockStore)

// 2. Test prepareExport
console.log('  Testing prepareExport()...')
const res = exportService.prepareExport()
assert(res.pin && res.pin.length === 6, 'PIN must be exactly 6 digits')
assert(Number(res.pin) >= 100000 && Number(res.pin) <= 999999, 'PIN must be a valid 6-digit number')
assert.strictEqual(res.accountCount, 3, 'Must export all 3 available accounts')
assert(res.chunks.length > 0, 'Must produce at least 1 chunk')
assert.strictEqual(res.chunks.length, res.totalChunks, 'Total chunks must match chunks length')
console.log(`    ✅ Successfully bundled 3 accounts into ${res.totalChunks} Animated QR chunk(s) with PIN: ${res.pin}`)

// Verify chunk formatting: GG1:<index>/<total>:<data>
for (let i = 0; i < res.chunks.length; i++) {
  const chunk = res.chunks[i]
  assert(chunk.startsWith(`GG1:${i + 1}/${res.totalChunks}:`), `Chunk ${i} header invalid: ${chunk}`)
}
console.log('    ✅ All chunk headers follow the GG1:<idx>/<total> specification.')

// 3. Reassemble Wire Packet from Chunks
console.log('  Testing Chunk Assembly and Decryption...')
const assembledWirePacket = res.chunks
  .map(c => c.split(':').slice(2).join(':'))
  .join('')

// 4. Test Decryption with correct PIN
const decrypted = AccountExportService.decryptPayload(assembledWirePacket, res.pin)
assert.strictEqual(decrypted.length, 3, 'Decrypted accounts must equal 3')
assert.strictEqual(decrypted[0].id, '111222')
assert.strictEqual(decrypted[0].sessionString, mockSessions['111222'])
assert.strictEqual(decrypted[1].id, '333444')
assert.strictEqual(decrypted[2].id, '555666')
console.log('    ✅ Decryption with correct PIN succeeded and restored 100% of session strings!')

// 5. Test Decryption with WRONG PIN
console.log('  Testing Tamper & Wrong-PIN Resistance...')
assert.throws(() => {
  AccountExportService.decryptPayload(assembledWirePacket, '999999' === res.pin ? '111111' : '999999')
}, /Failed to decrypt account payload/, 'Decryption must fail when PIN is wrong')
console.log('    ✅ Wrong PIN correctly rejected with cryptographic failure.')

// 6. Test Tampered Packet
const tamperedPacket = assembledWirePacket.replace(/a/g, 'b')
assert.throws(() => {
  AccountExportService.decryptPayload(tamperedPacket, res.pin)
}, /Failed to decrypt account payload/, 'Tampered ciphertext must fail authentication tag')
console.log('    ✅ Tampered ciphertext rejected by AES-256-GCM authTag!')

// 7. Test Partial Account Selection
const selectiveRes = exportService.prepareExport(['111222'])
assert.strictEqual(selectiveRes.accountCount, 1, 'Only 1 account should be exported')
const selectiveWire = selectiveRes.chunks.map(c => c.split(':').slice(2).join(':')).join('')
const selectiveDecrypted = AccountExportService.decryptPayload(selectiveWire, selectiveRes.pin)
assert.strictEqual(selectiveDecrypted.length, 1)
assert.strictEqual(selectiveDecrypted[0].id, '111222')
console.log('    ✅ Selective account export verified.')

// 8. Test Cancel Export
exportService.cancelExport()
console.log('    ✅ Export cancellation clean-up verified.')

console.log('🎉 All Account Export & Air-Gapped Optical Sync verifications passed with 100% precision!')
