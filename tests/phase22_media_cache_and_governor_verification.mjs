import assert from 'node:assert';
import {
  GifVsMp4MediaDisambiguator,
  ScalableMessageSelectionManager,
  ViewportGifAutoplayGovernor,
  ConcurrentDownloadGovernor,
} from '../src/services/mediaCacheAndDownloadGovernor.ts';

function runTests() {
  console.log('[Phase 22 Verification] Starting tests...');

  // --- Test 1: GifVsMp4MediaDisambiguator (#2053) ---
  const videoWithAudio = GifVsMp4MediaDisambiguator.classifyMedia({
    mimeType: 'video/mp4',
    hasAudioTrack: true,
    durationSec: 15,
  });
  assert.strictEqual(videoWithAudio, 'regular_video', 'MP4 with audio must NEVER be treated as a silent GIF (#2053)');

  const shortSilentAnimation = GifVsMp4MediaDisambiguator.classifyMedia({
    mimeType: 'video/mp4',
    hasAudioTrack: false,
    durationSec: 5,
    isExplicitAnimationFlag: true,
  });
  assert.strictEqual(shortSilentAnimation, 'gif_animation');

  const longSilentVideo = GifVsMp4MediaDisambiguator.classifyMedia({
    mimeType: 'video/mp4',
    hasAudioTrack: false,
    durationSec: 120,
  });
  assert.strictEqual(longSilentVideo, 'regular_video');
  console.log('✓ Test 1: GifVsMp4MediaDisambiguator passed');

  // --- Test 2: ScalableMessageSelectionManager (#129) ---
  const selMgr = new ScalableMessageSelectionManager(500); // 500 limit
  const batch = Array.from({ length: 250 }, (_, i) => `msg_${i}`);

  const batchRes = selMgr.selectBatch(batch);
  assert.strictEqual(batchRes.addedCount, 250);
  assert.strictEqual(selMgr.getSelectedIds().length, 250, 'Selection must seamlessly handle > 100 messages (#129)');

  // Toggle off one item
  const toggleOff = selMgr.toggleSelect('msg_0');
  assert.strictEqual(toggleOff.selected, false);
  assert.strictEqual(selMgr.getSelectedIds().length, 249);
  console.log('✓ Test 2: ScalableMessageSelectionManager passed');

  // --- Test 3: ViewportGifAutoplayGovernor (#669) ---
  const gifGovernor = new ViewportGifAutoplayGovernor(2); // max 2 concurrent playing

  gifGovernor.onVisibilityChange('gif_1', true);
  gifGovernor.onVisibilityChange('gif_2', true);
  assert.strictEqual(gifGovernor.isPlaying('gif_1'), true);
  assert.strictEqual(gifGovernor.isPlaying('gif_2'), true);

  // 3rd visible GIF cannot autoplay concurrently
  gifGovernor.onVisibilityChange('gif_3', true);
  assert.strictEqual(gifGovernor.isPlaying('gif_3'), false);
  assert.strictEqual(gifGovernor.getActiveCount(), 2);

  // gif_1 scrolled out of view
  gifGovernor.onVisibilityChange('gif_1', false);
  assert.strictEqual(gifGovernor.isPlaying('gif_1'), false);
  // gif_3 now starts playing
  gifGovernor.onVisibilityChange('gif_3', true);
  assert.strictEqual(gifGovernor.isPlaying('gif_3'), true);
  console.log('✓ Test 3: ViewportGifAutoplayGovernor passed');

  // --- Test 4: ConcurrentDownloadGovernor (#467) ---
  const dlGovernor = new ConcurrentDownloadGovernor(2); // limit to 2 simultaneous
  const startedTasks = [];

  dlGovernor.enqueueDownload({
    id: 'dl_1',
    url: 'https://cdn/file1.mp4',
    priority: 'normal',
    onStart: () => startedTasks.push('dl_1'),
  });

  dlGovernor.enqueueDownload({
    id: 'dl_2',
    url: 'https://cdn/file2.mp4',
    priority: 'normal',
    onStart: () => startedTasks.push('dl_2'),
  });

  // dl_3 should be queued
  dlGovernor.enqueueDownload({
    id: 'dl_3',
    url: 'https://cdn/file3.mp4',
    priority: 'high',
    onStart: () => startedTasks.push('dl_3'),
  });

  assert.deepStrictEqual(startedTasks, ['dl_1', 'dl_2']);
  assert.strictEqual(dlGovernor.getQueueLength(), 1);

  // dl_1 completes -> dl_3 starts
  dlGovernor.completeDownload('dl_1');
  assert.deepStrictEqual(startedTasks, ['dl_1', 'dl_2', 'dl_3']);
  assert.strictEqual(dlGovernor.getQueueLength(), 0);
  console.log('✓ Test 4: ConcurrentDownloadGovernor passed');

  console.log('[Phase 22 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
