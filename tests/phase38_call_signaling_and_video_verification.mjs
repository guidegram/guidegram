import assert from 'node:assert/strict';
import { CallSignalingAndPipVideoGovernor } from '../src/services/callSignalingAndPipVideoGovernor.ts';

console.log('🧪 Starting Phase 38 Call Signaling & Video Verification Suite...');

// 1. WebRTC Call Finite State Machine Transitions (tdesktop #10182, #3412)
{
  console.log('  Testing call state machine transitions & race-condition protection...');
  // Normal incoming call flow: idle -> incoming -> connecting -> active -> idle
  const s1 = CallSignalingAndPipVideoGovernor.transitionCall('receive_call');
  assert.strictEqual(s1.nextState, 'incoming');
  assert.strictEqual(s1.isAllowed, true);
  assert.strictEqual(s1.actionToExecute, 'play_ringtone');

  // Duplicate incoming event while line busy -> must be rejected cleanly
  const sDup = CallSignalingAndPipVideoGovernor.transitionCall('receive_call');
  assert.strictEqual(sDup.isAllowed, false);
  assert.strictEqual(sDup.nextState, 'incoming');

  // Accept call
  const s2 = CallSignalingAndPipVideoGovernor.transitionCall('accept_call');
  assert.strictEqual(s2.nextState, 'connecting');
  assert.strictEqual(s2.actionToExecute, 'stop_ringtone');

  // WebRTC connected
  const s3 = CallSignalingAndPipVideoGovernor.transitionCall('connected');
  assert.strictEqual(s3.nextState, 'active');

  // Hangup
  const s4 = CallSignalingAndPipVideoGovernor.transitionCall('hangup');
  assert.strictEqual(s4.nextState, 'idle');
  assert.strictEqual(s4.actionToExecute, 'teardown');
  console.log('  ✅ Call state machine passed');
}

// 2. Picture-in-Picture Video Detachment & Preservation (tdesktop #29292)
{
  console.log('  Testing PiP detachment & playback reattachment...');
  const pipState = CallSignalingAndPipVideoGovernor.detachToPictureInPicture(45.5, false, true);
  assert.strictEqual(pipState.isPipActive, true);
  assert.strictEqual(pipState.videoTimeSec, 45.5);
  assert.strictEqual(pipState.elementPreserved, true);

  const reattach = CallSignalingAndPipVideoGovernor.reAttachFromPictureInPicture(pipState);
  assert.strictEqual(reattach.canResumePlayback, true);
  assert.strictEqual(reattach.seekToSec, 45.5);
  console.log('  ✅ PiP detachment & reattachment passed');
}

// 3. Custom Thumbnail Frame Extraction (tdesktop #31496)
{
  console.log('  Testing custom video thumbnail frame extraction calculation...');
  // 1920x1080 video at 15.2s
  const thumb = CallSignalingAndPipVideoGovernor.prepareThumbnailExtraction(15.2, 60.0, 1920, 1080);
  assert.strictEqual(thumb.timestampSec, 15.2);
  assert.strictEqual(thumb.dimensions.width, 640);
  assert.strictEqual(thumb.dimensions.height, 360);
  assert.strictEqual(thumb.mimeType, 'image/jpeg');

  // Clamp out of bounds time (> duration)
  const clampedThumb = CallSignalingAndPipVideoGovernor.prepareThumbnailExtraction(95.0, 60.0, 1080, 1920);
  assert.strictEqual(clampedThumb.timestampSec, 60.0);
  assert.strictEqual(clampedThumb.dimensions.height, 640);
  console.log('  ✅ Custom thumbnail frame extraction passed');
}

// 4. Wayland Opaque Background Surface (tdesktop #27598, #31498)
{
  console.log('  Testing media viewer surface styles...');
  const styles = CallSignalingAndPipVideoGovernor.getMediaViewerSurfaceStyle();
  assert.strictEqual(styles.backgroundColor, '#000000');
  assert.strictEqual(styles.opacity, '1.0');
  console.log('  ✅ Media viewer surface styles passed');
}

console.log('\n🎉 ALL Phase 38 verification checks passed green!');
