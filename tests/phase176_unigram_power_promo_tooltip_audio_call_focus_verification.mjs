import assert from 'node:assert/strict';
import {
  PowerSavingThrottlingGovernor,
  ResponsivePromoModalGovernor,
  TitleHoverTooltipGovernor,
  AudioDurationDisplayGovernor,
  ActiveSpeakerCallBarGovernor,
  UnreadFolderFocusShiftGovernor,
  CallLogClassificationGovernor
} from '../src/services/unigramPowerPromoTooltipAudioCallAndFocusGovernor.ts';

console.log('🧪 Starting Phase 176 Verification: Unigram Power, Promo, Tooltip, Audio, Call & Focus Hardening...');

// -------------------------------------------------------------
// Test 1: PowerSavingThrottlingGovernor (Resolves #3268)
// -------------------------------------------------------------
console.log('  Testing #3268: Power Saving Mode Autoplay & Animation Throttling...');
const powerGov = new PowerSavingThrottlingGovernor();

// Battery at 15%, unplugged -> Power saver must engage!
const lowBatteryPolicy = powerGov.evaluatePolicy({
  batteryThresholdPercent: 20,
  currentBatteryPercent: 15,
  isPluggedIn: false,
  manualPowerSaverEnabled: false
});
assert.equal(lowBatteryPolicy.powerSaverActive, true);
assert.equal(lowBatteryPolicy.autoplayStickers, false);
assert.equal(lowBatteryPolicy.autoplayVideos, false);
assert.equal(lowBatteryPolicy.enableSpringAnimations, false);
assert.equal(lowBatteryPolicy.backgroundRenderFramerate, 15);

// Plugged in at 15% -> High performance mode
const pluggedPolicy = powerGov.evaluatePolicy({
  batteryThresholdPercent: 20,
  currentBatteryPercent: 15,
  isPluggedIn: true,
  manualPowerSaverEnabled: false
});
assert.equal(pluggedPolicy.powerSaverActive, false);
assert.equal(pluggedPolicy.autoplayStickers, true);
assert.equal(pluggedPolicy.backgroundRenderFramerate, 60);
console.log('  ✅ #3268 Verified: Power saving policies dynamically throttle animations and autoplay.');

// -------------------------------------------------------------
// Test 2: ResponsivePromoModalGovernor (Resolves #2772)
// -------------------------------------------------------------
console.log('  Testing #2772: Responsive Promo Modal Resizing & Boundary Clamping...');
const promoGov = new ResponsivePromoModalGovernor();

// Compact window e.g. 400x500
const compactBounds = promoGov.computeModalBounds(400, 500);
assert.equal(compactBounds.isClipped, false);
assert.equal(compactBounds.modalWidthPx, 360); // 90% of 400
assert.equal(compactBounds.modalHeightPx, 425); // 85% of 500
assert.ok(compactBounds.scaleFactor < 1.0);

// Large window e.g. 1920x1080 -> Ideal sizes 480x560
const largeBounds = promoGov.computeModalBounds(1920, 1080);
assert.equal(largeBounds.modalWidthPx, 480);
assert.equal(largeBounds.modalHeightPx, 560);
assert.equal(largeBounds.scaleFactor, 1.0);
console.log('  ✅ #2772 Verified: Promo modal dimensions adapt smoothly without clipping.');

// -------------------------------------------------------------
// Test 3: TitleHoverTooltipGovernor (Resolves #2527)
// -------------------------------------------------------------
console.log('  Testing #2527: Truncated Title Mouse Hover Tooltip...');
const tooltipGov = new TitleHoverTooltipGovernor();

const longTitle = 'International Association of Medical and Health Informatics 2026';
// Rendered width 350px > Container max width 200px -> Truncated!
const truncatedTooltip = tooltipGov.evaluateTooltip(longTitle, 350, 200, 100, 150);
assert.equal(truncatedTooltip.isTruncated, true);
assert.equal(truncatedTooltip.tooltipVisible, true);
assert.equal(truncatedTooltip.tooltipText, longTitle);
assert.equal(truncatedTooltip.tooltipX, 110);

// Short title -> Not truncated, no tooltip needed
const shortTooltip = tooltipGov.evaluateTooltip('General Chat', 90, 200, 100, 150);
assert.equal(shortTooltip.isTruncated, false);
assert.equal(shortTooltip.tooltipVisible, false);
console.log('  ✅ #2527 Verified: Truncated chat titles display full tooltip on hover.');

