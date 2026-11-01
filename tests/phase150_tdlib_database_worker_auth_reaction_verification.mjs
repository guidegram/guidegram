import assert from 'node:assert/strict';
import { TdlibDatabaseWorkerAuthAndReactionGovernor } from '../src/services/tdlibDatabaseWorkerAuthAndReactionGovernor.ts';

console.log('🧪 Starting Milestone Phase 150: TDLib DB Encryption, Chat List, Worker Blob, Auth Code, 64-bit ID & Reactions Tests...\n');

const governor = new TdlibDatabaseWorkerAuthAndReactionGovernor();

// ============================================================================
// 1. tdlib/td#188 - setEncryptionKey Usage
// ============================================================================
console.log('👉 Testing Case 1: Database Encryption Key Query (tdlib/td#188)...');
// Empty passphrase unlocks unencrypted DB
const unencryptedQuery = governor.buildSetDatabaseEncryptionKeyQuery('');
assert.equal(unencryptedQuery['@type'], 'setDatabaseEncryptionKey');
assert.equal(unencryptedQuery.new_encryption_key, '');

// Secure passphrase encodes to base64
const encryptedQuery = governor.buildSetDatabaseEncryptionKeyQuery('superSecretKey123!');
assert.ok(encryptedQuery.new_encryption_key.length > 0);
assert.equal(Buffer.from(encryptedQuery.new_encryption_key, 'base64').toString('utf-8'), 'superSecretKey123!');

// Passphrase too short throws
assert.throws(() => governor.buildSetDatabaseEncryptionKeyQuery('short'), /at least 6 characters/);
console.log('✅ Case 1 passed: Database encryption key configuration valid.\n');

// ============================================================================
// 2. tdlib/td#1847 - loadChats Pagination Loop & 404 End-of-List Guard
// ============================================================================
console.log('👉 Testing Case 2: loadChats Pagination (tdlib/td#1847)...');
// Initial load
const prep1 = governor.prepareLoadChats('main', 20);
assert.equal(prep1.canLoad, true);
assert.equal(prep1.query.limit, 20);

// Concurrent attempt while loading is blocked
const prepConcurrent = governor.prepareLoadChats('main', 20);
assert.equal(prepConcurrent.canLoad, false);

// 20 items loaded -> can load more
governor.handleLoadChatsResponse(null, 20);
assert.equal(governor.getLoadChatsState().hasMore, true);
assert.equal(governor.getLoadChatsState().totalLoaded, 20);

// Next attempt loads 0 items / 404 -> terminates loop gracefully
governor.prepareLoadChats('main', 20);
governor.handleLoadChatsResponse({ code: 404, message: 'Not Found' }, 0);
assert.equal(governor.getLoadChatsState().hasMore, false);

const prepAfterEnd = governor.prepareLoadChats('main', 20);
assert.equal(prepAfterEnd.canLoad, false); // Loop halted!
console.log('✅ Case 2 passed: loadChats 404 end-of-list guard prevents infinite pagination loops.\n');

// ============================================================================
// 3. tdlib/td#1126 - Web Worker Blob URL Fallback
// ============================================================================
console.log('👉 Testing Case 3: Web Worker Blob URL Fallback (tdlib/td#1126)...');
const workerCode = 'self.onmessage = function() { postMessage("pong"); };';

// Normal origin
const normalWorker = governor.createWorkerScriptUrl(workerCode, 'https://cdn.example.com/worker.js', false);
assert.equal(normalWorker.isBlobUrl, false);
assert.equal(normalWorker.workerUrl, 'https://cdn.example.com/worker.js');

// Sandboxed / Cross-domain origin creates Blob URL
const sandboxedWorker = governor.createWorkerScriptUrl(workerCode, 'https://cdn.example.com/worker.js', true);
assert.equal(sandboxedWorker.isBlobUrl, true);
assert.match(sandboxedWorker.workerUrl, /^blob:/);
console.log('✅ Case 3 passed: Inline Blob URL fallback prevents Web Worker SecurityErrors.\n');

