import React, { useState, useMemo, useCallback } from 'react'
import {
  Phone,
  MapPin,
  BarChart2,
  ExternalLink,
  AppWindow,
  X,
  Keyboard,
  ChevronDown,
  AlertCircle,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { isRTL } from '../../utils/textUtils'

export interface KeyboardButtonItem {
  text: string
  type?: 'default' | 'request_phone' | 'request_location' | 'request_poll' | 'web_app' | string
  url?: string
  style?: 'primary' | 'danger' | 'success' | string
  iconCustomEmojiId?: string
  _?:
    | 'keyboardButton'
    | 'keyboardButtonRequestPhone'
    | 'keyboardButtonRequestGeoLocation'
    | 'keyboardButtonRequestPoll'
    | 'keyboardButtonWebView'
    | 'keyboardButtonSimpleWebView'
    | 'keyboardButtonUrl'
    | string
}

export interface KeyboardButtonRow {
  buttons: KeyboardButtonItem[]
}

export interface ReplyKeyboardMarkupData {
  _?: 'replyKeyboardMarkup' | 'replyKeyboardHide' | string
  type?: 'keyboard' | 'hide' | string
  resize?: boolean
  resize_keyboard?: boolean
  single_use?: boolean
  one_time_keyboard?: boolean
  selective?: boolean
  persistent?: boolean
  placeholder?: string
  rows: KeyboardButtonRow[] | KeyboardButtonItem[][]
}

export interface ReplyKeyboardToggleButtonProps {
  hasKeyboard: boolean
  isOpen: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}

/**
 * Official Telegram 4-Dots Grid Icon
 * 4 circular dots in a 2x2 grid, matching official Telegram Desktop & Android input bar icon.
 */
export const FourDotsIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="14" cy="6" r="2.2" />
    <circle cx="6" cy="14" r="2.2" />
    <circle cx="14" cy="14" r="2.2" />
  </svg>
)

/**
 * 4-Dots Toggle Button
 * Official 4-dots grid icon button rendered on the bottom-right of the input bar
 * (between textarea and emoji button). Toggles the custom reply keyboard panel open/closed.
 */
export const ReplyKeyboardToggleButton: React.FC<ReplyKeyboardToggleButtonProps> = ({
  hasKeyboard,
  isOpen,
  onToggle,
  disabled = false,
  className = '',
}) => {
  if (!hasKeyboard) return null

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={isOpen ? 'Hide bot keyboard' : 'Show bot keyboard'}
      className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center select-none ${
        isOpen
          ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-glow'
          : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/5'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-primary-400" />
      ) : (
        <FourDotsIcon className="w-4 h-4 text-gray-300 hover:text-primary-400 transition-colors" />
      )}
    </button>
  )
}

export interface ReplyKeyboardPanelProps {
  replyMarkup?: ReplyKeyboardMarkupData | null
  isOpen: boolean
  botName?: string
  botUsername?: string
  onToggleOpen?: (open: boolean) => void
  onSendMessage: (text: string) => void
  onSendContact?: (phone?: string, firstName?: string) => Promise<void> | void
  onSendLocation?: (coords: { latitude: number; longitude: number }) => Promise<void> | void
  onLaunchMiniApp?: (url: string, title?: string) => Promise<void> | void
  className?: string
}

/**
 * ReplyKeyboardPanel
 * Persistent custom reply keyboard panel docked below the input bar.
 * Disentangles ReplyKeyboardMarkup from message bubbles into a dedicated interactive keyboard dock.
 * Supports:
 * - Dynamic multi-row grid with responsive heights (resize_keyboard)
 * - one_time_keyboard auto-collapse on button click
 * - keyboardButton (sends text)
 * - keyboardButtonRequestPhone (confirmation modal)
 * - keyboardButtonRequestGeoLocation (confirmation modal)
 * - keyboardButtonWebView (launches Mini App)
 * - replyKeyboardHide handling
 */
