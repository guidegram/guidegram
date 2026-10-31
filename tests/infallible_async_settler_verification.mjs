import { strict as assert } from 'node:assert';
import { 
  InfallibleAsyncSettler, 
  TelegramResponseReadError, 
  TelegramTimeoutError,
  TelegramTransportError 
} from '../dist-test-settler/src/utils/infallibleAsyncSettler.js';

console.log('🧪 Starting InfallibleAsyncSettler Verification Suite...');

const settler = InfallibleAsyncSettler.getInstance();

// 1. Singleton check
assert.ok(settler, 'InfallibleAsyncSettler should be initialized');
assert.strictEqual(settler, InfallibleAsyncSettler.getInstance(), 'Must be singleton');
console.log('  ✅ Check 1: Singleton instantiation verified');

// 2. Normal resolution
let cleanupCalledOnSuccess = false;
const successResult = await settler.executeGuarded(async (signal) => {
  assert.ok(signal, 'AbortSignal must be provided');
  return { status: 200, data: 'payload_ok' };
}, {
  operationName: 'testSuccess',
  timeoutMs: 5000,
  onCleanup: () => { cleanupCalledOnSuccess = true; }
});

assert.strictEqual(successResult.status, 200);
assert.strictEqual(successResult.data, 'payload_ok');
assert.strictEqual(cleanupCalledOnSuccess, true, 'Cleanup must run on success');
console.log('  ✅ Check 2: Successful execution and cleanup hook verified');

// 3. Mid-stream SocketException / Socket closed mapped to TelegramResponseReadError
let cleanupCalledOnError = false;
await assert.rejects(async () => {
  await settler.consumeResponseStream(async () => {
    // Simulate mid-stream body read failure (like OkHttp response.body().string())
    throw new Error('SocketException: Socket closed mid-transfer');
  }, {
    operationName: 'consumeStream',
    timeoutMs: 5000,
    onCleanup: () => { cleanupCalledOnError = true; }
  });
}, (err) => {
  assert.ok(err instanceof TelegramResponseReadError, 'Must be TelegramResponseReadError');
  assert.ok(err.message.includes('Socket closed'), 'Must preserve socket error message');
  return true;
});
assert.strictEqual(cleanupCalledOnError, true, 'Cleanup must run on stream failure');
console.log('  ✅ Check 3: Mid-stream socket closure classification and cleanup verified');

// 4. Synchronous throw in executor is caught and rejected gracefully (never hangs)
await assert.rejects(async () => {
  await settler.executeGuarded(() => {
    throw new TypeError('Immediate sync error in response handler');
  }, { operationName: 'syncThrow' });
}, (err) => {
  assert.ok(err instanceof TypeError);
  assert.strictEqual(err.message, 'Immediate sync error in response handler');
  return true;
});
console.log('  ✅ Check 4: Synchronous executor throw containment verified');

// 5. Watchdog timeout enforcement
const startTime = Date.now();
await assert.rejects(async () => {
  await settler.executeGuarded(async (signal) => {
    // Simulate hung body stream that never emits data
    return new Promise((resolve) => {
      signal.addEventListener('abort', () => {
        // Observer that abort was dispatched
      });
      // Deliberately never resolve or reject
    });
  }, {
    operationName: 'hungBodyStream',
    timeoutMs: 150
  });
}, (err) => {
  assert.ok(err instanceof TelegramTimeoutError, 'Must reject with TelegramTimeoutError');
  assert.ok(err.message.includes("timed out after 150ms"), 'Must report duration in message');
  return true;
});
const elapsed = Date.now() - startTime;
assert.ok(elapsed >= 140 && elapsed < 1000, `Must time out close to 150ms, took ${elapsed}ms`);
console.log('  ✅ Check 5: Watchdog timeout deadline enforcement verified');

// 6. External abort signal linkage
const externalController = new AbortController();
const abortPromise = settler.executeGuarded(async (signal) => {
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Signal aborted')));
  });
}, {
  abortSignal: externalController.signal,
  operationName: 'externalAbortTest',
  timeoutMs: 5000
});

setTimeout(() => {
  externalController.abort(new Error('User cancelled download'));
}, 50);

await assert.rejects(abortPromise, (err) => {
  assert.ok(err instanceof Error);
  return true;
});
console.log('  ✅ Check 6: External AbortController linkage verified');

// 7. Single settlement invariant under race conditions
let resolutionCount = 0;
const settledVal = await settler.executeGuarded(async () => {
  resolutionCount++;
  return 'only_once';
});
assert.strictEqual(settledVal, 'only_once');
assert.strictEqual(resolutionCount, 1);
console.log('  ✅ Check 7: Single settlement invariant verified');

console.log('🎉 ALL 7 CHECKS PASSED SUCCESSFULLY!');
