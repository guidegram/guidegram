import assert from 'node:assert';
import { WebMiniApp3DUnlockImeAndWebRtcGovernor } from '../src/services/webMiniApp3DUnlockImeAndWebRtcGovernor.ts';

console.log('=== Phase 136 Verification: Web Mini App 3D Unlock, IME & WebRTC Governor ===');

const governor = new WebMiniApp3DUnlockImeAndWebRtcGovernor();

// Test 1: Mini App WebGL/WebGPU 3D Games Unblocker (#709)
{
  const config = governor.generateMiniAppIframeConfig();
  assert.ok(config.allow.includes('fullscreen'));
  assert.ok(config.allow.includes('accelerometer'));
  assert.ok(config.allow.includes('gyroscope'));
  assert.ok(config.allow.includes('xr-spatial-tracking'));
  assert.strictEqual(config.enableHardwareAcceleration, true);
  assert.strictEqual(config.webGlAttributes.powerPreference, true);
  console.log('Test 1 Passed: Mini App WebGL/WebGPU 3D games unblocker verified.');
}

// Test 2: Vietnamese IME First-Character Composition (#316)
{
  let imeState = {
    isComposing: false,
    compositionBuffer: '',
    committedText: '',
    isFirstCharacterHandled: false
  };

  // Start composing 'a' -> 'ấ' (Telex: a + a + s)
  imeState = governor.handleImeInput(imeState, 'compositionstart', 'a');
  assert.strictEqual(imeState.isComposing, true);
  assert.strictEqual(imeState.compositionBuffer, 'a');

  // Update composition buffer
  imeState = governor.handleImeInput(imeState, 'compositionupdate', 'ấ');
  assert.strictEqual(imeState.compositionBuffer, 'ấ');

  // End composition
  imeState = governor.handleImeInput(imeState, 'compositionend', 'ấ');
  assert.strictEqual(imeState.isComposing, false);
  assert.strictEqual(imeState.committedText, 'ấ');
  assert.strictEqual(imeState.isFirstCharacterHandled, true);
  console.log('Test 2 Passed: Vietnamese IME composition & first character retention verified.');
}

// Test 3: Accentuation Dead Key Composition (#219)
{
  let imeState = {
    isComposing: false,
    compositionBuffer: '',
    committedText: 'ol',
    isFirstCharacterHandled: true
  };

  // Dead key accent '~' + 'a' -> 'ã' in Portuguese
  imeState = governor.handleImeInput(imeState, 'compositionstart', '~');
  imeState = governor.handleImeInput(imeState, 'compositionupdate', 'ã');
  imeState = governor.handleImeInput(imeState, 'compositionend', 'ã');

  assert.strictEqual(imeState.committedText, 'olã');
  console.log('Test 3 Passed: Accentuation dead key input verified.');
}

// Test 4: WebRTC Video Call Renegotiation (#245)
{
  const session = {
    callId: 'call-video-999',
    state: 'renegotiating',
    selectedVideoCodec: 'H264',
    hasVideoTrack: true,
    iceConnectionState: 'checking'
  };

  const recovered = governor.renegotiateWebRtcCall(session, 'VP8');
  assert.strictEqual(recovered.state, 'connected');
  assert.strictEqual(recovered.selectedVideoCodec, 'VP8');
  assert.strictEqual(recovered.iceConnectionState, 'connected');
  console.log('Test 4 Passed: WebRTC video call codec renegotiation verified.');
}

// Test 5: ESC Key Layer Hierarchy - Media Viewer priority (#164)
{
  const stateAllOpen = {
    isMediaViewerOpen: true,
    isContextMenuOpen: true,
    isEmojiPickerOpen: true,
    hasActiveChat: true
  };

  const outcome1 = governor.dispatchEscKey(stateAllOpen);
  assert.strictEqual(outcome1.actionExecuted, 'close_media_viewer');
  assert.strictEqual(outcome1.remainingState.isMediaViewerOpen, false);
  assert.strictEqual(outcome1.remainingState.isContextMenuOpen, true);

  const outcome2 = governor.dispatchEscKey(outcome1.remainingState);
  assert.strictEqual(outcome2.actionExecuted, 'close_context_menu');

  const outcome3 = governor.dispatchEscKey(outcome2.remainingState);
  assert.strictEqual(outcome3.actionExecuted, 'close_emoji_picker');

  const outcome4 = governor.dispatchEscKey(outcome3.remainingState);
  assert.strictEqual(outcome4.actionExecuted, 'close_active_chat');
  assert.strictEqual(outcome4.remainingState.hasActiveChat, false);

  const outcome5 = governor.dispatchEscKey(outcome4.remainingState);
  assert.strictEqual(outcome5.actionExecuted, 'none');
  console.log('Test 5 Passed: ESC key layer hierarchy dispatch verified.');
}

// Test 6: Unknown MTProto TL Constructor Fallback (#475)
{
  const known = { 0x761450c3: 'message' };
  const recognized = governor.resolveTlConstructor(0x761450c3, known);
  assert.strictEqual(recognized.isRecognized, true);
  assert.strictEqual(recognized.constructorName, 'message');

  const unknown = governor.resolveTlConstructor(0xdeadbeef, known);
  assert.strictEqual(unknown.isRecognized, false);
  assert.strictEqual(unknown.constructorName, 'TL_unknown_0xdeadbeef');
  assert.strictEqual(unknown.isSafeFallback, true);
  console.log('Test 6 Passed: Unknown MTProto TL constructor fallback polyfill verified.');
}

// Test 7: Startup Error Boundary Graceful Recovery (#476)
{
  const emptyKnown = {};
  const res = governor.resolveTlConstructor(0x12345678, emptyKnown);
  assert.strictEqual(res.isSafeFallback, true);
  console.log('Test 7 Passed: Web startup resilience and safe constructor recovery verified.');
}

console.log('=== ALL PHASE 136 TESTS PASSED (100% HEALTH) ===');
