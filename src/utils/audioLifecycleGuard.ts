/**
 * AudioLifecycleGuard (MM-211 Memory Leak Prevention & Layer 08 Resource Hygiene)
 * 
 * Enforces:
 * 1. Single Active Player Invariant: Playing any voice or audio message automatically
 *    and cleanly stops and disposes of any previous audio stream (mutual exclusion).
 * 2. Complete Audio Pipeline Teardown: Explicitly unhooks event listeners, detaches .src,
 *    invokes .load() to flush decoder buffers, and revokes Blob URLs.
 * 3. AudioContext Tracking & Graceful Suspension/Closure: Prevents browser hardware thread exhaustion.
 * 4. Active Instance Cap: Limits simultaneous active Audio instances to maximum 2 (e.g. 1 chime + 1 voice).
 * 5. Full Telemetry & Diagnostics for Memory Leak Auditing.
 */

export interface PlayAudioOptions {
  src: string
  id?: string | number
  playbackRate?: number
  volume?: number
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onError?: (error: any) => void
  onPlay?: () => void
  onPause?: () => void
}

export interface ActiveAudioSession {
  id: string
  audio: HTMLAudioElement
  src: string
  isBlob: boolean
  startTime: number
  stop: () => void
}

export interface AudioLifecycleTelemetry {
  activePlayersCount: number
  activeContextsCount: number
  totalPlayedSessions: number
  totalDisposedSessions: number
  activeSessionId: string | null
  leaksPreventedCount: number
}

export class AudioLifecycleGuard {
  private static instance: AudioLifecycleGuard | null = null

  private currentSession: ActiveAudioSession | null = null
  private trackedAudioContexts: Set<AudioContext> = new Set()
  private trackedAudioElements: Set<HTMLAudioElement> = new Set()
  private maxActiveAudioInstances: number = 2

  // Telemetry metrics
  private totalPlayedSessions: number = 0
  private totalDisposedSessions: number = 0
  private leaksPreventedCount: number = 0

  private constructor() {}

  public static getInstance(): AudioLifecycleGuard {
    if (!AudioLifecycleGuard.instance) {
      AudioLifecycleGuard.instance = new AudioLifecycleGuard()
    }
    return AudioLifecycleGuard.instance
  }

  /**
   * Resets the singleton instance (primarily for testing and clean teardown).
   */
  public static resetInstance(): void {
    if (AudioLifecycleGuard.instance) {
      AudioLifecycleGuard.instance.disposeAll()
      AudioLifecycleGuard.instance = null
    }
  }