// ============================================================================
// 4. tdlib/td#942 - checkAuthenticationCode Normalization & Cooldown
// ============================================================================
console.log('👉 Testing Case 4: Auth Code Normalization & Backoff (tdlib/td#942)...');
const validCode = governor.normalizeAuthCode(' 123-456 ');
assert.equal(validCode.isValid, true);
assert.equal(validCode.normalizedCode, '123456');

const shortCode = governor.normalizeAuthCode('12');
assert.equal(shortCode.isValid, false);

// Failure trigger and exponential backoff
const fail1 = governor.handleAuthCodeFailure(400);
assert.equal(fail1.retryCount, 1);
assert.equal(fail1.backoffDelayMs, 0);

const fail2 = governor.handleAuthCodeFailure(400);
assert.equal(fail2.retryCount, 2);
assert.equal(fail2.backoffDelayMs, 2000);

governor.resetAuthCodeState();
assert.equal(governor.normalizeAuthCode('54321').retryCount, 0);
console.log('✅ Case 4 passed: Auth code normalization and brute-force backoff active.\n');

// ============================================================================
// 5. tdlib/td#263 - 64-bit BigInt Precision Safety
// ============================================================================
console.log('👉 Testing Case 5: 64-bit Telegram ID Precision Safety (tdlib/td#263)...');
// Very large 64-bit ID exceeding IEEE 754 MAX_SAFE_INTEGER (9007199254740991)
const hugeIdStr = '-1002345678901234567';
const safeId = governor.safeParseTelegramId(hugeIdStr);
assert.equal(safeId.asString, hugeIdStr);
assert.equal(safeId.isSafeInteger, false);

// String serialization preserves exact digits
const serialized = governor.serializeMessageWith64BitId(safeId.asBigInt, 'Hello BigInt');
const parsedObj = JSON.parse(serialized);
assert.equal(parsedObj.id, hugeIdStr); // Pristine string without precision truncation!
console.log('✅ Case 5 passed: 64-bit BigInt IDs serialize safely without digit truncation.\n');

// ============================================================================
// 6. tdlib/td#3007 - Message Reaction Type Normalization
// ============================================================================
console.log('👉 Testing Case 6: Reaction Type Normalization (tdlib/td#3007)...');
// Standard unicode emoji
const emojiReaction = governor.normalizeReaction('🔥');
assert.equal(emojiReaction.type, 'emoji');
assert.equal(emojiReaction.value, '🔥');
assert.equal(emojiReaction.tdlibPayload['@type'], 'reactionTypeEmoji');

// Custom emoji with 64-bit ID
const customReaction = governor.normalizeReaction({ custom_emoji_id: '543210987654321' });
assert.equal(customReaction.type, 'custom_emoji');
assert.equal(customReaction.value, '543210987654321');
assert.equal(customReaction.tdlibPayload['@type'], 'reactionTypeCustomEmoji');
console.log('✅ Case 6 passed: Standard and custom emoji reactions normalized to TDLib schema.\n');

// ============================================================================
// 7. tdlib/td#1195 - TDJSON C-String Null-Termination
// ============================================================================
console.log('👉 Testing Case 7: TDJSON C-String Zero-Termination (tdlib/td#1195)...');
const sampleQuery = '{"@type":"getMe"}';
const cBuffer = governor.sanitizeTdjsonCString(sampleQuery);
assert.equal(cBuffer.hasNullTerminator, true);
assert.equal(cBuffer.byteLength, sampleQuery.length + 1); // +1 byte for '\0'

// Invalid JSON syntax throws cleanly
assert.throws(() => governor.sanitizeTdjsonCString('{"@type": invalid...'), /Unexpected/);
console.log('✅ Case 7 passed: TDJSON C-string null-termination prevents buffer overruns.\n');

console.log('🎉 ALL 7 PHASE 150 HARDENING TESTS PASSED WITH 100% SUCCESS!');
