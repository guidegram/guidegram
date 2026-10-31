import assert from 'node:assert';
import { WebRtcAndMediaDeviceGovernor } from '../src/services/webRtcAndMediaDeviceGovernor.ts';

console.log('🧪 Starting Phase 89 WebRTC & Media Device Verification Suite...');

const governor = new WebRtcAndMediaDeviceGovernor();

// 1. Audio Device Selection & Routing (Kotatogram #393, morethanwords #442)
console.log('  Testing audio device selection & routing...');
const inputs = governor.getDevices('audioinput');
assert.strictEqual(inputs.length, 2);
assert.strictEqual(governor.getInputDevice(), 'default');

assert.strictEqual(governor.setInputDevice('mic_usb'), true);
assert.strictEqual(governor.getInputDevice(), 'mic_usb');

assert.strictEqual(governor.setOutputDevice('headphones_bt'), true);
assert.strictEqual(governor.getOutputDevice(), 'headphones_bt');
console.log('  ✅ Audio device selection & routing verified');

// 2. Microphone RMS Volume Level Calculation (morethanwords #442)
console.log('  Testing mic RMS level meter calculation...');
assert.strictEqual(governor.calculateMicLevel([]), 0);
const quietSamples = [0.05, 0.05, -0.05, -0.05];
const quietLevel = governor.calculateMicLevel(quietSamples);
assert.strictEqual(quietLevel, 5);

const loudSamples = [0.8, 0.9, -0.7, -0.8];
const loudLevel = governor.calculateMicLevel(loudSamples);
assert.strictEqual(loudLevel, 80);
console.log('  ✅ Mic RMS level meter verified');

// 3. WebRTC SDP Normalization for Firefox & Opus (morethanwords #106, Ajaxy #112)
console.log('  Testing WebRTC SDP normalization for Firefox & Opus...');
const rawSdp = `v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n`;

const normalizedFirefox = governor.normalizeSdp(rawSdp, true);
assert.ok(normalizedFirefox.includes('stereo=1'));
assert.ok(normalizedFirefox.includes('maxaveragebitrate=128000'));
assert.ok(normalizedFirefox.includes('a=mid:0'));
assert.ok(normalizedFirefox.includes('a=mid:1'));
console.log('  ✅ WebRTC SDP normalization verified');

// 4. Call Protocol Negotiation (morethanwords #447, Ajaxy #388)
console.log('  Testing call protocol version negotiation...');
// Peer supports versions 6, 8, 12 -> Highest is 12
const neg1 = governor.negotiateCallProtocol([6, 8, 12]);
assert.strictEqual(neg1.success, true);
assert.strictEqual(neg1.negotiatedVersion, 12);

// Peer supports only ancient version 1, 2 -> Fails gracefully with friendly upgrade prompt
const negOld = governor.negotiateCallProtocol([1, 2]);
assert.strictEqual(negOld.success, false);
assert.ok(negOld.error?.includes('upgrade'));
console.log('  ✅ Call protocol version negotiation verified');

// 5. Fullscreen & Picture-in-Picture Modes (Ajaxy #96)
console.log('  Testing call fullscreen & PiP state toggling...');
governor.setFullScreen(true);
assert.strictEqual(governor.isFullScreen(), true);
assert.strictEqual(governor.isPictureInPicture(), false);

governor.setPictureInPicture(true);
assert.strictEqual(governor.isPictureInPicture(), true);
assert.strictEqual(governor.isFullScreen(), false); // Mutually exclusive
console.log('  ✅ Call fullscreen & PiP state toggling verified');

// 6. Deterministic Playlist Shuffle (morethanwords #234)
console.log('  Testing deterministic playlist shuffle...');
const playlist = [
  { id: 't1', title: 'Song A', duration: 180, mimeType: 'audio/mp3' },
  { id: 't2', title: 'Song B', duration: 200, mimeType: 'audio/mp3' },
  { id: 't3', title: 'Song C', duration: 220, mimeType: 'audio/mp3' },
  { id: 't4', title: 'Song D', duration: 240, mimeType: 'audio/mp3' }
];

const shuffled1 = governor.shufflePlaylist(playlist, 100);
const shuffled2 = governor.shufflePlaylist(playlist, 100);
assert.strictEqual(shuffled1.length, 4);
assert.deepStrictEqual(shuffled1.map(t => t.id), shuffled2.map(t => t.id)); // Deterministic
console.log('  ✅ Deterministic playlist shuffle verified');

// 7. Audio Codec & MP3 Fallback Decoder Strategy (morethanwords #398)
console.log('  Testing audio decoder strategy resolution...');
const mp3Strategy = governor.resolveAudioCodecStrategy('audio/mp3');
assert.strictEqual(mp3Strategy.decoderType, 'webaudio_mp3_decoder');
assert.strictEqual(mp3Strategy.useWebAudioFallback, true);

const oggStrategy = governor.resolveAudioCodecStrategy('audio/ogg; codecs=opus');
assert.strictEqual(oggStrategy.decoderType, 'opus_wasm_decoder');
console.log('  ✅ Audio decoder strategy resolution verified');

console.log('✨ All Phase 89 Verification Tests Passed 100% Successfully!');
