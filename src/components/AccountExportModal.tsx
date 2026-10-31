import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Shield,
  Smartphone,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import QRCode from 'qrcode'
import { AccountInfo, PreparedExportResult } from '../types/telegram'
import { Avatar } from './Avatar'
import { useI18n } from '../i18n'

interface AccountExportModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountInfo[]
}

export const AccountExportModal: React.FC<AccountExportModalProps> = ({
  isOpen,
  onClose,
  accounts,
}) => {
  const { t, isRTL } = useI18n()

  const [step, setStep] = useState<'select' | 'streaming'>('select')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Export session data
  const [exportData, setExportData] = useState<PreparedExportResult | null>(null)
  const [qrImages, setQrImages] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [copiedPin, setCopiedPin] = useState(false)

  // Select all accounts by default when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(accounts.map((a) => a.id))
      setStep('select')
      setError(null)
      setExportData(null)
      setQrImages([])
      setCurrentFrame(0)
      setTimeLeft(90)
    }
  }, [isOpen, accounts])

  // Countdown timer for 90s session expiry
  useEffect(() => {
    if (step !== 'streaming' || !exportData) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleCancel()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [step, exportData])

  // Frame cycling loop for Animated QR (~180ms per frame for optimal camera tracking)
  useEffect(() => {
    if (step !== 'streaming' || qrImages.length === 0) return

    const frameInterval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % qrImages.length)
    }, 200)

    return () => clearInterval(frameInterval)
  }, [step, qrImages])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleStartExport = async () => {
    if (selectedIds.length === 0) {
      setError(t('account_export.select_at_least_one'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!window.guidegram?.prepareAccountExport) {
        throw new Error('Export feature is only available on Guidegram Desktop')
      }

      const res = await window.guidegram.prepareAccountExport(selectedIds)
      if (!res || !res.chunks || res.chunks.length === 0) {
        throw new Error('Failed to generate export package')
      }

      // Pre-render QR code images for all chunks
      const generatedQrs: string[] = []
      for (const chunk of res.chunks) {
        const dataUrl = await QRCode.toDataURL(chunk, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 7,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        })
        generatedQrs.push(dataUrl)
      }

      setExportData(res)
      setQrImages(generatedQrs)
      setTimeLeft(90)
      setStep('streaming')
    } catch (err: any) {
      setError(err?.message || 'Failed to prepare account export')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      if (window.guidegram?.cancelAccountExport) {
        await window.guidegram.cancelAccountExport()
      }
    } catch (_) {}
    onClose()
  }

  const handleCopyPin = () => {
    if (!exportData?.pin) return
    navigator.clipboard.writeText(exportData.pin)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-primary-900/30 via-dark-850 to-dark-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-primary-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {t('account_export.title')}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  Air-Gap
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {t('account_export.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'select' ? (
            /* STEP 1: ACCOUNT SELECTION */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {t('account_export.select_accounts', { count: selectedIds.length, total: accounts.length })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === accounts.length ? [] : accounts.map((a) => a.id)
                    )
                  }
                  className="text-primary-400 hover:text-primary-300 font-medium cursor-pointer"
                >
                  {selectedIds.length === accounts.length
                    ? t('account_export.deselect_all')
                    : t('account_export.select_all')}
                </button>
              </div>

              {/* Accounts Checklist */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {accounts.map((acc) => {
                  const isSelected = selectedIds.includes(acc.id)
                  const name = [acc.firstName, acc.lastName].filter(Boolean).join(' ') || 'User'
                  return (
                    <div
                      key={acc.id}
                      onClick={() => toggleSelect(acc.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary-950/30 border-primary-500/40 text-white'
                          : 'bg-dark-800/40 border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          avatarUrl={acc.avatarUrl}
                          title={name}
                          size="sm"
                        />
                        <div>
                          <div className="text-xs font-semibold text-white">{name}</div>
                          <div className="text-[11px] text-gray-400">
                            {acc.isBot ? 'Bot' : acc.phone || (acc.username ? `@${acc.username}` : 'No phone')}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-primary-500 border-primary-400 text-white shadow-glow'
                            : 'border-white/20 bg-dark-750'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Security Shield Note */}
              <div className="p-3.5 rounded-2xl bg-dark-800/60 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span>{t('account_export.zero_trust_title')}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {t('account_export.zero_trust_desc')}
                </p>
              </div>
            </div>
          ) : (
            /* STEP 2: ANIMATED QR STREAM & PIN */
            <div className="space-y-5 text-center">
              {/* PIN Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-dark-800 to-dark-850 border border-cyan-500/20 relative group">
                <div className="text-[11px] font-medium text-gray-400 mb-1 flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('account_export.pin_title')}</span>
                </div>
                <div className="text-3xl font-mono font-extrabold tracking-widest text-cyan-300 my-1">
                  {exportData?.pin ? `${exportData.pin.slice(0, 3)} - ${exportData.pin.slice(3)}` : '------'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1 cursor-pointer"
                >
                  {copiedPin ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t('account_export.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('account_export.copy_pin')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Animated QR Code Player */}
              <div className="flex flex-col items-center justify-center space-y-3.5">
                {/* 100% Unobstructed High-Contrast QR Code Card */}
                <div className="p-3.5 rounded-3xl bg-white border border-white/20 shadow-2xl inline-block">
                  {qrImages.length > 0 ? (
                    <img
                      src={qrImages[currentFrame]}
                      alt="Animated QR Stream"
                      className="w-60 h-60 rounded-2xl block select-none"
                    />
                  ) : (
                    <div className="w-60 h-60 flex items-center justify-center bg-gray-900 rounded-2xl">
                      <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Frame indicator pill (Cleanly outside QR code) */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 shadow-md">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('account_export.frame_progress', { current: currentFrame + 1, total: qrImages.length })}</span>
                </div>

                {/* Progress Bar of Frames */}
                <div className="w-60 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-primary-500 transition-all duration-150"
                    style={{
                      width: `${((currentFrame + 1) / (qrImages.length || 1)) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-accent-rose" />
                  <span>
                    {t('account_export.session_validity', { seconds: timeLeft })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed px-4">
                {t('account_export.scan_hint')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-dark-850/50 flex items-center justify-between">
          {step === 'select' ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('account_export.cancel')}
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                disabled={loading || selectedIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-primary-500 to-blue-600 hover:from-cyan-400 hover:via-primary-400 hover:to-blue-500 text-white text-xs font-bold shadow-glow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('account_export.encrypting')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {t('account_export.start_transfer', { count: selectedIds.length })}
                    </span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('account_export.change_accounts')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {t('account_export.close')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
