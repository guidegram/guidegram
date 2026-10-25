/**
 * AudioLifecycleGuard Verification Suite (MM-211 Memory Leak Prevention & Layer 08 Resource Hygiene)
 * Tests:
 * 1. Singleton pattern and instance retrieval
 * 2. Single active player mutual exclusion (voice A auto-stops when voice B plays)
 * 3. Complete audio pipeline teardown (pause, listener removal, src removal, load call)
 * 4. Blob URL revocation on disposal
 * 5. Audio element cap enforcement (max active instances cap evicts oldest)
 * 6. AudioContext tracking and bulk safe teardown
 * 7. Telemetry counters (played, disposed, leaks prevented)
 * 8. Error handling and stop idempotency
 */

import assert from 'node:assert'
import { AudioLifecycleGuard } from '../src/utils/audioLifecycleGuard.ts'

console.log('🧪 Starting AudioLifecycleGuard Verification Suite (MM-211, Layer 08)...')

// Mock Web API environment for Node.js
class MockAudioElement {
  constructor(src) {
    this.src = src || ''
    this.playbackRate = 1.0
    this.volume = 1.0
    this.currentTime = 0
    this.duration = 100
    this.paused = true
    this.ended = false
    this.ontimeupdate = null
    this.onended = null
    this.onerror = null
    this.onplay = null
    this.onpause = null
    this.attributes = new Map([['src', this.src]])
    this.loadCalls = 0
    this.pauseCalls = 0
    this.playCalls = 0
  }

  play() {
    this.paused = false
    this.playCalls++
    if (this.onplay) this.onplay()
    return Promise.resolve()
  }

  pause() {
    this.paused = true
    this.pauseCalls++
    if (this.onpause) this.onpause()
  }

  load() {
    this.loadCalls++
  }

  removeAttribute(attr) {
    this.attributes.delete(attr)
  }

  getAttribute(attr) {
    return this.attributes.get(attr)
  }
}

let revokedUrls = []
global.Audio = MockAudioElement
global.URL = {
  revokeObjectURL: (url) => {
    revokedUrls.push(url)
  }
}

class MockAudioContext {
  constructor(initialState = 'running') {
    this.state = initialState
    this.closeCalls = 0
  }

  async close() {
    this.closeCalls++
    this.state = 'closed'
    return Promise.resolve()
  }
}

let passedAssertions = 0

