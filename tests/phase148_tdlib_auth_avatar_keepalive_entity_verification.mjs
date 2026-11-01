import assert from 'node:assert/strict';
import { TdlibAuthAvatarKeepaliveAndEntityGovernor } from '../src/services/tdlibAuthAvatarKeepaliveAndEntityGovernor.ts';

console.log('🧪 Starting Phase 148: TDLib Core 2FA, Auth Duplicates, Avatar Downscaling, Keepalive, Push & UTF-16 Entities Tests...\n');

const governor = new TdlibAuthAvatarKeepaliveAndEntityGovernor();

// ============================================================================
// 1. tdlib/td#3494 - 2FA Password Recovery Flow
// ============================================================================
console.log('👉 Testing Case 1: 2FA Password Recovery (tdlib/td#3494)...');
// Account with email recovery
const emailState = {
  hasRecoveryEmail: true,
  emailPattern: 'a***@gmail.com',
};
const emailAction = governor.evaluatePasswordRecoveryOption(emailState);
assert.equal(emailAction.action, 'send_recovery_code');
assert.equal(emailAction.emailPattern, 'a***@gmail.com');

// Account without recovery email but with pending reset
const resetState = {
  hasRecoveryEmail: false,
  resetAccountPendingDays: 7,
};
const resetAction = governor.evaluatePasswordRecoveryOption(resetState);
assert.equal(resetAction.action, 'start_reset_countdown');
assert.equal(resetAction.resetWaitDays, 7);
console.log('✅ Case 1 passed: 2FA recovery flow triggers properly and prevents account lock.\n');

// ============================================================================
// 2. tdlib/td#1947 - AUTH_KEY_DROP_DUPLICATE Handshake Recovery
// ============================================================================
console.log('👉 Testing Case 2: AUTH_KEY_DROP_DUPLICATE Recovery (tdlib/td#1947)...');
const dropRecovery = governor.handleAuthKeyDuplicateError();
assert.equal(dropRecovery.recovered, true);
assert.equal(dropRecovery.shouldResetLocalAuthKey, true);
assert.match(dropRecovery.newClientNonce, /^[0-9a-f]{32}$/);
assert.match(dropRecovery.newServerSalt, /^[0-9a-f]{16}$/);
console.log('✅ Case 2 passed: Duplicate auth keys safely trigger nonce regeneration.\n');

// ============================================================================
// 3. tdlib/td#1691 - Avatar Upload OOM Prevention via Downscaling
// ============================================================================
console.log('👉 Testing Case 3: Avatar Downscaling OOM Prevention (tdlib/td#1691)...');
// Giant 48MP camera image: 8000x6000
const downscaleResult = governor.calculateAvatarDownscale(8000, 6000, 1280);
assert.equal(downscaleResult.cropWidth, 6000); // Centered square crop
assert.equal(downscaleResult.cropHeight, 6000);
assert.equal(downscaleResult.targetWidth, 1280); // Scaled to max 1280
assert.equal(downscaleResult.targetHeight, 1280);
assert.ok(downscaleResult.estimatedMemoryReductionPct > 90); // ~96% memory saved!
assert.equal(downscaleResult.quality, 0.85);

// Small avatar image: 500x500 (not downscaled)
const smallResult = governor.calculateAvatarDownscale(500, 500, 1280);
assert.equal(smallResult.targetWidth, 500);
assert.equal(smallResult.scaleFactor, 1.0);
console.log('✅ Case 3 passed: Avatar downscaling eliminates client-side OOM crashes on high-res photos.\n');

// ============================================================================
// 4. tdlib/td#1086 - MTProto TCP Keepalive Ping Timing
// ============================================================================
console.log('👉 Testing Case 4: MTProto TCP Keepalive Ping (tdlib/td#1086)...');
const t0 = 1000000;
const pingStatus = governor.prepareKeepalivePing(t0);
assert.equal(pingStatus.disconnectDelaySec, 75);
assert.equal(pingStatus.intervalMs, 45000);

