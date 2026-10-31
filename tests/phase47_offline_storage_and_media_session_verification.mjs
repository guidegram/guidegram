import assert from 'node:assert/strict';
import { OfflineStorageAndMediaSessionGovernor } from '../src/services/offlineStorageAndMediaSessionGovernor.ts';

console.log('🧪 Starting Phase 47 Offline Storage, Media Session & Debounce Verification Suite...');

// 1. Storage Purge Safety & TData Protection (tdesktop #31425)
{
  console.log('  Testing storage purge safety & user profile protection...');
  // Routine uninstallation attempting to wipe tdata without token
  const blocked = OfflineStorageAndMediaSessionGovernor.validateStoragePurgeSafety('/home/user/.local/share/Guidegram/tdata');
  assert.strictEqual(blocked.isSafe, false);
  assert.strictEqual(blocked.blockedOperation, 'PURGE_DIRECTORY');
  assert.ok(blocked.reason?.includes('tdata'));

  // Authorized wipe with confirmation token
  const allowed = OfflineStorageAndMediaSessionGovernor.validateStoragePurgeSafety(
    '/home/user/.local/share/Guidegram/tdata',
    'CONFIRM_PURGE_USER_DATA_PERMANENTLY'
  );
  assert.strictEqual(allowed.isSafe, true);

  // Normal temporary cache directory is safe to purge
  const tempSafe = OfflineStorageAndMediaSessionGovernor.validateStoragePurgeSafety('/tmp/guidegram_temp_cache');
  assert.strictEqual(tempSafe.isSafe, true);
  console.log('  ✅ Storage purge safety verified');
}

// 2. Media Session MPRIS / SMTC Lifecycle (tdesktop #31457)
{
  console.log('  Testing native media session lifecycle and MPRIS release...');
  const governor = new OfflineStorageAndMediaSessionGovernor();

  // Video starts playing
  const playing = governor.setMediaSessionPlayback('playing', 'video_1001');
  assert.strictEqual(playing.isActive, true);
  assert.strictEqual(playing.playbackState, 'playing');
  assert.strictEqual(playing.mprisReleased, false);
  assert.strictEqual(playing.currentTrackId, 'video_1001');

  // Video closed -> media session must deactivate immediately
  const closed = governor.setMediaSessionPlayback('none');
  assert.strictEqual(closed.isActive, false);
  assert.strictEqual(closed.playbackState, 'none');
  assert.strictEqual(closed.mprisReleased, true);
  assert.strictEqual(closed.currentTrackId, undefined);
  console.log('  ✅ Media session MPRIS deactivation verified');
}

// 3. Typing Notification Debounce (tdesktop #31390)
{
  console.log('  Testing typing notification burst debounce...');
  const governor = new OfflineStorageAndMediaSessionGovernor();
  const now = Date.now();

  // First message from user 'alice' -> notify immediately
  const first = governor.handleIncomingMessageNotification('alice', now);
  assert.strictEqual(first.shouldNotifyNow, true);
  assert.strictEqual(first.accumulatedCount, 1);

  // Second message 1 second later (in burst window) -> suppress notification chime
  const second = governor.handleIncomingMessageNotification('alice', now + 1000);
  assert.strictEqual(second.shouldNotifyNow, false);
  assert.strictEqual(second.accumulatedCount, 2);

  // Third message 6 seconds later (outside 5s burst window) -> notify again
  const third = governor.handleIncomingMessageNotification('alice', now + 6500);
  assert.strictEqual(third.shouldNotifyNow, true);
  assert.strictEqual(third.accumulatedCount, 1);
  console.log('  ✅ Typing burst debounce verified');
}

// 4. Resilient Chunked Download Tracking (tdesktop #31387)
{
  console.log('  Testing chunked media download progress and completion...');
  const totalSize = 100000;
  const chunkSize = 25000;

  // Chunk 0 completed
  const step1 = OfflineStorageAndMediaSessionGovernor.trackChunkedDownload('file_abc', totalSize, 0, chunkSize, []);
  assert.strictEqual(step1.downloadedBytes, 25000);
  assert.strictEqual(step1.isComplete, false);

  // Chunk 1, 2, 3 completed
  const step2 = OfflineStorageAndMediaSessionGovernor.trackChunkedDownload('file_abc', totalSize, 3, chunkSize, [0, 1, 2]);
  assert.strictEqual(step2.downloadedBytes, 100000);
  assert.strictEqual(step2.isComplete, true);
  assert.strictEqual(step2.isCorrupted, false);
  console.log('  ✅ Chunked download progress verified');
}

// 5. Bulk Media Export Manifest (tdesktop #31412)
{
  console.log('  Testing bulk media export manifest generation...');
  const items = [
    { messageId: 101, mediaUrl: 'https://cdn.guidegram.org/img1.jpg', suggestedFileName: 'cat:pic.jpg', byteSize: 450000 },
    { messageId: 102, mediaUrl: 'https://cdn.guidegram.org/img2.png', suggestedFileName: 'chart/2026.png', byteSize: 650000 }
  ];

  const manifest = OfflineStorageAndMediaSessionGovernor.generateBulkExportManifest(items, '/downloads/guidegram');
  assert.strictEqual(manifest.totalBytes, 1100000);
  assert.strictEqual(manifest.targetFiles.length, 2);
  assert.strictEqual(manifest.targetFiles[0].destPath, '/downloads/guidegram/101_cat_pic.jpg');
  assert.strictEqual(manifest.targetFiles[1].destPath, '/downloads/guidegram/102_chart_2026.png');
  console.log('  ✅ Bulk media export manifest verified');
}

console.log('✨ All Phase 47 Verification Tests Passed 100% Successfully!');
