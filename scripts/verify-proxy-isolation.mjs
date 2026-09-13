import assert from 'node:assert';
import net from 'node:net';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

console.log('====================================================');
console.log('Running Day 4 Dedicated Proxy Isolation Verification');
console.log('====================================================\n');

const tsSource = fs.readFileSync('electron/telegram/proxyManager.ts', 'utf8');
const jsSource = ts.transpileModule(tsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  require: (mod) => {
    if (mod === 'net') return { default: net, ...net };
    if (mod === '@mtcute/node') {
      return {
        SocksProxyTcpTransport: class { constructor(opts) { this.opts = opts; this.type = 'socks5'; } },
        HttpProxyTcpTransport: class { constructor(opts) { this.opts = opts; this.type = 'http'; } },
        MtProxyTcpTransport: class { constructor(opts) { this.opts = opts; this.type = 'mtproto'; } }
      };
    }
    throw new Error(`Module ${mod} not mocked`);
  },
  console
};

vm.createContext(sandbox);
vm.runInContext(jsSource, sandbox);

const ProxyManager = sandbox.exports.ProxyManager || sandbox.module.exports.ProxyManager;
assert.ok(ProxyManager, 'ProxyManager must be exported');

console.log('[TEST 1] Testing SOCKS5, HTTP, and MTProto transport mappings:');
const socks5Proxy = { id: 'p1', name: 'SOCKS5 Proxy', type: 'socks5', host: '127.0.0.1', port: 1080, enabled: true };
const httpProxy = { id: 'p2', name: 'HTTP Proxy', type: 'http', host: '127.0.0.1', port: 8080, enabled: true };
const mtprotoProxy = { id: 'p3', name: 'MTProto Proxy', type: 'mtproto', host: '127.0.0.1', port: 443, secret: 'ee000000000000000000000000000000007777772e676f6f676c652e636f6d', enabled: true };
const disabledProxy = { ...socks5Proxy, enabled: false };

const tSocks = ProxyManager.toMtcuteTransport(socks5Proxy);
assert.strictEqual(tSocks.type, 'socks5');
assert.strictEqual(tSocks.opts.host, '127.0.0.1');
assert.strictEqual(tSocks.opts.port, 1080);
console.log('  - SOCKS5 transport verified.');

const tHttp = ProxyManager.toMtcuteTransport(httpProxy);
assert.strictEqual(tHttp.type, 'http');
assert.strictEqual(tHttp.opts.port, 8080);
console.log('  - HTTP transport verified.');

const tMtproto = ProxyManager.toMtcuteTransport(mtprotoProxy);
assert.strictEqual(tMtproto.type, 'mtproto');
assert.strictEqual(tMtproto.opts.secret, mtprotoProxy.secret);
console.log('  - MTProto transport verified.');

const tDisabled = ProxyManager.toMtcuteTransport(disabledProxy);
assert.strictEqual(tDisabled, undefined, 'Disabled proxy must return undefined transport');
console.log('  - Disabled proxy safely ignored (fallback to host network).\n');

console.log('[TEST 2] Testing TCP Ping latency tester with mock loopback:');
const server = net.createServer((socket) => {
  socket.on('data', () => {});
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const localPort = server.address().port;

const activeProxy = { id: 'local', name: 'Local Mock', type: 'socks5', host: '127.0.0.1', port: localPort, enabled: true };
const latency = await ProxyManager.testProxyPing(activeProxy);
console.log(`  - Local socket ping latency: ${latency}ms`);
assert.ok(latency >= 0 && latency < 500, 'Latency must be valid positive integer');

const unreachableProxy = { id: 'dead', name: 'Dead', type: 'socks5', host: '127.0.0.1', port: 59999, enabled: true };
const deadLatency = await ProxyManager.testProxyPing(unreachableProxy);
console.log(`  - Unreachable socket latency return: ${deadLatency}`);
assert.strictEqual(deadLatency, -1, 'Unreachable socket must return -1');

await new Promise((resolve) => server.close(resolve));
console.log('  [PASS] Ping and socket failure handling verified.\n');

console.log('====================================================');
console.log('ALL PROXY ISOLATION CHECKS PASSED (Day 4 Complete)');
console.log('====================================================');

