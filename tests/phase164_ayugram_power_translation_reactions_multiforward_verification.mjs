import assert from 'node:assert/strict';
import { AyuGramPowerTranslationReactionsAndMultiForwardGovernor } from '../src/services/ayugramPowerTranslationReactionsAndMultiForwardGovernor.ts';

console.log('🧪 Starting Phase 164: AyuGram Translation, WakeLock, Multi-Forward, and PiP Hardening Test Suite...');

const governor = new AyuGramPowerTranslationReactionsAndMultiForwardGovernor();

// =========================================================================
// Test 1: AyuGram #202 - Message Inline Translation and Result Caching
// =========================================================================
console.log('Testing AyuGram #202: Inline language detection, translation, and caching...');
{
  // Persian text -> English translation
  const farsiText = 'سلام، نسخه جدید منتشر شد';
  const res1 = governor.translateMessage('msg_fa_1', farsiText, 'en');
  assert.equal(res1.sourceLang, 'fa');
  assert.equal(res1.targetLang, 'en');
  assert.equal(res1.isCached, false);
  assert.ok(res1.translatedText.length > 0);

  // Subsequent translation of same message -> hits cache!
  const cached = governor.translateMessage('msg_fa_1', farsiText, 'en');
  assert.equal(cached.isCached, true);
  assert.equal(cached.translatedText, res1.translatedText);
  console.log('✅ AyuGram #202: Message translation verified.');
}

// =========================================================================
// Test 2: AyuGram #184 - Download Sleep Prevention Wake Lock
// =========================================================================
console.log('Testing AyuGram #184: Download active wake lock acquisition and release...');
{
  // Download 1 starts
  const lock1 = governor.notifyDownloadStarted();
  assert.equal(lock1.isActive, true);
  assert.equal(lock1.activeDownloadsCount, 1);
  assert.ok(lock1.acquiredAt);

  // Download 2 starts
  const lock2 = governor.notifyDownloadStarted();
  assert.equal(lock2.isActive, true);
  assert.equal(lock2.activeDownloadsCount, 2);

  // Download 1 completes -> wake lock remains active because download 2 is still running
  const lockAfter1 = governor.notifyDownloadFinished();
  assert.equal(lockAfter1.isActive, true);
  assert.equal(lockAfter1.activeDownloadsCount, 1);

  // Download 2 completes -> wake lock automatically released!
  const lockFinal = governor.notifyDownloadFinished();
  assert.equal(lockFinal.isActive, false);
  assert.equal(lockFinal.activeDownloadsCount, 0);
  console.log('✅ AyuGram #184: Download wake lock verified.');
}

// =========================================================================
// Test 3: AyuGram #117 - Multi-Chat Video Forwarding Concurrency
// =========================================================================
console.log('Testing AyuGram #117: Multi-chat video forward isolation and error protection...');
{
  const targetChats = ['chat_101', 'chat_102', 'chat_103', 'chat_104', 'chat_105'];
  const res = governor.executeMultiChatForward(
    'src_msg_99',
    'heavy_video_ref_4k',
    'Breaking news video',
    targetChats,
    3
  );

  assert.equal(res.totalTargets, 5);
  assert.equal(res.successfulTargets, 5);
  assert.equal(res.results.length, 5);
  assert.equal(res.results[0].chatId, 'chat_101');
  assert.equal(res.results[0].status, 'success');
  console.log('✅ AyuGram #117: Multi-chat video forward verified.');
}

// =========================================================================
// Test 4: AyuGram #87 - Reaction Visibility Toggle
// =========================================================================
console.log('Testing AyuGram #87: Chat reactions visibility toggle...');
{
  // Default is visible
  assert.equal(governor.isReactionsVisible(), true);

  // User disables reactions
  const hidden = governor.setReactionsVisibility(false);
  assert.equal(hidden.showReactions, false);
  assert.equal(hidden.cssClassModifier, 'reactions-hidden');
  assert.equal(governor.isReactionsVisible(), false);

  // Re-enable
  const shown = governor.setReactionsVisibility(true);
  assert.equal(shown.showReactions, true);
  assert.equal(shown.cssClassModifier, 'reactions-visible');
  console.log('✅ AyuGram #87: Chat reactions visibility toggle verified.');
}

// =========================================================================
// Test 5: AyuGram #389 - Windowed Picture-in-Picture Media Player
// =========================================================================
console.log('Testing AyuGram #389: Windowed PiP media player mode...');
{
  const pipState = governor.setMediaDisplayMode('video_sample_1', 'windowed_pip');
  assert.equal(pipState.mode, 'windowed_pip');
  assert.equal(pipState.isPlaying, true);
  assert.equal(pipState.pipPosition.width, 360);
  assert.equal(pipState.pipPosition.height, 202);

  // Switch to fullscreen
  const fsState = governor.setMediaDisplayMode('video_sample_1', 'fullscreen');
  assert.equal(fsState.mode, 'fullscreen');
  console.log('✅ AyuGram #389: Windowed PiP media player verified.');
}

// =========================================================================
// Test 6: AyuGram #337 - Parallel Multi-Stream Upload Concurrency
// =========================================================================
console.log('Testing AyuGram #337: Parallel upload stream allocation based on network speed...');
{
  const gigabitUpload = governor.calculateParallelUploadStreams(500 * 1024 * 1024, 100); // 100 Mbps
  assert.equal(gigabitUpload.concurrency, 4); // Fast link -> 4 parallel streams
  assert.equal(gigabitUpload.activeStreams, 4);

  const slowUpload = governor.calculateParallelUploadStreams(10 * 1024 * 1024, 2); // 2 Mbps
  assert.equal(slowUpload.concurrency, 1); // Slow link -> single stream to prevent congestion
  console.log('✅ AyuGram #337: Parallel upload streams verified.');
}

// =========================================================================
// Test 7: AyuGram #392 - Desktop Composition Startup Icon Redraw Suppression
// =========================================================================
console.log('Testing AyuGram #392: Desktop composition and icon redraw suppression...');
{
  const comp = governor.initializeWindowComposition();
  assert.equal(comp.dwmInvalidationPrevented, true);
  assert.equal(comp.useDoubleBuffering, true);
  assert.equal(comp.desktopIconRedrawSuppressed, true);
  console.log('✅ AyuGram #392: Desktop composition startup verified.');
}

console.log('🎉 Phase 164: All 7 AyuGram hardening tests PASSED with 100% precision!');
