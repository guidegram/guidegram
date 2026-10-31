import assert from 'node:assert';
import { LiveStreamAndVideoBroadcastGovernor } from '../src/services/liveStreamAndVideoBroadcastGovernor.ts';

console.log('🧪 Starting Phase 81 Live Stream & Video Broadcast Verification Suite...');

const governor = new LiveStreamAndVideoBroadcastGovernor();

// 1. Test Broadcast Session Creation & HLS Quality Variants (kotatogram #399)
console.log('  Testing live broadcast creation & quality ladders...');
const session = governor.createBroadcastSession('-100123456', 'Weekly Engineering AMA');
assert.ok(session.id.startsWith('live_'));
assert.strictEqual(session.chatId, '-100123456');
assert.strictEqual(session.isLive, true);
assert.strictEqual(session.qualityVariants.length, 5);
assert.ok(session.qualityVariants.some(q => q.quality === '1080p' && q.fps === 60));
assert.ok(session.qualityVariants.some(q => q.quality === '720p'));
console.log('  ✅ Live broadcast creation and quality ladders verified');

// 2. Test Broadcast Invite Link Generation (Unigram #2663)
console.log('  Testing broadcast invite link generation...');
const inviteLink = governor.generateBroadcastInviteLink(session.id);
assert.ok(inviteLink.includes(`t.me/live/-100123456?stream=${session.id}`));
console.log('  ✅ Broadcast invite link generation verified');

// 3. Test Quality Variant Selection (Telegram-iOS #2293)
console.log('  Testing quality variant selection...');
const selected720 = governor.selectStreamQuality(session.id, '720p');
assert.strictEqual(selected720.activeVariant.quality, '720p');
assert.ok(selected720.hlsUrl.includes('720.m3u8'));
console.log('  ✅ Quality variant selection verified');

// 4. Test Floating Picture-in-Picture & Playlist Autoplay (kotatogram #252)
console.log('  Testing floating PiP window & playlist autoplay...');
const pip = governor.openFloatingPipWindow('video_1', ['video_1', 'video_2', 'video_3'], true);
assert.strictEqual(pip.isOpen, true);
assert.strictEqual(pip.currentMediaId, 'video_1');
assert.strictEqual(pip.autoPlayNext, true);

// Next in playlist
const next1 = governor.nextInPipPlaylist();
assert.strictEqual(next1.hasMore, true);
assert.strictEqual(next1.currentMediaId, 'video_2');

const next2 = governor.nextInPipPlaylist();
assert.strictEqual(next2.hasMore, true);
assert.strictEqual(next2.currentMediaId, 'video_3');

const next3 = governor.nextInPipPlaylist();
assert.strictEqual(next3.hasMore, false);
assert.strictEqual(next3.currentMediaId, null);

governor.closeFloatingPipWindow();
assert.strictEqual(governor.getPipState().isOpen, false);
console.log('  ✅ Floating PiP window & playlist autoplay verified');

// 5. Test Video Container Upload Detection (kotatogram #400)
console.log('  Testing video upload container detection...');
const mkvCheck = governor.detectVideoUploadContainer('tutorial.mkv', 'video/x-matroska');
assert.strictEqual(mkvCheck.isStreamableVideo, true);
assert.strictEqual(mkvCheck.targetContainer, 'mkv_streamable');

const mp4Check = governor.detectVideoUploadContainer('movie.mp4', 'video/mp4');
assert.strictEqual(mp4Check.isStreamableVideo, true);
assert.strictEqual(mp4Check.targetContainer, 'mp4');

const zipCheck = governor.detectVideoUploadContainer('archive.zip', 'application/zip');
assert.strictEqual(zipCheck.isStreamableVideo, false);
assert.strictEqual(zipCheck.targetContainer, 'raw_document');
console.log('  ✅ Video upload container detection verified');

// 6. Test View-Once Video Playback Lifecycle (Unigram #3313)
console.log('  Testing view-once video playback lifecycle...');
const viewOnce = governor.handleViewOnceVideoPlayback('media_once_77');
assert.strictEqual(viewOnce.allowPlayback, true);
assert.strictEqual(viewOnce.burnOnComplete, true);
console.log('  ✅ View-once video playback lifecycle verified');

// 7. Test Inline Player Readiness (Ajaxy #504 & morethanwords #190)
console.log('  Testing inline video player readiness...');
const playerReady = governor.ensureInlineVideoPlayerReady('https://cdn.guidegram.org/vid.mp4');
assert.strictEqual(playerReady.ready, true);
assert.strictEqual(playerReady.canInlinePlay, true);
assert.strictEqual(playerReady.posterUrl, 'https://cdn.guidegram.org/vid.mp4?thumb=1');
console.log('  ✅ Inline video player readiness verified');

console.log('✨ All Phase 81 Verification Tests Passed 100% Successfully!');