// -------------------------------------------------------------
// Test 4: AudioDurationDisplayGovernor (Resolves #2366)
// -------------------------------------------------------------
console.log('  Testing #2366: Audio Duration and Remaining Time Formats...');
const audioGov = new AudioDurationDisplayGovernor();

const durationStandard = audioGov.formatAudioDuration(95, 245, false); // 01:35 / 04:05
assert.equal(durationStandard.formattedCurrent, '01:35');
assert.equal(durationStandard.formattedTotal, '04:05');
assert.equal(durationStandard.displayString, '01:35 / 04:05');

const durationRemaining = audioGov.formatAudioDuration(95, 245, true); // 01:35 / -02:30
assert.equal(durationRemaining.formattedRemaining, '-02:30');
assert.equal(durationRemaining.displayString, '01:35 / -02:30');
console.log('  ✅ #2366 Verified: Audio progress formats total and remaining time accurately.');

// -------------------------------------------------------------
// Test 5: ActiveSpeakerCallBarGovernor (Resolves #2241)
// -------------------------------------------------------------
console.log('  Testing #2241: Group Call Active Dominant Speaker Highlighting...');
const callGov = new ActiveSpeakerCallBarGovernor();

const dominantSpeaker = callGov.identifyDominantSpeaker([
  { userId: 'u1', displayName: 'Alice', audioLevel: 0.05 }, // Whisper
  { userId: 'u2', displayName: 'Bob', audioLevel: 0.75 },   // Active speaker!
  { userId: 'u3', displayName: 'Charlie', audioLevel: 0.20 }
]);

assert.notEqual(dominantSpeaker, null);
assert.equal(dominantSpeaker.userId, 'u2');
assert.equal(dominantSpeaker.displayName, 'Bob');
assert.equal(dominantSpeaker.isSpeaking, true);
assert.equal(dominantSpeaker.highlightColor, '#22C55E');
console.log('  ✅ #2241 Verified: Dominant speaker in group call bar highlighted dynamically.');

// -------------------------------------------------------------
// Test 6: UnreadFolderFocusShiftGovernor (Resolves #2052)
// -------------------------------------------------------------
console.log('  Testing #2052: Keyboard Focus Shift When Removing Read Chat in Unread Folder...');
const focusGov = new UnreadFolderFocusShiftGovernor();

const chatFolderList = ['chat_1', 'chat_2', 'chat_3', 'chat_4'];

// User marks 'chat_2' as read -> 'chat_2' removed, focus should shift to 'chat_3'
const shift1 = focusGov.shiftFocusOnRead(chatFolderList, 'chat_2');
assert.equal(shift1.focusRestored, true);
assert.equal(shift1.newFocusedChatId, 'chat_3');

// User marks last item 'chat_4' as read -> focus shifts to previous ('chat_3')
const shiftLast = focusGov.shiftFocusOnRead(['chat_1', 'chat_4'], 'chat_4');
assert.equal(shiftLast.focusRestored, true);
assert.equal(shiftLast.newFocusedChatId, 'chat_1');
console.log('  ✅ #2052 Verified: Keyboard focus smoothly preserved across unread chat removals.');

// -------------------------------------------------------------
// Test 7: CallLogClassificationGovernor (Resolves #2015)
// -------------------------------------------------------------
console.log('  Testing #2015: Calls Log Entry Badge Classification (Video vs Voice)...');
const callLogGov = new CallLogClassificationGovernor();

const videoCall = callLogGov.classifyCall({
  id: 'c_01',
  direction: 'incoming',
  isVideo: true,
  wasMissed: false,
  durationSec: 320
});
assert.equal(videoCall.badgeType, 'incoming_video');
assert.equal(videoCall.iconName, 'video_call_incoming_green');

const missedVoice = callLogGov.classifyCall({
  id: 'c_02',
  direction: 'incoming',
  isVideo: false,
  wasMissed: true,
  durationSec: 0
});
assert.equal(missedVoice.badgeType, 'missed_voice');
assert.equal(missedVoice.iconName, 'phone_missed_red');
console.log('  ✅ #2015 Verified: Video calls vs voice calls distinctly classified in call logs.');

console.log('\n🎉 ALL 7 UNIGRAM HARDENING TESTS PASSED WITH 100% SUCCESS!');