export const ReplyKeyboardPanel: React.FC<ReplyKeyboardPanelProps> = ({
  replyMarkup,
  isOpen,
  botName = 'Bot',
  botUsername,
  onToggleOpen,
  onSendMessage,
  onSendContact,
  onSendLocation,
  onLaunchMiniApp,
  className = '',
}) => {
  // Confirmation modal states
  const [pendingPhoneBtn, setPendingPhoneBtn] = useState<KeyboardButtonItem | null>(null)
  const [pendingGeoBtn, setPendingGeoBtn] = useState<KeyboardButtonItem | null>(null)
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Check if markup is replyKeyboardHide
  const isHiddenMarkup = useMemo(() => {
    if (!replyMarkup) return true
    if (replyMarkup._ === 'replyKeyboardHide' || replyMarkup.type === 'hide') {
      return true
    }
    return false
  }, [replyMarkup])

  // Normalize rows to KeyboardButtonItem[][]
  const normalizedRows = useMemo<KeyboardButtonItem[][]>(() => {
    if (!replyMarkup || isHiddenMarkup || !Array.isArray(replyMarkup.rows)) {
      return []
    }

    return replyMarkup.rows.map((row: any) => {
      if (Array.isArray(row)) {
        return row
      }
      if (row && Array.isArray(row.buttons)) {
        return row.buttons
      }
      return []
    })
  }, [replyMarkup, isHiddenMarkup])

  // resize_keyboard flag
  const isResize = useMemo(() => {
    if (!replyMarkup) return false
    return Boolean(replyMarkup.resize ?? replyMarkup.resize_keyboard ?? false)
  }, [replyMarkup])

  // one_time_keyboard flag
  const isSingleUse = useMemo(() => {
    if (!replyMarkup) return false
    return Boolean(replyMarkup.single_use ?? replyMarkup.one_time_keyboard ?? false)
  }, [replyMarkup])

  // Auto-close on single_use
  const handleAutoCollapse = useCallback(() => {
    if (isSingleUse && onToggleOpen) {
      onToggleOpen(false)
    }
  }, [isSingleUse, onToggleOpen])

  // Button click dispatcher
  const handleButtonClick = async (btn: KeyboardButtonItem) => {
    // 1. Request Phone Button
    if (
      btn.type === 'request_phone' ||
      btn._ === 'keyboardButtonRequestPhone'
    ) {
      setPendingPhoneBtn(btn)
      return
    }

    // 2. Request Geolocation Button
    if (
      btn.type === 'request_location' ||
      btn._ === 'keyboardButtonRequestGeoLocation'
    ) {
      setLocationError(null)
      setPendingGeoBtn(btn)
      return
    }

    // 3. Web App / Mini App Button
    if (
      btn.type === 'web_app' ||
      btn._ === 'keyboardButtonWebView' ||
      btn._ === 'keyboardButtonSimpleWebView' ||
      btn.url
    ) {
      if (btn.url) {
        if (onLaunchMiniApp) {
          await onLaunchMiniApp(btn.url, btn.text)
        } else if (
          typeof window !== 'undefined' &&
          window.guidegram &&
          typeof window.guidegram.openMiniApp === 'function'
        ) {
          await window.guidegram.openMiniApp(btn.url, btn.text)
        } else {
          window.open(btn.url, '_blank', 'noopener,noreferrer')
        }
      }
      handleAutoCollapse()
      return
    }

    // 4. Default Text Button
    onSendMessage(btn.text)
    handleAutoCollapse()
  }

  // Confirm sharing phone
  const handleConfirmSharePhone = async () => {
    if (!pendingPhoneBtn) return
    try {
      if (onSendContact) {
        await onSendContact()
      } else {
        // Fallback send message
        onSendMessage(pendingPhoneBtn.text)
      }
      handleAutoCollapse()
    } finally {
      setPendingPhoneBtn(null)
    }
  }

  // Confirm sharing location
  const handleConfirmShareLocation = () => {
    if (!pendingGeoBtn) return
    setIsAcquiringLocation(true)
    setLocationError(null)

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setIsAcquiringLocation(false)
          setPendingGeoBtn(null)
          if (onSendLocation) {
            await onSendLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            })
          } else {
            onSendMessage(
              `📍 Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
            )
          }
          handleAutoCollapse()
        },
        (error) => {
          setIsAcquiringLocation(false)
          setLocationError(
            error.message ||
              'Could not acquire current location. Please ensure location permissions are granted.'
          )
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setIsAcquiringLocation(false)
      setLocationError('Geolocation is not supported in this environment.')
    }
  }

  // Guard: if hidden, empty, or collapsed
  if (isHiddenMarkup || normalizedRows.length === 0 || !isOpen) {
    return null
  }

  return (
    <>
      {/* Persistent Docked Reply Keyboard Panel */}
      <div
        className={`w-full bg-dark-900/95 border-t border-white/10 backdrop-blur-md p-2 flex flex-col gap-1.5 z-20 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 ${className}`}
      >
        {normalizedRows.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex gap-1.5 w-full">
            {row.map((btn, btnIdx) => {
              const isRtl = isRTL(btn.text)
              const isPhone =
                btn.type === 'request_phone' ||
                btn._ === 'keyboardButtonRequestPhone'
              const isLocation =
                btn.type === 'request_location' ||
                btn._ === 'keyboardButtonRequestGeoLocation'
              const isWebApp =
                btn.type === 'web_app' ||
                btn._ === 'keyboardButtonWebView' ||
                btn._ === 'keyboardButtonSimpleWebView' ||
                Boolean(btn.url)
              const isPoll =
                btn.type === 'request_poll' ||
                btn._ === 'keyboardButtonRequestPoll'

              const styleClass =
                btn.style === 'primary'
                  ? 'bg-sky-700/80 hover:bg-sky-600 active:bg-sky-800 text-white border-sky-400/40 shadow-sm'
                  : btn.style === 'success'
                  ? 'bg-emerald-700/80 hover:bg-emerald-600 active:bg-emerald-800 text-white border-emerald-400/40 shadow-sm'
                  : btn.style === 'danger'
                  ? 'bg-rose-800/80 hover:bg-rose-700 active:bg-rose-900 text-white border-rose-400/40 shadow-sm'
                  : 'bg-dark-800 hover:bg-dark-750 active:bg-dark-850 text-gray-100 hover:text-white border-white/10 shadow-sm'

              const heightClass = isResize
                ? 'py-2 px-3 text-xs'
                : 'min-h-[46px] py-2.5 px-3 text-sm'

              return (
                <button
                  key={`btn-${rowIdx}-${btnIdx}`}
                  type="button"
                  dir={isRtl ? 'rtl' : 'ltr'}
                  onClick={() => handleButtonClick(btn)}
                  className={`flex-1 min-w-0 rounded-xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer border ${heightClass} ${styleClass}`}
                  title={btn.text}
                >
                  {isPhone && (
                    <Phone className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  )}
                  {isLocation && (
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {isWebApp && (
                    <AppWindow className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}
                  {isPoll && (
                    <BarChart2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{btn.text}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Confirmation Modal: Request Phone */}
      {pendingPhoneBtn && (
        <div
          onClick={() => setPendingPhoneBtn(null)}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-dark-850 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-glow">
              <Phone className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-base text-gray-100">
                Share Phone Number?
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                The bot{' '}
                <span className="font-semibold text-primary-400">
                  {botName}
                  {botUsername ? ` (@${botUsername.replace(/^@/, '')})` : ''}
                </span>{' '}
                is requesting your phone number. Do you want to share your
                contact information?
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full mt-2">
              <button
                type="button"
                onClick={() => setPendingPhoneBtn(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 active:bg-dark-900 text-gray-300 hover:text-white font-bold text-xs transition-colors border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSharePhone}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white font-bold text-xs transition-all shadow-glow cursor-pointer"
              >
                Share Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Request Geolocation */}
      {pendingGeoBtn && (
        <div
          onClick={() => {
            if (!isAcquiringLocation) setPendingGeoBtn(null)
          }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-dark-850 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <MapPin className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-base text-gray-100">
                Share Current Location?
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                The bot{' '}
                <span className="font-semibold text-emerald-400">
                  {botName}
                  {botUsername ? ` (@${botUsername.replace(/^@/, '')})` : ''}
                </span>{' '}
                is requesting your geographic location. Do you want to share
                your current GPS coordinates?
              </p>
            </div>

            {locationError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs text-left flex items-start gap-2 w-full">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{locationError}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full mt-2">
              <button
                type="button"
                disabled={isAcquiringLocation}
                onClick={() => setPendingGeoBtn(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-750 active:bg-dark-900 text-gray-300 hover:text-white font-bold text-xs transition-colors border border-white/5 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAcquiringLocation}
                onClick={handleConfirmShareLocation}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isAcquiringLocation ? (
                  <span>Acquiring...</span>
                ) : (
                  <span>Share Location</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ReplyKeyboardPanel
