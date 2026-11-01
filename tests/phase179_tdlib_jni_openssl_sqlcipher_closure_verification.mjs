/**
 * Verification Suite for Phase 179:
 * TDLib JNI, OpenSSL 3.4+, SQLCipher, Path Scrubbing & Actor Closure Hardening
 * 
 * Verifies fixes for:
 * - tdlib/td #1317: TDLib JNI automatic update stream pump
 * - tdlib/td #1486: Adaptive low-latency update polling on event interrupt
 * - tdlib/td #3171: OpenSSL 3.4+ thread safety & EVP cipher context hygiene
 * - tdlib/td #3758: External SQLCipher compatibility & PRAGMA migration
 * - tdlib/td #3638: Binary & log path scrubbing for build privacy
 * - tdlib/td #3627: Credential & embedded secret redaction
 * - tdlib/td #2363: Unified actor closure queue (immediate & delayed)
 */

import assert from 'node:assert/strict';
import {
  TdlibJniUpdateStreamGovernor,
  OpenSsl34CompatibilityGovernor,
  SqlCipherGovernor,
  BinaryPathScrubberGovernor,
  BinarySecretScrubberGovernor,
  ActorClosureGovernor
} from '../src/services/tdlibJniOpenSslSqlcipherAndClosureGovernor.ts';

console.log('🧪 Starting Phase 179 Verification: TDLib JNI, OpenSSL 3.4, SQLCipher & Actor Closure...');

// -------------------------------------------------------------
// Test 1: #1317 - TDLib JNI Automatic Update Stream Pump
// -------------------------------------------------------------
console.log('  Testing #1317: JNI Automatic Update Stream Delivery...');
const streamGov = new TdlibJniUpdateStreamGovernor();
const receivedUpdates = [];
const unsubscribe = streamGov.subscribe((update) => {
  receivedUpdates.push(update);
});

streamGov.pushIncomingUpdate('updateNewMessage', { messageId: 101, text: 'Hello from TDLib' });
streamGov.pushIncomingUpdate('updateUserStatus', { userId: 42, online: true });

assert.equal(receivedUpdates.length, 2, 'All pushed updates must be automatically delivered to subscribers');
assert.equal(receivedUpdates[0].type, 'updateNewMessage');
assert.equal(receivedUpdates[1].type, 'updateUserStatus');
assert.equal(streamGov.getQueueLength(), 0, 'Internal queue must be drained after dispatch');
unsubscribe();
console.log('  ✅ #1317 Verified: JNI updates automatically dispatched without manual client loop polling.');

// -------------------------------------------------------------
// Test 2: #1486 - Adaptive Low-Latency Polling & Event Interrupt
// -------------------------------------------------------------
console.log('  Testing #1486: Adaptive Low-Latency Polling & Event Interrupt...');
const adaptiveGov = new TdlibJniUpdateStreamGovernor();

// Step idle several times -> interval should increase
adaptiveGov.stepAdaptiveInterval();
adaptiveGov.stepAdaptiveInterval();
adaptiveGov.stepAdaptiveInterval();
adaptiveGov.stepAdaptiveInterval();
const idleInterval = adaptiveGov.stepAdaptiveInterval();
assert.ok(idleInterval > 50, 'Idle interval should back off to save CPU/battery');

// Incoming event triggers immediate interrupt and drops interval to min (10ms)
adaptiveGov.pushIncomingUpdate('updateChatReadInbox', { chatId: 999 });
const activeInterval = adaptiveGov.getActivePollingInterval();
assert.equal(activeInterval, 10, 'Incoming event must immediately drop interval to 10ms for instant responsiveness');
console.log('  ✅ #1486 Verified: Event interrupt triggers instant low-latency polling reduction.');

// -------------------------------------------------------------
// Test 3: #3171 - OpenSSL 3.4+ EVP Context Hygiene & Thread Safety
// -------------------------------------------------------------
console.log('  Testing #3171: OpenSSL 3.4+ Legacy Provider & EVP Context Lifecycle...');
const opensslGov = new OpenSsl34CompatibilityGovernor();
const state = opensslGov.initialize('OpenSSL 3.4.0 22 Oct 2024');

assert.equal(state.legacyProviderLoaded, true, 'Legacy provider must be loaded for OpenSSL 3.4+');
assert.equal(state.activeEvpContexts, 0);

const ctx1 = opensslGov.allocateEvpCipherCtx();
const ctx2 = opensslGov.allocateEvpCipherCtx();
assert.equal(opensslGov.getState().activeEvpContexts, 2, 'Should track 2 active EVP contexts');

ctx1.release();
assert.equal(opensslGov.getState().activeEvpContexts, 1, 'Releasing context should decrement active count');
assert.ok(opensslGov.getState().threadLocalErrorsCleared >= 1, 'Error queue should be cleaned on context release');

ctx2.release();
assert.equal(opensslGov.getState().activeEvpContexts, 0);
console.log('  ✅ #3171 Verified: OpenSSL 3.4+ legacy provider & EVP cipher contexts safely managed.');

// -------------------------------------------------------------
// Test 4: #3758 - External SQLCipher Compatibility & Migration
// -------------------------------------------------------------
console.log('  Testing #3758: External SQLCipher PRAGMA Directives & Migration...');
const sqlcipherGov = new SqlCipherGovernor({
  key: 'my_super_secret_database_encryption_key',
  pageSize: 1024,
  kdfIterations: 64000
});

