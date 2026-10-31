import assert from 'node:assert/strict';
import { GroupVoiceAndCallSignalingGovernor } from '../src/services/groupVoiceAndCallSignalingGovernor.ts';

console.log('🧪 Starting Phase 66 Group Voice & Call Signaling Verification Suite...');

const governor = new GroupVoiceAndCallSignalingGovernor();

// 1. Call Protocol Version Negotiation (morethanwords/tweb #243)
console.log('  Testing call protocol layer negotiation...');
const protocolConfig = governor.getCallProtocolConfig();
assert.equal(protocolConfig.minLayer, 65);
assert.equal(protocolConfig.maxLayer, 93);
assert.equal(governor.validateProtocolLayer(92), true);
assert.equal(governor.validateProtocolLayer(50), false, 'Layer 50 should be rejected as outdated');
assert.equal(governor.validateProtocolLayer(105), false, 'Layer 105 should be rejected as unsupported');
console.log('  ✅ Call protocol layer negotiation verified');

// 2. SDP SSRC-Group Sanitizer (Ajaxy/telegram-tt #299)
console.log('  Testing SDP SSRC-group FID sanitization...');
const malformedSdp = [
  'v=0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'a=ssrc:1001 cname:audio',
  'a=ssrc-group:FID 1001', // Malformed FID with only 1 SSRC!
  'm=video 9 UDP/TLS/RTP/SAVPF 96',
  'a=ssrc-group:FID 2001 2002', // Valid FID with exactly 2 SSRCs
].join('\r\n');

const cleanedSdp = governor.sanitizeSdpOffer(malformedSdp);
assert.ok(!cleanedSdp.includes('a=ssrc-group:FID 1001'), 'Malformed single-SSRC FID must be stripped');
assert.ok(cleanedSdp.includes('a=ssrc-group:FID 2001 2002'), 'Valid 2-SSRC FID must be preserved');
console.log('  ✅ SDP SSRC-group FID sanitization verified');

// 3. WebRTC ICE Connection Watchdog & Restart (kotatogram/kotatogram-desktop #50)
console.log('  Testing ICE connection state watchdog & restart...');
// Initial connected state -> healthy
const iceConnected = governor.evaluateIceConnectionState('connected', 1000);
assert.equal(iceConnected.shouldRestartIce, false);
assert.equal(iceConnected.status, 'healthy');

// Brief disconnected glitch (1000ms later) -> evaluate without restart
const iceBriefDisconnect = governor.evaluateIceConnectionState('disconnected', 2000);
assert.equal(iceBriefDisconnect.shouldRestartIce, false);
assert.equal(iceBriefDisconnect.status, 'warning_evaluating');

// Prolonged disconnected state (4000ms later) -> triggers ICE restart!
const iceProlongedDisconnect = governor.evaluateIceConnectionState('disconnected', 5500);
assert.equal(iceProlongedDisconnect.shouldRestartIce, true);
assert.equal(iceProlongedDisconnect.status, 'stalled_restarting');
console.log('  ✅ ICE connection watchdog & restart verified');

// 4. AudioContext Autoplay Resume State (morethanwords/tweb #489)
console.log('  Testing AudioContext resume state evaluation...');
const suspendedCheck = governor.evaluateAudioContextResume('suspended');
assert.equal(suspendedCheck.requiresUserGestureResume, true);
assert.equal(suspendedCheck.canPlayAudio, false);

const runningCheck = governor.evaluateAudioContextResume('running');
assert.equal(runningCheck.requiresUserGestureResume, false);
assert.equal(runningCheck.canPlayAudio, true);
console.log('  ✅ AudioContext resume state verified');

// 5. Participant Join/Leave Auditory Cues (kotatogram/kotatogram-desktop #165)
console.log('  Testing participant join/leave sound cues & rate limiting...');
// Normal small group call (5 participants) -> sound cue played
const cue1 = governor.evaluateJoinLeaveCue('join', 5, 1000);
assert.equal(cue1.shouldPlayCue, true);
assert.equal(cue1.soundType, 'join_chime');

// Second rapid join 500ms later -> suppressed by burst rate limiter
const cueRapid = governor.evaluateJoinLeaveCue('join', 6, 1500);
assert.equal(cueRapid.shouldPlayCue, false);

// Leave cue after 3 seconds -> permitted
const cueLeave = governor.evaluateJoinLeaveCue('leave', 6, 4500);
assert.equal(cueLeave.shouldPlayCue, true);
assert.equal(cueLeave.soundType, 'leave_chime');

// Massive group call (50 participants) -> chimes automatically muted
const cueMassive = governor.evaluateJoinLeaveCue('join', 50, 10000);
assert.equal(cueMassive.shouldPlayCue, false);
console.log('  ✅ Participant join/leave auditory cues verified');

// 6. Dynamic Ongoing Call Participant Management (UnigramDev/Unigram #3481)
console.log('  Testing dynamic participant management in ongoing call...');
governor.addOrUpdateParticipant({
  userId: 'user_bob',
  name: 'Bob',
  state: 'connected',
  isMuted: false,
  isSpeaking: true,
});
governor.addOrUpdateParticipant({
  userId: 'user_carol',
  name: 'Carol',
  state: 'invited',
  isMuted: true,
  isSpeaking: false,
});

assert.equal(governor.getConnectedParticipantCount(), 1);

// Carol connects
governor.addOrUpdateParticipant({
  userId: 'user_carol',
  name: 'Carol',
  state: 'connected',
  isMuted: false,
  isSpeaking: false,
});
assert.equal(governor.getConnectedParticipantCount(), 2);

// Bob leaves
governor.removeParticipant('user_bob');
assert.equal(governor.getConnectedParticipantCount(), 1);
assert.equal(governor.getParticipant('user_bob'), undefined);
console.log('  ✅ Dynamic ongoing call participant management verified');

console.log('✨ All Phase 66 Verification Tests Passed 100% Successfully!');
