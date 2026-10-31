import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Camera,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Layers,
  Smartphone,
  Check,
  KeyRound,
  FileText,
} from 'lucide-react'
import { AccountInfo } from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'
import { decryptAccountExportWebCrypto } from '../services/mobileBridge'

interface AccountImportModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountsImported: (accounts: AccountInfo[]) => void
}

type ImportStep = 'scanning' | 'pin' | 'review' | 'success'

export const AccountImportModal: React.FC<AccountImportModalProps> = ({
  isOpen,
  onClose,
  onAccountsImported,
}) => {
  const { t, isRTL } = useI18n()

  const [step, setStep] = useState<ImportStep>('scanning')
  const [totalFrames, setTotalFrames] = useState<number>(0)
  const [receivedChunks, setReceivedChunks] = useState<Record<number, string>>({})
  const [lastScannedFrame, setLastScannedFrame] = useState<number | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  // PIN & Decryption State
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState<string | null>(null)
  const [decryptedAccounts, setDecryptedAccounts] = useState<AccountInfo[]>([])

  // Video and Stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('scanning')
      setTotalFrames(0)
      setReceivedChunks({})
      setLastScannedFrame(null)
      setCameraError(null)
      setPin(['', '', '', '', '', ''])
      setIsDecrypting(false)
      setDecryptError(null)
      setDecryptedAccounts([])
    } else {
      stopCamera()
    }
  }, [isOpen])

  // Stop camera helper
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Camera initialization and scan loop
  useEffect(() => {
    if (!isOpen || step !== 'scanning') {
      stopCamera()
      return
    }

    let isMounted = true

    const startCamera = async () => {
      try {
        setCameraError(null)
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API is not supported on this device or context.')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setIsCameraActive(true)
          startScanLoop()
        }
      } catch (err: any) {
        console.warn('[AccountImport] Camera start error:', err)
        setCameraError(
          err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
            ? t('account_import.err_camera_permission')
            : t('account_import.err_camera_general') + (err?.message || '')
        )
      }
    }

    startCamera()

    return () => {
      isMounted = false
      stopCamera()
    }
  }, [isOpen, step])

  // Continuous Barcode Scanning Loop
  const startScanLoop = () => {
    const hasBarcodeDetector = 'BarcodeDetector' in window

    let barcodeDetector: any = null
    if (hasBarcodeDetector) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        })
      } catch (_) {}
    }

    const checkFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameIdRef.current = requestAnimationFrame(checkFrame)
        return
      }

      try {
        let rawText: string | null = null

        if (barcodeDetector) {
          const barcodes = await barcodeDetector.detect(videoRef.current)
          if (barcodes && barcodes.length > 0) {
            rawText = barcodes[0].rawValue
          }
        }

        if (rawText) {
          handleIncomingQrText(rawText)
        }
      } catch (scanErr) {
        // Silently continue scan loop
      }

      animFrameIdRef.current = requestAnimationFrame(checkFrame)
    }

    animFrameIdRef.current = requestAnimationFrame(checkFrame)
  }

  // Parse GG1:frame/total:payload chunk format
  const handleIncomingQrText = (text: string) => {
    const match = text.match(/^GG1:(\d+)\/(\d+):(.*)$/)
    if (!match) return

    const index = parseInt(match[1], 10)
    const total = parseInt(match[2], 10)
    const part = match[3]

    if (isNaN(index) || isNaN(total) || total <= 0 || index < 1 || index > total) {
      return
    }

    setLastScannedFrame(index)

    setReceivedChunks((prev) => {
      if (prev[index]) return prev // already have this frame

      const next = { ...prev, [index]: part }
      setTotalFrames(total)

      // Light haptic feedback if available
      try {
        if (navigator.vibrate) navigator.vibrate(30)
      } catch (_) {}

      // Check if all chunks received
      const count = Object.keys(next).length
      if (count >= total) {
        // Complete! Stop camera and go to PIN entry
        setTimeout(() => {
          stopCamera()
          setStep('pin')
        }, 300)
      }

      return next
    })
  }

  // Handle PIN input typing
  const handlePinChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const newPin = [...pin]
    newPin[idx] = digit
    setPin(newPin)
    setDecryptError(null)

    // Auto-focus next input
    if (digit && idx < 5) {
      pinInputRefs.current[idx + 1]?.focus()
    }

    // Auto trigger decryption if all 6 digits are filled
    if (digit && idx === 5) {
      const fullPin = newPin.join('')
      if (fullPin.length === 6) {
        handleDecryptWithPin(fullPin)
      }
    }
  }

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      pinInputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const arr = pasted.split('')
      setPin(arr)
      handleDecryptWithPin(pasted)
    }
  }

  // Reassemble wire packet and decrypt
  const handleDecryptWithPin = async (enteredPin: string) => {
    if (totalFrames <= 0) return

    // Reconstruct full wire packet by sorting frames 1..totalFrames
    let fullWirePacket = ''
    for (let i = 1; i <= totalFrames; i++) {
      if (!receivedChunks[i]) {
        setDecryptError(t('account_import.err_frame_missing').replace('{frame}', String(i)))
        return
      }
      fullWirePacket += receivedChunks[i]
    }

    setIsDecrypting(true)
    setDecryptError(null)

    try {
      let rawAccounts: any[] = []

      // Try Electron IPC first if available, else Web Crypto fallback
      if (window.guidegram?.decryptAccountExport) {
        try {
          rawAccounts = await window.guidegram.decryptAccountExport(fullWirePacket, enteredPin)
        } catch (_) {
          rawAccounts = await decryptAccountExportWebCrypto(fullWirePacket, enteredPin)
        }
      } else {
        rawAccounts = await decryptAccountExportWebCrypto(fullWirePacket, enteredPin)
      }

      if (!rawAccounts || rawAccounts.length === 0) {
        throw new Error(t('account_import.err_no_valid_accounts'))
      }

      const mappedAccounts: AccountInfo[] = rawAccounts.map((a: any) => ({
        id: String(a.id),
        phone: a.phone || '',
        firstName: a.firstName || 'User',
        lastName: a.lastName || '',
        username: a.username,
        isBot: Boolean(a.isBot),
        status: 'connected' as const,
        unreadTotal: 0,
        proxyConfig: a.proxy,
      }))

      setDecryptedAccounts(mappedAccounts)
      setStep('review')
    } catch (err: any) {
      console.error('[AccountImport] Decryption error:', err)
      setDecryptError(t('account_import.err_bad_pin'))
    } finally {
      setIsDecrypting(false)
    }
  }

  // Finalize Import and persist accounts
  const handleConfirmImport = async () => {
    if (decryptedAccounts.length === 0) return

    try {
      if ((window.guidegram as any)?.saveImportedAccounts) {
        await (window.guidegram as any).saveImportedAccounts(decryptedAccounts)
      } else {
        // LocalStorage fallback for mobile / web
        const stored = localStorage.getItem('guidegram_mobile_accounts')
        const current: AccountInfo[] = stored ? JSON.parse(stored) : []
        const merged = [...current]
        for (const acc of decryptedAccounts) {
          const idx = merged.findIndex((a) => a.id === acc.id)
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...acc, status: 'connected' }
          } else {
            merged.push({ ...acc, status: 'connected' })
          }
        }
        localStorage.setItem('guidegram_mobile_accounts', JSON.stringify(merged))
      }

      onAccountsImported(decryptedAccounts)
      setStep('success')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setDecryptError(t('account_import.err_storage') + (err?.message || ''))
    }
  }

  if (!isOpen) return null

  const collectedCount = Object.keys(receivedChunks).length
  const progressPercent = totalFrames > 0 ? Math.round((collectedCount / totalFrames) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="glass-modal w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] border border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">
                {t('account_import.modal_title')}
              </div>
              <div className="text-[10px] text-gray-400">
                {t('account_import.modal_subtitle')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* STEP 1: CAMERA SCANNING */}
          {step === 'scanning' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-gray-300 leading-relaxed">
                {t('account_import.scan_desc')}
              </p>

              {/* Live Viewport Card */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-black border-2 border-cyan-500/40 shadow-2xl flex items-center justify-center group">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Corner Targeting Brackets */}
                <div className="absolute inset-4 pointer-events-none border border-cyan-400/30 rounded-2xl">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                </div>

                {/* Laser Scanning Line Animation */}
                {isCameraActive && (
                  <motion.div
                    animate={{ y: [-100, 100, -100] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.8)] pointer-events-none"
                  />
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-dark-950/90 p-4 flex flex-col items-center justify-center text-center space-y-2.5">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <div className="text-xs text-rose-300 font-medium leading-relaxed">
                      {cameraError}
                    </div>
                  </div>
                )}
              </div>

              {/* Realtime Optical Frame Counter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-2">
                  <span className="text-gray-400">{t('account_import.progress_label')}</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {totalFrames > 0
                      ? t('account_import.frame_progress').replace('{collected}', String(collectedCount)).replace('{total}', String(totalFrames)).replace('{percent}', String(progressPercent))
                      : t('account_import.waiting_focus')}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-150"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Frame Mini Dots Matrix */}
                {totalFrames > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] text-gray-500 mb-1.5 flex items-center justify-between">
                      <span>{t('account_import.frame_map')}</span>
                      {lastScannedFrame && (
                        <span className="text-cyan-400 font-mono">{t('account_import.last_frame').replace('{frame}', String(lastScannedFrame))}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center max-h-20 overflow-y-auto p-1 bg-dark-900/40 rounded-xl border border-white/5">
                      {Array.from({ length: totalFrames }, (_, i) => i + 1).map((frameNum) => {
                        const isCaptured = Boolean(receivedChunks[frameNum])
                        return (
                          <div
                            key={frameNum}
                            className={`w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center transition-colors ${
                              isCaptured
                                ? 'bg-cyan-500 text-black font-bold shadow-sm'
                                : 'bg-white/5 text-gray-600 border border-white/5'
                            }`}
                            title={`Frame ${frameNum}`}
                          >
                            {frameNum}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PIN ENTRY */}
          {step === 'pin' && (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-glow">
                <KeyRound className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-100 mb-1">
                  {t('account_import.pin_title')}
                </h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  {t('account_import.pin_desc')}
                </p>
              </div>

              {/* 6 Digit PIN Inputs */}
              <div className="flex justify-center gap-2.5 my-4" onPaste={handlePinPaste} dir="ltr">
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pinInputRefs.current[idx] = el
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    className="w-11 h-13 rounded-2xl bg-dark-800 border-2 border-white/10 focus:border-cyan-400 text-center text-xl font-mono font-bold text-cyan-300 focus:outline-none transition-all shadow-inner"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {decryptError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed">
                  {decryptError}
                </div>
              )}

              <button
                type="button"
                disabled={pin.some((d) => !d) || isDecrypting}
                onClick={() => handleDecryptWithPin(pin.join(''))}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-primary-600 hover:from-cyan-500 hover:to-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDecrypting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('account_import.decrypting')}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{t('account_import.decrypt_btn')}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: REVIEW ACCOUNTS */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-100">
                  {t('account_import.review_title').replace('{count}', String(decryptedAccounts.length))}
                </h3>
                <p className="text-xs text-gray-400">
                  {t('account_import.review_desc')}
                </p>
              </div>

              {/* Accounts List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {decryptedAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-2xl bg-dark-800/80 border border-white/5 flex items-center gap-3"
                  >
                    <Avatar
                      title={`${acc.firstName} ${acc.lastName || ''}`.trim() || 'User'}
                      avatarUrl={acc.avatarUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-xs font-bold text-gray-200 truncate">
                        {`${acc.firstName} ${acc.lastName || ''}`.trim() || 'Telegram User'}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate font-mono">
                        {acc.phone || (acc.username ? `@${acc.username}` : `ID: ${acc.id}`)}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                      {t('account_import.active_session')}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-primary-600 hover:from-emerald-500 hover:to-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t('account_import.confirm_btn').replace('{count}', String(decryptedAccounts.length))}</span>
              </button>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-glow">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                {t('account_import.success_title')}
              </h3>
              <p className="text-xs text-gray-400">
                {t('account_import.success_desc')}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
