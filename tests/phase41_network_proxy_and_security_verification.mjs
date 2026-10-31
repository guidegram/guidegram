import assert from 'node:assert/strict';
import { NetworkProxyAndSecurityGovernor } from '../src/services/networkProxyAndSecurityGovernor.ts';

console.log('🧪 Starting Phase 41 Network Proxy & Security Verification Suite...');

// 1. HTTP CONNECT Tunneling & Proxy-Auth Formatting (tdesktop #4577, #17409)
{
  console.log('  Testing HTTP CONNECT proxy handshake formatting...');
  const proxyConfig = {
    host: 'proxy.internal',
    port: 8080,
    username: 'admin',
    password: 'secretPassword123',
    useTls: true
  };

  const payload = NetworkProxyAndSecurityGovernor.formatProxyConnectPayload('149.154.167.50', 443, proxyConfig);
  assert.strictEqual(payload.isAuthRequired, true);
  assert.ok(payload.connectHeaderString.startsWith('CONNECT 149.154.167.50:443 HTTP/1.1'));
  assert.ok(payload.connectHeaderString.includes('Proxy-Authorization: Basic'));

  // Parse HTTP 200 response
  const okResp = NetworkProxyAndSecurityGovernor.parseProxyConnectResponse('HTTP/1.1 200 Connection established');
  assert.strictEqual(okResp.success, true);
  assert.strictEqual(okResp.statusCode, 200);

  // Parse HTTP 407 response
  const authResp = NetworkProxyAndSecurityGovernor.parseProxyConnectResponse('HTTP/1.1 407 Proxy Authentication Required');
  assert.strictEqual(authResp.success, false);
  assert.strictEqual(authResp.statusCode, 407);
  console.log('  ✅ HTTP CONNECT proxy handling passed');
}

// 2. Telegram Deep-Link Parsing (tdesktop #16478)
{
  console.log('  Testing tg:// and https://t.me/ deep link parsing on Linux/KDE...');
  // tg://resolve?domain=guidegram&post=42
  const target1 = NetworkProxyAndSecurityGovernor.parseDeepLink('tg://resolve?domain=guidegram&post=42');
  assert.strictEqual(target1.type, 'resolve');
  assert.strictEqual(target1.domain, 'guidegram');
  assert.strictEqual(target1.postId, 42);

  // https://t.me/durov/100
  const target2 = NetworkProxyAndSecurityGovernor.parseDeepLink('https://t.me/durov/100');
  assert.strictEqual(target2.type, 'resolve');
  assert.strictEqual(target2.domain, 'durov');
  assert.strictEqual(target2.postId, 100);

  // https://t.me/+AbCdEfGh123 (Invite link)
  const target3 = NetworkProxyAndSecurityGovernor.parseDeepLink('https://t.me/+AbCdEfGh123');
  assert.strictEqual(target3.type, 'join_chat');
  assert.strictEqual(target3.inviteHash, 'AbCdEfGh123');
  console.log('  ✅ Deep link parsing passed');
}

// 3. Cloned Session Token & Hardware Fingerprint Detection (tdesktop #31276)
{
  console.log('  Testing machine fingerprint & session clone detection...');
  const fp1 = NetworkProxyAndSecurityGovernor.computeDeviceFingerprint('mac_uuid_123', 'ershad');
  const fp2 = NetworkProxyAndSecurityGovernor.computeDeviceFingerprint('mac_uuid_456', 'ershad'); // Different machine

  assert.strictEqual(NetworkProxyAndSecurityGovernor.isSessionCloned(fp1, fp1), false);
  assert.strictEqual(NetworkProxyAndSecurityGovernor.isSessionCloned(fp1, fp2), true, 'Must detect cloned session on new hardware');
  console.log('  ✅ Session clone detection passed');
}

// 4. Group Chat Blocked User Filter (kotatogram #17)
{
  console.log('  Testing blocked user message filtering in group chats...');
  const blockedIds = new Set([555, 777]);
  const messages = [
    { id: 1, senderUserId: 100, text: 'Friendly message' },
    { id: 2, senderUserId: 555, text: 'Spam from blocked user' },
    { id: 3, senderUserId: 200, text: 'Another message' },
    { id: 4, senderUserId: 777, text: 'Troll from blocked user' }
  ];

  const filtered = NetworkProxyAndSecurityGovernor.filterBlockedMessages(messages, blockedIds);
  assert.strictEqual(filtered.visibleMessages.length, 2);
  assert.strictEqual(filtered.filteredCount, 2);
  assert.strictEqual(filtered.visibleMessages[0].id, 1);
  assert.strictEqual(filtered.visibleMessages[1].id, 3);
  console.log('  ✅ Blocked message filtering passed');
}

// 5. Message Bookmarks & Tag Indexing (kotatogram #161)
{
  console.log('  Testing message bookmarking & tag search...');
  NetworkProxyAndSecurityGovernor.addBookmark(1001, 50, 'Deploy Guidegram production', ['work', 'release']);
  NetworkProxyAndSecurityGovernor.addBookmark(1002, 50, 'Buy groceries', ['personal']);

  const workBookmarks = NetworkProxyAndSecurityGovernor.searchBookmarksByTag('work');
  assert.strictEqual(workBookmarks.length, 1);
  assert.strictEqual(workBookmarks[0].messageId, 1001);

  const releaseBookmarks = NetworkProxyAndSecurityGovernor.searchBookmarksByTag('#RELEASE');
  assert.strictEqual(releaseBookmarks.length, 1);
  console.log('  ✅ Message bookmarking passed');
}

console.log('\n🎉 ALL Phase 41 verification checks passed green!');
