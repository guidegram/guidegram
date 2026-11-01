import assert from 'node:assert/strict';
import { UnigramChatExportShareGalleryAndVoipGovernor } from '../src/services/unigramChatExportShareGalleryAndVoipGovernor.ts';

console.log('🧪 Starting Phase 161: Unigram Chat Export, Share, Gallery, and VoIP Hardening Test Suite...');

const governor = new UnigramChatExportShareGalleryAndVoipGovernor();

// =========================================================================
// Test 1: Unigram #541 - Chat Export Date Validation and Archive Generation
// =========================================================================
console.log('Testing Unigram #541: Chat export validation and filename generation...');
{
  // Valid export
  const validRes = governor.validateAndExecuteExport({
    chatId: 'chat_export_1',
    format: 'json',
    startDate: 1600000000,
    endDate: 1700000000,
    mediaFilter: ['photos', 'documents'],
    maxMessages: 5000
  });
  assert.equal(validRes.success, true);
  assert.equal(validRes.exportedCount, 5000);
  assert.equal(validRes.format, 'json');
  assert.ok(validRes.archiveFileName.startsWith('chat_export_chat_export_1_'));

  // Invalid date range (start > end)
  const invalidDate = governor.validateAndExecuteExport({
    chatId: 'chat_export_1',
    format: 'html',
    startDate: 1700000000,
    endDate: 1600000000,
    mediaFilter: []
  });
  assert.equal(invalidDate.success, false);
  assert.ok(invalidDate.error?.includes('Start date must be before end date'));
  console.log('✅ Unigram #541: Chat export options verified.');
}

// =========================================================================
// Test 2: Unigram #1104 - Direct Share Targets for Non-Contact Peers
// =========================================================================
console.log('Testing Unigram #1104: Direct share target exposure for channels/groups/bots...');
{
  governor.registerShareTargetPeer({
    targetId: 'peer_chan_1',
    title: 'Design News Channel',
    peerType: 'channel',
    isContact: false
  });
  governor.registerShareTargetPeer({
    targetId: 'peer_group_2',
    title: 'Core Dev Team',
    peerType: 'group',
    isContact: false
  });

  const targets = governor.getAvailableShareTargets();
  assert.equal(targets.length, 2);
  assert.equal(targets[0].title, 'Design News Channel');
  assert.equal(targets[0].isContact, false);
  assert.equal(targets[1].title, 'Core Dev Team');
  console.log('✅ Unigram #1104: Direct share targets verified.');
}

// =========================================================================
// Test 3: Unigram #744 - Share Activation Direct Chat Routing
// =========================================================================
console.log('Testing Unigram #744: Direct chat routing and attachment prefill on share activation...');
{
  const shareRes = governor.handleShareActivation({
    targetChatId: 'chat_target_123',
    sharedText: 'Check out this document',
    sharedFiles: [
      { name: 'spec.pdf', uri: 'file:///docs/spec.pdf', size: 10240, mimeType: 'application/pdf' }
    ]
  });
  assert.equal(shareRes.route, '/chat/chat_target_123');
  assert.equal(shareRes.targetChatId, 'chat_target_123');
  assert.equal(shareRes.prefilledComposerText, 'Check out this document');
  assert.equal(shareRes.attachedFilesCount, 1);
  console.log('✅ Unigram #744: Share activation navigation verified.');
}

// =========================================================================
// Test 4: Unigram #204 - Sticker Emoji Association and Keyword Suggestion
// =========================================================================
console.log('Testing Unigram #204: Sticker emoji mapping and keyword lookup...');
{
  governor.registerSticker({
    stickerId: 'stk_laugh_1',
    primaryEmoji: '😂',
    thumbnailUrl: '/thumbs/laugh1.webp',
    setName: 'MemePack'
  });
  governor.registerSticker({
    stickerId: 'stk_laugh_2',
    primaryEmoji: '😂',
    thumbnailUrl: '/thumbs/laugh2.webp',
    setName: 'CatPack'
  });
  governor.registerSticker({
    stickerId: 'stk_heart_1',
    primaryEmoji: '❤️',
    thumbnailUrl: '/thumbs/heart.webp',
    setName: 'LovePack'
  });

  const laughingStickers = governor.getStickersForEmoji('😂');
  assert.equal(laughingStickers.length, 2);
  assert.equal(laughingStickers[0].stickerId, 'stk_laugh_1');
  assert.equal(laughingStickers[1].stickerId, 'stk_laugh_2');

  const heartStickers = governor.getStickersForEmoji('❤️');
  assert.equal(heartStickers.length, 1);
  assert.equal(heartStickers[0].setName, 'LovePack');
  console.log('✅ Unigram #204: Sticker emoji association verified.');
}

