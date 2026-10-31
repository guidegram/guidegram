import assert from 'node:assert/strict';
import { SessionConcurrencyAndMultiDeviceGovernor } from '../dist-test-session/sessionConcurrencyAndMultiDeviceGovernor.js';

console.log('🧪 Starting Phase 61 Session Concurrency & Multi-Device Synchronization Verification Suite...');

const governor = new SessionConcurrencyAndMultiDeviceGovernor();

// 1. Isolated Storage Keys (morethanwords/tweb #532)
console.log('  Testing isolated storage keys for concurrent client tabs...');
const key1 = governor.getIsolatedStorageKey('client_web_a', 'auth_key');
const key2 = governor.getIsolatedStorageKey('client_web_k', 'auth_key');
assert.equal(key1, 'guidegram_client_web_a_auth_key');
assert.equal(key2, 'guidegram_client_web_k_auth_key');
assert.notEqual(key1, key2, 'Isolated storage keys must not collide across clients');
console.log('  ✅ Isolated storage keys verified');

// 2. Safe Active Session Authorization Deserialization (Ajaxy/telegram-tt #426)
console.log('  Testing safe session authorization deserialization...');
// Test completely empty / undefined authorization object
const safeAuthEmpty = governor.sanitizeAuthorization(null);
assert.equal(safeAuthEmpty.deviceModel, 'Unknown Device');
assert.equal(safeAuthEmpty.platform, 'Web / Unknown');
assert.equal(safeAuthEmpty.appName, 'Guidegram');
assert.equal(safeAuthEmpty.ip, '0.0.0.0');

// Test partial authorization object missing device_model
const partialAuth = {
  hash: 'auth_hash_123',
  platform: 'Linux x86_64',
  ip: '192.168.1.50',
};
const safePartial = governor.sanitizeAuthorization(partialAuth, 'auth_hash_123');
assert.equal(safePartial.deviceModel, 'Unknown Device');
assert.equal(safePartial.platform, 'Linux x86_64');
assert.equal(safePartial.isCurrent, true);
console.log('  ✅ Safe authorization deserialization verified');

// 3. Ephemeral Memory Session Token Store (morethanwords/tweb #8)
console.log('  Testing memory session store fallback...');
governor.setSessionToken('private_session_1', 'token_data', 'secret_jwt_xyz');
const token = governor.getSessionToken('private_session_1', 'token_data');
assert.equal(token, 'secret_jwt_xyz');
console.log('  ✅ Memory session token store verified');

// 4. Multi-Client Session Bounded Pooling & LRU Hibernation (tdlib/td #3671)
console.log('  Testing multi-client session bounded pooling with LRU hibernation...');
// Register 5 active client sessions
for (let i = 1; i <= 5; i++) {
  governor.registerClientSession({
    clientId: `client_${i}`,
    userId: `user_10${i}`,
    sessionKey: `key_${i}`,
    lastActive: 1000 + i * 10,
    status: 'active',
  });
}
assert.equal(governor.getActiveClientCount(), 5);

// Adding a 6th client should hibernate the oldest client (client_1 with lastActive 1010)
const sixthResult = governor.registerClientSession({
  clientId: 'client_6',
  userId: 'user_106',
  sessionKey: 'key_6',
  lastActive: 2000,
  status: 'active',
});

assert.equal(sixthResult.admitted, true);
assert.equal(sixthResult.hibernatedClientId, 'client_1');
assert.equal(governor.getActiveClientCount(), 5);
console.log('  ✅ Multi-client bounded pooling & LRU hibernation verified');

// 5. Alternative Login Method Arbitration (TelegramMessenger/Telegram-iOS #2168)
console.log('  Testing alternative login method routing...');
// Case A: User has active session elsewhere
const routeWithSession = governor.arbitrateLoginRoute({
  hasActiveSessions: true,
  smsDeliveryBlockedOrFee: false,
  supportsQrLogin: true,
});
assert.equal(routeWithSession.primaryMethod, 'telegram_app_push');

// Case B: No active sessions, SMS blocked or expensive fee, supports QR
const routeSmsBlocked = governor.arbitrateLoginRoute({
  hasActiveSessions: false,
  smsDeliveryBlockedOrFee: true,
  supportsQrLogin: true,
});
assert.equal(routeSmsBlocked.primaryMethod, 'qr_code');

// Case C: Normal login
const routeStandard = governor.arbitrateLoginRoute({
  hasActiveSessions: false,
  smsDeliveryBlockedOrFee: false,
  supportsQrLogin: false,
});
assert.equal(routeStandard.primaryMethod, 'sms');
console.log('  ✅ Alternative login method routing verified');

// 6. Per-Chat Persona / Send-As Identity Segregation (kotatogram/kotatogram-desktop #366)
console.log('  Testing per-chat persona segregation...');
const overrides = new Map();
overrides.set('channel_tech', {
  sendAsPeerId: 'channel_admin_peer_99',
  sendAsName: 'Tech News Channel',
});

const channelIdentity = governor.resolveChatSendAsIdentity('channel_tech', overrides, 'my_user_id');
assert.equal(channelIdentity.sendAsPeerId, 'channel_admin_peer_99');
assert.equal(channelIdentity.isOverride, true);

const personalChatIdentity = governor.resolveChatSendAsIdentity('chat_dm_bob', overrides, 'my_user_id');
assert.equal(personalChatIdentity.sendAsPeerId, 'my_user_id');
assert.equal(personalChatIdentity.isOverride, false);
console.log('  ✅ Per-chat persona segregation verified');

console.log('✨ All Phase 61 Verification Tests Passed 100% Successfully!');
