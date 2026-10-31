import assert from 'node:assert/strict';
import { ResilientAudioPipelineAndUploadQueueGovernor } from '../src/services/resilientAudioPipelineAndUploadQueueGovernor.ts';

console.log('🧪 Starting Phase 29 Audio Pipeline, Device Sink & Upload Queue Verification Suite...');

// 1. Audio Output Sink Device Routing (tdesktop #776, #8435)
{
  console.log('  Testing audio output device routing via setSinkId...');
  let sinkSet = '';
  const mockElement = {
    setSinkId: async (id) => {
      sinkSet = id;
    }
  };

  // Valid route
  const res1 = await ResilientAudioPipelineAndUploadQueueGovernor.routeAudioOutput(
    mockElement,
    'headphones-device-id'
  );
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.activeDeviceId, 'headphones-device-id');
  assert.strictEqual(sinkSet, 'headphones-device-id');

  // Unsupported element fallback
  const mockNoSink = {};
  const res2 = await ResilientAudioPipelineAndUploadQueueGovernor.routeAudioOutput(
    mockNoSink,
    'speaker-device-id'
  );
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.activeDeviceId, 'default');
  assert.strictEqual(res2.fallbackUsed, true);
  console.log('  ✅ Audio sink routing passed');
}

// 2. Audio Pipeline Unlock & Sample Rate Clamping (tdesktop #5843, #1548)
{
  console.log('  Testing audio pipeline unlock & 48kHz sample rate clamping...');
  const unlocked = ResilientAudioPipelineAndUploadQueueGovernor.unlockAudioPipeline(48000);
  assert.strictEqual(unlocked.unlocked, true);
  assert.strictEqual(unlocked.sampleRate, 48000);

  const clamped = ResilientAudioPipelineAndUploadQueueGovernor.unlockAudioPipeline(192000);
  assert.strictEqual(clamped.sampleRate, 96000, 'Must clamp excessive sample rates');
  console.log('  ✅ Audio pipeline unlock passed');
}

// 3. Ogg Opus Magic Byte Validation (tdesktop #8443, #24662)
{
  console.log('  Testing Ogg Opus header byte validation...');
  // Valid OggS header: [0x4F, 0x67, 0x67, 0x53, ...]
  const validHeader = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);
  const check1 = ResilientAudioPipelineAndUploadQueueGovernor.validateOggOpusHeader(validHeader);
  assert.strictEqual(check1.isValid, true);
  assert.strictEqual(check1.format, 'ogg-opus');

  // Corrupt header
  const corruptHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const check2 = ResilientAudioPipelineAndUploadQueueGovernor.validateOggOpusHeader(corruptHeader);
  assert.strictEqual(check2.isValid, false);
  assert.strictEqual(check2.format, 'unknown');
  console.log('  ✅ Audio header validation passed');
}

// 4. Voice Playback Ended & No Spurious Reply (tdesktop #25341)
{
  console.log('  Testing voice playback playlist advancement without spurious reply...');
  const res = ResilientAudioPipelineAndUploadQueueGovernor.onVoicePlaybackEnded(1001, 1002);
  assert.strictEqual(res.nextMsgToPlay, 1002);
  assert.strictEqual(res.shouldOpenReplyComposer, false, 'Must strictly forbid spurious reply opening');
  console.log('  ✅ Voice playback completion passed');
}

// 5. Parallel Chunked Upload Queue (tdesktop #2390)
{
  console.log('  Testing parallel chunked file upload queueing...');
  const fileId = 'file_large_doc_1';
  ResilientAudioPipelineAndUploadQueueGovernor.initializeFileUpload(fileId, 8, 512 * 1024);

  // Concurrency = 3
  const batch1 = ResilientAudioPipelineAndUploadQueueGovernor.getNextUploadBatch(fileId, 3);
  assert.strictEqual(batch1.batchToUpload.length, 3);
  assert.strictEqual(batch1.result.activeTransfers, 3);
  assert.strictEqual(batch1.result.queuedRemaining, 5);
  assert.strictEqual(batch1.result.isComplete, false);

  // Mark first 3 chunks completed
  ResilientAudioPipelineAndUploadQueueGovernor.markChunkStatus(fileId, 0, true);
  ResilientAudioPipelineAndUploadQueueGovernor.markChunkStatus(fileId, 1, true);
  ResilientAudioPipelineAndUploadQueueGovernor.markChunkStatus(fileId, 2, true);

  // Next batch
  const batch2 = ResilientAudioPipelineAndUploadQueueGovernor.getNextUploadBatch(fileId, 3);
  assert.strictEqual(batch2.batchToUpload.length, 3);
  assert.strictEqual(batch2.result.progress, 3 / 8);
  console.log('  ✅ Parallel upload queue passed');
}

console.log('\n🎉 ALL Phase 29 verification checks passed green!');
