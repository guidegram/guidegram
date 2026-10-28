import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  CheckCheck,
  BellOff,
  CornerDownLeft,
  Send,
  MessageSquare,
  Users,
  Megaphone,
  Loader2,
  Lock,
} from 'lucide-react'

export interface ActiveNotificationItem {
  id: string
  accountId: string
  chatId: string
  messageId?: number
  senderName: string
  chatTitle?: string
  avatarUrl?: string
  text?: string
  mediaType?: string
  date: number
  isGroup?: boolean
  isChannel?: boolean
  isBatch?: boolean
  batchCount?: number
}

export interface NotificationHUDProps {
  notifications: ActiveNotificationItem[]
  onDismiss: (id: string) => void
  onSelectChat: (accountId: string, chatId: string, messageId?: number) => void
  onQuickReply: (accountId: string, chatId: string, text: string, replyToMsgId?: number) => Promise<void>
  onMarkAsRead: (accountId: string, chatId: string, messageId?: number) => void
  onMuteChat: (accountId: string, chatId: string) => void
  position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'
  privacyMode?: 'full' | 'hide-text' | 'hide-all'
  quickReplyEnabled?: boolean
  vibrateEnabled?: boolean
  isMobile?: boolean
}

export const NotificationHUD: React.FC<NotificationHUDProps> = ({
  notifications,
  onDismiss,
  onSelectChat,
  onQuickReply,
  onMarkAsRead,
  onMuteChat,
  position = 'bottom-right',
  privacyMode = 'full',
  quickReplyEnabled = true,
  vibrateEnabled = true,
  isMobile = false,
}) => {
  if (!notifications || notifications.length === 0) return null

  // Trigger Android/mobile haptic pattern on new notification
  useEffect(() => {
    if (vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([0, 60, 40, 60])
      } catch {
        // Ignored on non-supporting devices
      }
    }
  }, [notifications.length, vibrateEnabled])

  // Placement styles for desktop vs mobile
  const getContainerPlacement = () => {
    if (isMobile) {
      return 'fixed top-3 inset-x-3 max-w-md mx-auto z-[9999] flex flex-col gap-2 pointer-events-none'
    }
    switch (position) {
      case 'top-right':
        return 'fixed top-12 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none'
      case 'top-left':
        return 'fixed top-12 left-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none'
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none'
      case 'bottom-right':
      default:
        return 'fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none'
    }
  }

  return (
    <div className={getContainerPlacement()} aria-live="polite">
      {notifications.map((item) => (
        <NotificationCard
          key={item.id}
          item={item}
          isMobile={isMobile}
          privacyMode={privacyMode}
          quickReplyEnabled={quickReplyEnabled}
          onDismiss={onDismiss}
          onSelectChat={onSelectChat}
          onQuickReply={onQuickReply}
          onMarkAsRead={onMarkAsRead}
          onMuteChat={onMuteChat}
        />
      ))}
    </div>
  )
}