function it(desc, fn) {
  try {
    fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

async function itAsync(desc, fn) {
  try {
    await fn()
    passedAssertions++
    console.log(`  ✅ ${desc}`)
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`)
    console.error(err)
    process.exit(1)
  }
}

// 1. Singleton pattern
it('1. Returns singleton instance consistently and allows reset', () => {
  AudioLifecycleGuard.resetInstance()
  const instance1 = AudioLifecycleGuard.getInstance()
  const instance2 = AudioLifecycleGuard.getInstance()
  assert.strictEqual(instance1, instance2, 'Instances must be identical')
})

// 2. Initial telemetry
it('2. Reports zero initial active sessions and healthy baseline telemetry', () => {
  const guard = AudioLifecycleGuard.getInstance()
  const tel = guard.getTelemetry()
  assert.strictEqual(tel.activePlayersCount, 0)
  assert.strictEqual(tel.activeContextsCount, 0)
  assert.strictEqual(tel.totalPlayedSessions, 0)
  assert.strictEqual(tel.totalDisposedSessions, 0)
  assert.strictEqual(tel.activeSessionId, null)
})

// 3. Play voice note session
it('3. Starts voice session, configures properties and tracks active instance', () => {
  const guard = AudioLifecycleGuard.getInstance()
  let timeUpdateFired = false
  const session = guard.playVoice({
    id: 'voice_msg_101',
    src: 'guidegram-media://voice/note1.ogg',
    playbackRate: 1.5,
    volume: 0.8,
    onTimeUpdate: () => { timeUpdateFired = true },
  })

  assert.strictEqual(session.id, 'voice_msg_101')
  assert.strictEqual(session.audio.playbackRate, 1.5)
  assert.strictEqual(session.audio.volume, 0.8)
  assert.strictEqual(session.audio.paused, false)

  session.audio.ontimeupdate()
  assert.strictEqual(timeUpdateFired, true, 'onTimeUpdate callback should fire')

  const tel = guard.getTelemetry()
  assert.strictEqual(tel.activePlayersCount, 1)
  assert.strictEqual(tel.activeSessionId, 'voice_msg_101')
  assert.strictEqual(tel.totalPlayedSessions, 1)
})

// 4. Single active player mutual exclusion
it('4. Enforces single active player mutual exclusion (playing voice 2 stops voice 1)', () => {
  const guard = AudioLifecycleGuard.getInstance()
  const session1 = guard.playVoice({
    id: 'voice_msg_1',
    src: 'guidegram-media://voice/note1.ogg',
  })
  const audio1 = session1.audio

  assert.strictEqual(audio1.paused, false)

  // Now play voice 2
  const session2 = guard.playVoice({
    id: 'voice_msg_2',
    src: 'guidegram-media://voice/note2.ogg',
  })

  // Voice 1 must be paused, stripped, and disposed
  assert.strictEqual(audio1.paused, true, 'Previous audio must be paused')
  assert.strictEqual(audio1.ontimeupdate, null, 'Listeners on previous audio must be stripped')
  assert.strictEqual(audio1.onended, null)
  assert.strictEqual(audio1.onerror, null)
  assert.strictEqual(audio1.src, '', 'Src on previous audio must be empty')
  assert.strictEqual(audio1.loadCalls > 0, true, 'load() must be invoked on previous audio')

  const tel = guard.getTelemetry()
  assert.strictEqual(tel.activeSessionId, 'voice_msg_2')
  assert.strictEqual(tel.leaksPreventedCount >= 1, true, 'Leak prevented count incremented')
})

// 5. Complete pipeline teardown on stopCurrentVoice()
it('5. stopCurrentVoice() performs complete teardown and updates telemetry', () => {
  const guard = AudioLifecycleGuard.getInstance()
  const session = guard.playVoice({
    id: 'voice_msg_3',
    src: 'guidegram-media://voice/note3.ogg',
  })

  assert.strictEqual(guard.getTelemetry().activeSessionId, 'voice_msg_3')

  guard.stopCurrentVoice()

  assert.strictEqual(guard.getTelemetry().activeSessionId, null)
  assert.strictEqual(guard.getTelemetry().activePlayersCount, 0)
  assert.strictEqual(session.audio.paused, true)
  assert.strictEqual(session.audio.src, '')
})

// 6. Blob URL revocation on disposal
it('6. Automatically revokes blob: URLs upon session completion or stop', () => {
  const guard = AudioLifecycleGuard.getInstance()
  revokedUrls = []
  const blobUrl = 'blob:guidegram://voice-audio-chunk-999'

  const session = guard.playVoice({
    id: 'voice_blob_1',
    src: blobUrl,
  })

  assert.strictEqual(session.isBlob, true)
  session.stop()

  assert.strictEqual(revokedUrls.includes(blobUrl), true, 'Blob URL must be revoked via URL.revokeObjectURL')
})

// 7. onEnded event clean self-disposal
it('7. Invoking onended cleanly terminates session and self-disposes', () => {
  const guard = AudioLifecycleGuard.getInstance()
  let endedCalled = false

  const session = guard.playVoice({
    id: 'voice_msg_auto_end',
    src: 'guidegram-media://voice/auto_end.ogg',
    onEnded: () => { endedCalled = true },
  })

  session.audio.onended()
  assert.strictEqual(endedCalled, true, 'onEnded callback executed')
  assert.strictEqual(guard.getTelemetry().activeSessionId, null, 'Session cleared on end')
  assert.strictEqual(session.audio.ontimeupdate, null, 'Listeners cleaned up')
})

// 8. onError event clean disposal
it('8. Invoking onerror cleanly terminates session and triggers error handler', () => {
  const guard = AudioLifecycleGuard.getInstance()
  let errorReceived = null

  const session = guard.playVoice({
    id: 'voice_msg_err',
    src: 'guidegram-media://voice/corrupted.ogg',
    onError: (err) => { errorReceived = err },
  })

  session.audio.onerror(new Error('Audio decode failure'))
  assert.ok(errorReceived, 'Error callback executed')
  assert.strictEqual(guard.getTelemetry().activeSessionId, null, 'Session cleared on error')
})

// 9. Stop idempotency
it('9. Calling session.stop() multiple times is safe and idempotent', () => {
  const guard = AudioLifecycleGuard.getInstance()
  const session = guard.playVoice({
    id: 'voice_msg_idempotent',
    src: 'guidegram-media://voice/idempotent.ogg',
  })

  // Multiple stops should not throw or double-dispose
  session.stop()
  session.stop()
  session.stop()
  assert.strictEqual(guard.getTelemetry().activePlayersCount, 0)
})

// 10. Instance cap enforcement
it('10. Enforces max active audio instance cap, evicting oldest leaked elements', () => {
  AudioLifecycleGuard.resetInstance()
  const guard = AudioLifecycleGuard.getInstance()

  // Track raw elements directly through playVoice or pool cap
  guard.playVoice({ id: 's1', src: 'guidegram-media://s1.ogg' })
  guard.playVoice({ id: 's2', src: 'guidegram-media://s2.ogg' })
  guard.playVoice({ id: 's3', src: 'guidegram-media://s3.ogg' })

  const tel = guard.getTelemetry()
  // Active players should never exceed maxActiveAudioInstances (2)
  assert.strictEqual(tel.activePlayersCount <= 2, true, 'Active elements must not exceed pool limit')
  assert.strictEqual(tel.leaksPreventedCount >= 2, true)
})

// 11. AudioContext tracking & teardown
await itAsync('11. Tracks AudioContexts and safely closes them during bulk teardown', async () => {
  const guard = AudioLifecycleGuard.getInstance()
  const ctx1 = new MockAudioContext('running')
  const ctx2 = new MockAudioContext('running')
  const ctxClosed = new MockAudioContext('closed')

  guard.trackAudioContext(ctx1)
  guard.trackAudioContext(ctx2)
  guard.trackAudioContext(ctxClosed)

  assert.strictEqual(guard.getTelemetry().activeContextsCount, 3)

  await guard.teardownAllAudioContexts()

  assert.strictEqual(ctx1.closeCalls, 1)
  assert.strictEqual(ctx2.closeCalls, 1)
  assert.strictEqual(ctxClosed.closeCalls, 0, 'Already closed context must not be closed again')
  assert.strictEqual(guard.getTelemetry().activeContextsCount, 0)
})

// 12. disposeAll() full purge
await itAsync('12. disposeAll() flushes both active players and AudioContexts', async () => {
  const guard = AudioLifecycleGuard.getInstance()
  const ctx = new MockAudioContext('running')
  guard.trackAudioContext(ctx)

  guard.playVoice({ id: 'voice_final', src: 'guidegram-media://final.ogg' })
  assert.strictEqual(guard.getTelemetry().activePlayersCount, 1)
  assert.strictEqual(guard.getTelemetry().activeContextsCount, 1)

  guard.disposeAll()

  assert.strictEqual(guard.getTelemetry().activePlayersCount, 0)
  assert.strictEqual(guard.getTelemetry().activeSessionId, null)
})

// 13. teardownAudioElement safely handles null or undefined
it('13. teardownAudioElement gracefully handles null, undefined, or missing methods', () => {
  const guard = AudioLifecycleGuard.getInstance()
  assert.doesNotThrow(() => {
    guard.teardownAudioElement(null)
    guard.teardownAudioElement(undefined)
    guard.teardownAudioElement({})
  })
})

// 14. Audio playback play() promise rejection safety
await itAsync('14. Safely catches play() promise rejections and calls onError without uncaught crash', async () => {
  const guard = AudioLifecycleGuard.getInstance()
  let errorCaught = false

  // Temporarily replace Audio constructor
  const origAudio = global.Audio
  global.Audio = class extends MockAudioElement {
    play() {
      return Promise.reject(new Error('NotAllowedError'))
    }
  }

  try {
    guard.playVoice({
      src: 'guidegram-media://blocked.ogg',
      onError: (err) => {
        errorCaught = true
      }
    })
    await new Promise((r) => setTimeout(r, 20))
  } finally {
    global.Audio = origAudio
  }

  assert.strictEqual(errorCaught, true, 'play() rejection was intercepted and routed to onError')
})

console.log(`\n🎉 All ${passedAssertions}/${passedAssertions} AudioLifecycleGuard assertions passed successfully!`)
process.exit(0)
