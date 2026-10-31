import { strict as assert } from 'node:assert';
import { MediaSeekSynchronizer } from '../dist-test-media/src/utils/mediaSeekSynchronizer.js';

console.log('🧪 Starting MediaSeekSynchronizer Verification Suite...');

const synchronizer = MediaSeekSynchronizer.getInstance();

// 1. Singleton check
assert.ok(synchronizer);
assert.strictEqual(synchronizer, MediaSeekSynchronizer.getInstance(), 'Must be singleton');
console.log('  ✅ Check 1: Singleton instantiation verified');

// 2. Scenario 1: Normal seek within audio duration
const normalMeta = {
  videoDurationSec: 60.0,
  audioDurationSec: 60.0,
  containerDurationSec: 60.0
};
const resNormal = synchronizer.evaluateSeek(15.0, normalMeta);
assert.strictEqual(resNormal.effectiveSeekTimeSec, 15.0);
assert.strictEqual(resNormal.clockMode, 'audio_master');
assert.strictEqual(resNormal.isAudioFinished, false);
assert.strictEqual(resNormal.isVideoFinished, false);
console.log('  ✅ Check 2: Normal in-bounds seek verified');

// 3. Scenario 2 (THE CRITICAL TDesktop #30649 CASE):
// MKV with video = 14.0s, audio = 4.0s. Seek to 8.0s (past audio duration).
const mismatchedMeta = {
  videoDurationSec: 14.0,
  audioDurationSec: 4.0,
  containerDurationSec: 14.0
};

const resMismatched = synchronizer.evaluateSeek(8.0, mismatchedMeta);
assert.strictEqual(resMismatched.effectiveSeekTimeSec, 8.0, 'Must preserve 8.0s seek target');
assert.strictEqual(resMismatched.clockMode, 'video_master', 'Must dynamically promote video to clock master!');
assert.strictEqual(resMismatched.isAudioFinished, true, 'Audio must be recognized as finished');
assert.strictEqual(resMismatched.isVideoFinished, false, 'Video is not finished');
assert.strictEqual(resMismatched.generateSilence, true, 'Should flag silence generation for audio pipeline');
console.log('  ✅ Check 3: Mismatched stream seek evaluation verified (TDesktop #30649 parity)');

// 4. Playback position calculation: verify playAlready does NOT reset to 0
// Naive players read audioPts (which is 0 or null at EOF) and reset to 0!
const posWithNullAudio = synchronizer.computePlaybackPosition(
  8.0,  // currentSeekBase
  0.5,  // elapsedSinceSeek
  null, // audioPtsSec is null (EOF!)
  8.5,  // videoPtsSec is 8.5
  resMismatched.clockMode // 'video_master'
);
assert.strictEqual(posWithNullAudio, 8.5, 'Must track video PTS without resetting to 0!');

const posWithZeroAudio = synchronizer.computePlaybackPosition(
  8.0,  // currentSeekBase
  0.5,  // elapsedSinceSeek
  0.0,  // audioPtsSec is 0 (stale / reset!)
  8.5,  // videoPtsSec is 8.5
  resMismatched.clockMode // 'video_master'
);
assert.strictEqual(posWithZeroAudio, 8.5, 'Must NOT be corrupted by stale audio PTS = 0!');
console.log('  ✅ Check 4: Anti-reset invariant verified (playAlready never resets to 0)');

// 5. Video-only container (no audio stream)
const videoOnlyMeta = {
  videoDurationSec: 30.0,
  containerDurationSec: 30.0
};
const resVideoOnly = synchronizer.evaluateSeek(10.0, videoOnlyMeta);
assert.strictEqual(resVideoOnly.clockMode, 'video_master');
assert.strictEqual(resVideoOnly.isAudioFinished, true);
console.log('  ✅ Check 5: Video-only container handling verified');

// 6. Over-seeking past container limits clamped
const resOverSeek = synchronizer.evaluateSeek(100.0, mismatchedMeta);
assert.strictEqual(resOverSeek.effectiveSeekTimeSec, 14.0, 'Must clamp to container maximum duration');
assert.strictEqual(resOverSeek.isVideoFinished, true);
console.log('  ✅ Check 6: Boundary clamping verified');

console.log('🎉 ALL 6 CHECKS PASSED SUCCESSFULLY!');
