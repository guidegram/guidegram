import assert from 'node:assert';
import { ChannelAdminAndPermissionsGovernor } from '../src/services/channelAdminAndPermissionsGovernor.ts';

console.log('🧪 Starting Phase 82 Channel Admin Rights & Permissions Verification Suite...');

const governor = new ChannelAdminAndPermissionsGovernor();

// 1. Test Ownership Transfer with 2FA password (Ajaxy #501)
console.log('  Testing ownership transfer with 2FA verification...');
governor.registerOwner('-100123456', 'owner_arash');

// Transfer attempt with invalid password should fail
const failTransfer = governor.transferOwnership('-100123456', 'owner_arash', 'user_sara', 'short');
assert.strictEqual(failTransfer.success, false);
assert.strictEqual(governor.getOwner('-100123456'), 'owner_arash');

// Valid transfer
const validTransfer = governor.transferOwnership('-100123456', 'owner_arash', 'user_sara', 'secure_2fa_hash_2026');
assert.strictEqual(validTransfer.success, true);
assert.strictEqual(validTransfer.newOwnerId, 'user_sara');
assert.strictEqual(governor.getOwner('-100123456'), 'user_sara');
console.log('  ✅ Ownership transfer with 2FA verified');

// 2. Test Anonymous Admin Identity Resolution (TDesktop #210)
console.log('  Testing anonymous admin identity resolution...');
const anonIdentity = governor.resolveSenderIdentity('-100123456', 'admin_ali', true, 'Guidegram Official');
assert.strictEqual(anonIdentity.senderId, '-100123456');
assert.strictEqual(anonIdentity.senderTitle, 'Guidegram Official');
assert.strictEqual(anonIdentity.isChannelIdentity, true);

const namedIdentity = governor.resolveSenderIdentity('-100123456', 'admin_ali', false, 'Guidegram Official');
assert.strictEqual(namedIdentity.senderId, 'admin_ali');
assert.strictEqual(namedIdentity.isChannelIdentity, false);
console.log('  ✅ Anonymous admin identity resolution verified');

// 3. Test Batch Join Requests Moderation (TDesktop #239)
console.log('  Testing batch join requests moderation...');
governor.addJoinRequest('-100123456', { userId: 'req_1', userName: 'User 1', date: 1000 });
governor.addJoinRequest('-100123456', { userId: 'req_2', userName: 'User 2', date: 2000 });
governor.addJoinRequest('-100123456', { userId: 'req_3', userName: 'User 3', date: 3000 });

const banAllResult = governor.batchModerateJoinRequests('-100123456', 'ban_all');
assert.strictEqual(banAllResult.affectedCount, 3);
assert.strictEqual(banAllResult.action, 'ban_all');
console.log('  ✅ Batch join requests moderation verified');

// 4. Test Content Restriction / noForwards (morethanwords #344)
console.log('  Testing content restriction / noForwards...');
assert.strictEqual(governor.checkContentRestriction('-100123456').canForward, true);
governor.setContentRestriction('-100123456', true);
const restricted = governor.checkContentRestriction('-100123456');
assert.strictEqual(restricted.canForward, false);
assert.strictEqual(restricted.canCopy, false);
assert.strictEqual(restricted.canSaveMedia, false);
console.log('  ✅ Content restriction / noForwards verified');

// 5. Test Message Deletion Permissions (AyuGram #359)
console.log('  Testing message deletion permissions...');
// Caller is author: always allowed
assert.strictEqual(governor.canDeleteMessage('-100123456', 'author_me', 'author_me'), true);

// Caller is not author and lacks permission
assert.strictEqual(governor.canDeleteMessage('-100123456', 'stranger', 'author_me'), false);

// Caller is admin with deleteMessages right
assert.strictEqual(
  governor.canDeleteMessage('-100123456', 'admin_user', 'author_me', {
    deleteMessages: true,
    changeInfo: false,
    postMessages: false,
    editMessages: false,
    banUsers: false,
    inviteUsers: false,
    pinMessages: false,
    addAdmins: false,
    anonymous: false,
    manageTopics: false
  }),
  true
);
console.log('  ✅ Message deletion permissions verified');

// 6. Test Chat Mute State and Display Icon (Unigram #376)
console.log('  Testing chat mute state & icon update...');
const now = Date.now();
const muteState = governor.setChatMute('chat_xyz', now + 3600000, now);
assert.strictEqual(muteState.isMuted, true);
assert.strictEqual(muteState.displayMuteIcon, true);
assert.strictEqual(governor.isChatMuted('chat_xyz', now), true);
assert.strictEqual(governor.isChatMuted('chat_xyz', now + 4000000, now + 4000000), false);
console.log('  ✅ Chat mute state & icon update verified');

// 7. Test Accessible Mute Presets (Unigram #2921)
console.log('  Testing accessible mute presets...');
const presets = governor.getAccessibleMutePresets();
assert.strictEqual(presets.length, 4);
assert.ok(presets.some(p => p.label === '8 hours' && p.accessibleAriaLabel.includes('8 hours')));
assert.ok(presets.some(p => p.label === 'Forever'));
console.log('  ✅ Accessible mute presets verified');

console.log('✨ All Phase 82 Verification Tests Passed 100% Successfully!');
