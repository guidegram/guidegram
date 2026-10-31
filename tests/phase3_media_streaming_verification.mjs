import assert from 'node:assert/strict'
import { ChunkedMediaStreamingEngine } from '../src/services/chunkedMediaStreamingEngine.ts'

console.log('--- [Phase 3: Media Streaming, Voice Buffering & Sticker Pipeline Verification] ---')

const engine = ChunkedMediaStreamingEngine.getInstance()
engine.stop()

// 1. Test Autoplay Next Policy (#3649)
console.log('[Test 1] Validating Autoplay Next policy toggle & progression...')
engine.setAutoplayNext(true)
assert.equal(engine.getAutoplayNext(), true, 'Autoplay next must be enabled initially')

engine.enqueue({ id: 'voice_1', url: 'voice1.ogg' })
engine.enqueue({ id: 'voice_2', url: 'voice2.ogg' })
engine.enqueue({ id: 'voice_3', url: 'voice3.ogg' })

assert.equal(engine.getTelemetry().activeQueueLength, 3, 'Queue must hold 3 tracks')

// Track 1 finishes with autoplay enabled -> advances to Track 2
const nextTrack = engine.onTrackEnded()
assert.ok(nextTrack, 'Next track must be returned when autoplay is enabled')
assert.equal(nextTrack.id, 'voice_2', 'Must advance to voice_2')

// Disable autoplay next and simulate track 2 finishing
engine.setAutoplayNext(false)
const stoppedTrack = engine.onTrackEnded()
assert.equal(stoppedTrack, null, 'Must stop queue progression when autoplayNext is false (resolves #3649)')

console.log('✅ [Test 1 Passed] Autoplay Next queue progression correctly governed.')

// 2. Test Bounded Chunk Buffer Pipeline (#1382)
console.log('[Test 2] Validating Bounded Chunk Buffer limits...')
const streamId = 'stream_test_1'

// Append 20 chunks (max capacity is 16)
for (let i = 1; i <= 20; i++) {
  const chunk = new Uint8Array([i, i + 1, i + 2])
  engine.appendChunk(streamId, chunk)
}

const buffered = engine.getBufferedChunks(streamId)
assert.equal(buffered.length, 16, 'Buffered chunks must be strictly capped at 16 chunks')
assert.equal(buffered[15][0], 20, 'Latest chunk must be retained')
assert.equal(buffered[0][0], 5, 'Oldest chunks (1..4) must have been shifted out')

engine.releaseStream(streamId)
assert.equal(engine.getBufferedChunks(streamId).length, 0, 'Buffer must be cleared on release')
console.log('✅ [Test 2 Passed] Bounded Chunk Buffer enforces strict memory bounds.')

// 3. Test Viewport Sticker Throttler (#6276)
console.log('[Test 3] Validating Viewport Sticker Visibility Throttler...')
const isVisibleA = engine.setStickerViewportVisibility('sticker_1', true)
assert.equal(isVisibleA, true, 'Visible sticker must be marked active')

const isVisibleB = engine.setStickerViewportVisibility('sticker_2', false)
assert.equal(isVisibleB, false, 'Hidden sticker must be paused to save GPU and CPU')
assert.equal(engine.getTelemetry().stickerViewportPauses > 0, true, 'Pause telemetry must increment')

console.log('✅ [Test 3 Passed] Viewport Sticker Throttler pauses off-screen animations.')
console.log('--- ALL PHASE 3 MEDIA STREAMING CHECKS PASSED (100% GREEN) ---')
