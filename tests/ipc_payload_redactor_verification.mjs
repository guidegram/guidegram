import assert from 'assert'
import { IpcPayloadRedactor } from '../electron/ipcPayloadRedactor.ts'
import { IpcSecurityFilter } from '../electron/ipcSecurityFilter.ts'

console.log('🧪 Starting Phase 48 Verification: Safe IPC Return Value Deep Redaction & Type Stripping...')

IpcPayloadRedactor.resetTelemetry()

// Test 1: Sensitive Key Stripping
console.log('\n--- Test 1: Sensitive Key Stripping ---')
const rawAccount = {
  id: 'acc_123',
  userId: 987654321,
  firstName: 'Ershad',
  sessionString: '1/AQAAAK5b8Y2L_some_secret_session_string_content_1234567890=',
  authKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  apiHash: 'aabbccddeeff00112233445566778899',
  settings: {
    theme: 'dark',
    password: 'super_secret_master_password',
    botToken: '1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567',
  },
}

const redactedAccount = IpcPayloadRedactor.deepRedact(rawAccount, { channel: 'telegram:get-account' })
assert.strictEqual(redactedAccount.id, 'acc_123')
assert.strictEqual(redactedAccount.userId, 987654321)
assert.strictEqual(redactedAccount.firstName, 'Ershad')
assert.strictEqual(redactedAccount.sessionString, undefined, 'sessionString must be stripped')
assert.strictEqual(redactedAccount.authKey, undefined, 'authKey must be stripped')
assert.strictEqual(redactedAccount.apiHash, undefined, 'apiHash must be stripped')
assert.strictEqual(redactedAccount.settings.theme, 'dark')
assert.strictEqual(redactedAccount.settings.password, undefined, 'password must be stripped')
assert.strictEqual(redactedAccount.settings.botToken, undefined, 'botToken must be stripped')
console.log('✅ Assertion 1 passed: All blacklisted sensitive keys stripped from root and nested objects.')

// Test 2: Value Pattern Redaction (Bot Tokens, Hex Keys, Session Strings)
console.log('\n--- Test 2: Value Pattern Redaction ---')
const rawMessage = {
  text: 'Here is your new bot: 987654321:XYZ_token_secret_value_abcdef12345 and session 2/BQAAAL5c9Z3M_very_long_session_string_payload_here_1234567890=',
  keyInfo: 'Derived master key 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
}

const redactedMessage = IpcPayloadRedactor.deepRedact(rawMessage)
assert.ok(redactedMessage.text.includes('[REDACTED_BOT_TOKEN]'), 'Bot token must be pattern-redacted')
assert.ok(redactedMessage.text.includes('[REDACTED_SESSION_STRING]'), 'Session string must be pattern-redacted')
assert.ok(redactedMessage.keyInfo.includes('[REDACTED_HEX_KEY]'), '64-hex key must be pattern-redacted')
console.log('✅ Assertion 2 passed: Secret patterns inside string values successfully redacted.')

// Test 3: Prototype Pollution Defense
console.log('\n--- Test 3: Prototype Pollution Defense ---')
const hostilePayload = JSON.parse('{"validProp": "hello", "__proto__": {"admin": true}}')
const safeHostile = IpcPayloadRedactor.deepRedact(hostilePayload)
assert.strictEqual(safeHostile.validProp, 'hello')
assert.strictEqual(Object.prototype.hasOwnProperty.call(safeHostile, '__proto__'), false)
assert.strictEqual(({}).admin, undefined, 'Prototype pollution must not affect Object.prototype')
console.log('✅ Assertion 3 passed: Prototype pollution properties blocked and stripped.')

// Test 4: Circular Reference Handling
console.log('\n--- Test 4: Circular Reference Handling ---')
const circularObj = { name: 'Parent', child: null }
circularObj.child = { name: 'Child', parent: circularObj }

const safeCircular = IpcPayloadRedactor.deepRedact(circularObj)
assert.strictEqual(safeCircular.name, 'Parent')
assert.strictEqual(safeCircular.child.name, 'Child')
assert.strictEqual(safeCircular.child.parent, '[Circular]', 'Circular reference converted to [Circular]')
console.log('✅ Assertion 4 passed: Circular reference gracefully handled without stack overflow.')

// Test 5: Non-Serializable Type Stripping (Functions, Symbols)
console.log('\n--- Test 5: Non-Serializable Type Stripping ---')
const typePayload = {
  data: 'safe_data',
  fn: () => console.log('hostile'),
  sym: Symbol('secret'),
  list: [1, 2, () => 'evil', 4],
}

const sanitizedTypePayload = IpcPayloadRedactor.deepRedact(typePayload)
assert.strictEqual(sanitizedTypePayload.data, 'safe_data')
assert.strictEqual(sanitizedTypePayload.fn, undefined, 'Functions must be stripped')
assert.strictEqual(sanitizedTypePayload.sym, undefined, 'Symbols must be stripped')
assert.deepStrictEqual(sanitizedTypePayload.list, [1, 2, 4], 'Functions inside arrays stripped')
console.log('✅ Assertion 5 passed: Non-serializable functions and symbols cleanly pruned.')

