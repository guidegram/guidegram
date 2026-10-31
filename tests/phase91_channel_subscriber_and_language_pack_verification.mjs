import assert from 'node:assert';
import { ChannelSubscriberAndLanguagePackGovernor } from '../src/services/channelSubscriberAndLanguagePackGovernor.ts';

console.log('🧪 Starting Phase 91 Channel Subscriber & Language Pack Verification Suite...');

const governor = new ChannelSubscriberAndLanguagePackGovernor();

// 1. Batch Subscriber Removal (TDesktop #31400)
console.log('  Testing batch subscriber removal in channel...');
governor.addSubscribers('-100999', ['user_1', 'user_2', 'user_3', 'user_4', 'user_5']);
assert.strictEqual(governor.getSubscribers('-100999').length, 5);

const purgeRes = governor.batchRemoveSubscribers('-100999', ['user_2', 'user_4']);
assert.strictEqual(purgeRes.removedCount, 2);
assert.strictEqual(purgeRes.remainingCount, 3);
assert.deepStrictEqual(governor.getSubscribers('-100999'), ['user_1', 'user_3', 'user_5']);
console.log('  ✅ Batch subscriber removal verified');

// 2. Channel Invite Link Creation & Deep Link Parsing (Kotatogram #427, #220)
console.log('  Testing channel invite link generation and deep link parsing...');
const link = governor.createInviteLink('-100999', 'admin_ali', { usageLimit: 50 });
assert.ok(link.inviteLink.startsWith('https://t.me/+'));
assert.strictEqual(link.usageLimit, 50);

const parsePlus = governor.parseInviteLink('https://t.me/+abc123XYZ');
assert.strictEqual(parsePlus.valid, true);
assert.strictEqual(parsePlus.hash, 'abc123XYZ');

const parseTg = governor.parseInviteLink('tg://join?invite=my_private_group_hash');
assert.strictEqual(parseTg.valid, true);
assert.strictEqual(parseTg.hash, 'my_private_group_hash');
console.log('  ✅ Channel invite link generation & parsing verified');

// 3. Chat Snooze / Temporary Mute (Kotatogram #407)
console.log('  Testing chat snooze / temporary mute with auto-unmute...');
const now = 1_000_000;
const snooze = governor.snoozeChat('chat_noisy', 60, now); // 60 minutes
assert.strictEqual(snooze.snoozeUntil, now + 60 * 60_000);
assert.strictEqual(governor.isChatSnoozed('chat_noisy', now + 10_000), true);
assert.strictEqual(governor.isChatSnoozed('chat_noisy', now + 3600_001), false);
console.log('  ✅ Chat snooze verified');

// 4. Per-Chat Link Preview Overrides (Kotatogram #283)
console.log('  Testing per-chat link preview override...');
// Default inherits global
assert.strictEqual(governor.shouldShowLinkPreview('chat_a', true), true);
assert.strictEqual(governor.shouldShowLinkPreview('chat_a', false), false);

// Specific override disabled
governor.setLinkPreviewOverride('chat_a', 'disabled');
assert.strictEqual(governor.shouldShowLinkPreview('chat_a', true), false);

// Specific override enabled
governor.setLinkPreviewOverride('chat_b', 'enabled');
assert.strictEqual(governor.shouldShowLinkPreview('chat_b', false), true);
console.log('  ✅ Per-chat link preview override verified');

// 5. Quick Forward to Saved Messages (TDesktop #69)
console.log('  Testing forward to saved messages...');
const fwd = governor.forwardToSavedMessages({ id: 'msg_987', text: 'Important announcement' }, 'my_user_id');
assert.strictEqual(fwd.success, true);
assert.strictEqual(fwd.savedChatId, 'saved_my_user_id');
assert.ok(fwd.forwardedId.startsWith('fwd_msg_987_'));
console.log('  ✅ Forward to saved messages verified');

// 6. Language Pack Link Parsing & Installation (morethanwords #221, Ajaxy #243)
console.log('  Testing language pack link parsing and installation...');
const packLink = governor.parseLanguagePackLink('tg://setlanguage?lang=persian-experimental');
assert.strictEqual(packLink.valid, true);
assert.strictEqual(packLink.langCode, 'persian-experimental');

const installRes = governor.installLanguagePack('persian-experimental', 'Persian Experimental', {
  'Chat.Send': 'ارسال',
  'Chat.Placeholder': 'پیام بنویسید...'
});
assert.strictEqual(installRes.success, true);
const activePack = governor.getActiveLanguagePack();
assert.ok(activePack);
assert.strictEqual(activePack.translations['Chat.Send'], 'ارسال');
console.log('  ✅ Language pack link parsing and installation verified');

// 7. Long Channel Header Title Truncation (morethanwords #282)
console.log('  Testing channel title truncation with tooltip...');
const shortHeader = governor.formatChannelHeaderTitle('Guidegram News', 25);
assert.strictEqual(shortHeader.isTruncated, false);
assert.strictEqual(shortHeader.displayTitle, 'Guidegram News');

const longTitle = 'Guidegram Official Worldwide Technology & Innovation Community';
const truncatedHeader = governor.formatChannelHeaderTitle(longTitle, 20);
assert.strictEqual(truncatedHeader.isTruncated, true);
assert.ok(truncatedHeader.displayTitle.endsWith('…'));
assert.strictEqual(truncatedHeader.fullTitle, longTitle);
console.log('  ✅ Channel title truncation verified');

console.log('✨ All Phase 91 Verification Tests Passed 100% Successfully!');
