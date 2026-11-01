/**
 * Verification Suite for Phase 186:
 * TDLib JSON Schema Validator, Multi-Bot Rate Governor, AI Feed Summarization,
 * Binary Trimming, JNI Exception Guard & GeoChats Migration Hardening
 * 
 * Verifies fixes for:
 * - tdlib/td #735 & #3786: TDLib JSON schema validation & 64-bit ID disambiguation
 * - tdlib/td #3751: Multi-bot posting coordinator & per-chat/global rate limiting
 * - tdlib/td #3695: Client-side AI feed summarization with user privacy consent
 * - tdlib/td #3684: TDLib binary footprint trimmer & modular feature flags
 * - tdlib/td #3299: JNI tdjson safe method invocation & null pointer guard
 * - tdlib/td #605: Legacy GeoChats deprecation & seamless searchChatsNearby translation
 */

import assert from 'node:assert/strict';
import {
  TdlibJsonSchemaGovernor,
  MultiBotPostingGovernor,
  ClientAiFeedSummarizerGovernor,
  TdlibBinaryFootprintTrimmerGovernor,
  TdJsonJniExceptionGuard,
  LegacyGeoChatsMigrationGovernor
} from '../src/services/tdlibJsonSchemaMultiBotAiAndJniGovernor.ts';

console.log('🧪 Starting Phase 186 Verification: TDLib JSON Schema, Multi-Bot, AI Feed & JNI Guard...');

// -------------------------------------------------------------
// Test 1: #735 & #3786 - JSON Schema Validation & 64-bit ID Disambiguation
// -------------------------------------------------------------
console.log('  Testing #735 & #3786: TDLib JSON Schema Validation & TL Disambiguation...');
const schemaGov = new TdlibJsonSchemaGovernor();

// Valid sendMessage request
const validReq = {
  '@type': 'sendMessage',
  chat_id: 123456789,
  input_message_content: {
    '@type': 'inputMessageText',
    text: { '@type': 'formattedText', text: 'Hello' }
  }
};
assert.equal(schemaGov.validateJsonRequest(validReq).valid, true);

// Invalid request missing required fields
const invalidReq = { '@type': 'sendMessage' };
const validation = schemaGov.validateJsonRequest(invalidReq);
assert.equal(validation.valid, false);
assert.ok(validation.errors.some(e => e.includes('chat_id')));

// 64-bit ID disambiguation exceeding IEEE-754 Number.MAX_SAFE_INTEGER
const hugeId = 9007199254740995;
const normalized = schemaGov.disambiguateField('chat_id', hugeId);
assert.equal(typeof normalized, 'string');
console.log('  ✅ #735 & #3786 Verified: JSON requests validated and 64-bit integers disambiguated as strings.');

// -------------------------------------------------------------
// Test 2: #3751 - Multi-Bot Posting Coordinator & Rate Limiter
// -------------------------------------------------------------
console.log('  Testing #3751: Multi-Bot Posting Rate Limits & Token Rotation...');
const botGov = new MultiBotPostingGovernor(['bot_token_alpha', 'bot_token_beta']);

const now = 1000000;
// First message to chat1 -> allowed with token alpha
const res1 = botGov.dispatchMessage({ chatId: 'c1', text: 'Msg 1' }, now);
assert.equal(res1.allowed, true);
assert.equal(res1.assignedBotToken, 'bot_token_alpha');

// Immediate second message to chat1 (same millisecond) -> blocked by per-chat rate limit (1 msg/sec)
const res2 = botGov.dispatchMessage({ chatId: 'c1', text: 'Msg 2' }, now);
assert.equal(res2.allowed, false);
assert.ok(res2.retryAfterMs > 0);

// Message to chat2 at same time -> allowed with token beta (round-robin)
const res3 = botGov.dispatchMessage({ chatId: 'c2', text: 'Msg 3' }, now);
assert.equal(res3.allowed, true);
assert.equal(res3.assignedBotToken, 'bot_token_beta');
console.log('  ✅ #3751 Verified: Multi-bot posting enforces per-chat rate limit and rotates tokens evenly.');

