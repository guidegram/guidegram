import assert from 'node:assert';
import {
  VideoRotationAndMatrixNormalizer,
  RoundVideoKeyframeAndCodecGuard,
  FractionalScalePixelSnapper,
  StoryAndAvatarProfileSyncEngine,
} from '../src/services/videoAndDisplayScaleGuard.ts';

function runTests() {
  console.log('[Phase 18 Verification] Starting tests...');

  // --- Test 1: VideoRotationAndMatrixNormalizer (#463) ---
  const rot0 = VideoRotationAndMatrixNormalizer.computeTransformForRotation(0);
  assert.strictEqual(rot0.transform, 'none');

  const rot180 = VideoRotationAndMatrixNormalizer.computeTransformForRotation(180);
  assert.strictEqual(rot180.transform, 'rotate(180deg)', 'Upside down iPad video must be rotated 180deg');

  const rotNeg90 = VideoRotationAndMatrixNormalizer.computeTransformForRotation(-90);
  assert.strictEqual(rotNeg90.transform, 'rotate(270deg)');
  console.log('✓ Test 1: VideoRotationAndMatrixNormalizer passed');

  // --- Test 2: RoundVideoKeyframeAndCodecGuard (#31422) ---
  // Erroneous 1,000,000 fps from competitor bug
  const insaneFpsConfig = RoundVideoKeyframeAndCodecGuard.sanitizeEncoderConfig(1000000);
  assert.strictEqual(insaneFpsConfig.fps, 60, 'Insane 1,000,000 fps must be clamped to safe 60fps limit');
  assert.strictEqual(insaneFpsConfig.forceImmediateIdr, true, 'Immediate IDR keyframe at 0.00s required');

  // Sub-zero fps
  const zeroFpsConfig = RoundVideoKeyframeAndCodecGuard.sanitizeEncoderConfig(0);
  assert.strictEqual(zeroFpsConfig.fps, 15, 'Below min fps must be clamped to 15fps');

  // Standard 30 fps
  const normalConfig = RoundVideoKeyframeAndCodecGuard.sanitizeEncoderConfig(30);
  assert.strictEqual(normalConfig.fps, 30);
  console.log('✓ Test 2: RoundVideoKeyframeAndCodecGuard passed');

  // --- Test 3: FractionalScalePixelSnapper (#26366) ---
  // On 150% scaling (DPR = 1.5), 10.3 CSS px -> 10.3 * 1.5 = 15.45 physical -> round to 15 physical -> 10.0 CSS px
  const snapped = FractionalScalePixelSnapper.snapToPhysicalPixels(10.3, 1.5);
  assert.strictEqual(snapped, 10.0);

  const snappedRect = FractionalScalePixelSnapper.snapRect({ x: 0.33, y: 0.67, width: 99.9, height: 50.1 }, 2.0);
  assert.strictEqual(snappedRect.x, 0.5);
  assert.strictEqual(snappedRect.width, 100);
  console.log('✓ Test 3: FractionalScalePixelSnapper passed');

  // --- Test 4: StoryAndAvatarProfileSyncEngine (#31314) ---
  const syncEngine = new StoryAndAvatarProfileSyncEngine();
  let receivedUpdate = null;

  const unsubscribe = syncEngine.subscribe(evt => {
    receivedUpdate = evt;
  });

  syncEngine.updateProfile(12345, 'Dr. Ershad Zolfi', 'https://avatar.png');
  assert.ok(receivedUpdate !== null);
  assert.strictEqual(receivedUpdate.newName, 'Dr. Ershad Zolfi');
  assert.strictEqual(syncEngine.getProfile(12345)?.newName, 'Dr. Ershad Zolfi');

  unsubscribe();
  console.log('✓ Test 4: StoryAndAvatarProfileSyncEngine passed');

  console.log('[Phase 18 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
