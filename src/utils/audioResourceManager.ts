/**
 * AudioResourceManager (MM-211 Memory Leak & Resource Hygiene)
 * Centralizes Web Audio API lifecycle management, ensuring complete disconnection
 * of AnalyserNodes, MediaStreamAudioSourceNodes, and explicit closure of AudioContexts.
 * Prevents browser "AudioContext was not allowed to start" limit errors and hardware thread exhaustion.
 */

import { audioLifecycleGuard } from './audioLifecycleGuard'

export interface VoiceVisualizerSession {
  stop: () => void
  getAudioContext: () => AudioContext | null
}

export class AudioResourceManager {
  /**
   * Safely stops and cleans up all audio tracks in a MediaStream.
   */
  public static stopMediaStream(stream: MediaStream | null | undefined): void {
    if (!stream) return
    try {
      stream.getTracks().forEach((track) => {
        try {
          if (track.readyState !== 'ended') {
            track.stop()
          }
        } catch {
          // Track already closed or unmounted
        }
      })
    } catch {
      // Ignored
    }
  }

  /**
   * Safely closes an AudioContext and handles pending state transitions.
   */
  public static async closeAudioContext(ctx: AudioContext | null | undefined): Promise<void> {
    if (!ctx) return
    await audioLifecycleGuard.closeAudioContext(ctx)
  }

  /**
   * Attaches an AnalyserNode to a live MediaStream for voice waveform sampling.
   * Returns a session object with an idempotent stop() method that guarantees
   * clean disconnection of the entire audio graph.
   */
  public static createVoiceVisualizer(
    stream: MediaStream,
    onSample: (waveform: number[]) => void,
    intervalMs = 70
  ): VoiceVisualizerSession {
    let isCleanedUp = false
    let intervalId: any = null
    let audioCtx: AudioContext | null = null
    let sourceNode: MediaStreamAudioSourceNode | null = null
    let analyserNode: AnalyserNode | null = null

    try {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass()
        audioLifecycleGuard.trackAudioContext(audioCtx)
        sourceNode = audioCtx.createMediaStreamSource(stream)
        analyserNode = audioCtx.createAnalyser()
        analyserNode.fftSize = 64
        sourceNode.connect(analyserNode)

        const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
        intervalId = setInterval(() => {
          if (isCleanedUp || !analyserNode) return
          try {
            analyserNode.getByteFrequencyData(dataArray)
            const sampled = Array.from(dataArray.slice(0, 16)).map((v) =>
              Math.max(15, Math.round((v / 255) * 100))
            )
            onSample(sampled)
          } catch {
            // Analyser destroyed
          }
        }, intervalMs)
      }
    } catch (err) {
      console.warn('[AudioResourceManager] Failed to initialize voice visualizer AudioContext:', err)
    }

    const stop = () => {
      if (isCleanedUp) return
      isCleanedUp = true

      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }

      if (sourceNode) {
        try {
          sourceNode.disconnect()
        } catch {}
        sourceNode = null
      }

      if (analyserNode) {
        try {
          analyserNode.disconnect()
        } catch {}
        analyserNode = null
      }

      if (audioCtx) {
        this.closeAudioContext(audioCtx).catch(() => {})
        audioCtx = null
      }
    }

    return {
      stop,
      getAudioContext: () => audioCtx,
    }
  }
}
