import React, { useState, useRef } from 'react'
import {
  X,
  ExternalLink,
  RefreshCw,
  Copy,
  Maximize2,
  Minimize2,
  Bot,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'

export interface MiniAppModalProps {
  isOpen: boolean
  url: string
  title: string
  botName?: string
  botUsername?: string
  onClose: () => void
  onOpenInNewWindow?: () => void
}

export const MiniAppModal: React.FC<MiniAppModalProps> = ({
  isOpen,
  url,
  title,
  botName,
  botUsername,
  onClose,
  onOpenInNewWindow,
}) => {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  if (!isOpen) return null

  const handleReload = () => {
    setIsLoading(true)
    setReloadKey((prev) => prev + 1)
  }

  const handlePopOut = () => {
    if (onOpenInNewWindow) {
      onOpenInNewWindow()
      return
    }
    if (window.guidegram?.openMiniApp) {
      window.guidegram.openMiniApp(url, title || botName || 'Telegram Mini App')
      onClose()
    }
  }

  const handleCopyLink = async () => {
    await copyTextToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col bg-dark-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isExpanded
            ? 'w-full h-full max-w-5xl max-h-[92vh]'
            : 'w-full max-w-md h-[740px] max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-14 px-4 bg-dark-850/90 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/40 text-primary-400 flex items-center justify-center shrink-0 shadow-inner">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs font-bold text-white truncate">{title || botName || 'Mini App'}</span>
                <ShieldCheck className="w-3 h-3 text-accent-cyan shrink-0" />
              </div>
              {botUsername && (
                <span className="text-[10px] text-gray-400 font-mono truncate">@{botUsername}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Reload button */}
            <button
              type="button"
              onClick={handleReload}
              title={t('miniapp.reload') || 'Reload'}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-400' : ''}`} />
            </button>

            {/* Expand / Minimize button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? 'Normal view' : 'Expand view'}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Pop-out into Electron Standalone Window */}
            <button
              type="button"
              onClick={handlePopOut}
              title={t('miniapp.open_window') || 'Open in Standalone Window'}
              className="p-2 rounded-xl text-gray-400 hover:text-accent-cyan hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Copy link */}
            <button
              type="button"
              onClick={handleCopyLink}
              title={t('miniapp.copy_link') || 'Copy Mini App Link'}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-accent-emerald" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              title={t('miniapp.close') || 'Close'}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Webview / iframe Viewport */}
        <div className="relative flex-1 min-h-0 bg-dark-950 flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-dark-950/90 backdrop-blur-sm gap-3 animate-in fade-in">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan flex items-center justify-center text-white shadow-glow animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-cyan opacity-40 blur-sm animate-ping" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-white">
                  {t('miniapp.loading') || 'Loading Telegram Mini App...'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {botName || 'Telegram WebApp 8.0'}
                </span>
              </div>
            </div>
          )}

          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={url}
            title={title || 'Telegram Mini App'}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0 bg-[#0F1117]"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            allow="camera; microphone; geolocation; clipboard-write"
          />
        </div>

        {/* Safe Area Footer Indicator */}
        <div className="h-4 bg-dark-850/60 border-t border-white/5 flex items-center justify-center shrink-0">
          <div className="w-16 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  )
}
