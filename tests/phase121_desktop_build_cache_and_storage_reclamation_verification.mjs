import assert from 'node:assert';
import {
  DeterministicBuildCacheGovernor,
  ArtifactPackagingRetentionGovernor,
  ConversationThreadLockGovernor,
  GitRepositoryIntegrityGovernor,
  MultiPlatformArtifactSigningManager,
  StaleActivityWatchdogGovernor,
  DiskStorageReclamationGovernor,
  DesktopBuildCacheAndStorageReclamationGovernor
} from '../src/services/desktopBuildCacheAndStorageReclamationGovernor.ts';

console.log('--- STARTING PHASE 121 VERIFICATION TEST SUITE ---');

// 1. DeterministicBuildCacheGovernor tests (TDesktop-x64/tdesktop#243)
console.log('Test 1: DeterministicBuildCacheGovernor cache keys and LRU eviction');
const cacheGov = new DeterministicBuildCacheGovernor(1); // 1MB max cache
const key1 = cacheGov.computeDeterministicKey('linux-x64', ['hashA', 'hashB']);
const key2 = cacheGov.computeDeterministicKey('linux-x64', ['hashB', 'hashA']);
assert.strictEqual(key1, key2, 'Deterministic cache keys must be order-invariant');

cacheGov.put('key_alpha', 'sha256_aaa', 600 * 1024); // 600KB
assert.strictEqual(cacheGov.get('key_alpha')?.hash, 'sha256_aaa');

cacheGov.put('key_beta', 'sha256_bbb', 600 * 1024); // 600KB -> total 1200KB > 1024KB -> evicts key_alpha
assert.strictEqual(cacheGov.get('key_alpha'), undefined, 'Oldest entry should be evicted');
assert.strictEqual(cacheGov.get('key_beta')?.hash, 'sha256_bbb');

// 2. ArtifactPackagingRetentionGovernor tests (TDesktop-x64/tdesktop#245)
console.log('Test 2: ArtifactPackagingRetentionGovernor artifact packaging retention');
const retentionGov = new ArtifactPackagingRetentionGovernor();

const releasePol = retentionGov.computeRetentionPolicy('release_binary');
assert.strictEqual(releasePol.retentionDays, 365);
assert.strictEqual(releasePol.storeLongTerm, true);

const nightlyPol = retentionGov.computeRetentionPolicy('nightly_build');
assert.strictEqual(nightlyPol.retentionDays, 14);
assert.strictEqual(nightlyPol.storeLongTerm, false);

// 3. ConversationThreadLockGovernor tests (TDesktop-x64/tdesktop#244)
console.log('Test 3: ConversationThreadLockGovernor thread concurrency locking');
const lockGov = new ConversationThreadLockGovernor();
assert.strictEqual(lockGov.isThreadLocked('topic_10'), false);
assert.strictEqual(lockGov.canPostMessage('topic_10', false), true);

lockGov.lockThread('topic_10');
assert.strictEqual(lockGov.isThreadLocked('topic_10'), true);
// Regular user blocked, moderator allowed
assert.strictEqual(lockGov.canPostMessage('topic_10', false), false);
assert.strictEqual(lockGov.canPostMessage('topic_10', true), true);

lockGov.unlockThread('topic_10');
assert.strictEqual(lockGov.isThreadLocked('topic_10'), false);

// 4. GitRepositoryIntegrityGovernor tests (TDesktop-x64/tdesktop#241)
console.log('Test 4: GitRepositoryIntegrityGovernor submodule integrity');
const gitGov = new GitRepositoryIntegrityGovernor();

const goodSubmodules = [
  { name: 'lib_tgvoip', commitSha: '0123456789abcdef0123456789abcdef01234567', url: 'https://github.com/telegramdesktop/lib_tgvoip' }
];
assert.strictEqual(gitGov.validateSubmoduleIntegrity(goodSubmodules).isValid, true);

