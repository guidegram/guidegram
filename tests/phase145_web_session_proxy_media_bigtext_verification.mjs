import assert from 'node:assert/strict';
import { WebSessionProxyMediaAndBigTextGovernor } from '../src/services/webSessionProxyMediaAndBigTextGovernor.ts';

console.log('🧪 Starting Phase 145: Stranger Badges, Screenshare, Session Isolation, MTProxy, Settings & Big Text Tests...\n');

const governor = new WebSessionProxyMediaAndBigTextGovernor();

// ============================================================================
// 1. Ajaxy/telegram-tt#496 & #495 - Stranger Message Badges
// ============================================================================
console.log('👉 Testing Case 1: Stranger Message Badges (Ajaxy/telegram-tt#496, #495)...');
// Stranger message with allowed notifications shows badge
const strangerAllowed = governor.evaluateStrangerMessageBadge('stranger_101', false, 3, { allowStrangerNotifications: true });
assert.equal(strangerAllowed.shouldDisplayBadge, true);
assert.equal(strangerAllowed.effectiveUnreadCount, 3);
assert.equal(strangerAllowed.isStranger, true);

// Stranger message with disallowed notifications suppresses badge
const strangerDisallowed = governor.evaluateStrangerMessageBadge('stranger_102', false, 2, { allowStrangerNotifications: false });
assert.equal(strangerDisallowed.shouldDisplayBadge, false);
assert.equal(strangerDisallowed.effectiveUnreadCount, 0);

// Known contact always displays badge
const contactBadge = governor.evaluateStrangerMessageBadge('friend_103', true, 5, { allowStrangerNotifications: false });
assert.equal(contactBadge.shouldDisplayBadge, true);
assert.equal(contactBadge.effectiveUnreadCount, 5);
console.log('✅ Case 1 passed: Stranger unread badges and privacy policies handled correctly.\n');

// ============================================================================
// 2. Ajaxy/telegram-tt#479 - WebRTC Screen-Sharing Constraints
// ============================================================================
console.log('👉 Testing Case 2: Screenshare Constraints (Ajaxy/telegram-tt#479)...');
const constraints1080p = governor.buildScreenShareConstraints({ resolution: '1080p', maxFps: 60, captureAudio: true });
assert.equal(constraints1080p.video.width.max, 1920);
assert.equal(constraints1080p.video.height.max, 1080);
assert.equal(constraints1080p.video.frameRate.max, 60);
assert.ok(typeof constraints1080p.audio === 'object');

const constraints720p = governor.buildScreenShareConstraints({ resolution: '720p', maxFps: 30, captureAudio: false });
assert.equal(constraints720p.video.width.max, 1280);
assert.equal(constraints720p.video.height.max, 720);
assert.equal(constraints720p.audio, false);
console.log('✅ Case 2 passed: Screen-sharing constraints configuration valid and robust.\n');

// ============================================================================
// 3. Ajaxy/telegram-tt#475 - Multi-Session Device Identity Isolation
// ============================================================================
console.log('👉 Testing Case 3: Session Identity Isolation (Ajaxy/telegram-tt#475)...');
const webSession = governor.createIsolatedSessionIdentity('guidegram_web');
assert.equal(webSession.deviceModel, 'Guidegram Web Modern');
assert.match(webSession.uniqueClientSessionId, /^gg_guidegram_web_\d+_[0-9a-f]+$/);

const desktopSession = governor.createIsolatedSessionIdentity('guidegram_desktop');
assert.equal(desktopSession.deviceModel, 'Guidegram Desktop Confinement');
assert.notEqual(webSession.uniqueClientSessionId, desktopSession.uniqueClientSessionId);
console.log('✅ Case 3 passed: Distinct device fingerprints prevent concurrent session logout.\n');

// ============================================================================
// 4. Ajaxy/telegram-tt#445 - MTProxy Secret & Fake-TLS Validation
// ============================================================================
console.log('👉 Testing Case 4: MTProxy Validation (Ajaxy/telegram-tt#445)...');
// Standard 32-char hex secret
const standardSecret = '0123456789abcdef0123456789abcdef';
const standardResult = governor.validateAndParseMTProxy('proxy.example.com', 443, standardSecret);
assert.equal(standardResult.isValid, true);
assert.equal(standardResult.config.isFakeTls, false);

