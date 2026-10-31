import { strict as assert } from 'node:assert';
import { 
  TelegramErrorTracer, 
  EnrichedTelegramError 
} from '../dist-test-tracer/src/utils/telegramErrorTracer.js';

console.log('🧪 Starting TelegramErrorTracer Verification Suite...');

const tracer = TelegramErrorTracer.getInstance();

// 1. Singleton check
assert.ok(tracer);
assert.strictEqual(tracer, TelegramErrorTracer.getInstance(), 'Must be singleton');
console.log('  ✅ Check 1: Singleton instantiation verified');

// 2. Successful call passthrough
const successVal = await tracer.traceApiCall('getMe', {}, async () => {
  return { id: 12345, is_bot: true, first_name: 'GuidegramBot' };
});
assert.strictEqual(successVal.id, 12345);
assert.strictEqual(successVal.first_name, 'GuidegramBot');
console.log('  ✅ Check 2: Success passthrough verified');

// 3. Simulated API failure with async stack stitching
function simulateUserWorkflow() {
  return tracer.traceApiCall('sendMessage', {
    chat_id: 999888,
    text: 'Hello world',
    bot_token: '123456:SECRET_TELEGRAM_TOKEN_DO_NOT_LEAK'
  }, async () => {
    // Simulate remote Telegram server 400 rejection
    const err = new Error('Bad Request: BUTTON_USER_PRIVACY_RESTRICTED');
    err.code = 400;
    throw err;
  });
}

let capturedError = null;
try {
  await simulateUserWorkflow();
} catch (e) {
  capturedError = e;
}

assert.ok(capturedError instanceof EnrichedTelegramError, 'Must be EnrichedTelegramError');
assert.strictEqual(capturedError.code, 400);
assert.strictEqual(capturedError.method, 'sendMessage');
assert.ok(capturedError.message.includes('BUTTON_USER_PRIVACY_RESTRICTED'));
console.log('  ✅ Check 3: Enriched error properties verified');

// 4. Sensitive data redaction
assert.strictEqual(capturedError.parameters.bot_token, '[REDACTED]', 'Token must be redacted');
assert.strictEqual(capturedError.parameters.chat_id, 999888, 'Non-sensitive field preserved');
console.log('  ✅ Check 4: Parameter privacy redaction verified');

// 5. Stack trace stitching inspection
const stack = capturedError.stack;
assert.ok(stack.includes('EnrichedTelegramError: Telegram API Error [400]'));
assert.ok(stack.includes('--- [Async Telegram API Boundary] ---'), 'Must include boundary marker');
assert.ok(stack.includes('simulateUserWorkflow'), 'Must include the original caller frame (simulateUserWorkflow)');
console.log('  ✅ Check 5: Call-site stack stitching verified');

// 6. Stack caching & override
capturedError.stack = 'Custom Override Stack';
assert.strictEqual(capturedError.stack, 'Custom Override Stack');
console.log('  ✅ Check 6: Stack override verified');

console.log('🎉 ALL 6 CHECKS PASSED SUCCESSFULLY!');