// =========================================================================
// Test 5: Unigram #1177 - Photo Gallery Navigation Bidirectional Stability
// =========================================================================
console.log('Testing Unigram #1177: Photo gallery navigation index direction changes...');
{
  const photos = ['img_A', 'img_B', 'img_C', 'img_D'];
  const gallery = governor.createGallerySession(photos, 0);

  assert.equal(gallery.getCurrentIndex(), 0);
  assert.equal(gallery.hasPrev(), false);
  assert.equal(gallery.hasNext(), true);

  // Next -> 1 (B)
  gallery.navigateNext();
  assert.equal(gallery.getCurrentIndex(), 1);

  // Next -> 2 (C)
  gallery.navigateNext();
  assert.equal(gallery.getCurrentIndex(), 2);

  // Change direction rapidly! Prev -> 1 (B)
  gallery.navigatePrev();
  assert.equal(gallery.getCurrentIndex(), 1);
  assert.equal(gallery.getCurrentItemId(), 'img_B');

  // Prev again -> 0 (A)
  gallery.navigatePrev();
  assert.equal(gallery.getCurrentIndex(), 0);
  assert.equal(gallery.hasPrev(), false); // Correctly clamped at boundary
  console.log('✅ Unigram #1177: Photo gallery navigation verified.');
}

// =========================================================================
// Test 6: Unigram #1189 - Active Download Manager Controls
// =========================================================================
console.log('Testing Unigram #1189: Active download manager progress and pause/resume...');
{
  const downloadId = 'dl_movie_1';
  const total = 100 * 1024 * 1024; // 100MB
  governor.startDownload(downloadId, 'video.mp4', total);

  // Update progress: downloaded 40MB
  const updated = governor.updateDownloadProgress(downloadId, 40 * 1024 * 1024, 5 * 1024 * 1024);
  assert.equal(updated.downloadedBytes, 40 * 1024 * 1024);
  assert.equal(updated.status, 'downloading');

  // Pause download
  const paused = governor.controlDownload(downloadId, 'pause');
  assert.equal(paused.status, 'paused');
  assert.equal(paused.speedBytesPerSec, 0);

  // Resume download
  const resumed = governor.controlDownload(downloadId, 'resume');
  assert.equal(resumed.status, 'downloading');

  // Complete download
  const completed = governor.updateDownloadProgress(downloadId, 60 * 1024 * 1024, 5 * 1024 * 1024);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.downloadedBytes, total);
  console.log('✅ Unigram #1189: Active download manager verified.');
}

// =========================================================================
// Test 7: Unigram #3164 - VoIP In-App Floating Banner Fallback
// =========================================================================
console.log('Testing Unigram #3164: VoIP floating banner fallback on Windows Server...');
{
  // Windows Server without interactive toast support
  const callState = governor.handleIncomingCall('call_ws_99', 'Boss', false);
  assert.equal(callState.status, 'ringing');
  assert.equal(callState.useInAppBannerFallback, true);

  // User clicks Accept on in-app banner
  const accepted = governor.respondToIncomingCall('call_ws_99', true);
  assert.equal(accepted.status, 'accepted');

  // Normal client with toast support
  const normalCall = governor.handleIncomingCall('call_win11_01', 'Friend', true);
  assert.equal(normalCall.useInAppBannerFallback, false);
  console.log('✅ Unigram #3164: VoIP floating banner fallback verified.');
}

console.log('🎉 Phase 161: All 7 Unigram hardening tests PASSED with 100% precision!');
