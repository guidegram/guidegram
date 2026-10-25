import assert from 'assert'
import { DeepLinkHandler } from '../electron/deepLinkHandler.ts'

console.log('🧪 Starting DeepLinkHandler & Protocol Security Verification Tests (Layer 08)...')

// Test 1: Valid Deep Links Parsing
const validResolve = DeepLinkHandler.parseAndValidateDeepLink('tg://resolve?domain=durov')
assert.ok(validResolve, 'tg://resolve?domain=durov should parse successfully')
assert.strictEqual(validResolve.scheme, 'tg')
assert.strictEqual(validResolve.action, 'resolve')
assert.strictEqual(validResolve.params.domain, 'durov')

const validJoin = DeepLinkHandler.parseAndValidateDeepLink('tg://join?invite=AbCdEf12345')
assert.ok(validJoin, 'tg://join should parse successfully')
assert.strictEqual(validJoin.action, 'join')
assert.strictEqual(validJoin.params.invite, 'AbCdEf12345')

const validProxy = DeepLinkHandler.parseAndValidateDeepLink('tg://proxy?server=198.51.100.1&port=443&secret=dd001122')
assert.ok(validProxy, 'tg://proxy should parse successfully')
assert.strictEqual(validProxy.action, 'proxy')
assert.strictEqual(validProxy.params.server, '198.51.100.1')
assert.strictEqual(validProxy.params.port, '443')

const validGuidegram = DeepLinkHandler.parseAndValidateDeepLink('guidegram://settings?tab=security')
assert.ok(validGuidegram, 'guidegram://settings should parse successfully')
assert.strictEqual(validGuidegram.scheme, 'guidegram')
assert.strictEqual(validGuidegram.action, 'settings')
assert.strictEqual(validGuidegram.params.tab, 'security')
console.log('  ✅ Valid deep links parsing and action routing passed')

// Test 2: Chromium CLI Argument Injection Denial
const cliInjectionAttempt1 = 'tg://resolve?domain=" --renderer-cmd-prefix="calc.exe"'
assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink(cliInjectionAttempt1),
  null,
  'Deep link with CLI flags or quotes must be rejected'
)

const cliInjectionAttempt2 = 'tg://resolve?domain=test;calc.exe'
assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink(cliInjectionAttempt2),
  null,
  'Deep link with shell separator ; must be rejected'
)

const cliInjectionAttempt3 = 'tg://resolve?domain=test&foo=bar|calc.exe'
assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink(cliInjectionAttempt3),
  null,
  'Deep link with pipe | must be rejected'
)

const cliInjectionAttempt4 = 'tg://resolve?domain=safe\0--enable-logging'
assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink(cliInjectionAttempt4),
  null,
  'Deep link with null byte must be rejected'
)
console.log('  ✅ Chromium CLI and shell command injection denial passed')

// Test 3: Unauthorized Schemes & Actions Denial
assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink('javascript:alert(1)'),
  null,
  'javascript: pseudo-protocol must be rejected'
)

assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink('https://telegram.org'),
  null,
  'HTTP URLs must be rejected by deep link handler'
)

assert.strictEqual(
  DeepLinkHandler.parseAndValidateDeepLink('tg://executeArbitraryCommand?cmd=rm'),
  null,
  'Unauthorized action must be rejected by Zod schema'
)
console.log('  ✅ Unauthorized schemes and actions denial passed')

// Test 4: Extraction from process.argv
const argvWithLink = [
  'C:\\Program Files\\Guidegram\\guidegram.exe',
  '--hidden',
  'tg://resolve?domain=telegram',
]
const extracted = DeepLinkHandler.extractDeepLinkFromArgv(argvWithLink)
assert.strictEqual(extracted, 'tg://resolve?domain=telegram', 'Deep link must be accurately extracted from argv')

const argvWithoutLink = ['C:\\Program Files\\Guidegram\\guidegram.exe', '--hidden']
assert.strictEqual(
  DeepLinkHandler.extractDeepLinkFromArgv(argvWithoutLink),
  null,
  'Argv without deep link must return null'
)
console.log('  ✅ Argv extraction & switch filtering passed')

// Test 5: Mock Window Dispatch
let sentChannel = ''
let sentPayload = null
const mockWindow = {
  isDestroyed: () => false,
  webContents: {
    send: (channel, payload) => {
      sentChannel = channel
      sentPayload = payload
    },
  },
}

const dispatchResult = DeepLinkHandler.dispatchDeepLink(mockWindow, validResolve)
assert.strictEqual(dispatchResult, true, 'Dispatch should return true on active window')
assert.strictEqual(sentChannel, 'protocol:deep-link')
assert.strictEqual(sentPayload.action, 'resolve')
console.log('  ✅ Safe renderer dispatch passed')

console.log('🎉 All DeepLinkHandler Tests (Layer 08) PASSED successfully!')
