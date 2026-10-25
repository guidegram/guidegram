// Web Audio API notification sound synthesizer for Guidegram
// Synthesizes pleasant harmonic notification chimes without external audio assets
// Enforces MM-211 AudioContext resource hygiene & idle hardware release

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
    try {
      if (audioCtx.state !== 'closed') {
        await audioCtx.close()
      }
    } catch {}
    audioCtx = null
  }
}

/**
 * Play a delicate, high-fidelity Telegram-like notification chime with full graph disconnection
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Oscillator 1: Fundamental tone (880 Hz - A5)
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

    // Oscillator 2: Soft overtone (1320 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1320, now + 0.04)

    gain2.gain.setValueAtTime(0, now + 0.04)
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    // Enforce immediate node disconnection on completion to prevent memory leaks (MM-211)
    osc1.onended = () => {
      try {
        osc1.disconnect()
        gain1.disconnect()
      } catch {}
    }

    osc2.onended = () => {
      try {
        osc2.disconnect()
        gain2.disconnect()
      } catch {}
    }

    osc1.start(now)
    osc1.stop(now + 0.35)

    osc2.start(now + 0.04)
    osc2.stop(now + 0.4)
  } catch (err) {
    // Audio context may be blocked by autoplay policy before user gesture
  }
}
