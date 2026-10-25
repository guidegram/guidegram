import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { AudioResourceManager } from '../src/utils/audioResourceManager.ts'
import { playNotificationSound, disposeNotificationAudioContext } from '../src/utils/soundEffects.ts'

test('Phase 27: AudioContext & Voice Waveform Resource Disposal Verification (MM-211)', async (t) => {
  await t.test('1. Verify AudioResourceManager.stopMediaStream stops active tracks', () => {
    let stoppedCount = 0
    const mockTrack = {
      readyState: 'live',
      stop: () => { stoppedCount++ }
    }
    const mockStream = {
      getTracks: () => [mockTrack, mockTrack]
    }

    AudioResourceManager.stopMediaStream(mockStream)
    assert.equal(stoppedCount, 2, 'All tracks must be stopped')

    // Null safety
    assert.doesNotThrow(() => AudioResourceManager.stopMediaStream(null))
    assert.doesNotThrow(() => AudioResourceManager.stopMediaStream(undefined))
  })

  await t.test('2. Verify AudioResourceManager.closeAudioContext handles state safely', async () => {
    let isClosed = false
    const mockCtx = {
      state: 'running',
      close: async () => { isClosed = true }
    }

    await AudioResourceManager.closeAudioContext(mockCtx)
    assert.equal(isClosed, true, 'AudioContext must be closed')

    // Closed context should not be closed again
    const alreadyClosedCtx = {
      state: 'closed',
      close: async () => { assert.fail('Should not call close on closed context') }
    }
    await AudioResourceManager.closeAudioContext(alreadyClosedCtx)
  })

  await t.test('3. Verify createVoiceVisualizer disconnects all nodes on stop', () => {
    let disconnectedSource = false
    let disconnectedAnalyser = false
    let closedCtx = false

    const mockAnalyser = {
      fftSize: 0,
      frequencyBinCount: 32,
      getByteFrequencyData: (arr) => arr.fill(100),
      disconnect: () => { disconnectedAnalyser = true }
    }

    const mockSource = {
      connect: () => {},
      disconnect: () => { disconnectedSource = true }
    }

    const mockCtx = {
      state: 'running',
      createMediaStreamSource: () => mockSource,
      createAnalyser: () => mockAnalyser,
      close: async () => { closedCtx = true }
    }

    // Mock global window AudioContext
    global.window = {
      AudioContext: function () { return mockCtx }
    }

    const session = AudioResourceManager.createVoiceVisualizer({}, () => {})
    session.stop()

    assert.equal(disconnectedSource, true, 'Source node must be disconnected')
    assert.equal(disconnectedAnalyser, true, 'Analyser node must be disconnected')
    assert.equal(closedCtx, true, 'AudioContext must be closed on session.stop()')
  })

  await t.test('4. Verify soundEffects.ts exports disposeNotificationAudioContext and disconnects nodes', () => {
    const soundSource = fs.readFileSync(path.resolve('src/utils/soundEffects.ts'), 'utf-8')
    assert.ok(soundSource.includes('osc1.onended'), 'osc1 must have onended disconnect handler')
    assert.ok(soundSource.includes('osc2.onended'), 'osc2 must have onended disconnect handler')
    assert.ok(soundSource.includes('disposeNotificationAudioContext'), 'Must export disposeNotificationAudioContext')
  })

  await t.test('5. Verify ChatViewport and GroupCallModal integrate AudioResourceManager', () => {
    const chatSource = fs.readFileSync(path.resolve('src/components/ChatViewport.tsx'), 'utf-8')
    assert.ok(chatSource.includes('AudioResourceManager.createVoiceVisualizer'), 'ChatViewport must use createVoiceVisualizer')
    assert.ok(chatSource.includes('AudioResourceManager.stopMediaStream'), 'ChatViewport must use stopMediaStream')

    const callSource = fs.readFileSync(path.resolve('src/components/GroupCallModal.tsx'), 'utf-8')
    assert.ok(callSource.includes('AudioResourceManager.createVoiceVisualizer'), 'GroupCallModal must use createVoiceVisualizer')
    assert.ok(callSource.includes('AudioResourceManager.stopMediaStream'), 'GroupCallModal must use stopMediaStream')
  })
})
