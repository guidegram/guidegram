import assert from 'node:assert';
import { AudioWaveformAndVoiceGovernor } from '../src/services/audioWaveformAndVoiceGovernor.ts';

console.log('🧪 Starting Phase 71 Audio Waveform & Voice Message Verification Suite...');

const governor = new AudioWaveformAndVoiceGovernor();

// 1. Test mic button debounce on rapid double clicks (Unigram #2243)
console.log('  Testing mic button double-click debouncing...');
const t0 = 10000;
const firstClick = governor.handleMicButtonClick(t0);
assert.strictEqual(firstClick.action, 'started');
assert.strictEqual(firstClick.status, 'recording');

// Click 100ms later (rapid double-click)
const secondClick = governor.handleMicButtonClick(t0 + 100);
assert.strictEqual(secondClick.action, 'ignored_debounce');
assert.strictEqual(secondClick.status, 'recording');

// Click after threshold (e.g. 400ms later)
const thirdClick = governor.handleMicButtonClick(t0 + 450);
assert.strictEqual(thirdClick.action, 'stopped');
assert.strictEqual(thirdClick.status, 'stopped');
console.log('  ✅ Mic button debouncing verified');

// 2. Test AudioContext resumption on user gesture (morethanwords #6 & Ajaxy #476)
console.log('  Testing AudioContext gesture resumption...');
assert.strictEqual(governor.isAudioContextReady(), false);
assert.strictEqual(governor.resumeAudioContext(), true);
assert.strictEqual(governor.isAudioContextReady(), true);
console.log('  ✅ AudioContext gesture resumption verified');

// 3. Test explicit microphone routing & AGC gain (Telegram-iOS #2351 & Unigram #3452)
console.log('  Testing microphone device routing and AGC boost...');
const rec = governor.startRecording('headset_mic_usb_01', 1.8);
assert.strictEqual(rec.status, 'recording');
assert.strictEqual(rec.activeDeviceId, 'headset_mic_usb_01');
assert.strictEqual(rec.micGain, 1.8);
assert.strictEqual(rec.isAgcEnabled, true);
assert.strictEqual(rec.selectedMimeType, 'audio/webm;codecs=opus');
console.log('  ✅ Microphone device routing and AGC boost verified');

// 4. Test 5-bit waveform compression (64 bars, 0-31)
console.log('  Testing waveform compression to 64 5-bit bars...');
const syntheticAmplitudes = [];
for (let i = 0; i < 500; i++) {
  syntheticAmplitudes.push(Math.sin(i / 10) * 0.85);
}

const recorded = governor.stopRecording(syntheticAmplitudes);
assert.strictEqual(recorded.waveform.length, 64);
for (const bar of recorded.waveform) {
  assert.ok(bar >= 0 && bar <= 31, `Bar value ${bar} outside 0-31 range`);
}
assert.ok(recorded.blobUrl.startsWith('blob:guidegram/voice_'));
console.log('  ✅ Waveform compression to 64 bars verified');

// 5. Test voice playback and pitch preservation (Unigram #2312)
console.log('  Testing voice playback and pitch preservation...');
const playState = governor.playVoiceMessage('msg_voice_777', 45, 1.0);
assert.strictEqual(playState.isPlaying, true);
assert.strictEqual(playState.currentMessageId, 'msg_voice_777');
assert.strictEqual(playState.duration, 45);
assert.strictEqual(playState.preservesPitch, true);

// Cycle speed
const rate1 = governor.cyclePlaybackRate();
assert.strictEqual(rate1, 1.5);
const rate2 = governor.cyclePlaybackRate();
assert.strictEqual(rate2, 2.0);
const rate3 = governor.cyclePlaybackRate();
assert.strictEqual(rate3, 1.0);
console.log('  ✅ Voice playback and speed cycling verified');

// 6. Test keyboard shortcuts (Unigram #2312)
console.log('  Testing keyboard shortcuts navigation...');
// Seek forward 5s with ArrowRight
const afterSeek = governor.handleKeyboardShortcut('ArrowRight');
assert.strictEqual(afterSeek?.currentTime, 5);

// Seek backward 5s with ArrowLeft
governor.handleKeyboardShortcut('ArrowLeft');
assert.strictEqual(governor.getPlaybackState().currentTime, 0);

// Space to pause
governor.handleKeyboardShortcut('Space');
assert.strictEqual(governor.getPlaybackState().isPlaying, false);

// Space to resume
governor.handleKeyboardShortcut('Space');
assert.strictEqual(governor.getPlaybackState().isPlaying, true);

// ArrowUp to cycle speed
governor.handleKeyboardShortcut('ArrowUp');
assert.strictEqual(governor.getPlaybackState().playbackRate, 1.5);
console.log('  ✅ Keyboard shortcuts navigation verified');

// 7. Test decoupled volume controls (Unigram #3452)
console.log('  Testing decoupled voice vs media volumes...');
governor.setVoiceVolume(0.95);
governor.setMediaVolume(0.40);
assert.strictEqual(governor.getVoiceVolume(), 0.95);
assert.strictEqual(governor.getMediaVolume(), 0.40);
console.log('  ✅ Decoupled volume controls verified');

console.log('✨ All Phase 71 Verification Tests Passed 100% Successfully!');
