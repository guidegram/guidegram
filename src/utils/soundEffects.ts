// Web Audio API notification sound synthesizer for Guidegram
// Synthesizes pleasant harmonic notification chimes without external audio assets
// Enforces MM-211 AudioContext resource hygiene & idle hardware release

import { audioLifecycleGuard } from './audioLifecycleGuard'

let audioCtx: AudioContext | null = null
let idleSuspendTimer: any = null

function scheduleIdleSuspend(): void {
  if (idleSuspendTimer) clearTimeout(idleSuspendTimer)
  idleSuspendTimer = setTimeout(() => {
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {})
    }
  }, 15000)
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
      audioLifecycleGuard.trackAudioContext(audioCtx)
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  scheduleIdleSuspend()
  return audioCtx
}

/**
 * Explicitly disposes and closes the global notification AudioContext (MM-211).
 */
export async function disposeNotificationAudioContext(): Promise<void> {
  if (idleSuspendTimer) {
    clearTimeout(idleSuspendTimer)
    idleSuspendTimer = null
  }
  if (audioCtx) {
    const ctx = audioCtx
    audioCtx = null
    await audioLifecycleGuard.closeAudioContext(ctx)
  }
}

export type NotificationToneType = 'classic' | 'chime' | 'crystal' | 'drop' | 'minimal'

export const AVAILABLE_NOTIFICATION_TONES = [
  { id: 'classic', label: 'Telegram Classic' },
  { id: 'chime', label: 'Harmonic Chime' },
  { id: 'crystal', label: 'Crystal Sparkle' },
  { id: 'drop', label: 'Water Drop' },
  { id: 'minimal', label: 'Minimal Pop' },
] as const

/**
 * Play a delicate, high-fidelity notification sound with customizable tone and MM-211 resource hygiene
 */
export function playNotificationSound(tone: string = 'classic'): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    if (tone === 'chime') {
      // Triad Chime: C5 (523Hz), E5 (659Hz), G5 (784Hz)
      const freqs = [523.25, 659.25, 783.99]
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const offset = idx * 0.05
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + offset)
        gain.gain.setValueAtTime(0, now + offset)
        gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); } catch {}
        }
        osc.start(now + offset)
        osc.stop(now + offset + 0.35)
      })
    } else if (tone === 'crystal') {
      // Crystal ping with high sparkle (1046.5Hz & 2093Hz)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1046.5, now)
      osc.frequency.exponentialRampToValueAtTime(2093.0, now + 0.05)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.18, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch {}
      }
      osc.start(now)
      osc.stop(now + 0.45)
    } else if (tone === 'drop') {
      // Water droplet frequency ramp (420Hz to 880Hz)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.22, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch {}
      }
      osc.start(now)
      osc.stop(now + 0.28)
    } else if (tone === 'minimal') {
      // Minimal soft click/pop (950Hz)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(950, now)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch {}
      }
      osc.start(now)
      osc.stop(now + 0.08)
    } else {
      // Default: Telegram Classic (880 Hz to 1760 Hz with 1320 Hz harmonic)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.08)

      gain1.gain.setValueAtTime(0, now)
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.01)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1320, now + 0.04)

      gain2.gain.setValueAtTime(0, now + 0.04)
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.05)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc1.onended = () => {
        try { osc1.disconnect(); gain1.disconnect(); } catch {}
      }
      osc2.onended = () => {
        try { osc2.disconnect(); gain2.disconnect(); } catch {}
      }

      osc1.start(now)
      osc1.stop(now + 0.35)
      osc2.start(now + 0.04)
      osc2.stop(now + 0.4)
    }
  } catch (err) {
    // Audio context may be blocked by autoplay policy before user gesture
  }
}
