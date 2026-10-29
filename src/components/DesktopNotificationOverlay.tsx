import React, { useState, useEffect } from 'react'
import { NotificationHUD, ActiveNotificationItem } from './NotificationHUD'

export const DesktopNotificationOverlay: React.FC = () => {
  const [notifications, setNotifications] = useState<ActiveNotificationItem[]>([])
  const [position, setPosition] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'>('bottom-right')
  const [privacyMode, setPrivacyMode] = useState<'full' | 'hide-text' | 'hide-all'>('full')
  const [quickReplyEnabled, setQuickReplyEnabled] = useState(true)

  useEffect(() => {
    // Force transparent canvas for floating HUD
    document.documentElement.style.backgroundColor = 'transparent'
    document.body.style.backgroundColor = 'transparent'
    document.body.classList.remove('bg-dark-950')
    const rootEl = document.getElementById('root')
    if (rootEl) {
      rootEl.style.backgroundColor = 'transparent'
      rootEl.className = 'w-full h-full bg-transparent overflow-hidden'
    }

    if (window.guidegram?.on) {
      const unsub = window.guidegram.on('notifications:render', (payload: any) => {
        if (!payload) return
        if (Array.isArray(payload.notifications)) {
          setNotifications(payload.notifications)
        }
        if (payload.position) setPosition(payload.position)
        if (payload.privacyMode) setPrivacyMode(payload.privacyMode)
        if (typeof payload.quickReplyEnabled === 'boolean') {
          setQuickReplyEnabled(payload.quickReplyEnabled)
        }
      })
      return () => {
        unsub()
      }
    }
  }, [])

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    window.guidegram?.dispatchNotificationAction?.('dismiss', { id })
  }

  const handleSelectChat = (accountId: string, chatId: string, messageId?: number) => {
    window.guidegram?.dispatchNotificationAction?.('select', { accountId, chatId, messageId })
  }

  const handleQuickReply = async (
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number
  ) => {
    await window.guidegram?.dispatchNotificationAction?.('reply', {
      accountId,
      chatId,
      text,
      replyToMsgId,
    })
  }

  const handleMarkAsRead = (accountId: string, chatId: string, messageId?: number) => {
    window.guidegram?.dispatchNotificationAction?.('read', { accountId, chatId, messageId })
  }

  const handleMuteChat = (accountId: string, chatId: string) => {
    window.guidegram?.dispatchNotificationAction?.('mute', { accountId, chatId })
  }

  if (notifications.length === 0) return null

  return (
    <div className="w-full h-full p-2 select-none overflow-hidden bg-transparent">
      <NotificationHUD
        notifications={notifications}
        onDismiss={handleDismiss}
        onSelectChat={handleSelectChat}
        onQuickReply={handleQuickReply}
        onMarkAsRead={handleMarkAsRead}
        onMuteChat={handleMuteChat}
        position={position}
        privacyMode={privacyMode}
        quickReplyEnabled={quickReplyEnabled}
        isMobile={false}
        isStandalone={true}
      />
    </div>
  )
}
