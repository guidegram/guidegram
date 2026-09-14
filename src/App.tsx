import React, { useState, useEffect, useRef, useMemo } from 'react'
import { TitleBar } from './components/TitleBar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AccountDock } from './components/AccountDock'
import { ChatTabs, TabCategory } from './components/ChatTabs'
import { ChatList } from './components/ChatList'
import { ChatViewport } from './components/ChatViewport'
import { DirectForwardModal, DirectForwardPayload } from './components/DirectForwardModal'
import { AddAccountModal } from './components/AddAccountModal'
import { ProxySettingsModal } from './components/ProxySettingsModal'
import { SettingsModal } from './components/SettingsModal'
import { UnifiedInbox } from './components/UnifiedInbox'
import { MainMenuDrawer } from './components/MainMenuDrawer'
import { MyProfileDrawer } from './components/MyProfileDrawer'
import { ContactsModal } from './components/ContactsModal'
import { CreateChatModal } from './components/CreateChatModal'
import { CloseConfirmModal } from './components/CloseConfirmModal'
import { UpdateBanner } from './components/UpdateBanner'
import { WhatsNewModal } from './components/WhatsNewModal'
import { SupportModal } from './components/SupportModal'
import {
  AccountInfo,
  DialogItem,
  MessageItem,
  AppConfig,
  ProxyConfig,
  UpdateInfo,
  SendMessageOptions,
  SendMediaOptions,
  CloudFolderItem,
} from './types/telegram'
import { playNotificationSound } from './utils/soundEffects'
import logoImg from './assets/logo.png'

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [dialogsByAccount, setDialogsByAccount] = useState<Record<string, DialogItem[]>>({})
  const dialogsByAccountRef = useRef<Record<string, DialogItem[]>>({})
  useEffect(() => {
    dialogsByAccountRef.current = dialogsByAccount
  }, [dialogsByAccount])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, MessageItem[]>>({})

  const [activeTab, setActiveTab] = useState<TabCategory>('all')
  const [cloudFolders, setCloudFolders] = useState<CloudFolderItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [ghostMode, setGhostMode] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUnifiedInboxOpen, setIsUnifiedInboxOpen] = useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false)
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false)
  const [isContactsOpen, setIsContactsOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [createChatState, setCreateChatState] = useState<{ isOpen: boolean; mode: 'group' | 'channel' }>({
    isOpen: false,
    mode: 'group',
  })
  const [forwardMessage, setForwardMessage] = useState<MessageItem | null>(null)
  const [isLoadingMoreDialogs, setIsLoadingMoreDialogs] = useState(false)
  const hasMoreDialogsRef = useRef(true)

  // Resizable Sidebar Splitter State (default 320px, min 240px, max 550px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('guidegram_sidebar_width')
    return saved ? Math.min(550, Math.max(240, parseInt(saved, 10))) : 320
  })
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)

  // Mouse move and mouse up listeners for sidebar dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return
      // The AccountDock width is 64px (w-16)
      const newWidth = Math.min(550, Math.max(240, e.clientX - 64))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizingSidebar) {
        setIsResizingSidebar(false)
        localStorage.setItem('guidegram_sidebar_width', sidebarWidth.toString())
      }
    }

    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingSidebar, sidebarWidth])

  // Auto-Update & What's New State
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [whatsNewVersion, setWhatsNewVersion] = useState<string | null>(null)

  // Initial Data Load
  useEffect(() => {
    const compareSemver = (a: string, b: string): number => {
      const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
      const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0
        const nb = pb[i] || 0
        if (na > nb) return 1
        if (na < nb) return -1
      }
      return 0
    }

    const initApp = async () => {
      try {
        if (window.guidegram) {
          const accs = await window.guidegram.getAccounts()
          setAccounts(accs || [])

          if (accs && accs.length > 0) {
            const firstConnected = (accs as AccountInfo[]).find((a: AccountInfo) => a.status === 'connected') || accs[0]
            setActiveAccountId(firstConnected.id)
            if (firstConnected.status === 'connected') {
              loadDialogsForAccount(firstConnected.id)
            }
          }

          const cfg = await window.guidegram.getConfig()
          if (cfg) {
            setConfig(cfg)
            setGhostMode(cfg.ghostMode || false)
          }

          // Check if newly updated to show What's New celebration
          try {
            const currentVer = (await window.guidegram.getAppVersion?.()) || '1.8.0'
            const lastSeenKey = 'guidegram_last_seen_version'
            const lastSeenVer = localStorage.getItem(lastSeenKey)
            if (lastSeenVer && compareSemver(currentVer, lastSeenVer) > 0) {
              setWhatsNewVersion(currentVer)
            }
            localStorage.setItem(lastSeenKey, currentVer)
          } catch (_) {}

          // Restore appearance preferences (Wallpaper, Theme, Font)
          try {
            const savedWp = localStorage.getItem('guidegram_chat_wallpaper')
            if (savedWp) {
              document.documentElement.style.setProperty('--chat-wallpaper', savedWp)
            }
            const savedTheme = localStorage.getItem('guidegram_theme_mode')
            if (savedTheme) {
              document.documentElement.setAttribute('data-chat-theme', savedTheme)
            }
            const savedFont = localStorage.getItem('guidegram_font_family')
            if (savedFont && savedFont !== 'Default') {
              const fontMap: Record<string, string> = {
                Vazirmatn: "'Vazirmatn', sans-serif",
                Inter: "'Inter', sans-serif",
                Roboto: "'Roboto', sans-serif",
                'Segoe UI': "'Segoe UI', sans-serif",
                'Fira Code': "'Fira Code', monospace",
              }
              if (fontMap[savedFont]) {
                document.body.style.fontFamily = fontMap[savedFont]
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        console.error('App init error:', err)
      } finally {
        setIsLoaded(true)
      }
    }

    initApp()

    // Dynamically toggle performance optimization class (64Gram)
    if (config?.disableAnimations) {
      document.documentElement.classList.add('disable-animations')
    } else {
      document.documentElement.classList.remove('disable-animations')
    }

    // Realtime listeners
    let unsubscribeMsg: (() => void) | undefined
    let unsubscribeUpdate: (() => void) | undefined
    let unsubscribeAccountUpdated: (() => void) | undefined
    let unsubscribeAccountsLoaded: (() => void) | undefined
    let unsubscribeMute: (() => void) | undefined
    let unsubscribeReadHistory: (() => void) | undefined
    let unsubscribeMsgDeleted: (() => void) | undefined
    let unsubscribeMsgEdited: (() => void) | undefined

    if (window.guidegram?.on) {
      unsubscribeMsg = window.guidegram.on('telegram:new-message', (payload: any) => {
        const { accountId, chatId, message } = payload
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), message],
        }))
        const targetDialog = dialogsByAccountRef.current[accountId]?.find((d) => d.id === chatId)
        const isChatMuted = targetDialog?.isMuted ?? false
        if (!message?.isOutgoing && !isChatMuted && configRef.current?.soundEnabled !== false) {
          playNotificationSound()
        }
        setDialogsByAccount((prev) => {
          const list = prev[accountId] || []
          const msgDate = message?.date ? (message.date < 1e11 ? message.date * 1000 : message.date) : Date.now()
          const msgText = message?.text || (message?.mediaType ? `[${message.mediaType}]` : '')
          const exists = list.some((d) => d.id === chatId)

          let updatedList: DialogItem[]
          if (!exists) {
            const chatInfo = (payload as any)?.chatInfo
            const newDialog: DialogItem = {
              id: chatId,
              accountId,
              title: chatInfo?.title || message?.senderName || 'Chat',
              unreadCount: chatId !== activeChatId ? 1 : 0,
              unreadMentionsCount: 0,
              isMuted: isChatMuted,
              isUser: chatInfo?.isUser ?? true,
              isGroup: chatInfo?.isGroup ?? false,
              isChannel: chatInfo?.isChannel ?? false,
              isBroadcast: chatInfo?.isBroadcast ?? false,
              isBot: chatInfo?.isBot ?? false,
              isPinned: false,
              isSavedMessages: chatId === accountId,
              lastMessageText: msgText,
              lastMessageDate: msgDate,
              avatarInitials: (chatInfo?.title || message?.senderName || 'C').slice(0, 2).toUpperCase(),
            }
            updatedList = [newDialog, ...list]
          } else {
            updatedList = list.map((d) =>
              d.id === chatId
                ? {
                    ...d,
                    unreadCount: chatId !== activeChatId ? d.unreadCount + 1 : d.unreadCount,
                    lastMessageText: msgText || d.lastMessageText,
                    lastMessageDate: msgDate,
                  }
                : d
            )
          }

          // Sort: pinned first, then unpinned by lastMessageDate descending
          const pinned = updatedList.filter((d) => d.isPinned)
          const unpinned = updatedList.filter((d) => !d.isPinned)
          unpinned.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))

          const seen = new Set<string>()
          const sortedDeduplicated: DialogItem[] = []
          for (const d of [...pinned, ...unpinned]) {
            if (!seen.has(d.id)) {
              seen.add(d.id)
              sortedDeduplicated.push(d)
            }
          }

          return {
            ...prev,
            [accountId]: sortedDeduplicated,
          }
        })
      })

      // Real-time Account Status and Hydration Listener
      unsubscribeAccountUpdated = window.guidegram.on('telegram:account-updated', (payload: { account: AccountInfo }) => {
        const updated = payload.account
        if (!updated) return
        setAccounts((prev) => {
          const exists = prev.some((a) => a.id === updated.id)
          if (exists) {
            return prev.map((a) => (a.id === updated.id ? updated : a))
          }
          return [...prev, updated]
        })

        setActiveAccountId((currentActive) => {
          if (!currentActive || currentActive === updated.id) {
            if (updated.status === 'connected') {
              loadDialogsForAccount(updated.id)
            }
            return updated.id
          }
          return currentActive
        })
      })

      // Accounts loaded initial batch
      unsubscribeAccountsLoaded = window.guidegram.on('telegram:accounts-loaded', (payload: { accounts: AccountInfo[] }) => {
        if (payload?.accounts && payload.accounts.length > 0) {
          setAccounts(payload.accounts)
          const firstConnected = payload.accounts.find((a) => a.status === 'connected')
          if (firstConnected) {
            setActiveAccountId((currentActive) => {
              if (!currentActive) {
                loadDialogsForAccount(firstConnected.id)
                return firstConnected.id
              }
              return currentActive
            })
          }
        }
      })

      // Hourly Auto-Update listener
      unsubscribeUpdate = window.guidegram.on('app:update-available', (info: UpdateInfo) => {
        setUpdateInfo(info)
      })

      // Update completion celebration listener
      const unsubscribeUpdateInstalled = window.guidegram.on(
        'app:update-installed',
        (marker: { version: string }) => {
          setWhatsNewVersion(marker?.version || '1.8.0')
        }
      )

      // Real-time chat mute/unmute sync listener
      unsubscribeMute = window.guidegram.on(
        'telegram:chat-mute-toggled',
        (payload: { accountId: string; chatId: string; isMuted: boolean }) => {
          const { accountId, chatId, isMuted } = payload
          setDialogsByAccount((prev) => {
            const list = prev[accountId] || []
            return {
              ...prev,
              [accountId]: list.map((d) => (d.id === chatId ? { ...d, isMuted } : d)),
            }
          })
        }
      )

      // Real-time read-history sync
      unsubscribeReadHistory = window.guidegram.on(
        'telegram:read-history',
        (payload: { accountId: string; chatId: string; stillUnreadCount?: number }) => {
          const { accountId, chatId, stillUnreadCount } = payload
          setDialogsByAccount((prev) => {
            const list = prev[accountId] || []
            return {
              ...prev,
              [accountId]: list.map((d) =>
                d.id === chatId
                  ? { ...d, unreadCount: typeof stillUnreadCount === 'number' ? stillUnreadCount : 0 }
                  : d
              ),
            }
          })
        }
      )

      // Real-time Anti-Delete Trapper
      unsubscribeMsgDeleted = window.guidegram.on(
        'telegram:message-deleted',
        (payload: { accountId: string; chatId: string; messageIds: number[]; isDeletedLocally?: boolean; deletedAt?: number }) => {
          const { chatId, messageIds, isDeletedLocally, deletedAt } = payload
          if (!messageIds || messageIds.length === 0) return
          const idSet = new Set<number>(messageIds)
          const keepLocally = isDeletedLocally ?? (configRef.current?.keepDeletedMessagesLocally !== false)

          setMessagesByChat((prev) => {
            const targetChatIds = chatId && prev[chatId] ? [chatId] : Object.keys(prev)
            let changed = false
            const next = { ...prev }

            for (const cId of targetChatIds) {
              const list = prev[cId]
              if (!list) continue
              const hasMatch = list.some((m) => idSet.has(m.id))
              if (!hasMatch) continue

              changed = true
              if (keepLocally) {
                next[cId] = list.map((m) =>
                  idSet.has(m.id)
                    ? {
                        ...m,
                        isDeletedLocally: true,
                        deletedAt: m.deletedAt || deletedAt || Math.floor(Date.now() / 1000),
                      }
                    : m
                )
              } else {
                next[cId] = list.filter((m) => !idSet.has(m.id))
              }
            }

            return changed ? next : prev
          })
        }
      )

      // Real-time Edit History Tracker
      unsubscribeMsgEdited = window.guidegram.on(
        'telegram:message-edited',
        (payload: { accountId: string; chatId: string; message: MessageItem }) => {
          const { chatId, message } = payload
          if (!message?.id) return

          setMessagesByChat((prev) => {
            const targetChatIds = chatId && prev[chatId] ? [chatId] : Object.keys(prev)
            let changed = false
            const next = { ...prev }

            for (const cId of targetChatIds) {
              const list = prev[cId]
              if (!list) continue
              const idx = list.findIndex((m) => m.id === message.id)
              if (idx === -1) continue

              changed = true
              const existing = list[idx]
              const existingHistory = existing.editHistory || []
              const historyToAdd =
                existing.text &&
                existing.text !== message.text &&
                !existingHistory.some((h) => h.text === existing.text)
                  ? [
                      {
                        text: existing.text,
                        date: existing.editDate || existing.date,
                        entities: existing.entities,
                        mediaType: existing.mediaType,
                        mediaThumbnailUrl: existing.mediaThumbnailUrl,
                        strippedThumb: existing.strippedThumb,
                      },
                    ]
                  : []
              const mergedHistory =
                message.editHistory && message.editHistory.length > 0
                  ? message.editHistory
                  : [...existingHistory, ...historyToAdd]

              const updatedMsg: MessageItem = {
                ...existing,
                ...message,
                editHistory: mergedHistory,
                editDate: message.editDate || Math.floor(Date.now() / 1000),
              }

              const nextList = [...list]
              nextList[idx] = updatedMsg
              next[cId] = nextList
            }

            return changed ? next : prev
          })
        }
      )

      return () => {
        unsubscribeMsg?.()
        unsubscribeMsgDeleted?.()
        unsubscribeMsgEdited?.()
        unsubscribeUpdate?.()
        unsubscribeAccountUpdated?.()
        unsubscribeAccountsLoaded?.()
        unsubscribeMute?.()
        unsubscribeUpdateInstalled?.()
        unsubscribeReadHistory?.()
      }
    }
  }, [])

  // Reactive toggle for 64Gram performance optimizations
  useEffect(() => {
    if (config?.disableAnimations) {
      document.documentElement.classList.add('disable-animations')
    } else {
      document.documentElement.classList.remove('disable-animations')
    }
  }, [config?.disableAnimations])

  const configRef = useRef<AppConfig | null>(null)
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Global Keyboard Shortcuts (Telegram Desktop & 64Gram Parity)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl + 1..9 -> Instant Account Switching
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const keyNum = parseInt(e.key, 10)
        if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
          const targetAcc = accounts[keyNum - 1]
          if (targetAcc) {
            e.preventDefault()
            setActiveAccountId(targetAcc.id)
            loadDialogsForAccount(targetAcc.id)
          }
        }
      }

      // 2. Ctrl + K / Ctrl + F -> Focus search input
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="جستجو"]') as HTMLInputElement
        if (searchInput) {
          e.preventDefault()
          searchInput.focus()
          searchInput.select()
        }
      }

      // 3. Esc -> Close open modals
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false)
        if (isProxyModalOpen) setIsProxyModalOpen(false)
        if (isAddAccountOpen) setIsAddAccountOpen(false)
        if (isUnifiedInboxOpen) setIsUnifiedInboxOpen(false)
        if (isMainMenuOpen) setIsMainMenuOpen(false)
        if (isCloseConfirmOpen) setIsCloseConfirmOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [accounts, isSettingsOpen, isProxyModalOpen, isAddAccountOpen, isUnifiedInboxOpen, isMainMenuOpen, isCloseConfirmOpen])

  const loadCloudFoldersForAccount = async (accountId: string) => {
    if (!window.guidegram?.getCloudFolders) return
    try {
      const folders = await window.guidegram.getCloudFolders(accountId)
      if (Array.isArray(folders) && folders.length > 0) {
        setCloudFolders(folders)
      }
    } catch (err) {
      console.error('Failed to load cloud folders:', err)
    }
  }

  const loadDialogsForAccount = async (accountId: string) => {
    if (!window.guidegram?.getDialogs) return
    try {
      hasMoreDialogsRef.current = true
      loadCloudFoldersForAccount(accountId)
      const dialogs = await window.guidegram.getDialogs(accountId, 350)
      const uniqueMap = new Map<string, DialogItem>()
      for (const d of dialogs) {
        if (!uniqueMap.has(d.id)) {
          uniqueMap.set(d.id, d)
        }
      }
      const uniqueDialogs = Array.from(uniqueMap.values())
      setDialogsByAccount((prev) => ({ ...prev, [accountId]: uniqueDialogs }))
      if (uniqueDialogs.length > 0 && !activeChatId) {
        setActiveChatId(uniqueDialogs[0].id)
        loadMessages(accountId, uniqueDialogs[0].id)
      }
    } catch (err) {
      console.error('Failed to load dialogs:', err)
    }
  }

  const handleLoadMoreDialogs = async () => {
    if (!activeAccountId || !window.guidegram?.getDialogs || isLoadingMoreDialogs || !hasMoreDialogsRef.current) return
    const currentList = dialogsByAccount[activeAccountId] || []
    if (currentList.length === 0) return

    setIsLoadingMoreDialogs(true)
    try {
      const lastDialog = currentList[currentList.length - 1]
      const offsetDate = lastDialog?.lastMessageDate ? Math.floor(lastDialog.lastMessageDate / 1000) : undefined
      const nextBatch = await window.guidegram.getDialogs(activeAccountId, 150, offsetDate)

      if (!nextBatch || nextBatch.length === 0) {
        hasMoreDialogsRef.current = false
      } else {
        setDialogsByAccount((prev) => {
          const existing = prev[activeAccountId] || []
          const existingMap = new Map<string, DialogItem>()
          for (const d of existing) {
            existingMap.set(d.id, d)
          }
          let addedCount = 0
          for (const d of nextBatch) {
            if (!existingMap.has(d.id)) {
              existingMap.set(d.id, d)
              addedCount++
            }
          }
          if (addedCount === 0) {
            hasMoreDialogsRef.current = false
          }
          return { ...prev, [activeAccountId]: Array.from(existingMap.values()) }
        })
      }
    } catch (err) {
      console.warn('Failed to load more dialogs:', err)
    } finally {
      setIsLoadingMoreDialogs(false)
    }
  }

  const handleUpdateUnreadCount = (chatId: string, unreadCount: number) => {
    if (!activeAccountId) return
    setDialogsByAccount((prev) => {
      const list = prev[activeAccountId] || []
      return {
        ...prev,
        [activeAccountId]: list.map((d) => (d.id === chatId ? { ...d, unreadCount } : d)),
      }
    })
  }

  const loadMessages = async (accountId: string, chatId: string) => {
    if (!window.guidegram?.getMessages) return
    try {
      const dialog = (dialogsByAccount[accountId] || []).find((d) => d.id === chatId)
      const unreadCount = dialog?.unreadCount || 0
      const fetchLimit = Math.min(100, Math.max(60, unreadCount + 20))
      const msgs = await window.guidegram.getMessages(accountId, chatId, fetchLimit)
      setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }))

      if (unreadCount === 0 && msgs.length > 0) {
        const lastMsgId = Math.max(...msgs.map((m) => m.id))
        window.guidegram.markAsRead(accountId, chatId, lastMsgId)
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const handleMergeHistoricalMessages = (newMsgs: MessageItem[]) => {
    if (!activeChatId || !newMsgs || newMsgs.length === 0) return
    setMessagesByChat((prev) => {
      const existing = prev[activeChatId] || []
      const existingMap = new Map<number, MessageItem>()
      for (const m of existing) {
        existingMap.set(m.id, m)
      }
      for (const m of newMsgs) {
        existingMap.set(m.id, m)
      }
      const merged = Array.from(existingMap.values()).sort((a, b) => a.id - b.id)
      return { ...prev, [activeChatId]: merged }
    })
  }

  const handleSelectAccount = (accountId: string) => {
    setActiveAccountId(accountId)
    setIsUnifiedInboxOpen(false)
    setActiveChatId(null)
    loadDialogsForAccount(accountId)
  }

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    if (activeAccountId) {
      loadMessages(activeAccountId, chatId)
    }
  }

  const handleSendMessage = async (
    text: string,
    replyToMsgId?: number,
    options?: SendMessageOptions
  ) => {
    if (!activeAccountId || !activeChatId || !window.guidegram) return
    try {
      const sent = await window.guidegram.sendMessage(
        activeAccountId,
        activeChatId,
        text,
        replyToMsgId,
        options
      )
      const actualReplyTo = options?.replyToMsgId ?? replyToMsgId
      const repliedMsg = actualReplyTo
        ? (messagesByChat[activeChatId] || []).find((m) => m.id === actualReplyTo)
        : undefined

      const enrichedSent: MessageItem = {
        ...sent,
        replyToMsgId: actualReplyTo,
        isSilent: options?.silent,
        replyTo: actualReplyTo
          ? {
              replyToMsgId: actualReplyTo,
              senderName: repliedMsg?.senderName || (repliedMsg?.isOutgoing ? 'You' : 'User'),
              text: repliedMsg?.text || (repliedMsg?.mediaType ? `[${repliedMsg.mediaType}]` : undefined),
            }
          : undefined,
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), enrichedSent],
      }))
    } catch (err) {
      console.error('Failed to send message:', err)
      throw err
    }
  }

  const handleSendMedia = async (
    filePath: string,
    options?: SendMediaOptions
  ) => {
    if (!activeAccountId || !activeChatId || !window.guidegram) return
    try {
      const sent = await window.guidegram.sendMedia(activeAccountId, activeChatId, filePath, options)
      const repliedMsg = options?.replyToMsgId
        ? (messagesByChat[activeChatId] || []).find((m) => m.id === options.replyToMsgId)
        : undefined

      const enrichedSent: MessageItem = {
        ...sent,
        replyToMsgId: options?.replyToMsgId,
        isSilent: options?.silent,
        replyTo: options?.replyToMsgId
          ? {
              replyToMsgId: options.replyToMsgId,
              senderName: repliedMsg?.senderName || (repliedMsg?.isOutgoing ? 'You' : 'User'),
              text: repliedMsg?.text || (repliedMsg?.mediaType ? `[${repliedMsg.mediaType}]` : undefined),
            }
          : undefined,
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), enrichedSent],
      }))
    } catch (err) {
      console.error('Failed to send media:', err)
      throw err
    }
  }

  const handleDirectForward = async (
    targetChatIdsOrPayload: string[] | DirectForwardPayload,
    withoutQuoteArg?: boolean,
    silentArg?: boolean,
    extraOptions?: { dropMediaCaptions?: boolean; newCaption?: string }
  ) => {
    if (!activeAccountId || !forwardMessage || !window.guidegram) return
    const isPayload = !Array.isArray(targetChatIdsOrPayload) && typeof targetChatIdsOrPayload === 'object' && targetChatIdsOrPayload !== null
    const targetChatIds = isPayload
      ? (targetChatIdsOrPayload as DirectForwardPayload).toChatIds
      : (targetChatIdsOrPayload as string[])
    const withoutQuote = isPayload
      ? (targetChatIdsOrPayload as DirectForwardPayload).withoutQuote
      : (withoutQuoteArg ?? true)
    const silent = isPayload
      ? (targetChatIdsOrPayload as DirectForwardPayload).silent
      : (silentArg ?? false)
    const dropMediaCaptions = isPayload
      ? (targetChatIdsOrPayload as DirectForwardPayload).dropMediaCaptions
      : extraOptions?.dropMediaCaptions
    const newCaption = isPayload
      ? (targetChatIdsOrPayload as DirectForwardPayload).newCaption
      : extraOptions?.newCaption

    await window.guidegram.forwardMessages(
      activeAccountId,
      targetChatIds,
      forwardMessage.chatId,
      [forwardMessage.id],
      {
        withoutQuote,
        silent,
        dropMediaCaptions,
        newCaption,
        caption: newCaption,
      }
    )
  }

  // 64Gram Feature: Quick Forward to Saved Messages
  const handleQuickForwardToSaved = async (message: MessageItem): Promise<boolean> => {
    if (!activeAccountId || !window.guidegram) return false
    try {
      await window.guidegram.forwardMessages(
        activeAccountId,
        'me', // Saved Messages
        message.chatId,
        [message.id],
        { withoutQuote: false, silent: false }
      )
      return true
    } catch (err) {
      console.error('Failed to quick forward to Saved Messages:', err)
      return false
    }
  }

  // 64Gram Feature: Delete message with alwaysDeleteBoth setting
  const handleDeleteMessage = async (message: MessageItem): Promise<boolean> => {
    if (!activeAccountId || !activeChatId || !window.guidegram) return false
    const revoke = config?.alwaysDeleteBoth ?? true
    try {
      await window.guidegram.deleteMessages(activeAccountId, activeChatId, [message.id], revoke)
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).filter((m) => m.id !== message.id),
      }))
      return true
    } catch (err) {
      console.error('Failed to delete message:', err)
      return false
    }
  }

  // 64Gram Feature: Mark all chats as read (supports tab category filtering)
  const handleMarkAllAsRead = async (category?: TabCategory): Promise<boolean> => {
    if (!activeAccountId || !window.guidegram) return false
    try {
      if (!category || category === 'all') {
        await window.guidegram.markAllAsRead(activeAccountId)
        setDialogsByAccount((prev) => {
          const list = prev[activeAccountId] || []
          return {
            ...prev,
            [activeAccountId]: list.map((d) => ({ ...d, unreadCount: 0 })),
          }
        })
      } else {
        const dialogs = dialogsByAccount[activeAccountId] || []
        const toMark = dialogs.filter((d) => {
          if (d.unreadCount <= 0) return false
          if (category === 'users') return d.isUser
          if (category === 'groups') return d.isGroup
          if (category === 'channels') return d.isChannel
          if (category === 'bots') return d.isBot
          if (category === 'unread') return true
          return false
        })

        for (const d of toMark) {
          try {
            await window.guidegram.markAsRead(activeAccountId, d.id)
          } catch (err) {
            console.warn(`Failed to mark dialog ${d.id} as read:`, err)
          }
        }

        setDialogsByAccount((prev) => {
          const list = prev[activeAccountId] || []
          const toMarkIds = new Set(toMark.map((d) => d.id))
          return {
            ...prev,
            [activeAccountId]: list.map((d) =>
              toMarkIds.has(d.id) ? { ...d, unreadCount: 0 } : d
            ),
          }
        })
      }
      return true
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      return false
    }
  }

  // 64Gram Feature: Select chat by username or numeric ID
  const handleSelectUserOrChat = async (target: string) => {
    const dialogs = dialogsByAccount[activeAccountId] || []
    const cleanTarget = target.replace(/^@/, '').trim()
    const targetDigits = cleanTarget.replace(/^-100/, '').replace(/^-/, '')
    const isTargetNumeric = /^\d+$/.test(targetDigits)
    const found = dialogs.find(
      (d) =>
        d.id === cleanTarget ||
        d.id === target ||
        (isTargetNumeric && d.id.replace(/^-100/, '').replace(/^-/, '') === targetDigits) ||
        d.title.toLowerCase() === cleanTarget.toLowerCase() ||
        d.title.toLowerCase() === target.toLowerCase()
    )
    if (found) {
      handleSelectChat(found.id)
      return
    }

    // Attempt peer resolution via GramJS if window.guidegram.resolvePeer exists
    if (window.guidegram?.resolvePeer) {
      try {
        const resolved = await window.guidegram.resolvePeer(activeAccountId, cleanTarget)
        if (resolved) {
          setDialogsByAccount((prev) => {
            const list = prev[activeAccountId] || []
            const exists = list.some((d) => d.id === resolved.id)
            return exists ? prev : { ...prev, [activeAccountId]: [resolved, ...list] }
          })
          handleSelectChat(resolved.id)
          return
        }
      } catch (err) {
        console.warn('resolvePeer failed, falling back to search query:', err)
      }
    }

    setSearchQuery(cleanTarget)
  }

  // Open Saved Messages for current active account
  const handleOpenSavedMessages = () => {
    if (!activeAccountId) return
    const currentAcc = accounts.find((a) => a.id === activeAccountId)
    const dialogs = dialogsByAccount[activeAccountId] || []
    // Look for Saved Messages dialog or self peer
    const savedChat = dialogs.find(
      (d) =>
        d.title.toLowerCase() === 'saved messages' ||
        (currentAcc?.username && d.username?.toLowerCase() === currentAcc.username.toLowerCase()) ||
        (currentAcc?.phone && d.id === currentAcc.phone)
    )
    if (savedChat) {
      handleSelectChat(savedChat.id)
    } else if (currentAcc?.username) {
      handleSelectUserOrChat(currentAcc.username)
    }
  }

  const handleToggleGhostMode = async () => {
    const next = !ghostMode
    setGhostMode(next)
    await window.guidegram?.updateConfig({ ghostMode: next })
  }

  const handleToggleNightMode = async () => {
    const isNight = config?.theme !== 'light'
    const nextTheme = isNight ? 'light' : 'dark'
    if (config) {
      setConfig({ ...config, theme: nextTheme })
    }
    await window.guidegram?.updateConfig({ theme: nextTheme })
  }

  const handleAccountAdded = (newAccount: AccountInfo) => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === newAccount.id)
      if (exists) {
        return prev.map((a) => (a.id === newAccount.id ? newAccount : a))
      }
      return [...prev, newAccount]
    })
    setActiveAccountId(newAccount.id)
    loadDialogsForAccount(newAccount.id)
  }

  const handleUpdateAccountProxy = async (accountId: string, proxy?: ProxyConfig) => {
    if (!window.guidegram) return
    const updatedAccounts = accounts.map((acc) =>
      acc.id === accountId ? { ...acc, proxyConfig: proxy } : acc
    )
    setAccounts(updatedAccounts)
    await window.guidegram.updateConfig({ accounts: updatedAccounts })
  }

  const handleLogoutAccount = async (accountId: string) => {
    if (!window.guidegram) return
    await window.guidegram.logoutAccount(accountId)
    setAccounts((prev) => prev.filter((a) => a.id !== accountId))
    if (activeAccountId === accountId) {
      setActiveAccountId(null)
      setActiveChatId(null)
    }
  }

  const currentAccount = accounts.find((a) => a.id === activeAccountId) || null
  const currentDialogs = (activeAccountId && dialogsByAccount[activeAccountId]) || []
  const currentChat = currentDialogs.find((d) => d.id === activeChatId) || null
  const currentMessages = (activeChatId && messagesByChat[activeChatId]) || []

  // Compute archived unread count
  const archivedUnreadCount = useMemo(() => {
    return currentDialogs
      .filter((d) => d.folderId === 1 || (d as any).archived)
      .reduce((acc, d) => acc + (d.unreadCount || 0), 0)
  }, [currentDialogs])

  // Compute unread counts per account for multi-account switcher
  const unreadCountsByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acc of accounts) {
      const dList = dialogsByAccount[acc.id] || []
      map[acc.id] = dList.reduce((sum, d) => sum + (d.unreadCount || 0), 0)
    }
    return map
  }, [accounts, dialogsByAccount])

  // Compute unread counts for tabs
  const unreadCounts: Record<TabCategory, number> = {
    all: currentDialogs.filter((d) => d.folderId !== 1 && !(d as any).archived).reduce((acc, d) => acc + d.unreadCount, 0),
    users: currentDialogs.filter((d) => d.isUser && d.folderId !== 1 && !(d as any).archived).reduce((acc, d) => acc + d.unreadCount, 0),
    groups: currentDialogs
      .filter((d) => (d.isGroup || (d.isChannel && !(d.isBroadcast ?? !d.isGroup))) && d.folderId !== 1 && !(d as any).archived)
      .reduce((acc, d) => acc + d.unreadCount, 0),
    channels: currentDialogs
      .filter((d) => (d.isBroadcast ?? (d.isChannel && !d.isGroup)) && d.folderId !== 1 && !(d as any).archived)
      .reduce((acc, d) => acc + d.unreadCount, 0),
    bots: currentDialogs.filter((d) => d.isBot && d.folderId !== 1 && !(d as any).archived).reduce((acc, d) => acc + d.unreadCount, 0),
    unread: currentDialogs.filter((d) => d.unreadCount > 0 && d.folderId !== 1 && !(d as any).archived).length,
    archived: archivedUnreadCount,
  }

  // Cloud folders unread counts
  if (cloudFolders.length > 0) {
    const peerMatches = (list?: string[], targetId?: string): boolean => {
      if (!list || list.length === 0 || !targetId) return false
      if (list.includes(targetId)) return true
      const cleanTarget = targetId.replace(/^-100/, '').replace(/^-/, '')
      return list.some((id) => id.replace(/^-100/, '').replace(/^-/, '') === cleanTarget)
    }

    for (const f of cloudFolders) {
      unreadCounts[`folder:${f.id}`] = currentDialogs
        .filter((d) => {
          if (peerMatches(f.excludePeerIds, d.id)) return false
          if (f.excludeMuted && d.isMuted) return false
          if (f.excludeRead && d.unreadCount === 0) return false
          if (f.excludeArchived && (d.folderId === 1 || (d as any).archived)) return false
          const isIncluded = peerMatches(f.includePeerIds, d.id) || peerMatches(f.pinnedPeerIds, d.id)
          const isBroadcast = d.isBroadcast ?? (d.isChannel && !d.isGroup)
          const isGroup = d.isGroup || (d.isChannel && !isBroadcast)
          if (isIncluded) return true
          if (f.broadcasts && isBroadcast) return true
          if (f.groups && isGroup) return true
          if (f.bots && d.isBot) return true
          if ((f.contacts || f.nonContacts) && d.isUser && !d.isBot) return true
          return false
        })
        .reduce((acc, d) => acc + d.unreadCount, 0)
    }
  }

  // Global keyboard shortcut handler (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority 1: Close topmost modals / overlays
        if (forwardMessage) {
          setForwardMessage(null)
          return
        }
        if (isCloseConfirmOpen) {
          setIsCloseConfirmOpen(false)
          return
        }
        if (isAddAccountOpen) {
          setIsAddAccountOpen(false)
          return
        }
        if (isProxyModalOpen) {
          setIsProxyModalOpen(false)
          return
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false)
          return
        }
        if (isMainMenuOpen) {
          setIsMainMenuOpen(false)
          return
        }
        // Priority 2: Clear search query if active
        if (searchQuery.trim().length > 0) {
          setSearchQuery('')
          return
        }
        // Priority 3: Close Unified Inbox
        if (isUnifiedInboxOpen) {
          setIsUnifiedInboxOpen(false)
          return
        }
        // Priority 4: Deselect active chat (Telegram Desktop ESC behavior)
        if (activeChatId) {
          setActiveChatId(null)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    forwardMessage,
    isCloseConfirmOpen,
    isAddAccountOpen,
    isProxyModalOpen,
    isSettingsOpen,
    isMainMenuOpen,
    searchQuery,
    isUnifiedInboxOpen,
    activeChatId,
  ])

  // Smooth Loading Splash
  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-dark-950 flex flex-col items-center justify-center text-white select-none">
        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-glow mb-4 animate-pulse border border-accent-cyan/30">
          <img src={logoImg} alt="Guidegram Logo" className="w-full h-full object-cover" />
        </div>
        <div className="text-xs font-semibold text-gray-400">Loading Guidegram...</div>
      </div>
    )
  }

  // Handle window close request
  const handleRequestClose = async () => {
    if (window.guidegram?.requestClose) {
      const res = await window.guidegram.requestClose()
      if (res.action === 'ask') {
        setIsCloseConfirmOpen(true)
      }
    } else {
      window.guidegram?.closeWindow?.()
    }
  }

  const handleConfirmClose = async (action: 'minimize' | 'quit', remember: boolean) => {
    setIsCloseConfirmOpen(false)
    if (window.guidegram?.confirmClose) {
      await window.guidegram.confirmClose(action, remember)
      if (remember && config) {
        setConfig({ ...config, closeAction: action, rememberCloseAction: true })
      }
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 font-sans">
      {/* 1. Integrated Custom TitleBar */}
      <TitleBar
        activeAccount={currentAccount}
        ghostMode={ghostMode}
        onRequestClose={handleRequestClose}
        onToggleMainMenu={() => setIsMainMenuOpen(true)}
      />

      {/* 2. Main Content: Welcome Screen OR Active Multi-Account Workspace */}
      {accounts.length === 0 ? (
        <WelcomeScreen
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
          onOpenProxyModal={() => setIsProxyModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : isUnifiedInboxOpen ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AccountDock
            accounts={accounts}
            activeAccountId={activeAccountId}
            isUnifiedInboxOpen={isUnifiedInboxOpen}
            onSelectAccount={handleSelectAccount}
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
            onToggleUnifiedInbox={() => setIsUnifiedInboxOpen(!isUnifiedInboxOpen)}
            onOpenProxyModal={() => setIsProxyModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          <UnifiedInbox
            accounts={accounts}
            allDialogs={dialogsByAccount}
            onSelectAccountAndChat={(accId, chatId) => {
              setActiveAccountId(accId)
              setIsUnifiedInboxOpen(false)
              setActiveChatId(chatId)
              loadMessages(accId, chatId)
            }}
          />
        </div>
      ) : (
        <div className={`flex flex-1 min-h-0 overflow-hidden ${isResizingSidebar ? 'select-none' : ''}`}>
          {/* Vertical Multi-Account Dock */}
          <AccountDock
            accounts={accounts}
            activeAccountId={activeAccountId}
            isUnifiedInboxOpen={isUnifiedInboxOpen}
            onSelectAccount={handleSelectAccount}
            onOpenAddAccount={() => setIsAddAccountOpen(true)}
            onToggleUnifiedInbox={() => setIsUnifiedInboxOpen(!isUnifiedInboxOpen)}
            onOpenProxyModal={() => setIsProxyModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Resizable Chat List Column with Telegram Tabs */}
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="shrink-0 flex flex-col h-full bg-dark-850 overflow-hidden"
          >
            <ChatTabs
              accountId={currentAccount?.id}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadCounts={unreadCounts}
              markAllReadEnabled={config?.markAllReadEnabled ?? true}
              onMarkAllAsRead={handleMarkAllAsRead}
              onCloudFoldersLoaded={setCloudFolders}
              cloudFolders={cloudFolders}
            />
            <ChatList
              account={currentAccount}
              dialogs={currentDialogs}
              activeChatId={activeChatId}
              activeTab={activeTab}
              searchQuery={searchQuery}
              showChatId={config?.showChatId ?? true}
              ghostMode={ghostMode}
              cloudFolders={cloudFolders}
              onSearchChange={setSearchQuery}
              onSelectChat={handleSelectChat}
              onSelectPeer={handleSelectUserOrChat}
              isLoadingMoreDialogs={isLoadingMoreDialogs}
              onLoadMoreDialogs={handleLoadMoreDialogs}
            />
          </div>

          {/* Draggable Divider / Splitter between ChatList and ChatViewport */}
          <div
            onMouseDown={() => setIsResizingSidebar(true)}
            title="Drag to resize sidebar"
            className="w-1.5 hover:w-2 bg-white/5 hover:bg-primary-500/50 active:bg-primary-500 cursor-col-resize shrink-0 transition-all z-20 group relative flex items-center justify-center"
          >
            <div className="w-0.5 h-6 bg-white/20 group-hover:bg-white rounded-full transition-colors" />
          </div>

          {/* Active Conversation Viewport with 64Gram Fork Enhancements */}
          <ChatViewport
            chat={currentChat}
            messages={currentMessages}
            ghostMode={ghostMode}
            showChatId={config?.showChatId ?? true}
            showMessageId={config?.showMessageId ?? true}
            showSeconds={config?.showSeconds ?? true}
            showSenderAvatar={config?.showSenderAvatar ?? true}
            quickForwardToSaved={config?.quickForwardToSaved ?? true}
            alwaysDeleteBoth={config?.alwaysDeleteBoth ?? true}
            copyCallbackData={config?.copyCallbackData ?? true}
            suppressLinkWarning={config?.suppressLinkWarning ?? false}
            autoDownload={config?.autoDownload}
            chatFontSize={config?.chatFontSize || 14}
            bubbleRadius={config?.bubbleRadius ?? 16}
            bubblePadding={config?.bubblePadding ?? 10}
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            onOpenDirectForward={(msg) => setForwardMessage(msg)}
            onQuickForwardToSaved={handleQuickForwardToSaved}
            onDeleteMessage={handleDeleteMessage}
            onToggleGhostMode={handleToggleGhostMode}
            onSelectUserOrChat={handleSelectUserOrChat}
            onMergeHistoricalMessages={handleMergeHistoricalMessages}
            onUpdateUnreadCount={handleUpdateUnreadCount}
          />
        </div>
      )}

      {/* Main Telegram Desktop Drawer */}
      <MainMenuDrawer
        isOpen={isMainMenuOpen}
        onClose={() => setIsMainMenuOpen(false)}
        accounts={accounts}
        activeAccount={currentAccount}
        onSelectAccount={handleSelectAccount}
        onOpenAddAccount={() => {
          setIsMainMenuOpen(false)
          setIsAddAccountOpen(true)
        }}
        onOpenSettings={() => {
          setIsMainMenuOpen(false)
          setIsSettingsOpen(true)
        }}
        onOpenProxyModal={() => {
          setIsMainMenuOpen(false)
          setIsProxyModalOpen(true)
        }}
        onOpenSavedMessages={() => {
          setIsMainMenuOpen(false)
          handleOpenSavedMessages()
        }}
        ghostMode={ghostMode}
        onToggleGhostMode={handleToggleGhostMode}
        onOpenProfile={() => {
          setIsMainMenuOpen(false)
          setIsMyProfileOpen(true)
        }}
        onOpenNewGroup={() => {
          setIsMainMenuOpen(false)
          setCreateChatState({ isOpen: true, mode: 'group' })
        }}
        onOpenNewChannel={() => {
          setIsMainMenuOpen(false)
          setCreateChatState({ isOpen: true, mode: 'channel' })
        }}
        onOpenContacts={() => {
          setIsMainMenuOpen(false)
          setIsContactsOpen(true)
        }}
        onOpenCalls={() => {
          setIsMainMenuOpen(false)
          setIsContactsOpen(true)
        }}
        onOpenArchivedChats={() => {
          setIsMainMenuOpen(false)
          setActiveTab('archived' as any)
        }}
        onOpenSupport={() => {
          setIsMainMenuOpen(false)
          setIsSupportModalOpen(true)
        }}
        archivedUnreadCount={archivedUnreadCount}
        unreadCountsByAccount={unreadCountsByAccount}
        isNightMode={config?.theme !== 'light'}
        onToggleNightMode={handleToggleNightMode}
      />

      {/* Modals & Slide-over Drawers */}
      <MyProfileDrawer
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        account={currentAccount}
      />

      <ContactsModal
        isOpen={isContactsOpen}
        accountId={currentAccount?.id}
        onClose={() => setIsContactsOpen(false)}
        onSelectContact={(contactId) => {
          setIsContactsOpen(false)
          handleSelectUserOrChat(contactId)
        }}
      />

      <CreateChatModal
        isOpen={createChatState.isOpen}
        mode={createChatState.mode}
        accountId={currentAccount?.id}
        onClose={() => setCreateChatState((prev) => ({ ...prev, isOpen: false }))}
        onChatCreated={(chat) => {
          if (currentAccount) {
            loadDialogsForAccount(currentAccount.id)
          }
          if (chat?.id) {
            handleSelectChat(chat.id)
          }
        }}
      />

      <AddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAccountAdded={handleAccountAdded}
      />

      <DirectForwardModal
        isOpen={!!forwardMessage}
        message={forwardMessage}
        dialogs={currentDialogs}
        onClose={() => setForwardMessage(null)}
        onForward={handleDirectForward}
      />

      <ProxySettingsModal
        isOpen={isProxyModalOpen}
        accounts={accounts}
        onClose={() => setIsProxyModalOpen(false)}
        onUpdateAccountProxy={handleUpdateAccountProxy}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        accounts={accounts}
        onClose={() => setIsSettingsOpen(false)}
        onLogoutAccount={handleLogoutAccount}
        onConfigUpdated={(newCfg) => setConfig(newCfg)}
        onUpdateFound={(info) => setUpdateInfo(info)}
        onOpenSupport={() => setIsSupportModalOpen(true)}
      />

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      <CloseConfirmModal
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        onConfirm={handleConfirmClose}
      />

      <WhatsNewModal
        isOpen={!!whatsNewVersion}
        version={whatsNewVersion || '1.8.0'}
        onClose={() => setWhatsNewVersion(null)}
      />

      {updateInfo && updateInfo.hasUpdate && (
        <UpdateBanner
          updateInfo={updateInfo}
          onDismiss={() => {
            if (!updateInfo.isMandatory) {
              setUpdateInfo(null)
            }
          }}
        />
      )}
    </div>
  )
}
