import assert from 'node:assert/strict';
import { TdlibVoipWasmProxyAndBotStartGovernor } from '../src/services/tdlibVoipWasmProxyAndBotStartGovernor.ts';

console.log('🧪 Starting Phase 152: TDLib WASM Transport, VoIP Call, HTTP Proxy, Boundaries, Content Diff & Bot /start Tests...\n');

const governor = new TdlibVoipWasmProxyAndBotStartGovernor();

// ============================================================================
// 1. tdlib/td#621 - WASM WebSocket MTProto Transport
// ============================================================================
console.log('👉 Testing Case 1: WASM WebSocket Transport (tdlib/td#621)...');
const wasmConfig = governor.getWasmWebSocketConfig(2);
assert.equal(wasmConfig.primaryUrl, 'wss://venus.web.telegram.org/apiws');
assert.equal(wasmConfig.protocols[0], 'binary');
assert.equal(wasmConfig.binaryType, 'arraybuffer');
assert.ok(wasmConfig.fallbackUrls.length >= 4);
assert.ok(wasmConfig.fallbackUrls.some((u) => u.includes('pluto')));
console.log('✅ Case 1 passed: WASM WebSocket binary transport and DC fallback endpoints configured.\n');

// ============================================================================
// 2. tdlib/td#541 - Profile Photo Small/Big Resolution & Fallback
// ============================================================================
console.log('👉 Testing Case 2: Profile Photo Resolution (tdlib/td#541)...');
// User with downloaded photo
const photoData = {
  small: { id: 101, local: { path: '/cache/small_101.jpg', is_downloading_completed: true } },
  big: { id: 102, local: { path: '', is_downloading_completed: false } },
};
const resolvedSmall = governor.resolveProfilePhoto(photoData, 'Dr Ershad', false);
assert.equal(resolvedSmall.hasPhoto, true);
assert.equal(resolvedSmall.localPath, '/cache/small_101.jpg');
assert.equal(resolvedSmall.needsDownload, false);

// Prefer big photo needing download
const resolvedBig = governor.resolveProfilePhoto(photoData, 'Dr Ershad', true);
assert.equal(resolvedBig.hasPhoto, true);
assert.equal(resolvedBig.localPath, null);
assert.equal(resolvedBig.needsDownload, true);
assert.equal(resolvedBig.fileIdToDownload, 102);

// User with no photo -> initials fallback
const noPhoto = governor.resolveProfilePhoto(null, 'Alice Wonderland');
assert.equal(noPhoto.hasPhoto, false);
assert.equal(noPhoto.fallbackInitials, 'A');
console.log('✅ Case 2 passed: Profile photo download resolution and initials fallback verified.\n');

// ============================================================================
// 3. tdlib/td#176 - HTTP CONNECT Proxy with Basic Authentication
// ============================================================================
console.log('👉 Testing Case 3: HTTP CONNECT Proxy Payload (tdlib/td#176)...');
const httpProxy = governor.buildHttpProxyPayload('corporate.proxy.corp', 8080, 'admin_user', 'secret_pass_123');
assert.equal(httpProxy['@type'], 'addProxy');
assert.equal(httpProxy.server, 'corporate.proxy.corp');
assert.equal(httpProxy.port, 8080);
assert.equal(httpProxy.type['@type'], 'proxyTypeHttp');
assert.equal(httpProxy.type.username, 'admin_user');
assert.equal(httpProxy.type.password, 'secret_pass_123');
console.log('✅ Case 3 passed: HTTP proxy with Basic Authentication payload constructed cleanly.\n');

// ============================================================================
// 4. tdlib/td#168 - Chat History Boundary Slicing
// ============================================================================
console.log('👉 Testing Case 4: Chat History Boundary Slicing (tdlib/td#168)...');
// Requested 50, but chat only has 15 messages -> boundary reached (top of chat)
const messages15 = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));
const boundarySlice = governor.reconcileChatHistorySlice(50, messages15, 'older');
assert.equal(boundarySlice.isBoundaryReached, true);
assert.equal(boundarySlice.count, 15);

