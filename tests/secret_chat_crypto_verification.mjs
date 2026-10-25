import { SecretChatCrypto } from '../electron/telegram/secretChatCrypto.ts'
import crypto from 'crypto'

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
  console.log('🧪 Starting Secret Chat & VoIP Cryptography Verification Suite...')

  // Test 1: DH parameter validation
  console.log('\n--- Test 1: DH Parameter Validation ---')
  const validPrime = SecretChatCrypto.getStandardGroup14Prime()
  assert(validPrime.length === 256, `Standard MODP Group 14 prime is 256 bytes (2048 bits) [got ${validPrime.length}]`)

  const valGood = SecretChatCrypto.validateDhParams(validPrime, 3)
  assert(valGood.valid === true, 'Standard prime with g=3 is valid')

  const shortPrime = Buffer.alloc(128, 0xff)
  const valShort = SecretChatCrypto.validateDhParams(shortPrime, 3)
  assert(valShort.valid === false && valShort.reason.includes('less than required 2048 bits'), 'Short prime (<2048 bits) is rejected')

  const evenPrime = Buffer.from(validPrime)
  evenPrime[evenPrime.length - 1] = 0xfe // make even
  const valEven = SecretChatCrypto.validateDhParams(evenPrime, 3)
  assert(valEven.valid === false && valEven.reason.includes('even integer'), 'Even prime candidate is rejected')

  const invalidG = SecretChatCrypto.validateDhParams(validPrime, 1)
  assert(invalidG.valid === false && invalidG.reason.includes('Generator g'), 'Generator g=1 outside [2,7] is rejected')

  // Test 2: Public Key Range and Safety Margin Validation
  console.log('\n--- Test 2: Public Key Validation ---')
  const invalidLow = Buffer.alloc(256, 0)
  invalidLow[255] = 1 // pubKey = 1
  const valLow = SecretChatCrypto.validatePublicKey(invalidLow, validPrime)
  assert(valLow.valid === false, 'Public key = 1 is rejected')

  const invalidHigh = Buffer.from(validPrime) // pubKey = prime
  const valHigh = SecretChatCrypto.validatePublicKey(invalidHigh, validPrime)
  assert(valHigh.valid === false, 'Public key >= prime - 1 is rejected')

  // Test 3: Full End-to-End Diffie-Hellman Key Exchange (Alice & Bob)
  console.log('\n--- Test 3: Full Diffie-Hellman Key Exchange ---')
  const aliceKeyPair = SecretChatCrypto.generateDhKeyPair(validPrime, 3)
  const bobKeyPair = SecretChatCrypto.generateDhKeyPair(validPrime, 3)

  assert(aliceKeyPair.publicKey.length === 256, 'Alice public key is 256 bytes')
  assert(bobKeyPair.publicKey.length === 256, 'Bob public key is 256 bytes')
  assert(!aliceKeyPair.publicKey.equals(bobKeyPair.publicKey), 'Alice and Bob generated distinct public keys')

  const aliceShared = SecretChatCrypto.computeSharedKey(aliceKeyPair.privateKey, bobKeyPair.publicKey, validPrime, 3)
  const bobShared = SecretChatCrypto.computeSharedKey(bobKeyPair.privateKey, aliceKeyPair.publicKey, validPrime, 3)

  assert(aliceShared.length === 256, `Alice shared secret is 256 bytes [got ${aliceShared.length}]`)
  assert(bobShared.length === 256, `Bob shared secret is 256 bytes [got ${bobShared.length}]`)
  assert(aliceShared.equals(bobShared), 'Shared secret computed by Alice matches Bob exactly')

  // Test 4: Key Fingerprint & Visual Verification (Identicon & Emojis)
  console.log('\n--- Test 4: Fingerprint & Visual Details ---')
  const aliceDetails = SecretChatCrypto.deriveAuthKeyDetails(aliceShared)
  const bobDetails = SecretChatCrypto.deriveAuthKeyDetails(bobShared)

  assert(typeof aliceDetails.fingerprint === 'bigint', 'Fingerprint is a 64-bit BigInt')
  assert(aliceDetails.fingerprint === bobDetails.fingerprint, 'Fingerprints match between Alice and Bob')
  assert(aliceDetails.fingerprintHex === bobDetails.fingerprintHex, 'Fingerprint hex strings match')
  assert(aliceDetails.visualFingerprint.hexFormatted.length === 19, 'Visual hex is formatted into 4 groups of 4')
  assert(aliceDetails.visualFingerprint.emojis.length === 4, 'Visual fingerprint includes 4 Telegram emojis')
  assert(aliceDetails.visualFingerprint.emojis.join('') === bobDetails.visualFingerprint.emojis.join(''), 'Visual emojis match between peers')
  assert(aliceDetails.visualFingerprint.identiconMatrix.length === 8, 'Visual identicon is an 8x8 matrix')
  assert(aliceDetails.visualFingerprint.identiconMatrix[0].length === 8, 'Visual identicon row length is 8')

  // Test 5: VoIP Call DH Commitment (SHA-256 of gA)
  console.log('\n--- Test 5: Phone Call Commitment Generation ---')
  const randomGA = crypto.randomBytes(256)
  const commitment = SecretChatCrypto.generatePhoneCallCommitment(randomGA)
  const expectedHash = crypto.createHash('sha256').update(randomGA).digest()
  assert(commitment.gAHash.equals(expectedHash), 'Phone call gAHash matches expected SHA-256 commitment of gA')
  assert(commitment.gAHash.length === 32, 'Commitment hash length is 32 bytes')

  console.log(`\n========================================`)
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
