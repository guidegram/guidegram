import assert from 'node:assert';
import { SessionAuthAndSecurityGovernor } from '../src/services/sessionAuthAndSecurityGovernor.ts';

console.log('🧪 Starting Phase 83 Session Auth & Security Verification Suite...');

const governor = new SessionAuthAndSecurityGovernor();

// 1. Phone Login & Multi-Channel Delivery (iOS #2388, Kotatogram #460)
console.log('  Testing phone login with 2FA and multi-channel code...');
governor.setTwoFactorPassword('+989123456789', 'secret_2fa_hash');

// Initiate phone login
const now = Date.now();
const challenge = governor.initiatePhoneLogin('+989123456789', 'email', now);
assert.strictEqual(challenge.phone, '+989123456789');
assert.strictEqual(challenge.deliveryChannel, 'email');
assert.strictEqual(challenge.requires2FA, true);
assert.ok(challenge.expiresAt > now);

// Wrong code
const badCodeRes = governor.verifyPhoneLogin('+989123456789', '00000', undefined, now);
assert.strictEqual(badCodeRes.success, false);
assert.strictEqual(badCodeRes.error, 'Invalid verification code');

// Correct code but missing 2FA password
const missing2faRes = governor.verifyPhoneLogin('+989123456789', '12345', undefined, now);
assert.strictEqual(missing2faRes.success, false);
assert.strictEqual(missing2faRes.requires2FA, true);

// Correct code with valid 2FA password
const validLoginRes = governor.verifyPhoneLogin('+989123456789', '12345', 'secret_2fa_hash', now);
assert.strictEqual(validLoginRes.success, true);
assert.ok(validLoginRes.session);
assert.strictEqual(validLoginRes.session.userId, 'user_989123456789');
assert.strictEqual(validLoginRes.session.sessionType, 'user');
console.log('  ✅ Phone login & 2FA verification verified');

// 2. QR Code Login Flow & Error Recovery (Ajaxy #198, #51)
console.log('  Testing QR code login lifecycle & expiration...');
const qrNow = Date.now();
const qrSession = governor.initiateQrLogin(qrNow);
assert.ok(qrSession.token.startsWith('qr_token_'));
assert.ok(qrSession.qrPayloadUrl.startsWith('tg://login?token='));
assert.strictEqual(qrSession.status, 'pending');

// Check pending status
const check1 = governor.checkQrLogin(qrSession.token, qrNow + 1000);
assert.strictEqual(check1.status, 'pending');

// Check expired status past 2 minutes
const expiredCheck = governor.checkQrLogin(qrSession.token, qrNow + 130_000);
assert.strictEqual(expiredCheck.status, 'expired');

// New QR session, scan & confirm
const qrSession2 = governor.initiateQrLogin(qrNow);
governor.simulateQrScanAndConfirm(qrSession2.token, 'user_qr_scanned_99');
const confirmedCheck = governor.checkQrLogin(qrSession2.token, qrNow + 5000);
assert.strictEqual(confirmedCheck.status, 'confirmed');
assert.ok(confirmedCheck.session);
assert.strictEqual(confirmedCheck.session.userId, 'user_qr_scanned_99');
console.log('  ✅ QR code login flow and expiry verified');

// 3. Bot Token Authentication (morethanwords #135)
console.log('  Testing bot token authentication...');
// Invalid format
const badBotRes = governor.authenticateWithBotToken('invalid_token_string');
assert.strictEqual(badBotRes.success, false);

// Valid format: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789
const validBotRes = governor.authenticateWithBotToken('123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789');
assert.strictEqual(validBotRes.success, true);
assert.ok(validBotRes.session);
assert.strictEqual(validBotRes.session.userId, 'bot_123456789');
assert.strictEqual(validBotRes.session.sessionType, 'bot');
console.log('  ✅ Bot token authentication verified');

// 4. Multi-Instance Profile Isolation (TDesktop #533)
console.log('  Testing multi-instance profile isolation...');
governor.setProfileId('work_profile');
const workSession = governor.createSession('user_work_1', 'user');
governor.setProfileId('personal_profile');
const personalSession = governor.createSession('user_personal_1', 'user');

const workList = governor.getActiveSessions('work_profile');
const personalList = governor.getActiveSessions('personal_profile');
assert.strictEqual(workList.length, 1);
assert.strictEqual(workList[0].userId, 'user_work_1');
assert.strictEqual(personalList.length, 1);
assert.strictEqual(personalList[0].userId, 'user_personal_1');
console.log('  ✅ Multi-instance profile isolation verified');

// 5. Session Revocation & Terminate Other Sessions (morethanwords #345, #192)
console.log('  Testing session revocation & terminate others...');
governor.setProfileId('multi_device');
const s1 = governor.createSession('user_multi', 'user');
const s2 = governor.createSession('user_multi', 'user');
const s3 = governor.createSession('user_multi', 'user');

// Terminate other sessions keeping s3
const termRes = governor.terminateOtherSessions(s3.sessionId);
assert.strictEqual(termRes.terminatedCount, 2);

const remaining = governor.getActiveSessions('multi_device');
assert.strictEqual(remaining.length, 1);
assert.strictEqual(remaining[0].sessionId, s3.sessionId);
console.log('  ✅ Session revocation & terminate others verified');

// 6. Explicit Logout with Cache Wipe (morethanwords #345)
console.log('  Testing explicit logout with cache wipe...');
const logoutRes = governor.logout(s3.sessionId, true);
assert.strictEqual(logoutRes.success, true);
assert.strictEqual(logoutRes.wipedCache, true);
assert.strictEqual(governor.getActiveSessions('multi_device').length, 0);
console.log('  ✅ Explicit logout with cache wipe verified');

console.log('✨ All Phase 83 Verification Tests Passed 100% Successfully!');
