import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
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
  ArrowLeft,
  Settings,
  Smartphone,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'

export interface MainButtonState {
  isVisible: boolean
  isActive: boolean
  text: string
  color?: string
  textColor?: string
  isProgressVisible?: boolean
  hasShineEffect?: boolean
}

export interface MiniAppModalProps {
  isOpen: boolean
  url: string
  title: string
  botName?: string
  botUsername?: string
  accountId?: string
  botPeerId?: string
  onClose: () => void
  onOpenInNewWindow?: () => void
}

export const MiniAppModal: React.FC<MiniAppModalProps> = ({
  isOpen,
  url,
  title,
  botName,
  botUsername,
  accountId,
  botPeerId,
  onClose,
  onOpenInNewWindow,
}) => {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [biometryAccessGranted, setBiometryAccessGranted] = useState(true)
  const [biometryToken, setBiometryToken] = useState('guidegram_secure_biometric_token_sample')
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Bi-directional WebApp state
  const [mainButton, setMainButton] = useState<MainButtonState>({
    isVisible: false,
    isActive: true,
    text: '',
    color: '#2563eb',
    textColor: '#ffffff',
    isProgressVisible: false,
    hasShineEffect: false,
  })
  const [backButtonVisible, setBackButtonVisible] = useState(false)
  const [settingsButtonVisible, setSettingsButtonVisible] = useState(false)
  const [customHeaderColor, setCustomHeaderColor] = useState<string | null>(null)
  const [customBgColor, setCustomBgColor] = useState<string | null>(null)
  const [hapticTriggered, setHapticTriggered] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dispatch events from Guidegram (parent) to Mini App iframe
  const postEventToWebApp = useCallback((eventType: string, eventData?: any) => {
    if (!iframeRef.current?.contentWindow) return
    try {
      const payload = JSON.stringify({
        eventType,
        eventData: eventData ?? {},
      })
      iframeRef.current.contentWindow.postMessage(payload, '*')
    } catch (err) {
      console.warn('[MiniAppModal] Failed to post message to WebApp iframe:', err)
    }
  }, [])

  // Sync current viewport metrics to iframe
  const syncViewport = useCallback(() => {
    const currentHeight = isFullscreen
      ? window.innerHeight
      : containerRef.current?.clientHeight || (isExpanded ? 780 : 640)
    postEventToWebApp('viewport_changed', {
      height: currentHeight,
      is_state_stable: true,
      is_expanded: isExpanded || isFullscreen,
    })
  }, [isExpanded, isFullscreen, postEventToWebApp])

  // Sync theme palette parameters to iframe
  const syncThemeParams = useCallback(() => {
    postEventToWebApp('theme_changed', {
      theme_params: {
        bg_color: '#0f1117',
        text_color: '#ffffff',
        hint_color: '#9ca3af',
        link_color: '#38bdf8',
        button_color: '#2563eb',
        button_text_color: '#ffffff',
        secondary_bg_color: '#1a1f2c',
        header_bg_color: '#12151e',
        accent_text_color: '#06b6d4',
        section_bg_color: '#161b26',
        section_header_text_color: '#38bdf8',
        subtitle_text_color: '#94a3b8',
        destructive_text_color: '#f43f5e',
      },
    })
  }, [postEventToWebApp])

  // Handle incoming Telegram WebApp postMessage events from iframe
  useEffect(() => {
    if (!isOpen) return

    const handleMessage = async (event: MessageEvent) => {
      let data = event.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }

      if (!data || typeof data !== 'object') return
      const { eventType, eventData } = data

      switch (eventType) {
        case 'web_app_request_viewport':
          syncViewport()
          break

        case 'web_app_request_theme':
          syncThemeParams()
          break

        case 'web_app_setup_main_button':
          if (eventData) {
            setMainButton((prev) => ({
              ...prev,
              isVisible: typeof eventData.is_visible === 'boolean' ? eventData.is_visible : prev.isVisible,
              isActive: typeof eventData.is_active === 'boolean' ? eventData.is_active : prev.isActive,
              text: typeof eventData.text === 'string' ? eventData.text : prev.text,
              color: eventData.color || prev.color,
              textColor: eventData.text_color || prev.textColor,
              isProgressVisible: Boolean(eventData.is_progress_visible),
              hasShineEffect: Boolean(eventData.has_shine_effect),
            }))
          }
          break

        case 'web_app_setup_back_button':
          setBackButtonVisible(Boolean(eventData?.is_visible))
          break

        case 'web_app_setup_settings_button':
          setSettingsButtonVisible(Boolean(eventData?.is_visible))
          break

        case 'web_app_set_header_color':
          if (eventData?.color) {
            setCustomHeaderColor(eventData.color)
          } else if (eventData?.color_key === 'secondary_bg_color') {
            setCustomHeaderColor('#1a1f2c')
          } else {
            setCustomHeaderColor(null)
          }
          break

        case 'web_app_set_background_color':
          if (eventData?.color) {
            setCustomBgColor(eventData.color)
          } else {
            setCustomBgColor(null)
          }
          break

        case 'web_app_expand':
          setIsExpanded(true)
          break

        case 'web_app_close':
          onClose()
          break

        case 'web_app_trigger_haptic_feedback':
          setHapticTriggered(true)
          setTimeout(() => setHapticTriggered(false), 200)
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            const hapticType = eventData?.type
            if (hapticType === 'impact') {
              navigator.vibrate(eventData?.impact_style === 'heavy' ? 40 : 15)
            } else if (hapticType === 'notification') {
              navigator.vibrate([20, 50, 20])
            } else {
              navigator.vibrate(10)
            }
          }
          break

        case 'web_app_data_send':
          if (eventData?.data) {
            try {
              if (window.guidegram?.sendWebViewData && accountId && (botPeerId || botUsername)) {
                await window.guidegram.sendWebViewData(
                  accountId,
                  botPeerId || botUsername || '',
                  mainButton.text || 'Mini App',
                  eventData.data
                )
              }
            } catch (err) {
              console.warn('[MiniAppModal] sendWebViewData error:', err)
            }
          }
          break

        case 'web_app_open_link':
          if (eventData?.url) {
            window.open(eventData.url, '_blank')
          }
          break

        case 'web_app_open_telegram_link':
          if (eventData?.path_full) {
            window.open(`https://t.me/${eventData.path_full.replace(/^\/+/, '')}`, '_blank')
          }
          break

        case 'web_app_request_fullscreen':
          setIsFullscreen(true)
          postEventToWebApp('fullscreen_changed', { is_fullscreen: true })
          break

        case 'web_app_exit_fullscreen':
          setIsFullscreen(false)
          postEventToWebApp('fullscreen_changed', { is_fullscreen: false })
          break

        case 'web_app_biometry_get_info':
          postEventToWebApp('biometry_info_received', {
            available: true,
            type: 'finger',
            access_requested: true,
            access_granted: biometryAccessGranted,
            token_saved: Boolean(biometryToken),
            device_id: 'guidegram-desktop-secure-enclave',
          })
          break

        case 'web_app_biometry_request_access':
          setBiometryAccessGranted(true)
          postEventToWebApp('biometry_info_received', {
            available: true,
            type: 'finger',
            access_requested: true,
            access_granted: true,
            token_saved: Boolean(biometryToken),
            device_id: 'guidegram-desktop-secure-enclave',
          })
          break

        case 'web_app_biometry_request_auth':
          postEventToWebApp('biometry_auth_requested', {
            status: 'authorized',
            token: biometryToken || 'guidegram-biometry-auth-token-valid',
          })
          break

        case 'web_app_biometry_update_token':
          if (eventData?.token) {
            setBiometryToken(eventData.token)
          }
          postEventToWebApp('biometry_token_updated', { status: 'updated' })
          break

        case 'web_app_biometry_open_settings':
          setSettingsButtonVisible(true)
          break

        default:
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [isOpen, accountId, botPeerId, botUsername, mainButton.text, onClose, syncThemeParams, syncViewport])

  // Trigger viewport synchronization whenever modal expansion state changes
  useEffect(() => {
    if (!isLoading) {
      syncViewport()
    }
  }, [isExpanded, isLoading, syncViewport])

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

  const handleIframeLoaded = () => {
    setIsLoading(false)
    syncThemeParams()
    syncViewport()
  }

  const handleMainButtonClick = () => {
    if (!mainButton.isActive || mainButton.isProgressVisible) return
    postEventToWebApp('main_button_pressed')
  }

  const handleBackButtonClick = () => {
    postEventToWebApp('back_button_pressed')
  }

  const handleSettingsButtonClick = () => {
    postEventToWebApp('settings_button_pressed')
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev
      postEventToWebApp('fullscreen_changed', { is_fullscreen: next })
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        style={{
          backgroundColor: customBgColor || '#0f1117',
        }}
        className={`relative flex flex-col border border-white/10 shadow-2xl overflow-hidden transition-all ${
          isFullscreen
            ? 'fixed inset-0 w-screen h-screen max-w-none max-h-none rounded-none z-50'
            : isExpanded
            ? 'w-full h-full max-w-5xl max-h-[94vh] rounded-3xl'
            : 'w-full max-w-md h-[760px] max-h-[90vh] rounded-3xl'
        } ${hapticTriggered ? 'ring-2 ring-primary-500/50' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            backgroundColor: customHeaderColor || '#141824',
          }}
          className="h-14 px-4 border-b border-white/10 flex items-center justify-between shrink-0 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Native Telegram WebApp Back Button */}
            {backButtonVisible && (
              <button
                type="button"
                onClick={handleBackButtonClick}
                title="Back in Mini App"
                className="p-1.5 -ml-1 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/40 text-primary-400 flex items-center justify-center shrink-0 shadow-inner">
              <Bot className="w-4 h-4" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs font-bold text-white truncate">{title || botName || 'Mini App'}</span>
                <ShieldCheck className="w-3 h-3 text-accent-cyan shrink-0" />
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono">
                  BioID
                </span>
              </div>
              {botUsername && (
                <span className="text-[10px] text-gray-400 font-mono truncate">@{botUsername}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Native Telegram WebApp Settings Button */}
            {settingsButtonVisible && (
              <button
                type="button"
                onClick={handleSettingsButtonClick}
                title="Settings"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

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

            {/* Fullscreen toggle button (Telegram Bot API 8.0) */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-2 rounded-xl text-gray-400 hover:text-primary-400 hover:bg-white/10 transition-colors"
            >
              <Smartphone className={`w-3.5 h-3.5 ${isFullscreen ? 'text-primary-400' : ''}`} />
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

        {/* Webview / iframe Viewport Container */}
        <div
          ref={containerRef}
          style={{
            backgroundColor: customBgColor || '#0f1117',
          }}
          className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden transition-colors"
        >
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
            onLoad={handleIframeLoaded}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            allow="camera; microphone; geolocation; clipboard-write"
          />
        </div>

        {/* Native Telegram WebApp MainButton */}
        <AnimatePresence>
          {mainButton.isVisible && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18 }}
              className="p-3 bg-dark-900/95 border-t border-white/10 shrink-0"
            >
              <button
                type="button"
                disabled={!mainButton.isActive || mainButton.isProgressVisible}
                onClick={handleMainButtonClick}
                style={{
                  backgroundColor: mainButton.color || '#2563eb',
                  color: mainButton.textColor || '#ffffff',
                }}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden select-none ${
                  mainButton.isActive && !mainButton.isProgressVisible
                    ? 'hover:brightness-110 active:scale-[0.98] cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                {mainButton.isProgressVisible && (
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                )}
                <span>{mainButton.text || 'Continue'}</span>
                {mainButton.hasShineEffect && (
                  <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse pointer-events-none" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Safe Area Footer Indicator */}
        <div className="h-4 bg-dark-850/60 border-t border-white/5 flex items-center justify-center shrink-0">
          <div className="w-16 h-1 rounded-full bg-white/20" />
        </div>
      </motion.div>
    </div>
  )
}
