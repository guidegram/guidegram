import assert from 'node:assert';
import { DeepLinkAndProtocolGovernor } from '../src/services/deepLinkAndProtocolGovernor.ts';

console.log('🧪 Starting Phase 73 Deep-Link & Protocol Routing Verification Suite...');

const governor = new DeepLinkAndProtocolGovernor();

// 1. Test Bot Start Link Parsing (Telegram-iOS #1100)
console.log('  Testing bot start link parameter parsing...');
const botStart1 = governor.parseLink('https://t.me/guidegram_bot?start=affiliate_campaign_99');
assert.strictEqual(botStart1.type, 'bot_start');
assert.strictEqual(botStart1.target, 'guidegram_bot');
assert.strictEqual(botStart1.startParam, 'affiliate_campaign_99');

const botStartRoute = governor.routeLink('tg://resolve?domain=guidegram_bot&start=winter2026');
assert.strictEqual(botStartRoute.action, 'send_bot_start');
assert.strictEqual(botStartRoute.payload.startPayload, 'winter2026');
assert.strictEqual(botStartRoute.openExternal, false);
console.log('  ✅ Bot start link parsing verified');

// 2. Test Bot StartGroup Link Parsing (Telegram-iOS #843)
console.log('  Testing bot startgroup parameter retention...');
const botGroup = governor.parseLink('https://t.me/moderator_bot?startgroup=admin_setup_token');
assert.strictEqual(botGroup.type, 'bot_startgroup');
assert.strictEqual(botGroup.target, 'moderator_bot');
assert.strictEqual(botGroup.startGroupParam, 'admin_setup_token');

const groupRoute = governor.routeLink('https://t.me/moderator_bot?startgroup=admin_setup_token');
assert.strictEqual(groupRoute.action, 'send_bot_start');
assert.strictEqual(groupRoute.payload.isGroup, true);
assert.strictEqual(groupRoute.payload.startGroupPayload, 'admin_setup_token');
console.log('  ✅ Bot startgroup parameter retention verified');

// 3. Test Prefilled Text Parameter on User Links (Telegram-iOS #2354)
console.log('  Testing prefilled text retention on user links...');
const userText = governor.parseLink('https://t.me/dr_ershad?text=Hello%20Dr%20Zolfi');
assert.strictEqual(userText.type, 'resolve_user');
assert.strictEqual(userText.target, 'dr_ershad');
assert.strictEqual(userText.text, 'Hello Dr Zolfi');
console.log('  ✅ Prefilled text parameter retention verified');

// 4. Test Private and Public Channel Post Links
console.log('  Testing private & public channel message link parsing...');
const privatePost = governor.parseLink('https://t.me/c/123456789/555');
assert.strictEqual(privatePost.type, 'chat_message');
assert.strictEqual(privatePost.chatId, '-100123456789');
assert.strictEqual(privatePost.messageId, 555);

const publicPost = governor.parseLink('https://t.me/guidegram_news/88');
assert.strictEqual(publicPost.type, 'chat_message');
assert.strictEqual(publicPost.target, 'guidegram_news');
assert.strictEqual(publicPost.messageId, 88);
console.log('  ✅ Channel message link parsing verified');

// 5. Test Invite Join Chat Links (morethanwords #93)
console.log('  Testing invite joinchat links...');
const join1 = governor.parseLink('https://t.me/joinchat/AbCdEf12345');
assert.strictEqual(join1.type, 'join_chat');
assert.strictEqual(join1.target, 'AbCdEf12345');

const join2 = governor.parseLink('https://t.me/+PlusInviteCode99');
assert.strictEqual(join2.type, 'join_chat');
assert.strictEqual(join2.target, 'PlusInviteCode99');
console.log('  ✅ Invite joinchat links verified');

// 6. Test Proxy and Share URLs
console.log('  Testing proxy and share URLs...');
const proxyLink = governor.parseLink('tg://proxy?server=192.168.1.1&port=1080&secret=dd001122');
assert.strictEqual(proxyLink.type, 'proxy');
assert.strictEqual(proxyLink.proxyConfig?.server, '192.168.1.1');
assert.strictEqual(proxyLink.proxyConfig?.port, 1080);
assert.strictEqual(proxyLink.proxyConfig?.secret, 'dd001122');

const shareLink = governor.parseLink('https://t.me/share/url?url=https%3A%2F%2Fguidegram.org&text=Great%20app');
assert.strictEqual(shareLink.type, 'share');
assert.strictEqual(shareLink.url, 'https://guidegram.org');
assert.strictEqual(shareLink.text, 'Great app');
console.log('  ✅ Proxy and share links verified');

// 7. Test Instant View Caching & Image Aspect Ratio (Unigram #2903 & tdlib #377)
console.log('  Testing Instant View caching & image aspect ratio normalization...');
const storedIv = governor.storeInstantViewCache(
  'https://blog.guidegram.org/release-v2',
  'rhash_abc123',
  '<html><body><h1>Guidegram 2.0 Released</h1></body></html>',
  [
    { src: 'https://cdn.guidegram.org/banner.jpg', width: 1200, height: 630 },
    { src: 'https://cdn.guidegram.org/square.jpg', width: 400, height: 400 }
  ]
);

assert.strictEqual(storedIv.images.length, 2);
assert.ok(Math.abs(storedIv.images[0].aspectRatio - (1200 / 630)) < 0.01);
assert.strictEqual(storedIv.images[1].aspectRatio, 1.0);

// Retrieval test
const retrieved = governor.getInstantView('https://blog.guidegram.org/release-v2', 'rhash_abc123');
assert.ok(retrieved !== null);
assert.strictEqual(retrieved?.html, '<html><body><h1>Guidegram 2.0 Released</h1></body></html>');

// Missing returns null instead of throwing
const missing = governor.getInstantView('https://unknown.com', 'invalid_rhash');
assert.strictEqual(missing, null);
console.log('  ✅ Instant View caching and image aspect ratio verified');

// 8. Test In-App vs External Browser Routing (morethanwords #257 & kotatogram #423)
console.log('  Testing in-app vs external browser routing decision...');
const external = governor.routeLink('https://github.com/TelegramMessenger');
assert.strictEqual(external.action, 'open_external');
assert.strictEqual(external.openExternal, true);

const internal = governor.routeLink('https://t.me/dr_ershad');
assert.strictEqual(internal.action, 'open_chat');
assert.strictEqual(internal.openExternal, false);
console.log('  ✅ In-app vs external browser routing verified');

console.log('✨ All Phase 73 Verification Tests Passed 100% Successfully!');