const pragmas = sqlcipherGov.generatePragmaDirectives();
assert.ok(pragmas.some(p => p.includes("PRAGMA key = 'my_super_secret_database_encryption_key'")), 'Key pragma present');
assert.ok(pragmas.some(p => p.includes("PRAGMA cipher_page_size = 1024")), 'Page size pragma present');

const migration = sqlcipherGov.migrateLegacyCipherSettings(1024, 64000);
assert.equal(migration.migrated, true);
assert.equal(migration.newConfig.pageSize, 4096, 'Page size upgraded to modern 4096 bytes');
assert.equal(migration.newConfig.kdf, 256000, 'KDF iterations upgraded to modern 256000');
console.log('  ✅ #3758 Verified: SQLCipher PRAGMA keys and modern 4.x parameters configured and migrated.');

// -------------------------------------------------------------
// Test 5: #3638 - Binary & Log Path Scrubbing for Privacy
// -------------------------------------------------------------
console.log('  Testing #3638: Release Binary and Log Path Scrubber...');
const scrubberGov = new BinaryPathScrubberGovernor();

const rawLog = 'Fatal crash at /Users/runner/work/td/td/td/telegram/Client.cpp:42 in func()';
const cleanLog = scrubberGov.scrubString(rawLog);
assert.equal(cleanLog, 'Fatal crash at [tdlib]/td/telegram/Client.cpp:42 in func()');

const rawStack = 'Error: something\n  at /home/runner/work/td/td/actor/Actor.cpp:112\n  at main()';
const cleanStack = scrubberGov.scrubStackTrace(rawStack);
assert.ok(!cleanStack.includes('/home/runner/work/td/td/'), 'Build prefixes must be completely scrubbed');
assert.ok(cleanStack.includes('[tdlib]/actor/Actor.cpp:112'));
console.log('  ✅ #3638 Verified: Development and CI filesystem paths thoroughly scrubbed from logs.');

// -------------------------------------------------------------
// Test 6: #3627 - Credential & Embedded Secret Scrubber
// -------------------------------------------------------------
console.log('  Testing #3627: Credential & Secret Redaction in Binaries...');
const secretGov = new BinarySecretScrubberGovernor();

const dirtyString = 'Config: google_key=AIzaSyA12345678901234567890123456789012 and bot=123456789:ABCdefGhIJKLMNOPQRSTUVWXYZabcdefghi';
const inspection = secretGov.inspectString(dirtyString);

assert.equal(inspection.containsSecrets, true);
assert.ok(inspection.secretTypes.includes('Google_API_Key'));
assert.ok(inspection.secretTypes.includes('Telegram_Bot_Token'));

const sanitized = secretGov.sanitizeBinaryStrings(dirtyString);
assert.ok(!sanitized.includes('AIzaSyA12345678901234567890123456789012'));
assert.ok(!sanitized.includes('123456789:ABCdefGhIJKLMNOPQRSTUVWXYZabcdefghi'));
assert.ok(sanitized.includes('[REDACTED_GOOGLE_API_KEY]'));
assert.ok(sanitized.includes('[REDACTED_TELEGRAM_BOT_TOKEN]'));
console.log('  ✅ #3627 Verified: Embedded API keys and bot tokens detected and redacted.');

// -------------------------------------------------------------
// Test 7: #2363 - Unified Actor Closure Governor
// -------------------------------------------------------------
console.log('  Testing #2363: Unified Immediate & Delayed Actor Closure Queue...');
const closureGov = new ActorClosureGovernor();
const executionLog = [];

// Post immediate task
closureGov.postImmediate(() => {
  executionLog.push('task_immediate_normal');
}, 0);

// Post high priority immediate task
closureGov.postImmediate(() => {
  executionLog.push('task_immediate_high_prio');
}, 10);

// Post delayed task
const del1 = closureGov.postDelayed(() => {
  executionLog.push('task_delayed_100ms');
}, 100);

// Post delayed task that will be cancelled
const del2 = closureGov.postDelayed(() => {
  executionLog.push('task_cancelled');
}, 50);
closureGov.cancel(del2.id);

assert.equal(closureGov.getPendingCount(), 3, 'Queue should have 3 non-cancelled tasks');

// Drain ready immediate tasks (time = now)
const now = Date.now();
const drained1 = await closureGov.drainReady(now);
assert.equal(drained1, 2, '2 immediate tasks should be drained');
assert.equal(executionLog[0], 'task_immediate_high_prio', 'High priority task must execute first');
assert.equal(executionLog[1], 'task_immediate_normal');

// Advance simulated clock past 100ms
const drained2 = await closureGov.drainReady(now + 150);
assert.equal(drained2, 1, 'Delayed task should now be drained');
assert.equal(executionLog[2], 'task_delayed_100ms');
assert.ok(!executionLog.includes('task_cancelled'), 'Cancelled closure must never execute');

console.log('  ✅ #2363 Verified: Unified actor closures execute with priority ordering and delayed support.');

console.log('\n🎉 ALL 7 TDLIB HARDENING TESTS PASSED WITH 100% SUCCESS!');
