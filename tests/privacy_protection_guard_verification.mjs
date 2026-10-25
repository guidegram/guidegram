import { PrivacyProtectionGuard } from '../electron/privacyProtectionGuard.ts'

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
  console.log('🧪 Starting Anti-Screen Capture & Privacy Protection Verification Suite...')

  // Mock BrowserWindow
  let contentProtectionCalls = []
  const mockWin = {
    setContentProtection: (enabled) => {
      contentProtectionCalls.push(enabled)
    },
  }

  const guard = new PrivacyProtectionGuard()
  guard.attachWindow(mockWin)

  // Test 1: Initial state
  console.log('\n--- Test 1: Initial State ---')
  assert(guard.isProtected() === false, 'Initially content protection is false')
  const status0 = guard.getStatus()
  assert(status0.activeReasons.length === 0, 'No active reasons initially')
  assert(status0.isProtected === false, 'Status reports not protected')

  // Test 2: Enabling protection for Secret Chat
  console.log('\n--- Test 2: Enable for Secret Chat ---')
  contentProtectionCalls = []
  const res1 = guard.setProtection('secret_chat', true)
  assert(res1 === true, 'setProtection returned true')
  assert(guard.isProtected() === true, 'Guard is now marked protected')
  assert(contentProtectionCalls.length === 1 && contentProtectionCalls[0] === true, 'win.setContentProtection(true) was invoked')
  assert(guard.getStatus().activeReasons.includes('secret_chat'), 'activeReasons contains secret_chat')

  // Test 3: Multiple reasons reference counting
  console.log('\n--- Test 3: Reference Counting ---')
  contentProtectionCalls = []
  guard.setProtection('view_once_media', true)
  assert(guard.getStatus().activeReasons.length === 2, 'Two active protection reasons recorded')

  // Disabling secret_chat should KEEP protection active because view_once_media is still active
  contentProtectionCalls = []
  guard.setProtection('secret_chat', false)
  assert(guard.isProtected() === true, 'Still protected after removing one of multiple reasons')
  assert(contentProtectionCalls.length === 1 && contentProtectionCalls[0] === true, 'Window protection remains true')

  // Disabling view_once_media should now transition to false
  contentProtectionCalls = []
  guard.setProtection('view_once_media', false)
  assert(guard.isProtected() === false, 'Protection disabled after removing all reasons')
  assert(contentProtectionCalls.length === 1 && contentProtectionCalls[0] === false, 'win.setContentProtection(false) was invoked')

  // Test 4: Clear Temporary Reasons Preserves User Preference
  console.log('\n--- Test 4: Temporary Reasons Cleanup ---')
  guard.setProtection('user_preference', true)
  guard.setProtection('passcode_lock', true)
  guard.setProtection('secret_chat', true)
  assert(guard.getStatus().activeReasons.length === 3, 'Three reasons set')

  contentProtectionCalls = []
  guard.clearTemporaryReasons()
  const statusAfterClear = guard.getStatus()
  assert(statusAfterClear.activeReasons.length === 1, 'Only 1 reason remains after clearTemporaryReasons')
  assert(statusAfterClear.activeReasons[0] === 'user_preference', 'User preference preserved')
  assert(guard.isProtected() === true, 'Protection remains active due to user preference')

  console.log(`\n========================================`)
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
