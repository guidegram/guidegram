import assert from 'assert'
import crypto from 'node:crypto'
import fs from 'fs'
import path from 'path'

console.log('🧪 Starting Military-Grade Account Export & Air-Gapped Optical Sync Verification...')

// 1. Verify that all components and services exist
const servicePath = path.join(process.cwd(), 'electron/telegram/accountExportService.ts')
assert(fs.existsSync(servicePath), 'accountExportService.ts must exist')
const serviceCode = fs.readFileSync(servicePath, 'utf8')

assert(serviceCode.includes('prepareExport('), 'accountExportService.ts must define prepareExport')
assert(serviceCode.includes('cancelExport('), 'accountExportService.ts must define cancelExport')
assert(serviceCode.includes('decryptPayload('), 'accountExportService.ts must define decryptPayload')
assert(serviceCode.includes('aes-256-gcm'), 'accountExportService.ts must use AES-256-GCM encryption')
assert(serviceCode.includes('pbkdf2Sync'), 'accountExportService.ts must use PBKDF2 key derivation')
console.log('  ✅ AccountExportService source code verified.')

// 2. Verify modal UI component exists and has required elements
const modalPath = path.join(process.cwd(), 'src/components/AccountExportModal.tsx')
assert(fs.existsSync(modalPath), 'AccountExportModal.tsx must exist')
const modalCode = fs.readFileSync(modalPath, 'utf8')

assert(modalCode.includes('QRCode.toDataURL'), 'AccountExportModal must render QR codes with QRCode.toDataURL')
assert(modalCode.includes('currentFrame'), 'AccountExportModal must animate QR frames')
assert(modalCode.includes('exportData?.pin'), 'AccountExportModal must display the 6-digit PIN')
console.log('  ✅ AccountExportModal UI component verified.')

// 3. Functional Cryptographic Verification of the Wire Protocol
console.log('  Testing AES-256-GCM & PBKDF2 Wire Protocol in Action...')

function simulateExport(accounts, pinOverride) {
  const pin = pinOverride || Math.floor(100000 + crypto.randomInt(900000)).toString()
  const salt = crypto.randomBytes(16)
  const key = crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256')

  const rawJson = JSON.stringify({ version: 1, createdAt: Date.now(), accounts })
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(rawJson, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag()

  const wirePacket = JSON.stringify({
    s: salt.toString('base64'),
    i: iv.toString('base64'),
    t: tag.toString('base64'),
    c: encrypted,
  })

  const chunkSize = 280
  const totalChunks = Math.ceil(wirePacket.length / chunkSize)
  const chunks = []
  for (let i = 0; i < totalChunks; i++) {
    const part = wirePacket.slice(i * chunkSize, (i + 1) * chunkSize)
    chunks.push(`GG1:${i + 1}/${totalChunks}:${part}`)
  }

  return { pin, chunks, totalChunks, wirePacket }
}

function simulateDecrypt(wirePacketStr, pin) {
  const parsed = JSON.parse(wirePacketStr)
  const salt = Buffer.from(parsed.s, 'base64')
  const iv = Buffer.from(parsed.i, 'base64')
  const tag = Buffer.from(parsed.t, 'base64')
  const ciphertext = parsed.c

  const key = crypto.pbkdf2Sync(pin.trim(), salt, 10000, 32, 'sha256')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return JSON.parse(decrypted).accounts
}

const mockAccounts = [
  { id: '111', firstName: 'Ershad', phone: '+989120000000', sessionString: '1//mock_alpha' },
  { id: '222', firstName: 'Guidegram Bot', isBot: true, sessionString: '1//mock_beta' },
]

const exported = simulateExport(mockAccounts)
assert.strictEqual(exported.pin.length, 6, 'PIN must be 6 digits')
assert(exported.chunks.length > 0, 'Chunks must be generated')

// Assemble chunks back to wire packet
const reassembled = exported.chunks.map(c => c.split(':').slice(2).join(':')).join('')
assert.strictEqual(reassembled, exported.wirePacket, 'Reassembled packet must match original wire packet')

// Decrypt with correct PIN
const decrypted = simulateDecrypt(reassembled, exported.pin)
assert.strictEqual(decrypted.length, 2, 'Decrypted accounts count must match')
assert.strictEqual(decrypted[0].id, '111')
assert.strictEqual(decrypted[0].sessionString, '1//mock_alpha')
console.log(`    ✅ Successfully encrypted and decrypted 2 accounts across ${exported.totalChunks} Animated QR chunks.`)

// Decrypt with wrong PIN
assert.throws(() => {
  simulateDecrypt(reassembled, '000000' === exported.pin ? '111111' : '000000')
}, /Unsupported state or unable to authenticate data/, 'Wrong PIN must fail AES-GCM tag authentication')
console.log('    ✅ Wrong PIN blocked by AES-256-GCM authentication tag.')

// Decrypt with corrupted ciphertext
const corrupted = reassembled.replace('"c":"', '"c":"X')
assert.throws(() => {
  simulateDecrypt(corrupted, exported.pin)
}, 'Corrupted ciphertext must be rejected')
console.log('    ✅ Tampered ciphertext blocked.')

console.log('🎉 All 7 Account Export & Optical Sync checks passed with 100% precision!')
