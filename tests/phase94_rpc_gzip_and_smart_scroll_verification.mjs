import assert from 'node:assert';
import { RpcGzipAndSmartScrollGovernor } from '../src/services/rpcGzipAndSmartScrollGovernor.ts';

console.log('🧪 Starting Phase 94 RPC Gzip & Smart Scroll Lock Verification Suite...');

const governor = new RpcGzipAndSmartScrollGovernor();

// 1. Gzip Nesting Protection (TDesktop #31394)
console.log('  Testing RPC Gzip nesting depth protection...');
// Normal shallow gzip payload (depth 1)
const normalGzip = governor.unpackGzipPayload([0x1f, 0x8b, 0x08], 1);
assert.strictEqual(normalGzip.success, true);
assert.strictEqual(normalGzip.depth, 1);
assert.ok(normalGzip.data);

// Dangerous deep nesting payload (depth 65)
const deepGzip = governor.unpackGzipPayload([0x1f, 0x8b, 0x08], 65);
assert.strictEqual(deepGzip.success, false);
assert.strictEqual(deepGzip.data, null);
assert.ok(deepGzip.error?.includes('safety limit'));
console.log('  ✅ RPC Gzip nesting depth protection verified');

// 2. Video Decoder Fallback (TDesktop #30862, #31429)
console.log('  Testing video decoder hardware-to-software fallback...');
const initialHw = governor.resolveVideoDecoderPipeline(true, 0);
assert.strictEqual(initialHw.decoderType, 'gpu_hardware');
assert.strictEqual(initialHw.requiresSoftwareFallback, false);

// After crash occurred
const crashedFallback = governor.resolveVideoDecoderPipeline(true, 1);
assert.strictEqual(crashedFallback.decoderType, 'cpu_software');
assert.strictEqual(crashedFallback.requiresSoftwareFallback, true);
console.log('  ✅ Video decoder fallback verified');

// 3. Async Attachment Menu Preparation (Kotatogram #113)
console.log('  Testing async attachment menu preparation...');
let progressCalled = false;
const menuRes = await governor.prepareAttachmentMenuAsync(() => { progressCalled = true; });
assert.strictEqual(menuRes.ready, true);
assert.strictEqual(menuRes.optionsCount, 5);
assert.strictEqual(progressCalled, true);
console.log('  ✅ Async attachment menu preparation verified');

// 4. Voice Recording Buffer Bounds (Kotatogram #174)
console.log('  Testing voice recording buffer overflow protection...');
const voiceSession = governor.createVoiceRecordingSession(3600, 1024 * 1024); // 1MB limit for test
// Chunk 1: 500KB -> allowed
const chunk1 = governor.appendVoiceChunk(voiceSession, 500 * 1024, 5, 1024 * 1024);
assert.strictEqual(chunk1.allowed, true);
assert.strictEqual(voiceSession.totalBytes, 500 * 1024);

// Chunk 2: 600KB -> exceeds 1MB limit -> aborted safely without crash
const chunk2 = governor.appendVoiceChunk(voiceSession, 600 * 1024, 6, 1024 * 1024);
assert.strictEqual(chunk2.allowed, false);
assert.strictEqual(voiceSession.isAborted, true);
assert.ok(chunk2.error?.includes('limit exceeded'));
console.log('  ✅ Voice recording buffer overflow protection verified');

// 5. Smart Scroll Lock on History (Ajaxy #519)
console.log('  Testing smart scroll lock on reading back-history...');
// User is reading history (scrolled up 500px from bottom)
const historyScroll = governor.calculateScrollLock(1000, 2000, 500, 150);
assert.strictEqual(historyScroll.isReadingHistory, true);
assert.strictEqual(historyScroll.shouldScrollToBottom, false);
assert.strictEqual(historyScroll.showNewMessagePill, true);

// User is near bottom (scrolled within 50px of bottom)
const bottomScroll = governor.calculateScrollLock(1460, 2000, 500, 150);
assert.strictEqual(bottomScroll.isReadingHistory, false);
assert.strictEqual(bottomScroll.shouldScrollToBottom, true);
assert.strictEqual(bottomScroll.showNewMessagePill, false);
console.log('  ✅ Smart scroll lock on history verified');

// 6. Chat History Retention on Removal (Kotatogram #150)
console.log('  Testing chat history retention on group removal...');
const kept = governor.handleRemovedFromGroup('group_123', true);
assert.strictEqual(kept.retainedLocally, true);
assert.strictEqual(kept.chatStatus, 'archived_readonly');

const notKept = governor.handleRemovedFromGroup('group_123', false);
assert.strictEqual(notKept.retainedLocally, false);
assert.strictEqual(notKept.chatStatus, 'purged');
console.log('  ✅ Chat history retention on removal verified');

// 7. Channel/Group Origin Attribution (TDesktop #68)
console.log('  Testing message origin attribution pill...');
const channelPill = governor.formatOriginAttribution('Guidegram News', true);
assert.strictEqual(channelPill.badgeType, 'channel');
assert.strictEqual(channelPill.label, 'Channel: Guidegram News');

const groupPill = governor.formatOriginAttribution('Dev Discussion', false);
assert.strictEqual(groupPill.badgeType, 'group');
assert.strictEqual(groupPill.label, 'Group: Dev Discussion');
console.log('  ✅ Message origin attribution pill verified');

console.log('✨ All Phase 94 Verification Tests Passed 100% Successfully!');
