import React, { useState, useEffect, useRef } from 'react'
import { Lock, Unlock, ShieldAlert, KeyRound, AlertCircle } from 'lucide-react'

interface PasscodeLockOverlayProps {
  onUnlockSuccess: () => void
}

export const PasscodeLockOverlay: React.FC<PasscodeLockOverlayProps> = ({ onUnlockSuccess }) => {
  const [passcode, setPasscode] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    // Poll status initially to check if already rate limited
    if (window.guidegram?.passcode?.getStatus) {
      window.guidegram.passcode.getStatus().then((st) => {
        if (st.isRateLimited && st.rateLimitedUntilMs) {
          const diff = Math.max(0, Math.ceil((st.rateLimitedUntilMs - Date.now()) / 1000))
          setRemainingSeconds(diff)
        }
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (remainingSeconds <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [remainingSeconds])

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!passcode || isSubmitting || remainingSeconds > 0) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      if (window.guidegram?.passcode?.unlock) {
        const res = await window.guidegram.passcode.unlock(passcode)
        if (res.success) {
          setPasscode('')
          onUnlockSuccess()
        } else {
          setIsShaking(true)
          setTimeout(() => setIsShaking(false), 500)
          setErrorMsg(res.error || 'Incorrect passcode')
          if (res.lockedUntil) {
            const sec = Math.ceil((res.lockedUntil - Date.now()) / 1000)
            setRemainingSeconds(Math.max(1, sec))
          }
          inputRef.current?.select()
        }
      } else {
        // Fallback for browser / dev mode if window.guidegram is unavailable
        const stored = localStorage.getItem('guidegram_local_passcode')
        if (!stored || stored === passcode) {
          onUnlockSuccess()
        } else {
          setIsShaking(true)
          setTimeout(() => setIsShaking(false), 500)
          setErrorMsg('Incorrect passcode')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to verify passcode')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c1015]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none titlebar-no-drag">
      <div className={`w-full max-w-sm flex flex-col items-center text-center space-y-6 transition-transform ${isShaking ? 'animate-bounce' : ''}`}>
        
        {/* Glowing Shield Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-600/30 to-teal-400/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.25)]">
            <Lock className="w-9 h-9 text-cyan-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-dark-900 border border-cyan-500/40 flex items-center justify-center shadow-lg">
            <KeyRound className="w-3.5 h-3.5 text-cyan-300" />
          </div>
        </div>

        {/* Titles */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-gray-100 tracking-tight">
            Guidegram Locked
          </h2>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            Enter your Master Passcode to access all accounts, messages, and secure vaults.
          </p>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="password"
              value={passcode}
              disabled={remainingSeconds > 0 || isSubmitting}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              className="w-full px-4 py-3 bg-dark-900/90 border border-white/10 rounded-2xl text-center text-sm font-mono tracking-widest text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {remainingSeconds > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Too many failed attempts. Try again in {remainingSeconds}s</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!passcode || isSubmitting || remainingSeconds > 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Application</span>
              </>
            )}
          </button>
        </form>

        <div className="text-[11px] text-gray-500 font-medium">
          Protected by Hardware-Bound DPAPI & PBKDF2-SHA512
        </div>
      </div>
    </div>
  )
}