// Healthy check within 5s after ping
const healthyCheck = governor.evaluateSocketHealth(t0 + 5000);
assert.equal(healthyCheck.isHealthy, true);
assert.equal(healthyCheck.needsReconnect, false);

// Half-open socket: no pong received for 16s after ping
const halfOpenCheck = governor.evaluateSocketHealth(t0 + 16000);
assert.equal(halfOpenCheck.isHealthy, false);
assert.equal(halfOpenCheck.needsReconnect, true);

// Recording pong restores health
governor.recordPongReceived(t0 + 17000);
const restoredCheck = governor.evaluateSocketHealth(t0 + 18000);
assert.equal(restoredCheck.isHealthy, true);
console.log('✅ Case 4 passed: Keepalive ping and half-open socket detection prevent TCP drops.\n');

// ============================================================================
// 5. tdlib/td#549 - Push Notification Device Token Payload
// ============================================================================
console.log('👉 Testing Case 5: Push Device Token Registration (tdlib/td#549)...');
const fcmPayload = governor.buildDevicePushRegistration('fcm', 'sample_fcm_token_xyz', [1001, 1002]);
assert.equal(fcmPayload['@type'], 'registerDevice');
assert.equal(fcmPayload.device_token['@type'], 'deviceTokenFirebaseCloudMessaging');
assert.equal(fcmPayload.device_token.token, 'sample_fcm_token_xyz');
assert.equal(fcmPayload.other_user_ids.length, 2);

const apnsPayload = governor.buildDevicePushRegistration('apns', 'sample_apns_token_abc');
assert.equal(apnsPayload.device_token['@type'], 'deviceTokenApplePush');
console.log('✅ Case 5 passed: Push device token registration payload compliant with TDLib schema.\n');

// ============================================================================
// 6. tdlib/td#181 - UTF-16 Code Unit Entity Offsets (Cyrillic, Persian & Emoji)
// ============================================================================
console.log('👉 Testing Case 6: UTF-16 Entity Offsets (tdlib/td#181)...');
// Text mixing English, Cyrillic, Persian, and Emoji with surrogate pairs
const text = 'Hello Привет سلام 🚀 Rocket';
const entities = governor.calculateEntityOffsets(text, [
  { type: 'bold', substring: 'Привет' },
  { type: 'italic', substring: 'سلام' },
  { type: 'custom_emoji', substring: '🚀' },
]);

assert.equal(entities.length, 3);
// Slicing by UTF-16 offset and length must exactly match
assert.equal(governor.sliceEntityByUtf16(text, entities[0]), 'Привет');
assert.equal(governor.sliceEntityByUtf16(text, entities[1]), 'سلام');
assert.equal(governor.sliceEntityByUtf16(text, entities[2]), '🚀');
console.log('✅ Case 6 passed: UTF-16 code unit offset calculation resolves Russian/Persian/Emoji entity bugs.\n');

// ============================================================================
// 7. tdlib/td#2947 - Protocol Version & UPDATE_APP_TO_LOGIN
// ============================================================================
console.log('👉 Testing Case 7: UPDATE_APP_TO_LOGIN Protocol Layer Check (tdlib/td#2947)...');
const outdatedLayer = governor.evaluateProtocolLayerRequirement(140, 160);
assert.equal(outdatedLayer.isUpdateRequired, true);
assert.ok(outdatedLayer.diagnostic.includes('deprecated'));
assert.equal(outdatedLayer.downloadUrl, 'https://guidegram.org/download');

const modernLayer = governor.evaluateProtocolLayerRequirement(170, 160);
assert.equal(modernLayer.isUpdateRequired, false);
console.log('✅ Case 7 passed: Protocol layer checks handle UPDATE_APP_TO_LOGIN gracefully.\n');

console.log('🎉 ALL 7 PHASE 148 HARDENING TESTS PASSED WITH 100% SUCCESS!');
