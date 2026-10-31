import assert from 'node:assert/strict';
import { AudioVideoCodecAndStreamPipelineGovernor } from '../src/services/audioVideoCodecAndStreamPipelineGovernor.ts';

console.log('🧪 Starting Phase 48 Audio-Video Codec Pipeline & Audio Focus Verification Suite...');

// 1. Visualizer GPU Throttling (tdesktop #31481)
{
  console.log('  Testing visualizer GPU throttling & power save mode...');
  // Case A: Window hidden / minimized -> 0fps, rendering disabled
  const hiddenPolicy = AudioVideoCodecAndStreamPipelineGovernor.calculateVisualizerRenderPolicy(false, false, true);
  assert.strictEqual(hiddenPolicy.fpsLimit, 0);
  assert.strictEqual(hiddenPolicy.isRenderingEnabled, false);
  assert.strictEqual(hiddenPolicy.powerSaveMode, true);

  // Case B: Window visible but unfocused -> 15fps throttled
  const unfocusedPolicy = AudioVideoCodecAndStreamPipelineGovernor.calculateVisualizerRenderPolicy(true, false, true);
  assert.strictEqual(unfocusedPolicy.fpsLimit, 15);
  assert.strictEqual(unfocusedPolicy.isRenderingEnabled, true);
  assert.strictEqual(unfocusedPolicy.powerSaveMode, true);

  // Case C: Active focused window -> 60fps full smooth rendering
  const activePolicy = AudioVideoCodecAndStreamPipelineGovernor.calculateVisualizerRenderPolicy(true, true, true);
  assert.strictEqual(activePolicy.fpsLimit, 60);
  assert.strictEqual(activePolicy.isRenderingEnabled, true);
  assert.strictEqual(activePolicy.powerSaveMode, false);
  console.log('  ✅ Visualizer GPU throttling verified');
}

// 2. Audio Output Device Disconnect Fallback (tdesktop #31489)
{
  console.log('  Testing audio output device disconnect & fallback...');
  const governor = new AudioVideoCodecAndStreamPipelineGovernor();

  // Bluetooth headset disconnects
  const recovered = governor.handleAudioDeviceFailure('bluetooth_headset_device_1');
  assert.strictEqual(recovered.currentDeviceId, 'default');
  assert.strictEqual(recovered.isFallbackActive, true);
  assert.strictEqual(recovered.status, 'operational');
  assert.strictEqual(recovered.recoveryAttempts, 1);
  console.log('  ✅ Audio output device fallback verified');
}

// 3. Resilient Multi-Codec Fallback Pipeline (kotatogram #327)
{
  console.log('  Testing audio codec fallback pipeline selection...');
  // System supports Opus and AAC
  const supportedA = ['audio/ogg; codecs=opus', 'audio/mp4; codecs=mp4a.40.2'];
  const pipelineA = AudioVideoCodecAndStreamPipelineGovernor.resolveAudioCodecPipeline(supportedA);
  assert.strictEqual(pipelineA.mimeType, 'audio/ogg; codecs=opus');
  assert.strictEqual(pipelineA.isHardwareAccelerated, true);
  assert.strictEqual(pipelineA.fallbackChain[0], 'audio/mp4; codecs=mp4a.40.2');

  // FFmpeg broken, only basic MP3/WAV supported
  const supportedB = ['audio/mpeg', 'audio/wav'];
  const pipelineB = AudioVideoCodecAndStreamPipelineGovernor.resolveAudioCodecPipeline(supportedB);
  assert.strictEqual(pipelineB.mimeType, 'audio/mpeg');
  assert.strictEqual(pipelineB.fallbackChain[0], 'audio/wav');
  console.log('  ✅ Multi-codec fallback pipeline verified');
}

// 4. Microphone Permission & Device Health Probe (tdesktop #31356)
{
  console.log('  Testing microphone permission probe...');
  // Valid mic present and granted
  const granted = AudioVideoCodecAndStreamPipelineGovernor.probeMicrophonePermission(
    true,
    [{ kind: 'audioinput', label: 'Realtek High Definition Audio' }],
    'granted'
  );
  assert.strictEqual(granted.hasAccess, true);
  assert.strictEqual(granted.permissionState, 'granted');
  assert.strictEqual(granted.deviceLabel, 'Realtek High Definition Audio');

  // Mic permission denied by Windows OS
  const denied = AudioVideoCodecAndStreamPipelineGovernor.probeMicrophonePermission(
    true,
    [{ kind: 'audioinput', label: 'Realtek Audio' }],
    'denied'
  );
  assert.strictEqual(denied.hasAccess, false);
  assert.strictEqual(denied.permissionState, 'denied');
  assert.ok(denied.actionRequired?.includes('denied in OS settings'));

  // No physical microphone hardware
  const noDevice = AudioVideoCodecAndStreamPipelineGovernor.probeMicrophonePermission(true, []);
  assert.strictEqual(noDevice.hasAccess, false);
  assert.strictEqual(noDevice.permissionState, 'device_not_found');
  console.log('  ✅ Microphone permission probe verified');
}

// 5. Video Call Popout Always-On-Top Pin State (tdesktop #31468)
{
  console.log('  Testing video popout always-on-top pin state...');
  // Toggle from false -> true
  const pinned = AudioVideoCodecAndStreamPipelineGovernor.updatePopoutPinState('pip_call_window', false);
  assert.strictEqual(pinned.isAlwaysOnTop, true);
  assert.strictEqual(pinned.windowId, 'pip_call_window');

  // Explicit unpin
  const unpinned = AudioVideoCodecAndStreamPipelineGovernor.updatePopoutPinState('pip_call_window', true, false);
  assert.strictEqual(unpinned.isAlwaysOnTop, false);
  console.log('  ✅ Video popout pin state verified');
}

console.log('✨ All Phase 48 Verification Tests Passed 100% Successfully!');
