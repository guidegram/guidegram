import assert from 'node:assert/strict'
import { SecurityGuardrails } from '../electron/securityGuardrails'

async function runTests() {
  console.log('🧪 Starting SecurityGuardrails Verification Tests (MM-015)...')

  // Test 1: URL safety validation
  assert.equal(SecurityGuardrails.isSafeUrl('https://telegram.org'), true)
  assert.equal(SecurityGuardrails.isSafeUrl('http://localhost:3000'), true)
  assert.equal(SecurityGuardrails.isSafeUrl('file:///C:/Windows/System32'), false)
  assert.equal(SecurityGuardrails.isSafeUrl('javascript:alert(document.cookie)'), false)
  assert.equal(SecurityGuardrails.isSafeUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(SecurityGuardrails.isSafeUrl('vbscript:msgbox(1)'), false)
  assert.equal(SecurityGuardrails.isSafeUrl(''), false)
  assert.equal(SecurityGuardrails.isSafeUrl(null), false)
  console.log('  ✅ URL safety validation & dangerous scheme rejection passed')

  // Test 2: Security headers (Clickjacking & frame-denial defense)
  let interceptedHeaders = null
  const mockSession = {
    webRequest: {
      onHeadersReceived: (handler) => {
        handler(
          {
            responseHeaders: {
              'Server': ['nginx'],
            },
          },
          ({ responseHeaders }) => {
            interceptedHeaders = responseHeaders
          }
        )
      },
    },
  }

  SecurityGuardrails.configureSecurityHeaders(mockSession)
  assert.ok(interceptedHeaders, 'Headers must be intercepted')
  assert.deepEqual(interceptedHeaders['X-Frame-Options'], ['SAMEORIGIN'])
  assert.deepEqual(interceptedHeaders['X-Content-Type-Options'], ['nosniff'])
  assert.ok(
    interceptedHeaders['Content-Security-Policy'].some((csp) =>
      csp.includes("frame-ancestors 'self'")
    ),
    "CSP must enforce frame-ancestors 'self'"
  )
  console.log('  ✅ Clickjacking defense & security headers configuration passed')

  // Test 3: Window open handler interception & deny action
  let openHandler = null
  const mockWin = {
    webContents: {
      setWindowOpenHandler: (handler) => {
        openHandler = handler
      },
      on: () => {},
    },
  }

  SecurityGuardrails.attachSecureWindowHandlers(mockWin, true)
  assert.ok(openHandler, 'setWindowOpenHandler must be registered')

  // Safe external URL should be denied from popup creation (delegated to OS browser)
  const resSafe = openHandler({ url: 'https://google.com' })
  assert.deepEqual(resSafe, { action: 'deny' }, 'All popups must be denied')

  // Unsafe URL should also be denied
  const resUnsafe = openHandler({ url: 'javascript:alert(1)' })
  assert.deepEqual(resUnsafe, { action: 'deny' }, 'Unsafe schemes must be denied')
  console.log('  ✅ Window open interception & popup denial passed')

  console.log('🎉 All SecurityGuardrails Tests (MM-015) PASSED successfully!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