interface NotificationCardProps {
  item: ActiveNotificationItem
  isMobile: boolean
  privacyMode: 'full' | 'hide-text' | 'hide-all'
  quickReplyEnabled: boolean
  onDismiss: (id: string) => void
  onSelectChat: (accountId: string, chatId: string, messageId?: number) => void
  onQuickReply: (accountId: string, chatId: string, text: string, replyToMsgId?: number) => Promise<void>
  onMarkAsRead: (accountId: string, chatId: string, messageId?: number) => void
  onMuteChat: (accountId: string, chatId: string) => void
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  isMobile,
  privacyMode,
  quickReplyEnabled,
  onDismiss,
  onSelectChat,
  onQuickReply,
  onMarkAsRead,
  onMuteChat,
}) => {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [startY, setStartY] = useState<number | null>(null)
  const [touchOffset, setTouchOffset] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-dismiss countdown (6.5s) paused during hover or typing
  useEffect(() => {
    if (isPaused || isReplying || isSending) return
    const timer = setTimeout(() => {
      onDismiss(item.id)
    }, 6500)
    return () => clearTimeout(timer)
  }, [item.id, isPaused, isReplying, isSending, onDismiss])

  // Focus reply input when reply mode is activated
  useEffect(() => {
    if (isReplying && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isReplying])

  const handleSendReply = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!replyText.trim() || isSending) return
    setIsSending(true)
    try {
      await onQuickReply(item.accountId, item.chatId, replyText.trim(), item.messageId)
      onDismiss(item.id)
    } catch {
      setIsSending(false)
    }
  }

  // Mobile touch swipe-up to dismiss gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return
    const deltaY = e.touches[0].clientY - startY
    if (deltaY < 0) {
      setTouchOffset(deltaY)
    }
  }

  const handleTouchEnd = () => {
    if (touchOffset < -50) {
      onDismiss(item.id)
    } else {
      setTouchOffset(0)
    }
    setStartY(null)
  }

  // Formatted display values based on privacy shield
  const getDisplayHeader = () => {
    if (privacyMode === 'hide-all') return 'Guidegram'
    if (item.chatTitle && item.isGroup) return `${item.senderName} (${item.chatTitle})`
    return item.senderName || 'Telegram'
  }

  const getDisplaySnippet = () => {
    if (privacyMode === 'hide-all' || privacyMode === 'hide-text') {
      return item.batchCount && item.batchCount > 1
        ? `${item.batchCount} new messages`
        : 'New message'
    }
    if (item.batchCount && item.batchCount > 1) {
      return `${item.batchCount} new messages: ${item.text || item.mediaType || 'Recent activity'}`
    }
    if (item.text) return item.text
    if (item.mediaType) return `[${item.mediaType}]`
    return 'New message'
  }

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: touchOffset ? `translateY(${touchOffset}px)` : undefined,
        transition: touchOffset === 0 ? 'transform 0.2s ease-out' : undefined,
      }}
      className={`pointer-events-auto group relative w-full bg-dark-900/95 dark:bg-[#0f141c]/95 border border-white/10 hover:border-primary-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl rounded-2xl p-3.5 transition-all duration-200 select-none ${
        isMobile ? 'animate-in slide-in-from-top-3' : 'animate-in fade-in slide-in-from-bottom-2'
      }`}
    >
      {/* Glow highlight */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

      {/* Main Row */}
      <div className="flex items-start gap-3">
        {/* Avatar / Icon */}
        <div
          onClick={() => onSelectChat(item.accountId, item.chatId, item.messageId)}
          className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600/40 to-accent-cyan/20 border border-white/10 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden shadow-inner"
        >
          {item.avatarUrl ? (
            <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary-300 uppercase">
              {item.senderName ? item.senderName.charAt(0) : 'G'}
            </span>
          )}
          {/* Badge Icon */}
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-dark-900 border border-white/10">
            {item.isChannel ? (
              <Megaphone className="w-2.5 h-2.5 text-accent-cyan" />
            ) : item.isGroup ? (
              <Users className="w-2.5 h-2.5 text-primary-400" />
            ) : (
              <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Content Area */}
        <div
          onClick={() => onSelectChat(item.accountId, item.chatId, item.messageId)}
          className="flex-1 min-w-0 cursor-pointer pt-0.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-gray-100 truncate flex items-center gap-1.5">
              <span>{getDisplayHeader()}</span>
              {privacyMode !== 'full' && <Lock className="w-2.5 h-2.5 text-gray-500" />}
            </h4>
            <span className="text-[10px] text-gray-400 shrink-0">
              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-gray-300/90 line-clamp-2 mt-0.5 leading-relaxed break-words font-sans">
            {getDisplaySnippet()}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(item.id)
          }}
          className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons Row */}
      {!isReplying && (
        <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-white/5">
          {quickReplyEnabled && !item.isChannel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsReplying(true)
                setIsPaused(true)
              }}
              className="px-2.5 py-1 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-500/20 hover:border-primary-500/40 text-primary-300 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>پاسخ</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead(item.accountId, item.chatId, item.messageId)
              onDismiss(item.id)
            }}
            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
            title="Mark as read"
          >
            <CheckCheck className="w-3 h-3 text-cyan-400" />
            <span>خوانده شد</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMuteChat(item.accountId, item.chatId)
              onDismiss(item.id)
            }}
            className="p-1 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Mute chat"
            aria-label="Mute chat"
          >
            <BellOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline Quick Reply Expanded Input */}
      {isReplying && (
        <form onSubmit={handleSendReply} className="mt-2.5 pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="نوشتن پاسخ سریع..."
              disabled={isSending}
              className="flex-1 bg-dark-950/80 border border-white/10 focus:border-primary-500/50 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsReplying(false)
                  setIsPaused(false)
                }
              }}
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSending}
              className="px-2.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-all"
            >
              {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsReplying(false)
                setIsPaused(false)
              }}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
