import { CrashMemoryScrubber } from '../electron/crashMemoryScrubber.ts'
import fs from 'fs'
import path from 'path'
import os from 'os'

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
  console.log('🧪 Starting Crash Memory Scrubber Verification Suite (MM-205 / MM-004)...')

  // Test 1: Telegram Bot Token Redaction
  console.log('\n--- Test 1: Bot Token Redaction ---')
  const botError = 'Crash failed during call with bot token 7123456789:AAFlm3k_09Jfk2LmnoPQRstuvwxyz12345 on api.telegram.org'
  const resBot = CrashMemoryScrubber.redactText(botError)
  assert(!resBot.sanitized.includes('7123456789:'), 'Bot token is not present in output')
  assert(resBot.sanitized.includes('[REDACTED_BOT_TOKEN]'), 'Bot token replaced with token marker')
  assert(resBot.stats.botTokens === 1, 'Stats recorded 1 bot token redacted')

  // Test 2: Hex Auth Key Redaction (64-char hex key)
  console.log('\n--- Test 2: Hex Key Redaction ---')
  const hexKey = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  const hexError = `Crypto exception with raw key ${hexKey} in secret chat`
  const resHex = CrashMemoryScrubber.redactText(hexError)
  assert(!resHex.sanitized.includes(hexKey), 'Hex key is redacted')
  assert(resHex.sanitized.includes('[REDACTED_HEX_KEY]'), 'Hex key replaced with hex marker')
  assert(resHex.stats.hexKeys === 1, 'Stats recorded 1 hex key redacted')

  // Test 3: Session String Redaction
  console.log('\n--- Test 3: Session String Redaction ---')
  const sessionString = '1/AQAAAAPx1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ=='
  const sessionError = `Session failed to connect using session=${sessionString}`
  const resSession = CrashMemoryScrubber.redactText(sessionError)
  assert(!resSession.sanitized.includes(sessionString), 'Session string is redacted')
  assert(resSession.sanitized.includes('[REDACTED_SESSION_STRING]'), 'Session string marker present')
  assert(resSession.stats.sessionStrings === 1, 'Stats recorded 1 session string redacted')

  // Test 4: Phone Number Redaction
  console.log('\n--- Test 4: Phone Number Redaction ---')
  const phoneError = 'Failed to send login code to user with phone +14155552671 in auth flow'
  const resPhone = CrashMemoryScrubber.redactText(phoneError)
  assert(!resPhone.sanitized.includes('+14155552671'), 'Phone number is redacted')
  assert(resPhone.sanitized.includes('[REDACTED_PHONE]'), 'Phone marker present')
  assert(resPhone.stats.phoneNumbers === 1, 'Stats recorded 1 phone number redacted')

  // Test 5: Deep Object Redaction
  console.log('\n--- Test 5: Deep Object Redaction ---')
  const sampleCrashReport = {
    id: 'crash_12345',
    error: {
      message: 'Failed auth for +989123456789',
      stack: `Error: at login (auth.js:10:5)\n  token: 6123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789\n  key: ${hexKey}`,
    },
    metadata: {
      userPhone: '+989123456789',
      secret: 'supersecretpasscode123',
    },
  }

  const redactedReport = CrashMemoryScrubber.redactObject(sampleCrashReport)
  assert(!JSON.stringify(redactedReport).includes('+989123456789'), 'Phone numbers in nested fields redacted')
  assert(!JSON.stringify(redactedReport).includes('6123456789:'), 'Bot tokens in nested stack redacted')
  assert(!JSON.stringify(redactedReport).includes(hexKey), 'Hex keys in stack trace redacted')
  assert(redactedReport.id === 'crash_12345', 'Safe fields preserved intact')

  // Test 6: Retroactive Directory Cleansing
  console.log('\n--- Test 6: Retroactive Directory Cleansing ---')
  const tempDir = path.join(os.tmpdir(), `guidegram_crash_scrub_${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  try {
    const dirtyFile = path.join(tempDir, 'crash_dirty.json')
    fs.writeFileSync(dirtyFile, JSON.stringify(sampleCrashReport, null, 2), 'utf8')

    const cleanResult = CrashMemoryScrubber.cleanseDirectory(tempDir)
    assert(cleanResult.filesCleaned === 1, 'Cleaned 1 dirty file')
    assert(cleanResult.totalRedactions >= 3, `Cleaned at least 3 sensitive patterns [got ${cleanResult.totalRedactions}]`)

    const cleanedContent = fs.readFileSync(dirtyFile, 'utf8')
    assert(!cleanedContent.includes(hexKey), 'Cleaned file on disk no longer contains raw hex key')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log(`\n========================================`)
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
