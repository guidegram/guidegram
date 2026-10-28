import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Download,
  Forward,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit3,
  Bookmark,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react'
import type { MessageItem, DialogItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { copyImageToClipboard } from '../utils/clipboard'
import { isRTL } from '../utils/textUtils'
import { Avatar } from './Avatar'
import { SmartContextMenu } from './SmartContextMenu'

export interface MediaViewerModalProps {
  isOpen: boolean
  url: string
  message?: MessageItem | null
  allPhotoMessages?: MessageItem[]
  currentChat?: DialogItem | null
  onClose: () => void
  onNavigate?: (msg: MessageItem, url?: string) => void
  onForward?: (msg: MessageItem) => void
  onDeleteMessage?: (msg: MessageItem) => Promise<boolean | void>
  onEditMessage?: (msg: MessageItem) => void
  onGoToMessage?: (msgId: number) => void
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  url,
  message,
  allPhotoMessages = [],
  currentChat,
  onClose,
  onNavigate,
  onForward,
  onDeleteMessage,
  onEditMessage,
  onGoToMessage,
}) => {
  const { t, language } = useI18n()
  const isLanguageRTL = (language as string) === 'fa' || (language as string) === 'ar'

  // Zoom & Pan state
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Toast / feedback message
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = useCallback((msg: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setFeedbackToast(msg)
    feedbackTimerRef.current = setTimeout(() => setFeedbackToast(null), 2500)
  }, [])

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Reset transforms whenever url changes
  useEffect(() => {
    setScale(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setContextMenu(null)
  }, [url])

  // Current photo index in gallery
  const currentIndex = useMemo(() => {
    if (!message || allPhotoMessages.length === 0) return -1
    return allPhotoMessages.findIndex((m) => m.id === message.id)
  }, [message, allPhotoMessages])

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < allPhotoMessages.length - 1

  const handlePrev = useCallback(() => {
    if (!hasPrev || !onNavigate) return
    const prevMsg = allPhotoMessages[currentIndex - 1]
    onNavigate(prevMsg)
  }, [hasPrev, onNavigate, allPhotoMessages, currentIndex])

  const handleNext = useCallback(() => {
    if (!hasNext || !onNavigate) return
    const nextMsg = allPhotoMessages[currentIndex + 1]
    onNavigate(nextMsg)
  }, [hasNext, onNavigate, allPhotoMessages, currentIndex])

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, Math.round((prev + 0.3) * 10) / 10))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(1, Math.round((prev - 0.3) * 10) / 10)
      if (next <= 1) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360)
  }, [])

  // Copy Image handler
  const handleCopyImage = useCallback(async () => {
    setContextMenu(null)
    showToast(t('chat.preparing_save') || 'Copying image...')
    try {
      const ok = await copyImageToClipboard(url)
      if (ok) {
        showToast(t('chat.image_copied') || 'Image copied to clipboard')
      } else {
        showToast('Failed to copy image to clipboard')
      }
    } catch {
      showToast('Failed to copy image to clipboard')
    }
  }, [url, showToast, t])

  // Save Image handler
  const handleSaveImage = useCallback(async () => {
    setContextMenu(null)
    try {
      if (message && window.guidegram?.saveMediaToFile) {
        showToast(t('chat.preparing_save') || 'Preparing download...')
        const defaultName = message.mediaFileName || `photo_${message.id}_${Date.now()}.jpg`
        const res = await window.guidegram.saveMediaToFile(
          message.accountId,
          message.chatId,
          message.id,
          defaultName
        )
        if (res?.success) {
          showToast(t('chat.file_saved') || 'Image saved successfully')
        } else if (!res?.canceled) {
          showToast(t('chat.file_save_error') || 'Failed to save image')
        }
        return
      }

      if (window.guidegram?.saveImageToFile) {
        showToast(t('chat.preparing_save') || 'Preparing download...')
        const defaultName = `photo_${Date.now()}.jpg`
        const res = await window.guidegram.saveImageToFile({
          filePath: url.startsWith('guidegram-media://') || url.includes(':\\') || url.startsWith('/') ? url : undefined,
          dataUrl: url.startsWith('data:') ? url : undefined,
          defaultName,
        })
        if (res?.success) {
          showToast(t('chat.file_saved') || 'Image saved successfully')
          return
        }
      }

      // Browser anchor download fallback
      const a = document.createElement('a')
      a.href = url
      a.download = `photo_${Date.now()}.jpg`
      a.click()
      showToast(t('chat.file_saved') || 'Image saved successfully')
    } catch (err: any) {
      showToast(t('chat.file_save_error') || 'Failed to save image')
    }
  }, [message, url, showToast, t])

  // Fullscreen toggle handler
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // Double-click zoom handler
  const handleImageDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setScale((prev) => {
      if (prev > 1) {
        setPan({ x: 0, y: 0 })
        return 1
      }
      return 2
    })
  }, [])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(4, Math.round((prev + 0.2) * 10) / 10))
    } else {
      setScale((prev) => {
        const next = Math.max(1, Math.round((prev - 0.2) * 10) / 10)
        if (next <= 1) setPan({ x: 0, y: 0 })
        return next
      })
    }
  }, [])

  // Mouse drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only primary button
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    })
  }

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false)
  }

  // Right-click on image
  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 340),
    })
  }

  // GLOBAL KEYBOARD LISTENER WITH CAPTURE PHASE
  // Guaranteed to intercept Escape and prevent any other handler (e.g. App.tsx) from deselecting chat!
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      // 1. ESCAPE: Close modal immediately!
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        if (contextMenu) {
          setContextMenu(null)
          return
        }
        onClose()
        return
      }

      // 2. ARROWS: Gallery navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        e.stopPropagation()
        if (isLanguageRTL) handleNext()
        else handlePrev()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        if (isLanguageRTL) handlePrev()
        else handleNext()
        return
      }

      // 3. ZOOM / ROTATE SHORTCUTS
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoomIn()
        return
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        handleZoomOut()
        return
      }
      if (e.key === '0') {
        e.preventDefault()
        handleResetZoom()
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRotate()
        return
      }

      // 4. COPY (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        handleCopyImage()
        return
      }

      // 5. SAVE (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSaveImage()
        return
      }
    }

    // Capture phase listener
    window.addEventListener('keydown', handleKeyDownCapture, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, { capture: true })
    }
  }, [
    isOpen,
    contextMenu,
    onClose,
    handlePrev,
    handleNext,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleRotate,
    handleCopyImage,
    handleSaveImage,
    isLanguageRTL,
  ])

  // Close context menu on global click
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [contextMenu])

  if (!isOpen || !url) return null

  const isSavedMessages = Boolean(
    currentChat?.isSavedMessages ||
    currentChat?.id === 'saved_messages' ||
    (message && currentChat && currentChat.id === message.senderId && currentChat.isUser)
  )

  const isOutgoing = Boolean(message?.isOutgoing)
  const canEdit = Boolean(message && (isSavedMessages || isOutgoing) && !message.isService)
  const canDelete = Boolean(
    message &&
    (isSavedMessages || isOutgoing || (!currentChat?.isChannel && !currentChat?.isGroup))
  )

  // Format message time if available
  const formattedTime = (() => {
    if (!message?.date) return ''
    try {
      const d = new Date(message.date < 1e11 ? message.date * 1000 : message.date)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  })()

  const formattedDate = (() => {
    if (!message?.date) return ''
    try {
      const d = new Date(message.date < 1e11 ? message.date * 1000 : message.date)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  })()

  const modalContent = (
    <div
      data-media-viewer-root="true"
      className="fixed inset-0 z-[99999] flex flex-col justify-between select-none overflow-hidden bg-black/95 backdrop-blur-xl animate-in fade-in duration-150"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. DEDICATED BACKDROP CLICK LAYER */}
      <div
        data-backdrop="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
        className="absolute inset-0 z-0 cursor-default"
      />

      {/* 2. TOP HEADER TOOLBAR */}
      <header
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/10 bg-gradient-to-b from-black/85 via-black/60 to-transparent backdrop-blur-md"
      >
        {/* Left Side: Sender / Chat Info & Go To Message */}
        <div className="flex items-center gap-3 min-w-0">
          {isSavedMessages ? (
            <div className="w-10 h-10 rounded-2xl bg-accent-cyan/20 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shadow-glow shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
          ) : message?.senderAvatarUrl || currentChat?.avatarUrl ? (
            <Avatar
              accountId={message?.accountId || currentChat?.accountId || ''}
              peerId={message?.senderId || currentChat?.id || ''}
              title={message?.senderName || currentChat?.title || 'User'}
              avatarUrl={message?.senderAvatarUrl || currentChat?.avatarUrl}
              size="md"
              className="shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold shrink-0">
              {(message?.senderName || currentChat?.title || '?')[0].toUpperCase()}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {isSavedMessages
                  ? t('app.saved_messages') || 'Saved Messages'
                  : message?.senderName || currentChat?.title || 'Photo'}
              </span>
              {message && onGoToMessage && (
                <button
                  type="button"
                  onClick={() => {
                    onGoToMessage(message.id)
                    onClose()
                  }}
                  title={t('chat.go_to_message') || 'Go to Message'}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-accent-cyan/20 hover:text-accent-cyan text-[11px] font-medium text-gray-300 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('chat.go_to_message') || 'Go to Message'}</span>
                </button>
              )}
            </div>
            {(formattedDate || formattedTime) && (
              <span className="text-[11px] text-gray-400 font-mono">
                {formattedDate} {formattedTime && `at ${formattedTime}`}
              </span>
            )}
          </div>
        </div>

        {/* Center: Counter Indicator */}
        {allPhotoMessages.length > 1 && currentIndex >= 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-gray-200 backdrop-blur-md">
            <span>
              {t('chat.image_counter', {
                current: currentIndex + 1,
                total: allPhotoMessages.length,
              }) || `${currentIndex + 1} of ${allPhotoMessages.length}`}
            </span>
          </div>
        )}

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-1 md:gap-1.5">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title={t('chat.zoom_out') || 'Zoom Out (-)'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Current Scale Percentage */}
          <button
            type="button"
            onClick={handleResetZoom}
            title={t('chat.reset_zoom') || 'Reset Zoom (100%)'}
            className="px-2 py-1 min-w-[50px] text-center rounded-xl bg-white/5 hover:bg-white/15 text-xs font-mono font-medium text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title={t('chat.zoom_in') || 'Zoom In (+)'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Rotate 90 deg */}
          <button
            type="button"
            onClick={handleRotate}
            title={t('chat.rotate_image') || 'Rotate 90° (R)'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Copy Image */}
          <button
            type="button"
            onClick={handleCopyImage}
            title={t('chat.copy_image') || 'Copy Image (Ctrl+C)'}
            className="p-2 rounded-xl bg-white/5 hover:bg-accent-cyan/20 text-gray-200 hover:text-accent-cyan transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Save Image As... */}
          <button
            type="button"
            onClick={handleSaveImage}
            title={t('chat.save_image_as') || 'Save Image As... (Ctrl+S)'}
            className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-gray-200 hover:text-emerald-400 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Forward */}
          {message && onForward && (
            <button
              type="button"
              onClick={() => {
                onForward(message)
                onClose()
              }}
              title={t('app.forward') || 'Forward'}
              className="p-2 rounded-xl bg-white/5 hover:bg-primary-500/20 text-gray-200 hover:text-primary-400 transition-all cursor-pointer"
            >
              <Forward className="w-4 h-4" />
            </button>
          )}

          {/* Delete */}
          {message && onDeleteMessage && canDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm('Delete this photo?')) {
                  await onDeleteMessage(message)
                  onClose()
                }
              }}
              title={t('app.delete') || 'Delete'}
              className="p-2 rounded-xl bg-white/5 hover:bg-accent-rose/20 text-gray-200 hover:text-accent-rose transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
            className="hidden md:inline-flex p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Close (Esc) */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-xl bg-white/10 hover:bg-accent-rose hover:text-white text-gray-200 transition-all cursor-pointer group flex items-center gap-1.5"
          >
            <X className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="hidden xl:inline text-[10px] font-mono opacity-60">Esc</span>
          </button>
        </div>
      </header>

      {/* 3. MAIN INTERACTIVE IMAGE VIEWPORT */}
      <div
        data-backdrop="true"
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.backdrop === 'true') {
            onClose()
          }
        }}
        onWheel={handleWheel}
        className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden cursor-default"
      >
        {/* Floating Previous Button */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            title="Previous (Arrow Left)"
            className={`absolute ${
              isLanguageRTL ? 'right-4 md:right-8' : 'left-4 md:left-8'
            } z-30 w-12 h-12 rounded-2xl bg-black/60 hover:bg-dark-800 border border-white/15 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Floating Next Button */}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            title="Next (Arrow Right)"
            className={`absolute ${
              isLanguageRTL ? 'left-4 md:left-8' : 'right-4 md:right-8'
            } z-30 w-12 h-12 rounded-2xl bg-black/60 hover:bg-dark-800 border border-white/15 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Image Container with Transforms & Drag-to-Pan */}
        <div
          data-backdrop="true"
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.backdrop === 'true') {
              onClose()
            }
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={url}
            alt={message?.text || 'Enlarged photo'}
            draggable={false}
            onDoubleClick={handleImageDoubleClick}
            onMouseDown={handleMouseDown}
            onContextMenu={handleImageContextMenu}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              maxHeight: 'calc(100vh - 160px)',
              maxWidth: 'calc(100vw - 80px)',
            }}
            className={`object-contain rounded-2xl shadow-2xl select-none ${
              scale > 1
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-zoom-in'
            }`}
          />
        </div>
      </div>

      {/* 4. BOTTOM CAPTION & METADATA FOOTER */}
      {message?.text && (
        <footer
          onClick={(e) => e.stopPropagation()}
          className="relative z-20 px-6 py-3.5 border-t border-white/10 bg-gradient-to-t from-black/90 via-black/75 to-transparent backdrop-blur-md flex flex-col items-center justify-center max-h-40 overflow-y-auto"
        >
          <div
            dir={isRTL(message.text) ? 'rtl' : 'ltr'}
            className="max-w-3xl w-full text-center text-sm text-gray-100 font-sans leading-relaxed select-text whitespace-pre-wrap"
          >
            {message.forwardFromName && (
              <div className="text-xs text-accent-cyan font-semibold mb-1">
                Forwarded from {message.forwardFromName}
              </div>
            )}
            <p>{message.text}</p>
          </div>
        </footer>
      )}

      {/* 5. RIGHT-CLICK CONTEXT MENU ON IMAGE */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
          <SmartContextMenu x={contextMenu.x} y={contextMenu.y}>
            {/* Copy Image */}
            <button
              type="button"
              onClick={handleCopyImage}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-100 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
            >
              <div className="flex items-center gap-2.5">
                <Copy className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                <span>{t('chat.copy_image') || 'Copy Image'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">Ctrl+C</span>
            </button>

            {/* Save Image As... */}
            <button
              type="button"
              onClick={handleSaveImage}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-100 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t('chat.save_image_as') || 'Save Image As...'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">Ctrl+S</span>
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={() => {
                handleRotate()
                setContextMenu(null)
              }}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-100 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
            >
              <div className="flex items-center gap-2.5">
                <RotateCw className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span>{t('chat.rotate_image') || 'Rotate 90°'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">R</span>
            </button>

            {/* Reset Zoom (if zoomed) */}
            {scale > 1 && (
              <button
                type="button"
                onClick={() => {
                  handleResetZoom()
                  setContextMenu(null)
                }}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-100 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <ZoomOut className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span>{t('chat.reset_zoom') || 'Reset Zoom (100%)'}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">0</span>
              </button>
            )}

            <div className="h-px bg-white/10 my-1 -mx-1" />

            {/* Go to Message in Chat */}
            {message && onGoToMessage && (
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null)
                  onGoToMessage(message.id)
                  onClose()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-accent-cyan hover:text-white hover:bg-accent-cyan/15 transition-colors text-left cursor-pointer font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
                <span>{t('chat.go_to_message') || 'Go to Message'}</span>
              </button>
            )}

            {/* Forward */}
            {message && onForward && (
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null)
                  onForward(message)
                  onClose()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-100 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer font-medium"
              >
                <Forward className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                <span>{t('app.forward') || 'Forward'}</span>
              </button>
            )}

            {/* Edit Message (in Saved Messages or Outgoing) */}
            {message && canEdit && onEditMessage && (
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null)
                  onEditMessage(message)
                  onClose()
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-primary-300 hover:text-white hover:bg-primary-600/25 transition-colors text-left cursor-pointer font-medium"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0 text-primary-400" />
                <span>{t('chat.edit_message') || 'Edit Message'}</span>
              </button>
            )}

            {/* Delete Message (if allowed) */}
            {message && canDelete && onDeleteMessage && (
              <>
                <div className="h-px bg-white/10 my-1 -mx-1" />
                <button
                  type="button"
                  onClick={async () => {
                    setContextMenu(null)
                    if (window.confirm('Delete this photo message?')) {
                      await onDeleteMessage(message)
                      onClose()
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-accent-rose hover:bg-accent-rose/15 transition-colors text-left cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('app.delete') || 'Delete'}</span>
                </button>
              </>
            )}
          </SmartContextMenu>
        </>
      )}

      {/* 6. TOAST FEEDBACK NOTIFICATION */}
      {feedbackToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-dark-900/95 border border-white/20 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
}