const badSubmodules = [
  { name: 'lib_crl', commitSha: 'HEAD', url: 'https://github.com/telegramdesktop/crl' }
];
const badCheck = gitGov.validateSubmoduleIntegrity(badSubmodules);
assert.strictEqual(badCheck.isValid, false);
assert.deepStrictEqual(badCheck.unpinnedSubmodules, ['lib_crl']);

// 5. MultiPlatformArtifactSigningManager tests (TDesktop-x64/tdesktop#230)
console.log('Test 5: MultiPlatformArtifactSigningManager artifact signing');
const signMgr = new MultiPlatformArtifactSigningManager();

const winSigned = signMgr.verifySignature('guidegram-setup.exe', 'a'.repeat(64), 'CERT_THUMBPRINT');
assert.strictEqual(winSigned.verified, true);
assert.strictEqual(winSigned.platform, 'windows');
assert.strictEqual(winSigned.securityTier, 'enterprise_signed');

const macUnsigned = signMgr.verifySignature('guidegram.dmg', '', '');
assert.strictEqual(macUnsigned.verified, false);
assert.strictEqual(macUnsigned.platform, 'macos');
assert.strictEqual(macUnsigned.securityTier, 'unsigned_untrusted');

// 6. StaleActivityWatchdogGovernor tests (TDesktop-x64/tdesktop#226)
console.log('Test 6: StaleActivityWatchdogGovernor triage policy');
const staleGov = new StaleActivityWatchdogGovernor();

// Active item: 10 days ago
const activeItem = staleGov.evaluateStaleItem(new Date(Date.now() - 10 * 86400 * 1000), 60);
assert.strictEqual(activeItem.isStale, false);
assert.strictEqual(activeItem.actionRequired, 'keep_active');

// Stale item: 65 days ago
const staleItem = staleGov.evaluateStaleItem(new Date(Date.now() - 65 * 86400 * 1000), 60);
assert.strictEqual(staleItem.isStale, true);
assert.strictEqual(staleItem.actionRequired, 'mark_stale');

// Expired stale item: 80 days ago
const expiredItem = staleGov.evaluateStaleItem(new Date(Date.now() - 80 * 86400 * 1000), 60);
assert.strictEqual(expiredItem.isStale, true);
assert.strictEqual(expiredItem.actionRequired, 'close_stale');

// 7. DiskStorageReclamationGovernor tests (TDesktop-x64/tdesktop#225)
console.log('Test 7: DiskStorageReclamationGovernor disk space reclamation');
const reclaimGov = new DiskStorageReclamationGovernor();

const tempDirs = [
  { path: '/tmp/build_cache_1', byteSize: 200 * 1024 * 1024, isLocked: false },
  { path: '/tmp/active_process_lock', byteSize: 50 * 1024 * 1024, isLocked: true },
  { path: '/tmp/old_symbols', byteSize: 300 * 1024 * 1024, isLocked: false }
];

const reclaimResult = reclaimGov.reclaimStorage(tempDirs);
assert.strictEqual(reclaimResult.reclaimedBytes, 500 * 1024 * 1024);
assert.deepStrictEqual(reclaimResult.skippedDirs, ['/tmp/active_process_lock']);
assert.deepStrictEqual(reclaimResult.cleanedDirs, ['/tmp/build_cache_1', '/tmp/old_symbols']);

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopBuildCacheAndStorageReclamationGovernor();
assert(masterGov.buildCache instanceof DeterministicBuildCacheGovernor);
assert(masterGov.retention instanceof ArtifactPackagingRetentionGovernor);
assert(masterGov.threadLock instanceof ConversationThreadLockGovernor);
assert(masterGov.gitIntegrity instanceof GitRepositoryIntegrityGovernor);
assert(masterGov.artifactSigning instanceof MultiPlatformArtifactSigningManager);
assert(masterGov.staleWatchdog instanceof StaleActivityWatchdogGovernor);
assert(masterGov.storageReclamation instanceof DiskStorageReclamationGovernor);

console.log('--- ALL PHASE 121 VERIFICATION TESTS PASSED (100%) ---');
