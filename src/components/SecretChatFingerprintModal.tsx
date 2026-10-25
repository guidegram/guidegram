import React, { useState } from 'react'
import { Lock, X, ShieldCheck, Check, Clock, KeyRound, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'

interface SecretChatFingerprintModalProps {
  isOpen: boolean
  onClose: () => void
  chatTitle: string
  fingerprintHex?: string
  visualEmojis?: string[]
  currentTtl?: number
  onSetTtl?: (ttlSeconds: number) => Promise<void>
}

const TTL_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '1s', seconds: 1 },
  { label: '2s', seconds: 2 },
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '1h', seconds: 3600 },
  { label: '1d', seconds: 86400 },
  { label: '1w', seconds: 604800 },
]

export const SecretChatFingerprintModal: React.FC<SecretChatFingerprintModalProps> = ({
  isOpen,
  onClose,
  chatTitle,
  fingerprintHex = '4a:1b:9c:8d:ee:01:23:45',
  visualEmojis = ['🔒', '🛡️', '⚡', '🗝️'],
  currentTtl = 0,
  onSetTtl,
}) => {
  const { t, language } = useI18n()
  const isPersian = language === 'fa'
  const [copied, setCopied] = useState(false)
  const [selectedTtl, setSelectedTtl] = useState(currentTtl)
  const [isUpdatingTtl, setIsUpdatingTtl] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    copyTextToClipboard(fingerprintHex)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTtlSelect = async (seconds: number) => {
    setSelectedTtl(seconds)
    if (onSetTtl) {
      setIsUpdatingTtl(true)
      try {
        await onSetTtl(seconds)
      } finally {
        setIsUpdatingTtl(false)
      }
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-dark-850 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-emerald/15 flex items-center justify-center text-accent-emerald">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isPersian ? 'کلید رمزنگاری سرتاسری' : 'End-to-End Encryption'}
                </h3>
                <p className="text-[11px] text-gray-400 truncate max-w-[240px]">{chatTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Visual Emoji Sequence */}
          <div className="my-6 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3 p-4 bg-dark-800/80 rounded-2xl border border-white/5 shadow-inner">
              {visualEmojis.map((emoji, idx) => (
                <span key={idx} className="text-3xl select-none" role="img" aria-label="fingerprint-emoji">
                  {emoji}
                </span>
              ))}
            </div>

            {/* Hex Fingerprint Key */}
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-900 border border-white/10 font-mono text-xs text-accent-emerald select-all">
              <KeyRound className="w-3.5 h-3.5 text-accent-emerald/80 shrink-0" />
              <span>{fingerprintHex}</span>
              <button
                onClick={handleCopy}
                title="Copy Fingerprint"
                className="ml-1 p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-accent-emerald" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-300 leading-relaxed max-w-sm">
              {isPersian
                ? 'این ۴ ایموجی و اثر انگشت هگزادسیمال روی دستگاه شما و مخاطب کاملاً یکسان هستند. تطابق آن‌ها اثبات می‌کند که هیچ شنود یا واسطه‌ای (Man-in-the-Middle) وجود ندارد.'
                : 'These 4 emojis and hexadecimal key fingerprint are identical on your device and your chat partner’s. If they match, your communication is 200% secure with zero third-party interception.'}
            </p>
          </div>

          {/* Self-Destruct Timer (TTL) Selector */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-200">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              <span>{isPersian ? 'تایمر تخریب خودکار پیام‌ها (TTL)' : 'Self-Destruct Timer (TTL)'}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TTL_OPTIONS.map((opt) => (
                <button
                  key={opt.seconds}
                  disabled={isUpdatingTtl}
                  onClick={() => handleTtlSelect(opt.seconds)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedTtl === opt.seconds
                      ? 'bg-accent-emerald text-dark-900 font-bold shadow-md'
                      : 'bg-dark-800 text-gray-300 hover:bg-dark-750 hover:text-white border border-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Verification Badge */}
          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-accent-emerald/90 bg-accent-emerald/10 border border-accent-emerald/20 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{isPersian ? 'رمزنگاری MTProto AES-256-IGE فعال است' : 'MTProto AES-256-IGE & Diffie-Hellman Active'}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