// dd-prefixed secret
const ddSecret = 'dd' + standardSecret;
const ddResult = governor.validateAndParseMTProxy('proxy.example.com', 8443, ddSecret);
assert.equal(ddResult.isValid, true);

// ee-prefixed Fake-TLS secret with encoded domain (cloudflare.com in hex: 636c6f7564666c6172652e636f6d)
const fakeTlsSecret = 'ee' + standardSecret + '636c6f7564666c6172652e636f6d';
const fakeTlsResult = governor.validateAndParseMTProxy('proxy.example.com', 443, fakeTlsSecret);
assert.equal(fakeTlsResult.isValid, true);
assert.equal(fakeTlsResult.config.isFakeTls, true);
assert.equal(fakeTlsResult.config.tlsDomain, 'cloudflare.com');

// Invalid port
const invalidPort = governor.validateAndParseMTProxy('proxy.example.com', 99999, standardSecret);
assert.equal(invalidPort.isValid, false);
console.log('✅ Case 4 passed: MTProxy secret format and Fake-TLS domain parsing verified.\n');

// ============================================================================
// 5. Ajaxy/telegram-tt#406 - Settings Migration & Corruption Recovery
// ============================================================================
console.log('👉 Testing Case 5: Settings Migration & Recovery (Ajaxy/telegram-tt#406)...');
// Corrupt JSON string returns clean defaults instead of throwing
const recoveredDefaults = governor.restoreAndMigrateSettings('{ invalid json string ...');
assert.equal(recoveredDefaults.theme, 'dark');
assert.equal(recoveredDefaults.fontSize, 16);

// Partially valid settings are preserved and merged
const partialJson = JSON.stringify({ theme: 'light', fontSize: 20 });
const migrated = governor.restoreAndMigrateSettings(partialJson);
assert.equal(migrated.theme, 'light');
assert.equal(migrated.fontSize, 20);
assert.equal(migrated.sendByEnter, true); // preserved default
assert.equal(migrated.version, 3);
console.log('✅ Case 5 passed: Settings corruption recovery and schema migration robust.\n');

// ============================================================================
// 6. Ajaxy/telegram-tt#402 - Video Streaming Range Buffering
// ============================================================================
console.log('👉 Testing Case 6: Video Streaming Range Buffering (Ajaxy/telegram-tt#402)...');
const totalVideoBytes = 10_000_000; // 10MB
const chunk1 = governor.calculateVideoChunkRange(0, 1_000_000, totalVideoBytes);
assert.equal(chunk1.start, 0);
assert.equal(chunk1.end, 999_999);
assert.equal(chunk1.contentRange, 'bytes 0-999999/10000000');
assert.equal(chunk1.isLastChunk, false);

const chunkFinal = governor.calculateVideoChunkRange(9_000_000, 2_000_000, totalVideoBytes);
assert.equal(chunkFinal.start, 9_000_000);
assert.equal(chunkFinal.end, 9_999_999);
assert.equal(chunkFinal.isLastChunk, true);
console.log('✅ Case 6 passed: Video byte ranges calculated accurately for smooth playback.\n');

// ============================================================================
// 7. Ajaxy/telegram-tt#374 - Big Text Smart Splitting & File Alternative
// ============================================================================
console.log('👉 Testing Case 7: Big Text Splitting Governor (Ajaxy/telegram-tt#374)...');
// Small text under 4096 chars
const smallText = 'Hello Guidegram!';
const smallResult = governor.processPastedBigText(smallText, 4096);
assert.equal(smallResult.exceedsLimit, false);
assert.equal(smallResult.chunks.length, 1);
assert.equal(smallResult.suggestedAction, 'single_message');

// Big text exceeding 4096 chars
const line = 'This is a long sentence repeated in a very large paragraph.\n';
const bigText = line.repeat(150); // ~9000 chars
const bigResult = governor.processPastedBigText(bigText, 4096);
assert.equal(bigResult.exceedsLimit, true);
assert.ok(bigResult.chunks.length >= 2);
for (const chunk of bigResult.chunks) {
  assert.ok(chunk.length <= 4096);
}
assert.ok(bigResult.fileAttachment);
assert.equal(bigResult.fileAttachment.filename, 'message.txt');
console.log('✅ Case 7 passed: Big text auto-chunking and file conversion verified.\n');

console.log('🎉 ALL 7 PHASE 145 HARDENING TESTS PASSED WITH 100% SUCCESS!');