// Test 6: BigInt Safe Conversion
console.log('\n--- Test 6: BigInt Safe Conversion ---')
const bigIntPayload = {
  peerId: 9223372036854775807n,
  count: 42n,
}
const safeBigInt = IpcPayloadRedactor.deepRedact(bigIntPayload)
assert.strictEqual(typeof safeBigInt.peerId, 'string')
assert.strictEqual(safeBigInt.peerId, '9223372036854775807')
console.log('✅ Assertion 6 passed: BigInt converted to string to preserve 64-bit precision without throw.')

// Test 7: Error Object Sanitization
console.log('\n--- Test 7: Error Object Sanitization ---')
const rawError = new Error('Database failed with token 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567 at C:\\Users\\ersha\\app\\secret.db')
rawError.code = 'ERR_SQLITE'
const sanitizedError = IpcPayloadRedactor.sanitizeError(rawError)
assert.strictEqual(sanitizedError.error, true)
assert.strictEqual(sanitizedError.code, 'ERR_SQLITE')
assert.ok(sanitizedError.message.includes('[REDACTED_BOT_TOKEN]'), 'Token redacted from error message')
assert.ok(!sanitizedError.message.includes('C:\\Users\\ersha'), 'User path scrubbed from error message')
console.log('✅ Assertion 7 passed: Exception messages and stacks scrubbed of credentials and user paths.')

// Test 8: IpcSecurityFilter.wrapHandler Integration (Success Path)
console.log('\n--- Test 8: IpcSecurityFilter.wrapHandler Integration (Success Path) ---')
const mockEvent = {
  _isTestSender: true,
  senderFrame: { url: 'file:///app/dist/index.html' },
}
const mockHandler = async (_e, arg) => ({
  status: 'ok',
  arg,
  sessionString: '1/AQAA_secret',
})

const wrapped = IpcSecurityFilter.wrapHandler('telegram:test-call', mockHandler)
const result = await wrapped(mockEvent, 'test_arg')
assert.strictEqual(result.status, 'ok')
assert.strictEqual(result.arg, 'test_arg')
assert.strictEqual(result.sessionString, undefined, 'wrapHandler must deep-redact return value')
console.log('✅ Assertion 8 passed: IpcSecurityFilter.wrapHandler deeply redacts handler return value.')

// Test 9: IpcSecurityFilter.wrapHandler Integration (Error Path)
console.log('\n--- Test 9: IpcSecurityFilter.wrapHandler Integration (Error Path) ---')
const failingHandler = async () => {
  throw new Error('Connection failed with token 9876543210:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567')
}
const wrappedFailing = IpcSecurityFilter.wrapHandler('telegram:fail-call', failingHandler)
let caughtError = null
try {
  await wrappedFailing(mockEvent)
} catch (err) {
  caughtError = err
}
assert.ok(caughtError !== null, 'Handler should throw')
assert.ok(caughtError.message.includes('[REDACTED_BOT_TOKEN]'), 'Thrown error message must be redacted')
assert.ok(!caughtError.message.includes('9876543210:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567'), 'Raw token must not appear')
console.log('✅ Assertion 9 passed: Handled exceptions thrown across IPC have credentials scrubbed.')

// Test 10: SafeSend WebContents Dispatch
console.log('\n--- Test 10: SafeSend WebContents Dispatch ---')
let dispatchedChannel = ''
let dispatchedPayload = null
const mockWebContents = {
  send: (ch, payload) => {
    dispatchedChannel = ch
    dispatchedPayload = payload
  },
}
IpcPayloadRedactor.safeSend(mockWebContents, 'telegram:push-event', {
  event: 'account_update',
  token: 'secret_token_123',
  data: 'public_data',
})
assert.strictEqual(dispatchedChannel, 'telegram:push-event')
assert.strictEqual(dispatchedPayload.event, 'account_update')
assert.strictEqual(dispatchedPayload.data, 'public_data')
assert.strictEqual(dispatchedPayload.token, undefined, 'token stripped in safeSend')
console.log('✅ Assertion 10 passed: safeSend securely scrubs arguments before webContents.send.')

// Test 11: Telemetry Accounting
console.log('\n--- Test 11: Telemetry Accounting ---')
const telemetry = IpcPayloadRedactor.getTelemetry()
assert.ok(telemetry.totalPayloadsProcessed >= 7, 'Payload count tracked')
assert.ok(telemetry.sensitiveKeysStripped >= 5, 'Sensitive keys stripped tracked')
assert.ok(telemetry.secretPatternsRedacted >= 4, 'Secret patterns redacted tracked')
assert.ok(telemetry.circularRefsResolved >= 1, 'Circular ref tracked')
assert.ok(telemetry.prototypePollutionBlocked >= 1, 'Prototype pollution attempt tracked')
assert.ok(telemetry.nonSerializableTypesStripped >= 2, 'Non-serializable types tracked')
console.log('✅ Assertion 11 passed: Telemetry metrics accurately reflect all redactions and security actions.')

console.log('\n🎉 ALL 11 ASSERTIONS PASSED: Safe IPC Return Value Deep Redaction & Type Stripping verified!\n')