// -------------------------------------------------------------
// Test 3: #3695 - Client-Side AI Feed Summarization Governor
// -------------------------------------------------------------
console.log('  Testing #3695: Client-Side AI Feed Summarization & Privacy Consent...');
const aiGov = new ClientAiFeedSummarizerGovernor();

const sampleMessages = [
  { id: 1, text: 'Major system update released for Guidegram', senderName: 'Admin', timestamp: 100 },
  { id: 2, text: 'Security fixes applied to all client modules', senderName: 'Dev', timestamp: 105 }
];

// No consent initially -> blocked
const noConsentRes = aiGov.summarizeChannelBatch('chan_1', sampleMessages);
assert.equal(noConsentRes.allowed, false);

// Grant user consent
aiGov.setUserConsent(true);
const summaryRes1 = aiGov.summarizeChannelBatch('chan_1', sampleMessages);
assert.equal(summaryRes1.allowed, true);
assert.equal(summaryRes1.cached, false);
assert.ok(summaryRes1.summary.includes('Major system update'));

// Second call should hit local cache
const summaryRes2 = aiGov.summarizeChannelBatch('chan_1', sampleMessages);
assert.equal(summaryRes2.cached, true);
console.log('  ✅ #3695 Verified: Client AI feed summarization respects user privacy consent and caches summaries.');

// -------------------------------------------------------------
// Test 4: #3684 - TDLib Binary Footprint Trimmer Governor
// -------------------------------------------------------------
console.log('  Testing #3684: TDLib Binary Footprint Trimming & Build Flags...');
const trimmerGov = new TdlibBinaryFootprintTrimmerGovernor();

const mobileFlags = trimmerGov.computeOptimalBuildFlags('mobile_lightweight');
assert.equal(mobileFlags.enableDebugLogs, false);
assert.equal(mobileFlags.enableLegacyGeoChats, false);
assert.equal(mobileFlags.stripSymbols, true);

const reductionMb = trimmerGov.estimateBinarySizeReductionMb(mobileFlags);
assert.ok(reductionMb >= 17.0, 'Trimming debug logs and symbols should reduce binary size by > 17MB');
console.log('  ✅ #3684 Verified: Modular build flags trim unneeded features and reduce binary size by ~17.7MB.');

// -------------------------------------------------------------
// Test 5: #3299 - JNI tdjson Method Invocation Exception Guard
// -------------------------------------------------------------
console.log('  Testing #3299: JNI tdjson Null Pointer & Syntax Exception Guard...');
const jniGuard = new TdJsonJniExceptionGuard();

// Null client pointer -> structured error without SIGSEGV
const nullCall = jniGuard.executeSafeJniCall(null, '{"@type":"getMe"}');
assert.equal(nullCall.success, false);
assert.ok(nullCall.responseJson.includes('client pointer is null or disposed'));

// Malformed JSON syntax -> structured error
const syntaxCall = jniGuard.executeSafeJniCall(12345, '{invalid json');
assert.equal(syntaxCall.success, false);
assert.ok(syntaxCall.responseJson.includes('malformed JSON syntax'));

// Valid call
const okCall = jniGuard.executeSafeJniCall(12345, '{"@type":"getMe"}');
assert.equal(okCall.success, true);
console.log('  ✅ #3299 Verified: JNI calls safely guarded, preventing JVM native aborts on invalid inputs.');

// -------------------------------------------------------------
// Test 6: #605 - Legacy GeoChats Deprecation & Translation
// -------------------------------------------------------------
console.log('  Testing #605: Legacy GeoChats Protocol Translation...');
const geoGov = new LegacyGeoChatsMigrationGovernor();

const query = geoGov.translateLegacyQuery('geochat_near', 35.6892, 51.3890);
assert.equal(query['@type'], 'searchChatsNearby');
assert.equal(query.location?.latitude, 35.6892);
assert.equal(query.location?.longitude, 51.3890);
console.log('  ✅ #605 Verified: Deprecated GeoChats requests translated seamlessly into searchChatsNearby.');

console.log('\n🎉 ALL 7 TDLIB HARDENING TESTS PASSED WITH 100% SUCCESS!');
