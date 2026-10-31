import assert from 'node:assert';
import { StorageManagementAndCleanupGovernor } from '../src/services/storageManagementAndCleanupGovernor.ts';

console.log('🧪 Starting Phase 79 Storage Management & Cache Cleanup Verification Suite...');

const governor = new StorageManagementAndCleanupGovernor();

// 1. Test Category-specific cache tracking and clearing (Unigram #242)
console.log('  Testing category-specific cache tracking & clearing...');
governor.registerCachedFile({
  id: 'photo_1',
  category: 'photos',
  filePath: '/cache/photo_1.jpg',
  sizeBytes: 1000000, // 1MB
  lastAccessedAt: 1000,
  accountId: 'acc_1'
});

governor.registerCachedFile({
  id: 'video_1',
  category: 'videos',
  filePath: '/cache/video_1.mp4',
  sizeBytes: 5000000, // 5MB
  lastAccessedAt: 2000,
  accountId: 'acc_1'
});

governor.registerCachedFile({
  id: 'sticker_1',
  category: 'stickers',
  filePath: '/cache/stk_1.webp',
  sizeBytes: 50000, // 50KB
  lastAccessedAt: 3000,
  accountId: 'acc_1'
});

const usage1 = governor.getCacheUsage();
assert.strictEqual(usage1.photos, 1000000);
assert.strictEqual(usage1.videos, 5000000);
assert.strictEqual(usage1.stickers, 50000);
assert.strictEqual(usage1.totalBytes, 6050000);

// Clear only photos
const cleared = governor.clearCategoryCache('photos');
assert.strictEqual(cleared.freedBytes, 1000000);
assert.strictEqual(cleared.deletedCount, 1);
assert.strictEqual(governor.getCacheUsage().photos, 0);
assert.strictEqual(governor.getCacheUsage().totalBytes, 5050000);
console.log('  ✅ Category-specific cache tracking and clearing verified');

// 2. Test Quota-based Cache Pruning (LRU)
console.log('  Testing quota-based cache pruning...');
// Prune with a max threshold of 2MB (should delete video_1 of 5MB)
const pruned = governor.pruneCacheByQuota(2000000);
assert.strictEqual(pruned.freedBytes, 5000000);
assert.strictEqual(pruned.deletedCount, 1);
assert.strictEqual(governor.getCacheUsage().totalBytes, 50000); // only sticker_1 left
console.log('  ✅ Quota-based cache pruning verified');

// 3. Test TTL Auto-Cleanup
console.log('  Testing TTL auto-cleanup...');
governor.clearCategoryCache('stickers');
governor.registerCachedFile({
  id: 'old_file',
  category: 'files',
  filePath: '/cache/old.zip',
  sizeBytes: 200000,
  lastAccessedAt: 1000, // very old
  accountId: 'acc_1'
});

const now = 1000 + 10 * 24 * 3600 * 1000; // 10 days later (> 7 days TTL)
// Register a fresh file accessed right now
governor.registerCachedFile({
  id: 'fresh_file',
  category: 'files',
  filePath: '/cache/fresh.zip',
  sizeBytes: 150000,
  lastAccessedAt: now,
  accountId: 'acc_1'
});
const ttlPurge = governor.pruneExpiredCache(now);
assert.strictEqual(ttlPurge.deletedCount, 1);
assert.strictEqual(ttlPurge.freedBytes, 200000);
console.log('  ✅ TTL auto-cleanup verified');

// 4. Test Account Directory Protection (Telegram-iOS #2416)
console.log('  Testing active account directory protection...');
const existingDirs = [
  'C:/Users/app/data/account_acc_1',
  'C:/Users/app/data/account_acc_new',
  'C:/Users/app/data/account_deleted_old_99'
];
const activeAccounts = ['acc_1', 'acc_new'];

const cleanDirs = governor.cleanupUnusedAccountDirectories(existingDirs, activeAccounts);
assert.strictEqual(cleanDirs.preservedDirs.length, 2);
assert.ok(cleanDirs.preservedDirs.includes('C:/Users/app/data/account_acc_1'));
assert.ok(cleanDirs.preservedDirs.includes('C:/Users/app/data/account_acc_new'));
assert.strictEqual(cleanDirs.deletedDirs.length, 1);
assert.strictEqual(cleanDirs.deletedDirs[0], 'C:/Users/app/data/account_deleted_old_99');
console.log('  ✅ Account directory protection verified');

// 5. Test Custom Storage Path validation & permission fallback (Unigram #2164)
console.log('  Testing custom storage path validation...');
const failPath = governor.setCustomStoragePath('D:/ForbiddenPath', false);
assert.strictEqual(failPath.success, false);
assert.ok(failPath.error?.includes('Permission denied'));
assert.strictEqual(governor.getStoragePath(), 'default_app_data/storage');

const okPath = governor.setCustomStoragePath('D:/MyCustomStorage/Guidegram', true);
assert.strictEqual(okPath.success, true);
assert.strictEqual(governor.getStoragePath(), 'D:/MyCustomStorage/Guidegram');
console.log('  ✅ Custom storage path validation verified');

// 6. Test Safe Caches API Fallback (morethanwords #121)
console.log('  Testing safe caches API fallback...');
let fallbackCalled = false;
const result = await governor.safeCacheOperation(
  async () => { throw new ReferenceError('caches is not defined'); },
  async () => { fallbackCalled = true; return 'fallback_success'; }
);
assert.strictEqual(fallbackCalled, true);
assert.strictEqual(result, 'fallback_success');
console.log('  ✅ Safe caches API fallback verified');

// 7. Test Disk Headroom Check (tdesktop #17415)
console.log('  Testing disk safety headroom check...');
// 100MB free (less than 500MB headroom)
const lowDisk = governor.checkDiskHeadroom(100 * 1024 * 1024);
assert.strictEqual(lowDisk.canWrite, false);
assert.strictEqual(lowDisk.shouldEvictCache, true);

// 2GB free (well above headroom)
const normalDisk = governor.checkDiskHeadroom(2 * 1024 * 1024 * 1024);
assert.strictEqual(normalDisk.canWrite, true);
assert.strictEqual(normalDisk.shouldEvictCache, false);
console.log('  ✅ Disk safety headroom check verified');

console.log('✨ All Phase 79 Verification Tests Passed 100% Successfully!');