  /**
   * Plays an audio stream while enforcing single-active-voice mutual exclusion.
   * If another voice note or audio was playing, it is cleanly stopped and disposed first.
   */
  public playVoice(options: PlayAudioOptions): ActiveAudioSession {
    // 1. Enforce Mutual Exclusion: Stop any currently playing audio session
    if (this.currentSession) {
      this.leaksPreventedCount++
      this.stopCurrentVoice()
    }

    // 2. Enforce Max Active Instance Cap
    this.enforcePoolCap()

    const audioId = options.id !== undefined ? String(options.id) : `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const isBlob = options.src.startsWith('blob:')

    // Create fresh Audio instance or use mock in non-browser environments
    let audio: HTMLAudioElement
    if (typeof Audio !== 'undefined') {
      audio = new Audio(options.src)
    } else {
      // Stub for testing/Node environments without DOM
      audio = {
        src: options.src,
        playbackRate: options.playbackRate ?? 1.0,
        volume: options.volume ?? 1.0,
        currentTime: 0,
        duration: 0,
        paused: true,
        ended: false,
        play: async () => { (audio as any).paused = false; return Promise.resolve() },
        pause: () => { (audio as any).paused = true },
        load: () => {},
        removeAttribute: () => {},
        ontimeupdate: null,
        onended: null,
        onerror: null,
        onplay: null,
        onpause: null,
      } as unknown as HTMLAudioElement
    }

    if (options.playbackRate && audio.playbackRate !== undefined) {
      audio.playbackRate = options.playbackRate
    }
    if (options.volume !== undefined && audio.volume !== undefined) {
      audio.volume = Math.max(0, Math.min(1, options.volume))
    }

    this.trackedAudioElements.add(audio)
    this.totalPlayedSessions++

    let isDisposed = false

    const cleanup = () => {
      if (isDisposed) return
      isDisposed = true

      this.trackedAudioElements.delete(audio)
      if (this.currentSession?.id === audioId) {
        this.currentSession = null
      }

      this.teardownAudioElement(audio, options.src, isBlob)
      this.totalDisposedSessions++
    }

    audio.ontimeupdate = () => {
      if (isDisposed) return
      const cur = audio.currentTime || 0
      const dur = audio.duration || 0
      options.onTimeUpdate?.(cur, dur)
    }

    audio.onended = () => {
      if (isDisposed) return
      options.onEnded?.()
      cleanup()
    }

    audio.onerror = (err: any) => {
      if (isDisposed) return
      options.onError?.(err)
      cleanup()
    }

    if (options.onPlay) {
      audio.onplay = () => {
        if (!isDisposed) options.onPlay?.()
      }
    }

    if (options.onPause) {
      audio.onpause = () => {
        if (!isDisposed) options.onPause?.()
      }
    }

    const session: ActiveAudioSession = {
      id: audioId,
      audio,
      src: options.src,
      isBlob,
      startTime: Date.now(),
      stop: cleanup,
    }

    this.currentSession = session

    // Trigger playback
    try {
      const playPromise = audio.play()
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          if (!isDisposed) {
            options.onError?.(err)
            cleanup()
          }
        })
      }
    } catch (err) {
      options.onError?.(err)
      cleanup()
    }

    return session
  }

  /**
   * Stops and disposes of the currently active voice session.
   */
  public stopCurrentVoice(): void {
    if (this.currentSession) {
      const s = this.currentSession
      this.currentSession = null
      s.stop()
    }
  }

  /**
   * Disposes of a specific audio element with zero dangling listeners or buffer leaks.
   */
  public teardownAudioElement(audio: HTMLAudioElement, src?: string, isBlob?: boolean): void {
    if (!audio) return

    try {
      audio.pause()
    } catch {}

    // Unhook event listeners immediately
    audio.ontimeupdate = null
    audio.onended = null
    audio.onerror = null
    audio.onplay = null
    audio.onpause = null

    // Detach source and flush internal decode buffer
    try {
      if (typeof audio.removeAttribute === 'function') {
        audio.removeAttribute('src')
      }
      audio.src = ''
    } catch {}

    try {
      if (typeof audio.load === 'function') {
        audio.load()
      }
    } catch {}

    // Revoke object URL if blob
    if ((isBlob || (src && src.startsWith('blob:'))) && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        if (src) URL.revokeObjectURL(src)
      } catch {}
    }

    this.trackedAudioElements.delete(audio)
  }

  /**
   * Tracks an AudioContext for managed lifecycle hygiene.
   */
  public trackAudioContext(ctx: AudioContext): void {
    if (!ctx) return
    this.trackedAudioContexts.add(ctx)
  }

  /**
   * Untracks an AudioContext.
   */
  public untrackAudioContext(ctx: AudioContext): void {
    this.trackedAudioContexts.delete(ctx)
  }

  /**
   * Safely suspends or closes a single AudioContext without throwing.
   */
  public async closeAudioContext(ctx: AudioContext | null | undefined): Promise<void> {
    if (!ctx) return
    this.trackedAudioContexts.delete(ctx)
    try {
      if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
        await ctx.close()
      }
    } catch {}
  }

  /**
   * Safely suspends or closes all tracked AudioContexts (e.g. during chat change or unmount).
   */
  public async teardownAllAudioContexts(): Promise<void> {
    const contexts = Array.from(this.trackedAudioContexts)
    this.trackedAudioContexts.clear()

    await Promise.all(
      contexts.map(async (ctx) => {
        try {
          if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
            await ctx.close()
          }
        } catch {}
      })
    )
  }

  /**
   * Disposes all active audio elements and closes all tracked AudioContexts.
   */
  public disposeAll(): void {
    this.stopCurrentVoice()

    for (const audio of Array.from(this.trackedAudioElements)) {
      this.teardownAudioElement(audio)
    }
    this.trackedAudioElements.clear()

    this.teardownAllAudioContexts().catch(() => {})
  }

  /**
   * Enforces instance cap by tearing down excess unmanaged audio elements.
   */
  private enforcePoolCap(): void {
    while (this.trackedAudioElements.size >= this.maxActiveAudioInstances) {
      const oldest = this.trackedAudioElements.values().next().value
      if (!oldest) break
      this.leaksPreventedCount++
      this.teardownAudioElement(oldest)
    }
  }

  /**
   * Returns current telemetry and health diagnostics.
   */
  public getTelemetry(): AudioLifecycleTelemetry {
    return {
      activePlayersCount: this.trackedAudioElements.size,
      activeContextsCount: this.trackedAudioContexts.size,
      totalPlayedSessions: this.totalPlayedSessions,
      totalDisposedSessions: this.totalDisposedSessions,
      activeSessionId: this.currentSession ? this.currentSession.id : null,
      leaksPreventedCount: this.leaksPreventedCount,
    }
  }
}

export const audioLifecycleGuard = AudioLifecycleGuard.getInstance()
