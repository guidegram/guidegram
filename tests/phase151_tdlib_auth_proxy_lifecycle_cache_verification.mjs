import assert from 'node:assert/strict';
import { TdlibAuthStateProxyLifecycleAndCacheGovernor } from '../src/services/tdlibAuthStateProxyLifecycleAndCacheGovernor.ts';

console.log('🧪 Starting Phase 151: TDLib Auth States, Proxy Failover, Client Lifecycle, Anti-Ban & Warm Cache Tests...\n');

const governor = new TdlibAuthStateProxyLifecycleAndCacheGovernor();

// ============================================================================
// 1. tdlib/td#534 - Safe API Parameters & Anti-Ban Heuristics Validation
// ============================================================================
console.log('👉 Testing Case 1: Anti-Ban Heuristics Validation (tdlib/td#534)...');
// Incompatible combination (Desktop device claiming Android system)
const invalidCombo = {
  apiId: 2040,
  apiHash: '0123456789abcdef0123456789abcdef',
  deviceModel: 'PC 64bit Desktop',
  systemVersion: 'Android 14',
  appVersion: '2.5.0',
  systemLanguageCode: 'en',
  databaseDirectory: '/data',
  useFileDatabase: true,
  useChatInfoDatabase: true,
  useMessageDatabase: true,
};
const invalidCheck = governor.validateClientParameters(invalidCombo);
assert.equal(invalidCheck.isValid, false);
assert.ok(invalidCheck.errors[0].includes('anti-bot heuristics'));

// Genuine desktop combination
const validCombo = {
  ...invalidCombo,
  systemVersion: 'Windows 11 Pro 64bit',
};
const validCheck = governor.validateClientParameters(validCombo);
assert.equal(validCheck.isValid, true);
assert.equal(validCheck.errors.length, 0);
console.log('✅ Case 1 passed: Anti-ban parameter validator prevents suspicious bot signatures.\n');

// ============================================================================
// 2. tdlib/td#2878 - TDLib Client Lifecycle & Null Safety
// ============================================================================
console.log('👉 Testing Case 2: Client Lifecycle & Null Safety (tdlib/td#2878)...');
// Uninitialized client must throw clean error, not native crash
assert.throws(() => governor.assertClientReady(null), /_client != null/);

// Ready state assertion succeeds
governor.setLifecycleState('ready');
assert.doesNotThrow(() => governor.assertClientReady({ nativeHandle: 12345 }));
console.log('✅ Case 2 passed: Client readiness assertions prevent native null pointer crashes.\n');

// ============================================================================
// 3. tdlib/td#3260 - Dynamic Proxy Management & Automatic Failover
// ============================================================================
console.log('👉 Testing Case 3: Dynamic Proxy Management (tdlib/td#3260)...');
governor.addProxy({ id: 1, server: 'proxy1.fast.net', port: 1080, type: 'socks5' });
governor.addProxy({ id: 2, server: 'proxy2.backup.net', port: 443, type: 'mtproto' });

governor.enableProxy(1);
assert.equal(governor.getActiveProxy().id, 1);

// When proxy 1 fails, automatically switches to proxy 2
const failover1 = governor.handleProxyFailure(1);
assert.equal(failover1.action, 'switched_proxy');
assert.equal(failover1.nextProxyId, 2);
assert.equal(governor.getActiveProxy().id, 2);

// When proxy 2 fails, falls back to direct connection
const failover2 = governor.handleProxyFailure(2);
assert.equal(failover2.action, 'fallback_direct');
assert.equal(governor.getActiveProxy(), null);
console.log('✅ Case 3 passed: Proxy failover switches seamlessly without permanent connection loss.\n');

// ============================================================================
// 4. tdlib/td#3139 - Complete Authorization State Machine
// ============================================================================
console.log('👉 Testing Case 4: Auth State Machine Transitions (tdlib/td#3139)...');
assert.equal(governor.getAuthState(), 'authorizationStateWaitTdlibParameters');

governor.transitionAuthState('authorizationStateWaitPhoneNumber');
assert.equal(governor.getAuthState(), 'authorizationStateWaitPhoneNumber');

governor.transitionAuthState('authorizationStateWaitCode');
assert.equal(governor.getAuthState(), 'authorizationStateWaitCode');

governor.transitionAuthState('authorizationStateWaitPassword');
assert.equal(governor.getAuthState(), 'authorizationStateWaitPassword');

governor.transitionAuthState('authorizationStateReady');
assert.equal(governor.getAuthState(), 'authorizationStateReady');
assert.equal(governor.getLifecycleState(), 'ready');
console.log('✅ Case 4 passed: TDLib authorization states transition reliably.\n');

// ============================================================================
// 5. tdlib/td#1324 - Memory & Storage Limits Governor
// ============================================================================
console.log('👉 Testing Case 5: Memory & Storage Limits (tdlib/td#1324)...');
const lowRamConfig = governor.computeStorageAndMemoryConfig(true);
assert.equal(lowRamConfig.maxDatabaseSizeBytes, 50 * 1024 * 1024); // 50MB
assert.equal(lowRamConfig.chatHistoryInMemoryLimit, 50);

const highRamConfig = governor.computeStorageAndMemoryConfig(false);
assert.equal(highRamConfig.maxDatabaseSizeBytes, 500 * 1024 * 1024); // 500MB
assert.equal(highRamConfig.chatHistoryInMemoryLimit, 300);
console.log('✅ Case 5 passed: Low-RAM devices throttled to prevent heap exhaustion.\n');

// ============================================================================
// 6. tdlib/td#805 - Basicgroup-to-Supergroup History Boundary Stitching
// ============================================================================
console.log('👉 Testing Case 6: Migrated Group History Stitching (tdlib/td#805)...');
const basicHistory = [
  { id: 1, date: 100, text: 'Hello in basic group' },
  { id: 2, date: 200, text: 'Group migrated', isMigrationNotice: true },
];
const supergroupHistory = [
  { id: 101, date: 300, text: 'Hello in supergroup' },
];

const stitched = governor.stitchMigratedHistory(basicHistory, supergroupHistory, 1);
assert.equal(stitched.length, 2);
assert.equal(stitched[0].id, 1);
assert.equal(stitched[1].id, 101);
assert.equal(stitched.some((m) => m.isMigrationNotice), false); // Notice filtered out
console.log('✅ Case 6 passed: Basic group and supergroup histories stitched seamlessly.\n');

// ============================================================================
// 7. tdlib/td#707 - Warm Chat List Pre-indexing
// ============================================================================
console.log('👉 Testing Case 7: Warm Chat List Pre-indexing (tdlib/td#707)...');
governor.indexWarmChat({
  chatId: 101,
  title: 'Engineering Team',
  order: '9007199254740992', // Large BigInt order
  lastMessageSnippet: 'PR ready',
  unreadCount: 2,
});
governor.indexWarmChat({
  chatId: 102,
  title: 'Pinned Announcements',
  order: '9999999999999999', // Highest order
  lastMessageSnippet: 'All hands meeting',
  unreadCount: 0,
});

const warmList = governor.getWarmChatList(10);
assert.equal(warmList.length, 2);
assert.equal(warmList[0].chatId, 102); // Highest order first
assert.equal(warmList[1].chatId, 101);
console.log('✅ Case 7 passed: Warm chat list provides instant pre-indexed chats.\n');

console.log('🎉 ALL 7 PHASE 151 HARDENING TESTS PASSED WITH 100% SUCCESS!');
