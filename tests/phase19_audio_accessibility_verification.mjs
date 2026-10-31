import assert from 'node:assert';
import {
  ActiveDesktopSessionMuteCoordinator,
  GranularAudioVolumeAndOutputManager,
  PitchPreservedSpeedPlaybackEngine,
  ModernStandbyAudioReleaseGuard,
} from '../src/services/audioAccessibilityAndPlaybackService.ts';

function runTests() {
  console.log('[Phase 19 Verification] Starting tests...');

  // --- Test 1: ActiveDesktopSessionMuteCoordinator (#277) ---
  const sessionMute = new ActiveDesktopSessionMuteCoordinator();
  const t0 = 10000;
  sessionMute.recordUserActivity(t0);

  // 10 seconds later: desktop is active
  assert.strictEqual(sessionMute.shouldMuteMobileNotifications(t0 + 10000), true, 'Active desktop must suppress mobile sound');

  // 70 seconds later: user walked away / desktop idle
  assert.strictEqual(sessionMute.shouldMuteMobileNotifications(t0 + 70000), false, 'Idle desktop must ring mobile');
  console.log('✓ Test 1: ActiveDesktopSessionMuteCoordinator passed');

  // --- Test 2: GranularAudioVolumeAndOutputManager (#151, #418) ---
  const audioMgr = new GranularAudioVolumeAndOutputManager();
  assert.strictEqual(audioMgr.getVolume(), 1.0);

  audioMgr.setVolume(0.75);
  assert.strictEqual(audioMgr.getVolume(), 0.75);

  // Mute toggle
  const muteRes = audioMgr.toggleMute();
  assert.strictEqual(muteRes.isMuted, true);
  assert.strictEqual(audioMgr.getVolume(), 0);

  // Unmute toggle restores 0.75
  const unmuteRes = audioMgr.toggleMute();
  assert.strictEqual(unmuteRes.isMuted, false);
  assert.strictEqual(audioMgr.getVolume(), 0.75);

  // Output device
  audioMgr.setOutputDevice('speakers_usb_stereo');
  assert.strictEqual(audioMgr.getOutputDevice(), 'speakers_usb_stereo');
  console.log('✓ Test 2: GranularAudioVolumeAndOutputManager passed');

  // --- Test 3: PitchPreservedSpeedPlaybackEngine (#384) ---
  const speedEngine = new PitchPreservedSpeedPlaybackEngine();
  assert.strictEqual(speedEngine.getCurrentSpeed(), 1.0);

  const step1 = speedEngine.cycleNextSpeed();
  assert.strictEqual(step1.speed, 1.25);
  assert.strictEqual(step1.preservesPitch, true);

  const step2 = speedEngine.cycleNextSpeed();
  assert.strictEqual(step2.speed, 1.5);

  const step3 = speedEngine.cycleNextSpeed();
  assert.strictEqual(step3.speed, 2.0);

  const step4 = speedEngine.cycleNextSpeed();
  assert.strictEqual(step4.speed, 1.0); // loop back
  console.log('✓ Test 3: PitchPreservedSpeedPlaybackEngine passed');

  // --- Test 4: ModernStandbyAudioReleaseGuard (#2801) ---
  const standbyGuard = new ModernStandbyAudioReleaseGuard();
  standbyGuard.setPlaybackState(true);

  let pauseCalled = false;
  let resumeCalled = false;

  const sleepRes = standbyGuard.onSystemSleep(() => {
    pauseCalled = true;
  });
  assert.strictEqual(sleepRes.wasSuspended, true);
  assert.strictEqual(pauseCalled, true);

  const wakeRes = standbyGuard.onSystemWake(() => {
    resumeCalled = true;
  });
  assert.strictEqual(wakeRes.resumed, true);
  assert.strictEqual(resumeCalled, true);
  console.log('✓ Test 4: ModernStandbyAudioReleaseGuard passed');

  console.log('[Phase 19 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
