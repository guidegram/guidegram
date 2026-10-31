import assert from 'node:assert/strict';
import { NetworkResilienceAndTransportGovernor } from '../src/services/networkResilienceAndTransportGovernor.ts';

console.log('🧪 Starting Phase 59 Network Resilience & Transport Fallback Verification Suite...');

const governor = new NetworkResilienceAndTransportGovernor();

// 1. WebSocket to HTTPS Long-Poll Fallback (morethanwords/tweb #59)
console.log('  Testing dynamic transport fallback...');
assert.equal(governor.getActiveTransport(), 'websocket');

// First failure: remains on websocket
const f1 = governor.recordTransportFailure('websocket');
assert.equal(f1.fallbackTriggered, false);
assert.equal(governor.getActiveTransport(), 'websocket');

// Second failure: triggers fallback to https_longpoll
const f2 = governor.recordTransportFailure('websocket');
assert.equal(f2.fallbackTriggered, true);
assert.equal(f2.newTransport, 'https_longpoll');
assert.equal(governor.getActiveTransport(), 'https_longpoll');

// Recovery
governor.recordTransportSuccess('websocket');
governor.setForcedTransport('websocket');
assert.equal(governor.getActiveTransport(), 'websocket');
console.log('  ✅ Dynamic transport fallback verified');

// 2. System Proxy Bypass Rules (kotatogram/kotatogram-desktop #390)
console.log('  Testing system proxy bypass rules...');
assert.equal(governor.shouldBypassProxy('localhost'), true);
assert.equal(governor.shouldBypassProxy('127.0.0.1'), true);
assert.equal(governor.shouldBypassProxy('my-server.local'), true);
assert.equal(governor.shouldBypassProxy('api.telegram.org'), false);
assert.equal(governor.shouldBypassProxy('149.154.167.50'), false);
console.log('  ✅ System proxy bypass rules verified');

// 3. Proxy Configuration & Validation (UnigramDev/Unigram #1224)
console.log('  Testing proxy configuration validation...');
const invalidPort = governor.configureProxy({
  type: 'socks5',
  host: '10.0.0.5',
  port: 99999,
});
assert.equal(invalidPort.isValid, false);

const validSocks = governor.configureProxy({
  type: 'socks5',
  host: '10.0.0.5',
  port: 1080,
  username: 'user1',
  password: 'pwd',
});
assert.equal(validSocks.isValid, true);
assert.equal(governor.getActiveProxy().type, 'socks5');
console.log('  ✅ Proxy configuration validation verified');

// 4. MTProto Fake-TLS SNI Validation (TelegramMessenger/Telegram-iOS #1912)
console.log('  Testing MTProto Fake TLS SNI verification...');
// Secret starting with 'ee' + 32-hex key + hex-encoded 'www.cloudflare.com'
const domainHex = Buffer.from('www.cloudflare.com', 'utf8').toString('hex');
const fakeTlsSecret = 'ee0123456789abcdef0123456789abcdef' + domainHex;

const tlsResult = governor.validateFakeTlsSni(fakeTlsSecret);
assert.equal(tlsResult.hasFakeTls, true);
assert.equal(tlsResult.sniDomain, 'www.cloudflare.com');

const regularSecret = '0123456789abcdef0123456789abcdef';
const regularResult = governor.validateFakeTlsSni(regularSecret);
assert.equal(regularResult.hasFakeTls, false);
console.log('  ✅ MTProto Fake TLS SNI verification verified');

// 5. Happy Eyeballs Dual-Stack Race (morethanwords/tweb #158)
console.log('  Testing Happy Eyeballs dual-stack racing...');
// IPv6 is slightly slower (150ms vs 100ms), but within 250ms headstart -> IPv6 chosen
const race1 = governor.simulateHappyEyeballsRace(150, 100);
assert.equal(race1.selectedFamily, 'ipv6');
assert.equal(race1.fallbackTriggered, false);

// IPv6 is severely delayed or dead (800ms vs 50ms) -> IPv4 fallback chosen
const race2 = governor.simulateHappyEyeballsRace(800, 50);
assert.equal(race2.selectedFamily, 'ipv4');
assert.equal(race2.fallbackTriggered, true);
console.log('  ✅ Happy Eyeballs dual-stack racing verified');

// 6. 504 Gateway Timeout Backoff & Alternate DC (tdlib/td #3670)
console.log('  Testing 504 Gateway Timeout backoff & alternate DC...');
const b1 = governor.evaluateGatewayTimeoutBackoff(0, 504, 2);
assert.equal(b1.shouldRetry, true);
assert.ok(b1.delayMs >= 500);

// Later attempt triggers suggestion for alternate DC
const b3 = governor.evaluateGatewayTimeoutBackoff(2, 504, 2);
assert.equal(b3.shouldRetry, true);
assert.equal(b3.suggestAlternateDc, true);
assert.equal(b3.alternateDcId, 4);

// Non-50x error should not trigger retry
const b200 = governor.evaluateGatewayTimeoutBackoff(0, 200, 2);
assert.equal(b200.shouldRetry, false);
console.log('  ✅ 504 Gateway Timeout backoff & alternate DC verified');

console.log('✨ All Phase 59 Verification Tests Passed 100% Successfully!');
