import React, { useState, useEffect, useRef, useMemo } from 'react'
import { TitleBar } from './components/TitleBar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { AccountDock } from './components/AccountDock'
import { ChatTabs, TabCategory } from './components/ChatTabs'
import { ChatList } from './components/ChatList'
import { ChatViewport } from './components/ChatViewport'
import type { DirectForwardPayload } from './components/DirectForwardModal'
import { UpdateBanner } from './components/UpdateBanner'
import { useIsMobile } from './utils/useIsMobile'

// Performance: Code-split heavy modals with React.lazy to reduce initial bundle and startup V8 parse time
const DirectForwardModal = React.lazy(() => import('./components/DirectForwardModal').then((m) => ({ default: m.DirectForwardModal })))
const AddAccountModal = React.lazy(() => import('./components/AddAccountModal').then((m) => ({ default: m.AddAccountModal })))
const ProxySettingsModal = React.lazy(() => import('./components/ProxySettingsModal').then((m) => ({ default: m.ProxySettingsModal })))
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })))
const AccountExportModal = React.lazy(() => import('./components/AccountExportModal').then((m) => ({ default: m.AccountExportModal })))
const UnifiedInbox = React.lazy(() => import('./components/UnifiedInbox').then((m) => ({ default: m.UnifiedInbox })))
const MainMenuDrawer = React.lazy(() => import('./components/MainMenuDrawer').then((m) => ({ default: m.MainMenuDrawer })))
const MyProfileDrawer = React.lazy(() => import('./components/MyProfileDrawer').then((m) => ({ default: m.MyProfileDrawer })))
const ContactsModal = React.lazy(() => import('./components/ContactsModal').then((m) => ({ default: m.ContactsModal })))
const CallsModal = React.lazy(() => import('./components/CallsModal').then((m) => ({ default: m.CallsModal })))
const CreateChatModal = React.lazy(() => import('./components/CreateChatModal').then((m) => ({ default: m.CreateChatModal })))
const CloseConfirmModal = React.lazy(() => import('./components/CloseConfirmModal').then((m) => ({ default: m.CloseConfirmModal })))
const WhatsNewModal = React.lazy(() => import('./components/WhatsNewModal').then((m) => ({ default: m.WhatsNewModal })))
const SupportModal = React.lazy(() => import('./components/SupportModal').then((m) => ({ default: m.SupportModal })))
const McpHubModal = React.lazy(() => import('./components/McpHubModal').then((m) => ({ default: m.McpHubModal })))
const KeyboardShortcutsModal = React.lazy(() => import('./components/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal })))
const ContactChangesModal = React.lazy(() => import('./components/ContactChangesModal').then((m) => ({ default: m.ContactChangesModal })))
const FolderManagerModal = React.lazy(() => import('./components/FolderManagerModal').then((m) => ({ default: m.FolderManagerModal })))
const UserProfileDrawer = React.lazy(() => import('./components/UserProfileDrawer').then((m) => ({ default: m.UserProfileDrawer })))
const TonWalletModal = React.lazy(() => import('./components/TonWalletModal').then((m) => ({ default: m.TonWalletModal })))
import {
  AccountInfo,
  DialogItem,
  MessageItem,
  ChatDetails,
  AppConfig,
  ProxyConfig,
  UpdateInfo,
  SendMessageOptions,
  SendMediaOptions,
  CloudFolderItem,
} from './types/telegram'
import { playNotificationSound } from './utils/soundEffects'
import { NotificationHUD, ActiveNotificationItem } from './components/NotificationHUD'
import { NotificationHistoryDrawer, NotificationHistoryItem } from './components/NotificationHistoryDrawer'
import logoImg from './assets/logo.png'

export const isPeerMatch = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false
  if (a === b) return true
  const cleanA = a.replace(/^-100/, '').replace(/^-/, '')
  const cleanB = b.replace(/^-100/, '').replace(/^-/, '')
  return cleanA === cleanB
}

export const App: React.FC = () => {
  const isMobile = useIsMobile(768)
  const [isLoaded, setIsLoaded] = useState(false)
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const activeAccountIdRef = useRef<string | null>(null)
  useEffect(() => {
    activeAccountIdRef.current = activeAccountId
  }, [activeAccountId])
  const [dialogsByAccount, setDialogsByAccount] = useState<Record<string, DialogItem[]>>({})
  const dialogsByAccountRef = useRef<Record<string, DialogItem[]>>({})
  useEffect(() => {
    dialogsByAccountRef.current = dialogsByAccount
  }, [dialogsByAccount])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const activeChatIdRef = useRef<string | null>(null)
  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])
  const [activeNotifications, setActiveNotifications] = useState<ActiveNotificationItem[]>([])
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('guidegram_notif_history')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false)
  const [initialScrollMsgId, setInitialScrollMsgId] = useState<number | null>(null)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, MessageItem[]>>({})
  const messagesByChatRef = useRef<Record<string, MessageItem[]>>({})
  useEffect(() => {
    messagesByChatRef.current = messagesByChat
  }, [messagesByChat])

  const [activeTab, setActiveTab] = useState<TabCategory>('all')
  const [cloudFolders, setCloudFolders] = useState<CloudFolderItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [ghostMode, setGhostMode] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [a11yAnnouncement, setA11yAnnouncement] = useState<string>('')

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false)
  const [proxyToImport, setProxyToImport] = useState<string | undefined>(undefined)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'mcp' | 'business' | 'profile' | 'notifications' | 'privacy' | 'chat' | 'advanced' | 'features'>('general')
  const [isContactChangesOpen, setIsContactChangesOpen] = useState(false)
  const [isMcpHubOpen, setIsMcpHubOpen] = useState(false)
  const [isUnifiedInboxOpen, setIsUnifiedInboxOpen] = useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false)
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false)
  const [isAccountExportOpen, setIsAccountExportOpen] = useState(false)
  const [isTonWalletOpen, setIsTonWalletOpen] = useState(false)
  const [isContactsOpen, setIsContactsOpen] = useState(false)
  const [isCallsOpen, setIsCallsOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false)
  const [createChatState, setCreateChatState] = useState<{ isOpen: boolean; mode: 'group' | 'channel' }>({
    isOpen: false,
    mode: 'group',
  })
  const [forwardMessage, setForwardMessage] = useState<MessageItem | null>(null)
  const [forwardMessagesList, setForwardMessagesList] = useState<MessageItem[] | null>(null)
  const [viewingUserProfile, setViewingUserProfile] = useState<{
    peerId: string
    initialDetails?: Partial<ChatDetails>
  } | null>(null)
  const [isLoadingDialogs, setIsLoadingDialogs] = useState(false)
  const [isLoadingMoreDialogs, setIsLoadingMoreDialogs] = useState(false)
  const isLoadingMoreDialogsRef = useRef(false)
  const isBackgroundSyncingDialogsRef = useRef(false)
  const backgroundSyncTimerRef = useRef<any>(null)
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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [appToast, setAppToast] = useState<string | null>(null)
  const lastUpdateCheckRef = useRef<number>(0)
  const isAutoConnectingVpnRef = useRef<boolean>(false)

  // Periodic 60-Minute Background Update Scanner (Zero-Data-Loss Invariant)
  useEffect(() => {
    const checkBgUpdate = async () => {
      try {
        if (window.guidegram?.checkForUpdates) {
          const res = await window.guidegram.checkForUpdates()
          if (res?.hasUpdate) {
            setUpdateInfo(res)
          }
        }
      } catch (err) {
        console.warn('[App] Periodic 60m update check error:', err)
      }
    }

    const initialTimer = setTimeout(checkBgUpdate, 15000)
    const intervalTimer = setInterval(checkBgUpdate, 60 * 60 * 1000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
    }
  }, [])

  // Persist notification history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('guidegram_notif_history', JSON.stringify(notificationHistory.slice(0, 150)))
    } catch (_) {}
  }, [notificationHistory])

  // Sync active notifications with Electron dedicated monitor corner window
  useEffect(() => {
    if (window.guidegram?.syncDesktopNotifications) {
      window.guidegram.syncDesktopNotifications({
        notifications: activeNotifications,
        position: config?.notificationPosition || 'bottom-right',
        privacyMode: config?.notificationPrivacyMode || 'full',
        quickReplyEnabled: config?.notificationQuickReply !== false,
      }).catch(() => {})
    }
  }, [activeNotifications, config?.notificationPosition, config?.notificationPrivacyMode, config?.notificationQuickReply])

  const handleManualCheckUpdate = async () => {
    const now = Date.now()
    if (now - lastUpdateCheckRef.current < 20000) {
      setAppToast('Please wait a moment before checking updates again.')
      setTimeout(() => setAppToast(null), 3000)
      return
    }
    lastUpdateCheckRef.current = now
    setIsCheckingUpdate(true)
    setAppToast('Checking for Guidegram updates...')
    try {
      if (window.guidegram?.checkForUpdates) {
        const res = await window.guidegram.checkForUpdates()
        if (res?.hasUpdate) {
          setUpdateInfo(res)
          setAppToast(`New version v${res.latestVersion} found!`)
        } else {
          setAppToast(`Guidegram is up to date (v${res?.currentVersion || '2.1.0'}).`)
        }
      } else {
        setAppToast('Update check service is offline.')
      }
    } catch {
      setAppToast('Unable to check for updates. Please verify your network/proxy.')
    } finally {
      setIsCheckingUpdate(false)
      setTimeout(() => setAppToast(null), 4000)
    }
  }

  const handleToggleGhostMode = async () => {
    const nextMode = !ghostMode
    setGhostMode(nextMode)
    setAppToast(nextMode ? 'Ghost Mode ON: Invisible typing & reading enabled' : 'Ghost Mode OFF')
    setTimeout(() => setAppToast(null), 3000)
    try {
      if (window.guidegram?.updateConfig) {
        await window.guidegram.updateConfig({ ghostMode: nextMode })
      }
    } catch (err) {
      console.warn('[App] Failed to save ghostMode to config:', err)
    }
  }

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
            let targetAccount: AccountInfo | undefined = undefined
            try {
              const urlParams = new URLSearchParams(window.location.search)
              const queryAccountId = urlParams.get('accountId')
              if (queryAccountId) {
                targetAccount = (accs as AccountInfo[]).find((a) => a.id === queryAccountId)
              }
            } catch (_) {}

            const firstConnected = targetAccount || (accs as AccountInfo[]).find((a: AccountInfo) => a.status === 'connected') || accs[0]
            setActiveAccountId(firstConnected.id)

            // Pre-warm local cache for all accounts immediately so account switches are instant (0ms)
            if (window.guidegram?.getCachedDialogs) {
              const warmedMap: Record<string, DialogItem[]> = {}
              for (const acc of (accs as AccountInfo[])) {
                try {
                  const cached = await window.guidegram.getCachedDialogs(acc.id)
                  if (cached && cached.length > 0) {
                    warmedMap[acc.id] = cached
                  }
                } catch (_) {}
              }
              if (Object.keys(warmedMap).length > 0) {
                setDialogsByAccount((prev) => ({ ...warmedMap, ...prev }))
              }
            }

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
    let unsubscribeReadOutbox: (() => void) | undefined
    let unsubscribeAvatarUpdated: (() => void) | undefined
    let unsubscribeDialogsUpdated: (() => void) | undefined

    if (window.guidegram?.on) {
      unsubscribeMsg = window.guidegram.on('telegram:new-message', (payload: any) => {
        const { accountId, chatId, message } = payload
        const isCurrentActive = Boolean(
          activeChatIdRef.current && (
            chatId === activeChatIdRef.current ||
            isPeerMatch(String(chatId), String(activeChatIdRef.current))
          )
        )

        // Telegram Desktop Resource Optimization:
        // Only load and allocate messages in React state if the user is currently viewing this chat!
        // Unopened chats only receive unreadCount and topMessage updates in dialogsByAccount,
        // preventing thousands of background group/channel messages from filling up RAM.
        if (isCurrentActive) {
          setMessagesByChat((prev) => {
            const list = prev[chatId] || []
            const existingIdx = list.findIndex((m) => m.id === message?.id)
            let nextList: MessageItem[]
            if (existingIdx !== -1) {
              nextList = [...list]
              nextList[existingIdx] = { ...nextList[existingIdx], ...message }
            } else {
              nextList = [...list, message]
            }
            nextList.sort((a, b) => (a.date - b.date) || (a.id - b.id))
            return {
              ...prev,
              [chatId]: nextList,
            }
          })
        }
        const targetDialog = dialogsByAccountRef.current[accountId]?.find(
          (d) => d.id === String(chatId) || isPeerMatch(d.id, String(chatId))
        )
        const isChannel = Boolean(targetDialog?.isChannel || (payload as any)?.chatInfo?.isChannel)
        const isGroup = Boolean(targetDialog?.isGroup || (payload as any)?.chatInfo?.isGroup)

        const currentAcc = accounts.find((a) => a.id === accountId)
        const isBotAccount = Boolean(currentAcc?.isBot)

        // MTProto Chat Mute Status:
        // Ironclad mute guard:
        // 1. If targetDialog is muted in local state OR payload marks it muted, it is strictly muted.
        // 2. Channels are muted by default (!targetDialog && isChannel).
        // 3. Bot accounts (logged in via bot token) are strictly DEFAULT MUTED for all incoming chats/messages
        //    unless explicitly unmuted by the user (targetDialog?.isMuted === false).
        const isChatMuted = Boolean(
          targetDialog?.isMuted ||
          (typeof (payload as any)?.chatInfo?.isMuted === 'boolean' && (payload as any).chatInfo.isMuted) ||
          (!targetDialog && isChannel) ||
          (isBotAccount && targetDialog?.isMuted !== false)
        )

        const currentCfg = configRef.current
        const notifsAllowed = currentCfg?.notificationsEnabled !== false
        const typeAllowed = isChannel
          ? Boolean(currentCfg?.notificationChannels)
          : isGroup
          ? currentCfg?.notificationGroups !== false
          : currentCfg?.notificationPrivateChats !== false

        const isUserLookingAtChat = chatId === activeChatIdRef.current && document.hasFocus()

        // -------------------------------------------------------------
        // Telegram Official Client Specification Notification Gate:
        // -------------------------------------------------------------
        // 1. Never notify for outgoing messages (sent by self on any session)
        // 2. Never notify for Telegram service messages (messageService: joins, leaves, pins, call status)
        // 3. Never notify for silent messages (MTProto silent flag)
        // 4. Never notify if user is currently looking at this chat and window is focused
        // 5. In muted chats (groups, channels, or private chats with muteUntil > now):
        //    ONLY notify if the message is an authentic mention (msg.isMention) or reply to me
        // 6. In unmuted chats: notify if chat category is allowed, or if mentioned
        // -------------------------------------------------------------
        const isOutgoing = Boolean(message?.isOutgoing)
        const isService = Boolean(message?.isService || message?.actionType)
        const isSilent = Boolean(message?.isSilent)

        // Authentic Telegram mention: MTProto server-calculated isMention flag,
        // or entity mention matching current account username/id
        const myUsername = currentAcc?.username?.toLowerCase().replace(/^@/, '')
        const myId = currentAcc?.id
        const rawText = message?.text || ''

        const isMention = Boolean(
          message?.isMention ||
          (myUsername && rawText.toLowerCase().includes(`@${myUsername}`)) ||
          (message?.entities || []).some(
            (e: any) =>
              (e.type === 'mention' && myUsername && rawText.substring(e.offset, e.offset + e.length).toLowerCase() === `@${myUsername}`) ||
              (e.type === 'text_mention' && myId && String(e.userId) === String(myId))
          ) ||
          (myId && message?.replyTo?.senderId && String(message.replyTo.senderId) === String(myId))
        )

        let shouldNotify = false
        if (!isOutgoing && !isService && !isSilent && !isUserLookingAtChat && notifsAllowed) {
          if (isChatMuted) {
            // Muted chats in Telegram ONLY notify on direct mentions/replies
            // For bot accounts, incoming bot traffic never notifies unless explicitly unmuted
            shouldNotify = isBotAccount ? false : isMention
          } else {
            // Unmuted chats notify if the category is allowed, or if mentioned
            shouldNotify = typeAllowed || isMention
          }
        }

        if (shouldNotify) {
          if (currentCfg?.soundEnabled !== false) {
            playNotificationSound(currentCfg?.notificationTone || 'classic') // playNotificationSound()
          }
          if (currentCfg?.notificationFlashTaskbar !== false && !document.hasFocus()) {
            window.guidegram?.flashWindow?.(true)
          }

          const sender = message?.senderName || targetDialog?.title || 'Someone'
          const summaryText = message?.text || (message?.mediaType ? `[${message.mediaType}]` : '')

          // Record in Notification History
          setNotificationHistory((prev) => {
            const histItem: NotificationHistoryItem = {
              id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              accountId,
              chatId,
              messageId: message?.id,
              senderName: sender,
              chatTitle: targetDialog?.title,
              avatarUrl: targetDialog?.avatarUrl,
              text: summaryText,
              mediaType: message?.mediaType,
              date: Date.now(),
              isRead: false,
              isGroup,
              isChannel,
            }
            return [histItem, ...prev].slice(0, 150)
          })

          setActiveNotifications((prev) => {
            const maxStack = currentCfg?.notificationMaxStack || 3
            const existingIdx = prev.findIndex((n) => n.chatId === chatId && n.accountId === accountId)

            if (existingIdx !== -1 && currentCfg?.notificationBatching !== false) {
              const updated = [...prev]
              const old = updated[existingIdx]
              updated[existingIdx] = {
                ...old,
                text: summaryText,
                messageId: message?.id,
                date: Date.now(),
                batchCount: (old.batchCount || 1) + 1,
              }
              return updated
            } else {
              const newItem: ActiveNotificationItem = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                accountId,
                chatId,
                messageId: message?.id,
                senderName: sender,
                chatTitle: targetDialog?.title,
                avatarUrl: targetDialog?.avatarUrl,
                text: summaryText,
                mediaType: message?.mediaType,
                date: Date.now(),
                isGroup,
                isChannel,
                batchCount: 1,
              }
              const next = [newItem, ...prev.filter((n) => n.chatId !== chatId)]
              return next.slice(0, maxStack)
            }
          })
        }
        if (!message?.isOutgoing) {
          const sender = message?.senderName || 'Someone'
          const summary = message?.text || (message?.mediaType ? `sent a ${message.mediaType}` : 'sent a message')
          setA11yAnnouncement(`New message from ${sender}: ${summary}`)
        }
        setDialogsByAccount((prev) => {
          const list = prev[accountId] || []
          const msgDate = message?.date ? (message.date < 1e11 ? message.date * 1000 : message.date) : Date.now()
          const msgText = message?.text || (message?.mediaType ? `[${message.mediaType}]` : '')
          const isOutgoing = Boolean(message?.isOutgoing)
          const currentAcc = accounts.find((a) => a.id === accountId)
          const isSavedChatId =
            chatId === accountId ||
            (currentAcc?.id && isPeerMatch(chatId, currentAcc.id))

          const exists = list.some((d) => d.id === chatId || isPeerMatch(d.id, chatId))

          let updatedList: DialogItem[]
          if (!exists) {
            const chatInfo = (payload as any)?.chatInfo
            const isSaved =
              Boolean(isSavedChatId) ||
              chatInfo?.title?.toLowerCase() === 'saved messages' ||
              chatInfo?.title === 'پیام‌های ذخیره‌شده'

            const newDialog: DialogItem = {
              id: chatId,
              accountId,
              title: isSaved ? 'Saved Messages' : (chatInfo?.title || message?.senderName || 'Chat'),
              unreadCount: isSaved ? 0 : (chatId !== activeChatId && !message?.isOutgoing ? 1 : 0),
              unreadMentionsCount: 0,
              isMuted: isChatMuted,
              isUser: chatInfo?.isUser ?? true,
              isGroup: chatInfo?.isGroup ?? false,
              isChannel: chatInfo?.isChannel ?? false,
              isBroadcast: chatInfo?.isBroadcast ?? false,
              isBot: chatInfo?.isBot ?? false,
              isContact: chatInfo?.isContact ?? Boolean((payload as any)?.message?.sender?.isContact),
              isPinned: false,
              isSavedMessages: isSaved,
              lastMessageText: msgText,
              lastMessageDate: msgDate,
              lastMessageId: message?.id,
              lastMessageIsOutgoing: isOutgoing,
              lastMessageRead: isOutgoing ? false : true,
              lastMessageMediaType: message?.mediaType,
              lastMessageThumb: message?.mediaThumbnailUrl || message?.strippedThumb,
              lastMessageSticker: message?.mediaType === 'sticker' && (message as any)?.stickerId ? {
                id: (message as any).stickerId,
                accessHash: (message as any).stickerAccessHash || '',
                fileReferenceHex: (message as any).stickerFileReferenceHex || '',
                alt: message.text || '',
              } : undefined,
              avatarInitials: (chatInfo?.title || message?.senderName || 'C').slice(0, 2).toUpperCase(),
            }
            updatedList = [newDialog, ...list]
          } else {
            updatedList = list.map((d) => {
              if (d.id === chatId || isPeerMatch(d.id, chatId)) {
                const isSaved =
                  Boolean(d.isSavedMessages) ||
                  Boolean(isSavedChatId) ||
                  d.title.toLowerCase() === 'saved messages' ||
                  d.title === 'پیام‌های ذخیره‌شده'

                const shouldIncrement = !isSaved && chatId !== activeChatId && !message?.isOutgoing
                return {
                  ...d,
                  isSavedMessages: d.isSavedMessages || isSaved,
                  unreadCount: isSaved
                    ? 0
                    : shouldIncrement
                    ? d.unreadCount + 1
                    : (isOutgoing || chatId === activeChatId ? 0 : d.unreadCount),
                  lastMessageText: msgText || d.lastMessageText,
                  lastMessageDate: msgDate,
                  lastMessageId: message?.id ?? d.lastMessageId,
                  lastMessageIsOutgoing: isOutgoing,
                  lastMessageRead: isOutgoing ? false : true,
                  lastMessageMediaType: message ? message.mediaType : d.lastMessageMediaType,
                  lastMessageThumb: message ? (message.mediaThumbnailUrl || message.strippedThumb || d.lastMessageThumb) : d.lastMessageThumb,
                  lastMessageSticker: message?.mediaType === 'sticker' && (message as any)?.stickerId ? {
                    id: (message as any).stickerId,
                    accessHash: (message as any).stickerAccessHash || '',
                    fileReferenceHex: (message as any).stickerFileReferenceHex || '',
                    alt: message.text || '',
                  } : d.lastMessageSticker,
                }
              }
              return d
            })
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
            return prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
          }
          return [...prev, updated]
        })

        // Synchronize matching self / Saved Messages dialogs with new name / avatar
        setDialogsByAccount((prev) => {
          const list = prev[updated.id]
          if (!list) return prev
          let changed = false
          const next = list.map((d) => {
            if (d.id === updated.id || isPeerMatch(d.id, updated.id) || d.isSavedMessages) {
              changed = true
              return {
                ...d,
                avatarUrl: updated.avatarUrl !== undefined ? updated.avatarUrl : d.avatarUrl,
                title: d.isSavedMessages ? d.title : (updated.firstName || d.title),
              }
            }
            return d
          })
          return changed ? { ...prev, [updated.id]: next } : prev
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

        // Account status updated: logging only (accountManager handles per-account resilience)
        if (updated.status === 'disconnected') {
          console.log(`[App] Account ${updated.id} (${updated.firstName || ''}) status is disconnected`)
        }
      })

      // Real-time peer & account avatar updates
      unsubscribeAvatarUpdated = window.guidegram.on(
        'telegram:user-avatar-updated',
        (payload: { accountId: string; userId: string; avatarUrl?: string }) => {
          if (!payload) return
          const { accountId, userId, avatarUrl } = payload

          if (userId === accountId) {
            setAccounts((prev) =>
              prev.map((acc) => (acc.id === accountId ? { ...acc, avatarUrl } : acc))
            )
          }

          setDialogsByAccount((prev) => {
            const list = prev[accountId]
            if (!list) return prev
            let changed = false
            const next = list.map((d) => {
              if (d.id === userId || isPeerMatch(d.id, userId) || (userId === accountId && d.isSavedMessages)) {
                changed = true
                return { ...d, avatarUrl }
              }
              return d
            })
            return changed ? { ...prev, [accountId]: next } : prev
          })
        }
      )

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

      // Real-time Dialog Mute Synchronization (Official Telegram Desktop parity)
      unsubscribeMute = window.guidegram.on('telegram:dialog-mute-updated', (payload: any) => {
        const { accountId, chatId, isMuted } = payload || {}
        if (!accountId || !chatId) return
        setDialogsByAccount((prev) => {
          const list = prev[accountId] || []
          return {
            ...prev,
            [accountId]: list.map((d) => (d.id === chatId || isPeerMatch(d.id, chatId) ? { ...d, isMuted: Boolean(isMuted) } : d)),
          }
        })
      })

      // Real-time Dialog Rehydration (e.g. contact sync, offline catchup)
      unsubscribeDialogsUpdated = window.guidegram.on('telegram:dialogs-updated', (payload: { accountId: string; dialogs: DialogItem[] }) => {
        if (!payload?.accountId || !Array.isArray(payload.dialogs)) return
        setDialogsByAccount((prev) => {
          const existing = prev[payload.accountId] || []
          const map = new Map<string, DialogItem>()
          for (const d of existing) map.set(d.id, d)
          for (const d of payload.dialogs) {
            const old = map.get(d.id)
            if (old) {
              map.set(d.id, {
                ...old,
                ...d,
                isContact: Boolean(d.isContact || old.isContact),
                lastMessageDate: Math.max(d.lastMessageDate || 0, old.lastMessageDate || 0),
                unreadCount: typeof d.unreadCount === 'number' ? d.unreadCount : old.unreadCount,
              })
            } else {
              map.set(d.id, d)
            }
          }
          const fullList = Array.from(map.values())
          const pinned = fullList.filter((d) => d.isPinned)
          const unpinned = fullList.filter((d) => !d.isPinned)
          unpinned.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))
          return { ...prev, [payload.accountId]: [...pinned, ...unpinned] }
        })
      })

      // Hourly Auto-Update listener
      unsubscribeUpdate = window.guidegram.on('app:update-available', (info: UpdateInfo) => {
        setUpdateInfo(info)
      })

      // Deep-Link & Telegram URL handler (e.g. tg://proxy?..., tg://socks?...)
      const unsubscribeDeepLink = window.guidegram.on('protocol:deep-link', (payload: any) => {
        if (!payload) return
        if (
          payload.action === 'proxy' ||
          payload.action === 'socks' ||
          payload.rawUrl?.includes('proxy') ||
          payload.rawUrl?.includes('socks')
        ) {
          if (payload.rawUrl) {
            setProxyToImport(payload.rawUrl)
            setIsProxyModalOpen(true)
          }
        }
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
        (payload: { accountId: string; chatId: string; maxId?: number; stillUnreadCount?: number }) => {
          const { accountId, chatId, maxId, stillUnreadCount } = payload
          setDialogsByAccount((prev) => {
            const list = prev[accountId] || []
            const nextCount = typeof stillUnreadCount === 'number' ? stillUnreadCount : 0
            return {
              ...prev,
              [accountId]: list.map((d) =>
                d.id === chatId || isPeerMatch(d.id, chatId)
                  ? {
                      ...d,
                      unreadCount: d.isSavedMessages ? 0 : nextCount,
                      readInboxMaxId: maxId ? Math.max(d.readInboxMaxId || 0, maxId) : d.readInboxMaxId,
                    }
                  : d
              ),
            }
          })
        }
      )

      // Real-time read-outbox sync (ticks turn to double-check in real-time when peer reads)
      unsubscribeReadOutbox = window.guidegram.on(
        'telegram:read-outbox',
        (payload: { accountId: string; chatId: string; maxId: number }) => {
          const { accountId, chatId, maxId } = payload
          setDialogsByAccount((prev) => {
            const list = prev[accountId] || []
            return {
              ...prev,
              [accountId]: list.map((d) =>
                d.id === chatId || isPeerMatch(d.id, chatId)
                  ? {
                      ...d,
                      readOutboxMaxId: Math.max(d.readOutboxMaxId || 0, maxId),
                      lastMessageRead: d.lastMessageId ? d.lastMessageId <= maxId : true,
                    }
                  : d
              ),
            }
          })
          setMessagesByChat((prev) => {
            const matchingKeys = Object.keys(prev).filter((k) => k === chatId || isPeerMatch(k, chatId))
            if (matchingKeys.length === 0) return prev
            const next = { ...prev }
            for (const k of matchingKeys) {
              next[k] = (prev[k] || []).map((m) =>
                m.isOutgoing && m.id <= maxId && !m.isRead
                  ? { ...m, isRead: true }
                  : m
              )
            }
            return next
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
        unsubscribeReadOutbox?.()
        unsubscribeAvatarUpdated?.()
        unsubscribeDialogsUpdated?.()
        unsubscribeDeepLink?.()
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

  // Reactive toggle for Light / Dark Mode & Theme Invariant
  useEffect(() => {
    const isLight = config?.theme === 'light'
    if (isLight) {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [config?.theme])

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
            handleSelectAccount(targetAcc.id)
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

      // 3. F1 / Ctrl + / -> Toggle Keyboard Shortcuts Cheat Sheet
      if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault()
        setIsShortcutsModalOpen((prev) => !prev)
        return
      }

      // 4. Alt + Up / Alt + Down -> Power Chat Navigation (Telegram Desktop Parity)
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const currentDialogs = activeAccountId ? dialogsByAccount[activeAccountId] || [] : []
        if (currentDialogs.length > 0) {
          e.preventDefault()
          const currentIdx = currentDialogs.findIndex((d) => d.id === activeChatId)
          let targetIdx = 0
          if (e.key === 'ArrowUp') {
            targetIdx = currentIdx > 0 ? currentIdx - 1 : currentDialogs.length - 1
          } else {
            targetIdx = currentIdx >= 0 && currentIdx < currentDialogs.length - 1 ? currentIdx + 1 : 0
          }
          const nextChat = currentDialogs[targetIdx]
          if (nextChat) {
            handleSelectChat(nextChat.id)
            setA11yAnnouncement(`Navigated to chat ${nextChat.title}`)
          }
        }
      }

      // 5. Alt + Left / Alt + Right -> Folder Tab Navigation
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const folderIds = ['all', 'users', 'groups', 'channels', 'bots', 'unread', ...cloudFolders.map((f) => `folder:${f.id}`)]
        const currFolderIdx = folderIds.indexOf(activeTab)
        if (currFolderIdx !== -1) {
          e.preventDefault()
          let nextFolderIdx = 0
          if (e.key === 'ArrowLeft') {
            nextFolderIdx = currFolderIdx > 0 ? currFolderIdx - 1 : folderIds.length - 1
          } else {
            nextFolderIdx = currFolderIdx < folderIds.length - 1 ? currFolderIdx + 1 : 0
          }
          setActiveTab(folderIds[nextFolderIdx])
        }
      }

      // 6. Esc -> Close open modals
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false)
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
  }, [
    accounts,
    isSettingsOpen,
    isProxyModalOpen,
    isAddAccountOpen,
    isUnifiedInboxOpen,
    isMainMenuOpen,
    isCloseConfirmOpen,
    isShortcutsModalOpen,
    activeAccountId,
    dialogsByAccount,
    activeChatId,
    activeTab,
    cloudFolders,
  ])

  const loadCloudFoldersForAccount = async (accountId: string) => {
    if (!window.guidegram?.getCloudFolders) return
    try {
      const folders = await window.guidegram.getCloudFolders(accountId)
      if (Array.isArray(folders)) {
        setCloudFolders(folders)
      } else {
        setCloudFolders([])
      }
    } catch (err) {
      console.error('Failed to load cloud folders:', err)
      setCloudFolders([])
    }
  }

  const loadDialogsForAccount = async (accountId: string) => {
    if (!window.guidegram?.getDialogs) return
    try {
      hasMoreDialogsRef.current = true
      loadCloudFoldersForAccount(accountId)

      let hasCached = false
      // Instant cache load (<10ms) from local disk
      if (window.guidegram.getCachedDialogs) {
        try {
          const cached = await window.guidegram.getCachedDialogs(accountId)
          if (cached && cached.length > 0) {
            hasCached = true
            setDialogsByAccount((prev) => ({ ...prev, [accountId]: cached }))
          }
        } catch (cacheErr) {
          console.warn('Failed to read cached dialogs:', cacheErr)
        }
      }

      if (!hasCached && (!dialogsByAccountRef.current[accountId] || dialogsByAccountRef.current[accountId].length === 0)) {
        setIsLoadingDialogs(true)
      }

      // Snappy initial fetch (80 dialogs = 1 network chunk, <400ms)
      const initialLimit = hasCached ? 150 : 80
      const dialogs = await window.guidegram.getDialogs(accountId, initialLimit)
      
      setDialogsByAccount((prev) => {
        const existing = prev[accountId] || []
        const mergedMap = new Map<string, DialogItem>()
        // Preserve all previously cached dialogs so older PVs/contacts are not evicted
        for (const d of existing) {
          mergedMap.set(d.id, d)
        }
        for (const d of dialogs) {
          const old = mergedMap.get(d.id)
          if (!old) {
            mergedMap.set(d.id, d)
          } else {
            mergedMap.set(d.id, {
              ...old,
              ...d,
              isContact: Boolean(d.isContact || old.isContact),
              lastMessageDate: Math.max(d.lastMessageDate || 0, old.lastMessageDate || 0),
              unreadCount: typeof d.unreadCount === 'number' ? d.unreadCount : old.unreadCount,
            })
          }
        }
        const fullList = Array.from(mergedMap.values())
        const pinned = fullList.filter((d) => d.isPinned)
        const unpinned = fullList.filter((d) => !d.isPinned)
        unpinned.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))
        return { ...prev, [accountId]: [...pinned, ...unpinned] }
      })

      // Progressive Background Dialog Hydration (Official Telegram UX parity: silently feeds chats in the background)
      if (dialogs.length >= 20) {
        scheduleBackgroundDialogSync(accountId)
      } else {
        hasMoreDialogsRef.current = false
      }
    } catch (err) {
      console.error('Failed to load dialogs:', err)
    } finally {
      setIsLoadingDialogs(false)
    }
  }

  const scheduleBackgroundDialogSync = (accountId: string) => {
    if (backgroundSyncTimerRef.current) {
      clearTimeout(backgroundSyncTimerRef.current)
    }
    backgroundSyncTimerRef.current = setTimeout(() => {
      runBackgroundDialogSync(accountId)
    }, 1200)
  }

  const runBackgroundDialogSync = async (accountId: string) => {
    if (
      !accountId ||
      accountId !== activeAccountIdRef.current ||
      isBackgroundSyncingDialogsRef.current ||
      isLoadingMoreDialogsRef.current ||
      !hasMoreDialogsRef.current ||
      !window.guidegram?.getDialogs
    ) {
      return
    }

    const currentList = dialogsByAccountRef.current[accountId] || []
    if (currentList.length === 0 || currentList.length >= 2500) {
      return
    }

    const nonPinned = currentList.filter((d) => !d.isPinned && (d.lastMessageDate || 0) > 0)
    const lastDialog = nonPinned.length > 0 ? nonPinned[nonPinned.length - 1] : currentList[currentList.length - 1]
    if (!lastDialog) return

    const offsetDate = lastDialog?.lastMessageDate ? Math.floor(lastDialog.lastMessageDate / 1000) : undefined
    const offsetId = lastDialog?.lastMessageId || 0
    const offsetPeerId = lastDialog?.id

    isBackgroundSyncingDialogsRef.current = true
    try {
      const nextBatch = await window.guidegram.getDialogs(accountId, 150, offsetDate, offsetId, offsetPeerId)
      if (!nextBatch || nextBatch.length === 0) {
        hasMoreDialogsRef.current = false
      } else {
        setDialogsByAccount((prev) => {
          const existing = prev[accountId] || []
          const existingMap = new Map<string, DialogItem>()
          for (const d of existing) {
            existingMap.set(d.id, d)
          }
          for (const d of nextBatch) {
            const old = existingMap.get(d.id)
            if (!old) {
              existingMap.set(d.id, d)
            } else {
              existingMap.set(d.id, {
                ...old,
                ...d,
                isContact: Boolean(d.isContact || old.isContact),
                lastMessageDate: Math.max(d.lastMessageDate || 0, old.lastMessageDate || 0),
                unreadCount: typeof d.unreadCount === 'number' ? d.unreadCount : old.unreadCount,
              })
            }
          }
          const fullList = Array.from(existingMap.values())
          const pinned = fullList.filter((d) => d.isPinned)
          const unpinned = fullList.filter((d) => !d.isPinned)
          unpinned.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))
          return { ...prev, [accountId]: [...pinned, ...unpinned] }
        })

        // Continue background sync as long as Telegram returned a full or sizable batch (>= 20)
        // without killing hydration prematurely if items overlapped with local cache
        if (nextBatch.length >= 20 && hasMoreDialogsRef.current) {
          scheduleBackgroundDialogSync(accountId)
        } else {
          hasMoreDialogsRef.current = false
        }
      }
    } catch (err) {
      console.warn('[BackgroundDialogSync] Progressive sync paused:', err)
    } finally {
      isBackgroundSyncingDialogsRef.current = false
    }
  }

  const handleLoadMoreDialogs = async () => {
    if (
      !activeAccountId ||
      !window.guidegram?.getDialogs ||
      isLoadingMoreDialogsRef.current ||
      isLoadingMoreDialogs ||
      !hasMoreDialogsRef.current
    ) {
      return
    }
    const currentList = dialogsByAccount[activeAccountId] || []
    if (currentList.length === 0) return

    isLoadingMoreDialogsRef.current = true
    setIsLoadingMoreDialogs(true)
    try {
      const nonPinned = currentList.filter((d) => !d.isPinned && (d.lastMessageDate || 0) > 0)
      const lastDialog = nonPinned.length > 0 ? nonPinned[nonPinned.length - 1] : currentList[currentList.length - 1]
      const offsetDate = lastDialog?.lastMessageDate ? Math.floor(lastDialog.lastMessageDate / 1000) : undefined
      const offsetId = lastDialog?.lastMessageId || 0
      const offsetPeerId = lastDialog?.id
      const nextBatch = await window.guidegram.getDialogs(activeAccountId, 150, offsetDate, offsetId, offsetPeerId)

      if (!nextBatch || nextBatch.length === 0) {
        hasMoreDialogsRef.current = false
      } else {
        setDialogsByAccount((prev) => {
          const existing = prev[activeAccountId] || []
          const existingMap = new Map<string, DialogItem>()
          for (const d of existing) {
            existingMap.set(d.id, d)
          }
          for (const d of nextBatch) {
            const old = existingMap.get(d.id)
            if (!old) {
              existingMap.set(d.id, d)
            } else {
              existingMap.set(d.id, {
                ...old,
                ...d,
                isContact: Boolean(d.isContact || old.isContact),
                lastMessageDate: Math.max(d.lastMessageDate || 0, old.lastMessageDate || 0),
                unreadCount: typeof d.unreadCount === 'number' ? d.unreadCount : old.unreadCount,
              })
            }
          }
          const fullList = Array.from(existingMap.values())
          const pinned = fullList.filter((d) => d.isPinned)
          const unpinned = fullList.filter((d) => !d.isPinned)
          unpinned.sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))
          return { ...prev, [activeAccountId]: [...pinned, ...unpinned] }
        })
        if (nextBatch.length < 20) {
          hasMoreDialogsRef.current = false
        }
      }
    } catch (err) {
      console.warn('Failed to load more dialogs:', err)
    } finally {
      isLoadingMoreDialogsRef.current = false
      setIsLoadingMoreDialogs(false)
    }
  }

  const handleUpdateUnreadCount = (chatId: string, unreadCount: number) => {
    if (!activeAccountId) return
    setDialogsByAccount((prev) => {
      const list = prev[activeAccountId] || []
      const current = list.find((d) => d.id === chatId)
      if (!current || current.unreadCount === unreadCount) return prev
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
      const sortedMsgs = Array.isArray(msgs)
        ? [...msgs].sort((a, b) => (a.date - b.date) || (a.id - b.id))
        : []
      setMessagesByChat((prev) => {
        const next: Record<string, MessageItem[]> = { ...prev, [chatId]: sortedMsgs }
        const keys = Object.keys(next)
        // Keep at most 3 recently opened chats in memory (active + 2 previous for snappy back-navigation)
        if (keys.length > 3) {
          const toEvict = keys.filter((k) => k !== chatId).slice(0, keys.length - 3)
          for (const k of toEvict) {
            delete next[k]
          }
        }
        return next
      })

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
      const merged = Array.from(existingMap.values()).sort((a, b) => (a.date - b.date) || (a.id - b.id))
      return { ...prev, [activeChatId]: merged }
    })
  }

  const handleSelectAccount = async (accountId: string) => {
    setActiveAccountId(accountId)
    setIsUnifiedInboxOpen(false)
    setActiveChatId(null)
    setActiveTab('all')
    setSearchQuery('')
    setCloudFolders([])

    loadDialogsForAccount(accountId)
  }

  const handleSelectChat = (
    chatId: string,
    targetMsgId?: number,
    provisionalPeer?: Partial<DialogItem>
  ) => {
    if (activeAccountId && provisionalPeer) {
      setDialogsByAccount((prev) => {
        const list = prev[activeAccountId] || []
        const exists = list.some((d) => d.id === chatId)
        if (exists) return prev
        const newPeer: DialogItem = {
          id: chatId,
          accountId: activeAccountId,
          title: provisionalPeer.title || 'Chat',
          unreadCount: provisionalPeer.unreadCount || 0,
          isUser: Boolean(provisionalPeer.isUser),
          isGroup: Boolean(provisionalPeer.isGroup),
          isChannel: Boolean(provisionalPeer.isChannel),
          isBot: Boolean(provisionalPeer.isBot),
          isPinned: false,
          username: provisionalPeer.username,
          avatarUrl: provisionalPeer.avatarUrl,
          accessHash: provisionalPeer.accessHash,
          ...provisionalPeer,
        }
        return { ...prev, [activeAccountId]: [newPeer, ...list] }
      })
    }
    setActiveChatId(chatId)
    setInitialScrollMsgId(targetMsgId ?? null)
    if (activeAccountId) {
      loadMessages(activeAccountId, chatId)
    }
  }

  const handleJoinedChat = async (chatId: string) => {
    if (!activeAccountId) return
    setIsMainMenuOpen(false)
    await loadDialogsForAccount(activeAccountId)
    handleSelectChat(chatId)
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
        isOutgoing: true,
        isRead: false,
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

      setMessagesByChat((prev) => {
        const list = prev[activeChatId] || []
        const existingIdx = list.findIndex((m) => m.id === enrichedSent.id)
        let nextList: MessageItem[]
        if (existingIdx !== -1) {
          nextList = [...list]
          nextList[existingIdx] = { ...nextList[existingIdx], ...enrichedSent }
        } else {
          nextList = [...list, enrichedSent]
        }
        nextList.sort((a, b) => (a.date - b.date) || (a.id - b.id))
        return {
          ...prev,
          [activeChatId]: nextList,
        }
      })

      setDialogsByAccount((prev) => {
        const list = prev[activeAccountId] || []
        return {
          ...prev,
          [activeAccountId]: list.map((d) =>
            d.id === activeChatId
              ? {
                  ...d,
                  lastMessageText: text,
                  lastMessageDate: Date.now(),
                  lastMessageId: sent.id,
                  lastMessageIsOutgoing: true,
                  lastMessageRead: false,
                  unreadCount: 0,
                }
              : d
          ),
        }
      })
    } catch (err) {
      console.error('Failed to send message:', err)
      throw err
    }
  }

  const handleEditMessage = async (message: MessageItem, newText: string) => {
    if (!activeAccountId) return
    try {
      const updated = await window.guidegram.editMessage(
        activeAccountId,
        message.chatId,
        message.id,
        newText
      )
      setMessagesByChat((prev) => {
        const list = prev[message.chatId] || []
        return {
          ...prev,
          [message.chatId]: list.map((m) =>
            m.id === message.id
              ? {
                  ...m,
                  text: updated?.text ?? newText,
                  editDate: updated?.editDate || Math.floor(Date.now() / 1000),
                }
              : m
          ),
        }
      })
    } catch (err) {
      console.error('Failed to edit message:', err)
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
        isOutgoing: true,
        isRead: false,
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

      setMessagesByChat((prev) => {
        const list = prev[activeChatId] || []
        const existingIdx = list.findIndex((m) => m.id === enrichedSent.id)
        let nextList: MessageItem[]
        if (existingIdx !== -1) {
          nextList = [...list]
          nextList[existingIdx] = { ...nextList[existingIdx], ...enrichedSent }
        } else {
          nextList = [...list, enrichedSent]
        }
        nextList.sort((a, b) => (a.date - b.date) || (a.id - b.id))
        return {
          ...prev,
          [activeChatId]: nextList,
        }
      })

      const mediaLabel = options?.caption || (options?.isVoice ? '[Voice message]' : '[Photo]')
      setDialogsByAccount((prev) => {
        const list = prev[activeAccountId] || []
        return {
          ...prev,
          [activeAccountId]: list.map((d) =>
            d.id === activeChatId
              ? {
                  ...d,
                  lastMessageText: mediaLabel,
                  lastMessageDate: Date.now(),
                  lastMessageId: sent.id,
                  lastMessageIsOutgoing: true,
                  lastMessageRead: false,
                  lastMessageMediaType: options?.isVoice ? 'voice' : 'photo',
                  unreadCount: 0,
                }
              : d
          ),
        }
      })
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
    const msgs = forwardMessagesList && forwardMessagesList.length > 0 ? forwardMessagesList : (forwardMessage ? [forwardMessage] : [])
    if (!activeAccountId || msgs.length === 0 || !window.guidegram) return
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

    const fromChatId = msgs[0].chatId
    const msgIds = msgs.map((m) => m.id)

    await window.guidegram.forwardMessages(
      activeAccountId,
      targetChatIds,
      fromChatId,
      msgIds,
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

  // Batch delete messages
  const handleDeleteMessages = async (messagesToDelete: MessageItem[]): Promise<boolean> => {
    if (!activeAccountId || !activeChatId || !window.guidegram || messagesToDelete.length === 0) return false
    const revoke = config?.alwaysDeleteBoth ?? true
    try {
      const ids = messagesToDelete.map((m) => m.id)
      await window.guidegram.deleteMessages(activeAccountId, activeChatId, ids, revoke)
      const idSet = new Set(ids)
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).filter((m) => !idSet.has(m.id)),
      }))
      return true
    } catch (err) {
      console.error('Failed to delete messages batch:', err)
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
          if (category === 'users') return d.isUser && !d.isBot
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

  const handleOpenUserProfile = (
    peerId: string,
    initialDetailsOrTitle?: Partial<ChatDetails> | string
  ) => {
    const initialDetails =
      typeof initialDetailsOrTitle === 'string'
        ? { title: initialDetailsOrTitle }
        : initialDetailsOrTitle
    setViewingUserProfile({ peerId, initialDetails })
  }

  const handleSelectUserOrChat = async (
    target: string,
    targetMsgId?: number,
    initialMeta?: Partial<DialogItem>
  ) => {
    if (!activeAccountId) return
    const dialogs = dialogsByAccount[activeAccountId] || []
    const cleanTarget = target.replace(/^@/, '').trim()
    const targetDigits = cleanTarget.replace(/^-100/, '').replace(/^-/, '')
    const isTargetNumeric = /^\d+$/.test(targetDigits)
    const found = dialogs.find(
      (d) =>
        d.id === cleanTarget ||
        d.id === target ||
        (d.username && d.username.toLowerCase() === cleanTarget.toLowerCase()) ||
        (isTargetNumeric && d.id.replace(/^-100/, '').replace(/^-/, '') === targetDigits) ||
        d.title.toLowerCase() === cleanTarget.toLowerCase() ||
        d.title.toLowerCase() === target.toLowerCase()
    )
    if (found) {
      handleSelectChat(found.id, targetMsgId)
      return
    }

    // If initialMeta exists, use it immediately with zero network latency
    if (initialMeta) {
      const peerId = initialMeta.id || cleanTarget
      const provisional: DialogItem = {
        id: peerId,
        accountId: activeAccountId,
        title: initialMeta.title || `Chat ${cleanTarget}`,
        username: initialMeta.username,
        avatarUrl: initialMeta.avatarUrl,
        unreadCount: initialMeta.unreadCount || 0,
        isUser: initialMeta.isUser ?? true,
        isGroup: initialMeta.isGroup ?? false,
        isChannel: initialMeta.isChannel ?? false,
        isBot: initialMeta.isBot ?? false,
        isPinned: false,
        accessHash: initialMeta.accessHash,
        ...initialMeta,
      }
      setDialogsByAccount((prev) => {
        const list = prev[activeAccountId] || []
        const exists = list.some((d) => d.id === peerId)
        return exists ? prev : { ...prev, [activeAccountId]: [provisional, ...list] }
      })
      handleSelectChat(peerId, targetMsgId)
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
          handleSelectChat(resolved.id, targetMsgId)
          return
        }
      } catch (err) {
        console.warn('resolvePeer failed, falling back to provisional dialog or search query:', err)
      }
    }

    // If cleanTarget is numeric user ID, create a provisional dialog item
    if (isTargetNumeric) {
      const provisional: DialogItem = {
        id: cleanTarget,
        accountId: activeAccountId,
        title: `User ${cleanTarget}`,
        unreadCount: 0,
        isUser: true,
        isGroup: false,
        isChannel: false,
        isBot: false,
        isPinned: false,
      }
      setDialogsByAccount((prev) => {
        const list = prev[activeAccountId] || []
        const exists = list.some((d) => d.id === provisional.id)
        return exists ? prev : { ...prev, [activeAccountId]: [provisional, ...list] }
      })
      handleSelectChat(provisional.id, targetMsgId)
      return
    }

    setSearchQuery(cleanTarget)
  }

  // Open Saved Messages for current active account
  const handleOpenSavedMessages = () => {
    if (isUnifiedInboxOpen) {
      setIsUnifiedInboxOpen(false)
    }
    const accId = activeAccountId || accounts[0]?.id
    if (!accId) return
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(accounts[0].id)
    }
    const currentAcc = accounts.find((a) => a.id === accId)
    const dialogs = dialogsByAccount[accId] || []
    // Look for Saved Messages dialog or self peer
    const savedChat = dialogs.find(
      (d) =>
        d.isSavedMessages ||
        d.title.toLowerCase() === 'saved messages' ||
        d.title === 'پیام‌های ذخیره‌شده' ||
        (currentAcc?.id && (d.id === currentAcc.id || isPeerMatch(d.id, currentAcc.id))) ||
        (currentAcc?.username && d.username?.toLowerCase() === currentAcc.username.toLowerCase()) ||
        (currentAcc?.phone && d.id === currentAcc.phone)
    )
    if (savedChat) {
      handleSelectChat(savedChat.id)
    } else if (currentAcc?.id) {
      handleSelectChat(currentAcc.id)
    } else if (currentAcc?.username) {
      handleSelectUserOrChat(currentAcc.username)
    } else {
      handleSelectChat('me')
    }
  }


  const handleToggleNightMode = async () => {
    const isNight = config?.theme !== 'light'
    const nextTheme = isNight ? 'light' : 'dark'
    if (config) {
      setConfig({ ...config, theme: nextTheme })
    }
    await window.guidegram?.updateConfig({ theme: nextTheme })
  }

  // Pro Notification HUD Interactions
  const handleSelectFromNotification = (accountId: string, chatId: string, messageId?: number) => {
    window.guidegram?.focusWindow?.()
    if (activeAccountId !== accountId) {
      setActiveAccountId(accountId)
      loadDialogsForAccount(accountId)
    }
    handleSelectChat(chatId, messageId)
    setActiveNotifications((prev) => prev.filter((n) => !(n.chatId === chatId && n.accountId === accountId)))
  }

  const handleQuickReplyFromNotification = async (
    accountId: string,
    chatId: string,
    text: string,
    replyToMsgId?: number
  ) => {
    if (!window.guidegram?.sendMessage) return
    const sent = await window.guidegram.sendMessage(
      accountId,
      chatId,
      text,
      replyToMsgId
    )
    if (sent) {
      setMessagesByChat((prev) => {
        const list = prev[chatId] || []
        return {
          ...prev,
          [chatId]: [...list, sent],
        }
      })
      setDialogsByAccount((prev) => {
        const list = prev[accountId] || []
        return {
          ...prev,
          [accountId]: list.map((d) =>
            d.id === chatId
              ? {
                  ...d,
                  lastMessageText: text,
                  lastMessageDate: Date.now(),
                  lastMessageId: sent.id,
                  lastMessageIsOutgoing: true,
                  unreadCount: 0,
                }
              : d
          ),
        }
      })
    }
  }

  const handleMarkAsReadFromNotification = (accountId: string, chatId: string, messageId?: number) => {
    window.guidegram?.markAsRead?.(accountId, chatId, messageId || 0)
    setDialogsByAccount((prev) => {
      const list = prev[accountId] || []
      return {
        ...prev,
        [accountId]: list.map((d) => (d.id === chatId ? { ...d, unreadCount: 0 } : d)),
      }
    })
    setActiveNotifications((prev) => prev.filter((n) => !(n.chatId === chatId && n.accountId === accountId)))
  }

  const handleMuteChatFromNotification = (accountId: string, chatId: string) => {
    window.guidegram?.toggleChatNotifications?.(accountId, chatId, true)
    setDialogsByAccount((prev) => {
      const list = prev[accountId] || []
      return {
        ...prev,
        [accountId]: list.map((d) => (d.id === chatId || isPeerMatch(d.id, chatId) ? { ...d, isMuted: true } : d)),
      }
    })
    setActiveNotifications((prev) => prev.filter((n) => !(n.chatId === chatId && n.accountId === accountId)))
  }

  const handleDismissNotification = (id: string) => {
    setActiveNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Listen to actions originating from the floating desktop notification window
  useEffect(() => {
    if (window.guidegram?.on) {
      const unsubDismiss = window.guidegram.on('notification:action:dismiss', (payload: any) => {
        if (payload?.id) {
          handleDismissNotification(payload.id)
        }
      })
      const unsubSelect = window.guidegram.on('notification:action:select', (payload: any) => {
        if (payload?.accountId && payload?.chatId) {
          setActiveAccountId(payload.accountId)
          setActiveChatId(payload.chatId)
          loadMessages(payload.accountId, payload.chatId)
          if (payload.messageId) {
            setInitialScrollMsgId(payload.messageId)
          }
          if (payload.id) {
            handleDismissNotification(payload.id)
          }
          window.guidegram?.focusWindow?.()
        }
      })
      const unsubRead = window.guidegram.on('notification:action:read', (payload: any) => {
        if (payload?.accountId && payload?.chatId) {
          handleMarkAsReadFromNotification(payload.accountId, payload.chatId, payload.messageId)
        }
      })
      const unsubReply = window.guidegram.on('notification:action:reply', (payload: any) => {
        if (payload?.id) {
          handleDismissNotification(payload.id)
        }
      })
      const unsubMute = window.guidegram.on('notification:action:mute', (payload: any) => {
        if (payload?.accountId && payload?.chatId) {
          handleMuteChatFromNotification(payload.accountId, payload.chatId)
        }
      })

      return () => {
        unsubDismiss()
        unsubSelect()
        unsubRead()
        unsubReply()
        unsubMute()
      }
    }
  }, [])

  // Notification History Management Handlers
  const handleSelectFromHistory = (item: NotificationHistoryItem) => {
    setActiveAccountId(item.accountId)
    setActiveChatId(item.chatId)
    loadMessages(item.accountId, item.chatId)
    if (item.messageId) {
      setInitialScrollMsgId(item.messageId)
    }
    setNotificationHistory((prev) =>
      prev.map((h) => (h.id === item.id ? { ...h, isRead: true } : h))
    )
    window.guidegram?.focusWindow?.()
  }

  const handleMarkAllHistoryRead = () => {
    setNotificationHistory((prev) => prev.map((h) => ({ ...h, isRead: true })))
  }

  const handleClearHistory = () => {
    setNotificationHistory([])
    try {
      localStorage.removeItem('guidegram_notif_history')
    } catch (_) {}
  }

  const handleDeleteHistoryItem = (id: string) => {
    setNotificationHistory((prev) => prev.filter((h) => h.id !== id))
  }

  const handleMarkHistoryItemRead = (id: string) => {
    setNotificationHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isRead: true } : h))
    )
  }

  useEffect(() => {
    const handleTestNotification = () => {
      const testItem: ActiveNotificationItem = {
        id: `test_${Date.now()}`,
        accountId: activeAccountId || accounts[0]?.id || 'acc_test',
        chatId: activeChatId || 'chat_test',
        messageId: 9999,
        senderName: 'پاول دورف (Telegram)',
        chatTitle: 'راهنمای گایدگرام',
        text: 'این یک اعلان آزمایشی از موتور اعلان فوق‌پیشرفته گایدگرامه! می‌تونی همین الان رپلای بزنی یا دکمه خوانده شد رو کلیک کنی 🚀',
        date: Date.now(),
        isGroup: false,
      }
      if (configRef.current?.soundEnabled !== false) {
        playNotificationSound(configRef.current?.notificationTone || 'classic')
      }
      if (configRef.current?.notificationFlashTaskbar !== false) {
        window.guidegram?.flashWindow?.(true)
      }
      setNotificationHistory((prev) => {
        const histItem: NotificationHistoryItem = {
          id: testItem.id,
          accountId: testItem.accountId,
          chatId: testItem.chatId,
          messageId: testItem.messageId,
          senderName: testItem.senderName,
          chatTitle: testItem.chatTitle,
          text: testItem.text,
          date: testItem.date,
          isRead: false,
          isGroup: false,
        }
        return [histItem, ...prev].slice(0, 150)
      })
      setActiveNotifications((prev) => [testItem, ...prev.slice(0, 2)])
    }
    window.addEventListener('guidegram:test-notification', handleTestNotification)
    return () => window.removeEventListener('guidegram:test-notification', handleTestNotification)
  }, [activeAccountId, activeChatId, accounts])

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
    try {
      const updatedAccount = await window.guidegram.setAccountProxy(accountId, proxy)
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, ...updatedAccount } : acc))
      )
    } catch (err: any) {
      console.error('Failed to set account proxy:', err)
      setAppToast('خطا در اعمال پروکسی: ' + (err?.message || 'نامشخص'))
    }
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
  const currentChat = currentDialogs.find((d) => d.id === activeChatId || isPeerMatch(d.id, activeChatId)) || null
  const currentMessages = (activeChatId && messagesByChat[activeChatId]) || []

  const isSavedMessagesActive = useMemo(() => {
    if (isUnifiedInboxOpen || !activeChatId) return false
    if (activeChatId === 'me') return true
    if (currentChat?.isSavedMessages) return true
    if (currentChat?.title?.toLowerCase() === 'saved messages' || currentChat?.title === 'پیام‌های ذخیره‌شده') return true
    if (currentAccount?.id && (currentChat?.id === currentAccount.id || isPeerMatch(currentChat?.id, currentAccount.id))) return true
    if (currentAccount?.id && (activeChatId === currentAccount.id || isPeerMatch(activeChatId, currentAccount.id))) return true
    if (currentAccount?.phone && (activeChatId === currentAccount.phone || currentChat?.id === currentAccount.phone)) return true
    if (currentAccount?.username && currentChat?.username && currentChat.username.toLowerCase() === currentAccount.username.toLowerCase()) return true
    return false
  }, [isUnifiedInboxOpen, activeChatId, currentChat, currentAccount])

  // Compute archived unread count
  const archivedUnreadCount = useMemo(() => {
    return currentDialogs
      .filter((d) => d.folderId === 1 || (d as any).archived)
      .reduce((acc, d) => acc + (d.unreadCount || 0), 0)
  }, [currentDialogs])

  // Compute unread counts per account for multi-account switcher (excluding muted chats)
  const unreadCountsByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const acc of accounts) {
      const dList = dialogsByAccount[acc.id] || []
      map[acc.id] = dList
        .filter((d) => !d.isMuted && !d.isSavedMessages && d.folderId !== 1 && !(d as any).archived)
        .reduce((sum, d) => sum + (d.unreadCount || 0), 0)
    }
    return map
  }, [accounts, dialogsByAccount])

  // Compute unread counts for tabs
  const unreadCounts: Record<TabCategory, number> = {
    all: currentDialogs.filter((d) => d.folderId !== 1 && !(d as any).archived).reduce((acc, d) => acc + d.unreadCount, 0),
    users: currentDialogs.filter((d) => d.isUser && !d.isBot && d.folderId !== 1 && !(d as any).archived).reduce((acc, d) => acc + d.unreadCount, 0),
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

  // Listen for close-confirm request triggered by main process (e.g. Alt+F4 / native close)
  useEffect(() => {
    const unsub = window.guidegram?.on?.('app:request-close-confirm', () => {
      setIsCloseConfirmOpen(true)
    })
    return () => {
      unsub?.()
    }
  }, [])

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
    <div className="flex flex-col h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-dark-950 font-sans">
      {/* Accessible Screen-Reader Polite Live Region (WCAG 4.1.3 Status Messages) */}
      <div
        id="a11y-live-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {a11yAnnouncement}
      </div>

      {/* 1. Integrated Custom TitleBar */}
      <TitleBar
        activeAccount={currentAccount}
        ghostMode={ghostMode}
        onToggleGhostMode={handleToggleGhostMode}
        onRequestClose={handleRequestClose}
        onToggleMainMenu={() => setIsMainMenuOpen(true)}
        onOpenSavedMessages={handleOpenSavedMessages}
        onOpenMcpHub={() => setIsMcpHubOpen(true)}
        onCheckUpdate={handleManualCheckUpdate}
        isCheckingUpdate={isCheckingUpdate}
        onOpenProxyModal={() => setIsProxyModalOpen(true)}
        onOpenNotificationHistory={() => setIsNotificationHistoryOpen(true)}
        unreadNotificationsCount={notificationHistory.filter((i) => !i.isRead).length}
      />

      {/* Floating System Notification Toast */}
      {appToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-dark-900/95 border border-primary-500/40 text-gray-100 text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          <span>{appToast}</span>
        </div>
      )}

      {/* 2. Main Content: Welcome Screen OR Active Multi-Account Workspace */}
      {accounts.length === 0 ? (
        <WelcomeScreen
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
          onOpenProxyModal={() => setIsProxyModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : isUnifiedInboxOpen ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <nav role="navigation" aria-label="Accounts and services">
            <AccountDock
              accounts={accounts}
              activeAccountId={activeAccountId}
              unreadCountsByAccount={unreadCountsByAccount}
              isUnifiedInboxOpen={isUnifiedInboxOpen}
              onSelectAccount={handleSelectAccount}
              onOpenAddAccount={() => setIsAddAccountOpen(true)}
              onToggleUnifiedInbox={() => setIsUnifiedInboxOpen(!isUnifiedInboxOpen)}
              onOpenProxyModal={() => setIsProxyModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenMcpHub={() => setIsMcpHubOpen(true)}
              onOpenSavedMessages={handleOpenSavedMessages}
              isSavedMessagesActive={isSavedMessagesActive}
              onOpenAccountExport={() => setIsAccountExportOpen(true)}
              onOpenTonWallet={() => setIsTonWalletOpen(true)}
            />
          </nav>
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center bg-dark-900 text-gray-400 text-sm">Loading Unified Inbox...</div>}>
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
          </React.Suspense>
        </div>
      ) : isMobile ? (
        /* Mobile Single-Column Responsive View (Master-Detail) */
        <div className="flex flex-1 min-h-0 overflow-hidden w-full relative">
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden w-full">
            {/* Show ChatTabs only if conversation is not open */}
            {!activeChatId && (
              <ChatTabs
                accountId={currentAccount?.id}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                unreadCounts={unreadCounts}
                markAllReadEnabled={config?.markAllReadEnabled ?? true}
                onMarkAllAsRead={handleMarkAllAsRead}
                onCloudFoldersLoaded={setCloudFolders}
                cloudFolders={cloudFolders}
                onOpenFolderManager={() => setIsFolderManagerOpen(true)}
              />
            )}

            {/* Conversation List Column */}
            {!activeChatId ? (
              <div className="flex-1 flex flex-col h-full bg-dark-850 overflow-hidden w-full">
                <ChatList
                  account={currentAccount}
                  dialogs={currentDialogs}
                  activeChatId={activeChatId}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  showChatId={config?.showChatId ?? true}
                  ghostMode={ghostMode}
                  cloudFolders={cloudFolders}
                  isLoadingDialogs={isLoadingDialogs}
                  onSearchChange={setSearchQuery}
                  onSelectChat={handleSelectChat}
                  onSelectPeer={handleSelectUserOrChat}
                  isLoadingMoreDialogs={isLoadingMoreDialogs}
                  onLoadMoreDialogs={handleLoadMoreDialogs}
                  onOpenProxyModal={() => setIsProxyModalOpen(true)}
                />
              </div>
            ) : (
              /* Active Conversation Viewport with Back button to return to chat list */
              <main role="main" aria-label="Active conversation" className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative w-full">
                <ChatViewport
                  chat={currentChat}
                  messages={currentMessages}
                  ghostMode={ghostMode}
                  onBack={() => setActiveChatId(null)}
                  showChatId={config?.showChatId ?? true}
                  showMessageId={config?.showMessageId ?? true}
                  showSeconds={config?.showSeconds ?? true}
                  showSenderAvatar={config?.showSenderAvatar ?? true}
                  quickForwardToSaved={config?.quickForwardToSaved ?? true}
                  alwaysDeleteBoth={config?.alwaysDeleteBoth ?? true}
                  copyCallbackData={config?.copyCallbackData ?? true}
                  disableAnimations={config?.disableAnimations ?? false}
                  enableThanosDust={config?.enableThanosDust ?? true}
                  suppressLinkWarning={config?.suppressLinkWarning ?? false}
                  autoDownload={config?.autoDownload}
                  chatFontSize={config?.chatFontSize || 14}
                  bubbleRadius={config?.bubbleRadius ?? 16}
                  bubblePadding={config?.bubblePadding ?? 10}
                  onSendMessage={handleSendMessage}
                  onSendMedia={handleSendMedia}
                  onOpenDirectForward={(msg) => {
                    setForwardMessage(msg)
                    setForwardMessagesList(null)
                  }}
                  onOpenBatchDirectForward={(msgs) => {
                    setForwardMessagesList(msgs)
                    setForwardMessage(msgs[0] || null)
                  }}
                  onQuickForwardToSaved={handleQuickForwardToSaved}
                  onDeleteMessage={handleDeleteMessage}
                  onDeleteMessages={handleDeleteMessages}
                  onEditMessage={handleEditMessage}
                  onToggleGhostMode={handleToggleGhostMode}
                  onSelectUserOrChat={handleSelectUserOrChat}
                  onOpenUserProfile={handleOpenUserProfile}
                  initialScrollMsgId={initialScrollMsgId}
                  onClearInitialScroll={() => setInitialScrollMsgId(null)}
                  onMergeHistoricalMessages={handleMergeHistoricalMessages}
                  onUpdateUnreadCount={handleUpdateUnreadCount}
                  onOpenProxyModal={(url) => {
                    if (url) setProxyToImport(url)
                    setIsProxyModalOpen(true)
                  }}
                />
              </main>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex flex-1 min-h-0 overflow-hidden ${isResizingSidebar ? 'select-none' : ''}`}>
          {/* Vertical Multi-Account Dock */}
          <nav role="navigation" aria-label="Accounts and services">
            <AccountDock
              accounts={accounts}
              activeAccountId={activeAccountId}
              unreadCountsByAccount={unreadCountsByAccount}
              isUnifiedInboxOpen={isUnifiedInboxOpen}
              onSelectAccount={handleSelectAccount}
              onOpenAddAccount={() => setIsAddAccountOpen(true)}
              onToggleUnifiedInbox={() => setIsUnifiedInboxOpen(!isUnifiedInboxOpen)}
              onOpenProxyModal={() => setIsProxyModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenMcpHub={() => setIsMcpHubOpen(true)}
              onOpenSavedMessages={handleOpenSavedMessages}
              isSavedMessagesActive={isSavedMessagesActive}
              onOpenAccountExport={() => setIsAccountExportOpen(true)}
              onOpenTonWallet={() => setIsTonWalletOpen(true)}
            />
          </nav>

          {/* Active Account Workspace with Full-Width Folder Tabs Header */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Full-width Folder Tabs Header spanning across the entire window */}
            <ChatTabs
              accountId={currentAccount?.id}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadCounts={unreadCounts}
              markAllReadEnabled={config?.markAllReadEnabled ?? true}
              onMarkAllAsRead={handleMarkAllAsRead}
              onCloudFoldersLoaded={setCloudFolders}
              cloudFolders={cloudFolders}
              onOpenFolderManager={() => setIsFolderManagerOpen(true)}
            />

            {/* Split View: Chat List Sidebar & Active Conversation */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Resizable Chat List Column */}
              <aside
                role="complementary"
                aria-label="Conversations sidebar"
                style={{ width: `${sidebarWidth}px` }}
                className="shrink-0 flex flex-col h-full bg-dark-850 overflow-hidden"
              >
                <ChatList
                  account={currentAccount}
                  dialogs={currentDialogs}
                  activeChatId={activeChatId}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  showChatId={config?.showChatId ?? true}
                  ghostMode={ghostMode}
                  cloudFolders={cloudFolders}
                  isLoadingDialogs={isLoadingDialogs}
                  onSearchChange={setSearchQuery}
                  onSelectChat={handleSelectChat}
                  onSelectPeer={handleSelectUserOrChat}
                  isLoadingMoreDialogs={isLoadingMoreDialogs}
                  onLoadMoreDialogs={handleLoadMoreDialogs}
                  onOpenProxyModal={() => setIsProxyModalOpen(true)}
                />
              </aside>

              {/* Draggable Divider / Splitter between ChatList and ChatViewport */}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                tabIndex={0}
                onMouseDown={() => setIsResizingSidebar(true)}
                title="Drag to resize sidebar"
                className="w-1.5 hover:w-2 bg-white/5 hover:bg-primary-500/50 active:bg-primary-500 cursor-col-resize shrink-0 transition-all z-20 group relative flex items-center justify-center"
              >
                <div className="w-0.5 h-6 bg-white/20 group-hover:bg-white rounded-full transition-colors" />
              </div>

              {/* Active Conversation Viewport with 64Gram Fork Enhancements */}
              <main role="main" aria-label="Active conversation" className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
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
                  disableAnimations={config?.disableAnimations ?? false}
                  enableThanosDust={config?.enableThanosDust ?? true}
                  suppressLinkWarning={config?.suppressLinkWarning ?? false}
                  autoDownload={config?.autoDownload}
                  chatFontSize={config?.chatFontSize || 14}
                  bubbleRadius={config?.bubbleRadius ?? 16}
                  bubblePadding={config?.bubblePadding ?? 10}
                  onSendMessage={handleSendMessage}
                  onSendMedia={handleSendMedia}
                  onOpenDirectForward={(msg) => {
                    setForwardMessage(msg)
                    setForwardMessagesList(null)
                  }}
                  onOpenBatchDirectForward={(msgs) => {
                    setForwardMessagesList(msgs)
                    setForwardMessage(msgs[0] || null)
                  }}
                  onQuickForwardToSaved={handleQuickForwardToSaved}
                  onDeleteMessage={handleDeleteMessage}
                  onDeleteMessages={handleDeleteMessages}
                  onEditMessage={handleEditMessage}
                  onToggleGhostMode={handleToggleGhostMode}
                  onSelectUserOrChat={handleSelectUserOrChat}
                  onOpenUserProfile={handleOpenUserProfile}
                  initialScrollMsgId={initialScrollMsgId}
                  onClearInitialScroll={() => setInitialScrollMsgId(null)}
                  onMergeHistoricalMessages={handleMergeHistoricalMessages}
                  onUpdateUnreadCount={handleUpdateUnreadCount}
                  onOpenProxyModal={(url) => {
                    if (url) setProxyToImport(url)
                    setIsProxyModalOpen(true)
                  }}
                />
              </main>
            </div>
          </div>
        </div>
      )}

      {/* Main Telegram Desktop Drawer & Modals (Code-Split via Suspense) */}
      <React.Suspense fallback={null}>
        {isMainMenuOpen && (
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
              setSettingsInitialTab('general')
              setIsSettingsOpen(true)
            }}
            onOpenMcpHub={() => {
              setIsMainMenuOpen(false)
              setIsMcpHubOpen(true)
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
            onOpenContactChanges={() => {
              setIsMainMenuOpen(false)
              setIsContactChangesOpen(true)
            }}
            onOpenCalls={() => {
              setIsMainMenuOpen(false)
              setIsCallsOpen(true)
            }}
            onJoinedChat={handleJoinedChat}
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
            onOpenAccountExport={() => setIsAccountExportOpen(true)}
            onOpenTonWallet={() => setIsTonWalletOpen(true)}
          />
        )}

        {isMyProfileOpen && (
          <MyProfileDrawer
            isOpen={isMyProfileOpen}
            onClose={() => setIsMyProfileOpen(false)}
            account={currentAccount}
          />
        )}

        {isAccountExportOpen && (
          <AccountExportModal
            isOpen={isAccountExportOpen}
            onClose={() => setIsAccountExportOpen(false)}
            accounts={accounts}
          />
        )}

        {isTonWalletOpen && (
          <React.Suspense fallback={null}>
            <TonWalletModal
              isOpen={isTonWalletOpen}
              accountId={activeAccountId || accounts[0]?.id || 'default'}
              accountName={
                accounts.find((a) => a.id === activeAccountId)?.firstName ||
                accounts[0]?.firstName ||
                'My Account'
              }
              onClose={() => setIsTonWalletOpen(false)}
            />
          </React.Suspense>
        )}

        {isContactsOpen && (
          <ContactsModal
            isOpen={isContactsOpen}
            accountId={currentAccount?.id}
            onClose={() => setIsContactsOpen(false)}
            onSelectContact={(contactId) => {
              setIsContactsOpen(false)
              handleSelectUserOrChat(contactId)
            }}
          />
        )}

        {isCallsOpen && (
          <CallsModal
            isOpen={isCallsOpen}
            accountId={currentAccount?.id}
            onClose={() => setIsCallsOpen(false)}
            onSelectPeer={(peerId) => {
              setIsCallsOpen(false)
              handleSelectUserOrChat(peerId)
            }}
          />
        )}

        {createChatState.isOpen && (
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
        )}

        {isAddAccountOpen && (
          <AddAccountModal
            isOpen={isAddAccountOpen}
            onClose={() => setIsAddAccountOpen(false)}
            onAccountAdded={handleAccountAdded}
          />
        )}

        {(Boolean(forwardMessage) || (Boolean(forwardMessagesList) && forwardMessagesList!.length > 0)) && (
          <DirectForwardModal
            isOpen={!!forwardMessage || (!!forwardMessagesList && forwardMessagesList.length > 0)}
            message={forwardMessage || (forwardMessagesList ? forwardMessagesList[0] : null)}
            messages={forwardMessagesList || (forwardMessage ? [forwardMessage] : undefined)}
            dialogs={currentDialogs}
            onClose={() => {
              setForwardMessage(null)
              setForwardMessagesList(null)
            }}
            onForward={handleDirectForward}
          />
        )}

        {isProxyModalOpen && (
          <ProxySettingsModal
            isOpen={isProxyModalOpen}
            accounts={accounts}
            activeAccountId={activeAccountId}
            initialProxyToImport={proxyToImport}
            onClose={() => {
              setIsProxyModalOpen(false)
              setProxyToImport(undefined)
            }}
            onUpdateAccountProxy={handleUpdateAccountProxy}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            accounts={accounts}
            activeAccountId={activeAccountId || accounts[0]?.id || ''}
            initialTab={settingsInitialTab}
            onClose={() => setIsSettingsOpen(false)}
            onLogoutAccount={handleLogoutAccount}
            onConfigUpdated={(newCfg) => setConfig(newCfg)}
            onUpdateFound={(info) => setUpdateInfo(info)}
            onOpenSupport={() => setIsSupportModalOpen(true)}
            onOpenContactChanges={() => {
              setIsSettingsOpen(false)
              setIsContactChangesOpen(true)
            }}
            onOpenProxy={() => {
              setIsSettingsOpen(false)
              setIsProxyModalOpen(true)
            }}
          />
        )}

        {isContactChangesOpen && (
          <ContactChangesModal
            isOpen={isContactChangesOpen}
            accountId={currentAccount?.id || ''}
            onClose={() => setIsContactChangesOpen(false)}
            onOpenChat={(chatId, initialMeta) => {
              setIsContactChangesOpen(false)
              handleSelectUserOrChat(chatId, undefined, initialMeta)
            }}
            onOpenUserProfile={(peerId, initialDetails) => {
              setIsContactChangesOpen(false)
              handleOpenUserProfile(peerId, initialDetails)
            }}
          />
        )}

        {viewingUserProfile && (
          <UserProfileDrawer
            isOpen={Boolean(viewingUserProfile)}
            accountId={activeAccountId || accounts[0]?.id || ''}
            peerId={viewingUserProfile.peerId}
            initialDetails={viewingUserProfile.initialDetails}
            currentChatId={activeChatId}
            onClose={() => setViewingUserProfile(null)}
            onSelectUserOrChat={(target, targetMsgId) => {
              setViewingUserProfile(null)
              handleSelectUserOrChat(target, targetMsgId, viewingUserProfile.initialDetails)
            }}
            onSearchFromUser={(peerId) => {
              setViewingUserProfile(null)
              handleSelectUserOrChat(peerId, undefined, viewingUserProfile.initialDetails)
            }}
            onMentionUser={() => {
              setViewingUserProfile(null)
            }}
            onShowToast={(msg) => setAppToast(msg)}
          />
        )}

        {isMcpHubOpen && (
          <McpHubModal
            isOpen={isMcpHubOpen}
            onClose={() => setIsMcpHubOpen(false)}
            onOpenSettings={(tab) => {
              setIsMcpHubOpen(false)
              setSettingsInitialTab(tab || 'mcp')
              setIsSettingsOpen(true)
            }}
          />
        )}

        {isSupportModalOpen && (
          <SupportModal
            isOpen={isSupportModalOpen}
            onClose={() => setIsSupportModalOpen(false)}
          />
        )}

        {isCloseConfirmOpen && (
          <CloseConfirmModal
            isOpen={isCloseConfirmOpen}
            onClose={() => setIsCloseConfirmOpen(false)}
            onConfirm={handleConfirmClose}
          />
        )}

        {Boolean(whatsNewVersion) && (
          <WhatsNewModal
            isOpen={!!whatsNewVersion}
            version={whatsNewVersion || '1.8.0'}
            onClose={() => setWhatsNewVersion(null)}
          />
        )}

        {isShortcutsModalOpen && (
          <KeyboardShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
          />
        )}

        {isFolderManagerOpen && (
          <FolderManagerModal
            isOpen={isFolderManagerOpen}
            accountId={currentAccount?.id}
            folders={cloudFolders}
            onClose={() => setIsFolderManagerOpen(false)}
            onFoldersUpdated={(updated) => setCloudFolders(updated)}
          />
        )}
      </React.Suspense>

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

      {/* Notification History Drawer */}
      <NotificationHistoryDrawer
        isOpen={isNotificationHistoryOpen}
        onClose={() => setIsNotificationHistoryOpen(false)}
        history={notificationHistory}
        onSelectNotification={handleSelectFromHistory}
        onMarkAllAsRead={handleMarkAllHistoryRead}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
        onMarkItemAsRead={handleMarkHistoryItemRead}
      />

      {/* In-App Notification HUD (Fallback for Mobile/Web where dedicated desktop corner window is unavailable) */}
      {!window.guidegram?.syncDesktopNotifications && (
        <NotificationHUD
          notifications={activeNotifications}
          onDismiss={handleDismissNotification}
          onSelectChat={handleSelectFromNotification}
          onQuickReply={handleQuickReplyFromNotification}
          onMarkAsRead={handleMarkAsReadFromNotification}
          onMuteChat={handleMuteChatFromNotification}
          position={config?.notificationPosition || 'bottom-right'}
          privacyMode={config?.notificationPrivacyMode || 'full'}
          quickReplyEnabled={config?.notificationQuickReply !== false}
          vibrateEnabled={config?.notificationVibrate !== false}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
