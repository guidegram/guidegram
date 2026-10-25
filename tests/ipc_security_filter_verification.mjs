import { IpcSecurityFilter } from '../electron/ipcSecurityFilter.ts'

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
  console.log('🧪 Starting IPC Sender Frame Verification Suite (MM-015)...')
  IpcSecurityFilter.resetTelemetry()

  // Test 1: Authorized Top-Level Frame (file:// scheme)
  console.log('\n--- Test 1: Authorized Top-Level Frame ---')
  const validFileEvent = {
    senderFrame: {
      url: 'file:///d:/Guidegram/dist/index.html',
      parent: null,
    },
  }
  const resFile = IpcSecurityFilter.validateSender(validFileEvent, { channel: 'passcode:unlock' })
  assert(resFile.valid === true, 'Authorized file:// top-level frame is allowed')

  // Test 2: Authorized Dev Server (http://localhost:5173)
  console.log('\n--- Test 2: Authorized Dev Server ---')
  const validDevEvent = {
    senderFrame: {
      url: 'http://localhost:5173/index.html',
      parent: null,
    },
  }
  const resDev = IpcSecurityFilter.validateSender(validDevEvent, { channel: 'telegram:send-message' })
  assert(resDev.valid === true, 'Authorized localhost dev server frame is allowed')

  // Test 3: Foreign Origin Rejection (Malicious domain)
  console.log('\n--- Test 3: Foreign Origin Rejection ---')
  const evilEvent = {
    senderFrame: {
      url: 'https://evil-hacker.com/exploit.html',
      parent: null,
    },
  }
  const resEvil = IpcSecurityFilter.validateSender(evilEvent, { channel: 'system:copy-to-clipboard' })
  assert(resEvil.valid === false, 'Foreign external URL is rejected')
  assert(resEvil.reason.includes('Untrusted frame origin'), 'Rejection reason states untrusted origin')

  // Test 4: Subframe / iframe Privilege Escalation Defense
  console.log('\n--- Test 4: Subframe Privilege Escalation Defense ---')
  const subframeEvent = {
    senderFrame: {
      url: 'file:///d:/Guidegram/dist/index.html',
      parent: { url: 'file:///d:/Guidegram/dist/index.html' }, // child frame!
    },
  }
  const resSub = IpcSecurityFilter.validateSender(subframeEvent, { channel: 'passcode:set' })
  assert(resSub.valid === false, 'Nested subframe execution denied by default')
  assert(resSub.reason.includes('Subframe IPC execution denied'), 'Rejection identifies subframe parent')

  // Test 5: Subframe allowed when explicitly authorized
  console.log('\n--- Test 5: Explicit Subframe Authorization ---')
  const resSubAllowed = IpcSecurityFilter.validateSender(subframeEvent, {
    channel: 'telegram:get-web-view-config',
    allowSubFrames: true,
  })
  assert(resSubAllowed.valid === true, 'Subframe authorized when allowSubFrames is true')

  // Test 6: wrapHandler enforcement
  console.log('\n--- Test 6: Handler Wrapper Security Enforcement ---')
  let sensitiveHandlerExecuted = false
  const securedHandler = IpcSecurityFilter.wrapHandler('passcode:unlock', async (_evt, arg) => {
    sensitiveHandlerExecuted = true
    return `Unlocked with ${arg}`
  })

  // Calling with evil event should throw and NOT execute handler
  let threw = false
  try {
    await securedHandler(evilEvent, 'mypasscode')
  } catch (err) {
    threw = true
    assert(err.message.includes('[SecurityViolation]'), 'Secured handler throws SecurityViolation error on rogue sender')
  }
  assert(threw === true, 'Exception thrown on unauthorized sender')
  assert(sensitiveHandlerExecuted === false, 'Sensitive handler was NOT executed for unauthorized sender')

  // Calling with legitimate event should succeed
  const result = await securedHandler(validFileEvent, 'mypasscode')
  assert(result === 'Unlocked with mypasscode', 'Authorized event executes handler cleanly')
  assert(sensitiveHandlerExecuted === true, 'Sensitive handler executed for valid sender')

  // Test 7: Telemetry metrics
  console.log('\n--- Test 7: Telemetry Auditing ---')
  const telemetry = IpcSecurityFilter.getTelemetry()
  assert(telemetry.totalChecked > 0, `Telemetry recorded ${telemetry.totalChecked} checks`)
  assert(telemetry.totalBlocked >= 2, `Telemetry recorded at least 2 blocked attempts [got ${telemetry.totalBlocked}]`)
  assert(telemetry.violationsByChannel['system:copy-to-clipboard'] >= 1, 'Violations counted per channel')

  console.log(`\n========================================`)
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
