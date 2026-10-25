import { PasscodeGuard } from '../electron/passcodeGuard.ts'
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
  console.log('🧪 Starting Master Passcode & Key Derivation Verification Suite...')

  const tempDir = path.join(os.tmpdir(), `guidegram_passcode_test_${Date.now()}`)
  fs.mkdirSync(tempDir, { recursive: true })

  try {
    const guard = new PasscodeGuard(tempDir)

    // Test 1: Initial state (no passcode configured)
    console.log('\n--- Test 1: Initial State ---')
    assert(guard.isPasscodeSet() === false, 'Initially passcode is not set')
    assert(guard.isLocked() === false, 'Initially session is not locked')
    const initialStatus = guard.getStatus()
    assert(initialStatus.isPasscodeSet === false && initialStatus.isLocked === false, 'Initial status report is clean')

    // Test 2: Validation on setting passcode
    console.log('\n--- Test 2: Passcode Validation ---')
    const shortRes = guard.setPasscode('123')
    assert(shortRes.success === false && shortRes.error.includes('between 4 and 64'), 'Passcode < 4 chars rejected')

    const goodRes = guard.setPasscode('CorrectHorse99!')
    assert(goodRes.success === true, 'Valid passcode is accepted and stored')
    assert(guard.isPasscodeSet() === true, 'Passcode is now marked as set')
    assert(guard.isLocked() === false, 'Session is initially unlocked after setting')

    // Test 3: Manual lock and unlock
    console.log('\n--- Test 3: Lock & Unlock ---')
    guard.lockSession()
    assert(guard.isLocked() === true, 'Session is locked after lockSession()')

    const badUnlock = guard.unlock('WrongPassword')
    assert(badUnlock.success === false && badUnlock.remainingAttempts === 4, 'Incorrect passcode rejected with remaining attempts decrement')
    assert(guard.isLocked() === true, 'Session remains locked after bad unlock attempt')

    const goodUnlock = guard.unlock('CorrectHorse99!')
    assert(goodUnlock.success === true, 'Correct passcode unlocks session')
    assert(guard.isLocked() === false, 'Session is unlocked after correct passcode')

    // Test 4: Rate-limiting & Brute Force Lockout
    console.log('\n--- Test 4: Rate Limiting & Brute Force Defense ---')
    guard.lockSession()
    for (let i = 0; i < 4; i++) {
      guard.unlock('BadGuess' + i)
    }
    const fifthBad = guard.unlock('BadGuess5')
    assert(fifthBad.success === false && fifthBad.error.includes('Locked for 30 seconds'), '5th failed attempt triggers 30s lockout')
    assert(guard.getStatus().isRateLimited === true, 'Status reports rate-limited condition')

    // Attempting even correct password during lockout should be rejected
    const blockedUnlock = guard.unlock('CorrectHorse99!')
    assert(blockedUnlock.success === false && blockedUnlock.error.includes('Too many failed attempts'), 'Unlock blocked during lockout window')

    // Test 5: Changing Passcode with Verification
    console.log('\n--- Test 5: Passcode Change Verification ---')
    // Reset lockout for test
    guard['rateLimitedUntil'] = 0
    guard['failedAttempts'] = 0

    const badChange = guard.setPasscode('NewPassword123!', 'WrongCurrentPasscode')
    assert(badChange.success === false && badChange.error.includes('Current passcode is incorrect'), 'Passcode change with incorrect current passcode rejected')

    const goodChange = guard.setPasscode('NewSuperSecret2026#', 'CorrectHorse99!')
    assert(goodChange.success === true, 'Passcode change with correct current passcode accepted')

    guard.lockSession()
    assert(guard.unlock('CorrectHorse99!').success === false, 'Old passcode no longer unlocks')
    assert(guard.unlock('NewSuperSecret2026#').success === true, 'New passcode successfully unlocks')

    // Test 6: Removing Passcode
    console.log('\n--- Test 6: Passcode Removal ---')
    const badRemove = guard.removePasscode('WrongPassword')
    assert(badRemove.success === false, 'Passcode removal with incorrect passcode rejected')

    const goodRemove = guard.removePasscode('NewSuperSecret2026#')
    assert(goodRemove.success === true, 'Passcode successfully removed')
    assert(guard.isPasscodeSet() === false, 'Passcode is no longer set')
    assert(guard.isLocked() === false, 'Session cannot be locked when passcode is removed')

    guard.teardown()
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
