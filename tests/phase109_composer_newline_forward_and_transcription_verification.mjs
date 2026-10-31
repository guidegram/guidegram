/**
 * Test Suite: Phase 109 Composer Newline, Forward Mode & Voice Transcription Verification
 * 
 * Verifies fixes for:
 * - morethanwords/tweb #89: Consecutive newlines are lost when composing (Serializer preserving \n\n\n)
 * - AyuGram/AyuGramDesktop #127: Downloading and sending videos instead of forwarding (Forward author detachment)
 * - kotatogram/kotatogram-desktop #84: Сделать меньше ограничение по ширине и высоте окна (Compact window limits)
 * - UnigramDev/Unigram #2645: Unigram crashes on start (Stale lockfile/mutex recovery)
 * - TDesktop-x64/tdesktop #212: Add quick forward when pressed ctrl (Ctrl+Click accelerator)
 * - kotatogram/kotatogram-desktop #436: Enabling external video player disables auto-download (Decoupled download manager)
 * - kotatogram/kotatogram-desktop #416: Transcribe audio files and video messages (Voice/video speech-to-text coordinator)
 */

import assert from 'node:assert';
import { composerNewlineForwardAndTranscriptionGovernor } from '../src/services/composerNewlineForwardAndTranscriptionGovernor.ts';

console.log('🧪 Starting Phase 109 Composer Newline, Forward & Transcription Verification Suite...');

// 1. Consecutive Newline Preservation
console.log('  Testing consecutive newline preservation in composer...');
const inputHtml = 'Paragraph 1<div><br></div><div><br></div>Paragraph 2';
const serialized = composerNewlineForwardAndTranscriptionGovernor.serializeComposerHtml(inputHtml);
assert.ok(serialized.serializedText.includes('Paragraph 1\n\nParagraph 2') || serialized.serializedText.includes('\n\n'));
assert.ok(serialized.consecutiveNewlinesPreserved >= 2);
console.log('  ✅ Consecutive newlines preserved accurately without stripping');

// 2. Forward Author Detachment Mode
console.log('  Testing forward author detachment mode...');
const sourceMsg = {
  id: 42,
  chatId: 'chan_crypto',
  authorName: 'Bitcoin Analyst',
  mediaType: 'video',
  mediaFileId: 'file_vid_btc',
  text: 'Bullish breakout!',
};

// Standard forward
const standardFwd = composerNewlineForwardAndTranscriptionGovernor.prepareForwardPayload(sourceMsg, 'standard');
assert.strictEqual(standardFwd.authorName, 'Bitcoin Analyst');
assert.strictEqual(standardFwd.mode, 'standard');

// Detached copy
const detachedFwd = composerNewlineForwardAndTranscriptionGovernor.prepareForwardPayload(sourceMsg, 'detached_copy');
assert.strictEqual(detachedFwd.authorName, '');
assert.strictEqual(detachedFwd.mode, 'detached_copy');
assert.strictEqual(detachedFwd.mediaFileId, 'file_vid_btc');
console.log('  ✅ Forward author detachment verified');

// 3. Compact Window Minimum Dimensions
console.log('  Testing compact window boundary clamping (300x400)...');
const bounds = composerNewlineForwardAndTranscriptionGovernor.calculateCompactWindowBounds(250, 350);
assert.strictEqual(bounds.clampedWidth, 300);
assert.strictEqual(bounds.clampedHeight, 400);

const normalBounds = composerNewlineForwardAndTranscriptionGovernor.calculateCompactWindowBounds(800, 600);
assert.strictEqual(normalBounds.clampedWidth, 800);
assert.strictEqual(normalBounds.clampedHeight, 600);
console.log('  ✅ Compact window minimum limits verified');

// 4. Stale Mutex / Lockfile Startup Recovery
console.log('  Testing stale lockfile startup recovery...');
// PID 9999 is dead (running PIDs: 100, 200, 300) -> lock cleared
const staleRecovery = composerNewlineForwardAndTranscriptionGovernor.evaluateSingleInstanceLock(9999, [100, 200, 300]);
assert.strictEqual(staleRecovery.staleLockDetected, true);
assert.strictEqual(staleRecovery.lockCleared, true);
assert.strictEqual(staleRecovery.isLocked, false);

// PID 200 is alive -> locked
const activeLock = composerNewlineForwardAndTranscriptionGovernor.evaluateSingleInstanceLock(200, [100, 200, 300]);
assert.strictEqual(activeLock.staleLockDetected, false);
assert.strictEqual(activeLock.isLocked, true);
console.log('  ✅ Single-instance mutex recovery verified');

// 5. Ctrl+Click Quick Forward Trigger
console.log('  Testing Ctrl+Click quick forward trigger...');
const ctrlClick = composerNewlineForwardAndTranscriptionGovernor.handleMessageClickEvent(
  { ctrlKey: true, button: 0 },
  'msg_123'
);
assert.strictEqual(ctrlClick.triggered, true);
assert.strictEqual(ctrlClick.action, 'open_forward_modal');
assert.strictEqual(ctrlClick.messageId, 'msg_123');

const plainClick = composerNewlineForwardAndTranscriptionGovernor.handleMessageClickEvent(
  { ctrlKey: false, button: 0 },
  'msg_123'
);
assert.strictEqual(plainClick.triggered, false);
console.log('  ✅ Ctrl+Click quick forward accelerator verified');

// 6. Decoupled Auto-Download Coordinator
console.log('  Testing auto-downloading when external player is active...');
const dlState = composerNewlineForwardAndTranscriptionGovernor.triggerAutoDownload('video_789', true);
assert.strictEqual(dlState.isDownloadActive, true);
assert.strictEqual(dlState.isExternalPlayerEnabled, true);
assert.strictEqual(dlState.cachedLocalPath, '/cache/media/video_789');
console.log('  ✅ Decoupled auto-download manager verified');

// 7. Voice & Video Message Speech-to-Text Transcriber
console.log('  Testing voice message transcription...');
const transcription = composerNewlineForwardAndTranscriptionGovernor.transcribeAudio('voice_fa_1', 12);
assert.strictEqual(transcription.status, 'completed');
assert.ok(transcription.transcribedText?.includes('گایدگرام'));
assert.strictEqual(transcription.confidence, 0.96);
console.log('  ✅ Speech-to-text audio transcription verified');

console.log('✨ All Phase 109 Verification Tests Passed 100% Successfully!');