// Requested 20, got 20 -> boundary not reached yet
const messages20 = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
const middleSlice = governor.reconcileChatHistorySlice(20, messages20, 'older');
assert.equal(middleSlice.isBoundaryReached, false);
console.log('✅ Case 4 passed: Chat history boundary slicing prevents redundant over-fetch triggers.\n');

// ============================================================================
// 5. tdlib/td#82 - VoIP 1-on-1 Call State Machine & 4-Emoji Verification
// ============================================================================
console.log('👉 Testing Case 5: VoIP Call State & 4-Emoji Fingerprint (tdlib/td#82)...');
const session = governor.initiateVoipCall(901, 777, true);
assert.equal(session.state, 'callStatePending');
assert.equal(session.isOutgoing, true);

// Transition to exchanging keys
governor.transitionVoipState('callStateExchangingKeys');

// Transition to ready with auth key bytes
const fakeAuthKey = new Uint8Array([12, 34, 56, 78, 90, 123]);
const readySession = governor.transitionVoipState('callStateReady', fakeAuthKey);
assert.equal(readySession.state, 'callStateReady');
assert.equal(readySession.keyFingerprintEmojis.length, 4);

// Discard call
const discardedSession = governor.discardVoipCall('hung_up');
assert.equal(discardedSession.state, 'callStateDiscarded');
assert.equal(discardedSession.discardReason, 'hung_up');
console.log('✅ Case 5 passed: VoIP call state machine and Telegram 4-emoji verification active.\n');

// ============================================================================
// 6. tdlib/td#2297 - UpdateMessageContent Reactive Diffing
// ============================================================================
console.log('👉 Testing Case 6: UpdateMessageContent Reactive Diffing (tdlib/td#2297)...');
const originalMessage = {
  id: 42,
  chatId: 100,
  senderId: 1,
  date: 1000000,
  text: 'Initial draft message',
};

const editedMessage = governor.applyUpdateMessageContent(originalMessage, 'Updated polished message', 1000050);
assert.equal(editedMessage.id, 42);
assert.equal(editedMessage.text, 'Updated polished message');
assert.equal(editedMessage.isEdited, true);
assert.equal(editedMessage.editDate, 1000050);
assert.equal(editedMessage.date, 1000000); // Original creation date preserved
console.log('✅ Case 6 passed: UpdateMessageContent diffs updates while preserving core metadata.\n');

// ============================================================================
// 7. tdlib/td#1298 - Bot /start Deep Link Parameter Parser
// ============================================================================
console.log('👉 Testing Case 7: Bot /start Deep Link Parser (tdlib/td#1298)...');
// URL with start payload
const affiliateLink = governor.parseBotStartDeepLink('https://t.me/guidegram_bot?start=ref_campaign_42');
assert.equal(affiliateLink.isValid, true);
assert.equal(affiliateLink.botUsername, 'guidegram_bot');
assert.equal(affiliateLink.startParameter, 'ref_campaign_42');

// tg:// custom scheme
const tgLink = governor.parseBotStartDeepLink('tg://resolve?domain=helper_bot&start=welcome_onboarding');
assert.equal(tgLink.isValid, true);
assert.equal(tgLink.botUsername, 'helper_bot');
assert.equal(tgLink.startParameter, 'welcome_onboarding');

// Build TDLib query
const startQuery = governor.buildSendBotStartQuery(1001, 2002, affiliateLink.startParameter);
assert.equal(startQuery['@type'], 'sendBotStartMessage');
assert.equal(startQuery.parameter, 'ref_campaign_42');
console.log('✅ Case 7 passed: Bot /start parameter deep link and query builder verified.\n');

console.log('🎉 ALL 7 PHASE 152 HARDENING TESTS PASSED WITH 100% SUCCESS!');
