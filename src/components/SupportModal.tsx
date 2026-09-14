import React, { useState, useEffect } from 'react'
import {
  Heart,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  QrCode,
  Zap,
} from 'lucide-react'
import QRCode from 'qrcode'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'
import gramQrImg from '../assets/donate/gram.png'
import tronQrImg from '../assets/donate/tron.png'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

type CryptoNetwork = 'ton' | 'tron'

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { t, isRTL } = useI18n()
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('ton')
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [fallbackQr, setFallbackQr] = useState<string | null>(null)

  const DONATION_DATA = {
    ton: {
      id: 'ton' as const,
      name: 'GRAM / TON',
      networkName: 'TON Blockchain',
      networkShort: 'TON Network',
      address: 'UQBvB6Vjd-IGZz7a6xc6gdOlDyEJGIfCtLxcYl4nAGboDJBN',
      image: gramQrImg,
      deepLink: 'ton://transfer/UQBvB6Vjd-IGZz7a6xc6gdOlDyEJGIfCtLxcYl4nAGboDJBN',
      colorClass: 'from-blue-500/20 via-sky-500/10 to-transparent',
      borderClass: 'border-blue-500/40',
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
      hint: t('support.network_ton_hint'),
    },
    tron: {
      id: 'tron' as const,
      name: 'Tron (TRX / USDT)',
      networkName: 'TRC-20 Network',
      networkShort: 'Tron Network',
      address: 'TFH25GHwwdd87vmi3xMmr6KXYsnV8wVMSH',
      image: tronQrImg,
      deepLink: null,
      colorClass: 'from-red-500/20 via-rose-500/10 to-transparent',
      borderClass: 'border-red-500/40',
      badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
      btnClass: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20',
      hint: t('support.network_tron_hint'),
    },
  }

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Reset fallback QR when network changes
  useEffect(() => {
    setFallbackQr(null)
  }, [selectedNetwork])

  if (!isOpen) return null

  const handleCopy = async (addr: string) => {
    const ok = await copyTextToClipboard(addr)
    if (ok) {
      setCopiedAddress(addr)
      setTimeout(() => {
        setCopiedAddress((prev) => (prev === addr ? null : prev))
      }, 2500)
    }
  }

  const handleImageError = () => {
    QRCode.toDataURL(activeItem.address, {
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => setFallbackQr(dataUrl))
      .catch((err) => console.error('[SupportModal] Failed to generate fallback QR code:', err))
  }

  const activeItem = DONATION_DATA[selectedNetwork]

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 select-none"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog Window */}
      <div className="relative w-full max-w-xl bg-[#0e1621] border border-white/10 shadow-2xl rounded-3xl overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-200 text-gray-200">
        {/* Header Ribbon / Glow */}
        <div className="relative p-6 sm:p-7 bg-[#17212b] border-b border-white/5 flex items-start justify-between gap-4 overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-1/4 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 min-w-0 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center shadow-lg shadow-pink-500/10 shrink-0">
              <Heart className="w-7 h-7 text-pink-400 fill-pink-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide truncate">
                  {t('support.title')}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Support</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {t('support.desc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network Selector Tabs */}
        <div className="p-4 sm:px-6 pt-5 pb-2">
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#17212b] border border-white/5 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedNetwork('ton')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedNetwork === 'ton'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>{t('support.gram_ton')}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedNetwork('tron')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedNetwork === 'tron'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-400/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-rose-300" />
              <span>{t('support.tron')}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 pt-3 space-y-4">
          <div
            className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-b ${activeItem.colorClass} bg-[#17212b] border ${activeItem.borderClass} transition-all duration-300 shadow-xl`}
          >
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
              {/* QR Code Container */}
              <div className="relative group shrink-0">
                <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center border border-gray-100 overflow-hidden">
                  <img
                    src={fallbackQr || activeItem.image}
                    alt={activeItem.name}
                    onError={handleImageError}
                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-dark-950/90 border border-white/20 text-[10px] text-gray-300 font-mono flex items-center gap-1 shadow-md">
                  <QrCode className="w-3 h-3 text-accent-cyan" />
                  <span>{t('support.scan_qr')}</span>
                </div>
              </div>

              {/* Details & Copy */}
              <div className="flex-1 w-full flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      {activeItem.name}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${activeItem.badgeClass}`}
                    >
                      {activeItem.networkName}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                    {activeItem.hint}
                  </p>
                </div>

                {/* Address Box */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {t('support.copy_address')}
                  </label>
                  <div
                    onClick={() => handleCopy(activeItem.address)}
                    title={activeItem.address}
                    className="w-full p-2.5 rounded-xl bg-dark-900/90 border border-white/10 hover:border-white/20 font-mono text-xs text-gray-200 break-all select-all cursor-pointer transition-all hover:bg-dark-900"
                  >
                    {activeItem.address}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(activeItem.address)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      copiedAddress === activeItem.address
                        ? 'bg-emerald-600 text-white'
                        : activeItem.btnClass
                    }`}
                  >
                    {copiedAddress === activeItem.address ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>{t('support.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t('support.copy_address')}</span>
                      </>
                    )}
                  </button>

                  {activeItem.deepLink && (
                    <a
                      href={activeItem.deepLink}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>{t('support.open_wallet')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sincere Thank You Note */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center text-xs text-gray-400 leading-relaxed">
            {t('support.thank_you')}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#17212b] border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
            <span>Guidegram</span>
            <span>•</span>
            <span>Open Source</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {t('app.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SupportModal
