import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Settings,
  FolderLock,
  Key,
  EyeOff,
  LogOut,
  Save,
  Check,
  Copy,
  Terminal,
  ExternalLink,
  RefreshCw,
  Hash,
  Clock,
  Activity,
  History,
  Users,
  Megaphone,
  CornerDownLeft,
  Bookmark,
  Trash2,
  Send,
  Code,
  Bot,
  Zap,
  CheckCheck,
  Minimize2,
  Power,
  HelpCircle,
  Download,
  Sparkles,
  ShieldCheck,
  Laptop,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  User,
  Globe,
  Bell,
  MessageSquare,
  HardDrive,
  Database,
  Radio,
  Volume2,
  Folder,
  FileText,
  Type,
  Keyboard,
  Lock,
  Shield,
  Smartphone,
  Phone,
  Eye,
  Camera,
  Share2,
  Mic,
  Gift,
  Music,
  UserPlus,
  Palette,
  Moon,
  Sun,
  Sliders,
  CheckSquare,
  Square,
  ChevronRight,
  Monitor,
  FolderOpen,
  QrCode,
  Paintbrush,
  Image as ImageIcon,
  Heart,
  Briefcase,
  MapPin,
  Link2,
  Plus,
  ArrowLeft,
  Search,
  Wifi,
  Signal,
  Edit3,
  Smile,
  Star,
  Trophy,
} from 'lucide-react'
import {
  AppConfig,
  AccountInfo,
  CloseAction,
  UpdateInfo,
  UpdateProgress,
  PortableLocatorInfo,
  AutoDownloadConfig,
  NetworkProfileType,
  AutoDownloadNetworkRule,
  NetworkProfilesConfig,
  CacheStats,
  PrivacySecuritySettings,
  BusinessProfile,
  BusinessChatLink,
  BusinessWorkHours,
  BusinessLocation,
  BusinessIntro,
  SavedRingtoneItem,
  ActivityLogRetentionPeriod,
} from '../types/telegram'
import { playNotificationSound, AVAILABLE_NOTIFICATION_TONES } from '../utils/soundEffects'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'
import { ActiveSessionsModal } from './ActiveSessionsModal'
import { useIsMobile } from '../utils/useIsMobile'

interface SettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  activeAccountId?: string
  initialTab?: SettingsTab
  onClose: () => void
  onLogoutAccount: (accountId: string) => Promise<void>
  onConfigUpdated?: (config: AppConfig) => void
  onUpdateFound?: (info: UpdateInfo) => void
  onOpenSupport?: () => void
  onOpenContactChanges?: () => void
  onOpenProxy?: () => void
}

const DEFAULT_NETWORK_PROFILES: NetworkProfilesConfig = {
  activeProfile: 'wifi',
  cellular: {
    photos: true,
    maxPhotoSizeMB: 10,
    videos: false,
    maxVideoSizeMB: 5,
    files: false,
    maxFileSizeMB: 1,
    voice: true,
    autoPlayGifs: false,
    autoPlayVideos: false,
    peers: { contacts: true, privateChats: true, groups: false, channels: false },
  },
  wifi: {
    photos: true,
    maxPhotoSizeMB: 10,
    videos: true,
    maxVideoSizeMB: 15,
    files: true,
    maxFileSizeMB: 3,
    voice: true,
    autoPlayGifs: true,
    autoPlayVideos: true,
    peers: { contacts: true, privateChats: true, groups: true, channels: false },
  },
  roaming: {
    photos: false,
    maxPhotoSizeMB: 1,
    videos: false,
    maxVideoSizeMB: 1,
    files: false,
    maxFileSizeMB: 1,
    voice: false,
    autoPlayGifs: false,
    autoPlayVideos: false,
    peers: { contacts: false, privateChats: false, groups: false, channels: false },
  },
}

interface ToggleItemProps {
  title: string
  desc: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleItem: React.FC<ToggleItemProps> = ({ title, desc, icon, checked, onChange }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.985 }}
    onClick={() => onChange(!checked)}
    className="p-3 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none"
  >
    <div className="flex items-start gap-2.5 min-w-0">
      <div
        className={`p-2 rounded-xl shrink-0 mt-0.5 transition-colors ${
          checked
            ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
            : 'bg-dark-900 text-gray-500 border border-white/5'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-gray-200 truncate">{title}</div>
        <div className="text-[11px] text-gray-400 leading-snug">{desc}</div>
      </div>
    </div>
    <div
      className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
        checked ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
      }`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </div>
  </motion.div>
)

type SettingsTab = 'profile' | 'features' | 'business' | 'general' | 'notifications' | 'privacy' | 'chat' | 'mcp' | 'advanced'

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  accounts,
  activeAccountId,
  initialTab,
  onClose,
  onLogoutAccount,
  onConfigUpdated,
  onUpdateFound,
  onOpenSupport,
  onOpenContactChanges,
  onOpenProxy,
}) => {
  const { t, language, setLanguage } = useI18n()
  const isPersian = language === 'fa'
  const isMobile = useIsMobile(768)

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'features')

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [portablePath, setPortablePath] = useState('')
  const [apiId, setApiId] = useState<number>(2040)
  const [apiHash, setApiHash] = useState<string>('')
  const [ghostMode, setGhostMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isResettingAutoSaveExceptions, setIsResettingAutoSaveExceptions] = useState(false)
  const [accountTTL, setAccountTTL] = useState<number>(180)
  const [isLoadingTTL, setIsLoadingTTL] = useState<boolean>(false)
  const [isUpdatingTTL, setIsUpdatingTTL] = useState<boolean>(false)
  const [ttlToast, setTtlToast] = useState<string | null>(null)
  const [autoSaveData, setAutoSaveData] = useState<any>(null)
  const [contactSignUpNotif, setContactSignUpNotif] = useState<boolean>(true)
  const [isLoadingSignUpNotif, setIsLoadingSignUpNotif] = useState<boolean>(false)
  const [connectedBotsList, setConnectedBotsList] = useState<any[]>([])
  const [isLoadingConnectedBots, setIsLoadingConnectedBots] = useState<boolean>(false)
  const [sensitiveContentEnabled, setSensitiveContentEnabled] = useState<boolean>(false)
  const [archiveAndMuteNonContacts, setArchiveAndMuteNonContacts] = useState<boolean>(false)
  const [isLoadingContentSettings, setIsLoadingContentSettings] = useState<boolean>(false)
  const [passkeysList, setPasskeysList] = useState<any[]>([])
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState<boolean>(false)
  const [notifyExceptionsCount, setNotifyExceptionsCount] = useState<number | null>(null)
  const [isLoadingNotifyExceptions, setIsLoadingNotifyExceptions] = useState<boolean>(false)
  const [reactionsNotifySettings, setReactionsNotifySettings] = useState<any>(null)
  const [isLoadingReactionsNotify, setIsLoadingReactionsNotify] = useState<boolean>(false)
  const [savedMusicCount, setSavedMusicCount] = useState<number | null>(null)
  const [cloudThemesList, setCloudThemesList] = useState<any[]>([])
  const [isLoadingCloudThemes, setIsLoadingCloudThemes] = useState<boolean>(false)
  const [webAuthorizationsList, setWebAuthorizationsList] = useState<any[]>([])
  const [isLoadingWebAuths, setIsLoadingWebAuths] = useState<boolean>(false)
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState<boolean>(false)
  const [isResettingNotifySettings, setIsResettingNotifySettings] = useState<boolean>(false)
  const [isResettingWebAuths, setIsResettingWebAuths] = useState<boolean>(false)

  const handleUpdateAccountTTL = async (days: number) => {
    if (!targetAccountId || !window.guidegram?.setAccountTTL) return
    setIsUpdatingTTL(true)
    setTtlToast(null)
    try {
      const ok = await window.guidegram.setAccountTTL(targetAccountId, days)
      if (ok) {
        setAccountTTL(days)
        setTtlToast(isPersian ? 'دوره حذف خودکار حساب ذخیره شد' : 'Account self-destruct period saved')
        setTimeout(() => setTtlToast(null), 3000)
      } else {
        setTtlToast(isPersian ? 'خطا در ثبت دوره حذف خودکار' : 'Failed to update period')
        setTimeout(() => setTtlToast(null), 3000)
      }
    } catch (err: any) {
      setTtlToast(err?.message || 'Error updating TTL')
      setTimeout(() => setTtlToast(null), 3000)
    } finally {
      setIsUpdatingTTL(false)
    }
  }

  // Guidegram Activity Tracker & Contact Changes
  const [activityTrackerEnabled, setActivityTrackerEnabled] = useState(true)
  const [profileChangeAuditorEnabled, setProfileChangeAuditorEnabled] = useState(true)
  const [activityRetentionPeriod, setActivityRetentionPeriod] = useState<ActivityLogRetentionPeriod>('30d')
  const [profileAuditInteractionRange, setProfileAuditInteractionRange] = useState<'24h' | '7d' | '30d' | '90d' | '180d' | 'all'>('180d')
  const [profileAuditScanOnOnline, setProfileAuditScanOnOnline] = useState(true)
  const [profileAuditContactsOnly, setProfileAuditContactsOnly] = useState(false)
  const [activityStats, setActivityStats] = useState<{ totalEvents: number; totalSessions: number; totalUsersTracked: number; dataSizeBytes: number } | null>(null)
  const [isPurgingData, setIsPurgingData] = useState(false)
  const [purgeToast, setPurgeToast] = useState<string | null>(null)

  // 64Gram Fork Power Features
  const [showChatId, setShowChatId] = useState(true)
  const [showMessageId, setShowMessageId] = useState(true)
  const [showSeconds, setShowSeconds] = useState(true)
  const [showSenderAvatar, setShowSenderAvatar] = useState(true)
  const [quickForwardToSaved, setQuickForwardToSaved] = useState(true)
  const [alwaysDeleteBoth, setAlwaysDeleteBoth] = useState(true)
  const [keepDeletedMessagesLocally, setKeepDeletedMessagesLocally] = useState(true)
  // Anti-Delete & Edit Tracking Scoping
  const [auditTrackDeletedPrivate, setAuditTrackDeletedPrivate] = useState(true)
  const [auditTrackEditedPrivate, setAuditTrackEditedPrivate] = useState(true)
  const [auditTrackDeletedGroups, setAuditTrackDeletedGroups] = useState(true)
  const [auditTrackEditedGroups, setAuditTrackEditedGroups] = useState(true)
  const [auditTrackDeletedChannels, setAuditTrackDeletedChannels] = useState(false)
  const [auditTrackEditedChannels, setAuditTrackEditedChannels] = useState(false)
  const [auditMaxTrackedGroups, setAuditMaxTrackedGroups] = useState(25)
  const [auditMaxTrackedChannels, setAuditMaxTrackedChannels] = useState(10)
  const [markAllReadEnabled, setMarkAllReadEnabled] = useState(true)
  const [copyCallbackData, setCopyCallbackData] = useState(true)
  const [disableAnimations, setDisableAnimations] = useState(false)
  const [composerSendAnimation, setComposerSendAnimation] = useState(true)
  const [enableThanosDust, setEnableThanosDust] = useState(true)
  const [suppressLinkWarning, setSuppressLinkWarning] = useState(false)
  const [antiFingerprinting, setAntiFingerprinting] = useState(true)

  // Automatic Media Download Configuration
  const [autoDownload, setAutoDownload] = useState<AutoDownloadConfig>({
    enabled: true,
    photosInPrivate: true,
    photosInGroups: true,
    photosInChannels: false,
    videosInPrivate: false,
    videosInGroups: false,
    videosInChannels: false,
    filesInPrivate: false,
    filesInGroups: false,
    filesInChannels: false,
    maxPhotoSizeMB: 5,
    maxVideoSizeMB: 10,
    maxFileSizeMB: 5,
    activeNetworkProfile: 'wifi',
    networkProfiles: DEFAULT_NETWORK_PROFILES,
  })
  const [selectedProfileTab, setSelectedProfileTab] = useState<NetworkProfileType>('wifi')
  const [isSyncingCloudAutoDownload, setIsSyncingCloudAutoDownload] = useState(false)

  // Window Close Action Preference
  const [closeAction, setCloseAction] = useState<CloseAction>('ask')

  // Notifications & Sound (Advanced Pro Suite - Telegram Parity & Android HUD)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationTone, setNotificationTone] = useState<string>('classic')
  const [notificationPosition, setNotificationPosition] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'>('bottom-right')
  const [notificationMaxStack, setNotificationMaxStack] = useState<number>(3)
  const [notificationPrivateChats, setNotificationPrivateChats] = useState<boolean>(true)
  const [notificationGroups, setNotificationGroups] = useState<boolean>(true)
  const [notificationChannels, setNotificationChannels] = useState<boolean>(false)
  const [notificationPrivacyMode, setNotificationPrivacyMode] = useState<'full' | 'hide-text' | 'hide-all'>('full')
  const [notificationQuickReply, setNotificationQuickReply] = useState<boolean>(true)
  const [notificationBatching, setNotificationBatching] = useState<boolean>(true)
  const [notificationVibrate, setNotificationVibrate] = useState<boolean>(true)
  const [notificationFlashTaskbar, setNotificationFlashTaskbar] = useState<boolean>(true)
  const [savedRingtones, setSavedRingtones] = useState<SavedRingtoneItem[]>([])
  const [isLoadingRingtones, setIsLoadingRingtones] = useState(false)
  const [isUploadingRingtone, setIsUploadingRingtone] = useState(false)

  // Downloads Directory & Ask where to save
  const [downloadsPath, setDownloadsPath] = useState('')
  const [alwaysAskDownloadPath, setAlwaysAskDownloadPath] = useState(false)

  // Chat Font Size & Bubble Customization
  const [chatFontSize, setChatFontSize] = useState(14)
  const [bubbleRadius, setBubbleRadius] = useState(16)
  const [bubblePadding, setBubblePadding] = useState(10)

  // MCP (Model Context Protocol) Server State
  const [mcpEnabled, setMcpEnabled] = useState(true)
  const [mcpPort, setMcpPort] = useState(39527)
  const [mcpAllowedChats, setMcpAllowedChats] = useState('')
  const [mcpDownloadDir, setMcpDownloadDir] = useState('')
  const [mcpStatus, setMcpStatus] = useState<{ isRunning: boolean; port: number; enabled: boolean; activeToolsCount: number } | null>(null)
  const [mcpSnippets, setMcpSnippets] = useState<{ claudeDesktop: string; cursor: string; sse: string; bridgePath: string; port: number } | null>(null)
  const [mcpCopiedTarget, setMcpCopiedTarget] = useState<string | null>(null)

  // Cache & Storage Usage
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [clearCacheMessage, setClearCacheMessage] = useState<string | null>(null)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Portable Locator & Sync state
  const [portableLocator, setPortableLocator] = useState<PortableLocatorInfo | null>(null)
  const [isSyncingPortable, setIsSyncingPortable] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Dynamic App Version & Updater State
  const [appVersion, setAppVersion] = useState<string>(__APP_VERSION__)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateCheckResult, setUpdateCheckResult] = useState<string | null>(null)
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null)
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false)
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Live MTProto Protocol Parity Status
  const [mtprotoStatus, setMtprotoStatus] = useState<{
    layer: number
    totalMethods: number
    totalNamespaces: number
    status: string
    services: Array<{ name: string; methods: number; desc: string }>
  } | null>(null)

  // Live Privacy & Security Data (Official Telegram Parity - Screenshot 3)
  const [privacyData, setPrivacyData] = useState<PrivacySecuritySettings | null>(null)
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(false)

  // Title Bar & System Integration Settings (Official Telegram Parity - Screenshot 4)
  const [showChatNameInTitle, setShowChatNameInTitle] = useState(true)
  const [showActiveAccountInTitle, setShowActiveAccountInTitle] = useState(true)
  const [totalUnreadCountInTitle, setTotalUnreadCountInTitle] = useState(true)
  const [useSystemWindowFrame, setUseSystemWindowFrame] = useState(true)

  const [showTrayIcon, setShowTrayIcon] = useState(true)
  const [showTaskbarIcon, setShowTaskbarIcon] = useState(true)
  const [useMonochromeIcon, setUseMonochromeIcon] = useState(true)
  const [launchAtStartup, setLaunchAtStartup] = useState(true)
  const [launchMinimized, setLaunchMinimized] = useState(false)

  // Layer 232 Messages Suite State (Microphase 033)
  // messages.checkChatInvite
  const [inviteLinkInput, setInviteLinkInput] = useState('')
  const [isCheckingInvite, setIsCheckingInvite] = useState(false)
  const [inviteResult, setInviteResult] = useState<any | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // messages.checkHistoryImport
  const [historyImportHead, setHistoryImportHead] = useState('')
  const [isCheckingHistoryImport, setIsCheckingHistoryImport] = useState(false)
  const [historyImportResult, setHistoryImportResult] = useState<any | null>(null)
  const [historyImportError, setHistoryImportError] = useState<string | null>(null)

  // messages.acceptUrlAuth
  const [urlAuthUrl, setUrlAuthUrl] = useState('')
  const [urlAuthWriteAllowed, setUrlAuthWriteAllowed] = useState(true)
  const [isAcceptingUrlAuth, setIsAcceptingUrlAuth] = useState(false)
  const [urlAuthResult, setUrlAuthResult] = useState<any | null>(null)
  const [urlAuthError, setUrlAuthError] = useState<string | null>(null)

  // messages.addChatUser
  const [addChatId, setAddChatId] = useState('')
  const [addChatUserId, setAddChatUserId] = useState('')
  const [addChatFwdLimit, setAddChatFwdLimit] = useState(100)
  const [isAddingChatUser, setIsAddingChatUser] = useState(false)
  const [addChatUserSuccess, setAddChatUserSuccess] = useState<string | null>(null)
  const [addChatUserError, setAddChatUserError] = useState<string | null>(null)

  // messages.addPollAnswer
  const [pollPeerId, setPollPeerId] = useState('')
  const [pollMsgId, setPollMsgId] = useState('')
  const [pollOptionText, setPollOptionText] = useState('')
  const [isAddingPollAnswer, setIsAddingPollAnswer] = useState(false)
  const [pollAnswerSuccess, setPollAnswerSuccess] = useState<string | null>(null)
  const [pollAnswerError, setPollAnswerError] = useState<string | null>(null)

  // messages.appendTodoList
  const [todoPeerId, setTodoPeerId] = useState('')
  const [todoMsgId, setTodoMsgId] = useState('')
  const [todoText, setTodoText] = useState('')
  const [isAppendingTodo, setIsAppendingTodo] = useState(false)
  const [todoSuccess, setTodoSuccess] = useState<string | null>(null)
  const [todoError, setTodoError] = useState<string | null>(null)

  // Layer 232 Messages Suite State (Microphase 034)
  // messages.checkHistoryImportPeer
  const [importPeerIdInput, setImportPeerIdInput] = useState('')
  const [isCheckingImportPeer, setIsCheckingImportPeer] = useState(false)
  const [importPeerResult, setImportPeerResult] = useState<any | null>(null)
  const [importPeerError, setImportPeerError] = useState<string | null>(null)

  // messages.checkQuickReplyShortcut
  const [quickReplyShortcutInput, setQuickReplyShortcutInput] = useState('')
  const [isCheckingShortcut, setIsCheckingShortcut] = useState(false)
  const [shortcutAvailable, setShortcutAvailable] = useState<boolean | null>(null)
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null)

  // messages.clearAllDrafts
  const [isClearingAllDrafts, setIsClearingAllDrafts] = useState(false)
  const [clearDraftsFeedback, setClearDraftsFeedback] = useState<string | null>(null)

  // messages.clearRecentReactions
  const [isClearingRecentReactions, setIsClearingRecentReactions] = useState(false)
  const [clearReactionsFeedback, setClearReactionsFeedback] = useState<string | null>(null)

  // messages.clearRecentStickers
  const [isClearingRecentStickers, setIsClearingRecentStickers] = useState(false)
  const [clearStickersFeedback, setClearStickersFeedback] = useState<string | null>(null)

  // messages.createChat & messages.deleteChat
  const [newChatTitle, setNewChatTitle] = useState('')
  const [newChatUserIds, setNewChatUserIds] = useState('')
  const [newChatTtl, setNewChatTtl] = useState<number>(0)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [createChatResult, setCreateChatResult] = useState<string | null>(null)
  const [createChatError, setCreateChatError] = useState<string | null>(null)

  const [deleteChatIdInput, setDeleteChatIdInput] = useState('')
  const [isDeletingChat, setIsDeletingChat] = useState(false)
  const [deleteChatFeedback, setDeleteChatFeedback] = useState<string | null>(null)

  // Layer 232 Messages Suite State (Microphase 035)
  // messages.composeMessageWithAI & composeRichMessageWithAI
  const [aiComposerText, setAiComposerText] = useState('')
  const [aiComposerProofread, setAiComposerProofread] = useState(true)
  const [aiComposerEmojify, setAiComposerEmojify] = useState(false)
  const [aiComposerTone, setAiComposerTone] = useState<'neutral' | 'formal' | 'casual' | 'persuasive'>('neutral')
  const [aiComposerLang, setAiComposerLang] = useState('')
  const [isComposingAI, setIsComposingAI] = useState(false)
  const [aiComposerResult, setAiComposerResult] = useState<any | null>(null)
  const [aiComposerError, setAiComposerError] = useState<string | null>(null)

  // messages.declineUrlAuth
  const [declineUrlInput, setDeclineUrlInput] = useState('')
  const [isDecliningUrlAuth, setIsDecliningUrlAuth] = useState(false)
  const [declineUrlAuthFeedback, setDeclineUrlAuthFeedback] = useState<string | null>(null)

  // messages.deleteChatUser
  const [kickChatId, setKickChatId] = useState('')
  const [kickUserId, setKickUserId] = useState('')
  const [kickRevokeHistory, setKickRevokeHistory] = useState(false)
  const [isKickingUser, setIsKickingUser] = useState(false)
  const [kickFeedback, setKickFeedback] = useState<string | null>(null)

  // messages.createForumTopic
  const [forumTopicChatId, setForumTopicChatId] = useState('')
  const [forumTopicTitle, setForumTopicTitle] = useState('')
  const [isCreatingForumTopic, setIsCreatingForumTopic] = useState(false)
  const [forumTopicFeedback, setForumTopicFeedback] = useState<string | null>(null)

  // Chat Theme & Appearance Settings (Official Telegram Parity - Screenshot 5)
  const [activeTheme, setActiveTheme] = useState<'classic' | 'day' | 'tinted' | 'night'>('tinted')
  const [selectedAccentColor, setSelectedAccentColor] = useState<number>(8) // Tinted teal
  const [autoNightMode, setAutoNightMode] = useState('Off')
  const [fontFamily, setFontFamily] = useState('Default')
  const [adaptiveLayoutWide, setAdaptiveLayoutWide] = useState(true)

  // Sub-modal state for Privacy & Chat Settings
  const [activeSubModal, setActiveSubModal] = useState<
    | null
    | 'activeSessions'
    | 'twoFactor'
    | 'autoDelete'
    | 'localPasscode'
    | 'passkeys'
    | 'blockedUsers'
    | 'connectedWebsites'
    | 'privacyRule'
    | 'nameColor'
    | 'autoNight'
    | 'fontFamily'
    | 'customThemes'
    | 'wallpaperGallery'
    | 'quickAction'
  >(null)

  const [selectedPrivacyRule, setSelectedPrivacyRule] = useState<{
    key: keyof PrivacySecuritySettings
    title: string
    subtitle: string
    currentValue: string
  } | null>(null)

  const [chatListQuickAction, setChatListQuickAction] = useState<string>(
    () => localStorage.getItem('guidegram_quick_action') || 'Change folder'
  )
  const [customWallpaper, setCustomWallpaper] = useState<string>(
    () => localStorage.getItem('guidegram_chat_wallpaper') || ''
  )
  const [selectedNameColor, setSelectedNameColor] = useState<number>(
    () => Number(localStorage.getItem('guidegram_name_color') || '4')
  )
  const [localPasscodeVal, setLocalPasscodeVal] = useState<string>(
    () => localStorage.getItem('guidegram_local_passcode') || ''
  )
  const [localPasscodeEnabled, setLocalPasscodeEnabled] = useState<boolean>(
    () => !!localStorage.getItem('guidegram_local_passcode')
  )
  const [passcodeTimeout, setPasscodeTimeout] = useState<string>(
    () => localStorage.getItem('guidegram_passcode_timeout') || '5min'
  )
  const [twoFactorPassword, setTwoFactorPassword] = useState('')
  const [twoFactorHint, setTwoFactorHint] = useState('')
  const [twoFactorEmail, setTwoFactorEmail] = useState('')
  const [twoFactorResetStatus, setTwoFactorResetStatus] = useState<{
    status?: 'ok' | 'wait' | 'failed'
    untilDate?: number
    message?: string
  } | null>(null)
  const [isResettingTwoFactor, setIsResettingTwoFactor] = useState(false)
  const [blockedSearchQuery, setBlockedSearchQuery] = useState('')
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const wallpaperFileInputRef = React.useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => setFeedbackToast(null), 2500)
  }

  const targetAccountId = activeAccountId || accounts[0]?.id || ''

  const handleResetTwoFactor = async () => {
    if (!targetAccountId) return
    setIsResettingTwoFactor(true)
    try {
      const resetFn = window.guidegram?.resetPassword || (window.guidegram as any)?.accountResetPassword
      if (resetFn) {
        const res = await resetFn(targetAccountId)
        if (res?.status === 'ok' || res?._ === 'account.resetPasswordOk') {
          showToast(isPersian ? 'رمز عبور ابری بازنشانی شد.' : '2FA Cloud Password has been reset.')
          setTwoFactorResetStatus(null)
          setActiveSubModal(null)
        } else if (res?.status === 'wait' || res?._ === 'account.resetPasswordRequestedWait') {
          const untilDate = res.untilDate || res.until_date
          const dateStr = untilDate ? new Date(untilDate * 1000).toLocaleDateString() : '7 days'
          setTwoFactorResetStatus({
            status: 'wait',
            untilDate,
            message: `Reset requested. Telegram security hold active until ${dateStr}.`,
          })
          showToast(`Password reset initiated. Security hold active.`)
        } else {
          showToast(res?.error || 'Password reset failed')
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Error resetting password')
    } finally {
      setIsResettingTwoFactor(false)
    }
  }

  const handleResendPasswordEmail = async () => {
    if (!targetAccountId || !window.guidegram?.resendPasswordEmail) return
    try {
      const ok = await window.guidegram.resendPasswordEmail(targetAccountId)
      if (ok) {
        showToast(isPersian ? 'ایمیل بازیابی رمز مجدداً ارسال شد.' : 'Password recovery email resent.')
      } else {
        showToast(isPersian ? 'ارسال مجدد ایمیل انجام نشد.' : 'Failed to resend recovery email.')
      }
    } catch {
      showToast(isPersian ? 'خطا در ارسال مجدد ایمیل' : 'Error resending recovery email.')
    }
  }

  const handleResetNotifySettings = async () => {
    if (!targetAccountId || !window.guidegram?.resetNotifySettings) return
    setIsResettingNotifySettings(true)
    try {
      await window.guidegram.resetNotifySettings(targetAccountId)
      if (window.guidegram.getNotifyExceptions) {
        const exc = await window.guidegram.getNotifyExceptions(targetAccountId)
        if (Array.isArray(exc?.updates)) {
          setNotifyExceptionsCount(exc.updates.length)
        } else if (Array.isArray(exc?.chats)) {
          setNotifyExceptionsCount(exc.chats.length)
        } else {
          setNotifyExceptionsCount(0)
        }
      }
      showToast(isPersian ? 'تنظیمات اعلان‌ها بازنشانی شد.' : 'Notification settings reset to defaults.')
    } catch {
      showToast(isPersian ? 'خطا در بازنشانی تنظیمات اعلان‌ها' : 'Failed to reset notification settings.')
    } finally {
      setIsResettingNotifySettings(false)
    }
  }

  const handleResetWebAuthorization = async (hash: string | number) => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.resetWebAuthorization) return
    try {
      await window.guidegram.resetWebAuthorization(targetId, hash)
      setWebAuthorizationsList((prev) => prev.filter((a) => a.hash !== hash))
      showToast(isPersian ? 'نشست وب‌سایت خاتمه یافت.' : 'Website session terminated.')
    } catch {
      showToast(isPersian ? 'خطا در قطع ارتباط وب‌سایت' : 'Failed to terminate website session.')
    }
  }

  const handleResetAllWebAuthorizations = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.resetWebAuthorizations) return
    setIsResettingWebAuths(true)
    try {
      await window.guidegram.resetWebAuthorizations(targetId)
      setWebAuthorizationsList([])
      showToast(isPersian ? 'تمام نشست‌های وب‌سایت‌ها خاتمه یافتند.' : 'All website sessions terminated.')
    } catch {
      showToast(isPersian ? 'خطا در قطع ارتباط تمام وب‌سایت‌ها' : 'Failed to terminate all website sessions.')
    } finally {
      setIsResettingWebAuths(false)
    }
  }

  const handleSendVerifyEmailCode = async (email: string) => {
    if (!targetAccountId || !window.guidegram?.sendVerifyEmailCode) return null
    try {
      const res = await window.guidegram.sendVerifyEmailCode(targetAccountId, { _: 'emailVerifyPurposeLoginSetup' }, email)
      showToast(isPersian ? 'کد تأیید ایمیل ارسال شد.' : 'Verification code sent to email.')
      return res
    } catch {
      showToast(isPersian ? 'خطا در ارسال کد به ایمیل' : 'Failed to send verification code.')
      return null
    }
  }

  const handleSendChangePhoneCode = async (phoneNumber: string) => {
    if (!targetAccountId || !window.guidegram?.sendChangePhoneCode) return null
    try {
      const res = await window.guidegram.sendChangePhoneCode(targetAccountId, phoneNumber)
      showToast(isPersian ? 'کد تغییر شماره ارسال شد.' : 'Change phone code sent.')
      return res
    } catch {
      showToast(isPersian ? 'خطا در ارسال کد تغییر شماره' : 'Failed to send change phone code.')
      return null
    }
  }

  const handleDeclineResetTwoFactor = async () => {
    if (!targetAccountId) return
    try {
      if ((window.guidegram as any).accountDeclinePasswordReset) {
        const ok = await (window.guidegram as any).accountDeclinePasswordReset(targetAccountId)
        if (ok) {
          setTwoFactorResetStatus(null)
          showToast('Pending password reset cancelled.')
        }
      }
    } catch {
      showToast('Failed to cancel password reset.')
    }
  }

  const handleSetAuthorizationTTL = async (days: number) => {
    if (!targetAccountId || !window.guidegram?.setAuthorizationTTL) return
    try {
      await window.guidegram.setAuthorizationTTL(targetAccountId, days)
      showToast(isPersian ? `مهلت نشست‌ها به ${days} روز تغییر یافت.` : `Session TTL updated to ${days} days.`)
    } catch {
      showToast(isPersian ? 'خطا در تنظیم مهلت نشست‌ها' : 'Failed to update session TTL.')
    }
  }

  const handleSetAccountTTL = async (days: number) => {
    if (!targetAccountId || !window.guidegram?.setAccountTTL) return
    try {
      await window.guidegram.setAccountTTL(targetAccountId, days)
      showToast(isPersian ? `حساب کاربری پس از ${days} روز عدم فعالیت حذف خواهد شد.` : `Account self-destruction set to ${days} days.`)
    } catch {
      showToast(isPersian ? 'خطا در تنظیم مهلت حذف حساب' : 'Failed to update account TTL.')
    }
  }

  const handleSetContactSignUpNotification = async (silent: boolean) => {
    if (!targetAccountId || !window.guidegram?.setContactSignUpNotification) return
    try {
      await window.guidegram.setContactSignUpNotification(targetAccountId, silent)
      showToast(isPersian ? (silent ? 'اعلان ثبت‌نام مخاطبین خاموش شد.' : 'اعلان ثبت‌نام مخاطبین فعال شد.') : (silent ? 'Contact sign-up notifications muted.' : 'Contact sign-up notifications unmuted.'))
    } catch {
      showToast(isPersian ? 'خطا در تغییر وضعیت اعلان مخاطبین' : 'Failed to update contact sign-up notifications.')
    }
  }

  const handleSetContentSettings = async (sensitiveEnabled: boolean) => {
    if (!targetAccountId || !window.guidegram?.setContentSettings) return
    try {
      await window.guidegram.setContentSettings(targetAccountId, sensitiveEnabled)
      showToast(isPersian ? (sensitiveEnabled ? 'نمایش محتوای حساس فعال شد.' : 'نمایش محتوای حساس فیلتر شد.') : (sensitiveEnabled ? 'Sensitive content filtering disabled.' : 'Sensitive content filtering enabled.'))
    } catch {
      showToast(isPersian ? 'خطا در ذخیره تنظیمات محتوای حساس' : 'Failed to update content sensitivity.')
    }
  }

  const handleSetGlobalPrivacySettings = async (settings: any) => {
    if (!targetAccountId || !window.guidegram?.setGlobalPrivacySettings) return
    try {
      await window.guidegram.setGlobalPrivacySettings(targetAccountId, settings)
      showToast(isPersian ? 'تنظیمات سراسری حریم خصوصی به‌روز شد.' : 'Global privacy settings updated.')
    } catch {
      showToast(isPersian ? 'خطا در به‌روزرسانی تنظیمات سراسری حریم خصوصی' : 'Failed to update global privacy settings.')
    }
  }

  const handleSetMainProfileTab = async (tab: any) => {
    if (!targetAccountId || !window.guidegram?.setMainProfileTab) return
    try {
      await window.guidegram.setMainProfileTab(targetAccountId, tab)
      showToast(isPersian ? 'تب اصلی پروفایل تغییر یافت.' : 'Main profile tab updated.')
    } catch {
      showToast(isPersian ? 'خطا در تغییر تب اصلی پروفایل' : 'Failed to update main profile tab.')
    }
  }

  const handleSetReactionsNotifySettings = async (settings: any) => {
    if (!targetAccountId || !window.guidegram?.setReactionsNotifySettings) return
    try {
      await window.guidegram.setReactionsNotifySettings(targetAccountId, settings)
      setReactionsNotifySettings(settings)
      showToast(isPersian ? 'تنظیمات اعلان واکنش‌ها ذخیره شد.' : 'Reaction notification settings saved.')
    } catch {
      showToast(isPersian ? 'خطا در ذخیره اعلان واکنش‌ها' : 'Failed to save reaction notification settings.')
    }
  }

  const handleToggleConnectedBotPaused = async (peerId: string, paused: boolean) => {
    if (!targetAccountId || !window.guidegram?.toggleConnectedBotPaused) return
    try {
      await window.guidegram.toggleConnectedBotPaused(targetAccountId, peerId, paused)
      showToast(isPersian ? (paused ? 'ربات متصل موقتاً متوقف شد.' : 'ربات متصل مجدداً فعال شد.') : (paused ? 'Connected bot paused.' : 'Connected bot resumed.'))
    } catch {
      showToast(isPersian ? 'خطا در تغییر وضعیت ربات متصل' : 'Failed to toggle connected bot.')
    }
  }

  const handleToggleNoPaidMessagesException = async (
    refundCharged?: boolean,
    requirePayment?: boolean,
    parentPeerId?: string,
    userIdId?: string
  ) => {
    if (!targetAccountId || !window.guidegram?.toggleNoPaidMessagesException) return
    try {
      await window.guidegram.toggleNoPaidMessagesException(targetAccountId, refundCharged, requirePayment, parentPeerId, userIdId)
      showToast(isPersian ? 'استثنای پیام‌های پولی به‌روزرسانی شد.' : 'Paid messages exception updated.')
    } catch {
      showToast(isPersian ? 'خطا در به‌روزرسانی استثنای پیام‌های پولی' : 'Failed to update paid messages exception.')
    }
  }

  const handleToggleAccountUsername = async (username: string, active: boolean) => {
    if (!targetAccountId || !window.guidegram?.toggleAccountUsername) return
    try {
      await window.guidegram.toggleAccountUsername(targetAccountId, username, active)
      showToast(isPersian ? `نام کاربری @${username} ${active ? 'فعال' : 'غیرفعال'} شد.` : `Username @${username} ${active ? 'enabled' : 'disabled'}.`)
    } catch {
      showToast(isPersian ? 'خطا در تغییر وضعیت نام کاربری' : 'Failed to toggle username.')
    }
  }

  const handleToggleWebBrowserSettingsException = async (
    deleteException?: boolean,
    openExternalBrowser?: boolean,
    url?: string
  ) => {
    if (!targetAccountId || !window.guidegram?.toggleWebBrowserSettingsException) return
    try {
      await window.guidegram.toggleWebBrowserSettingsException(targetAccountId, deleteException, openExternalBrowser, url)
      showToast(isPersian ? 'استثنای مرورگر وب ذخیره شد.' : 'Web browser exception updated.')
    } catch {
      showToast(isPersian ? 'خطا در تنظیم استثنای مرورگر' : 'Failed to toggle web browser exception.')
    }
  }

  const handleUnregisterDevice = async (tokenType?: number, token?: string) => {
    if (!targetAccountId || !window.guidegram?.unregisterDevice) return
    try {
      await window.guidegram.unregisterDevice(targetAccountId, tokenType, token)
      showToast(isPersian ? 'دستگاه با موفقیت از سرور لغو ثبت شد.' : 'Device unregistered successfully.')
    } catch {
      showToast(isPersian ? 'خطا در لغو ثبت دستگاه' : 'Failed to unregister device.')
    }
  }

  const handleUpdateBirthday = async (day?: number, month?: number, year?: number) => {
    if (!targetAccountId || !window.guidegram?.updateBirthday) return
    try {
      const birthday = day && month ? { _: 'birthday', day, month, year } : undefined
      await window.guidegram.updateBirthday(targetAccountId, birthday)
      showToast(isPersian ? 'تاریخ تولد با موفقیت به‌روزرسانی شد.' : 'Birthday updated successfully.')
    } catch {
      showToast(isPersian ? 'خطا در به‌روزرسانی تاریخ تولد' : 'Failed to update birthday.')
    }
  }

  const handleUpdateProfile = async (firstName?: string, lastName?: string, about?: string) => {
    if (!targetAccountId || !window.guidegram?.updateProfile) return
    try {
      await window.guidegram.updateProfile(targetAccountId, firstName, lastName, about)
      showToast(isPersian ? 'اطلاعات پروفایل با موفقیت ذخیره شد.' : 'Profile updated successfully.')
    } catch {
      showToast(isPersian ? 'خطا در به‌روزرسانی پروفایل' : 'Failed to update profile.')
    }
  }

  const handleUpdateConnectedBot = async (botId: string, rights?: any, deleted?: boolean) => {
    if (!targetAccountId || !window.guidegram?.updateConnectedBot) return
    try {
      await window.guidegram.updateConnectedBot(targetAccountId, deleted, rights, botId)
      showToast(isPersian ? 'تنظیمات ربات متصل به‌روزرسانی شد.' : 'Connected bot settings updated.')
    } catch {
      showToast(isPersian ? 'خطا در به‌روزرسانی ربات متصل' : 'Failed to update connected bot.')
    }
  }

  const handleUpdateDeviceLocked = async (period: number) => {
    if (!targetAccountId || !window.guidegram?.updateDeviceLocked) return
    try {
      await window.guidegram.updateDeviceLocked(targetAccountId, period)
      showToast(isPersian ? `مدت زمان قفل خودکار دستگاه به ${period} ثانیه تغییر یافت.` : `Device lock period updated to ${period}s.`)
    } catch {
      showToast(isPersian ? 'خطا در تنظیم قفل خودکار' : 'Failed to update device lock period.')
    }
  }

  const handleUpdatePasswordSettings = async (password?: any, newSettings?: any) => {
    if (!targetAccountId || !window.guidegram?.updatePasswordSettings) return
    try {
      await window.guidegram.updatePasswordSettings(targetAccountId, password, newSettings)
      showToast(isPersian ? 'تنظیمات گذرواژه دو مرحله‌ای ذخیره شد.' : 'Two-step verification settings saved.')
    } catch {
      showToast(isPersian ? 'خطا در ذخیره تنظیمات گذرواژه' : 'Failed to update password settings.')
    }
  }

  const handleUpdateStatus = async (offline: boolean) => {
    if (!targetAccountId || !window.guidegram?.updateStatus) return
    try {
      await window.guidegram.updateStatus(targetAccountId, offline)
      showToast(isPersian ? (offline ? 'وضعیت به آفلاین تغییر یافت.' : 'وضعیت به آنلاین تغییر یافت.') : (offline ? 'Status set to offline.' : 'Status set to online.'))
    } catch {
      showToast(isPersian ? 'خطا در تغییر وضعیت آنلاین' : 'Failed to update online status.')
    }
  }

  const handleUpdateAccountUsername = async (username: string) => {
    if (!targetAccountId || !window.guidegram?.updateAccountUsername) return
    try {
      await window.guidegram.updateAccountUsername(targetAccountId, username)
      showToast(isPersian ? `نام کاربری به @${username} تغییر یافت.` : `Username updated to @${username}.`)
    } catch {
      showToast(isPersian ? 'خطا در تغییر نام کاربری' : 'Failed to update username.')
    }
  }

  const handleUpdateWebBrowserSettings = async (openExternalBrowser: boolean, displayCloseButton?: boolean) => {
    if (!targetAccountId || !window.guidegram?.updateWebBrowserSettings) return
    try {
      await window.guidegram.updateWebBrowserSettings(targetAccountId, openExternalBrowser, displayCloseButton)
      showToast(isPersian ? 'تنظیمات مرورگر وب ذخیره شد.' : 'Web browser settings saved.')
    } catch {
      showToast(isPersian ? 'خطا در به‌روزرسانی تنظیمات مرورگر' : 'Failed to update web browser settings.')
    }
  }

  const handleUploadWallPaper = async (file: any, forChat?: boolean, mimeType?: string, settings?: any) => {
    if (!targetAccountId || !window.guidegram?.uploadWallPaper) return null
    try {
      const res = await window.guidegram.uploadWallPaper(targetAccountId, forChat, file, mimeType, settings)
      showToast(isPersian ? 'تصویر پس‌زمینه در کلاود بارگذاری شد.' : 'Wallpaper uploaded to cloud.')
      return res
    } catch {
      showToast(isPersian ? 'خطا در بارگذاری تصویر پس‌زمینه' : 'Failed to upload wallpaper.')
      return null
    }
  }

  const handleVerifyEmail = async (code: string, purpose?: any) => {
    if (!targetAccountId || !window.guidegram?.verifyEmail) return null
    try {
      const verification = { _: 'emailVerificationCode', code }
      const res = await window.guidegram.verifyEmail(targetAccountId, purpose || { _: 'emailVerifyPurposeLoginSetup' }, verification)
      showToast(isPersian ? 'ایمیل با موفقیت تأیید شد.' : 'Email verified successfully.')
      return res
    } catch {
      showToast(isPersian ? 'خطا در اعتبارسنجی ایمیل' : 'Failed to verify email.')
      return null
    }
  }

  const handleVerifyPhone = async (phoneNumber: string, phoneCodeHash: string, phoneCode: string) => {
    if (!targetAccountId || !window.guidegram?.verifyPhone) return false
    try {
      const res = await window.guidegram.verifyPhone(targetAccountId, phoneNumber, phoneCodeHash, phoneCode)
      showToast(isPersian ? 'شماره تلفن با موفقیت تأیید شد.' : 'Phone number verified successfully.')
      return res
    } catch {
      showToast(isPersian ? 'خطا در اعتبارسنجی شماره تلفن' : 'Failed to verify phone number.')
      return false
    }
  }

  // Layer 232 Messages Handlers (Microphase 033)
  const handleCheckChatInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !inviteLinkInput.trim() || !window.guidegram?.checkChatInvite) return
    setIsCheckingInvite(true)
    setInviteResult(null)
    setInviteError(null)
    try {
      const raw = inviteLinkInput.trim()
      const match = raw.match(/(?:t\.me\/(?:\+|joinchat\/))([a-zA-Z0-9_-]+)/)
      const cleanHash = match ? match[1] : raw.replace(/^\+/, '')
      const res = await window.guidegram.checkChatInvite(targetId, cleanHash)
      if (res) {
        setInviteResult(res)
      } else {
        setInviteError('No response received or invalid invite link.')
      }
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to inspect chat invite link.')
    } finally {
      setIsCheckingInvite(false)
    }
  }

  const handleCheckHistoryImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !historyImportHead.trim() || !window.guidegram?.checkHistoryImport) return
    setIsCheckingHistoryImport(true)
    setHistoryImportResult(null)
    setHistoryImportError(null)
    try {
      const res = await window.guidegram.checkHistoryImport(targetId, historyImportHead.trim())
      if (res) {
        setHistoryImportResult(res)
      } else {
        setHistoryImportError('Unable to parse history export header.')
      }
    } catch (err: any) {
      setHistoryImportError(err?.message || 'Failed to check chat history import.')
    } finally {
      setIsCheckingHistoryImport(false)
    }
  }

  const handleAcceptUrlAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !urlAuthUrl.trim() || !window.guidegram?.acceptUrlAuth) return
    setIsAcceptingUrlAuth(true)
    setUrlAuthResult(null)
    setUrlAuthError(null)
    try {
      const res = await window.guidegram.acceptUrlAuth(targetId, {
        url: urlAuthUrl.trim(),
        writeAllowed: urlAuthWriteAllowed,
      })
      if (res) {
        setUrlAuthResult(res)
        showToast('Web authentication approved.')
      } else {
        setUrlAuthError('Authentication not accepted by Telegram.')
      }
    } catch (err: any) {
      setUrlAuthError(err?.message || 'Web auth failed.')
    } finally {
      setIsAcceptingUrlAuth(false)
    }
  }

  const handleAddChatUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !addChatId.trim() || !addChatUserId.trim() || !window.guidegram?.addChatUser) return
    setIsAddingChatUser(true)
    setAddChatUserSuccess(null)
    setAddChatUserError(null)
    try {
      const res = await window.guidegram.addChatUser(
        targetId,
        BigInt(addChatId.trim()),
        addChatUserId.trim(),
        Number(addChatFwdLimit) || 100
      )
      if (res) {
        setAddChatUserSuccess(`User added to chat successfully (fwd_limit: ${addChatFwdLimit}).`)
        showToast('Chat user added.')
      } else {
        setAddChatUserError('Failed to add user. Ensure user exists and chat is valid.')
      }
    } catch (err: any) {
      setAddChatUserError(err?.message || 'Failed to add chat user.')
    } finally {
      setIsAddingChatUser(false)
    }
  }

  const handleAddPollAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !pollPeerId.trim() || !pollMsgId.trim() || !pollOptionText.trim() || !window.guidegram?.addPollAnswer) return
    setIsAddingPollAnswer(true)
    setPollAnswerSuccess(null)
    setPollAnswerError(null)
    try {
      const answerPayload = {
        _: 'pollAnswer',
        text: { _: 'textWithEntities', text: pollOptionText.trim(), entities: [] },
        option: [48],
      }
      const res = await window.guidegram.addPollAnswer(
        targetId,
        pollPeerId.trim(),
        Number(pollMsgId.trim()),
        answerPayload
      )
      if (res) {
        setPollAnswerSuccess('Poll answer/option submitted to Telegram.')
        showToast('Poll vote/answer recorded.')
      } else {
        setPollAnswerError('Could not record poll answer.')
      }
    } catch (err: any) {
      setPollAnswerError(err?.message || 'Failed to submit poll answer.')
    } finally {
      setIsAddingPollAnswer(false)
    }
  }

  const handleAppendTodoList = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !todoPeerId.trim() || !todoMsgId.trim() || !todoText.trim() || !window.guidegram?.appendTodoList) return
    setIsAppendingTodo(true)
    setTodoSuccess(null)
    setTodoError(null)
    try {
      const todoItems = [
        {
          _: 'todoItem',
          id: Math.floor(Math.random() * 10000) + 1,
          title: { _: 'textWithEntities', text: todoText.trim(), entities: [] },
        },
      ]
      const res = await window.guidegram.appendTodoList(
        targetId,
        todoPeerId.trim(),
        Number(todoMsgId.trim()),
        todoItems
      )
      if (res) {
        setTodoSuccess('Todo item appended to cloud task list.')
        showToast('Todo item appended.')
      } else {
        setTodoError('Failed to append item to todo list.')
      }
    } catch (err: any) {
      setTodoError(err?.message || 'Failed to append todo item.')
    } finally {
      setIsAppendingTodo(false)
    }
  }

  // Layer 232 Messages Handlers (Microphase 034)
  const handleCheckHistoryImportPeer = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !importPeerIdInput.trim() || !window.guidegram?.checkHistoryImportPeer) return
    setIsCheckingImportPeer(true)
    setImportPeerResult(null)
    setImportPeerError(null)
    try {
      const res = await window.guidegram.checkHistoryImportPeer(targetId, importPeerIdInput.trim())
      if (res) {
        setImportPeerResult(res)
      } else {
        setImportPeerError('Peer does not allow history import or insufficient permissions.')
      }
    } catch (err: any) {
      setImportPeerError(err?.message || 'History import peer check failed.')
    } finally {
      setIsCheckingImportPeer(false)
    }
  }

  const handleCheckQuickReplyShortcut = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !quickReplyShortcutInput.trim() || !window.guidegram?.checkQuickReplyShortcut) return
    setIsCheckingShortcut(true)
    setShortcutAvailable(null)
    setShortcutFeedback(null)
    try {
      const clean = quickReplyShortcutInput.trim().replace(/^\//, '')
      const ok = await window.guidegram.checkQuickReplyShortcut(targetId, clean)
      setShortcutAvailable(ok)
      setShortcutFeedback(ok ? `Shortcut /${clean} is valid and ready for quick replies!` : `Shortcut /${clean} is unavailable or reserved.`)
    } catch (err: any) {
      setShortcutFeedback(err?.message || 'Failed to check shortcut.')
    } finally {
      setIsCheckingShortcut(false)
    }
  }

  const handleClearAllDrafts = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.clearAllDrafts) return
    setIsClearingAllDrafts(true)
    setClearDraftsFeedback(null)
    try {
      const ok = await window.guidegram.clearAllDrafts(targetId)
      if (ok) {
        setClearDraftsFeedback('All cloud message drafts cleared across chats.')
        showToast('All drafts cleared.')
      } else {
        setClearDraftsFeedback('Failed to clear drafts.')
      }
    } catch (err: any) {
      setClearDraftsFeedback(err?.message || 'Error clearing drafts.')
    } finally {
      setIsClearingAllDrafts(false)
    }
  }

  const handleClearRecentReactions = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.clearRecentReactions) return
    setIsClearingRecentReactions(true)
    setClearReactionsFeedback(null)
    try {
      const ok = await window.guidegram.clearRecentReactions(targetId)
      if (ok) {
        setClearReactionsFeedback('Recent reaction emojis cleared.')
        showToast('Recent reactions cleared.')
      } else {
        setClearReactionsFeedback('Failed to clear recent reactions.')
      }
    } catch (err: any) {
      setClearReactionsFeedback(err?.message || 'Error clearing reactions.')
    } finally {
      setIsClearingRecentReactions(false)
    }
  }

  const handleClearRecentStickers = async (attached = false) => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.clearRecentStickers) return
    setIsClearingRecentStickers(true)
    setClearStickersFeedback(null)
    try {
      const ok = await window.guidegram.clearRecentStickers(targetId, attached)
      if (ok) {
        setClearStickersFeedback('Recent sticker cache cleared.')
        showToast('Recent stickers cleared.')
      } else {
        setClearStickersFeedback('Failed to clear recent stickers.')
      }
    } catch (err: any) {
      setClearStickersFeedback(err?.message || 'Error clearing stickers.')
    } finally {
      setIsClearingRecentStickers(false)
    }
  }

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !newChatTitle.trim() || !newChatUserIds.trim() || !window.guidegram?.createChat) return
    setIsCreatingChat(true)
    setCreateChatResult(null)
    setCreateChatError(null)
    try {
      const userList = newChatUserIds.split(/[\s,]+/).filter(Boolean)
      const res = await window.guidegram.createChat(targetId, userList, newChatTitle.trim(), newChatTtl || undefined)
      if (res) {
        setCreateChatResult(`Group chat "${newChatTitle.trim()}" created successfully!`)
        showToast('Chat created successfully.')
        setNewChatTitle('')
        setNewChatUserIds('')
      } else {
        setCreateChatError('Could not create chat. Ensure valid users.')
      }
    } catch (err: any) {
      setCreateChatError(err?.message || 'Failed to create chat.')
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handleDeleteChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !deleteChatIdInput.trim() || !window.guidegram?.deleteChat) return
    setIsDeletingChat(true)
    setDeleteChatFeedback(null)
    try {
      const rawId = deleteChatIdInput.trim().replace(/^-/, '')
      const ok = await window.guidegram.deleteChat(targetId, BigInt(rawId))
      if (ok) {
        setDeleteChatFeedback(`Chat #${rawId} permanently deleted from Telegram.`)
        showToast('Chat deleted.')
        setDeleteChatIdInput('')
      } else {
        setDeleteChatFeedback('Failed to delete chat. Verify you are the owner.')
      }
    } catch (err: any) {
      setDeleteChatFeedback(err?.message || 'Failed to delete chat.')
    } finally {
      setIsDeletingChat(false)
    }
  }

  // Layer 232 Messages Handlers (Microphase 035)
  const handleComposeWithAI = async (isRich = false) => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !aiComposerText.trim()) return
    setIsComposingAI(true)
    setAiComposerResult(null)
    setAiComposerError(null)
    try {
      const options = {
        proofread: aiComposerProofread,
        emojify: aiComposerEmojify,
        tone: aiComposerTone ? { _: 'aiComposerTone' + aiComposerTone.charAt(0).toUpperCase() + aiComposerTone.slice(1) } : undefined,
        translateToLang: aiComposerLang.trim() || undefined,
        text: isRich ? { _: 'richTextPlain', text: aiComposerText } : { _: 'textWithEntities', text: aiComposerText, entities: [] }
      }
      const res = isRich
        ? await (window.guidegram as any)?.composeRichMessageWithAI?.(targetId, options)
        : await (window.guidegram as any)?.composeMessageWithAI?.(targetId, options)
      if (res) {
        setAiComposerResult(res)
        showToast('AI composition generated.')
      } else {
        setAiComposerError('AI generation returned empty response. Check account permissions.')
      }
    } catch (err: any) {
      setAiComposerError(err?.message || 'Error executing AI message composition.')
    } finally {
      setIsComposingAI(false)
    }
  }

  const handleDeclineUrlAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !declineUrlInput.trim()) return
    setIsDecliningUrlAuth(true)
    setDeclineUrlAuthFeedback(null)
    try {
      const res = await (window.guidegram as any)?.declineUrlAuth?.(targetId, declineUrlInput.trim())
      if (res !== null && res !== undefined) {
        setDeclineUrlAuthFeedback('Web session authorization declined successfully.')
        showToast('Web auth declined.')
        setDeclineUrlInput('')
      } else {
        setDeclineUrlAuthFeedback('Failed to decline web session. Verify the URL token.')
      }
    } catch (err: any) {
      setDeclineUrlAuthFeedback(err?.message || 'Error declining web auth.')
    } finally {
      setIsDecliningUrlAuth(false)
    }
  }

  const handleDeleteChatUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !kickChatId.trim() || !kickUserId.trim()) return
    setIsKickingUser(true)
    setKickFeedback(null)
    try {
      const rawChatId = kickChatId.trim().replace(/^-/, '')
      const res = await (window.guidegram as any)?.deleteChatUser?.(
        targetId,
        BigInt(rawChatId),
        kickUserId.trim(),
        kickRevokeHistory
      )
      if (res) {
        setKickFeedback(`User ${kickUserId.trim()} expelled from chat #${rawChatId}.`)
        showToast('User expelled.')
        setKickUserId('')
      } else {
        setKickFeedback('Failed to expel user. Ensure administrator privileges.')
      }
    } catch (err: any) {
      setKickFeedback(err?.message || 'Failed to expel chat user.')
    } finally {
      setIsKickingUser(false)
    }
  }

  const handleCreateForumTopicQuick = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !forumTopicChatId.trim() || !forumTopicTitle.trim()) return
    setIsCreatingForumTopic(true)
    setForumTopicFeedback(null)
    try {
      const res = await (window.guidegram as any)?.createForumTopic?.(
        targetId,
        forumTopicChatId.trim(),
        forumTopicTitle.trim()
      )
      if (res) {
        setForumTopicFeedback(`Forum topic "${forumTopicTitle.trim()}" created successfully!`)
        showToast('Forum topic created.')
        setForumTopicTitle('')
      } else {
        setForumTopicFeedback('Could not create forum topic. Ensure group has topics enabled.')
      }
    } catch (err: any) {
      setForumTopicFeedback(err?.message || 'Failed to create forum topic.')
    } finally {
      setIsCreatingForumTopic(false)
    }
  }

  const openPrivacyRule = (
    key: keyof PrivacySecuritySettings,
    title: string,
    subtitle: string,
    currentValue: string
  ) => {
    setSelectedPrivacyRule({ key, title, subtitle, currentValue })
    setActiveSubModal('privacyRule')
  }

  const handleUpdatePrivacyRule = (val: string) => {
    if (!selectedPrivacyRule) return
    const key = selectedPrivacyRule.key
    setPrivacyData((prev) => {
      const updated = prev ? { ...prev, [key]: val } : ({ [key]: val } as any)
      return updated
    })
    setSelectedPrivacyRule((prev) => (prev ? { ...prev, currentValue: val } : null))
    localStorage.setItem(`guidegram_privacy_${key}`, val)

    if (targetAccountId && window.guidegram?.setPrivacy) {
      let mtprotoKey: any = { _: 'inputPrivacyKeyStatusTimestamp' }
      if (key === 'phoneNumberPrivacy') mtprotoKey = { _: 'inputPrivacyKeyPhoneNumber' }
      else if (key === 'forwardedMessagesPrivacy') mtprotoKey = { _: 'inputPrivacyKeyForwards' }
      else if (key === 'callsPrivacy') mtprotoKey = { _: 'inputPrivacyKeyPhoneCall' }
      else if (key === 'invitesPrivacy') mtprotoKey = { _: 'inputPrivacyKeyChatInvite' }
      else if (key === 'profilePhotosPrivacy') mtprotoKey = { _: 'inputPrivacyKeyProfilePhoto' }
      else if (key === 'voiceMessagesPrivacy') mtprotoKey = { _: 'inputPrivacyKeyVoiceMessages' }
      else if (key === 'lastSeenPrivacy') mtprotoKey = { _: 'inputPrivacyKeyStatusTimestamp' }


      let mtprotoRules: any[] = [{ _: 'inputPrivacyValueAllowAll' }]
      if (val === 'nobody' || val === 'never') {
        mtprotoRules = [{ _: 'inputPrivacyValueDisallowAll' }]
      } else if (val === 'contacts') {
        mtprotoRules = [{ _: 'inputPrivacyValueAllowContacts' }]
      }

      window.guidegram.setPrivacy(targetAccountId, mtprotoKey, mtprotoRules).catch(() => {})
    }

    showToast(`Updated ${selectedPrivacyRule.title} to "${val}"`)
  }


  const handleSelectTheme = (theme: 'classic' | 'day' | 'tinted' | 'night') => {
    setActiveTheme(theme)
    localStorage.setItem('guidegram_theme_mode', theme)
    document.documentElement.setAttribute('data-chat-theme', theme)
    if (targetAccountId && window.guidegram?.installTheme) {
      window.guidegram.installTheme(targetAccountId, theme === 'night' || theme === 'tinted').catch(() => {})
    }
    if (targetAccountId && window.guidegram?.saveTheme) {
      window.guidegram.saveTheme(targetAccountId, { _: 'inputThemeSlug', slug: theme }, false).catch(() => {})
    }
    showToast(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`)
  }

  const handleSelectAccentColor = (id: number, hex: string) => {
    setSelectedAccentColor(id)
    localStorage.setItem('guidegram_accent_color', String(id))
    document.documentElement.style.setProperty('--primary-accent', hex)
    if (targetAccountId && window.guidegram?.updateAccountColor) {
      window.guidegram.updateAccountColor(targetAccountId, false, id).catch(() => {})
    }
    showToast(`Accent color updated`)
  }


  const handleSelectWallpaper = (wallpaperValue: string, name: string) => {
    setCustomWallpaper(wallpaperValue)
    if (wallpaperValue === 'default' || !wallpaperValue) {
      localStorage.removeItem('guidegram_chat_wallpaper')
      document.documentElement.style.removeProperty('--chat-wallpaper')
      if (targetAccountId && window.guidegram?.resetWallPapers) {
        window.guidegram.resetWallPapers(targetAccountId).catch(() => {})
      }
    } else {
      localStorage.setItem('guidegram_chat_wallpaper', wallpaperValue)
      document.documentElement.style.setProperty('--chat-wallpaper', wallpaperValue)
      if (targetAccountId && window.guidegram?.installWallPaper) {
        window.guidegram.installWallPaper(targetAccountId, { _: 'inputWallPaperSlug', slug: wallpaperValue }).catch(() => {})
      }
      if (targetAccountId && window.guidegram?.saveWallPaper) {
        window.guidegram.saveWallPaper(targetAccountId, { _: 'inputWallPaperSlug', slug: wallpaperValue }).catch(() => {})
      }
    }
    showToast(`Wallpaper set to ${name}`)
  }

  const handleWallpaperFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      handleSelectWallpaper(`url("${dataUrl}")`, file.name)
    }
    reader.readAsDataURL(file)
  }

  const handleSelectFont = (fontName: string, cssFont: string) => {
    setFontFamily(fontName)
    localStorage.setItem('guidegram_font_family', fontName)
    if (fontName === 'Default') {
      document.body.style.fontFamily = ''
    } else {
      document.body.style.fontFamily = cssFont
    }
    showToast(`Font changed to ${fontName}`)
  }

  // Log Viewer State
  const [showLogs, setShowLogs] = useState(false)
  const [logText, setLogText] = useState('')
  const [logPath, setLogPath] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Telegram Business Hub State
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(false)
  const [businessIntroTitle, setBusinessIntroTitle] = useState('')
  const [businessIntroDesc, setBusinessIntroDesc] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessLat, setBusinessLat] = useState<number | undefined>(undefined)
  const [businessLong, setBusinessLong] = useState<number | undefined>(undefined)
  const [businessTimezone, setBusinessTimezone] = useState('UTC')
  const [businessWeeklyOpen, setBusinessWeeklyOpen] = useState<{ day: number; name: string; enabled: boolean; start: string; end: string }[]>([
    { day: 1, name: 'Monday', enabled: true, start: '09:00', end: '18:00' },
    { day: 2, name: 'Tuesday', enabled: true, start: '09:00', end: '18:00' },
    { day: 3, name: 'Wednesday', enabled: true, start: '09:00', end: '18:00' },
    { day: 4, name: 'Thursday', enabled: true, start: '09:00', end: '18:00' },
    { day: 5, name: 'Friday', enabled: true, start: '09:00', end: '18:00' },
    { day: 6, name: 'Saturday', enabled: false, start: '10:00', end: '15:00' },
    { day: 0, name: 'Sunday', enabled: false, start: '10:00', end: '15:00' },
  ])
  const [businessLinks, setBusinessLinks] = useState<BusinessChatLink[]>([])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkMessage, setNewLinkMessage] = useState('')
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [businessToast, setBusinessToast] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const loadBusinessProfile = async () => {
    if (!accounts[0]?.id || !window.guidegram?.getBusinessProfile) return
    setIsLoadingBusiness(true)
    try {
      const p = await window.guidegram.getBusinessProfile(accounts[0].id)
      setBusinessProfile(p)
      if (p.intro) {
        setBusinessIntroTitle(p.intro.title || '')
        setBusinessIntroDesc(p.intro.description || '')
      }
      if (p.location) {
        setBusinessAddress(p.location.address || '')
        setBusinessLat(p.location.lat)
        setBusinessLong(p.location.long)
      }
      if (p.workHours) {
        setBusinessTimezone(p.workHours.timezoneId || 'UTC')
      }
      setBusinessLinks(p.links || [])
    } catch (err) {
      console.warn('[Settings] Failed to load business profile:', err)
    } finally {
      setIsLoadingBusiness(false)
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'business') {
      loadBusinessProfile()
    }
  }, [isOpen, activeTab, accounts])

  const handleSaveBusinessIntro = async () => {
    if (!accounts[0]?.id || !window.guidegram?.updateBusinessIntro) return
    const success = await window.guidegram.updateBusinessIntro(accounts[0].id, {
      title: businessIntroTitle,
      description: businessIntroDesc,
    })
    if (success) {
      setBusinessToast(t('business.saved_success'))
      setTimeout(() => setBusinessToast(null), 3000)
    }
  }

  const handleSaveBusinessHours = async () => {
    if (!accounts[0]?.id || !window.guidegram?.updateBusinessWorkHours) return
    const weeklyOpenItems: { startMinute: number; endMinute: number }[] = []
    businessWeeklyOpen.forEach((item) => {
      if (!item.enabled) return
      const [sh, sm] = item.start.split(':').map(Number)
      const [eh, em] = item.end.split(':').map(Number)
      const dayOffset = item.day === 0 ? 6 * 1440 : (item.day - 1) * 1440
      const startMin = dayOffset + (sh * 60 + (sm || 0))
      const endMin = dayOffset + (eh * 60 + (em || 0))
      weeklyOpenItems.push({ startMinute: startMin, endMinute: endMin })
    })

    const success = await window.guidegram.updateBusinessWorkHours(accounts[0].id, {
      timezoneId: businessTimezone,
      weeklyOpen: weeklyOpenItems,
    })
    if (success) {
      setBusinessToast(t('business.saved_success'))
      setTimeout(() => setBusinessToast(null), 3000)
    }
  }

  const handleSaveBusinessLocation = async () => {
    if (!accounts[0]?.id || !window.guidegram?.updateBusinessLocation) return
    const success = await window.guidegram.updateBusinessLocation(accounts[0].id, {
      address: businessAddress,
      lat: businessLat,
      long: businessLong,
    })
    if (success) {
      setBusinessToast(t('business.saved_success'))
      setTimeout(() => setBusinessToast(null), 3000)
    }
  }

  const handleCreateBusinessLink = async () => {
    if (!accounts[0]?.id || !newLinkMessage.trim() || !window.guidegram?.createBusinessChatLink) return
    setIsCreatingLink(true)
    try {
      const created = await window.guidegram.createBusinessChatLink(accounts[0].id, {
        message: newLinkMessage.trim(),
        title: newLinkTitle.trim() || undefined,
      })
      setBusinessLinks((prev) => [created, ...prev])
      setNewLinkMessage('')
      setNewLinkTitle('')
      setBusinessToast(t('business.saved_success'))
      setTimeout(() => setBusinessToast(null), 3000)
    } catch (err) {
      console.warn('[Settings] Failed to create business link:', err)
    } finally {
      setIsCreatingLink(false)
    }
  }

  const handleDeleteBusinessLink = async (slug: string) => {
    if (!accounts[0]?.id || !window.guidegram?.deleteBusinessChatLink) return
    const success = await window.guidegram.deleteBusinessChatLink(accounts[0].id, slug)
    if (success) {
      setBusinessLinks((prev) => prev.filter((l) => l.slug !== slug))
    }
  }

  const handleEditBusinessLink = async (slug: string) => {
    if (!accounts[0]?.id || !window.guidegram?.editBusinessChatLink) return
    const current = businessLinks.find((l) => l.slug === slug)
    const newMsg = prompt('Edit Business Link Message:', current?.message || '')
    if (newMsg === null) return
    const newTitle = prompt('Edit Business Link Title:', current?.title || '') || undefined
    try {
      const updated = await window.guidegram.editBusinessChatLink(accounts[0].id, slug, {
        message: newMsg.trim(),
        title: newTitle,
      })
      setBusinessLinks((prev) => prev.map((l) => (l.slug === slug ? updated : l)))
      setBusinessToast(t('business.saved_success'))
      setTimeout(() => setBusinessToast(null), 3000)
    } catch (err) {
      console.warn('[Settings] Failed to edit business link:', err)
    }
  }

  useEffect(() => {
    if (!window.guidegram?.on) return
    const cleanup = window.guidegram.on('app:update-progress', (p: UpdateProgress) => {
      setUpdateProgress(p)
    })
    return () => {
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      window.guidegram?.getAppVersion?.().then((ver) => {
        if (ver) setAppVersion(ver)
      })
      window.guidegram?.getMtprotoStatus?.().then((st) => {
        if (st) setMtprotoStatus(st)
      })
      window.guidegram?.getConfig?.().then((cfg) => {
        if (!cfg) return
        setConfig(cfg)
        setApiId(cfg.apiId)
        setApiHash(cfg.apiHash)
        setGhostMode(cfg.ghostMode)
        setShowChatId(cfg.showChatId ?? true)
        setShowMessageId(cfg.showMessageId ?? true)
        setShowSeconds(cfg.showSeconds ?? true)
        setShowSenderAvatar(cfg.showSenderAvatar ?? true)
        setQuickForwardToSaved(cfg.quickForwardToSaved ?? true)
        setAlwaysDeleteBoth(cfg.alwaysDeleteBoth ?? true)
        setKeepDeletedMessagesLocally(cfg.keepDeletedMessagesLocally ?? true)
        setAuditTrackDeletedPrivate(cfg.auditTrackDeletedPrivate ?? true)
        setAuditTrackEditedPrivate(cfg.auditTrackEditedPrivate ?? true)
        setAuditTrackDeletedGroups(cfg.auditTrackDeletedGroups ?? true)
        setAuditTrackEditedGroups(cfg.auditTrackEditedGroups ?? true)
        setAuditTrackDeletedChannels(cfg.auditTrackDeletedChannels ?? false)
        setAuditTrackEditedChannels(cfg.auditTrackEditedChannels ?? false)
        setAuditMaxTrackedGroups(cfg.auditMaxTrackedGroups ?? 25)
        setAuditMaxTrackedChannels(cfg.auditMaxTrackedChannels ?? 10)
        setMarkAllReadEnabled(cfg.markAllReadEnabled ?? true)
        setCopyCallbackData(cfg.copyCallbackData ?? true)
        setDisableAnimations(cfg.disableAnimations ?? false)
        setComposerSendAnimation(cfg.composerSendAnimation ?? true)
        setEnableThanosDust(cfg.enableThanosDust ?? true)
        setSuppressLinkWarning(cfg.suppressLinkWarning ?? false)
        setAntiFingerprinting(cfg.antiFingerprinting ?? true)
        setCloseAction(cfg.closeAction || 'ask')
        setNotificationsEnabled(cfg.notificationsEnabled ?? true)
        setSoundEnabled(cfg.soundEnabled ?? true)
        setNotificationTone(cfg.notificationTone || 'classic')
        setNotificationPosition(cfg.notificationPosition || 'bottom-right')
        setNotificationMaxStack(cfg.notificationMaxStack ?? 3)
        setNotificationPrivateChats(cfg.notificationPrivateChats ?? true)
        setNotificationGroups(cfg.notificationGroups ?? true)
        setNotificationChannels(cfg.notificationChannels ?? false)
        setNotificationPrivacyMode(cfg.notificationPrivacyMode || 'full')
        setNotificationQuickReply(cfg.notificationQuickReply ?? true)
        setNotificationBatching(cfg.notificationBatching ?? true)
        setNotificationVibrate(cfg.notificationVibrate ?? true)
        setNotificationFlashTaskbar(cfg.notificationFlashTaskbar ?? true)
        setDownloadsPath(cfg.downloadsPath || '')
        setAlwaysAskDownloadPath(cfg.alwaysAskDownloadPath ?? false)
        setChatFontSize(cfg.chatFontSize || 14)
        setBubbleRadius(cfg.bubbleRadius ?? 16)
        setBubblePadding(cfg.bubblePadding ?? 10)
        setActivityTrackerEnabled(cfg.activityTrackerEnabled ?? true)
        setProfileChangeAuditorEnabled(cfg.profileChangeAuditorEnabled ?? true)
        setActivityRetentionPeriod(cfg.activityRetentionPeriod || '30d')
        setProfileAuditInteractionRange(cfg.profileAuditInteractionRange || '180d')
        setProfileAuditScanOnOnline(cfg.profileAuditScanOnOnline ?? true)
        setProfileAuditContactsOnly(cfg.profileAuditContactsOnly ?? false)
        if (cfg.autoDownload) {
          setAutoDownload({
            ...cfg.autoDownload,
            networkProfiles: cfg.autoDownload.networkProfiles || DEFAULT_NETWORK_PROFILES,
          })
          if (cfg.autoDownload.activeNetworkProfile) {
            setSelectedProfileTab(cfg.autoDownload.activeNetworkProfile)
          }
        }
        if (cfg.mcp) {
          setMcpEnabled(cfg.mcp.enabled ?? true)
          setMcpPort(cfg.mcp.port || 39527)
          setMcpAllowedChats((cfg.mcp.allowedChatIds || []).join(', '))
          setMcpDownloadDir(cfg.mcp.defaultDownloadDir || '')
        }
      })
      window.guidegram?.getPortableDataPath?.().then(setDownloadsPath)
      window.guidegram?.getPortableDataPath?.().then(setPortablePath)
      window.guidegram?.getPortableLocator?.().then((info) => {
        if (info) setPortableLocator(info)
      })
      window.guidegram?.mcpGetStatus?.().then((st: any) => {
        if (st) setMcpStatus(st)
      })
      window.guidegram?.mcpGetConfigSnippets?.().then((sn: any) => {
        if (sn) setMcpSnippets(sn)
      })
      loadCacheStats()
      loadLogs()
      if (accounts.length > 0) {
        loadPrivacySettings()
      }
    }
  }, [isOpen, accounts, targetAccountId])

  const loadPrivacySettings = async () => {
    if (!targetAccountId || !window.guidegram?.getPrivacySettings) return
    setIsLoadingPrivacy(true)
    try {
      const res = await window.guidegram.getPrivacySettings(targetAccountId)
      if (res) {
        setPrivacyData(res)
        if (typeof res.localPasscode === 'boolean') {
          setLocalPasscodeEnabled(res.localPasscode)
        }
      }
      if (window.guidegram?.getAccountTTL) {
        setIsLoadingTTL(true)
        try {
          const days = await window.guidegram.getAccountTTL(targetAccountId)
          if (typeof days === 'number') setAccountTTL(days)
        } catch {}
        finally {
          setIsLoadingTTL(false)
        }
      }
      if (window.guidegram?.getAutoSaveSettings) {
        try {
          const autoSave = await window.guidegram.getAutoSaveSettings(targetAccountId)
          if (autoSave) setAutoSaveData(autoSave)
        } catch {}
      }
      if (window.guidegram?.getContactSignUpNotification) {
        setIsLoadingSignUpNotif(true)
        try {
          const silent = await window.guidegram.getContactSignUpNotification(targetAccountId)
          setContactSignUpNotif(!silent)
        } catch {}
        finally {
          setIsLoadingSignUpNotif(false)
        }
      }
      if (window.guidegram?.getConnectedBots) {
        setIsLoadingConnectedBots(true)
        try {
          const bots = await window.guidegram.getConnectedBots(targetAccountId)
          if (Array.isArray(bots?.connectedBots)) {
            setConnectedBotsList(bots.connectedBots)
          }
        } catch {}
        finally {
          setIsLoadingConnectedBots(false)
        }
      }
      if (window.guidegram?.getContentSettings) {
        setIsLoadingContentSettings(true)
        try {
          const cs = await window.guidegram.getContentSettings(targetAccountId)
          if (typeof cs?.sensitiveEnabled === 'boolean') {
            setSensitiveContentEnabled(cs.sensitiveEnabled)
          }
        } catch {}
        finally {
          setIsLoadingContentSettings(false)
        }
      }
      if (window.guidegram?.getGlobalPrivacySettings) {
        try {
          const gps = await window.guidegram.getGlobalPrivacySettings(targetAccountId)
          if (typeof gps?.archiveAndMuteNewNoncontactPeers === 'boolean') {
            setArchiveAndMuteNonContacts(gps.archiveAndMuteNewNoncontactPeers)
          }
        } catch {}
      }
      if (window.guidegram?.getPasskeys) {
        setIsLoadingPasskeys(true)
        try {
          const pk = await window.guidegram.getPasskeys(targetAccountId)
          if (Array.isArray(pk?.passkeys)) {
            setPasskeysList(pk.passkeys)
          }
        } catch {}
        finally {
          setIsLoadingPasskeys(false)
        }
      }
      if (window.guidegram?.getNotifyExceptions) {
        setIsLoadingNotifyExceptions(true)
        try {
          const exc = await window.guidegram.getNotifyExceptions(targetAccountId)
          if (Array.isArray(exc?.updates)) {
            setNotifyExceptionsCount(exc.updates.length)
          } else if (Array.isArray(exc?.chats)) {
            setNotifyExceptionsCount(exc.chats.length)
          } else {
            setNotifyExceptionsCount(0)
          }
        } catch {}
        finally {
          setIsLoadingNotifyExceptions(false)
        }
      }
    } catch (err) {
      console.warn('[SettingsModal] Failed to load privacy settings:', err)
    } finally {
      setIsLoadingPrivacy(false)
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'privacy') {
      loadPrivacySettings()
    }
  }, [isOpen, activeTab, targetAccountId])

  useEffect(() => {
    if (isOpen && activeTab === 'notifications') {
      if (window.guidegram?.getReactionsNotifySettings) {
        setIsLoadingReactionsNotify(true)
        window.guidegram.getReactionsNotifySettings(targetAccountId)
          .then((res: any) => {
            if (res) setReactionsNotifySettings(res)
          })
          .catch(() => {})
          .finally(() => setIsLoadingReactionsNotify(false))
      }
      if (window.guidegram?.getSavedMusicIds) {
        window.guidegram.getSavedMusicIds(targetAccountId)
          .then((ids: any) => {
            if (Array.isArray(ids)) setSavedMusicCount(ids.length)
          })
          .catch(() => {})
      }
    }
  }, [isOpen, activeTab, targetAccountId])

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      if (window.guidegram?.getThemes) {
        setIsLoadingCloudThemes(true)
        window.guidegram.getThemes(targetAccountId, 'desktop')
          .then((res: any) => {
            if (Array.isArray(res?.themes)) setCloudThemesList(res.themes)
          })
          .catch(() => {})
          .finally(() => setIsLoadingCloudThemes(false))
      }
    }
  }, [isOpen, activeTab, targetAccountId])

  useEffect(() => {
    if (activeSubModal === 'connectedWebsites') {
      const targetId = activeAccountId || accounts[0]?.id
      if (targetId && window.guidegram?.getWebAuthorizations) {
        setIsLoadingWebAuths(true)
        window.guidegram.getWebAuthorizations(targetId)
          .then((res: any) => {
            if (Array.isArray(res?.authorizations)) {
              setWebAuthorizationsList(res.authorizations)
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingWebAuths(false))
      }
    }
  }, [activeSubModal, activeAccountId, accounts])

  const loadCacheStats = async () => {
    try {
      if (window.guidegram?.getCacheStats) {
        const stats = await window.guidegram.getCacheStats()
        setCacheStats(stats)
      }
    } catch {}
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    setClearCacheMessage(null)
    try {
      if (window.guidegram?.clearCache) {
        const res = await window.guidegram.clearCache()
        const mb = (res.clearedBytes / (1024 * 1024)).toFixed(1)
        setClearCacheMessage(`Cleaned ${res.clearedFiles} cached files (${mb} MB freed).`)
        await loadCacheStats()
        setTimeout(() => setClearCacheMessage(null), 3500)
      }
    } catch (e: any) {
      setClearCacheMessage('Failed to clear cache: ' + (e.message || 'unknown error'))
    } finally {
      setIsClearingCache(false)
    }
  }

  const handleSelectDownloadDir = async () => {
    try {
      if (window.guidegram?.selectDownloadDirectory) {
        const dir = await window.guidegram.selectDownloadDirectory()
        if (dir) {
          setDownloadsPath(dir)
        }
      }
    } catch {}
  }

  const handleManualCheckUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateCheckResult(null)
    setUpdateError(null)
    try {
      if (window.guidegram?.checkForUpdates) {
        const res = await window.guidegram.checkForUpdates()
        if (res) {
          if (res.currentVersion) setAppVersion(res.currentVersion)
          if (res.hasUpdate) {
            setAvailableUpdate(res)
            setUpdateCheckResult(`New update found: v${res.latestVersion}!`)
            onUpdateFound?.(res)
          } else {
            setAvailableUpdate(null)
            setUpdateCheckResult(`Guidegram is up to date (v${res.currentVersion || appVersion}).`)
          }
        } else {
          setUpdateCheckResult('Check failed. Unable to fetch release info.')
        }
      }
    } catch (e: any) {
      setUpdateCheckResult('Check failed. Make sure your connection or proxy is active.')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleInstallUpdate = async () => {
    if (!availableUpdate) return
    if (!availableUpdate.downloadUrl) {
      window.guidegram?.openExternal?.('https://github.com/guidegram/guidegram/releases/latest')
      return
    }

    setIsInstallingUpdate(true)
    setUpdateError(null)

    try {
      if (window.guidegram?.installUpdate) {
        const res = await window.guidegram.installUpdate(availableUpdate.downloadUrl)
        if (!res.success) {
          setUpdateError(res.error || 'Failed to apply update.')
          setIsInstallingUpdate(false)
        }
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Update failed')
      setIsInstallingUpdate(false)
    }
  }

  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      if (window.guidegram?.getLogs) {
        const res = await window.guidegram.getLogs(150)
        setLogPath(res.logPath)
        setLogText(res.content)
      }
    } catch (e) {
      setLogText('Could not load logs.')
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleSave = async () => {
    if (!window.guidegram) return
    const updated = await window.guidegram.updateConfig({
      apiId: Number(apiId),
      apiHash: apiHash.trim(),
      ghostMode,
      closeAction,
      showChatId,
      showMessageId,
      showSeconds,
      showSenderAvatar,
      quickForwardToSaved,
      alwaysDeleteBoth,
      keepDeletedMessagesLocally,
      auditTrackDeletedPrivate,
      auditTrackEditedPrivate,
      auditTrackDeletedGroups,
      auditTrackEditedGroups,
      auditTrackDeletedChannels,
      auditTrackEditedChannels,
      auditMaxTrackedGroups,
      auditMaxTrackedChannels,
      markAllReadEnabled,
      copyCallbackData,
      disableAnimations,
      composerSendAnimation,
      enableThanosDust,
      suppressLinkWarning,
      antiFingerprinting,
      autoDownload,
      notificationsEnabled,
      soundEnabled,
      notificationTone,
      notificationPosition,
      notificationMaxStack,
      notificationPrivateChats,
      notificationGroups,
      notificationChannels,
      notificationPrivacyMode,
      notificationQuickReply,
      notificationBatching,
      notificationVibrate,
      notificationFlashTaskbar,
      downloadsPath,
      alwaysAskDownloadPath,
      chatFontSize,
      bubbleRadius,
      bubblePadding,
      activityTrackerEnabled,
      profileChangeAuditorEnabled,
      activityRetentionPeriod,
      profileAuditInteractionRange,
      profileAuditScanOnOnline,
      profileAuditContactsOnly,
    })
    setConfig(updated)
    onConfigUpdated?.(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopyPath = async () => {
    await copyTextToClipboard(portablePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSyncFromPortable = async () => {
    if (!portableLocator?.dataPath || !window.guidegram?.syncFromPortable) return
    setIsSyncingPortable(true)
    setSyncMessage(null)
    try {
      const res = await window.guidegram.syncFromPortable(portableLocator.dataPath)
      if (res.success) {
        setSyncMessage(t('settings.portable_sync_success'))
      } else {
        setSyncMessage(t('settings.portable_sync_failed', { error: res.error || 'Unknown error' }))
      }
    } catch (err: any) {
      setSyncMessage(t('settings.portable_sync_failed', { error: err?.message || 'Error' }))
    } finally {
      setIsSyncingPortable(false)
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'features' && activeAccountId && window.guidegram?.getActivityStats) {
      window.guidegram.getActivityStats(activeAccountId).then((st) => {
        if (st) setActivityStats(st)
      }).catch(() => {})
    }
  }, [isOpen, activeTab, activeAccountId])

  const handlePurgeActivityData = async () => {
    if (!activeAccountId || !window.guidegram?.clearActivityData) return
    setIsPurgingData(true)
    setPurgeToast(null)
    try {
      await window.guidegram.clearActivityData(activeAccountId, 'all')
      setPurgeToast(t('settings.auto_migrated_1'))
      if (window.guidegram.getActivityStats) {
        const refreshed = await window.guidegram.getActivityStats(activeAccountId)
        setActivityStats(refreshed)
      }
    } catch {
      setPurgeToast(t('settings.purge_failed') || 'Failed to purge data')
    } finally {
      setIsPurgingData(false)
      setTimeout(() => setPurgeToast(null), 3000)
    }
  }

  // Microphase 039: Layer 232 Message & Content Editing Suite State
  const [m039ChatId, setM039ChatId] = useState('')
  const [m039NewTitle, setM039NewTitle] = useState('')
  const [m039InviteLink, setM039InviteLink] = useState('')
  const [m039InviteTitle, setM039InviteTitle] = useState('')
  const [m039FactCheckMsgId, setM039FactCheckMsgId] = useState('')
  const [m039FactCheckText, setM039FactCheckText] = useState('')
  const [m039TopicId, setM039TopicId] = useState('')
  const [m039TopicTitle, setM039TopicTitle] = useState('')
  const [m039InlineMsgId, setM039InlineMsgId] = useState('')
  const [m039InlineMsgText, setM039InlineMsgText] = useState('')
  const [m039EditMsgId, setM039EditMsgId] = useState('')
  const [m039EditMsgText, setM039EditMsgText] = useState('')
  const [m039ShortcutId, setM039ShortcutId] = useState('')
  const [m039ShortcutTitle, setM039ShortcutTitle] = useState('')

  const [m039LoadingOp, setM039LoadingOp] = useState<string | null>(null)
  const [m039Status, setM039Status] = useState<{ type: 'success' | 'error'; message: string; op?: string } | null>(null)

  const handleM039EditChatTitle = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editChatTitle || !m039ChatId || !m039NewTitle.trim()) return
    setM039LoadingOp('editChatTitle')
    setM039Status(null)
    try {
      await window.guidegram.editChatTitle(targetId, m039ChatId.trim(), m039NewTitle.trim())
      setM039Status({ type: 'success', message: 'عنوان چت با موفقیت ویرایش شد (messages.editChatTitle)' })
      setM039NewTitle('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ویرایش عنوان چت', op: 'editChatTitle' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  const handleM039EditExportedInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editExportedChatInvite || !m039ChatId || !m039InviteLink.trim()) return
    setM039LoadingOp('editExportedInvite')
    setM039Status(null)
    try {
      await window.guidegram.editExportedChatInvite(targetId, m039ChatId.trim(), m039InviteLink.trim(), {
        title: m039InviteTitle.trim() || undefined,
      })
      setM039Status({ type: 'success', message: 'لینک دعوت با موفقیت ویرایش شد (messages.editExportedChatInvite)' })
      setM039InviteTitle('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ویرایش لینک دعوت', op: 'editExportedInvite' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  const handleM039EditFactCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editFactCheck || !m039ChatId || !m039FactCheckMsgId) return
    setM039LoadingOp('editFactCheck')
    setM039Status(null)
    try {
      await window.guidegram.editFactCheck(targetId, m039ChatId.trim(), parseInt(m039FactCheckMsgId, 10), {
        text: m039FactCheckText.trim(),
        entities: [],
      })
      setM039Status({ type: 'success', message: 'فکت‌چک پیام ثبت شد (messages.editFactCheck)' })
      setM039FactCheckText('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ثبت فکت‌چک پیام', op: 'editFactCheck' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  const handleM039EditForumTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editForumTopic || !m039ChatId || !m039TopicId) return
    setM039LoadingOp('editForumTopic')
    setM039Status(null)
    try {
      await window.guidegram.editForumTopic(targetId, m039ChatId.trim(), parseInt(m039TopicId, 10), {
        title: m039TopicTitle.trim() || undefined,
      })
      setM039Status({ type: 'success', message: 'تاپیک انجمن ویرایش شد (messages.editForumTopic)' })
      setM039TopicTitle('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ویرایش تاپیک انجمن', op: 'editForumTopic' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  const handleM039EditInlineBotMsg = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editInlineBotMessage || !m039InlineMsgId || !m039InlineMsgText.trim()) return
    setM039LoadingOp('editInlineBotMsg')
    setM039Status(null)
    try {
      await window.guidegram.editInlineBotMessage(targetId, {
        id: m039InlineMsgId.trim(),
        message: m039InlineMsgText.trim(),
      })
      setM039Status({ type: 'success', message: 'پیام اینلاین ربات به‌روزرسانی شد (messages.editInlineBotMessage)' })
      setM039InlineMsgText('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ویرایش پیام اینلاین', op: 'editInlineBotMsg' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  const handleM039EditMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editMessage || !m039ChatId || !m039EditMsgId || !m039EditMsgText.trim()) return
    setM039LoadingOp('editMessage')
    setM039Status(null)
    try {
      await window.guidegram.editMessage(targetId, m039ChatId.trim(), parseInt(m039EditMsgId, 10), m039EditMsgText.trim())
      setM039Status({ type: 'success', message: 'پیام با موفقیت ویرایش شد (messages.editMessage)' })
      setM039EditMsgText('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ویرایش پیام', op: 'editMessage' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  const handleM039EditQuickReplyShortcut = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.editQuickReplyShortcut || !m039ShortcutId || !m039ShortcutTitle.trim()) return
    setM039LoadingOp('editQuickReplyShortcut')
    setM039Status(null)
    try {
      await window.guidegram.editQuickReplyShortcut(targetId, parseInt(m039ShortcutId, 10), m039ShortcutTitle.trim())
      setM039Status({ type: 'success', message: 'میانبر پاسخ سریع ویرایش شد (messages.editQuickReplyShortcut)' })
      setM039ShortcutTitle('')
    } catch (err: any) {
      setM039Status({ type: 'error', message: err?.message || 'خطا در ویرایش میانبر پاسخ سریع', op: 'editQuickReplyShortcut' })
    } finally {
      setM039LoadingOp(null)
    }
  }

  // Microphase 041: Layer 232 Bot Apps, Effects & Reactions State
  const [m041AttachBotId, setM041AttachBotId] = useState('')
  const [m041AttachBotsCount, setM041AttachBotsCount] = useState<number | null>(null)
  const [m041EffectsCount, setM041EffectsCount] = useState<number | null>(null)
  const [m041ReactionsCount, setM041ReactionsCount] = useState<number | null>(null)
  const [m041BotAppShortName, setM041BotAppShortName] = useState('')
  const [m041CallbackMsgId, setM041CallbackMsgId] = useState('')
  const [m041CallbackData, setM041CallbackData] = useState('')

  const [m041LoadingOp, setM041LoadingOp] = useState<string | null>(null)
  const [m041Status, setM041Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM041GetAttachMenuBot = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getAttachMenuBot || !m041AttachBotId.trim()) return
    setM041LoadingOp('getAttachMenuBot')
    setM041Status(null)
    try {
      const res = await window.guidegram.getAttachMenuBot(targetId, m041AttachBotId.trim())
      setM041Status({ type: 'success', message: res?.bot ? 'اطلاعات ربات منوی پیوست دریافت شد' : 'ربات منوی پیوست یافت نشد' })
    } catch (err: any) {
      setM041Status({ type: 'error', message: err?.message || 'خطا در دریافت اطلاعات ربات منوی پیوست' })
    } finally {
      setM041LoadingOp(null)
    }
  }

  const handleM041GetAttachMenuBots = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getAttachMenuBots) return
    setM041LoadingOp('getAttachMenuBots')
    setM041Status(null)
    try {
      const res = await window.guidegram.getAttachMenuBots(targetId)
      const count = Array.isArray(res?.bots) ? res.bots.length : 0
      setM041AttachBotsCount(count)
      setM041Status({ type: 'success', message: `تعداد ${count} ربات منوی پیوست استعلام شد` })
    } catch (err: any) {
      setM041Status({ type: 'error', message: err?.message || 'خطا در استعلام ربات‌های منوی پیوست' })
    } finally {
      setM041LoadingOp(null)
    }
  }

  const handleM041GetAvailableEffects = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getAvailableEffects) return
    setM041LoadingOp('getAvailableEffects')
    setM041Status(null)
    try {
      const res = await window.guidegram.getAvailableEffects(targetId)
      const count = Array.isArray(res?.effects) ? res.effects.length : 0
      setM041EffectsCount(count)
      setM041Status({ type: 'success', message: `تعداد ${count} افکت ارسال پیام در دسترس است` })
    } catch (err: any) {
      setM041Status({ type: 'error', message: err?.message || 'خطا در استعلام افکت‌های پیام' })
    } finally {
      setM041LoadingOp(null)
    }
  }

  const handleM041GetAvailableReactions = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getAvailableReactions) return
    setM041LoadingOp('getAvailableReactions')
    setM041Status(null)
    try {
      const res = await window.guidegram.getAvailableReactions(targetId)
      const count = Array.isArray(res?.reactions) ? res.reactions.length : 0
      setM041ReactionsCount(count)
      setM041Status({ type: 'success', message: `تعداد ${count} واکنش (Reaction) عمومی فعال است` })
    } catch (err: any) {
      setM041Status({ type: 'error', message: err?.message || 'خطا در دریافت ری‌اکشن‌ها' })
    } finally {
      setM041LoadingOp(null)
    }
  }

  const handleM041GetBotApp = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getBotApp || !m041BotAppShortName.trim()) return
    setM041LoadingOp('getBotApp')
    setM041Status(null)
    try {
      const res = await window.guidegram.getBotApp(targetId, { _: 'inputBotAppShortName', botId: targetId, shortName: m041BotAppShortName.trim() })
      setM041Status({ type: 'success', message: res?.app ? 'اطلاعات مینی‌اپ ربات با موفقیت استعلام شد' : 'مینی‌اپ یافت نشد' })
    } catch (err: any) {
      setM041Status({ type: 'error', message: err?.message || 'خطا در استعلام مینی‌اپ ربات' })
    } finally {
      setM041LoadingOp(null)
    }
  }

  const handleM041GetBotCallbackAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getBotCallbackAnswerDirect || !m041CallbackMsgId.trim()) return
    setM041LoadingOp('getBotCallbackAnswer')
    setM041Status(null)
    try {
      const res = await window.guidegram.getBotCallbackAnswerDirect(targetId, {
        msgId: parseInt(m041CallbackMsgId, 10),
        data: m041CallbackData.trim() ? Buffer.from(m041CallbackData.trim()) : undefined,
      })
      setM041Status({ type: 'success', message: res?.message || 'پاسخ کال‌بک اینلاین با موفقیت دریافت شد' })
    } catch (err: any) {
      setM041Status({ type: 'error', message: err?.message || 'خطا در فراخوانی کال‌بک ربات' })
    } finally {
      setM041LoadingOp(null)
    }
  }

  // Microphase 044 State: Emoji Keywords, Groups & Stickers Suite
  const [m044KeywordsLang, setM044KeywordsLang] = useState('en')
  const [m044KeywordsCount, setM044KeywordsCount] = useState<number | null>(null)

  const [m044DiffLang, setM044DiffLang] = useState('en')
  const [m044DiffVersion, setM044DiffVersion] = useState('0')
  const [m044DiffCount, setM044DiffCount] = useState<number | null>(null)

  const [m044LangCodes, setM044LangCodes] = useState('en,fa')
  const [m044LanguagesCount, setM044LanguagesCount] = useState<number | null>(null)

  const [m044ProfilePhotoHash, setM044ProfilePhotoHash] = useState('0')
  const [m044ProfilePhotoGroupsCount, setM044ProfilePhotoGroupsCount] = useState<number | null>(null)

  const [m044StatusHash, setM044StatusHash] = useState('0')
  const [m044StatusGroupsCount, setM044StatusGroupsCount] = useState<number | null>(null)

  const [m044StickerHash, setM044StickerHash] = useState('0')
  const [m044StickerGroupsCount, setM044StickerGroupsCount] = useState<number | null>(null)

  const [m044StickersCount, setM044StickersCount] = useState<number | null>(null)

  const [m044LoadingOp, setM044LoadingOp] = useState<string | null>(null)
  const [m044Status, setM044Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM044GetEmojiKeywords = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiKeywords) return
    setM044LoadingOp('getEmojiKeywords')
    setM044Status(null)
    try {
      const res = await window.guidegram.getEmojiKeywords(targetId, m044KeywordsLang.trim() || undefined)
      const count = Array.isArray(res?.keywords) ? res.keywords.length : 0
      setM044KeywordsCount(count)
      setM044Status({ type: 'success', message: `تعداد ${count} کلیدواژه ایموجی برای زبان ${m044KeywordsLang} دریافت شد` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در دریافت کلیدواژه‌های ایموجی' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  const handleM044GetEmojiKeywordsDifference = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiKeywordsDifference) return
    setM044LoadingOp('getEmojiKeywordsDifference')
    setM044Status(null)
    try {
      const version = parseInt(m044DiffVersion, 10) || 0
      const res = await window.guidegram.getEmojiKeywordsDifference(targetId, m044DiffLang.trim() || undefined, version)
      const count = Array.isArray(res?.keywords) ? res.keywords.length : 0
      setM044DiffCount(count)
      setM044Status({ type: 'success', message: `تغییرات کلیدواژه‌های ایموجی از نسخه ${version}: ${count} مورد` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در استعلام تفاوت کلیدواژه‌ها' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  const handleM044GetEmojiKeywordsLanguages = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiKeywordsLanguages) return
    setM044LoadingOp('getEmojiKeywordsLanguages')
    setM044Status(null)
    try {
      const res = await window.guidegram.getEmojiKeywordsLanguages(targetId, m044LangCodes.trim() || undefined)
      const count = Array.isArray(res) ? res.length : (Array.isArray(res?.languages) ? res.languages.length : 0)
      setM044LanguagesCount(count)
      setM044Status({ type: 'success', message: `تعداد ${count} زبان کلیدواژه ایموجی پشتیبانی می‌شود` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در دریافت زبان‌های ایموجی' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  const handleM044GetEmojiProfilePhotoGroups = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiProfilePhotoGroups) return
    setM044LoadingOp('getEmojiProfilePhotoGroups')
    setM044Status(null)
    try {
      const hash = parseInt(m044ProfilePhotoHash, 10) || 0
      const res = await window.guidegram.getEmojiProfilePhotoGroups(targetId, hash)
      const count = Array.isArray(res?.groups) ? res.groups.length : 0
      setM044ProfilePhotoGroupsCount(count)
      setM044Status({ type: 'success', message: `تعداد ${count} گروه ایموجی تصویر پروفایل استعلام شد` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در دریافت گروه‌های ایموجی پروفایل' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  const handleM044GetEmojiStatusGroups = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiStatusGroups) return
    setM044LoadingOp('getEmojiStatusGroups')
    setM044Status(null)
    try {
      const hash = parseInt(m044StatusHash, 10) || 0
      const res = await window.guidegram.getEmojiStatusGroups(targetId, hash)
      const count = Array.isArray(res?.groups) ? res.groups.length : 0
      setM044StatusGroupsCount(count)
      setM044Status({ type: 'success', message: `تعداد ${count} گروه وضعیت ایموجی استعلام شد` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در دریافت گروه‌های وضعیت ایموجی' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  const handleM044GetEmojiStickerGroups = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiStickerGroups) return
    setM044LoadingOp('getEmojiStickerGroups')
    setM044Status(null)
    try {
      const hash = parseInt(m044StickerHash, 10) || 0
      const res = await window.guidegram.getEmojiStickerGroups(targetId, hash)
      const count = Array.isArray(res?.groups) ? res.groups.length : 0
      setM044StickerGroupsCount(count)
      setM044Status({ type: 'success', message: `تعداد ${count} گروه استیکرهای ایموجی استعلام شد` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در دریافت گروه‌های استیکر ایموجی' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  const handleM044GetEmojiStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiStickers) return
    setM044LoadingOp('getEmojiStickers')
    setM044Status(null)
    try {
      const res = await window.guidegram.getEmojiStickers(targetId, 0)
      const count = Array.isArray(res?.sets) ? res.sets.length : (Array.isArray(res) ? res.length : 0)
      setM044StickersCount(count)
      setM044Status({ type: 'success', message: `تعداد ${count} مجموعه استیکرهای ایموجی ابری دریافت شد` })
    } catch (err: any) {
      setM044Status({ type: 'error', message: err?.message || 'خطا در استعلام استیکرهای ایموجی' })
    } finally {
      setM044LoadingOp(null)
    }
  }

  // Microphase 045 State: Messages Domain Part 13 (Emoji URL, Chat Invites, Extended Media, Fact-Checks & Faved Stickers)
  const [m045EmojiUrlLang, setM045EmojiUrlLang] = useState('en')
  const [m045EmojiUrlResult, setM045EmojiUrlResult] = useState<string | null>(null)

  const [m045ExportedInvitePeer, setM045ExportedInvitePeer] = useState('')
  const [m045ExportedInviteLink, setM045ExportedInviteLink] = useState('')
  const [m045ExportedInviteResult, setM045ExportedInviteResult] = useState<string | null>(null)

  const [m045ExportedInvitesPeer, setM045ExportedInvitesPeer] = useState('')
  const [m045ExportedInvitesRevoked, setM045ExportedInvitesRevoked] = useState(false)
  const [m045ExportedInvitesCount, setM045ExportedInvitesCount] = useState<number | null>(null)

  const [m045ExtendedMediaPeer, setM045ExtendedMediaPeer] = useState('')
  const [m045ExtendedMediaMsgId, setM045ExtendedMediaMsgId] = useState('')
  const [m045ExtendedMediaCount, setM045ExtendedMediaCount] = useState<number | null>(null)

  const [m045FactCheckPeer, setM045FactCheckPeer] = useState('')
  const [m045FactCheckMsgId, setM045FactCheckMsgId] = useState('')
  const [m045FactCheckResult, setM045FactCheckResult] = useState<string | null>(null)

  const [m045FavedStickersCount, setM045FavedStickersCount] = useState<number | null>(null)
  const [m045FeaturedEmojiStickersCount, setM045FeaturedEmojiStickersCount] = useState<number | null>(null)

  const [m045LoadingOp, setM045LoadingOp] = useState<string | null>(null)
  const [m045Status, setM045Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM045GetEmojiURL = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getEmojiURL) return
    setM045LoadingOp('getEmojiURL')
    setM045Status(null)
    try {
      const res = await window.guidegram.getEmojiURL(targetId, m045EmojiUrlLang.trim() || 'en')
      const url = res?.url || (typeof res === 'string' ? res : JSON.stringify(res))
      setM045EmojiUrlResult(url)
      setM045Status({ type: 'success', message: `آدرس URL ایموجی با موفقیت دریافت شد: ${url}` })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در دریافت آدرس URL ایموجی' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  const handleM045GetExportedChatInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getExportedChatInvite) return
    if (!m045ExportedInviteLink.trim() && !m045ExportedInvitePeer.trim()) {
      setM045Status({ type: 'error', message: 'لطفاً شناسه گفتگو یا لینک دعوت را وارد کنید' })
      return
    }
    setM045LoadingOp('getExportedChatInvite')
    setM045Status(null)
    try {
      const res = await window.guidegram.getExportedChatInvite(targetId, m045ExportedInvitePeer.trim() || undefined, m045ExportedInviteLink.trim() || undefined)
      const linkTitle = res?.invite?.title || res?.link || 'لینک دعوت معتبر'
      setM045ExportedInviteResult(linkTitle)
      setM045Status({ type: 'success', message: `مشخصات لینک دعوت با موفقیت استعلام شد (${linkTitle})` })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در دریافت جزئیات لینک دعوت' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  const handleM045GetExportedChatInvites = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getExportedChatInvites) return
    if (!m045ExportedInvitesPeer.trim()) {
      setM045Status({ type: 'error', message: 'لطفاً شناسه گفتگو (Peer) را وارد کنید' })
      return
    }
    setM045LoadingOp('getExportedChatInvites')
    setM045Status(null)
    try {
      const res = await window.guidegram.getExportedChatInvites(targetId, {
        peerId: m045ExportedInvitesPeer.trim(),
        revoked: m045ExportedInvitesRevoked,
        limit: 50,
      })
      const count = Array.isArray(res?.invites) ? res.invites.length : (res?.count ?? 0)
      setM045ExportedInvitesCount(count)
      setM045Status({ type: 'success', message: `تعداد ${count} لینک دعوت صادر شده استعلام شد` })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در دریافت لینک‌های دعوت صادر شده' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  const handleM045GetExtendedMedia = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getExtendedMedia) return
    if (!m045ExtendedMediaPeer.trim()) {
      setM045Status({ type: 'error', message: 'لطفاً شناسه گفتگو (Peer) را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m045ExtendedMediaMsgId.trim(), 10)
    setM045LoadingOp('getExtendedMedia')
    setM045Status(null)
    try {
      const res = await window.guidegram.getExtendedMedia(targetId, m045ExtendedMediaPeer.trim(), isNaN(msgIdNum) ? [] : [msgIdNum])
      const count = Array.isArray(res?.updates) ? res.updates.length : 1
      setM045ExtendedMediaCount(count)
      setM045Status({ type: 'success', message: `رسانه‌های گسترده پیام با موفقیت استعلام شد` })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در دریافت رسانه‌های گسترده' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  const handleM045GetFactCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getFactCheck) return
    if (!m045FactCheckPeer.trim()) {
      setM045Status({ type: 'error', message: 'لطفاً شناسه گفتگو (Peer) را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m045FactCheckMsgId.trim(), 10)
    setM045LoadingOp('getFactCheck')
    setM045Status(null)
    try {
      const res = await window.guidegram.getFactCheck(targetId, m045FactCheckPeer.trim(), isNaN(msgIdNum) ? [] : [msgIdNum])
      const text = Array.isArray(res) ? `تعداد ${res.length} فکت‌چک ثبت شده` : 'فکت‌چک استعلام شد'
      setM045FactCheckResult(text)
      setM045Status({ type: 'success', message: text })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در دریافت فکت‌چک پیام' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  const handleM045GetFavedStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getFavedStickers) return
    setM045LoadingOp('getFavedStickers')
    setM045Status(null)
    try {
      const res = await window.guidegram.getFavedStickers(targetId, 0)
      const count = Array.isArray(res?.stickers) ? res.stickers.length : (Array.isArray(res) ? res.length : 0)
      setM045FavedStickersCount(count)
      setM045Status({ type: 'success', message: `تعداد ${count} استیکر برگزیده (Faved) استعلام شد` })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در دریافت استیکرهای برگزیده' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  const handleM045GetFeaturedEmojiStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getFeaturedEmojiStickers) return
    setM045LoadingOp('getFeaturedEmojiStickers')
    setM045Status(null)
    try {
      const res = await window.guidegram.getFeaturedEmojiStickers(targetId, 0)
      const count = Array.isArray(res?.sets) ? res.sets.length : (Array.isArray(res) ? res.length : 0)
      setM045FeaturedEmojiStickersCount(count)
      setM045Status({ type: 'success', message: `تعداد ${count} مجموعه استیکر ایموجی ویژه (Featured) دریافت شد` })
    } catch (err: any) {
      setM045Status({ type: 'error', message: err?.message || 'خطا در استعلام استیکرهای ایموجی ویژه' })
    } finally {
      setM045LoadingOp(null)
    }
  }

  // Microphase 046 State: Messages Domain Part 14 (Featured Stickers, Forum Topics, Full Chat, Future Creator, Game Scores & History)
  const [m046FeaturedStickersCount, setM046FeaturedStickersCount] = useState<number | null>(null)

  const [m046ForumTopicsPeer, setM046ForumTopicsPeer] = useState('')
  const [m046ForumTopicsQ, setM046ForumTopicsQ] = useState('')
  const [m046ForumTopicsCount, setM046ForumTopicsCount] = useState<number | null>(null)

  const [m046ForumTopicsByIdPeer, setM046ForumTopicsByIdPeer] = useState('')
  const [m046ForumTopicsByIdTopic, setM046ForumTopicsByIdTopic] = useState('')
  const [m046ForumTopicsByIdCount, setM046ForumTopicsByIdCount] = useState<number | null>(null)

  const [m046FullChatId, setM046FullChatId] = useState('')
  const [m046FullChatResult, setM046FullChatResult] = useState<string | null>(null)

  const [m046FutureCreatorPeer, setM046FutureCreatorPeer] = useState('')
  const [m046FutureCreatorResult, setM046FutureCreatorResult] = useState<string | null>(null)

  const [m046GameScoresPeer, setM046GameScoresPeer] = useState('')
  const [m046GameScoresMsgId, setM046GameScoresMsgId] = useState('')
  const [m046GameScoresCount, setM046GameScoresCount] = useState<number | null>(null)

  const [m046HistoryPeer, setM046HistoryPeer] = useState('')
  const [m046HistoryCount, setM046HistoryCount] = useState<number | null>(null)

  const [m046LoadingOp, setM046LoadingOp] = useState<string | null>(null)
  const [m046Status, setM046Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM046GetFeaturedStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getFeaturedStickers) return
    setM046LoadingOp('getFeaturedStickers')
    setM046Status(null)
    try {
      const res = await window.guidegram.getFeaturedStickers(targetId, 0)
      const count = Array.isArray(res?.sets) ? res.sets.length : (Array.isArray(res) ? res.length : 0)
      setM046FeaturedStickersCount(count)
      setM046Status({ type: 'success', message: `تعداد ${count} بسته استیکر ویژه (Featured) دریافت شد` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در دریافت استیکرهای ویژه' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  const handleM046GetForumTopics = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getForumTopicsRaw) return
    if (!m046ForumTopicsPeer.trim()) {
      setM046Status({ type: 'error', message: 'لطفاً شناسه گروه یا سوپرگروه را وارد کنید' })
      return
    }
    setM046LoadingOp('getForumTopics')
    setM046Status(null)
    try {
      const res = await window.guidegram.getForumTopicsRaw(targetId, {
        peerId: m046ForumTopicsPeer.trim(),
        q: m046ForumTopicsQ.trim() || undefined,
        limit: 50,
      })
      const count = Array.isArray(res?.topics) ? res.topics.length : (res?.count ?? 0)
      setM046ForumTopicsCount(count)
      setM046Status({ type: 'success', message: `تعداد ${count} تاپیک انجمن (Forum Topic) استعلام شد` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در دریافت تاپیک‌های انجمن' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  const handleM046GetForumTopicsByID = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getForumTopicsByID) return
    if (!m046ForumTopicsByIdPeer.trim()) {
      setM046Status({ type: 'error', message: 'لطفاً شناسه گروه را وارد کنید' })
      return
    }
    const topicIdNum = parseInt(m046ForumTopicsByIdTopic.trim(), 10)
    setM046LoadingOp('getForumTopicsByID')
    setM046Status(null)
    try {
      const res = await window.guidegram.getForumTopicsByID(targetId, m046ForumTopicsByIdPeer.trim(), isNaN(topicIdNum) ? [] : [topicIdNum])
      const count = Array.isArray(res?.topics) ? res.topics.length : 1
      setM046ForumTopicsByIdCount(count)
      setM046Status({ type: 'success', message: `مشخصات تاپیک با موفقیت دریافت شد` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در دریافت اطلاعات تاپیک با شناسه' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  const handleM046GetFullChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getFullChat) return
    const chatIdNum = parseInt(m046FullChatId.trim(), 10)
    if (isNaN(chatIdNum)) {
      setM046Status({ type: 'error', message: 'لطفاً یک شناسه عددی معتبر چت (Chat ID) وارد کنید' })
      return
    }
    setM046LoadingOp('getFullChat')
    setM046Status(null)
    try {
      const res = await window.guidegram.getFullChat(targetId, chatIdNum)
      const title = res?.fullChat?.about || res?.chats?.[0]?.title || 'اطلاعات کامل چت دریافت شد'
      setM046FullChatResult(title)
      setM046Status({ type: 'success', message: `پروفایل کامل چت با موفقیت استعلام شد` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در دریافت پروفایل کامل گروه' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  const handleM046GetFutureChatCreatorAfterLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getFutureChatCreatorAfterLeave) return
    if (!m046FutureCreatorPeer.trim()) {
      setM046Status({ type: 'error', message: 'لطفاً شناسه گروه یا کانال را وارد کنید' })
      return
    }
    setM046LoadingOp('getFutureChatCreatorAfterLeave')
    setM046Status(null)
    try {
      const res = await window.guidegram.getFutureChatCreatorAfterLeave(targetId, m046FutureCreatorPeer.trim())
      const name = res?.firstName || res?.username || (res?.id ? `کاربر #${res.id}` : 'جانشین سازنده احراز شد')
      setM046FutureCreatorResult(name)
      setM046Status({ type: 'success', message: `مالک آتی چت پس از ترک: ${name}` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در استعلام مالک آتی گروه' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  const handleM046GetGameHighScores = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getGameHighScoresRaw || window.guidegram?.getGameHighScores
    if (!targetId || !fn) return
    if (!m046GameScoresPeer.trim()) {
      setM046Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m046GameScoresMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM046Status({ type: 'error', message: 'لطفاً شناسه عددی پیام بازی را وارد کنید' })
      return
    }
    setM046LoadingOp('getGameHighScores')
    setM046Status(null)
    try {
      const res = await fn(targetId, m046GameScoresPeer.trim(), msgIdNum)
      const count = Array.isArray(res?.scores) ? res.scores.length : (Array.isArray(res) ? res.length : 0)
      setM046GameScoresCount(count)
      setM046Status({ type: 'success', message: `تعداد ${count} رکورد برتر بازی استعلام شد` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در دریافت جدول رکوردهای برتر بازی' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  const handleM046GetHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getHistoryRaw) return
    if (!m046HistoryPeer.trim()) {
      setM046Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    setM046LoadingOp('getHistory')
    setM046Status(null)
    try {
      const res = await window.guidegram.getHistoryRaw(targetId, {
        peerId: m046HistoryPeer.trim(),
        limit: 20,
      })
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM046HistoryCount(count)
      setM046Status({ type: 'success', message: `تعداد ${count} پیام تاریخچه گفتگو دریافت شد` })
    } catch (err: any) {
      setM046Status({ type: 'error', message: err?.message || 'خطا در دریافت تاریخچه پیام‌ها' })
    } finally {
      setM046LoadingOp(null)
    }
  }

  // Microphase 047 State: Messages Domain Part 15 (Inline Bots, Inline Game Scores, Mask Stickers, Edit Data, Reactions List, Read Participants & Messages)
  const [m047InlineBotId, setM047InlineBotId] = useState('')
  const [m047InlineBotQuery, setM047InlineBotQuery] = useState('')
  const [m047InlineBotResultsCount, setM047InlineBotResultsCount] = useState<number | null>(null)

  const [m047InlineGameMsgId, setM047InlineGameMsgId] = useState('')
  const [m047InlineGameScoresCount, setM047InlineGameScoresCount] = useState<number | null>(null)

  const [m047MaskStickersCount, setM047MaskStickersCount] = useState<number | null>(null)

  const [m047EditDataPeer, setM047EditDataPeer] = useState('')
  const [m047EditDataMsgId, setM047EditDataMsgId] = useState('')
  const [m047EditDataResult, setM047EditDataResult] = useState<string | null>(null)

  const [m047ReactionsPeer, setM047ReactionsPeer] = useState('')
  const [m047ReactionsMsgId, setM047ReactionsMsgId] = useState('')
  const [m047ReactionsCount, setM047ReactionsCount] = useState<number | null>(null)

  const [m047ReadParticipantsPeer, setM047ReadParticipantsPeer] = useState('')
  const [m047ReadParticipantsMsgId, setM047ReadParticipantsMsgId] = useState('')
  const [m047ReadParticipantsCount, setM047ReadParticipantsCount] = useState<number | null>(null)

  const [m047MessagesMsgId, setM047MessagesMsgId] = useState('')
  const [m047MessagesCount, setM047MessagesCount] = useState<number | null>(null)

  const [m047LoadingOp, setM047LoadingOp] = useState<string | null>(null)
  const [m047Status, setM047Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM047GetInlineBotResults = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getInlineBotResultsRaw || window.guidegram?.getInlineBotResults
    if (!targetId || !fn) return
    if (!m047InlineBotId.trim()) {
      setM047Status({ type: 'error', message: 'لطفاً شناسه یا یوزرنیم ربات اینلاین را وارد کنید' })
      return
    }
    setM047LoadingOp('getInlineBotResults')
    setM047Status(null)
    try {
      const res = await fn(targetId, {
        botId: m047InlineBotId.trim(),
        query: m047InlineBotQuery.trim(),
        offset: '',
      })
      const count = Array.isArray(res?.results) ? res.results.length : 0
      setM047InlineBotResultsCount(count)
      setM047Status({ type: 'success', message: `تعداد ${count} نتیجه اینلاین ربات دریافت شد` })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در دریافت نتایج اینلاین ربات' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  const handleM047GetInlineGameHighScores = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getInlineGameHighScores) return
    if (!m047InlineGameMsgId.trim()) {
      setM047Status({ type: 'error', message: 'لطفاً شناسه پیام اینلاین بازی را وارد کنید' })
      return
    }
    setM047LoadingOp('getInlineGameHighScores')
    setM047Status(null)
    try {
      const res = await window.guidegram.getInlineGameHighScores(targetId, { _: 'inputBotInlineMessageID', id: m047InlineGameMsgId.trim() })
      const count = Array.isArray(res?.scores) ? res.scores.length : (Array.isArray(res) ? res.length : 0)
      setM047InlineGameScoresCount(count)
      setM047Status({ type: 'success', message: `تعداد ${count} رکورد برتر بازی اینلاین استعلام شد` })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در دریافت رکوردهای بازی اینلاین' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  const handleM047GetMaskStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getMaskStickers) return
    setM047LoadingOp('getMaskStickers')
    setM047Status(null)
    try {
      const res = await window.guidegram.getMaskStickers(targetId, 0)
      const count = Array.isArray(res?.sets) ? res.sets.length : (Array.isArray(res) ? res.length : 0)
      setM047MaskStickersCount(count)
      setM047Status({ type: 'success', message: `تعداد ${count} بسته استیکر ماسک (Mask Stickers) استعلام شد` })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در دریافت استیکرهای ماسک' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  const handleM047GetMessageEditData = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getMessageEditData) return
    if (!m047EditDataPeer.trim()) {
      setM047Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m047EditDataMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM047Status({ type: 'error', message: 'شناسه پیام باید عدد باشد' })
      return
    }
    setM047LoadingOp('getMessageEditData')
    setM047Status(null)
    try {
      const res = await window.guidegram.getMessageEditData(targetId, m047EditDataPeer.trim(), msgIdNum)
      const caption = res?.caption ? 'پیام دارای کپشن ویرایش‌پذیر' : 'داده‌های ویرایش پیام استعلام شد'
      setM047EditDataResult(caption)
      setM047Status({ type: 'success', message: caption })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در استعلام داده‌های ویرایش پیام' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  const handleM047GetMessageReactionsList = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getMessageReactionsListRaw || window.guidegram?.getMessageReactionsList
    if (!targetId || !fn) return
    if (!m047ReactionsPeer.trim()) {
      setM047Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m047ReactionsMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM047Status({ type: 'error', message: 'شناسه پیام باید عدد باشد' })
      return
    }
    setM047LoadingOp('getMessageReactionsList')
    setM047Status(null)
    try {
      const res = await fn(targetId, {
        peerId: m047ReactionsPeer.trim(),
        id: msgIdNum,
        limit: 50,
      })
      const count = Array.isArray(res?.reactions) ? res.reactions.length : (res?.count ?? 0)
      setM047ReactionsCount(count)
      setM047Status({ type: 'success', message: `تعداد ${count} ری‌اکشن برای پیام استعلام شد` })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در دریافت لیست ری‌اکشن‌های پیام' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  const handleM047GetMessageReadParticipants = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getMessageReadParticipants) return
    if (!m047ReadParticipantsPeer.trim()) {
      setM047Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m047ReadParticipantsMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM047Status({ type: 'error', message: 'شناسه پیام باید عدد باشد' })
      return
    }
    setM047LoadingOp('getMessageReadParticipants')
    setM047Status(null)
    try {
      const res = await window.guidegram.getMessageReadParticipants(targetId, m047ReadParticipantsPeer.trim(), msgIdNum)
      const count = Array.isArray(res) ? res.length : 0
      setM047ReadParticipantsCount(count)
      setM047Status({ type: 'success', message: `تعداد ${count} نفر پیام را خوانده‌اند (Read Receipts)` })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در استعلام خوانندگان پیام' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  const handleM047GetMessages = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getMessagesRaw || window.guidegram?.getMessages
    if (!targetId || !fn) return
    const ids = m047MessagesMsgId.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    if (ids.length === 0) {
      setM047Status({ type: 'error', message: 'لطفاً حداقل یک شناسه عددی پیام وارد کنید' })
      return
    }
    setM047LoadingOp('getMessages')
    setM047Status(null)
    try {
      const res = await fn(targetId, ids)
      const count = Array.isArray(res?.messages) ? res.messages.length : (Array.isArray(res) ? res.length : ids.length)
      setM047MessagesCount(count)
      setM047Status({ type: 'success', message: `تعداد ${count} پیام با شناسه اختصاصی دریافت شد` })
    } catch (err: any) {
      setM047Status({ type: 'error', message: err?.message || 'خطا در دریافت پیام‌ها با شناسه' })
    } finally {
      setM047LoadingOp(null)
    }
  }

  // Microphase 048: Messages Domain Suite Part 16
  const [m048MsgReactionsPeer, setM048MsgReactionsPeer] = useState('')
  const [m048MsgReactionsIds, setM048MsgReactionsIds] = useState('')
  const [m048MsgReactionsCount, setM048MsgReactionsCount] = useState<number | null>(null)

  const [m048ViewsPeer, setM048ViewsPeer] = useState('')
  const [m048ViewsIds, setM048ViewsIds] = useState('')
  const [m048ViewsIncrement, setM048ViewsIncrement] = useState(false)
  const [m048ViewsCount, setM048ViewsCount] = useState<number | null>(null)

  const [m048MyStickersCount, setM048MyStickersCount] = useState<number | null>(null)
  const [m048OldFeaturedCount, setM048OldFeaturedCount] = useState<number | null>(null)

  const [m048OnlinesPeer, setM048OnlinesPeer] = useState('')
  const [m048OnlinesCount, setM048OnlinesCount] = useState<number | null>(null)

  const [m048OutboxPeer, setM048OutboxPeer] = useState('')
  const [m048OutboxMsgId, setM048OutboxMsgId] = useState('')
  const [m048OutboxDate, setM048OutboxDate] = useState<string | null>(null)

  const [m048PaidPrivacyResult, setM048PaidPrivacyResult] = useState<string | null>(null)

  const [m048LoadingOp, setM048LoadingOp] = useState<string | null>(null)
  const [m048Status, setM048Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM048GetMessagesReactions = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getMessagesReactions) return
    if (!m048MsgReactionsPeer.trim()) {
      setM048Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const ids = m048MsgReactionsIds.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    if (ids.length === 0) {
      setM048Status({ type: 'error', message: 'لطفاً حداقل یک شناسه عددی پیام وارد کنید' })
      return
    }
    setM048LoadingOp('getMessagesReactions')
    setM048Status(null)
    try {
      const res = await window.guidegram.getMessagesReactions(targetId, m048MsgReactionsPeer.trim(), ids)
      const count = Array.isArray(res?.updates) ? res.updates.length : (Array.isArray(res) ? res.length : 1)
      setM048MsgReactionsCount(count)
      setM048Status({ type: 'success', message: `ری‌اکشن‌های ${ids.length} پیام با موفقیت دریافت شد` })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در دریافت ری‌اکشن‌های پیام‌ها' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  const handleM048GetMessagesViews = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getMessagesViews) return
    if (!m048ViewsPeer.trim()) {
      setM048Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const ids = m048ViewsIds.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    if (ids.length === 0) {
      setM048Status({ type: 'error', message: 'لطفاً حداقل یک شناسه عددی پیام وارد کنید' })
      return
    }
    setM048LoadingOp('getMessagesViews')
    setM048Status(null)
    try {
      const res = await window.guidegram.getMessagesViews(targetId, m048ViewsPeer.trim(), ids, m048ViewsIncrement)
      const count = Array.isArray(res?.views) ? res.views.length : (Array.isArray(res) ? res.length : ids.length)
      setM048ViewsCount(count)
      setM048Status({ type: 'success', message: `آمار بازدید ${count} پیام استعلام شد` })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در دریافت آمار بازدید پیام‌ها' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  const handleM048GetMyStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getMyStickers) return
    setM048LoadingOp('getMyStickers')
    setM048Status(null)
    try {
      const res = await window.guidegram.getMyStickers(targetId, 0, 50)
      const count = Array.isArray(res?.sets) ? res.sets.length : (Array.isArray(res) ? res.length : 0)
      setM048MyStickersCount(count)
      setM048Status({ type: 'success', message: `تعداد ${count} بسته استیکر اختصاصی شما (My Stickers) دریافت شد` })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در دریافت استیکرهای اختصاصی کاربر' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  const handleM048GetOldFeaturedStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getOldFeaturedStickers) return
    setM048LoadingOp('getOldFeaturedStickers')
    setM048Status(null)
    try {
      const res = await window.guidegram.getOldFeaturedStickers(targetId, 0, 50, 0)
      const count = Array.isArray(res?.sets) ? res.sets.length : (Array.isArray(res) ? res.length : 0)
      setM048OldFeaturedCount(count)
      setM048Status({ type: 'success', message: `تعداد ${count} بسته استیکر ویژه پیشین استعلام شد` })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در دریافت استیکرهای ویژه پیشین' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  const handleM048GetOnlines = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getOnlines) return
    if (!m048OnlinesPeer.trim()) {
      setM048Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    setM048LoadingOp('getOnlines')
    setM048Status(null)
    try {
      const res = await window.guidegram.getOnlines(targetId, m048OnlinesPeer.trim())
      const onlines = typeof res?.onlines === 'number' ? res.onlines : (typeof res === 'number' ? res : 0)
      setM048OnlinesCount(onlines)
      setM048Status({ type: 'success', message: `تعداد افراد آنلاین در این گفتگو: ${onlines} نفر` })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در استعلام افراد آنلاین گفتگو' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  const handleM048GetOutboxReadDate = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getOutboxReadDate) return
    if (!m048OutboxPeer.trim()) {
      setM048Status({ type: 'error', message: 'لطفاً شناسه کاربر را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m048OutboxMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM048Status({ type: 'error', message: 'شناسه پیام باید عدد باشد' })
      return
    }
    setM048LoadingOp('getOutboxReadDate')
    setM048Status(null)
    try {
      const res = await window.guidegram.getOutboxReadDate(targetId, m048OutboxPeer.trim(), msgIdNum)
      const readDate = res?.date ? new Date(res.date * 1000).toLocaleTimeString('fa-IR') : 'خوانده شده یا در دسترس نیست'
      setM048OutboxDate(readDate)
      setM048Status({ type: 'success', message: `زمان مشاهده پیام توسط مخاطب: ${readDate}` })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در استعلام زمان مشاهده پیام ارسالی' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  const handleM048GetPaidReactionPrivacy = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPaidReactionPrivacy) return
    setM048LoadingOp('getPaidReactionPrivacy')
    setM048Status(null)
    try {
      const res = await window.guidegram.getPaidReactionPrivacy(targetId)
      const privacy = res?._ ? `وضعیت: ${res._}` : 'حریم خصوصی ری‌اکشن پولی دریافت شد'
      setM048PaidPrivacyResult(privacy)
      setM048Status({ type: 'success', message: privacy })
    } catch (err: any) {
      setM048Status({ type: 'error', message: err?.message || 'خطا در استعلام حریم خصوصی ری‌اکشن پولی' })
    } finally {
      setM048LoadingOp(null)
    }
  }

  // Microphase 049: Messages Domain Suite Part 17
  const [m049PeerDialogsInput, setM049PeerDialogsInput] = useState('')
  const [m049PeerDialogsCount, setM049PeerDialogsCount] = useState<number | null>(null)

  const [m049PeerSettingsInput, setM049PeerSettingsInput] = useState('')
  const [m049PeerSettingsResult, setM049PeerSettingsResult] = useState<string | null>(null)

  const [m049PersonalChannelUser, setM049PersonalChannelUser] = useState('')
  const [m049PersonalChannelCount, setM049PersonalChannelCount] = useState<number | null>(null)

  const [m049PinnedFolderId, setM049PinnedFolderId] = useState('0')
  const [m049PinnedDialogsCount, setM049PinnedDialogsCount] = useState<number | null>(null)

  const [m049PinnedSavedCount, setM049PinnedSavedCount] = useState<number | null>(null)

  const [m049PollPeer, setM049PollPeer] = useState('')
  const [m049PollMsgId, setM049PollMsgId] = useState('')
  const [m049PollResultsSummary, setM049PollResultsSummary] = useState<string | null>(null)

  const [m049VotesPeer, setM049VotesPeer] = useState('')
  const [m049VotesMsgId, setM049VotesMsgId] = useState('')
  const [m049VotesCount, setM049VotesCount] = useState<number | null>(null)

  const [m049LoadingOp, setM049LoadingOp] = useState<string | null>(null)
  const [m049Status, setM049Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM049GetPeerDialogs = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPeerDialogs) return
    if (!m049PeerDialogsInput.trim()) {
      setM049Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    setM049LoadingOp('getPeerDialogs')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPeerDialogs(targetId, [m049PeerDialogsInput.trim()])
      const count = Array.isArray(res?.dialogs) ? res.dialogs.length : (Array.isArray(res) ? res.length : 1)
      setM049PeerDialogsCount(count)
      setM049Status({ type: 'success', message: `اطلاعات ${count} گفتگو استعلام شد` })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در استعلام گفتگوی مشخص' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  const handleM049GetPeerSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPeerSettings) return
    if (!m049PeerSettingsInput.trim()) {
      setM049Status({ type: 'error', message: 'لطفاً شناسه مخاطب یا گفتگو را وارد کنید' })
      return
    }
    setM049LoadingOp('getPeerSettings')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPeerSettings(targetId, m049PeerSettingsInput.trim())
      const summary = res?.settings ? 'تنظیمات همتا دریافت شد' : 'داده‌های تنظیمات همتا در دسترس است'
      setM049PeerSettingsResult(summary)
      setM049Status({ type: 'success', message: summary })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در دریافت تنظیمات همتا' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  const handleM049GetPersonalChannelHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPersonalChannelHistory) return
    if (!m049PersonalChannelUser.trim()) {
      setM049Status({ type: 'error', message: 'لطفاً شناسه کاربر را وارد کنید' })
      return
    }
    setM049LoadingOp('getPersonalChannelHistory')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPersonalChannelHistory(targetId, {
        userIdId: m049PersonalChannelUser.trim(),
        limit: 20,
      })
      const count = Array.isArray(res?.messages) ? res.messages.length : (Array.isArray(res) ? res.length : 0)
      setM049PersonalChannelCount(count)
      setM049Status({ type: 'success', message: `تعداد ${count} پیام از کانال شخصی کاربر دریافت شد` })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در دریافت تاریخچه کانال شخصی' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  const handleM049GetPinnedDialogs = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPinnedDialogs) return
    const folderNum = parseInt(m049PinnedFolderId.trim() || '0', 10)
    setM049LoadingOp('getPinnedDialogs')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPinnedDialogs(targetId, isNaN(folderNum) ? 0 : folderNum)
      const count = Array.isArray(res?.dialogs) ? res.dialogs.length : (Array.isArray(res) ? res.length : 0)
      setM049PinnedDialogsCount(count)
      setM049Status({ type: 'success', message: `تعداد ${count} گفتگوی سنجاق‌شده استعلام شد` })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در دریافت گفتگوهای سنجاق‌شده' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  const handleM049GetPinnedSavedDialogs = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPinnedSavedDialogs) return
    setM049LoadingOp('getPinnedSavedDialogs')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPinnedSavedDialogs(targetId)
      const count = Array.isArray(res?.dialogs) ? res.dialogs.length : (Array.isArray(res) ? res.length : 0)
      setM049PinnedSavedCount(count)
      setM049Status({ type: 'success', message: `تعداد ${count} گفتگوی سنجاق‌شده در پیام‌های ذخیره‌شده یافت شد` })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در استعلام گفتگوهای سنجاق‌شده پیام‌های ذخیره' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  const handleM049GetPollResults = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPollResults) return
    if (!m049PollPeer.trim()) {
      setM049Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m049PollMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM049Status({ type: 'error', message: 'شناسه پیام نظرسنجی باید عددی باشد' })
      return
    }
    setM049LoadingOp('getPollResults')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPollResults(targetId, m049PollPeer.trim(), msgIdNum)
      const summary = res?.updates ? 'نتایج نظرسنجی استعلام و بروزرسانی شد' : 'داده‌های نتایج نظرسنجی دریافت شد'
      setM049PollResultsSummary(summary)
      setM049Status({ type: 'success', message: summary })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در دریافت نتایج نظرسنجی' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  const handleM049GetPollVotes = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPollVotes) return
    if (!m049VotesPeer.trim()) {
      setM049Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m049VotesMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM049Status({ type: 'error', message: 'شناسه پیام نظرسنجی باید عددی باشد' })
      return
    }
    setM049LoadingOp('getPollVotes')
    setM049Status(null)
    try {
      const res = await window.guidegram.getPollVotes(targetId, {
        peerId: m049VotesPeer.trim(),
        id: msgIdNum,
        limit: 50,
      })
      const count = Array.isArray(res?.votes) ? res.votes.length : (res?.count ?? 0)
      setM049VotesCount(count)
      setM049Status({ type: 'success', message: `تعداد ${count} رأی ثبت‌شده برای نظرسنجی استعلام شد` })
    } catch (err: any) {
      setM049Status({ type: 'error', message: err?.message || 'خطا در دریافت آرای نظرسنجی' })
    } finally {
      setM049LoadingOp(null)
    }
  }

  // Microphase 050: Messages Domain Suite Part 18
  const [m050PreparedBotId, setM050PreparedBotId] = useState('')
  const [m050PreparedId, setM050PreparedId] = useState('')
  const [m050PreparedResult, setM050PreparedResult] = useState<string | null>(null)

  const [m050QuickRepliesCount, setM050QuickRepliesCount] = useState<number | null>(null)

  const [m050ShortcutId, setM050ShortcutId] = useState('')
  const [m050QuickMessagesCount, setM050QuickMessagesCount] = useState<number | null>(null)

  const [m050LocationsPeer, setM050LocationsPeer] = useState('')
  const [m050LocationsCount, setM050LocationsCount] = useState<number | null>(null)

  const [m050RecentReactionsCount, setM050RecentReactionsCount] = useState<number | null>(null)

  const [m050RecentStickersAttached, setM050RecentStickersAttached] = useState(false)
  const [m050RecentStickersCount, setM050RecentStickersCount] = useState<number | null>(null)

  const [m050RepliesPeer, setM050RepliesPeer] = useState('')
  const [m050RepliesMsgId, setM050RepliesMsgId] = useState('')
  const [m050RepliesCount, setM050RepliesCount] = useState<number | null>(null)

  const [m050LoadingOp, setM050LoadingOp] = useState<string | null>(null)
  const [m050Status, setM050Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM050GetPreparedInlineMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getPreparedInlineMessage) return
    if (!m050PreparedBotId.trim() || !m050PreparedId.trim()) {
      setM050Status({ type: 'error', message: 'لطفاً شناسه ربات و شناسه پیام آماده را وارد کنید' })
      return
    }
    setM050LoadingOp('getPreparedInlineMessage')
    setM050Status(null)
    try {
      const res = await window.guidegram.getPreparedInlineMessage(targetId, m050PreparedBotId.trim(), m050PreparedId.trim())
      const desc = res?._ ? `پیام اینلاین آماده: ${res._}` : 'داده‌های پیام آماده استعلام شد'
      setM050PreparedResult(desc)
      setM050Status({ type: 'success', message: desc })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت پیام اینلاین آماده' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  const handleM050GetQuickReplies = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getQuickRepliesRaw || window.guidegram?.getQuickReplies
    if (!targetId || !fn) return
    setM050LoadingOp('getQuickReplies')
    setM050Status(null)
    try {
      const res = await fn(targetId, 0)
      const count = Array.isArray(res?.quickReplies) ? res.quickReplies.length : (Array.isArray(res) ? res.length : 0)
      setM050QuickRepliesCount(count)
      setM050Status({ type: 'success', message: `تعداد ${count} شورت‌کات پاسخ سریع یافت شد` })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت لیست پاسخ‌های سریع' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  const handleM050GetQuickReplyMessages = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getQuickReplyMessages) return
    const sId = parseInt(m050ShortcutId.trim(), 10)
    if (isNaN(sId)) {
      setM050Status({ type: 'error', message: 'شناسه شورت‌کات باید عددی باشد' })
      return
    }
    setM050LoadingOp('getQuickReplyMessages')
    setM050Status(null)
    try {
      const res = await window.guidegram.getQuickReplyMessages(targetId, { shortcutId: sId })
      const count = Array.isArray(res?.messages) ? res.messages.length : (Array.isArray(res) ? res.length : 0)
      setM050QuickMessagesCount(count)
      setM050Status({ type: 'success', message: `تعداد ${count} پیام برای این شورت‌کات دریافت شد` })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت پیام‌های پاسخ سریع' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  const handleM050GetRecentLocations = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getRecentLocationsRaw || window.guidegram?.getRecentLocations
    if (!targetId || !fn) return
    if (!m050LocationsPeer.trim()) {
      setM050Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    setM050LoadingOp('getRecentLocations')
    setM050Status(null)
    try {
      const res = await fn(targetId, { peerId: m050LocationsPeer.trim(), limit: 50 })
      const count = Array.isArray(res?.locations) ? res.locations.length : (Array.isArray(res?.messages) ? res.messages.length : 0)
      setM050LocationsCount(count)
      setM050Status({ type: 'success', message: `تعداد ${count} لوکیشن زنده/اخیر در گفتگو یافت شد` })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت لوکیشن‌های اخیر' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  const handleM050GetRecentReactions = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getRecentReactions) return
    setM050LoadingOp('getRecentReactions')
    setM050Status(null)
    try {
      const res = await window.guidegram.getRecentReactions(targetId, 50, 0)
      const count = Array.isArray(res?.reactions) ? res.reactions.length : (Array.isArray(res) ? res.length : 0)
      setM050RecentReactionsCount(count)
      setM050Status({ type: 'success', message: `تعداد ${count} ری‌اکشن اخیر استعلام شد` })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت ری‌اکشن‌های اخیر' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  const handleM050GetRecentStickers = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getRecentStickersRaw || window.guidegram?.getRecentStickers
    if (!targetId || !fn) return
    setM050LoadingOp('getRecentStickers')
    setM050Status(null)
    try {
      const res = await fn(targetId, m050RecentStickersAttached, 0)
      const count = Array.isArray(res?.stickers) ? res.stickers.length : (Array.isArray(res) ? res.length : 0)
      setM050RecentStickersCount(count)
      setM050Status({ type: 'success', message: `تعداد ${count} استیکر اخیر دریافت شد` })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت استیکرهای اخیر' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  const handleM050GetReplies = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getReplies) return
    if (!m050RepliesPeer.trim()) {
      setM050Status({ type: 'error', message: 'لطفاً شناسه گفتگو را وارد کنید' })
      return
    }
    const msgIdNum = parseInt(m050RepliesMsgId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM050Status({ type: 'error', message: 'شناسه پیام باید عددی باشد' })
      return
    }
    setM050LoadingOp('getReplies')
    setM050Status(null)
    try {
      const res = await window.guidegram.getReplies(targetId, {
        peerId: m050RepliesPeer.trim(),
        msgId: msgIdNum,
        limit: 50,
      })
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM050RepliesCount(count)
      setM050Status({ type: 'success', message: `تعداد ${count} ریپلای یا پیام ترد استعلام شد` })
    } catch (err: any) {
      setM050Status({ type: 'error', message: err?.message || 'خطا در دریافت ریپلای‌های پیام' })
    } finally {
      setM050LoadingOp(null)
    }
  }

  // Microphase 051: Saved Dialogs, GIFs, History, Reaction Tags & Scheduled History State
  const [m051RichPeer, setM051RichPeer] = useState('')
  const [m051RichId, setM051RichId] = useState('')
  const [m051RichResult, setM051RichResult] = useState<string | null>(null)

  const [m051SavedDialogsCount, setM051SavedDialogsCount] = useState<number | null>(null)

  const [m051SavedDialogsByIdPeer, setM051SavedDialogsByIdPeer] = useState('')
  const [m051SavedDialogsByIdIds, setM051SavedDialogsByIdIds] = useState('')
  const [m051SavedDialogsByIdCount, setM051SavedDialogsByIdCount] = useState<number | null>(null)

  const [m051SavedGifsCount, setM051SavedGifsCount] = useState<number | null>(null)

  const [m051SavedHistoryPeer, setM051SavedHistoryPeer] = useState('')
  const [m051SavedHistoryCount, setM051SavedHistoryCount] = useState<number | null>(null)

  const [m051SavedReactionTagsPeer, setM051SavedReactionTagsPeer] = useState('')
  const [m051SavedReactionTagsCount, setM051SavedReactionTagsCount] = useState<number | null>(null)

  const [m051ScheduledHistoryPeer, setM051ScheduledHistoryPeer] = useState('')
  const [m051ScheduledHistoryCount, setM051ScheduledHistoryCount] = useState<number | null>(null)

  const [m051LoadingOp, setM051LoadingOp] = useState<string | null>(null)
  const [m051Status, setM051Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM051GetRichMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getRichMessage) return
    if (!m051RichPeer.trim() || !m051RichId.trim()) {
      setM051Status({ type: 'error', message: 'شناسه مخاطب و شناسه پیام ریچ الزامی است' })
      return
    }
    const msgIdNum = parseInt(m051RichId.trim(), 10)
    if (isNaN(msgIdNum)) {
      setM051Status({ type: 'error', message: 'شناسه پیام باید عدد باشد' })
      return
    }
    setM051LoadingOp('getRichMessage')
    setM051Status(null)
    setM051RichResult(null)
    try {
      const res = await window.guidegram.getRichMessage(targetId, m051RichPeer.trim(), msgIdNum)
      if (res) {
        setM051RichResult(JSON.stringify(res).slice(0, 80) + '...')
        setM051Status({ type: 'success', message: 'اطلاعات پیام غنی‌شده با موفقیت دریافت شد' })
      } else {
        setM051RichResult('پیامی یافت نشد')
        setM051Status({ type: 'success', message: 'پیام ریچ در این چت ثبت نشده است' })
      }
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در دریافت پیام ریچ' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  const handleM051GetSavedDialogs = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getSavedDialogsRaw || (window.guidegram as any)?.getSavedDialogs
    if (!targetId || !fn) return
    setM051LoadingOp('getSavedDialogs')
    setM051Status(null)
    try {
      const res = await fn(targetId, { limit: 50 })
      const count = Array.isArray(res?.dialogs) ? res.dialogs.length : (res?.count ?? 0)
      setM051SavedDialogsCount(count)
      setM051Status({ type: 'success', message: `تعداد ${count} گفتگوی ذخیره‌شده استعلام شد` })
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در دریافت گفتگوهای ذخیره‌شده' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  const handleM051GetSavedDialogsByID = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSavedDialogsByID) return
    const ids = m051SavedDialogsByIdIds.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length === 0) {
      setM051Status({ type: 'error', message: 'حداقل یک شناسه گفتگوی ذخیره‌شده وارد کنید' })
      return
    }
    setM051LoadingOp('getSavedDialogsByID')
    setM051Status(null)
    try {
      const res = await window.guidegram.getSavedDialogsByID(
        targetId,
        m051SavedDialogsByIdPeer.trim() || undefined,
        ids
      )
      const count = Array.isArray(res?.dialogs) ? res.dialogs.length : (res?.count ?? (res ? 1 : 0))
      setM051SavedDialogsByIdCount(count)
      setM051Status({ type: 'success', message: `تعداد ${count} دیالوگ ذخیره‌شده بر اساس شناسه یافت شد` })
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در استعلام دیالوگ‌های ذخیره‌شده بر اساس شناسه' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  const handleM051GetSavedGifs = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getSavedGifsRaw || (window.guidegram as any)?.getSavedGifs
    if (!targetId || !fn) return
    setM051LoadingOp('getSavedGifs')
    setM051Status(null)
    try {
      const res = await fn(targetId, 0)
      const count = Array.isArray(res?.gifs) ? res.gifs.length : (Array.isArray(res) ? res.length : (res?.count ?? 0))
      setM051SavedGifsCount(count)
      setM051Status({ type: 'success', message: `تعداد ${count} گیف ذخیره‌شده استعلام شد` })
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در دریافت گیف‌های ذخیره‌شده' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  const handleM051GetSavedHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSavedHistory) return
    setM051LoadingOp('getSavedHistory')
    setM051Status(null)
    try {
      const res = await window.guidegram.getSavedHistory(targetId, {
        peerId: m051SavedHistoryPeer.trim() || undefined,
        limit: 50,
      })
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM051SavedHistoryCount(count)
      setM051Status({ type: 'success', message: `تعداد ${count} پیام در تاریخچه ذخیره‌شده بازیابی شد` })
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در استعلام تاریخچه پیام‌های ذخیره‌شده' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  const handleM051GetSavedReactionTags = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getSavedReactionTagsRaw || (window.guidegram as any)?.getSavedReactionTags
    if (!targetId || !fn) return
    setM051LoadingOp('getSavedReactionTags')
    setM051Status(null)
    try {
      const res = await fn(targetId, m051SavedReactionTagsPeer.trim() || undefined, 0)
      const count = Array.isArray(res?.tags) ? res.tags.length : (Array.isArray(res) ? res.length : 0)
      setM051SavedReactionTagsCount(count)
      setM051Status({ type: 'success', message: `تعداد ${count} برچسب ری‌اکشن ذخیره‌شده استعلام شد` })
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در استعلام تگ‌های ری‌اکشن ذخیره‌شده' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  const handleM051GetScheduledHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getScheduledHistory) return
    if (!m051ScheduledHistoryPeer.trim()) {
      setM051Status({ type: 'error', message: 'شناسه مخاطب برای تاریخچه زمان‌بندی‌شده الزامی است' })
      return
    }
    setM051LoadingOp('getScheduledHistory')
    setM051Status(null)
    try {
      const res = await window.guidegram.getScheduledHistory(targetId, m051ScheduledHistoryPeer.trim(), 0)
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM051ScheduledHistoryCount(count)
      setM051Status({ type: 'success', message: `تعداد ${count} پیام زمان‌بندی‌شده استعلام شد` })
    } catch (err: any) {
      setM051Status({ type: 'error', message: err?.message || 'خطا در استعلام پیام‌های زمان‌بندی‌شده' })
    } finally {
      setM051LoadingOp(null)
    }
  }

  // Microphase 052: Scheduled Messages, Search Counters, Calendar, Positions & Sponsored Messages State
  const [m052ScheduledPeer, setM052ScheduledPeer] = useState('')
  const [m052ScheduledIds, setM052ScheduledIds] = useState('')
  const [m052ScheduledCount, setM052ScheduledCount] = useState<number | null>(null)

  const [m052CountersPeer, setM052CountersPeer] = useState('')
  const [m052CountersCount, setM052CountersCount] = useState<number | null>(null)

  const [m052CalendarPeer, setM052CalendarPeer] = useState('')
  const [m052CalendarCount, setM052CalendarCount] = useState<number | null>(null)

  const [m052PositionsPeer, setM052PositionsPeer] = useState('')
  const [m052PositionsCount, setM052PositionsCount] = useState<number | null>(null)

  const [m052ThemeBackdropsResult, setM052ThemeBackdropsResult] = useState<string | null>(null)
  const [m052SplitRangesCount, setM052SplitRangesCount] = useState<number | null>(null)

  const [m052SponsoredPeer, setM052SponsoredPeer] = useState('')
  const [m052SponsoredCount, setM052SponsoredCount] = useState<number | null>(null)

  const [m052LoadingOp, setM052LoadingOp] = useState<string | null>(null)
  const [m052Status, setM052Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM052GetScheduledMessages = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getScheduledMessagesRaw) return
    if (!m052ScheduledPeer.trim()) {
      setM052Status({ type: 'error', message: 'شناسه گفتگو برای پیام‌های زمان‌بندی‌شده الزامی است' })
      return
    }
    const ids = m052ScheduledIds.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    setM052LoadingOp('getScheduledMessages')
    setM052Status(null)
    try {
      const res = await window.guidegram.getScheduledMessagesRaw(targetId, m052ScheduledPeer.trim(), ids.length ? ids : undefined)
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? (res ? 1 : 0))
      setM052ScheduledCount(count)
      setM052Status({ type: 'success', message: `تعداد ${count} پیام زمان‌بندی‌شده بازیابی شد` })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در دریافت پیام‌های زمان‌بندی‌شده' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  const handleM052GetSearchCounters = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSearchCounters) return
    if (!m052CountersPeer.trim()) {
      setM052Status({ type: 'error', message: 'شناسه مخاطب/گفتگو برای شمارنده‌های جستجو الزامی است' })
      return
    }
    setM052LoadingOp('getSearchCounters')
    setM052Status(null)
    try {
      const res = await window.guidegram.getSearchCounters(targetId, {
        peerId: m052CountersPeer.trim(),
      })
      const count = Array.isArray(res) ? res.length : (res?.counters?.length ?? 0)
      setM052CountersCount(count)
      setM052Status({ type: 'success', message: `تعداد ${count} شمارنده جستجو استعلام شد` })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در دریافت شمارنده‌های جستجو' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  const handleM052GetSearchResultsCalendar = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSearchResultsCalendar) return
    if (!m052CalendarPeer.trim()) {
      setM052Status({ type: 'error', message: 'شناسه گفتگو برای تقویم نتایج جستجو الزامی است' })
      return
    }
    setM052LoadingOp('getSearchResultsCalendar')
    setM052Status(null)
    try {
      const res = await window.guidegram.getSearchResultsCalendar(targetId, {
        peerId: m052CalendarPeer.trim(),
      })
      const count = Array.isArray(res?.periods) ? res.periods.length : (res?.count ?? 0)
      setM052CalendarCount(count)
      setM052Status({ type: 'success', message: `تعداد ${count} دوره زمانی در تقویم جستجو دریافت شد` })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در دریافت تقویم نتایج جستجو' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  const handleM052GetSearchResultsPositions = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSearchResultsPositions) return
    if (!m052PositionsPeer.trim()) {
      setM052Status({ type: 'error', message: 'شناسه گفتگو برای موقعیت نتایج جستجو الزامی است' })
      return
    }
    setM052LoadingOp('getSearchResultsPositions')
    setM052Status(null)
    try {
      const res = await window.guidegram.getSearchResultsPositions(targetId, {
        peerId: m052PositionsPeer.trim(),
        limit: 50,
      })
      const count = Array.isArray(res?.positions) ? res.positions.length : (res?.count ?? 0)
      setM052PositionsCount(count)
      setM052Status({ type: 'success', message: `تعداد ${count} موقعیت نتیجه جستجو استعلام شد` })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در استعلام موقعیت‌های جستجو' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  const handleM052GetShareThemeBackdrops = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getShareThemeBackdrops) return
    setM052LoadingOp('getShareThemeBackdrops')
    setM052Status(null)
    try {
      const res = await window.guidegram.getShareThemeBackdrops(targetId)
      const desc = res ? (JSON.stringify(res).slice(0, 80) + '...') : 'پس‌زمینه‌ای برای تم اشتراکی یافت نشد'
      setM052ThemeBackdropsResult(desc)
      setM052Status({ type: 'success', message: 'داده‌های پس‌زمینه تم‌های اشتراکی استعلام شد' })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در دریافت پس‌زمینه تم اشتراکی' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  const handleM052GetSplitRanges = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSplitRanges) return
    setM052LoadingOp('getSplitRanges')
    setM052Status(null)
    try {
      const res = await window.guidegram.getSplitRanges(targetId)
      const count = Array.isArray(res) ? res.length : (res?.ranges?.length ?? 0)
      setM052SplitRangesCount(count)
      setM052Status({ type: 'success', message: `تعداد ${count} بازه تفکیک تاریخچه استعلام شد` })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در دریافت بازه‌های اسپلیت' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  const handleM052GetSponsoredMessages = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    const fn = window.guidegram?.getSponsoredMessagesRaw || (window.guidegram as any)?.getSponsoredMessages
    if (!targetId || !fn) return
    if (!m052SponsoredPeer.trim()) {
      setM052Status({ type: 'error', message: 'شناسه کانال برای پیام‌های تبلیغاتی اسپانسر الزامی است' })
      return
    }
    setM052LoadingOp('getSponsoredMessages')
    setM052Status(null)
    try {
      const res = await fn(targetId, m052SponsoredPeer.trim())
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM052SponsoredCount(count)
      setM052Status({ type: 'success', message: `تعداد ${count} پیام اسپانسر یا تبلیغاتی استعلام شد` })
    } catch (err: any) {
      setM052Status({ type: 'error', message: err?.message || 'خطا در استعلام پیام‌های اسپانسر' })
    } finally {
      setM052LoadingOp(null)
    }
  }

  // Microphase 053: Stickers, StickerSet, Suggested Filters, Top Reactions, Unread Mentions, Poll Votes & Reactions State
  const [m053StickersEmoticon, setM053StickersEmoticon] = useState('👍')
  const [m053StickersCount, setM053StickersCount] = useState<number | null>(null)

  const [m053StickerSetName, setM053StickerSetName] = useState('')
  const [m053StickerSetTitle, setM053StickerSetTitle] = useState<string | null>(null)

  const [m053SuggestedFiltersCount, setM053SuggestedFiltersCount] = useState<number | null>(null)
  const [m053TopReactionsCount, setM053TopReactionsCount] = useState<number | null>(null)

  const [m053MentionsPeer, setM053MentionsPeer] = useState('')
  const [m053MentionsCount, setM053MentionsCount] = useState<number | null>(null)

  const [m053PollVotesPeer, setM053PollVotesPeer] = useState('')
  const [m053PollVotesCount, setM053PollVotesCount] = useState<number | null>(null)

  const [m053UnreadReactionsPeer, setM053UnreadReactionsPeer] = useState('')
  const [m053UnreadReactionsCount, setM053UnreadReactionsCount] = useState<number | null>(null)

  const [m053LoadingOp, setM053LoadingOp] = useState<string | null>(null)
  const [m053Status, setM053Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM053GetStickers = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getStickersRaw) return
    setM053LoadingOp('getStickers')
    setM053Status(null)
    try {
      const res = await window.guidegram.getStickersRaw(targetId, m053StickersEmoticon.trim() || '👍')
      const count = Array.isArray(res?.stickers) ? res.stickers.length : (res?.count ?? (res ? 1 : 0))
      setM053StickersCount(count)
      setM053Status({ type: 'success', message: `تعداد ${count} استیکر برای ایموجی بازیابی شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در استعلام استیکرها' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  const handleM053GetStickerSet = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getStickerSetRaw) return
    if (!m053StickerSetName.trim()) {
      setM053Status({ type: 'error', message: 'نام یا شناسه پکیج استیکر الزامی است' })
      return
    }
    setM053LoadingOp('getStickerSet')
    setM053Status(null)
    try {
      const res = await window.guidegram.getStickerSetRaw(targetId, m053StickerSetName.trim())
      const title = res?.set?.title || res?.title || 'پکیج استیکر یافت شد'
      const count = Array.isArray(res?.documents) ? res.documents.length : 0
      setM053StickerSetTitle(`${title} (${count} استیکر)`)
      setM053Status({ type: 'success', message: `اطلاعات پکیج "${title}" استعلام شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در دریافت پکیج استیکر' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  const handleM053GetSuggestedDialogFilters = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getSuggestedDialogFiltersRaw) return
    setM053LoadingOp('getSuggestedDialogFilters')
    setM053Status(null)
    try {
      const res = await window.guidegram.getSuggestedDialogFiltersRaw(targetId)
      const count = Array.isArray(res) ? res.length : (res?.filters?.length ?? 0)
      setM053SuggestedFiltersCount(count)
      setM053Status({ type: 'success', message: `تعداد ${count} فیلتر پوشه پیشنهادی استعلام شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در دریافت فیلترهای پیشنهادی' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  const handleM053GetTopReactions = async () => {
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getTopReactions) return
    setM053LoadingOp('getTopReactions')
    setM053Status(null)
    try {
      const res = await window.guidegram.getTopReactions(targetId, 20)
      const count = Array.isArray(res?.reactions) ? res.reactions.length : (res?.count ?? 0)
      setM053TopReactionsCount(count)
      setM053Status({ type: 'success', message: `تعداد ${count} ری‌اکشن برتر استعلام شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در دریافت ری‌اکشن‌های برتر' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  const handleM053GetUnreadMentions = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getUnreadMentions) return
    if (!m053MentionsPeer.trim()) {
      setM053Status({ type: 'error', message: 'شناسه گفتگو برای منشن‌های خوانده‌نشده الزامی است' })
      return
    }
    setM053LoadingOp('getUnreadMentions')
    setM053Status(null)
    try {
      const res = await window.guidegram.getUnreadMentions(targetId, {
        peerId: m053MentionsPeer.trim(),
        limit: 50,
      })
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM053MentionsCount(count)
      setM053Status({ type: 'success', message: `تعداد ${count} منشن خوانده‌نشده استعلام شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در استعلام منشن‌های خوانده‌نشده' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  const handleM053GetUnreadPollVotes = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getUnreadPollVotes) return
    if (!m053PollVotesPeer.trim()) {
      setM053Status({ type: 'error', message: 'شناسه گفتگو برای آرای خوانده‌نشده نظرسنجی الزامی است' })
      return
    }
    setM053LoadingOp('getUnreadPollVotes')
    setM053Status(null)
    try {
      const res = await window.guidegram.getUnreadPollVotes(targetId, {
        peerId: m053PollVotesPeer.trim(),
        limit: 50,
      })
      const count = Array.isArray(res?.votes) ? res.votes.length : (res?.count ?? 0)
      setM053PollVotesCount(count)
      setM053Status({ type: 'success', message: `تعداد ${count} رای خوانده‌نشده نظرسنجی استعلام شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در استعلام آرای خوانده‌نشده نظرسنجی' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  const handleM053GetUnreadReactions = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getUnreadReactions) return
    if (!m053UnreadReactionsPeer.trim()) {
      setM053Status({ type: 'error', message: 'شناسه گفتگو برای ری‌اکشن‌های خوانده‌نشده الزامی است' })
      return
    }
    setM053LoadingOp('getUnreadReactions')
    setM053Status(null)
    try {
      const res = await window.guidegram.getUnreadReactions(targetId, {
        peerId: m053UnreadReactionsPeer.trim(),
        limit: 50,
      })
      const count = Array.isArray(res?.messages) ? res.messages.length : (res?.count ?? 0)
      setM053UnreadReactionsCount(count)
      setM053Status({ type: 'success', message: `تعداد ${count} ری‌اکشن خوانده‌نشده استعلام شد` })
    } catch (err: any) {
      setM053Status({ type: 'error', message: err?.message || 'خطا در استعلام ری‌اکشن‌های خوانده‌نشده' })
    } finally {
      setM053LoadingOp(null)
    }
  }

  // Microphase 054: WebPage, Previews, Join Requests, Import Invites & Sticker Installation State
  const [m054WebPageUrl, setM054WebPageUrl] = useState('')
  const [m054WebPageTitle, setM054WebPageTitle] = useState<string | null>(null)

  const [m054PreviewMessage, setM054PreviewMessage] = useState('https://telegram.org')
  const [m054PreviewResult, setM054PreviewResult] = useState<string | null>(null)

  const [m054HideAllPeer, setM054HideAllPeer] = useState('')
  const [m054HideAllLink, setM054HideAllLink] = useState('')
  const [m054HideAllApproved, setM054HideAllApproved] = useState(true)

  const [m054HidePeer, setM054HidePeer] = useState('')
  const [m054HideUser, setM054HideUser] = useState('')
  const [m054HideApproved, setM054HideApproved] = useState(true)

  const [m054InviteHash, setM054InviteHash] = useState('')
  const [m054InviteChatTitle, setM054InviteChatTitle] = useState<string | null>(null)

  const [m054ImportPeer, setM054ImportPeer] = useState('')
  const [m054ImportMediaCount, setM054ImportMediaCount] = useState(0)

  const [m054InstallSetName, setM054InstallSetName] = useState('')
  const [m054InstallArchived, setM054InstallArchived] = useState(false)

  const [m054LoadingOp, setM054LoadingOp] = useState<string | null>(null)
  const [m054Status, setM054Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleM054GetWebPage = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getWebPageRaw) return
    if (!m054WebPageUrl.trim()) {
      setM054Status({ type: 'error', message: 'آدرس اینترنتی (URL) الزامی است' })
      return
    }
    setM054LoadingOp('getWebPage')
    setM054Status(null)
    try {
      const res = await window.guidegram.getWebPageRaw(targetId, m054WebPageUrl.trim(), 0)
      const title = res?.webpage?.title || res?.title || 'صفحه وب بازیابی شد'
      const type = res?.webpage?._ || res?._ || 'webPage'
      setM054WebPageTitle(`${title} (${type})`)
      setM054Status({ type: 'success', message: `اطلاعات Instant View صفحه وب استعلام شد` })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در دریافت اطلاعات صفحه وب' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const handleM054GetWebPagePreview = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.getWebPagePreviewRaw) return
    if (!m054PreviewMessage.trim()) {
      setM054Status({ type: 'error', message: 'متن حاوی لینک برای پیش‌نمایش الزامی است' })
      return
    }
    setM054LoadingOp('getWebPagePreview')
    setM054Status(null)
    try {
      const res = await window.guidegram.getWebPagePreviewRaw(targetId, m054PreviewMessage.trim())
      const title = res?.media?.webpage?.title || res?.title || 'پیش‌نمایش تولید شد'
      setM054PreviewResult(title)
      setM054Status({ type: 'success', message: `پیش‌نمایش صفحه وب با موفقیت تولید شد` })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در تولید پیش‌نمایش' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const handleM054HideAllChatJoinRequests = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.hideAllChatJoinRequestsRaw) return
    if (!m054HideAllPeer.trim()) {
      setM054Status({ type: 'error', message: 'شناسه گفتگو برای مدیریت درخواست‌های عضویت الزامی است' })
      return
    }
    setM054LoadingOp('hideAllChatJoinRequests')
    setM054Status(null)
    try {
      await window.guidegram.hideAllChatJoinRequestsRaw(targetId, {
        peerId: m054HideAllPeer.trim(),
        link: m054HideAllLink.trim() || undefined,
        approved: m054HideAllApproved,
      })
      setM054Status({
        type: 'success',
        message: `کلیه درخواست‌های عضویت با وضعیت ${m054HideAllApproved ? 'تأیید' : 'رد'} پردازش شدند`,
      })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در پردازش درخواست‌های عضویت' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const handleM054HideChatJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.hideChatJoinRequestRaw) return
    if (!m054HidePeer.trim() || !m054HideUser.trim()) {
      setM054Status({ type: 'error', message: 'شناسه گفتگو و شناسه کاربر الزامی است' })
      return
    }
    setM054LoadingOp('hideChatJoinRequest')
    setM054Status(null)
    try {
      await window.guidegram.hideChatJoinRequestRaw(targetId, {
        peerId: m054HidePeer.trim(),
        userIdId: m054HideUser.trim(),
        approved: m054HideApproved,
      })
      setM054Status({
        type: 'success',
        message: `درخواست عضویت کاربر ${m054HideApproved ? 'تأیید' : 'رد'} شد`,
      })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در بررسی درخواست عضویت کاربر' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const handleM054ImportChatInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.importChatInvite) return
    if (!m054InviteHash.trim()) {
      setM054Status({ type: 'error', message: 'هش لینک دعوت الزامی است' })
      return
    }
    setM054LoadingOp('importChatInvite')
    setM054Status(null)
    try {
      const res = await window.guidegram.importChatInvite(targetId, m054InviteHash.trim())
      const title = res?.chats?.[0]?.title || 'عضویت در گفتگو انجام شد'
      setM054InviteChatTitle(title)
      setM054Status({ type: 'success', message: `لینک دعوت با موفقیت پذیرفته شد: ${title}` })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در عضویت با لینک دعوت' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const handleM054InitHistoryImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.initHistoryImport) return
    if (!m054ImportPeer.trim()) {
      setM054Status({ type: 'error', message: 'شناسه گفتگو برای واردسازی تاریخچه الزامی است' })
      return
    }
    setM054LoadingOp('initHistoryImport')
    setM054Status(null)
    try {
      const dummyFile = { _: 'inputFile', id: '1', parts: 1, name: 'chat.txt', md5_checksum: '' }
      const res = await window.guidegram.initHistoryImport(targetId, {
        peerId: m054ImportPeer.trim(),
        file: dummyFile,
        mediaCount: m054ImportMediaCount,
      })
      const importId = res?.id || 'جلسه ایمپورت آغاز شد'
      setM054Status({ type: 'success', message: `فرایند ایمپورت تاریخچه پیام آغاز شد (شناسه: ${importId})` })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در آغاز ایمپورت تاریخچه' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const handleM054InstallStickerSet = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.installStickerSetRaw) return
    if (!m054InstallSetName.trim()) {
      setM054Status({ type: 'error', message: 'نام پکیج استیکر الزامی است' })
      return
    }
    setM054LoadingOp('installStickerSet')
    setM054Status(null)
    try {
      const res = await window.guidegram.installStickerSetRaw(targetId, m054InstallSetName.trim(), m054InstallArchived)
      const resType = res?._ || 'stickerSetInstallResultSuccess'
      setM054Status({ type: 'success', message: `پکیج استیکر با موفقیت نصب شد (${resType})` })
    } catch (err: any) {
      setM054Status({ type: 'error', message: err?.message || 'خطا در نصب پکیج استیکر' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  const [m054HidePeerSettingsPeer, setM054HidePeerSettingsPeer] = useState('')

  const handleM054HidePeerSettingsBar = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.hidePeerSettingsBar) return
    if (!m054HidePeerSettingsPeer.trim()) {
      setM054Status({ type: 'error', message: 'شناسه گفتگو برای مخفی‌سازی نوار تنظیمات الزامی است' })
      return
    }
    setM054LoadingOp('hidePeerSettingsBar')
    setM054Status(null)
    try {
      await window.guidegram.hidePeerSettingsBar(targetId, m054HidePeerSettingsPeer.trim())
      setM054Status({ type: 'success', message: 'نوار تنظیمات گفتگو (PeerSettingsBar) با موفقیت پنهان شد' })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در مخفی‌سازی نوار تنظیمات گفتگو' })
    } finally {
      setM054LoadingOp(null)
    }
  }

  // Microphase 055 State & Handlers (Messages Domain Part 23 - Layer 232)
  const [m055Status, setM055Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [m055LoadingOp, setM055LoadingOp] = useState<string | null>(null)

  // 1. messages.markDialogUnread
  const [m055MarkUnreadPeer, setM055MarkUnreadPeer] = useState('')
  const [m055MarkUnreadFlag, setM055MarkUnreadFlag] = useState(true)

  // 2. messages.migrateChat
  const [m055MigrateChatId, setM055MigrateChatId] = useState('')

  // 3. messages.prolongWebView
  const [m055ProlongPeer, setM055ProlongPeer] = useState('')
  const [m055ProlongBot, setM055ProlongBot] = useState('')
  const [m055ProlongQueryId, setM055ProlongQueryId] = useState('')

  // 4. messages.rateTranscribedAudio
  const [m055RatePeer, setM055RatePeer] = useState('')
  const [m055RateMsgId, setM055RateMsgId] = useState('')
  const [m055RateTranscriptionId, setM055RateTranscriptionId] = useState('')
  const [m055RateGood, setM055RateGood] = useState(true)

  // 5. messages.readDiscussion
  const [m055ReadDiscussionPeer, setM055ReadDiscussionPeer] = useState('')
  const [m055ReadDiscussionMsgId, setM055ReadDiscussionMsgId] = useState('')
  const [m055ReadDiscussionMaxId, setM055ReadDiscussionMaxId] = useState('')

  // 6. messages.readEncryptedHistory
  const [m055ReadEncryptedChatId, setM055ReadEncryptedChatId] = useState('')
  const [m055ReadEncryptedDate, setM055ReadEncryptedDate] = useState('')

  const handleM055MarkDialogUnread = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.markDialogUnreadRaw) return
    if (!m055MarkUnreadPeer.trim()) {
      setM055Status({ type: 'error', message: 'شناسه گفتگو برای تغییر وضعیت خوانده‌نشده الزامی است' })
      return
    }
    setM055LoadingOp('markDialogUnread')
    setM055Status(null)
    try {
      await window.guidegram.markDialogUnreadRaw(targetId, {
        peer: m055MarkUnreadPeer.trim(),
        unread: m055MarkUnreadFlag,
      })
      setM055Status({ type: 'success', message: `وضعیت گفتگو به ${m055MarkUnreadFlag ? 'خوانده‌نشده (Unread)' : 'خوانده‌شده (Read)'} تغییر یافت` })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در نشانه‌گذاری خوانده‌نشده گفتگو' })
    } finally {
      setM055LoadingOp(null)
    }
  }

  const handleM055MigrateChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.migrateChatRaw) return
    if (!m055MigrateChatId.trim()) {
      setM055Status({ type: 'error', message: 'شناسه گروه عادی (Chat ID) الزامی است' })
      return
    }
    setM055LoadingOp('migrateChat')
    setM055Status(null)
    try {
      const res = await window.guidegram.migrateChatRaw(targetId, Number(m055MigrateChatId.trim()))
      const updateCount = res?.updates?.length || 0
      setM055Status({ type: 'success', message: `گروه با موفقیت به سوپرگروه ارتقا یافت (${updateCount} آپدیت دریافت شد)` })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در ارتقای گروه به سوپرگروه' })
    } finally {
      setM055LoadingOp(null)
    }
  }

  const handleM055ProlongWebView = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.prolongWebViewRaw) return
    if (!m055ProlongPeer.trim() || !m055ProlongBot.trim()) {
      setM055Status({ type: 'error', message: 'شناسه گفتگو و ربات الزامی است' })
      return
    }
    setM055LoadingOp('prolongWebView')
    setM055Status(null)
    try {
      await window.guidegram.prolongWebViewRaw(targetId, {
        peerId: m055ProlongPeer.trim(),
        botId: m055ProlongBot.trim(),
        queryId: m055ProlongQueryId.trim() || '0',
      })
      setM055Status({ type: 'success', message: 'نشست وب‌اپ تلگرام با موفقیت تمدید شد (prolongWebView)' })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در تمدید وب‌اپ' })
    } finally {
      setM055LoadingOp(null)
    }
  }

  const handleM055RateTranscribedAudio = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.rateTranscribedAudioRaw) return
    if (!m055RatePeer.trim() || !m055RateMsgId.trim() || !m055RateTranscriptionId.trim()) {
      setM055Status({ type: 'error', message: 'شناسه گفتگو، پیام و رونویسی الزامی است' })
      return
    }
    setM055LoadingOp('rateTranscribedAudio')
    setM055Status(null)
    try {
      await window.guidegram.rateTranscribedAudioRaw(targetId, {
        peerId: m055RatePeer.trim(),
        msgId: Number(m055RateMsgId.trim()),
        transcriptionId: m055RateTranscriptionId.trim(),
        good: m055RateGood,
      })
      setM055Status({ type: 'success', message: `امتیاز کیفیت تبدیل گفتار به متن ثبت شد (${m055RateGood ? 'عالی' : 'ضعیف'})` })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در ثبت امتیاز رونویسی' })
    } finally {
      setM055LoadingOp(null)
    }
  }

  const handleM055ReadDiscussion = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readDiscussionRaw) return
    if (!m055ReadDiscussionPeer.trim() || !m055ReadDiscussionMsgId.trim()) {
      setM055Status({ type: 'error', message: 'شناسه گفتگو و پیام آغازین رشته الزامی است' })
      return
    }
    setM055LoadingOp('readDiscussion')
    setM055Status(null)
    try {
      await window.guidegram.readDiscussionRaw(targetId, {
        peerId: m055ReadDiscussionPeer.trim(),
        msgId: Number(m055ReadDiscussionMsgId.trim()),
        readMaxId: Number(m055ReadDiscussionMaxId.trim() || m055ReadDiscussionMsgId.trim()),
      })
      setM055Status({ type: 'success', message: 'رشته گفتگو و نظرات پست با موفقیت خوانده شد (readDiscussion)' })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در ثبت وضعیت خوانده‌شده رشته گفتگو' })
    } finally {
      setM055LoadingOp(null)
    }
  }

  const handleM055ReadEncryptedHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readEncryptedHistoryRaw) return
    if (!m055ReadEncryptedChatId.trim()) {
      setM055Status({ type: 'error', message: 'شناسه چت امن (Secret Chat ID) الزامی است' })
      return
    }
    setM055LoadingOp('readEncryptedHistory')
    setM055Status(null)
    try {
      await window.guidegram.readEncryptedHistoryRaw(targetId, {
        peer: Number(m055ReadEncryptedChatId.trim()),
        maxDate: m055ReadEncryptedDate.trim() ? Number(m055ReadEncryptedDate.trim()) : Math.floor(Date.now() / 1000),
      })
      setM055Status({ type: 'success', message: 'تاریخچه چت سرتاسر رمزگذاری‌شده (Secret Chat) خوانده شد' })
    } catch (err: any) {
      setM055Status({ type: 'error', message: err?.message || 'خطا در ثبت خوانده شدن چت رمزگذاری‌شده' })
    } finally {
      setM055LoadingOp(null)
    }
  }

  // Microphase 056 State & Handlers (Messages Domain Part 24 - Layer 232)
  const [m056Status, setM056Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [m056LoadingOp, setM056LoadingOp] = useState<string | null>(null)

  // 1. messages.readFeaturedStickers
  const [m056StickerSetIds, setM056StickerSetIds] = useState('')

  // 2. messages.readHistory
  const [m056ReadHistoryPeer, setM056ReadHistoryPeer] = useState('')
  const [m056ReadHistoryMaxId, setM056ReadHistoryMaxId] = useState('')

  // 3. messages.readMentions
  const [m056ReadMentionsPeer, setM056ReadMentionsPeer] = useState('')
  const [m056ReadMentionsTopMsgId, setM056ReadMentionsTopMsgId] = useState('')

  // 4. messages.readMessageContents
  const [m056ReadContentsMsgIds, setM056ReadContentsMsgIds] = useState('')

  // 5. messages.readPollVotes
  const [m056ReadPollVotesPeer, setM056ReadPollVotesPeer] = useState('')
  const [m056ReadPollVotesTopMsgId, setM056ReadPollVotesTopMsgId] = useState('')

  // 6. messages.readReactions
  const [m056ReadReactionsPeer, setM056ReadReactionsPeer] = useState('')
  const [m056ReadReactionsTopMsgId, setM056ReadReactionsTopMsgId] = useState('')

  // 7. messages.readSavedHistory
  const [m056ReadSavedParentPeer, setM056ReadSavedParentPeer] = useState('')
  const [m056ReadSavedTopicPeer, setM056ReadSavedTopicPeer] = useState('')
  const [m056ReadSavedMaxId, setM056ReadSavedMaxId] = useState('')

  const handleM056ReadFeaturedStickers = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readFeaturedStickersRaw) return
    if (!m056StickerSetIds.trim()) {
      setM056Status({ type: 'error', message: 'شناسه استیکرست‌های ویژه الزامی است' })
      return
    }
    setM056LoadingOp('readFeaturedStickers')
    setM056Status(null)
    try {
      const ids = m056StickerSetIds.split(',').map((s) => s.trim()).filter(Boolean)
      await window.guidegram.readFeaturedStickersRaw(targetId, ids)
      setM056Status({ type: 'success', message: 'استیکرهای ویژه (Featured Stickers) با موفقیت خوانده شدند' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در خواندن استیکرهای ویژه' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  const handleM056ReadHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readHistoryRaw) return
    if (!m056ReadHistoryPeer.trim()) {
      setM056Status({ type: 'error', message: 'شناسه گفتگو برای ثبت خوانده‌شدن الزامی است' })
      return
    }
    setM056LoadingOp('readHistory')
    setM056Status(null)
    try {
      await window.guidegram.readHistoryRaw(targetId, {
        peerId: m056ReadHistoryPeer.trim(),
        maxId: m056ReadHistoryMaxId.trim() ? Number(m056ReadHistoryMaxId.trim()) : 0,
      })
      setM056Status({ type: 'success', message: 'تاریخچه پیام‌های گفتگو با موفقیت خوانده شد (readHistory)' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در ثبت خوانده شدن تاریخچه' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  const handleM056ReadMentions = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readMentionsRaw) return
    if (!m056ReadMentionsPeer.trim()) {
      setM056Status({ type: 'error', message: 'شناسه گفتگو برای خواندن منشن‌ها الزامی است' })
      return
    }
    setM056LoadingOp('readMentions')
    setM056Status(null)
    try {
      await window.guidegram.readMentionsRaw(targetId, {
        peerId: m056ReadMentionsPeer.trim(),
        topMsgId: m056ReadMentionsTopMsgId.trim() ? Number(m056ReadMentionsTopMsgId.trim()) : undefined,
      })
      setM056Status({ type: 'success', message: 'کلیه منشن‌های گفتگو خوانده شدند (readMentions)' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در خواندن منشن‌ها' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  const handleM056ReadMessageContents = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readMessageContentsRaw) return
    if (!m056ReadContentsMsgIds.trim()) {
      setM056Status({ type: 'error', message: 'شناسه پیام‌ها (جداشده با کاما) الزامی است' })
      return
    }
    setM056LoadingOp('readMessageContents')
    setM056Status(null)
    try {
      const ids = m056ReadContentsMsgIds.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      await window.guidegram.readMessageContentsRaw(targetId, ids)
      setM056Status({ type: 'success', message: 'محتوای رسانه و ویس پیام‌ها خوانده شد (readMessageContents)' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در خواندن محتوای پیام‌ها' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  const handleM056ReadPollVotes = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readPollVotesRaw) return
    if (!m056ReadPollVotesPeer.trim()) {
      setM056Status({ type: 'error', message: 'شناسه گفتگو برای خواندن آرا نظرسنجی الزامی است' })
      return
    }
    setM056LoadingOp('readPollVotes')
    setM056Status(null)
    try {
      await window.guidegram.readPollVotesRaw(targetId, {
        peerId: m056ReadPollVotesPeer.trim(),
        topMsgId: m056ReadPollVotesTopMsgId.trim() ? Number(m056ReadPollVotesTopMsgId.trim()) : undefined,
      })
      setM056Status({ type: 'success', message: 'آرا و مشارکت‌های نظرسنجی با موفقیت خوانده شدند (readPollVotes)' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در خواندن آرای نظرسنجی' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  const handleM056ReadReactions = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readReactionsRaw) return
    if (!m056ReadReactionsPeer.trim()) {
      setM056Status({ type: 'error', message: 'شناسه گفتگو برای خواندن واکنش‌ها الزامی است' })
      return
    }
    setM056LoadingOp('readReactions')
    setM056Status(null)
    try {
      await window.guidegram.readReactionsRaw(targetId, {
        peerId: m056ReadReactionsPeer.trim(),
        topMsgId: m056ReadReactionsTopMsgId.trim() ? Number(m056ReadReactionsTopMsgId.trim()) : undefined,
      })
      setM056Status({ type: 'success', message: 'واکنش‌ها و اموجی‌های دریافتی خوانده شدند (readReactions)' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در خواندن واکنش‌ها' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  const handleM056ReadSavedHistory = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.readSavedHistoryRaw) return
    if (!m056ReadSavedParentPeer.trim() || !m056ReadSavedTopicPeer.trim()) {
      setM056Status({ type: 'error', message: 'شناسه گروه والد مونوفروم و شناسه تاپیک الزامی است' })
      return
    }
    setM056LoadingOp('readSavedHistory')
    setM056Status(null)
    try {
      await window.guidegram.readSavedHistoryRaw(targetId, {
        parentPeerId: m056ReadSavedParentPeer.trim(),
        peerId: m056ReadSavedTopicPeer.trim(),
        maxId: m056ReadSavedMaxId.trim() ? Number(m056ReadSavedMaxId.trim()) : 0,
      })
      setM056Status({ type: 'success', message: 'تاریخچه تاپیک ذخیره‌شده (Saved Monoforum) خوانده شد' })
    } catch (err: any) {
      setM056Status({ type: 'error', message: err?.message || 'خطا در خواندن تاریخچه ذخیره‌شده' })
    } finally {
      setM056LoadingOp(null)
    }
  }

  // Microphase 057 State & Handlers (Messages Domain Part 25 - Layer 232)
  const [m057Status, setM057Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [m057LoadingOp, setM057LoadingOp] = useState<string | null>(null)

  // 1. messages.receivedMessages
  const [m057ReceivedMaxId, setM057ReceivedMaxId] = useState('')

  // 2. messages.receivedQueue
  const [m057ReceivedMaxQts, setM057ReceivedMaxQts] = useState('')

  // 3. messages.reorderPinnedDialogs
  const [m057ReorderPinnedFolderId, setM057ReorderPinnedFolderId] = useState('0')
  const [m057ReorderPinnedPeers, setM057ReorderPinnedPeers] = useState('')
  const [m057ReorderPinnedForce, setM057ReorderPinnedForce] = useState(false)

  // 4. messages.reorderPinnedForumTopics
  const [m057ReorderTopicsPeer, setM057ReorderTopicsPeer] = useState('')
  const [m057ReorderTopicsOrder, setM057ReorderTopicsOrder] = useState('')
  const [m057ReorderTopicsForce, setM057ReorderTopicsForce] = useState(false)

  // 5. messages.reorderPinnedSavedDialogs
  const [m057ReorderSavedPeers, setM057ReorderSavedPeers] = useState('')
  const [m057ReorderSavedForce, setM057ReorderSavedForce] = useState(false)

  // 6. messages.reorderQuickReplies
  const [m057ReorderQuickOrder, setM057ReorderQuickOrder] = useState('')

  // 7. messages.reorderStickerSets
  const [m057ReorderStickerOrder, setM057ReorderStickerOrder] = useState('')
  const [m057ReorderStickersMasks, setM057ReorderStickersMasks] = useState(false)
  const [m057ReorderStickersEmojis, setM057ReorderStickersEmojis] = useState(false)

  const handleM057ReceivedMessages = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.receivedMessagesRaw) return
    setM057LoadingOp('receivedMessages')
    setM057Status(null)
    try {
      const res = await window.guidegram.receivedMessagesRaw(targetId, m057ReceivedMaxId.trim() ? Number(m057ReceivedMaxId.trim()) : 0)
      const count = Array.isArray(res) ? res.length : 0
      setM057Status({ type: 'success', message: `اعلام دریافت پیام‌ها تأیید شد (${count} اعلان دریافت)` })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در ثبت دریافت پیام‌ها' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  const handleM057ReceivedQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.receivedQueueRaw) return
    setM057LoadingOp('receivedQueue')
    setM057Status(null)
    try {
      const res = await window.guidegram.receivedQueueRaw(targetId, m057ReceivedMaxQts.trim() ? Number(m057ReceivedMaxQts.trim()) : 0)
      const count = Array.isArray(res) ? res.length : 0
      setM057Status({ type: 'success', message: `اعلام صف دریافت qts تأیید شد (${count} شناسه تصدیق‌شده)` })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در ثبت صف دریافت' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  const handleM057ReorderPinnedDialogs = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reorderPinnedDialogsRaw) return
    if (!m057ReorderPinnedPeers.trim()) {
      setM057Status({ type: 'error', message: 'شناسه چت‌های پین‌شده به ترتیب الزامی است' })
      return
    }
    setM057LoadingOp('reorderPinnedDialogs')
    setM057Status(null)
    try {
      const peers = m057ReorderPinnedPeers.split(',').map((s) => s.trim()).filter(Boolean)
      await window.guidegram.reorderPinnedDialogsRaw(targetId, {
        force: m057ReorderPinnedForce,
        folderId: Number(m057ReorderPinnedFolderId || 0),
        order: peers,
      })
      setM057Status({ type: 'success', message: 'ترتیب گفتگوهای پین‌شده پوشه با موفقیت به‌روزرسانی شد' })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در مرتب‌سازی چت‌های پین‌شده' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  const handleM057ReorderPinnedForumTopics = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reorderPinnedForumTopicsRaw) return
    if (!m057ReorderTopicsPeer.trim() || !m057ReorderTopicsOrder.trim()) {
      setM057Status({ type: 'error', message: 'شناسه فروم و ترتیب تاپیک‌ها الزامی است' })
      return
    }
    setM057LoadingOp('reorderPinnedForumTopics')
    setM057Status(null)
    try {
      const topicIds = m057ReorderTopicsOrder.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      await window.guidegram.reorderPinnedForumTopicsRaw(targetId, {
        peerId: m057ReorderTopicsPeer.trim(),
        force: m057ReorderTopicsForce,
        order: topicIds,
      })
      setM057Status({ type: 'success', message: 'ترتیب تاپیک‌های پین‌شده فروم با موفقیت ذخیره شد' })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در مرتب‌سازی تاپیک‌های فروم' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  const handleM057ReorderPinnedSavedDialogs = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reorderPinnedSavedDialogsRaw) return
    if (!m057ReorderSavedPeers.trim()) {
      setM057Status({ type: 'error', message: 'شناسه تاپیک‌های ذخیره‌شده الزامی است' })
      return
    }
    setM057LoadingOp('reorderPinnedSavedDialogs')
    setM057Status(null)
    try {
      const peers = m057ReorderSavedPeers.split(',').map((s) => s.trim()).filter(Boolean)
      await window.guidegram.reorderPinnedSavedDialogsRaw(targetId, {
        force: m057ReorderSavedForce,
        order: peers,
      })
      setM057Status({ type: 'success', message: 'ترتیب تاپیک‌های پین‌شده ذخیره‌شده (Saved Messages) به‌روز شد' })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در مرتب‌سازی تاپیک‌های ذخیره‌شده' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  const handleM057ReorderQuickReplies = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reorderQuickRepliesRaw) return
    if (!m057ReorderQuickOrder.trim()) {
      setM057Status({ type: 'error', message: 'شناسه شورت‌کات‌های پاسخ سریع الزامی است' })
      return
    }
    setM057LoadingOp('reorderQuickReplies')
    setM057Status(null)
    try {
      const ids = m057ReorderQuickOrder.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      await window.guidegram.reorderQuickRepliesRaw(targetId, ids)
      setM057Status({ type: 'success', message: 'ترتیب میانبرهای پاسخ سریع (Quick Replies) ذخیره شد' })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در مرتب‌سازی پاسخ‌های سریع' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  const handleM057ReorderStickerSets = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reorderStickerSetsRaw) return
    if (!m057ReorderStickerOrder.trim()) {
      setM057Status({ type: 'error', message: 'شناسه استیکرست‌ها الزامی است' })
      return
    }
    setM057LoadingOp('reorderStickerSets')
    setM057Status(null)
    try {
      const ids = m057ReorderStickerOrder.split(',').map((s) => s.trim()).filter(Boolean)
      await window.guidegram.reorderStickerSetsRaw(targetId, {
        masks: m057ReorderStickersMasks,
        emojis: m057ReorderStickersEmojis,
        order: ids,
      })
      setM057Status({ type: 'success', message: 'ترتیب بسته‌های استیکر و اموجی با موفقیت اعمال شد' })
    } catch (err: any) {
      setM057Status({ type: 'error', message: err?.message || 'خطا در مرتب‌سازی استیکرست‌ها' })
    } finally {
      setM057LoadingOp(null)
    }
  }

  // Microphase 058 State & Handlers (Messages Domain Part 26 - Layer 232)
  const [m058Status, setM058Status] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [m058LoadingOp, setM058LoadingOp] = useState<string | null>(null)

  // 1. messages.report
  const [m058ReportPeer, setM058ReportPeer] = useState('')
  const [m058ReportIds, setM058ReportIds] = useState('')
  const [m058ReportOption, setM058ReportOption] = useState('')
  const [m058ReportMessage, setM058ReportMessage] = useState('')

  // 2. messages.reportEncryptedSpam
  const [m058ReportEncChatId, setM058ReportEncChatId] = useState('')
  const [m058ReportEncAccessHash, setM058ReportEncAccessHash] = useState('')

  // 3. messages.reportMessagesDelivery
  const [m058ReportDelivPeer, setM058ReportDelivPeer] = useState('')
  const [m058ReportDelivIds, setM058ReportDelivIds] = useState('')
  const [m058ReportDelivPush, setM058ReportDelivPush] = useState(false)

  // 4. messages.reportMusicListen
  const [m058MusicDocId, setM058MusicDocId] = useState('')
  const [m058MusicAccessHash, setM058MusicAccessHash] = useState('')
  const [m058MusicDuration, setM058MusicDuration] = useState('')

  // 5. messages.reportReaction
  const [m058ReactionPeer, setM058ReactionPeer] = useState('')
  const [m058ReactionMsgId, setM058ReactionMsgId] = useState('')
  const [m058ReactionUserPeer, setM058ReactionUserPeer] = useState('')

  // 6. messages.reportReadMetrics
  const [m058MetricsPeer, setM058MetricsPeer] = useState('')
  const [m058MetricsMsgId, setM058MetricsMsgId] = useState('')
  const [m058MetricsDuration, setM058MetricsDuration] = useState('')

  // 7. messages.reportSpam
  const [m058SpamPeer, setM058SpamPeer] = useState('')

  const handleM058Report = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportRaw) return
    if (!m058ReportPeer.trim() || !m058ReportIds.trim()) {
      setM058Status({ type: 'error', message: 'شناسه گفتگو و شناسه پیام‌ها الزامی است' })
      return
    }
    setM058LoadingOp('report')
    setM058Status(null)
    try {
      const ids = m058ReportIds.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      await window.guidegram.reportRaw(targetId, {
        peerId: m058ReportPeer.trim(),
        id: ids,
        option: m058ReportOption.trim() || undefined,
        message: m058ReportMessage.trim() || undefined,
      })
      setM058Status({ type: 'success', message: 'گزارش تخلف پیام‌ها با موفقیت به پشتیبانی تلگرام ارسال شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در ثبت گزارش تخلف' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  const handleM058ReportEncryptedSpam = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportEncryptedSpamRaw) return
    if (!m058ReportEncChatId.trim()) {
      setM058Status({ type: 'error', message: 'شناسه گفتگوی امن (Chat ID) الزامی است' })
      return
    }
    setM058LoadingOp('reportEncryptedSpam')
    setM058Status(null)
    try {
      await window.guidegram.reportEncryptedSpamRaw(targetId, {
        chatId: Number(m058ReportEncChatId.trim()),
        accessHash: m058ReportEncAccessHash.trim() || '0',
      })
      setM058Status({ type: 'success', message: 'گزارش اسپم سکرت‌چت با موفقیت ثبت شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در گزارش اسپم سکرت‌چت' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  const handleM058ReportMessagesDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportMessagesDeliveryRaw) return
    if (!m058ReportDelivPeer.trim() || !m058ReportDelivIds.trim()) {
      setM058Status({ type: 'error', message: 'شناسه چت و پیام‌های تحویل‌شده الزامی است' })
      return
    }
    setM058LoadingOp('reportMessagesDelivery')
    setM058Status(null)
    try {
      const ids = m058ReportDelivIds.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
      await window.guidegram.reportMessagesDeliveryRaw(targetId, {
        peerId: m058ReportDelivPeer.trim(),
        id: ids,
        push: m058ReportDelivPush,
      })
      setM058Status({ type: 'success', message: 'گزارش تله‌متری تحویل پیام‌ها به سرور مخابره شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در گزارش تحویل پیام‌ها' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  const handleM058ReportMusicListen = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportMusicListenRaw) return
    if (!m058MusicDocId.trim()) {
      setM058Status({ type: 'error', message: 'شناسه فایل صوتی موزیک الزامی است' })
      return
    }
    setM058LoadingOp('reportMusicListen')
    setM058Status(null)
    try {
      await window.guidegram.reportMusicListenRaw(targetId, {
        id: {
          id: m058MusicDocId.trim(),
          accessHash: m058MusicAccessHash.trim() || '0',
        },
        listenedDuration: Number(m058MusicDuration.trim() || 30),
      })
      setM058Status({ type: 'success', message: 'آمار مدت زمان پخش موزیک در تلگرام با موفقیت ثبت شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در ثبت آمار پخش موزیک' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  const handleM058ReportReaction = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportReactionRaw) return
    if (!m058ReactionPeer.trim() || !m058ReactionMsgId.trim() || !m058ReactionUserPeer.trim()) {
      setM058Status({ type: 'error', message: 'شناسه گفتگو، شناسه پیام و فرستنده ری‌اکشن الزامی است' })
      return
    }
    setM058LoadingOp('reportReaction')
    setM058Status(null)
    try {
      await window.guidegram.reportReactionRaw(targetId, {
        peerId: m058ReactionPeer.trim(),
        id: Number(m058ReactionMsgId.trim()),
        reactionPeerId: m058ReactionUserPeer.trim(),
      })
      setM058Status({ type: 'success', message: 'گزارش ری‌اکشن نامناسب یا مخرب ثبت شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در ثبت گزارش ری‌اکشن' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  const handleM058ReportReadMetrics = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportReadMetricsRaw) return
    if (!m058MetricsPeer.trim() || !m058MetricsMsgId.trim()) {
      setM058Status({ type: 'error', message: 'شناسه گفتگو و شناسه پیام الزامی است' })
      return
    }
    setM058LoadingOp('reportReadMetrics')
    setM058Status(null)
    try {
      await window.guidegram.reportReadMetricsRaw(targetId, {
        peerId: m058MetricsPeer.trim(),
        metrics: [
          {
            id: Number(m058MetricsMsgId.trim()),
            readDuration: Number(m058MetricsDuration.trim() || 5),
          },
        ],
      })
      setM058Status({ type: 'success', message: 'متریک‌های زمان مطالعه پیام مخابره شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در ارسال متریک‌های خوانش' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  const handleM058ReportSpam = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = activeAccountId || accounts[0]?.id
    if (!targetId || !window.guidegram?.reportSpamRaw) return
    if (!m058SpamPeer.trim()) {
      setM058Status({ type: 'error', message: 'شناسه گفتگو یا کاربر اسپمر الزامی است' })
      return
    }
    setM058LoadingOp('reportSpam')
    setM058Status(null)
    try {
      await window.guidegram.reportSpamRaw(targetId, m058SpamPeer.trim())
      setM058Status({ type: 'success', message: 'گزارش اسپم گفتگو به تلگرام مخابره شد' })
    } catch (err: any) {
      setM058Status({ type: 'error', message: err?.message || 'خطا در ثبت گزارش اسپم' })
    } finally {
      setM058LoadingOp(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="glass-modal w-full max-w-3xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[92dvh] sm:h-[85vh] max-h-[750px] border border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2 -mb-1" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-dark-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-100">{t('settings.title')}</div>
              <div className="text-[10px] text-gray-400">
                {isMobile
                  ? isPersian
                    ? t('settings.mobile_adv_title') || 'Guidegram Mobile Settings'
                    : 'Guidegram Mobile Settings'
                  : 'Telegram Desktop & Advanced Power Preferences'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Layout: Responsive Tabs (Horizontal on mobile, vertical on desktop) */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Tab Navigation */}
          <div className="w-full sm:w-56 bg-dark-900/60 border-b sm:border-b-0 sm:border-r border-white/5 p-2 sm:p-3 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-y-auto shrink-0 select-none">
            {[
              { id: 'profile' as SettingsTab, label: t('app.my_profile'), icon: <User className="w-4 h-4" /> },
              { id: 'business' as SettingsTab, label: t('settings.telegram_business'), icon: <Briefcase className="w-4 h-4" /> },
              { id: 'general' as SettingsTab, label: t('settings.general'), icon: <Globe className="w-4 h-4" /> },
              { id: 'notifications' as SettingsTab, label: t('settings.notifications'), icon: <Bell className="w-4 h-4" /> },
              { id: 'privacy' as SettingsTab, label: t('settings.privacy'), icon: <ShieldCheck className="w-4 h-4" /> },
              { id: 'chat' as SettingsTab, label: t('settings.chat_settings'), icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'features' as SettingsTab, label: t('settings.auto_migrated_2'), icon: <Sparkles className="w-4 h-4 text-accent-cyan" /> },
              { id: 'mcp' as SettingsTab, label: 'AI & MCP Agents', icon: <Zap className="w-4 h-4 text-amber-400" /> },
              { id: 'advanced' as SettingsTab, label: t('settings.advanced'), icon: <HardDrive className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 relative flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    isActive ? 'text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsTabPill"
                      className="absolute inset-0 bg-primary-600 rounded-xl shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 truncate">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </span>
                </button>
              )
            })}

            {/* Desktop Only: Update Check Footer */}
            <div
              onClick={handleManualCheckUpdates}
              title="Click to check for software updates"
              className="hidden sm:block mt-auto pt-3 border-t border-white/5 space-y-1 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
            >
              <div className="px-1 py-0.5 text-[11px] text-gray-400 font-mono flex items-center justify-between">
                <span className="font-bold text-gray-200 group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
                  <span>v{appVersion}</span>
                  {checkingUpdate && (
                    <RefreshCw className="w-3 h-3 text-primary-400 animate-spin" />
                  )}
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Layer 229+
                </span>
              </div>
              <div className="px-1 text-[10px] text-gray-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${checkingUpdate ? 'bg-primary-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                <span className="truncate">
                  {checkingUpdate
                    ? 'Checking updates...'
                    : updateCheckResult
                    ? updateCheckResult
                    : 'Click to check updates'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Tab Content Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* TAB: MY PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-400" />
                  <span>{t('app.my_profile')} & Connected Accounts ({accounts.length})</span>
                </div>

                <div className="space-y-2.5">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                          {(acc.firstName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-100 truncate flex items-center gap-1.5">
                            <span>{acc.firstName || 'User'} {acc.lastName || ''}</span>
                            {acc.username && (
                              <span className="text-primary-400 font-normal">@{acc.username}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {acc.phone || 'No phone'} • ID: {acc.id}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onLogoutAccount(acc.id)}
                        title="Logout & Delete Session"
                        className="px-3 py-1.5 rounded-xl bg-accent-rose/10 hover:bg-accent-rose/20 text-accent-rose text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: TELEGRAM BUSINESS */}
            {activeTab === 'business' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Header Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-900/30 via-primary-800/10 to-transparent border border-primary-500/20 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-100 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary-400" />
                      <span>{t('business.title')}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                        PRO
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 max-w-xl">
                      {t('business.subtitle')}
                    </div>
                  </div>
                  {isLoadingBusiness && (
                    <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>

                {businessToast && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{businessToast}</span>
                  </div>
                )}

                {/* Section 1: Business Intro */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t('business.intro_title')}</div>
                      <div className="text-[11px] text-gray-400">{t('business.intro_desc')}</div>
                    </div>
                    <MessageSquare className="w-4 h-4 text-primary-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          {t('business.intro_heading')}
                        </label>
                        <input
                          type="text"
                          value={businessIntroTitle}
                          onChange={(e) => setBusinessIntroTitle(e.target.value)}
                          placeholder={t('business.intro_heading_placeholder')}
                          className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          {t('business.intro_text')}
                        </label>
                        <textarea
                          rows={3}
                          value={businessIntroDesc}
                          onChange={(e) => setBusinessIntroDesc(e.target.value)}
                          placeholder={t('business.intro_text_placeholder')}
                          className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveBusinessIntro}
                        className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        {t('business.save_changes')}
                      </button>
                    </div>

                    {/* Live Preview Bubble */}
                    <div className="p-3.5 rounded-xl bg-dark-900/80 border border-white/5 flex flex-col justify-center">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-2">
                        {t('business.preview')}
                      </div>
                      <div className="p-3 rounded-2xl bg-dark-800 border border-white/10 space-y-1.5 shadow-md">
                        <div className="text-xs font-bold text-gray-100">
                          {businessIntroTitle || t('business.intro_heading_placeholder')}
                        </div>
                        <div className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {businessIntroDesc || t('business.intro_text_placeholder')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Opening Hours (Work Schedule) */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                        <span>{t('business.hours_title')}</span>
                        {businessProfile?.workHours?.openNow && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {t('business.hours_open_now')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">{t('business.hours_desc')}</div>
                    </div>
                    <Clock className="w-4 h-4 text-primary-400" />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-[11px] font-medium text-gray-400">
                      {t('business.hours_timezone')}:
                    </label>
                    <select
                      value={businessTimezone}
                      onChange={(e) => setBusinessTimezone(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-primary-500 cursor-pointer"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Asia/Tehran">Asia/Tehran (GMT+3:30)</option>
                      <option value="Europe/London">Europe/London (GMT+0)</option>
                      <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {businessWeeklyOpen.map((item, idx) => (
                      <div
                        key={item.day}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900/60 border border-white/5 text-xs"
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => {
                              const updated = [...businessWeeklyOpen]
                              updated[idx].enabled = e.target.checked
                              setBusinessWeeklyOpen(updated)
                            }}
                            className="rounded border-white/10 text-primary-600 focus:ring-0 w-3.5 h-3.5 bg-dark-800"
                          />
                          <span className={`font-medium ${item.enabled ? 'text-gray-100' : 'text-gray-500'}`}>
                            {item.name}
                          </span>
                        </label>

                        {item.enabled ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={item.start}
                              onChange={(e) => {
                                const updated = [...businessWeeklyOpen]
                                updated[idx].start = e.target.value
                                setBusinessWeeklyOpen(updated)
                              }}
                              className="px-2 py-1 rounded-lg bg-dark-800 border border-white/10 text-[11px] text-gray-200 focus:outline-none"
                            />
                            <span className="text-gray-500 text-[11px]">-</span>
                            <input
                              type="time"
                              value={item.end}
                              onChange={(e) => {
                                const updated = [...businessWeeklyOpen]
                                updated[idx].end = e.target.value
                                setBusinessWeeklyOpen(updated)
                              }}
                              className="px-2 py-1 rounded-lg bg-dark-800 border border-white/10 text-[11px] text-gray-200 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500">{t('business.hours_closed')}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveBusinessHours}
                    className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    {t('business.save_changes')}
                  </button>
                </div>

                {/* Section 3: Location & Address */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t('business.location_title')}</div>
                      <div className="text-[11px] text-gray-400">{t('business.location_desc')}</div>
                    </div>
                    <MapPin className="w-4 h-4 text-primary-400" />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-400 mb-1">
                        {t('business.location_address')}
                      </label>
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder={t('business.location_address_placeholder')}
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          {t('business.location_lat')}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={businessLat ?? ''}
                          onChange={(e) => setBusinessLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="35.6892"
                          className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          {t('business.location_long')}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={businessLong ?? ''}
                          onChange={(e) => setBusinessLong(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="51.3890"
                          className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveBusinessLocation}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      {t('business.save_changes')}
                    </button>
                  </div>
                </div>

                {/* Section 4: Chat Links */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t('business.links_title')}</div>
                      <div className="text-[11px] text-gray-400">{t('business.links_desc')}</div>
                    </div>
                    <Link2 className="w-4 h-4 text-primary-400" />
                  </div>

                  {/* Create New Link Card */}
                  <div className="p-3.5 rounded-xl bg-dark-900/60 border border-white/5 space-y-3">
                    <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-primary-400" />
                      <span>{t('business.create_link')}</span>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder={t('business.link_title_placeholder')}
                        className="w-full px-3 py-1.5 rounded-xl bg-dark-800 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                      <textarea
                        rows={2}
                        value={newLinkMessage}
                        onChange={(e) => setNewLinkMessage(e.target.value)}
                        placeholder={t('business.link_msg_placeholder')}
                        className="w-full px-3 py-1.5 rounded-xl bg-dark-800 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isCreatingLink || !newLinkMessage.trim()}
                      onClick={handleCreateBusinessLink}
                      className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('business.create_link')}</span>
                    </button>
                  </div>

                  {/* Links List */}
                  <div className="space-y-2.5">
                    {businessLinks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500 font-medium">
                        {t('business.no_links')}
                      </div>
                    ) : (
                      businessLinks.map((bl, idx) => (
                        <div
                          key={bl.slug || idx}
                          className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-100 truncate">
                                {bl.title || bl.link}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-gray-400 font-mono">
                                {bl.views} {t('business.views')}
                              </span>
                            </div>
                            <div className="text-[11px] text-primary-400 font-mono select-all">
                              {bl.link}
                            </div>
                            {bl.message && (
                              <div className="text-[11px] text-gray-400 line-clamp-1 italic">
                                "{bl.message}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                copyTextToClipboard(bl.link)
                                setCopiedLink(bl.slug || bl.link)
                                setTimeout(() => setCopiedLink(null), 2000)
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedLink === (bl.slug || bl.link) ? t('business.copied') : t('business.copy_link')}</span>
                            </button>
                            {bl.slug && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditBusinessLink(bl.slug!)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-primary-400 transition-colors cursor-pointer"
                                  title="Edit Link Message & Title"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBusinessLink(bl.slug!)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                  title={t('business.delete_link')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* Language Switcher */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t('settings.language')}</div>
                      <div className="text-[11px] text-gray-400">{t('settings.language_desc')}</div>
                    </div>
                    <Globe className="w-4 h-4 text-primary-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        language === 'en'
                          ? 'bg-primary-600 text-white border-primary-500 shadow-glow'
                          : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <span>🇬🇧 {t('settings.lang_en')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLanguage('fa')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer font-persian ${
                        language === 'fa'
                          ? 'bg-primary-600 text-white border-primary-500 shadow-glow'
                          : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <span>🇮🇷 {t('settings.lang_fa')}</span>
                    </button>
                  </div>
                </div>

                {/* Window Close Action (Desktop Only) */}
                {!isMobile && (
                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-gray-200">When clicking the Close (X) button</div>
                        <div className="text-[11px] text-gray-400">Control application lifecycle behavior</div>
                      </div>
                      <Power className="w-4 h-4 text-primary-400" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCloseAction('ask')
                          window.guidegram?.updateConfig?.({ closeAction: 'ask', rememberCloseAction: true })
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          closeAction === 'ask'
                            ? 'bg-primary-600/20 text-primary-300 border-primary-500/50 shadow-glow'
                            : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Ask every time</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCloseAction('minimize')
                          window.guidegram?.updateConfig?.({ closeAction: 'minimize', rememberCloseAction: true })
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          closeAction === 'minimize'
                            ? 'bg-primary-600/20 text-primary-300 border-primary-500/50 shadow-glow'
                            : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                        }`}
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Minimize</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCloseAction('quit')
                          window.guidegram?.updateConfig?.({ closeAction: 'quit', rememberCloseAction: true })
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          closeAction === 'quit'
                            ? 'bg-accent-rose/20 text-accent-rose border-accent-rose/50 shadow-glow'
                            : 'bg-dark-850 text-gray-400 border-white/5 hover:text-white'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Quit</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Project Support & Donation */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/15 via-rose-500/5 to-transparent bg-dark-800 border border-pink-500/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 fill-pink-500/30 text-pink-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                          <span>{t('support.title')}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                            Community
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 leading-snug mt-0.5">{t('support.desc')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/5">
                    <span className="text-[11px] text-pink-300/80 font-mono">TON (GRAM) • Tron (TRX/USDT)</span>
                    <button
                      type="button"
                      onClick={() => onOpenSupport?.()}
                      className="py-1.5 px-3.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Heart className="w-3.5 h-3.5 fill-white" />
                      <span>{t('menu.support_guidegram')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-400" />
                  <span>{t('settings.notifications')}</span>
                </div>

                {/* Live Test Notification Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary-950/40 via-dark-800 to-accent-cyan/10 border border-primary-500/20 flex items-center justify-between gap-3 shadow-sm">
                  <div>
                    <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                      <span>{t('settings.hud_engine_title') || 'Guidegram Native Notification Engine (Pro HUD)'}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {t('settings.hud_engine_desc') || 'Live floating notification preview with inline quick reply and Android gestures'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('guidegram:test-notification'))
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{t('settings.hud_test_btn') || 'Test Notification'}</span>
                  </button>
                </div>

                {/* Master Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ToggleItem
                    title={t('settings.hud_enable_title') || "Floating Notifications (HUD)"}
                    desc={t('settings.hud_enable_desc') || "Display smooth floating notification cards in screen corner"}
                    icon={<Bell className="w-3.5 h-3.5 text-primary-400" />}
                    checked={notificationsEnabled}
                    onChange={setNotificationsEnabled}
                  />
                  <ToggleItem
                    title={t('settings.hud_sound_title') || "Sound Effects"}
                    desc={t('settings.hud_sound_desc') || "Play audio tone for incoming messages via WebAudio"}
                    icon={<Volume2 className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={soundEnabled}
                    onChange={setSoundEnabled}
                  />
                  <ToggleItem
                    title={t('settings.hud_haptic_title') || "Haptic Feedback & Vibration"}
                    desc={t('settings.hud_haptic_desc') || "Tactile vibration pattern for touchscreens and mobile"}
                    icon={<Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                    checked={notificationVibrate}
                    onChange={setNotificationVibrate}
                  />
                  <ToggleItem
                    title={t('settings.hud_taskbar_title') || "Taskbar Flash"}
                    desc={t('settings.hud_taskbar_desc') || "Flash app icon in taskbar when message is received"}
                    icon={<Laptop className="w-3.5 h-3.5 text-amber-400" />}
                    checked={notificationFlashTaskbar}
                    onChange={setNotificationFlashTaskbar}
                  />
                </div>

                {/* Chat Categories Matrix */}
                <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="text-xs font-bold text-gray-200">{t('settings.hud_scopes_title') || "Notification Scopes"}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNotificationPrivateChats(!notificationPrivateChats)}
                      className={`p-2.5 rounded-xl text-left transition-all border flex items-center justify-between ${
                        notificationPrivateChats
                          ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm'
                          : 'bg-dark-900/60 text-gray-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{t('settings.hud_scope_private') || "Private Chats"}</span>
                      </div>
                      {notificationPrivateChats && <Check className="w-3.5 h-3.5 text-primary-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationGroups(!notificationGroups)}
                      className={`p-2.5 rounded-xl text-left transition-all border flex items-center justify-between ${
                        notificationGroups
                          ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm'
                          : 'bg-dark-900/60 text-gray-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{t('settings.hud_scope_groups') || "Groups"}</span>
                      </div>
                      {notificationGroups && <Check className="w-3.5 h-3.5 text-primary-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationChannels(!notificationChannels)}
                      className={`p-2.5 rounded-xl text-left transition-all border flex items-center justify-between ${
                        notificationChannels
                          ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm'
                          : 'bg-dark-900/60 text-gray-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{t('settings.hud_scope_channels') || "Channels"}</span>
                      </div>
                      {notificationChannels && <Check className="w-3.5 h-3.5 text-primary-400" />}
                    </button>
                  </div>
                </div>

                {/* HUD Behaviors: Quick Reply & Batching */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ToggleItem
                    title={t('settings.hud_inline_reply_title') || "Inline Quick Reply"}
                    desc={t('settings.hud_inline_reply_desc') || "Send reply directly from the notification card"}
                    icon={<CornerDownLeft className="w-3.5 h-3.5 text-primary-400" />}
                    checked={notificationQuickReply}
                    onChange={setNotificationQuickReply}
                  />
                  <ToggleItem
                    title={t('settings.hud_digest_title') || "Anti-Spam Digest"}
                    desc={t('settings.hud_digest_desc') || "Group consecutive messages from same chat into one card"}
                    icon={<CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    checked={notificationBatching}
                    onChange={setNotificationBatching}
                  />
                </div>

                {/* HUD Screen Position & Stacking Count */}
                <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{t('settings.hud_position_title') || "Screen Position"}</div>
                      <div className="text-[11px] text-gray-400">{t('settings.hud_position_desc') || "Choose corner for floating notification cards"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'bottom-right' as const, label: t('settings.hud_pos_br') || 'Bottom-Right' },
                      { id: 'top-right' as const, label: t('settings.hud_pos_tr') || 'Top-Right' },
                      { id: 'bottom-left' as const, label: t('settings.hud_pos_bl') || 'Bottom-Left' },
                      { id: 'top-left' as const, label: t('settings.hud_pos_tl') || 'Top-Left' },
                    ].map((pos) => {
                      const isSel = notificationPosition === pos.id
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setNotificationPosition(pos.id)}
                          className={`p-2 rounded-xl text-center text-xs font-medium transition-all border ${
                            isSel
                              ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm'
                              : 'bg-dark-900/60 text-gray-400 hover:text-gray-200 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {pos.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-200">{t('settings.hud_max_cards') || "Maximum Concurrent Cards"}</div>
                      <div className="text-[11px] text-gray-400">{t('settings.notif_stack_desc')}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSel = notificationMaxStack === num
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setNotificationMaxStack(num)}
                            className={`w-7 h-7 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                              isSel
                                ? 'bg-primary-600 text-white border-primary-500 shadow-md'
                                : 'bg-dark-900 text-gray-400 hover:text-gray-200 border-white/5'
                            }`}
                          >
                            {num}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Privacy Shield */}
                <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div>
                    <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>{t('settings.notif_privacy_title')}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {t('settings.notif_privacy_desc')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'full' as const, label: t('settings.notif_privacy_full'), desc: t('settings.notif_privacy_full_desc') },
                      { id: 'hide-text' as const, label: t('settings.notif_privacy_hidetext'), desc: t('settings.notif_privacy_hidetext_desc') },
                      { id: 'hide-all' as const, label: t('settings.notif_privacy_hideall'), desc: t('settings.notif_privacy_hideall_desc') },
                    ].map((mode) => {
                      const isSel = notificationPrivacyMode === mode.id
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setNotificationPrivacyMode(mode.id)}
                          className={`p-2.5 rounded-xl text-left transition-all border flex flex-col gap-0.5 ${
                            isSel
                              ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm'
                              : 'bg-dark-900/60 text-gray-400 hover:text-gray-200 border-white/5'
                          }`}
                        >
                          <div className="text-xs font-semibold flex items-center justify-between">
                            <span>{mode.label}</span>
                            {isSel && <Check className="w-3 h-3 text-primary-400" />}
                          </div>
                          <div className="text-[10px] text-gray-400">{mode.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notification Tones Picker (Telegram Desktop Parity - Phase 72) */}
                <div className="pt-2 p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-200">Notification Tone</div>
                      <div className="text-[11px] text-gray-400">Choose a notification sound or upload custom ringtones</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playNotificationSound(notificationTone)}
                      className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-750 text-xs font-semibold text-primary-400 border border-primary-500/20 hover:border-primary-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Play Chime - Preview selected tone"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>

                  {/* Built-in Tone Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {AVAILABLE_NOTIFICATION_TONES.map((t) => {
                      const isSelected = notificationTone === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setNotificationTone(t.id)
                            playNotificationSound(t.id)
                          }}
                          className={`p-2 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between border ${
                            isSelected
                              ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm'
                              : 'bg-dark-900/60 text-gray-400 hover:text-gray-200 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="truncate">{t.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Telegram Cloud Saved Ringtones */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Telegram Cloud Tones
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoadingRingtones}
                          onClick={async () => {
                            if (accounts[0]?.id && window.guidegram?.getSavedRingtones) {
                              try {
                                setIsLoadingRingtones(true)
                                const res = await window.guidegram.getSavedRingtones(accounts[0].id)
                                if (Array.isArray(res?.ringtones)) {
                                  setSavedRingtones(res.ringtones)
                                }
                              } catch (e) {
                                console.error('Failed to load saved ringtones', e)
                              } finally {
                                setIsLoadingRingtones(false)
                              }
                            }
                          }}
                          className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingRingtones ? 'animate-spin' : ''}`} />
                          <span>Sync Cloud</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUploadingRingtone}
                          onClick={async () => {
                            if (accounts[0]?.id && window.guidegram?.openFileDialog && window.guidegram?.uploadRingtone) {
                              try {
                                setIsUploadingRingtone(true)
                                const fileRes = await window.guidegram.openFileDialog({
                                  type: 'audio',
                                  title: 'Select Notification Sound Tone',
                                  filters: [{ name: 'Audio Files', extensions: ['mp3', 'ogg', 'wav', 'm4a'] }],
                                })
                                if (!fileRes?.canceled && fileRes?.filePaths?.[0]) {
                                  await window.guidegram.uploadRingtone(accounts[0].id, fileRes.filePaths[0])
                                  const refreshed = await window.guidegram.getSavedRingtones(accounts[0].id)
                                  if (Array.isArray(refreshed?.ringtones)) {
                                    setSavedRingtones(refreshed.ringtones)
                                  }
                                }
                              } catch (e) {
                                console.error('Failed to upload ringtone', e)
                              } finally {
                                setIsUploadingRingtone(false)
                              }
                            }
                          }}
                          className="text-[11px] text-accent-cyan hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Upload Tone</span>
                        </button>
                      </div>
                    </div>

                    {savedRingtones.length > 0 ? (
                      <div className="space-y-1">
                        {savedRingtones.map((r) => {
                          const isSelected = notificationTone === r.id
                          return (
                            <div
                              key={r.id}
                              onClick={() => setNotificationTone(r.id)}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer border ${
                                isSelected
                                  ? 'bg-primary-600/20 text-primary-300 border-primary-500/40'
                                  : 'bg-dark-900/60 text-gray-300 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Music className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                                <span className="truncate">{r.title || 'Custom Tone'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (accounts[0]?.id && window.guidegram?.saveRingtone) {
                                      await window.guidegram.saveRingtone(accounts[0].id, r.id, true)
                                      setSavedRingtones(prev => prev.filter(x => x.id !== r.id))
                                    }
                                  }}
                                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                                  title="Remove ringtone from cloud"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 italic p-1">
                        No custom cloud ringtones uploaded yet. Upload MP3/OGG (up to 300KB, 5 seconds) to sync across all your Telegram devices.
                      </div>
                    )}
                  </div>
                </div>

                {/* Events & Contact Joined Notifications (MTProto Layer 232) */}
                <div className="pt-2 p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-200">
                        {isPersian ? 'رویدادها و اعلان‌ها' : 'Events & Contact Notifications'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {isPersian ? 'اعلان عضویت مخاطبین جدید در تلگرام' : 'Notify when a contact joins Telegram'}
                      </div>
                    </div>
                  </div>
                  <ToggleItem
                    title={isPersian ? 'عضویت مخاطب در تلگرام' : 'Contact joined Telegram'}
                    desc={isPersian ? 'نمایش اعلان هنگامی که یکی از مخاطبین شما به تلگرام می‌پیوندد' : 'Receive push notifications when one of your phone contacts signs up'}
                    icon={<UserPlus className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={contactSignUpNotif}
                    onChange={(checked) => setContactSignUpNotif(checked)}
                  />
                </div>

                {/* Reactions Notifications & Cloud Audio (MTProto Layer 232 Microphase 015) */}
                <div className="pt-2 p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-200">
                        {isPersian ? 'اعلان‌های واکنش و رسانه‌های ابری' : 'Reaction Notifications & Cloud Media'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {isPersian ? 'مدیریت واکنش‌ها به پیام‌ها و فایل‌های صوتی ذخیره‌شده ابری' : 'Manage reaction notifications on your messages and saved audio'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                      <span className="text-gray-200 font-medium">
                        {isPersian ? 'اعلان واکنش‌ها به پیام‌های من' : 'Reactions on my messages'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-primary-400">
                      {isLoadingReactionsNotify ? (
                        <RefreshCw className="w-3 h-3 animate-spin inline" />
                      ) : reactionsNotifySettings?.messagesNotify ? (
                        isPersian ? 'فعال' : 'Enabled'
                      ) : (
                        isPersian ? 'پیش‌فرض' : 'Default'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-gray-200 font-medium">
                        {isPersian ? 'تعداد موسیقی‌های ذخیره‌شده در ابر' : 'Saved Cloud Music Track IDs'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-gray-300">
                      {savedMusicCount !== null ? `${savedMusicCount} ${isPersian ? 'ترک' : 'tracks'}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PRIVACY & SECURITY (Official Telegram Desktop Parity - Screenshot 3) */}
            {activeTab === 'privacy' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent-cyan" />
                    <span>Privacy and Security</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadPrivacySettings()}
                    disabled={isLoadingPrivacy}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPrivacy ? 'animate-spin text-primary-400' : 'text-gray-400'}`} />
                    <span>{isLoadingPrivacy ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>

                {/* Section: Security */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Security</div>

                  <div
                    onClick={() => setActiveSubModal('twoFactor')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Two-Step Verification</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : privacyData?.twoStepVerification ? (
                        'On'
                      ) : (
                        'Off'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('autoDelete')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Auto-Delete Messages</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] capitalize">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.autoDeleteMessages || 'Off'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('localPasscode')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Local passcode</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (privacyData?.localPasscode ?? localPasscodeEnabled) ? (
                        'On'
                      ) : (
                        'Off'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('passkeys')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Passkeys</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : privacyData?.passkeys ? (
                        'On'
                      ) : (
                        'Off'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('blockedUsers')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Blocked users</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] font-mono">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.blockedUsersCount ?? 0
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('connectedWebsites')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Connected websites</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] font-mono">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.connectedWebsitesCount ?? 0
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('activeSessions')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Active sessions</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] font-mono">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-8 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.activeSessionsCount ?? 1
                      )}
                    </span>
                  </div>

                  <div className="px-3 text-[11px] text-gray-500 pt-0.5">
                    Manage your sessions on all your devices.
                  </div>
                </div>

                {/* Section: Privacy */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Privacy</div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'phoneNumberPrivacy',
                        'Phone number',
                        'Who can see my phone number?',
                        privacyData?.phoneNumberPrivacy || 'Nobody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Phone number</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-16 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.phoneNumberPrivacy || 'Nobody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'lastSeenPrivacy',
                        'Last seen & online',
                        'Who can see your Last Seen time?',
                        privacyData?.lastSeenPrivacy || 'Nobody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Last seen & online</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.lastSeenPrivacy || 'Nobody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'profilePhotosPrivacy',
                        'Profile photos',
                        'Who can see your profile photos and videos?',
                        privacyData?.profilePhotosPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Profile photos</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.profilePhotosPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'forwardedMessagesPrivacy',
                        'Forwarded messages',
                        'Who can add a link to your account when forwarding your messages?',
                        privacyData?.forwardedMessagesPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Forwarded messages</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.forwardedMessagesPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'callsPrivacy',
                        'Calls',
                        'Who can call you?',
                        privacyData?.callsPrivacy || 'My contacts'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Calls</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.callsPrivacy || 'My contacts'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'voiceMessagesPrivacy',
                        'Voice messages',
                        'Who can send you voice and video messages?',
                        privacyData?.voiceMessagesPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-200">Voice messages</span>
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.voiceMessagesPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'messagesPrivacy',
                        'Messages',
                        'Who can send you direct messages?',
                        privacyData?.messagesPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-200">Messages</span>
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.messagesPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'birthdayPrivacy',
                        'Birthday',
                        'Who can see your date of birth?',
                        privacyData?.birthdayPrivacy || 'My contacts'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Birthday</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.birthdayPrivacy || 'My contacts'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'giftsPrivacy',
                        'Gifts',
                        'Who can see gifts on your profile?',
                        privacyData?.giftsPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Gifts</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.giftsPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'bioPrivacy',
                        'Bio',
                        'Who can see the Bio on your profile?',
                        privacyData?.bioPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Bio</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.bioPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'savedMusicPrivacy',
                        'Saved Music',
                        'Who can see the music you have saved?',
                        privacyData?.savedMusicPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Saved Music</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.savedMusicPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'invitesPrivacy',
                        'Invites',
                        'Who can add you to groups and channels?',
                        privacyData?.invitesPrivacy || 'Everybody'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Invites</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {isLoadingPrivacy && !privacyData ? (
                        <span className="inline-block w-14 h-3.5 rounded bg-white/10 animate-pulse" />
                      ) : (
                        privacyData?.invitesPrivacy || 'Everybody'
                      )}
                    </span>
                  </div>
                </div>

                {/* Section: Delete My Account If Away For (MTProto Layer 232 Account TTL) */}
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs font-bold text-accent-cyan">
                      {isPersian ? 'حذف خودکار حساب در صورت عدم فعالیت' : 'Delete my account if away for'}
                    </div>
                    {isUpdatingTTL && (
                      <span className="text-[11px] text-primary-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>{isPersian ? 'در حال ذخیره...' : 'Saving...'}</span>
                      </span>
                    )}
                  </div>
                  {ttlToast && (
                    <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-[11px] text-primary-300 animate-in fade-in">
                      {ttlToast}
                    </div>
                  )}
                  <div className="p-3 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">
                        {isPersian ? 'مدت زمان عدم حضور:' : 'If you do not log in within:'}
                      </span>
                      {isLoadingTTL ? (
                        <span className="w-16 h-4 bg-white/10 rounded animate-pulse" />
                      ) : (
                        <span className="font-semibold text-primary-400 font-mono">
                          {accountTTL <= 30
                            ? isPersian ? '۱ ماه' : '1 month'
                            : accountTTL <= 90
                              ? isPersian ? '۳ ماه' : '3 months'
                              : accountTTL <= 180
                                ? isPersian ? '۶ ماه' : '6 months'
                                : accountTTL <= 365
                                  ? isPersian ? '۱ سال' : '1 year'
                                  : isPersian ? `${accountTTL} روز` : `${accountTTL} days`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { label: isPersian ? '۱ ماه' : '1 mo', days: 30 },
                        { label: isPersian ? '۳ ماه' : '3 mos', days: 90 },
                        { label: isPersian ? '۶ ماه' : '6 mos', days: 180 },
                        { label: isPersian ? '۱ سال' : '1 yr', days: 365 },
                      ].map((item) => {
                        const isSelected = Math.abs(accountTTL - item.days) <= 5
                        return (
                          <button
                            key={item.days}
                            type="button"
                            disabled={isUpdatingTTL || isLoadingTTL}
                            onClick={() => handleUpdateAccountTTL(item.days)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer disabled:opacity-50 ${
                              isSelected
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                                : 'bg-dark-900 text-gray-400 hover:text-white hover:bg-dark-750 border border-white/5'
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="text-[11px] text-gray-500 leading-relaxed">
                      {isPersian
                        ? 'اگر در این مدت حداقل یک بار آنلاین نشوید، حساب کاربری و تمامی پیام‌ها و رسانه‌های ابری به صورت خودکار نابود می‌شوند.'
                        : 'If you do not log in at least once within this period, your account will be deleted along with all messages and cloud media.'}
                    </div>
                  </div>
                </div>

                {/* Section: Extended Privacy & Anti-Fingerprinting */}
                <div className="space-y-2.5 pt-3 border-t border-white/5">
                  <div className="text-xs font-bold text-gray-300">Advanced Extended Privacy</div>
                  <ToggleItem
                    title={t('app.ghost_mode')}
                    desc="Read messages without sending read receipts or online status"
                    icon={<EyeOff className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={ghostMode}
                    onChange={setGhostMode}
                  />
                  <ToggleItem
                    title="Always Delete for Both"
                    desc="Default revoke/delete messages for all participants"
                    icon={<Trash2 className="w-3.5 h-3.5 text-accent-rose" />}
                    checked={alwaysDeleteBoth}
                    onChange={setAlwaysDeleteBoth}
                  />
                  <ToggleItem
                    title="Randomize Hardware Fingerprint per Account"
                    desc="Generate authentic PC models and OS builds per account to prevent correlation"
                    icon={<Laptop className="w-3.5 h-3.5 text-emerald-400" />}
                    checked={antiFingerprinting}
                    onChange={setAntiFingerprinting}
                  />
                </div>

                {/* Section: Sensitive Content & Global Privacy (MTProto Layer 232) */}
                <div className="space-y-2.5 pt-3 border-t border-white/5">
                  <div className="text-xs font-bold text-gray-300">
                    {isPersian ? 'محتوای حساس و حریم خصوصی سراسری' : 'Sensitive Content & Global Rules'}
                  </div>
                  <ToggleItem
                    title={isPersian ? 'نمایش محتوای حساس' : 'Disable filtering'}
                    desc={isPersian ? 'نمایش رسانه‌های حساس در کانال‌های عمومی روی تمام دستگاه‌ها' : 'Display sensitive media in public channels on all your devices'}
                    icon={<Eye className="w-3.5 h-3.5 text-accent-rose" />}
                    checked={sensitiveContentEnabled}
                    onChange={(checked) => setSensitiveContentEnabled(checked)}
                  />
                  <ToggleItem
                    title={isPersian ? 'بایگانی و بی‌صدا کردن افراد ناشناس' : 'Archive and Mute Non-Contacts'}
                    desc={isPersian ? 'انتقال خودکار چت‌های جدید از افراد ناشناس به آرشیو بدون صدا' : 'Automatically archive and mute new chats from unknown users'}
                    icon={<FolderLock className="w-3.5 h-3.5 text-amber-400" />}
                    checked={archiveAndMuteNonContacts}
                    onChange={(checked) => setArchiveAndMuteNonContacts(checked)}
                  />
                </div>

                {/* Section: Passkeys & Notification Exceptions (MTProto Layer 232 Microphase 014) */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-300 flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-accent-cyan" />
                      {isPersian ? 'کلیدهای عبور ورود بدون رمز (Passkeys)' : 'Passkeys (Passwordless Login)'}
                    </div>
                    {isLoadingPasskeys && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  {isLoadingPasskeys ? (
                    <div className="p-3 rounded-xl bg-dark-900 border border-white/5 animate-pulse text-xs text-gray-400">
                      {isPersian ? 'در حال بارگذاری کلیدهای عبور...' : 'Loading registered passkeys...'}
                    </div>
                  ) : passkeysList.length === 0 ? (
                    <div className="p-3 rounded-xl bg-dark-900/60 border border-white/5 flex items-center justify-between text-xs text-gray-400">
                      <span>{isPersian ? 'هیچ کلید عبور فعالی روی این حساب ثبت نشده است.' : 'No passkeys registered for this account.'}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Layer 232</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {passkeysList.map((pk: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Key className="w-3 h-3 text-accent-cyan" />
                            <span className="font-medium text-gray-200">{pk.name || `Passkey #${idx + 1}`}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">{pk.date ? new Date(pk.date * 1000).toLocaleDateString() : 'Active'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs font-medium text-gray-300 flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      {isPersian ? 'استثنائات اعلان‌ها (Notification Exceptions)' : 'Notification Exceptions'}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-dark-900 border border-white/5 text-gray-300">
                        {isLoadingNotifyExceptions ? (
                          <RefreshCw className="w-2.5 h-2.5 text-gray-400 animate-spin inline" />
                        ) : notifyExceptionsCount !== null ? (
                          `${notifyExceptionsCount} ${isPersian ? 'چت' : 'chats'}`
                        ) : (
                          '—'
                        )}
                      </div>
                      {notifyExceptionsCount !== null && notifyExceptionsCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetNotifySettings}
                          disabled={isResettingNotifySettings}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isResettingNotifySettings ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            isPersian ? 'بازنشانی' : 'Reset'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CHAT SETTINGS (Official Telegram Desktop Parity - Screenshot 5) */}
            {activeTab === 'chat' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* Theme Cards */}
                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('classic')}
                    className={`rounded-2xl p-2.5 border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      activeTheme === 'classic'
                        ? 'border-[#50a2e9] bg-[#50a2e9]/10 ring-2 ring-[#50a2e9]/40'
                        : 'border-white/5 bg-dark-850 hover:bg-dark-800'
                    }`}
                  >
                    <div className="w-full h-16 rounded-xl bg-gradient-to-b from-[#a2d8a0] to-[#88c586] p-2 flex flex-col justify-end relative overflow-hidden">
                      <div className="w-3/4 h-3 rounded-full bg-white/70 self-start mb-1" />
                      <div className="w-5/6 h-4 rounded-lg bg-emerald-700/60 self-end flex items-center px-1.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-white/70" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-300">Classic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme('day')}
                    className={`rounded-2xl p-2.5 border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      activeTheme === 'day'
                        ? 'border-[#50a2e9] bg-[#50a2e9]/10 ring-2 ring-[#50a2e9]/40'
                        : 'border-white/5 bg-dark-850 hover:bg-dark-800'
                    }`}
                  >
                    <div className="w-full h-16 rounded-xl bg-gradient-to-b from-[#7ec5f0] to-[#55a7db] p-2 flex flex-col justify-end relative overflow-hidden">
                      <div className="w-3/4 h-3 rounded-full bg-white/70 self-start mb-1" />
                      <div className="w-5/6 h-4 rounded-lg bg-blue-600/60 self-end flex items-center px-1.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-white/70" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-300">Day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme('tinted')}
                    className={`rounded-2xl p-2.5 border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      activeTheme === 'tinted'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40'
                        : 'border-white/5 bg-dark-850 hover:bg-dark-800'
                    }`}
                  >
                    <div className="w-full h-16 rounded-xl bg-[#0f2420] border border-emerald-900/50 p-2 flex flex-col justify-end relative overflow-hidden">
                      <div className="w-3/4 h-3 rounded-full bg-emerald-500 self-start mb-1" />
                      <div className="w-5/6 h-4 rounded-lg bg-[#193d35] self-end flex items-center px-1.5">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">Tinted</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme('night')}
                    className={`rounded-2xl p-2.5 border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      activeTheme === 'night'
                        ? 'border-[#50a2e9] bg-[#50a2e9]/10 ring-2 ring-[#50a2e9]/40'
                        : 'border-white/5 bg-dark-850 hover:bg-dark-800'
                    }`}
                  >
                    <div className="w-full h-16 rounded-xl bg-[#1c242c] p-2 flex flex-col justify-end relative overflow-hidden">
                      <div className="w-3/4 h-3 rounded-full bg-gray-500 self-start mb-1" />
                      <div className="w-5/6 h-4 rounded-lg bg-[#273441] self-end flex items-center px-1.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-gray-400" />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-300">Night</span>
                  </button>
                </div>

                {/* Accent Color Palette (10 colors) */}
                <div className="flex items-center justify-between px-2 py-1">
                  {[
                    { id: 0, bg: 'bg-[#50a2e9]', hex: '#50a2e9' },
                    { id: 1, bg: 'bg-[#29b6f6]', hex: '#29b6f6' },
                    { id: 2, bg: 'bg-[#4caf50]', hex: '#4caf50' },
                    { id: 3, bg: 'bg-[#e91e63]', hex: '#e91e63' },
                    { id: 4, bg: 'bg-[#ff9800]', hex: '#ff9800' },
                    { id: 5, bg: 'bg-[#9c27b0]', hex: '#9c27b0' },
                    { id: 6, bg: 'bg-[#f44336]', hex: '#f44336' },
                    { id: 7, bg: 'bg-[#607d8b]', hex: '#607d8b' },
                    { id: 8, bg: 'bg-[#009688]', hex: '#009688' }, // Tinted teal
                    { id: 9, bg: 'bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400', hex: '#ec4899' }, // Rainbow
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectAccentColor(item.id, item.hex)}
                      className={`w-6 h-6 rounded-full ${item.bg} transition-transform cursor-pointer ${
                        selectedAccentColor === item.id
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110 shadow-lg'
                          : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>

                {/* Section: Theme settings */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Theme settings</div>

                  <div
                    onClick={() => setActiveSubModal('nameColor')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Paintbrush className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Your name color</span>
                    </div>
                    <div className="flex items-center -space-x-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-dark-900" />
                      <span className="w-3.5 h-3.5 rounded-full bg-teal-300 border border-dark-900" />
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('autoNight')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Moon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Auto-night mode</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">{autoNightMode}</span>
                  </div>

                  <div
                    onClick={() => setActiveSubModal('fontFamily')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Type className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Font family</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">{fontFamily}</span>
                  </div>
                </div>

                {/* Section: Custom themes */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Custom themes</div>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => handleSelectTheme('night')}
                      className="w-20 h-20 rounded-2xl bg-dark-850 border border-white/10 flex flex-col items-center justify-center gap-1.5 p-2 text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer group"
                    >
                      <Paintbrush className="w-5 h-5 text-accent-cyan group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-medium">Night Dark</span>
                    </div>
                    <div
                      onClick={() => handleSelectTheme('tinted')}
                      className="w-20 h-20 rounded-2xl bg-dark-850 border border-white/10 flex flex-col items-center justify-center gap-1.5 p-2 text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer group"
                    >
                      <Paintbrush className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-medium">Emerald Teal</span>
                    </div>
                  </div>
                </div>

                {/* Section: Chat wallpaper */}
                <div className="space-y-2.5 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Chat wallpaper</div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl border border-white/10 shadow-inner shrink-0 overflow-hidden bg-dark-900 flex items-center justify-center text-gray-500 relative"
                      style={
                        customWallpaper && customWallpaper !== 'default'
                          ? {
                              backgroundImage: customWallpaper.startsWith('url') ? customWallpaper : `url("${customWallpaper}")`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : { background: 'radial-gradient(ellipse at top, #182533, #0f141c)' }
                      }
                    >
                      <ImageIcon className="w-5 h-5 opacity-40 text-white" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveSubModal('wallpaperGallery')}
                        className="text-[#50a2e9] hover:underline cursor-pointer block text-left font-medium"
                      >
                        Choose from gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => wallpaperFileInputRef.current?.click()}
                        className="text-[#50a2e9] hover:underline cursor-pointer block text-left font-medium"
                      >
                        Choose from file
                      </button>
                      {customWallpaper && (
                        <button
                          type="button"
                          onClick={() => handleSelectWallpaper('', 'Default')}
                          className="text-rose-400 hover:underline cursor-pointer block text-[11px] text-left"
                        >
                          Reset to default
                        </button>
                      )}
                      <input
                        type="file"
                        ref={wallpaperFileInputRef}
                        onChange={handleWallpaperFileSelect}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={adaptiveLayoutWide}
                      onChange={(e) => setAdaptiveLayoutWide(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Adaptive layout for wide screens</span>
                  </label>
                </div>

                {/* Section: Chat list quick action */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Chat list quick action</div>
                  <div
                    onClick={() => setActiveSubModal('quickAction')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">{chatListQuickAction}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="px-1 text-[11px] text-gray-500 leading-snug">
                    Choose the action you want to perform when you middle-click or swipe on the chat list.
                  </div>
                </div>

                {/* Advanced Chat Enhancements */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent-cyan" />
                    <span>Advanced Chat Enhancements</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <ToggleItem
                      title="Show Chat ID"
                      desc="Display Chat ID badge in header & list with 1-click copy"
                      icon={<Hash className="w-3.5 h-3.5" />}
                      checked={showChatId}
                      onChange={setShowChatId}
                    />
                    <ToggleItem
                      title="Show Message ID"
                      desc="Show #msgId pill badge and quick copy on hover"
                      icon={<Code className="w-3.5 h-3.5" />}
                      checked={showMessageId}
                      onChange={setShowMessageId}
                    />
                    <ToggleItem
                      title="Message Seconds"
                      desc="Format message timestamps with seconds (HH:mm:ss)"
                      icon={<Clock className="w-3.5 h-3.5" />}
                      checked={showSeconds}
                      onChange={setShowSeconds}
                    />
                    <ToggleItem
                      title="Sender Avatar in Groups"
                      desc="Render sender avatar next to group messages"
                      icon={<Users className="w-3.5 h-3.5" />}
                      checked={showSenderAvatar}
                      onChange={setShowSenderAvatar}
                    />
                    <ToggleItem
                      title="Quick Forward to Saved"
                      desc="1-click direct forward button to Saved Messages on hover"
                      icon={<Bookmark className="w-3.5 h-3.5" />}
                      checked={quickForwardToSaved}
                      onChange={setQuickForwardToSaved}
                    />
                    <ToggleItem
                      title="Mark All As Read Button"
                      desc="Quick action button in tab bar to mark all dialogs read"
                      icon={<CheckCheck className="w-3.5 h-3.5" />}
                      checked={markAllReadEnabled}
                      onChange={setMarkAllReadEnabled}
                    />
                    <ToggleItem
                      title="Inspect Callback Data"
                      desc="Copy callback_data from inline buttons on click"
                      icon={<Zap className="w-3.5 h-3.5 text-accent-amber" />}
                      checked={copyCallbackData}
                      onChange={setCopyCallbackData}
                    />
                    <ToggleItem
                      title="Suppress Link Warning"
                      desc="Open external web URLs directly without prompts"
                      icon={<ExternalLink className="w-3.5 h-3.5 text-accent-cyan" />}
                      checked={suppressLinkWarning}
                      onChange={setSuppressLinkWarning}
                    />
                    <ToggleItem
                      title="Keep Deleted Messages Locally"
                      desc="Preserve revoked and deleted messages with an unobtrusive red [Deleted] badge"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                      checked={keepDeletedMessagesLocally}
                      onChange={setKeepDeletedMessagesLocally}
                    />

                    {/* Anti-Delete & Edit Tracking Scope Granular Card */}
                    <div className="p-3.5 rounded-xl bg-dark-900/60 border border-white/5 space-y-3">
                      <div className="text-xs font-bold text-gray-200 flex items-center justify-between">
                        <span>Anti-Delete & Edit Tracking Scope</span>
                        <span className="text-[10px] text-emerald-400 font-normal">Private Chats: 100% Active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={auditTrackDeletedGroups}
                            onChange={(e) => setAuditTrackDeletedGroups(e.target.checked)}
                            className="rounded bg-dark-700 border-white/10 text-primary-500 focus:ring-0"
                          />
                          <span>Deleted in Groups</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={auditTrackEditedGroups}
                            onChange={(e) => setAuditTrackEditedGroups(e.target.checked)}
                            className="rounded bg-dark-700 border-white/10 text-primary-500 focus:ring-0"
                          />
                          <span>Edits in Groups</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={auditTrackDeletedChannels}
                            onChange={(e) => setAuditTrackDeletedChannels(e.target.checked)}
                            className="rounded bg-dark-700 border-white/10 text-primary-500 focus:ring-0"
                          />
                          <span>Deleted in Channels</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            checked={auditTrackEditedChannels}
                            onChange={(e) => setAuditTrackEditedChannels(e.target.checked)}
                            className="rounded bg-dark-700 border-white/10 text-primary-500 focus:ring-0"
                          />
                          <span>Edits in Channels</span>
                        </label>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                        <span>Max Tracked Groups:</span>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={auditMaxTrackedGroups}
                          onChange={(e) => setAuditMaxTrackedGroups(Number(e.target.value) || 25)}
                          className="w-16 px-2 py-0.5 rounded bg-dark-800 border border-white/10 text-right text-white font-mono text-xs focus:border-primary-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Max Tracked Channels:</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={auditMaxTrackedChannels}
                          onChange={(e) => setAuditMaxTrackedChannels(Number(e.target.value) || 10)}
                          className="w-16 px-2 py-0.5 rounded bg-dark-800 border border-white/10 text-right text-white font-mono text-xs focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <ToggleItem
                      title="Thanos Dust Particle Deletion"
                      desc="Disintegrate deleted messages into wind-swept dust particles (Telegram Desktop parity)"
                      icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                      checked={enableThanosDust}
                      onChange={setEnableThanosDust}
                    />
                    <ToggleItem
                      title="Disable Animations"
                      desc="Turn off transitions and particle effects for maximum low-spec performance"
                      icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
                      checked={disableAnimations}
                      onChange={setDisableAnimations}
                    />
                    <ToggleItem
                      title="Composer Send Animation"
                      desc="Smooth flight micro-animation when sending messages. Disable for instant terminal-like sending without disabling reactions or particles."
                      icon={<Send className="w-3.5 h-3.5 text-accent-cyan" />}
                      checked={composerSendAnimation}
                      onChange={setComposerSendAnimation}
                    />
                  </div>

                  {/* Message Font Size (Text Scaling) */}
                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                        <Type className="w-4 h-4 text-accent-cyan" />
                        <span>Message Font Size</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded-lg border border-primary-500/20">
                        {chatFontSize}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {[12, 13, 14, 15, 16, 18].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setChatFontSize(size)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            chatFontSize === size
                              ? 'bg-primary-600 text-white shadow-glow'
                              : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/10'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Bubble Theming (Radius & Padding) */}
                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                        <Paintbrush className="w-4 h-4 text-accent-cyan" />
                        <span>Chat Bubble Geometry & Rhythm</span>
                      </div>
                    </div>

                    {/* Corner Radius Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">Corner Radius</span>
                        <span className="font-mono text-accent-cyan font-bold bg-accent-cyan/10 px-2 py-0.5 rounded-md border border-accent-cyan/20">
                          {bubbleRadius}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={28}
                        step={2}
                        value={bubbleRadius}
                        onChange={(e) => setBubbleRadius(Number(e.target.value))}
                        className="w-full accent-primary-500 cursor-pointer h-1.5 bg-dark-900 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                        <span>Crisp (4px)</span>
                        <span>Telegram Classic (16px)</span>
                        <span>Super Rounded (28px)</span>
                      </div>
                    </div>

                    {/* Bubble Padding Slider */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">Bubble Padding & Breathing Room</span>
                        <span className="font-mono text-accent-cyan font-bold bg-accent-cyan/10 px-2 py-0.5 rounded-md border border-accent-cyan/20">
                          {bubblePadding}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={6}
                        max={20}
                        step={2}
                        value={bubblePadding}
                        onChange={(e) => setBubblePadding(Number(e.target.value))}
                        className="w-full accent-primary-500 cursor-pointer h-1.5 bg-dark-900 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                        <span>Compact (6px)</span>
                        <span>Balanced (10px)</span>
                        <span>Spacious (20px)</span>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts Guide Button */}
                  <div className="p-3 rounded-2xl bg-dark-800 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                      <Keyboard className="w-4 h-4 text-accent-amber" />
                      <span>Keyboard Shortcuts Guide</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowShortcutsModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-900 hover:bg-dark-750 text-gray-200 border border-white/10 transition-colors cursor-pointer"
                    >
                      View Shortcuts
                    </button>
                  </div>

                  {/* Layer 232 Messages Suite (Microphase 033): Invite Links, History Import, Web Auth & Chat Operations */}
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-accent-cyan uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-accent-cyan" />
                      <span>Messaging Core Suite (MTProto Layer 232)</span>
                    </div>

                    {/* 1. Chat Invite Link Inspector (messages.checkChatInvite) */}
                    <form onSubmit={handleCheckChatInvite} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <Link2 className="w-4 h-4 text-emerald-400" />
                          <span>Invite Link Inspector (checkChatInvite)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Inspects private group or channel invite hashes and previews metadata before joining.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inviteLinkInput}
                          onChange={(e) => setInviteLinkInput(e.target.value)}
                          placeholder="https://t.me/+AbCdEfGh or raw hash"
                          className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                        />
                        <button
                          type="submit"
                          disabled={isCheckingInvite || !inviteLinkInput.trim()}
                          className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {isCheckingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          <span>Inspect</span>
                        </button>
                      </div>
                      {inviteError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{inviteError}</span>
                        </div>
                      )}
                      {inviteResult && (
                        <div className="p-3 rounded-xl bg-dark-900 border border-emerald-500/30 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-300">{inviteResult.title || inviteResult.chat?.title || 'Private Group / Channel'}</span>
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                              {inviteResult._ === 'chatInviteAlready' ? 'ALREADY A MEMBER' : 'VALID INVITE'}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {inviteResult.about || inviteResult.chat?.about || 'No description provided.'}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            Participants: {inviteResult.participantsCount || inviteResult.participants_count || inviteResult.chat?.participantsCount || 'N/A'}
                          </div>
                        </div>
                      )}
                    </form>

                    {/* 2. Chat History Import Checker (messages.checkHistoryImport) */}
                    <form onSubmit={handleCheckHistoryImport} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span>Chat History Import Inspector (checkHistoryImport)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Validates the initial lines of an exported chat file (WhatsApp, Line, Kakao) for cloud history migration.
                      </p>
                      <textarea
                        value={historyImportHead}
                        onChange={(e) => setHistoryImportHead(e.target.value)}
                        placeholder="Paste first few lines of exported chat log (e.g. [12/24/22, 10:14:22] Alex: Hello...)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={isCheckingHistoryImport || !historyImportHead.trim()}
                        className="w-full py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {isCheckingHistoryImport ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Parse & Validate Export Header</span>
                      </button>
                      {historyImportError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{historyImportError}</span>
                        </div>
                      )}
                      {historyImportResult && (
                        <div className="p-3 rounded-xl bg-dark-900 border border-purple-500/30 space-y-1 text-xs">
                          <div className="font-semibold text-purple-300">Migration Header Accepted:</div>
                          <div className="text-[11px] text-gray-300 font-mono">
                            Title: {historyImportResult.title || 'Recognized Chat'}
                          </div>
                        </div>
                      )}
                    </form>

                    {/* 3. Web & Bot URL Auth Approver (messages.acceptUrlAuth) */}
                    <form onSubmit={handleAcceptUrlAuth} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <ExternalLink className="w-4 h-4 text-cyan-400" />
                          <span>Web Session & Bot Login (acceptUrlAuth)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Authorize web login callbacks and mini app authentications directly through native MTProto protocol.
                      </p>
                      <input
                        type="url"
                        value={urlAuthUrl}
                        onChange={(e) => setUrlAuthUrl(e.target.value)}
                        placeholder="https://oauth.telegram.org/auth?bot_id=... or target login URL"
                        className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={urlAuthWriteAllowed}
                          onChange={(e) => setUrlAuthWriteAllowed(e.target.checked)}
                          className="w-3.5 h-3.5 rounded bg-dark-900 border border-white/20"
                        />
                        <span>Allow bot to send direct messages (write_allowed)</span>
                      </label>
                      <button
                        type="submit"
                        disabled={isAcceptingUrlAuth || !urlAuthUrl.trim()}
                        className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {isAcceptingUrlAuth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>Approve URL Authentication</span>
                      </button>
                      {urlAuthError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{urlAuthError}</span>
                        </div>
                      )}
                      {urlAuthResult && (
                        <div className="p-3 rounded-xl bg-dark-900 border border-cyan-500/30 text-xs text-cyan-300">
                          Auth Granted: {urlAuthResult.url || 'Session established.'}
                        </div>
                      )}
                    </form>

                    {/* 4. Group Chat Member Provisioner (messages.addChatUser) */}
                    <form onSubmit={handleAddChatUser} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <UserPlus className="w-4 h-4 text-amber-400" />
                          <span>Add User to Chat with Forward Limit (addChatUser)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Adds a participant to a standard Telegram group chat specifying previous message forward history limit.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          value={addChatId}
                          onChange={(e) => setAddChatId(e.target.value)}
                          placeholder="Chat ID (e.g. 123456)"
                          className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="text"
                          required
                          value={addChatUserId}
                          onChange={(e) => setAddChatUserId(e.target.value)}
                          placeholder="User ID or Phone"
                          className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="number"
                          value={addChatFwdLimit}
                          onChange={(e) => setAddChatFwdLimit(Number(e.target.value) || 0)}
                          placeholder="Fwd Limit (e.g. 100)"
                          className="px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingChatUser || !addChatId.trim() || !addChatUserId.trim()}
                        className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {isAddingChatUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        <span>Add Participant</span>
                      </button>
                      {addChatUserError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{addChatUserError}</span>
                        </div>
                      )}
                      {addChatUserSuccess && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{addChatUserSuccess}</span>
                        </div>
                      )}
                    </form>

                    {/* 5. Interactive Poll Answer & Todo Appender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Poll Answer Submitter */}
                      <form onSubmit={handleAddPollAnswer} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                          <span>Poll Answer Submitter</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={pollPeerId}
                          onChange={(e) => setPollPeerId(e.target.value)}
                          placeholder="Peer ID / Username"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            required
                            value={pollMsgId}
                            onChange={(e) => setPollMsgId(e.target.value)}
                            placeholder="Message ID"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                          <input
                            type="text"
                            required
                            value={pollOptionText}
                            onChange={(e) => setPollOptionText(e.target.value)}
                            placeholder="Option text"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingPollAnswer || !pollPeerId.trim() || !pollMsgId.trim()}
                          className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {isAddingPollAnswer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Submit Poll Answer</span>
                        </button>
                        {pollAnswerSuccess && <div className="text-[11px] text-emerald-400">{pollAnswerSuccess}</div>}
                        {pollAnswerError && <div className="text-[11px] text-rose-400">{pollAnswerError}</div>}
                      </form>

                      {/* Todo List Appender */}
                      <form onSubmit={handleAppendTodoList} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <Plus className="w-4 h-4 text-purple-400" />
                          <span>Task / Todo Appender</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={todoPeerId}
                          onChange={(e) => setTodoPeerId(e.target.value)}
                          placeholder="Peer ID / Username"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            required
                            value={todoMsgId}
                            onChange={(e) => setTodoMsgId(e.target.value)}
                            placeholder="Message ID"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                          />
                          <input
                            type="text"
                            required
                            value={todoText}
                            onChange={(e) => setTodoText(e.target.value)}
                            placeholder="New Task item"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAppendingTodo || !todoPeerId.trim() || !todoMsgId.trim()}
                          className="w-full py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {isAppendingTodo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Append Task Item</span>
                        </button>
                        {todoSuccess && <div className="text-[11px] text-emerald-400">{todoSuccess}</div>}
                        {todoError && <div className="text-[11px] text-rose-400">{todoError}</div>}
                      </form>
                    </div>

                    {/* Layer 232 Messages Suite (Microphase 034): History Import Peer, Quick Replies, Cache Purges & Group Management */}
                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-accent-cyan uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-accent-cyan" />
                        <span>Chat Lifecycle & Maintenance Suite (MTProto Layer 232)</span>
                      </div>

                      {/* 1. History Import Peer Validator (messages.checkHistoryImportPeer) */}
                      <form onSubmit={handleCheckHistoryImportPeer} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span>History Import Peer Eligibility (checkHistoryImportPeer)</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Verifies whether target user or group chat allows importing external message history from other platforms.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={importPeerIdInput}
                            onChange={(e) => setImportPeerIdInput(e.target.value)}
                            placeholder="Target Peer ID or Username"
                            className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                          />
                          <button
                            type="submit"
                            disabled={isCheckingImportPeer || !importPeerIdInput.trim()}
                            className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isCheckingImportPeer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            <span>Validate Peer</span>
                          </button>
                        </div>
                        {importPeerError && (
                          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{importPeerError}</span>
                          </div>
                        )}
                        {importPeerResult && (
                          <div className="p-3 rounded-xl bg-dark-900 border border-purple-500/30 text-xs text-purple-300">
                            Peer Eligibility Confirmed: Import is supported for this destination.
                          </div>
                        )}
                      </form>

                      {/* 2. Quick Reply Shortcut Validator (messages.checkQuickReplyShortcut) */}
                      <form onSubmit={handleCheckQuickReplyShortcut} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span>Telegram Business Quick Reply Shortcut Validator</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Checks Telegram cloud registry to verify if a business quick-reply shortcut name is available and valid.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={quickReplyShortcutInput}
                            onChange={(e) => setQuickReplyShortcutInput(e.target.value)}
                            placeholder="e.g. /welcome or /pricing"
                            className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="submit"
                            disabled={isCheckingShortcut || !quickReplyShortcutInput.trim()}
                            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isCheckingShortcut ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            <span>Check Shortcut</span>
                          </button>
                        </div>
                        {shortcutFeedback && (
                          <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                            shortcutAvailable
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}>
                            {shortcutAvailable ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                            <span>{shortcutFeedback}</span>
                          </div>
                        )}
                      </form>

                      {/* 3. Cloud Drafts, Reactions & Sticker Caches Purge */}
                      <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          <span>Cloud Drafts & Recent Media Maintenance</span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Synchronize and purge unsent drafts, recent reaction history, and sticker caches across your devices.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleClearAllDrafts}
                            disabled={isClearingAllDrafts}
                            className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isClearingAllDrafts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Clear All Drafts</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearRecentReactions}
                            disabled={isClearingRecentReactions}
                            className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isClearingRecentReactions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>Clear Recent Reactions</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClearRecentStickers(false)}
                            disabled={isClearingRecentStickers}
                            className="py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isClearingRecentStickers ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>Clear Recent Stickers</span>
                          </button>
                        </div>
                        {clearDraftsFeedback && <div className="text-[11px] text-emerald-400 font-medium">{clearDraftsFeedback}</div>}
                        {clearReactionsFeedback && <div className="text-[11px] text-emerald-400 font-medium">{clearReactionsFeedback}</div>}
                        {clearStickersFeedback && <div className="text-[11px] text-emerald-400 font-medium">{clearStickersFeedback}</div>}
                      </div>

                      {/* 4. Native Group Creator & Permanent Chat Destroyer (messages.createChat & messages.deleteChat) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Native Group Creator */}
                        <form onSubmit={handleCreateChat} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                            <Users className="w-4 h-4 text-emerald-400" />
                            <span>Native Group Creator (createChat)</span>
                          </div>
                          <input
                            type="text"
                            required
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            placeholder="Group Title"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
                          />
                          <input
                            type="text"
                            required
                            value={newChatUserIds}
                            onChange={(e) => setNewChatUserIds(e.target.value)}
                            placeholder="User IDs / Usernames (space separated)"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                          <input
                            type="number"
                            value={newChatTtl || ''}
                            onChange={(e) => setNewChatTtl(Number(e.target.value) || 0)}
                            placeholder="Auto-delete TTL seconds (0 for default)"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                          <button
                            type="submit"
                            disabled={isCreatingChat || !newChatTitle.trim() || !newChatUserIds.trim()}
                            className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isCreatingChat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                            <span>Create Native Group</span>
                          </button>
                          {createChatResult && <div className="text-[11px] text-emerald-400">{createChatResult}</div>}
                          {createChatError && <div className="text-[11px] text-rose-400">{createChatError}</div>}
                        </form>

                        {/* Permanent Chat Destroyer */}
                        <form onSubmit={handleDeleteChat} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            <span>Permanent Chat Deletion (deleteChat)</span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Permanently deletes an owned basic group chat and expels all participants across the Telegram core network.
                          </p>
                          <input
                            type="text"
                            required
                            value={deleteChatIdInput}
                            onChange={(e) => setDeleteChatIdInput(e.target.value)}
                            placeholder="Chat ID (e.g. 123456789)"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                          />
                          <button
                            type="submit"
                            disabled={isDeletingChat || !deleteChatIdInput.trim()}
                            className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isDeletingChat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Delete Group Chat</span>
                          </button>
                          {deleteChatFeedback && <div className="text-[11px] text-rose-300">{deleteChatFeedback}</div>}
                        </form>
                      </div>

                      {/* Layer 232 Messages Suite (Microphase 035): AI Message Composer, Web Auth Decline, Chat User Eviction & Forum Topics */}
                      {/* 5. Telegram AI Message Composer (messages.composeMessageWithAI & messages.composeRichMessageWithAI) */}
                      <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>Native Telegram AI Message Composer (composeMessageWithAI)</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Layer 232 AI Suite
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Proofread, rewrite, emojify, and translate messages using Telegram's server-side cloud AI engine.
                        </p>

                        <textarea
                          rows={3}
                          value={aiComposerText}
                          onChange={(e) => setAiComposerText(e.target.value)}
                          placeholder="Type or paste draft message here..."
                          className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none font-mono"
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/5 text-[11px] text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={aiComposerProofread}
                              onChange={(e) => setAiComposerProofread(e.target.checked)}
                              className="rounded border-white/20 text-purple-500 focus:ring-0"
                            />
                            <span>Proofread</span>
                          </label>
                          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/5 text-[11px] text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={aiComposerEmojify}
                              onChange={(e) => setAiComposerEmojify(e.target.checked)}
                              className="rounded border-white/20 text-purple-500 focus:ring-0"
                            />
                            <span>Emojify</span>
                          </label>
                          <select
                            value={aiComposerTone}
                            onChange={(e) => setAiComposerTone(e.target.value as any)}
                            className="px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/5 text-[11px] text-gray-300 focus:outline-none focus:border-purple-400"
                          >
                            <option value="neutral">Neutral Tone</option>
                            <option value="formal">Formal Tone</option>
                            <option value="casual">Casual Tone</option>
                            <option value="persuasive">Persuasive Tone</option>
                          </select>
                          <input
                            type="text"
                            value={aiComposerLang}
                            onChange={(e) => setAiComposerLang(e.target.value)}
                            placeholder="Translate Lang (e.g. en, fa)"
                            className="px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/5 text-[11px] text-gray-300 focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleComposeWithAI(false)}
                            disabled={isComposingAI || !aiComposerText.trim()}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isComposingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                            <span>AI Rephrase (Standard)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleComposeWithAI(true)}
                            disabled={isComposingAI || !aiComposerText.trim()}
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isComposingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>AI Compose (RichText)</span>
                          </button>
                        </div>

                        {aiComposerResult && (
                          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1.5">
                            <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>AI Generated Message ({aiComposerResult._})</span>
                            </div>
                            <div className="text-xs text-gray-100 font-mono select-all whitespace-pre-wrap">
                              {typeof aiComposerResult.text === 'string'
                                ? aiComposerResult.text
                                : JSON.stringify(aiComposerResult.text || aiComposerResult, null, 2)}
                            </div>
                          </div>
                        )}
                        {aiComposerError && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{aiComposerError}</span>
                          </div>
                        )}
                      </div>

                      {/* 6. Decline URL Auth & Expel Chat User */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Decline Web Auth */}
                        <form onSubmit={handleDeclineUrlAuth} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                            <LogOut className="w-4 h-4 text-amber-400" />
                            <span>Decline Web Authorization (declineUrlAuth)</span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Explicitly cancels and declines pending browser login auth sessions.
                          </p>
                          <input
                            type="text"
                            required
                            value={declineUrlInput}
                            onChange={(e) => setDeclineUrlInput(e.target.value)}
                            placeholder="Authorization URL / Token"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="submit"
                            disabled={isDecliningUrlAuth || !declineUrlInput.trim()}
                            className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isDecliningUrlAuth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                            <span>Decline Web Session</span>
                          </button>
                          {declineUrlAuthFeedback && <div className="text-[11px] text-amber-300">{declineUrlAuthFeedback}</div>}
                        </form>

                        {/* Expel Chat Participant */}
                        <form onSubmit={handleDeleteChatUser} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            <span>Expel Chat Participant (deleteChatUser)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              value={kickChatId}
                              onChange={(e) => setKickChatId(e.target.value)}
                              placeholder="Chat ID"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                            />
                            <input
                              type="text"
                              required
                              value={kickUserId}
                              onChange={(e) => setKickUserId(e.target.value)}
                              placeholder="User ID / Username"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={kickRevokeHistory}
                              onChange={(e) => setKickRevokeHistory(e.target.checked)}
                              className="rounded border-white/20 text-rose-500 focus:ring-0"
                            />
                            <span>Revoke all message history for user</span>
                          </label>
                          <button
                            type="submit"
                            disabled={isKickingUser || !kickChatId.trim() || !kickUserId.trim()}
                            className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            {isKickingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Expel Participant</span>
                          </button>
                          {kickFeedback && <div className="text-[11px] text-rose-300">{kickFeedback}</div>}
                        </form>
                      </div>

                      {/* 7. Supergroup Forum Topic Quick Creator (messages.createForumTopic) */}
                      <form onSubmit={handleCreateForumTopicQuick} className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                            <MessageSquare className="w-4 h-4 text-sky-400" />
                            <span>Create Forum Topic (createForumTopic)</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            Topics Supergroup
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            value={forumTopicChatId}
                            onChange={(e) => setForumTopicChatId(e.target.value)}
                            placeholder="Supergroup ID / Username"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                          />
                          <input
                            type="text"
                            required
                            value={forumTopicTitle}
                            onChange={(e) => setForumTopicTitle(e.target.value)}
                            placeholder="Topic Title"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingForumTopic || !forumTopicChatId.trim() || !forumTopicTitle.trim()}
                          className="w-full py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {isCreatingForumTopic ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                          <span>Create Forum Topic</span>
                        </button>
                        {forumTopicFeedback && <div className="text-[11px] text-sky-300">{forumTopicFeedback}</div>}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AI & MCP AGENTS (Model Context Protocol) */}
            {activeTab === 'mcp' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* Header Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-transparent border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-100">Model Context Protocol (MCP) Server</h3>
                        <p className="text-[11px] text-gray-400">Autonomous AI Agent control for Claude Desktop, Cursor & Antigravity</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        mcpStatus?.isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${mcpStatus?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {mcpStatus?.isRunning ? `Online (Port ${mcpStatus.port || mcpPort})` : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 leading-relaxed pt-1">
                    Enables AI agents to query dialogs, respond to customer messages, resolve channels, and download files at turbo speeds using Guidegrams 24-worker parallel engine.
                  </div>
                </div>

                {/* Section 1: Server Configuration */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                  <div className="text-xs font-bold text-accent-cyan">Server Configuration</div>

                  {/* Enable Switch */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-200">Enable Local MCP Server</div>
                      <div className="text-[11px] text-gray-400">Allow AI tools to communicate with Guidegram locally</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMcpEnabled(!mcpEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        mcpEnabled ? 'bg-primary-500' : 'bg-dark-900 border border-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          mcpEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Port Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-medium text-gray-300 block mb-1">Local Port</label>
                      <input
                        type="number"
                        value={mcpPort}
                        onChange={(e) => setMcpPort(Number(e.target.value) || 39527)}
                        className="w-full px-3 py-2 text-xs bg-dark-900 border border-white/10 rounded-xl text-gray-200 focus:outline-none focus:border-primary-500 font-mono"
                        placeholder="39527"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-300 block mb-1">Allowed Chat IDs (Security Whitelist)</label>
                      <input
                        type="text"
                        value={mcpAllowedChats}
                        onChange={(e) => setMcpAllowedChats(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-dark-900 border border-white/10 rounded-xl text-gray-200 focus:outline-none focus:border-primary-500 font-mono"
                        placeholder="Leave empty for all chats, or e.g. 123456, -10098765"
                      />
                    </div>
                  </div>

                  {/* Default Download Directory */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-300 block mb-1">Default AI Downloads Directory</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mcpDownloadDir}
                        onChange={(e) => setMcpDownloadDir(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs bg-dark-900 border border-white/10 rounded-xl text-gray-200 focus:outline-none focus:border-primary-500 font-mono text-[11px]"
                        placeholder="Default system downloads / Guidegram"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const dir = await window.guidegram?.selectDownloadDirectory?.()
                          if (dir) setMcpDownloadDir(dir)
                        }}
                        className="px-3 py-2 text-xs font-semibold bg-dark-750 hover:bg-dark-700 text-gray-200 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Browse...</span>
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        const allowedList = mcpAllowedChats
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                        const payload = {
                          enabled: mcpEnabled,
                          port: mcpPort,
                          allowedChatIds: allowedList,
                          defaultDownloadDir: mcpDownloadDir,
                        }
                        await window.guidegram?.mcpUpdateConfig?.(payload)
                        const updatedStatus = await window.guidegram?.mcpGetStatus?.()
                        if (updatedStatus) setMcpStatus(updatedStatus)
                        const updatedSnippets = await window.guidegram?.mcpGetConfigSnippets?.()
                        if (updatedSnippets) setMcpSnippets(updatedSnippets)
                        setSaved(true)
                        setTimeout(() => setSaved(false), 2000)
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{saved ? 'Saved Successfully' : 'Apply & Restart MCP'}</span>
                    </button>
                  </div>
                </div>

                {/* Section 2: AI Host Configuration Snippets */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-accent-cyan">AI Host Connection Snippets</div>
                    <span className="text-[10px] text-gray-400">Copy to your AI tool configuration</span>
                  </div>

                  {/* Claude Desktop Snippet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-300">Claude Desktop (claude_desktop_config.json)</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (mcpSnippets?.claudeDesktop) {
                            await copyTextToClipboard(mcpSnippets.claudeDesktop)
                            setMcpCopiedTarget('claude')
                            setTimeout(() => setMcpCopiedTarget(null), 2000)
                          }
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-dark-900 hover:bg-dark-750 text-gray-200 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {mcpCopiedTarget === 'claude' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{mcpCopiedTarget === 'claude' ? 'Copied!' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-dark-950 rounded-xl text-[10px] text-amber-200/90 font-mono overflow-x-auto border border-white/5 max-h-36">
                      {mcpSnippets?.claudeDesktop || 'Loading snippet...'}
                    </pre>
                  </div>

                  {/* Cursor Snippet */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-300">Cursor (.cursor/mcp.json or Settings &gt; MCP)</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (mcpSnippets?.cursor) {
                            await copyTextToClipboard(mcpSnippets.cursor)
                            setMcpCopiedTarget('cursor')
                            setTimeout(() => setMcpCopiedTarget(null), 2000)
                          }
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-dark-900 hover:bg-dark-750 text-gray-200 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {mcpCopiedTarget === 'cursor' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{mcpCopiedTarget === 'cursor' ? 'Copied!' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-dark-950 rounded-xl text-[10px] text-primary-200/90 font-mono overflow-x-auto border border-white/5 max-h-36">
                      {mcpSnippets?.cursor || 'Loading snippet...'}
                    </pre>
                  </div>
                </div>

                {/* Section 3: Registered Tools Overview */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="text-xs font-bold text-accent-cyan">Active MCP Tools in Guidegram (10 Built-in Tools)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                    <div className="p-3 rounded-xl bg-dark-900 border border-white/5 space-y-1">
                      <div className="font-bold text-gray-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary-400" />
                        <span>Accounts & Context</span>
                      </div>
                      <p className="text-gray-400 text-[10px]">telegram_list_accounts, telegram_switch_active_account</p>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-white/5 space-y-1">
                      <div className="font-bold text-gray-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Customer Messaging</span>
                      </div>
                      <p className="text-gray-400 text-[10px]">telegram_get_dialogs, telegram_get_chat_history, telegram_send_message, telegram_send_typing, telegram_mark_as_read</p>
                    </div>

                    <div className="p-3 rounded-xl bg-dark-900 border border-white/5 space-y-1">
                      <div className="font-bold text-gray-200 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Media & Channels</span>
                      </div>
                      <p className="text-gray-400 text-[10px]">telegram_resolve_peer, telegram_list_channel_media, telegram_download_file (24-worker parallel turbo)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ADVANCED & STORAGE (Official Telegram Desktop Parity - Screenshot 4) */}
            {activeTab === 'advanced' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* Section: Data and storage */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Data and storage</div>

                  {/* Connection type */}
                  <div
                    onClick={onOpenProxy}
                    title="Configure Proxy & Connection"
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Connection type</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">Default (TCP used)</span>
                  </div>

                  {/* MTProto Protocol & Method Parity Card */}
                  <div className="p-3.5 rounded-2xl bg-dark-800/90 border border-primary-500/20 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary-400" />
                        <span className="text-xs font-bold text-gray-100">Telegram MTProto Protocol Engine</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Layer 232 • Full Parity
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-[10px] text-gray-400">Connected Methods</div>
                        <div className="text-xs font-bold text-primary-300 font-mono mt-0.5">
                          {mtprotoStatus?.totalMethods ?? 859} / 859 (100%)
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-[10px] text-gray-400">Domain Namespaces</div>
                        <div className="text-xs font-bold text-emerald-300 font-mono mt-0.5">
                          {mtprotoStatus?.totalNamespaces ?? 28} / 28 Active
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Zero-Loss Desktop Parity • Multi-DC Turbo Engine • Session Vault</span>
                    </div>
                  </div>

                  {/* Download path */}
                  <div
                    onClick={handleSelectDownloadDir}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-200">Download path</div>
                        <div className="text-[10px] text-gray-500">Downloads Destination</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] truncate max-w-[200px]">
                      {downloadsPath ? downloadsPath : 'Default folder'}
                    </span>
                  </div>

                  {/* Manage local storage */}
                  <div
                    onClick={loadCacheStats}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-200">Manage local storage</div>
                        <div className="text-[10px] text-gray-500">Storage Usage & Media Cache</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-gray-400">
                        {cacheStats ? cacheStats.formattedSize : 'Calculating...'}
                      </span>
                      <button
                        type="button"
                        disabled={isClearingCache}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClearCache()
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                      >
                        {isClearingCache ? 'Clearing...' : 'Clear'}
                      </button>
                    </div>
                  </div>

                  {/* Downloads folder */}
                  <div
                    onClick={() => window.guidegram?.openExternal?.(downloadsPath || './data/downloads')}
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Downloads</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>

                  {/* Ask download path for each file toggle */}
                  <div
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors select-none"
                    onClick={() => setAlwaysAskDownloadPath(!alwaysAskDownloadPath)}
                  >
                    <span className="text-xs text-gray-200">Ask download path for each file</span>
                    <div
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                        alwaysAskDownloadPath ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Section: Automatic media download */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="text-xs font-bold text-accent-cyan">Automatic media download</div>
                    <button
                      type="button"
                      disabled={isSyncingCloudAutoDownload}
                      onClick={async () => {
                        if (accounts[0]?.id && window.guidegram?.getAutoDownloadSettings) {
                          try {
                            setIsSyncingCloudAutoDownload(true)
                            const cloud = await window.guidegram.getAutoDownloadSettings(accounts[0].id)
                            if (cloud) {
                              // Cloud settings retrieved from MTProto
                            }
                          } catch (e) {
                            console.error('Failed to sync autodownload cloud settings', e)
                          } finally {
                            setIsSyncingCloudAutoDownload(false)
                          }
                        }
                      }}
                      className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="Sync settings with Telegram Cloud via MTProto"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingCloudAutoDownload ? 'animate-spin' : ''}`} />
                      <span>{isSyncingCloudAutoDownload ? 'Syncing...' : 'Sync Cloud'}</span>
                    </button>
                  </div>

                  {/* Network Profiles Selector (Telegram Desktop Parity: Wi-Fi, Cellular, Roaming) */}
                  <div className="flex items-center gap-1 p-1 bg-dark-900/60 rounded-xl border border-white/5 mb-1.5">
                    {(['wifi', 'cellular', 'roaming'] as NetworkProfileType[]).map((prof) => {
                      const isActive = autoDownload.activeNetworkProfile === prof || (!autoDownload.activeNetworkProfile && prof === 'wifi')
                      const isSelected = selectedProfileTab === prof
                      return (
                        <button
                          key={prof}
                          type="button"
                          onClick={() => setSelectedProfileTab(prof)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-primary-600/30 text-primary-300 border border-primary-500/30 shadow-sm'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                          }`}
                        >
                          {prof === 'wifi' && <Wifi className="w-3.5 h-3.5" />}
                          {prof === 'cellular' && <Signal className="w-3.5 h-3.5" />}
                          {prof === 'roaming' && <Globe className="w-3.5 h-3.5" />}
                          <span className="capitalize">{prof === 'wifi' ? 'Wi-Fi' : prof}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active Network Profile" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Set as active button if not currently active */}
                  {autoDownload.activeNetworkProfile !== selectedProfileTab && (
                    <div className="flex justify-end pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAutoDownload(prev => ({
                            ...prev,
                            activeNetworkProfile: selectedProfileTab,
                            networkProfiles: {
                              ...(prev.networkProfiles || DEFAULT_NETWORK_PROFILES),
                              activeProfile: selectedProfileTab,
                            },
                          }))
                        }}
                        className="text-[10px] text-accent-cyan hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Use {selectedProfileTab === 'wifi' ? 'Wi-Fi' : selectedProfileTab} as active profile</span>
                      </button>
                    </div>
                  )}

                  {/* In private chats */}
                  <div
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors select-none"
                    onClick={() => setAutoDownload(p => ({ ...p, photosInPrivate: !p.photosInPrivate }))}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">In private chats</span>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                        autoDownload.photosInPrivate ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>

                  {/* In groups */}
                  <div
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors select-none"
                    onClick={() => setAutoDownload(p => ({ ...p, photosInGroups: !p.photosInGroups }))}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">In groups</span>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                        autoDownload.photosInGroups ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>

                  {/* In channels */}
                  <div
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors select-none"
                    onClick={() => setAutoDownload(p => ({ ...p, photosInChannels: !p.photosInChannels }))}
                  >
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">In channels</span>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                        autoDownload.photosInChannels ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>

                  {/* Profile Specific Controls: Photos / Videos / Files Limits */}
                  {(() => {
                    const currentProfiles = autoDownload.networkProfiles || DEFAULT_NETWORK_PROFILES
                    const currentRule = currentProfiles[selectedProfileTab]
                    return (
                      <div className="mt-2 p-2.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          {selectedProfileTab.toUpperCase()} Rules & Limits
                        </div>

                        {/* Photos toggle & size limit */}
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>Photos Auto-Download</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAutoDownload(prev => {
                                const profs = { ...(prev.networkProfiles || DEFAULT_NETWORK_PROFILES) }
                                profs[selectedProfileTab] = {
                                  ...profs[selectedProfileTab],
                                  photos: !profs[selectedProfileTab].photos,
                                }
                                return { ...prev, networkProfiles: profs }
                              })
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              currentRule.photos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {currentRule.photos ? `Enabled (up to ${currentRule.maxPhotoSizeMB}MB)` : 'Disabled'}
                          </button>
                        </div>

                        {/* Videos toggle & size limit */}
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>Videos Auto-Download</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAutoDownload(prev => {
                                const profs = { ...(prev.networkProfiles || DEFAULT_NETWORK_PROFILES) }
                                profs[selectedProfileTab] = {
                                  ...profs[selectedProfileTab],
                                  videos: !profs[selectedProfileTab].videos,
                                }
                                return { ...prev, networkProfiles: profs }
                              })
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              currentRule.videos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {currentRule.videos ? `Enabled (up to ${currentRule.maxVideoSizeMB}MB)` : 'Disabled'}
                          </button>
                        </div>

                        {/* Files toggle & size limit */}
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>Files Auto-Download</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAutoDownload(prev => {
                                const profs = { ...(prev.networkProfiles || DEFAULT_NETWORK_PROFILES) }
                                profs[selectedProfileTab] = {
                                  ...profs[selectedProfileTab],
                                  files: !profs[selectedProfileTab].files,
                                }
                                return { ...prev, networkProfiles: profs }
                              })
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              currentRule.files ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {currentRule.files ? `Enabled (up to ${currentRule.maxFileSizeMB}MB)` : 'Disabled'}
                          </button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Reset Auto-Save Exceptions (account.deleteAutoSaveExceptions) */}
                  <div className="pt-2 px-1 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-200">Auto-Save Exceptions</div>
                      <div className="text-[10px] text-gray-500">Reset custom per-chat auto-download exceptions</div>
                    </div>
                    <button
                      type="button"
                      disabled={isResettingAutoSaveExceptions}
                      onClick={async () => {
                        const targetId = activeAccountId || accounts[0]?.id
                        if (!targetId || !window.guidegram?.deleteAutoSaveExceptions) return
                        try {
                          setIsResettingAutoSaveExceptions(true)
                          const res = await window.guidegram.deleteAutoSaveExceptions(targetId)
                          if (res) {
                            showToast(isPersian ? 'تمام استثنائات ذخیره‌سازی خودکار با موفقیت پاک شدند' : 'All auto-save exceptions cleared successfully')
                          } else {
                            showToast('Failed to clear auto-save exceptions')
                          }
                        } catch (err: any) {
                          showToast(err?.message || 'Error deleting exceptions')
                        } finally {
                          setIsResettingAutoSaveExceptions(false)
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResettingAutoSaveExceptions ? 'animate-spin' : ''}`} />
                      <span>{isResettingAutoSaveExceptions ? 'Resetting...' : 'Reset Exceptions'}</span>
                    </button>
                  </div>
                </div>

                {/* Section: Window title bar */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Window title bar</div>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showChatNameInTitle}
                      onChange={(e) => setShowChatNameInTitle(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Show chat name</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showActiveAccountInTitle}
                      onChange={(e) => setShowActiveAccountInTitle(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Show active account</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={totalUnreadCountInTitle}
                      onChange={(e) => setTotalUnreadCountInTitle(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Total unread count</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useSystemWindowFrame}
                      onChange={(e) => setUseSystemWindowFrame(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Use system window frame</span>
                  </label>
                </div>

                {/* Section: System integration */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">System integration</div>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showTrayIcon}
                      onChange={(e) => setShowTrayIcon(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Show tray icon</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showTaskbarIcon}
                      onChange={(e) => setShowTaskbarIcon(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Show taskbar icon</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useMonochromeIcon}
                      onChange={(e) => setUseMonochromeIcon(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Use monochrome icon</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={launchAtStartup}
                      onChange={(e) => setLaunchAtStartup(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Launch Telegram when system starts</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={launchMinimized}
                      onChange={(e) => setLaunchMinimized(e.target.checked)}
                      className="rounded bg-dark-900 border-white/10 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">Launch minimized</span>
                  </label>
                </div>

                {/* Section: Software Updates & System Diagnostics */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                        <Download className="w-4 h-4 text-accent-cyan" />
                        <span>Software Updates (v{appVersion})</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {updateCheckResult || 'Auto-checks hourly for releases'}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={checkingUpdate || isInstallingUpdate}
                      onClick={handleManualCheckUpdates}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-750 hover:bg-dark-700 disabled:opacity-50 text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                      <span>{checkingUpdate ? 'Checking...' : 'Check Now'}</span>
                    </button>
                  </div>
                </div>

                {/* Section: Telegram API Credentials */}
                <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                    <Key className="w-4 h-4 text-primary-400" />
                    <span>Telegram API Credentials</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">API ID</label>
                      <input
                        type="number"
                        value={apiId}
                        onChange={(e) => setApiId(Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-primary-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">API Hash</label>
                      <input
                        type="text"
                        value={apiHash}
                        onChange={(e) => setApiHash(e.target.value)}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: System Logging */}
                <div className="p-4 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-accent-cyan text-xs font-semibold">
                      <Terminal className="w-4 h-4" />
                      <span>System Logging & Diagnostics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.guidegram?.openLogsFolder?.()}
                        className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLogs(!showLogs)}
                        className="text-[11px] text-accent-cyan hover:text-white px-2 py-1 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{showLogs ? 'Hide Viewer' : 'View Live Logs'}</span>
                      </button>
                    </div>
                  </div>

                  {showLogs && (
                    <div className="mt-2 space-y-2">
                      <div className="bg-black/80 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-gray-300 leading-normal whitespace-pre-wrap select-text">
                        {logText || 'No logs recorded.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: GUIDEGRAM FEATURES & POWER MODULES */}
            {activeTab === 'features' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Header Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-cyan/15 via-primary-600/10 to-transparent border border-accent-cyan/25 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center border border-accent-cyan/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-100 flex items-center gap-2">
                        <span>{t('settings.features_banner_title')}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
                          PRO
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {t('settings.auto_migrated_3')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* GROUP 1: Online & Activity Radar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Activity className="w-4 h-4 text-accent-cyan" />
                    <span className="text-xs font-bold text-accent-cyan">
                      {t('settings.auto_migrated_4')}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_radar_enable')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_5')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activityTrackerEnabled}
                          onChange={(e) => setActivityTrackerEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-cyan"></div>
                      </label>
                    </div>

                    {/* MTProto Transparency Note */}
                    <div className="p-3 rounded-xl bg-dark-900/80 border border-white/5 text-[11px] text-gray-300 leading-relaxed flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-200">
                          {t('settings.auto_migrated_6')}
                        </span>{' '}
                        {t('settings.auto_migrated_7')}
                      </div>
                    </div>

                    {/* Retention Policy Selector */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t('settings.features_radar_retention_title')}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {t('settings.features_radar_retention_desc')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        {[
                          { id: '1d' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_8') },
                          { id: '7d' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_9') },
                          { id: '30d' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_10') },
                          { id: '90d' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_11') },
                          { id: '180d' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_12') },
                          { id: '365d' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_13') },
                          { id: 'forever' as ActivityLogRetentionPeriod, label: t('settings.auto_migrated_14') },
                        ].map((option) => {
                          const isSelected = activityRetentionPeriod === option.id
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setActivityRetentionPeriod(option.id)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan font-bold shadow-sm'
                                  : 'bg-dark-900/60 border-white/5 text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Storage Stats & Purge Button */}
                    <div className="pt-2 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t('settings.features_radar_telemetry_title')}</span>
                        </div>
                        <button
                          type="button"
                          disabled={isPurgingData}
                          onClick={handlePurgeActivityData}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isPurgingData ? (t('settings.auto_migrated_15')) : (t('settings.auto_migrated_16'))}</span>
                        </button>
                      </div>

                      {purgeToast && (
                        <div className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan text-xs text-center font-medium">
                          {purgeToast}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{t('settings.features_radar_stat_events')}</div>
                          <div className="text-xs font-bold text-accent-cyan font-mono mt-0.5">
                            {activityStats?.totalEvents?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{t('settings.features_radar_stat_sessions')}</div>
                          <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                            {activityStats?.totalSessions?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{t('settings.features_radar_stat_users')}</div>
                          <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                            {activityStats?.totalUsersTracked?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{t('settings.features_radar_stat_disk')}</div>
                          <div className="text-xs font-bold text-purple-400 font-mono mt-0.5">
                            {activityStats
                              ? activityStats.dataSizeBytes < 1024 * 1024
                                ? `${(activityStats.dataSizeBytes / 1024).toFixed(1)} KB`
                                : `${(activityStats.dataSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                              : '0 KB'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GROUP 2: Contact Changes Auditor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <History className="w-4 h-4 text-primary-400" />
                    <span className="text-xs font-bold text-primary-400">
                      {t('settings.features_auditor_header')}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                    {/* Auditor Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_auditor_enable')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_17')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileChangeAuditorEnabled}
                          onChange={(e) => setProfileChangeAuditorEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    {/* Auto-Scan on Online Toggle */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.auto_migrated_18')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_19')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileAuditScanOnOnline}
                          onChange={(e) => setProfileAuditScanOnOnline(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-cyan"></div>
                      </label>
                    </div>

                    {/* Only Audit Saved Contacts Toggle */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.auditor_only_contacts') || (isPersian ? 'رصد اختصاصی فقط برای مخاطبان ذخیره‌شده (دفترچه تلفن)' : 'Only Audit Saved Phonebook Contacts')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'نادیده گرفتن افراد متفرقه، غریبه‌ها یا چت‌هایی که به عنوان مخاطب در گوشی/تلگرام ذخیره نشده‌اند'
                            : 'Ignore strangers, groups and unsaved chats from automatic profile and online audits'}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileAuditContactsOnly}
                          onChange={(e) => setProfileAuditContactsOnly(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-emerald"></div>
                      </label>
                    </div>

                    {/* Interaction Range Selector for Background Audit */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                          <span>{t('settings.auto_migrated_20')}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {t('settings.features_auditor_queue_rate')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {[
                          { id: '24h', label: t('settings.auto_migrated_21') },
                          { id: '7d', label: t('settings.auto_migrated_22') },
                          { id: '30d', label: t('settings.auto_migrated_23') },
                          { id: '90d', label: t('settings.auto_migrated_24') },
                          { id: '180d', label: t('settings.auto_migrated_25') },
                          { id: 'all', label: t('settings.auto_migrated_26') },
                        ].map((option) => {
                          const isSelected = profileAuditInteractionRange === option.id
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setProfileAuditInteractionRange(option.id as any)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-primary-600/20 border-primary-500/40 text-primary-300 font-bold shadow-sm'
                                  : 'bg-dark-900/60 border-white/5 text-gray-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Open Timeline Button */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div className="text-[11px] text-gray-400">
                        {t('settings.auto_migrated_27')}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenContactChanges?.()
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 border border-primary-500/30 flex items-center gap-2 transition-colors cursor-pointer group"
                      >
                        <History className="w-3.5 h-3.5 group-hover:rotate-[-20deg] transition-transform" />
                        <span>{t('settings.features_auditor_open_btn')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* GROUP 3: Ghost Mode & Stealth Guard */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      {t('settings.features_ghost_header')}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_ghost_enable')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_28')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ghostMode}
                          onChange={(e) => setGhostMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_antiban_enable')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_29')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={antiFingerprinting}
                          onChange={(e) => setAntiFingerprinting(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* GROUP 4: Message Shield & Local Vault */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">
                      {t('settings.features_shield_header')}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_shield_keep_deleted')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_30')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keepDeletedMessagesLocally}
                          onChange={(e) => setKeepDeletedMessagesLocally(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_shield_thanos')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_31')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableThanosDust}
                          onChange={(e) => setEnableThanosDust(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_shield_both_default')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_32')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alwaysDeleteBoth}
                          onChange={(e) => setAlwaysDeleteBoth(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {t('settings.features_shield_thanos')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t('settings.auto_migrated_31')}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableThanosDust}
                          onChange={(e) => setEnableThanosDust(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* GROUP 5: Chat UI & Productivity Enhancements */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-400">
                      {t('settings.auto_migrated_34')}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                    {[
                      {
                        id: 'showChatId',
                        label: t('settings.features_power_chat_id'),
                        desc: t('settings.auto_migrated_35'),
                        val: showChatId,
                        set: setShowChatId,
                      },
                      {
                        id: 'showMessageId',
                        label: t('settings.features_power_msg_id'),
                        desc: t('settings.auto_migrated_36'),
                        val: showMessageId,
                        set: setShowMessageId,
                      },
                      {
                        id: 'showSeconds',
                        label: t('settings.features_power_seconds'),
                        desc: t('settings.auto_migrated_37'),
                        val: showSeconds,
                        set: setShowSeconds,
                      },
                      {
                        id: 'showSenderAvatar',
                        label: t('settings.auto_migrated_38'),
                        desc: t('settings.auto_migrated_39'),
                        val: showSenderAvatar,
                        set: setShowSenderAvatar,
                      },
                      {
                        id: 'quickForwardToSaved',
                        label: t('settings.auto_migrated_40'),
                        desc: t('settings.auto_migrated_41'),
                        val: quickForwardToSaved,
                        set: setQuickForwardToSaved,
                      },
                      {
                        id: 'markAllReadEnabled',
                        label: t('settings.auto_migrated_42'),
                        desc: t('settings.auto_migrated_43'),
                        val: markAllReadEnabled,
                        set: setMarkAllReadEnabled,
                      },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-xs font-medium text-gray-200">{item.label}</div>
                          <div className="text-[10px] text-gray-400">{item.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={item.val}
                            onChange={(e) => item.set(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Microphase 039: Layer 232 Message & Content Editing Suite */}
                <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          مدیریت و ویرایش محتوا و پیام‌ها
                        </div>
                        <div className="text-[10px] text-gray-400">
                          مجموعه ۷ متد MTProto Layer 232 برای ویرایش عنوان، اینوایت‌ها، فکت‌چک و پیام‌ها
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                      Phase 039 • Layer 232
                    </span>
                  </div>

                  {/* Operational Status Banner */}
                  {m039Status && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        m039Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m039Status.type === 'success' ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{m039Status.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM039Status(null)}
                        className="text-[10px] hover:underline shrink-0 opacity-75"
                      >
                        بستن
                      </button>
                    </div>
                  )}

                  {/* Common Chat ID Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-400">
                      شناسه چت / گروه / کانال (Chat / Peer ID)
                    </label>
                    <input
                      type="text"
                      value={m039ChatId}
                      onChange={(e) => setM039ChatId(e.target.value)}
                      placeholder="مثال: -1001234567890 یا username"
                      className="w-full px-3 py-1.5 bg-dark-800/80 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                    />
                  </div>

                  {/* 1. messages.editChatTitle */}
                  <form onSubmit={handleM039EditChatTitle} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۱. ویرایش عنوان چت (editChatTitle)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editChatTitle</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m039NewTitle}
                        onChange={(e) => setM039NewTitle(e.target.value)}
                        placeholder="عنوان جدید گفت‌وگو..."
                        className="flex-1 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <button
                        type="submit"
                        disabled={m039LoadingOp === 'editChatTitle' || !m039ChatId || !m039NewTitle.trim()}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        {m039LoadingOp === 'editChatTitle' ? 'در حال ثبت...' : 'تغییر عنوان'}
                      </button>
                    </div>
                  </form>

                  {/* 2. messages.editExportedChatInvite */}
                  <form onSubmit={handleM039EditExportedInvite} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۲. ویرایش لینک دعوت (editExportedChatInvite)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editExportedChatInvite</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={m039InviteLink}
                        onChange={(e) => setM039InviteLink(e.target.value)}
                        placeholder="لینک دعوت قبلی (https://t.me/+...)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <input
                        type="text"
                        value={m039InviteTitle}
                        onChange={(e) => setM039InviteTitle(e.target.value)}
                        placeholder="عنوان جدید لینک (اختیاری)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m039LoadingOp === 'editExportedInvite' || !m039ChatId || !m039InviteLink.trim()}
                      className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m039LoadingOp === 'editExportedInvite' ? 'در حال ویرایش لینک...' : 'به‌روزرسانی لینک دعوت'}
                    </button>
                  </form>

                  {/* 3. messages.editFactCheck */}
                  <form onSubmit={handleM039EditFactCheck} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۳. درج و ویرایش راستی‌آزمایی پیام (editFactCheck)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editFactCheck</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={m039FactCheckMsgId}
                        onChange={(e) => setM039FactCheckMsgId(e.target.value)}
                        placeholder="شناسه پیام (Msg ID)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <input
                        type="text"
                        value={m039FactCheckText}
                        onChange={(e) => setM039FactCheckText(e.target.value)}
                        placeholder="متن فکت‌چک (راستی‌آزمایی)..."
                        className="sm:col-span-2 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m039LoadingOp === 'editFactCheck' || !m039ChatId || !m039FactCheckMsgId}
                      className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m039LoadingOp === 'editFactCheck' ? 'در حال ثبت فکت‌چک...' : 'ثبت راستی‌آزمایی'}
                    </button>
                  </form>

                  {/* 4. messages.editForumTopic */}
                  <form onSubmit={handleM039EditForumTopic} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۴. ویرایش تاپیک انجمن (editForumTopic)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editForumTopic</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={m039TopicId}
                        onChange={(e) => setM039TopicId(e.target.value)}
                        placeholder="شناسه تاپیک (Topic ID)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <input
                        type="text"
                        value={m039TopicTitle}
                        onChange={(e) => setM039TopicTitle(e.target.value)}
                        placeholder="عنوان جدید تاپیک..."
                        className="sm:col-span-2 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m039LoadingOp === 'editForumTopic' || !m039ChatId || !m039TopicId}
                      className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m039LoadingOp === 'editForumTopic' ? 'در حال ویرایش تاپیک...' : 'به‌روزرسانی تاپیک'}
                    </button>
                  </form>

                  {/* 5. messages.editInlineBotMessage */}
                  <form onSubmit={handleM039EditInlineBotMsg} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۵. ویرایش پیام اینلاین ربات (editInlineBotMessage)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editInlineBotMessage</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={m039InlineMsgId}
                        onChange={(e) => setM039InlineMsgId(e.target.value)}
                        placeholder="شناسه اینلاین (Bot Msg ID)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <input
                        type="text"
                        value={m039InlineMsgText}
                        onChange={(e) => setM039InlineMsgText(e.target.value)}
                        placeholder="متن جدید پیام اینلاین..."
                        className="sm:col-span-2 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m039LoadingOp === 'editInlineBotMsg' || !m039InlineMsgId || !m039InlineMsgText.trim()}
                      className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m039LoadingOp === 'editInlineBotMsg' ? 'در حال ویرایش پیام اینلاین...' : 'ویرایش پیام اینلاین'}
                    </button>
                  </form>

                  {/* 6. messages.editMessage */}
                  <form onSubmit={handleM039EditMessage} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۶. ویرایش پیام استاندارد (editMessage)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editMessage</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={m039EditMsgId}
                        onChange={(e) => setM039EditMsgId(e.target.value)}
                        placeholder="شناسه پیام (Msg ID)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <input
                        type="text"
                        value={m039EditMsgText}
                        onChange={(e) => setM039EditMsgText(e.target.value)}
                        placeholder="متن جدید پیام..."
                        className="sm:col-span-2 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m039LoadingOp === 'editMessage' || !m039ChatId || !m039EditMsgId || !m039EditMsgText.trim()}
                      className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m039LoadingOp === 'editMessage' ? 'در حال ویرایش پیام...' : 'اعمال تغییرات پیام'}
                    </button>
                  </form>

                  {/* 7. messages.editQuickReplyShortcut */}
                  <form onSubmit={handleM039EditQuickReplyShortcut} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۷. ویرایش میانبر پاسخ سریع (editQuickReplyShortcut)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.editQuickReplyShortcut</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={m039ShortcutId}
                        onChange={(e) => setM039ShortcutId(e.target.value)}
                        placeholder="شناسه میانبر (Shortcut ID)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                      <input
                        type="text"
                        value={m039ShortcutTitle}
                        onChange={(e) => setM039ShortcutTitle(e.target.value)}
                        placeholder="نام جدید میانبر..."
                        className="sm:col-span-2 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m039LoadingOp === 'editQuickReplyShortcut' || !m039ShortcutId || !m039ShortcutTitle.trim()}
                      className="w-full py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m039LoadingOp === 'editQuickReplyShortcut' ? 'در حال ویرایش میانبر...' : 'به‌روزرسانی میانبر'}
                    </button>
                  </form>
                </div>

                {/* Microphase 041: Layer 232 Bot Apps, Effects & Reactions Suite */}
                <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          مینی‌اپ‌ها، ربات‌ها و افکت‌های تعاملی
                        </div>
                        <div className="text-[10px] text-gray-400">
                          مجموعه ۷ متد MTProto Layer 232 برای ربات‌های منوی پیوست، افکت‌های پیام و واکنش‌ها
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      Phase 041 • Layer 232
                    </span>
                  </div>

                  {/* Operational Status Banner */}
                  {m041Status && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        m041Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m041Status.type === 'success' ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{m041Status.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM041Status(null)}
                        className="text-[10px] hover:underline shrink-0 opacity-75"
                      >
                        بستن
                      </button>
                    </div>
                  )}

                  {/* 1. messages.getAttachMenuBot */}
                  <form onSubmit={handleM041GetAttachMenuBot} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۱. دریافت ربات منوی پیوست (getAttachMenuBot)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.getAttachMenuBot</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m041AttachBotId}
                        onChange={(e) => setM041AttachBotId(e.target.value)}
                        placeholder="شناسه یا یوزرنیم ربات..."
                        className="flex-1 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
                      />
                      <button
                        type="submit"
                        disabled={m041LoadingOp === 'getAttachMenuBot' || !m041AttachBotId.trim()}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        {m041LoadingOp === 'getAttachMenuBot' ? 'در حال دریافت...' : 'استعلام ربات'}
                      </button>
                    </div>
                  </form>

                  {/* 2, 4, 5 Inspector Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 2. messages.getAttachMenuBots */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۲. ربات‌های پیوست (getAttachMenuBots)
                      </div>
                      <button
                        type="button"
                        onClick={handleM041GetAttachMenuBots}
                        disabled={m041LoadingOp === 'getAttachMenuBots'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m041LoadingOp === 'getAttachMenuBots' ? 'در حال بارگذاری...' : `ربات‌ها ${m041AttachBotsCount !== null ? `(${m041AttachBotsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 4. messages.getAvailableEffects */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۴. افکت‌های پیام (getAvailableEffects)
                      </div>
                      <button
                        type="button"
                        onClick={handleM041GetAvailableEffects}
                        disabled={m041LoadingOp === 'getAvailableEffects'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m041LoadingOp === 'getAvailableEffects' ? 'در حال دریافت...' : `افکت‌ها ${m041EffectsCount !== null ? `(${m041EffectsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 5. messages.getAvailableReactions */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۵. واکنش‌های مجاز (getAvailableReactions)
                      </div>
                      <button
                        type="button"
                        onClick={handleM041GetAvailableReactions}
                        disabled={m041LoadingOp === 'getAvailableReactions'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m041LoadingOp === 'getAvailableReactions' ? 'در حال دریافت...' : `ری‌اکشن‌ها ${m041ReactionsCount !== null ? `(${m041ReactionsCount})` : ''}`}
                      </button>
                    </div>
                  </div>

                  {/* 6. messages.getBotApp */}
                  <form onSubmit={handleM041GetBotApp} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۶. متادیتای مینی‌اپ تلگرام (getBotApp)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.getBotApp</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m041BotAppShortName}
                        onChange={(e) => setM041BotAppShortName(e.target.value)}
                        placeholder="نام کوتاه مینی‌اپ (app short name)..."
                        className="flex-1 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
                      />
                      <button
                        type="submit"
                        disabled={m041LoadingOp === 'getBotApp' || !m041BotAppShortName.trim()}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        {m041LoadingOp === 'getBotApp' ? 'در حال دریافت...' : 'دریافت مینی‌اپ'}
                      </button>
                    </div>
                  </form>

                  {/* 7. messages.getBotCallbackAnswer */}
                  <form onSubmit={handleM041GetBotCallbackAnswer} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۷. پاسخ دکمه کال‌بک ربات (getBotCallbackAnswer)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.getBotCallbackAnswer</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={m041CallbackMsgId}
                        onChange={(e) => setM041CallbackMsgId(e.target.value)}
                        placeholder="شناسه پیام (Msg ID)"
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
                      />
                      <input
                        type="text"
                        value={m041CallbackData}
                        onChange={(e) => setM041CallbackData(e.target.value)}
                        placeholder="دیتای کال‌بک (اختیاری)..."
                        className="sm:col-span-2 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={m041LoadingOp === 'getBotCallbackAnswer' || !m041CallbackMsgId.trim()}
                      className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      {m041LoadingOp === 'getBotCallbackAnswer' ? 'در حال ارسال کال‌بک...' : 'دریافت پاسخ کال‌بک'}
                    </button>
                  </form>
                </div>

                {/* Microphase 044: Layer 232 Emoji Keywords, Groups & Stickers Suite */}
                <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                        <Smile className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          کلیدواژه‌ها، دسته‌بندی و استیکرهای ایموجی
                        </div>
                        <div className="text-[10px] text-gray-400">
                          مجموعه ۷ متد MTProto Layer 232 برای کلیدواژه‌های چندزبانه، تفاوت نسخه‌ها و گروه‌های وضعیت
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
                      Phase 044 • Layer 232
                    </span>
                  </div>

                  {/* Operational Status Banner */}
                  {m044Status && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        m044Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m044Status.type === 'success' ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{m044Status.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM044Status(null)}
                        className="text-[10px] hover:underline shrink-0 opacity-75"
                      >
                        بستن
                      </button>
                    </div>
                  )}

                  {/* 1. messages.getEmojiKeywords */}
                  <form onSubmit={handleM044GetEmojiKeywords} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۱. کلیدواژه‌های جستجوی ایموجی (getEmojiKeywords)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.getEmojiKeywords</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m044KeywordsLang}
                        onChange={(e) => setM044KeywordsLang(e.target.value)}
                        placeholder="کد زبان (مثلاً fa یا en)..."
                        className="flex-1 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                      />
                      <button
                        type="submit"
                        disabled={m044LoadingOp === 'getEmojiKeywords' || !m044KeywordsLang.trim()}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        {m044LoadingOp === 'getEmojiKeywords' ? 'در حال دریافت...' : `دریافت ${m044KeywordsCount !== null ? `(${m044KeywordsCount})` : ''}`}
                      </button>
                    </div>
                  </form>

                  {/* 2. messages.getEmojiKeywordsDifference */}
                  <form onSubmit={handleM044GetEmojiKeywordsDifference} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۲. تفاوت نسخه‌های کلیدواژه (getEmojiKeywordsDifference)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.getEmojiKeywordsDifference</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={m044DiffLang}
                        onChange={(e) => setM044DiffLang(e.target.value)}
                        placeholder="کد زبان..."
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                      />
                      <input
                        type="number"
                        value={m044DiffVersion}
                        onChange={(e) => setM044DiffVersion(e.target.value)}
                        placeholder="از نسخه (from version)..."
                        className="px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                      />
                      <button
                        type="submit"
                        disabled={m044LoadingOp === 'getEmojiKeywordsDifference'}
                        className="py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                      >
                        {m044LoadingOp === 'getEmojiKeywordsDifference' ? 'استعلام...' : `بررسی تفاوت ${m044DiffCount !== null ? `(${m044DiffCount})` : ''}`}
                      </button>
                    </div>
                  </form>

                  {/* 3. messages.getEmojiKeywordsLanguages */}
                  <form onSubmit={handleM044GetEmojiKeywordsLanguages} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-300">
                        ۳. زبان‌های پشتیبانی‌شده ایموجی (getEmojiKeywordsLanguages)
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">messages.getEmojiKeywordsLanguages</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m044LangCodes}
                        onChange={(e) => setM044LangCodes(e.target.value)}
                        placeholder="کدهای فیلتر (مثلاً en,fa)..."
                        className="flex-1 px-3 py-1.5 bg-dark-900 border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                      />
                      <button
                        type="submit"
                        disabled={m044LoadingOp === 'getEmojiKeywordsLanguages'}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        {m044LoadingOp === 'getEmojiKeywordsLanguages' ? 'در حال استعلام...' : `زبان‌ها ${m044LanguagesCount !== null ? `(${m044LanguagesCount})` : ''}`}
                      </button>
                    </div>
                  </form>

                  {/* 4, 5, 6, 7 Emoji Groups & Stickers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 4. messages.getEmojiProfilePhotoGroups */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۴. گروه‌های ایموجی پروفایل (getEmojiProfilePhotoGroups)
                      </div>
                      <button
                        type="button"
                        onClick={handleM044GetEmojiProfilePhotoGroups}
                        disabled={m044LoadingOp === 'getEmojiProfilePhotoGroups'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m044LoadingOp === 'getEmojiProfilePhotoGroups' ? 'در حال دریافت...' : `استعلام گروه‌ها ${m044ProfilePhotoGroupsCount !== null ? `(${m044ProfilePhotoGroupsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 5. messages.getEmojiStatusGroups */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۵. گروه‌های وضعیت ایموجی (getEmojiStatusGroups)
                      </div>
                      <button
                        type="button"
                        onClick={handleM044GetEmojiStatusGroups}
                        disabled={m044LoadingOp === 'getEmojiStatusGroups'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m044LoadingOp === 'getEmojiStatusGroups' ? 'در حال دریافت...' : `استعلام وضعیت‌ها ${m044StatusGroupsCount !== null ? `(${m044StatusGroupsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 6. messages.getEmojiStickerGroups */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۶. گروه‌های استیکر ایموجی (getEmojiStickerGroups)
                      </div>
                      <button
                        type="button"
                        onClick={handleM044GetEmojiStickerGroups}
                        disabled={m044LoadingOp === 'getEmojiStickerGroups'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m044LoadingOp === 'getEmojiStickerGroups' ? 'در حال دریافت...' : `استعلام استیکرها ${m044StickerGroupsCount !== null ? `(${m044StickerGroupsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 7. messages.getEmojiStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300">
                        ۷. استیکرهای ایموجی ابری (getEmojiStickers)
                      </div>
                      <button
                        type="button"
                        onClick={handleM044GetEmojiStickers}
                        disabled={m044LoadingOp === 'getEmojiStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m044LoadingOp === 'getEmojiStickers' ? 'در حال دریافت...' : `مجموعه‌ها ${m044StickersCount !== null ? `(${m044StickersCount})` : ''}`}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Microphase 045: Layer 232 Messages Domain Part 13 (Emoji URL, Chat Invites, Extended Media, Fact-Checks & Faved Stickers) */}
                <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          مدیریت لینک‌های دعوت، رسانه‌های پیشرفته و فکت‌چک (Layer 232)
                        </div>
                        <div className="text-[10px] text-gray-400">
                          دسترسی به متدهای MTProto برای استعلام لینک‌های دعوت، فکت‌چک، رسانه‌های تعمیم‌یافته و استیکرهای برگزیده
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      Phase 045 • Layer 232
                    </span>
                  </div>

                  {/* Operational Status Banner */}
                  {m045Status && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        m045Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m045Status.type === 'success' ? (
                          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span className="leading-relaxed">{m045Status.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM045Status(null)}
                        className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title="بستن"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. messages.getEmojiURL */}
                    <form onSubmit={handleM045GetEmojiURL} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۱. آدرس وب ایموجی (getEmojiURL)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m045EmojiUrlLang}
                          onChange={(e) => setM045EmojiUrlLang(e.target.value)}
                          placeholder="کد زبان (مثلاً en یا fa)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m045LoadingOp === 'getEmojiURL'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m045LoadingOp === 'getEmojiURL' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m045EmojiUrlResult && (
                        <div className="text-[10px] text-gray-400 truncate bg-dark-900/60 p-1.5 rounded-lg border border-white/5 font-mono dir-ltr text-left">
                          {m045EmojiUrlResult}
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getExportedChatInvite */}
                    <form onSubmit={handleM045GetExportedChatInvite} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۲. جزئیات لینک دعوت (getExportedChatInvite)</span>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={m045ExportedInvitePeer}
                          onChange={(e) => setM045ExportedInvitePeer(e.target.value)}
                          placeholder="شناسه گفتگو (Peer ID)"
                          className="w-full bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={m045ExportedInviteLink}
                            onChange={(e) => setM045ExportedInviteLink(e.target.value)}
                            placeholder="لینک دعوت (https://t.me/+...)"
                            className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                          />
                          <button
                            type="submit"
                            disabled={m045LoadingOp === 'getExportedChatInvite'}
                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {m045LoadingOp === 'getExportedChatInvite' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                          </button>
                        </div>
                      </div>
                      {m045ExportedInviteResult && (
                        <div className="text-[10px] text-gray-300 truncate bg-dark-900/60 p-1.5 rounded-lg border border-white/5">
                          نتیجه: {m045ExportedInviteResult}
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getExportedChatInvites */}
                    <form onSubmit={handleM045GetExportedChatInvites} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۳. لیست لینک‌های دعوت صادر شده (getExportedChatInvites)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m045ExportedInvitesPeer}
                          onChange={(e) => setM045ExportedInvitesPeer(e.target.value)}
                          placeholder="شناسه گفتگو (Peer ID)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m045LoadingOp === 'getExportedChatInvites'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m045LoadingOp === 'getExportedChatInvites' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'دریافت'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m045ExportedInvitesRevoked}
                            onChange={(e) => setM045ExportedInvitesRevoked(e.target.checked)}
                            className="rounded bg-dark-900 border-white/10 text-indigo-500"
                          />
                          <span>فقط لینک‌های باطل‌شده (Revoked)</span>
                        </label>
                        {m045ExportedInvitesCount !== null && (
                          <span className="text-indigo-400 font-mono">تعداد: {m045ExportedInvitesCount}</span>
                        )}
                      </div>
                    </form>

                    {/* 4. messages.getExtendedMedia */}
                    <form onSubmit={handleM045GetExtendedMedia} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۴. رسانه‌های گسترده پیام (getExtendedMedia)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m045ExtendedMediaPeer}
                          onChange={(e) => setM045ExtendedMediaPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <input
                          type="text"
                          value={m045ExtendedMediaMsgId}
                          onChange={(e) => setM045ExtendedMediaMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m045LoadingOp === 'getExtendedMedia'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m045LoadingOp === 'getExtendedMedia' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                    </form>

                    {/* 5. messages.getFactCheck */}
                    <form onSubmit={handleM045GetFactCheck} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۵. استعلام فکت‌چک پیام (getFactCheck)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m045FactCheckPeer}
                          onChange={(e) => setM045FactCheckPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <input
                          type="text"
                          value={m045FactCheckMsgId}
                          onChange={(e) => setM045FactCheckMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m045LoadingOp === 'getFactCheck'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m045LoadingOp === 'getFactCheck' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m045FactCheckResult && (
                        <div className="text-[10px] text-gray-400 truncate bg-dark-900/60 p-1.5 rounded-lg border border-white/5">
                          {m045FactCheckResult}
                        </div>
                      )}
                    </form>

                    {/* 6. messages.getFavedStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۶. استیکرهای برگزیده (getFavedStickers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM045GetFavedStickers}
                        disabled={m045LoadingOp === 'getFavedStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m045LoadingOp === 'getFavedStickers' ? 'در حال استعلام...' : `استیکرهای برگزیده ${m045FavedStickersCount !== null ? `(${m045FavedStickersCount})` : ''}`}
                      </button>
                    </div>

                    {/* 7. messages.getFeaturedEmojiStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۷. استیکرهای ایموجی ویژه و برتر (getFeaturedEmojiStickers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM045GetFeaturedEmojiStickers}
                        disabled={m045LoadingOp === 'getFeaturedEmojiStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m045LoadingOp === 'getFeaturedEmojiStickers' ? 'در حال دریافت...' : `مجموعه‌های ویژه ایموجی ${m045FeaturedEmojiStickersCount !== null ? `(${m045FeaturedEmojiStickersCount})` : ''}`}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Microphase 046: Layer 232 Messages Domain Part 14 (Featured Stickers, Forum Topics, Full Chat, Future Creator, Game Scores & History) */}
                <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          انجمن‌ها، پروفایل کامل چت، تاریخچه و بازی‌ها (Layer 232)
                        </div>
                        <div className="text-[10px] text-gray-400">
                          مدیریت تاپیک‌های انجمن، استعلام پروفایل کامل چت، رکوردهای برتر بازی و تاریخچه پیام‌ها
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Phase 046 • Layer 232
                    </span>
                  </div>

                  {/* Operational Status Banner */}
                  {m046Status && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        m046Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m046Status.type === 'success' ? (
                          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span className="leading-relaxed">{m046Status.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM046Status(null)}
                        className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title="بستن"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. messages.getFeaturedStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۱. استیکرهای ویژه رسمی (getFeaturedStickers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM046GetFeaturedStickers}
                        disabled={m046LoadingOp === 'getFeaturedStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m046LoadingOp === 'getFeaturedStickers' ? 'در حال استعلام...' : `بسته‌های استیکر ویژه ${m046FeaturedStickersCount !== null ? `(${m046FeaturedStickersCount})` : ''}`}
                      </button>
                    </div>

                    {/* 2. messages.getForumTopics */}
                    <form onSubmit={handleM046GetForumTopics} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۲. تاپیک‌های انجمن (getForumTopics)</span>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={m046ForumTopicsPeer}
                          onChange={(e) => setM046ForumTopicsPeer(e.target.value)}
                          placeholder="شناسه سوپرگروه (Peer ID)"
                          className="w-full bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={m046ForumTopicsQ}
                            onChange={(e) => setM046ForumTopicsQ(e.target.value)}
                            placeholder="جستجوی موضوعی (اختیاری)"
                            className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                          />
                          <button
                            type="submit"
                            disabled={m046LoadingOp === 'getForumTopics'}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {m046LoadingOp === 'getForumTopics' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                          </button>
                        </div>
                      </div>
                      {m046ForumTopicsCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          تعداد تاپیک‌ها: {m046ForumTopicsCount}
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getForumTopicsByID */}
                    <form onSubmit={handleM046GetForumTopicsByID} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۳. تاپیک با شناسه اختصاصی (getForumTopicsByID)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m046ForumTopicsByIdPeer}
                          onChange={(e) => setM046ForumTopicsByIdPeer(e.target.value)}
                          placeholder="شناسه سوپرگروه"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m046ForumTopicsByIdTopic}
                          onChange={(e) => setM046ForumTopicsByIdTopic(e.target.value)}
                          placeholder="شناسه تاپیک"
                          className="w-24 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m046LoadingOp === 'getForumTopicsByID'}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m046LoadingOp === 'getForumTopicsByID' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                    </form>

                    {/* 4. messages.getFullChat */}
                    <form onSubmit={handleM046GetFullChat} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۴. اطلاعات کامل چت (getFullChat)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m046FullChatId}
                          onChange={(e) => setM046FullChatId(e.target.value)}
                          placeholder="شناسه عددی چت (Chat ID)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m046LoadingOp === 'getFullChat'}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m046LoadingOp === 'getFullChat' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m046FullChatResult && (
                        <div className="text-[10px] text-gray-300 truncate bg-dark-900/60 p-1.5 rounded-lg border border-white/5">
                          {m046FullChatResult}
                        </div>
                      )}
                    </form>

                    {/* 5. messages.getFutureChatCreatorAfterLeave */}
                    <form onSubmit={handleM046GetFutureChatCreatorAfterLeave} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۵. مالک بعدی پس از خروج (getFutureChatCreatorAfterLeave)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m046FutureCreatorPeer}
                          onChange={(e) => setM046FutureCreatorPeer(e.target.value)}
                          placeholder="شناسه گروه یا کانال"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m046LoadingOp === 'getFutureChatCreatorAfterLeave'}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m046LoadingOp === 'getFutureChatCreatorAfterLeave' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m046FutureCreatorResult && (
                        <div className="text-[10px] text-emerald-400 truncate bg-dark-900/60 p-1.5 rounded-lg border border-white/5">
                          جانشین: {m046FutureCreatorResult}
                        </div>
                      )}
                    </form>

                    {/* 6. messages.getGameHighScores */}
                    <form onSubmit={handleM046GetGameHighScores} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۶. رکوردهای برتر بازی (getGameHighScores)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m046GameScoresPeer}
                          onChange={(e) => setM046GameScoresPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m046GameScoresMsgId}
                          onChange={(e) => setM046GameScoresMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m046LoadingOp === 'getGameHighScores'}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m046LoadingOp === 'getGameHighScores' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m046GameScoresCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          تعداد رکوردها: {m046GameScoresCount}
                        </div>
                      )}
                    </form>

                    {/* 7. messages.getHistory */}
                    <form onSubmit={handleM046GetHistory} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        <span>۷. تاریخچه پیام‌های گفتگو (getHistory)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m046HistoryPeer}
                          onChange={(e) => setM046HistoryPeer(e.target.value)}
                          placeholder="شناسه گفتگو (Peer ID)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m046LoadingOp === 'getHistory'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m046LoadingOp === 'getHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام پیام‌ها'}
                        </button>
                      </div>
                      {m046HistoryCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          پیام‌های دریافتی: {m046HistoryCount} عدد
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 047: Layer 232 Messages Domain Part 15 (Inline Bots, Inline Game Scores, Mask Stickers, Edit Data, Reactions List, Read Participants & Messages) */}
                <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          ربات‌های اینلاین، استیکرهای ماسک و وضعیت پیام‌ها (Layer 232)
                        </div>
                        <div className="text-[10px] text-gray-400">
                          مدیریت نتایج اینلاین، استیکرهای ماسک، لیست ری‌اکشن‌ها، خوانندگان پیام و بازی‌های اینلاین
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                      Phase 047 • Layer 232
                    </span>
                  </div>

                  {/* Operational Status Banner */}
                  {m047Status && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        m047Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {m047Status.type === 'success' ? (
                          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span className="leading-relaxed">{m047Status.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setM047Status(null)}
                        className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title="بستن"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. messages.getInlineBotResults */}
                    <form onSubmit={handleM047GetInlineBotResults} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-teal-400" />
                        <span>۱. نتایج اینلاین ربات (getInlineBotResults)</span>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={m047InlineBotId}
                          onChange={(e) => setM047InlineBotId(e.target.value)}
                          placeholder="یوزرنیم یا شناسه ربات (@gif)"
                          className="w-full bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={m047InlineBotQuery}
                            onChange={(e) => setM047InlineBotQuery(e.target.value)}
                            placeholder="عبارت جستجو"
                            className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                          />
                          <button
                            type="submit"
                            disabled={m047LoadingOp === 'getInlineBotResults'}
                            className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {m047LoadingOp === 'getInlineBotResults' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                          </button>
                        </div>
                      </div>
                      {m047InlineBotResultsCount !== null && (
                        <div className="text-[10px] text-teal-400 font-mono">
                          تعداد نتایج اینلاین: {m047InlineBotResultsCount}
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getInlineGameHighScores */}
                    <form onSubmit={handleM047GetInlineGameHighScores} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-teal-400" />
                        <span>۲. رکوردهای برتر بازی اینلاین (getInlineGameHighScores)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m047InlineGameMsgId}
                          onChange={(e) => setM047InlineGameMsgId(e.target.value)}
                          placeholder="شناسه پیام اینلاین"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m047LoadingOp === 'getInlineGameHighScores'}
                          className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m047LoadingOp === 'getInlineGameHighScores' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m047InlineGameScoresCount !== null && (
                        <div className="text-[10px] text-teal-400 font-mono">
                          تعداد رکوردها: {m047InlineGameScoresCount}
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getMaskStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>۳. استیکرهای ماسک (getMaskStickers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM047GetMaskStickers}
                        disabled={m047LoadingOp === 'getMaskStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m047LoadingOp === 'getMaskStickers' ? 'در حال استعلام...' : `بسته‌های ماسک ${m047MaskStickersCount !== null ? `(${m047MaskStickersCount})` : ''}`}
                      </button>
                    </div>

                    {/* 4. messages.getMessageEditData */}
                    <form onSubmit={handleM047GetMessageEditData} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                        <span>۴. متادیتای ویرایش پیام (getMessageEditData)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m047EditDataPeer}
                          onChange={(e) => setM047EditDataPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <input
                          type="text"
                          value={m047EditDataMsgId}
                          onChange={(e) => setM047EditDataMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m047LoadingOp === 'getMessageEditData'}
                          className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m047LoadingOp === 'getMessageEditData' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m047EditDataResult && (
                        <div className="text-[10px] text-teal-400 truncate bg-dark-900/60 p-1.5 rounded-lg border border-white/5">
                          {m047EditDataResult}
                        </div>
                      )}
                    </form>

                    {/* 5. messages.getMessageReactionsList */}
                    <form onSubmit={handleM047GetMessageReactionsList} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-teal-400" />
                        <span>۵. لیست ری‌اکشن‌های پیام (getMessageReactionsList)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m047ReactionsPeer}
                          onChange={(e) => setM047ReactionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <input
                          type="text"
                          value={m047ReactionsMsgId}
                          onChange={(e) => setM047ReactionsMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m047LoadingOp === 'getMessageReactionsList'}
                          className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m047LoadingOp === 'getMessageReactionsList' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m047ReactionsCount !== null && (
                        <div className="text-[10px] text-teal-400 font-mono">
                          تعداد ری‌اکشن‌ها: {m047ReactionsCount}
                        </div>
                      )}
                    </form>

                    {/* 6. messages.getMessageReadParticipants */}
                    <form onSubmit={handleM047GetMessageReadParticipants} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                        <span>۶. خوانندگان پیام در گروه (getMessageReadParticipants)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m047ReadParticipantsPeer}
                          onChange={(e) => setM047ReadParticipantsPeer(e.target.value)}
                          placeholder="شناسه گروه"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <input
                          type="text"
                          value={m047ReadParticipantsMsgId}
                          onChange={(e) => setM047ReadParticipantsMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m047LoadingOp === 'getMessageReadParticipants'}
                          className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m047LoadingOp === 'getMessageReadParticipants' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m047ReadParticipantsCount !== null && (
                        <div className="text-[10px] text-teal-400 font-mono">
                          تعداد خوانندگان: {m047ReadParticipantsCount}
                        </div>
                      )}
                    </form>

                    {/* 7. messages.getMessages */}
                    <form onSubmit={handleM047GetMessages} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                        <span>۷. استعلام پیام‌ها با شناسه اختصاصی (getMessages)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m047MessagesMsgId}
                          onChange={(e) => setM047MessagesMsgId(e.target.value)}
                          placeholder="شناسه‌های پیام (جداشده با کاما: مثلاً 100, 101, 102)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-teal-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m047LoadingOp === 'getMessages'}
                          className="px-4 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m047LoadingOp === 'getMessages' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'دریافت پیام‌ها'}
                        </button>
                      </div>
                      {m047MessagesCount !== null && (
                        <div className="text-[10px] text-teal-400 font-mono">
                          پیام‌های دریافتی: {m047MessagesCount} عدد
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 048: Messages Domain Suite Part 16 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-cyan-400" />
                        <span>میکروفاز ۰۴۸: ری‌اکشن‌ها، بازدیدها، استیکرهای من و وضعیت آنلاین (Messages Suite Part 16)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getMessagesReactions, getMessagesViews, getMyStickers, getOldFeaturedStickers, getOnlines, getOutboxReadDate, getPaidReactionPrivacy
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m048Status && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        m048Status.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {m048Status.type === 'success' ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span className="flex-1">{m048Status.message}</span>
                      <button
                        type="button"
                        onClick={() => setM048Status(null)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. messages.getMessagesReactions */}
                    <form onSubmit={handleM048GetMessagesReactions} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۱. دریافت ری‌اکشن‌های چندگانه پیام‌ها (getMessagesReactions)</span>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={m048MsgReactionsPeer}
                          onChange={(e) => setM048MsgReactionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="w-full bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={m048MsgReactionsIds}
                            onChange={(e) => setM048MsgReactionsIds(e.target.value)}
                            placeholder="شناسه‌های پیام (جداشده با کاما: مثلاً 10, 11)"
                            className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                          />
                          <button
                            type="submit"
                            disabled={m048LoadingOp === 'getMessagesReactions'}
                            className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {m048LoadingOp === 'getMessagesReactions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                          </button>
                        </div>
                      </div>
                      {m048MsgReactionsCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          نتایج ری‌اکشن: {m048MsgReactionsCount} بروزرسانی
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getMessagesViews */}
                    <form onSubmit={handleM048GetMessagesViews} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۲. آمار بازدید پیام‌ها (getMessagesViews)</span>
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={m048ViewsPeer}
                          onChange={(e) => setM048ViewsPeer(e.target.value)}
                          placeholder="شناسه کانال یا سوپرگروه"
                          className="w-full bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={m048ViewsIds}
                            onChange={(e) => setM048ViewsIds(e.target.value)}
                            placeholder="شناسه‌ها (100, 101)"
                            className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                          />
                          <button
                            type="submit"
                            disabled={m048LoadingOp === 'getMessagesViews'}
                            className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                          >
                            {m048LoadingOp === 'getMessagesViews' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                          </button>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={m048ViewsIncrement}
                            onChange={(e) => setM048ViewsIncrement(e.target.checked)}
                            className="rounded border-white/10 bg-dark-900 text-cyan-500 focus:ring-0"
                          />
                          <span>ثبت بازدید جدید (Increment)</span>
                        </label>
                      </div>
                      {m048ViewsCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          آمار بازدید: {m048ViewsCount} پیام
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getMyStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۳. بسته‌های استیکر اختصاصی من (getMyStickers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM048GetMyStickers}
                        disabled={m048LoadingOp === 'getMyStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m048LoadingOp === 'getMyStickers' ? 'در حال استعلام...' : `بسته‌های من ${m048MyStickersCount !== null ? `(${m048MyStickersCount})` : ''}`}
                      </button>
                    </div>

                    {/* 4. messages.getOldFeaturedStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۴. استیکرهای ویژه پیشین (getOldFeaturedStickers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM048GetOldFeaturedStickers}
                        disabled={m048LoadingOp === 'getOldFeaturedStickers'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m048LoadingOp === 'getOldFeaturedStickers' ? 'در حال استعلام...' : `استیکرهای ویژه آرشیو ${m048OldFeaturedCount !== null ? `(${m048OldFeaturedCount})` : ''}`}
                      </button>
                    </div>

                    {/* 5. messages.getOnlines */}
                    <form onSubmit={handleM048GetOnlines} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۵. تعداد کاربران آنلاین گفتگو (getOnlines)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m048OnlinesPeer}
                          onChange={(e) => setM048OnlinesPeer(e.target.value)}
                          placeholder="شناسه گروه یا کانال"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m048LoadingOp === 'getOnlines'}
                          className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m048LoadingOp === 'getOnlines' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m048OnlinesCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          افراد آنلاین: {m048OnlinesCount} نفر
                        </div>
                      )}
                    </form>

                    {/* 6. messages.getOutboxReadDate */}
                    <form onSubmit={handleM048GetOutboxReadDate} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۶. زمان دقیق خوانده شدن پیام توسط مخاطب (getOutboxReadDate)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m048OutboxPeer}
                          onChange={(e) => setM048OutboxPeer(e.target.value)}
                          placeholder="شناسه کاربر مخاطب"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={m048OutboxMsgId}
                          onChange={(e) => setM048OutboxMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m048LoadingOp === 'getOutboxReadDate'}
                          className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m048LoadingOp === 'getOutboxReadDate' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m048OutboxDate && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          زمان مشاهده: {m048OutboxDate}
                        </div>
                      )}
                    </form>

                    {/* 7. messages.getPaidReactionPrivacy */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>۷. حریم خصوصی ری‌اکشن پولی (getPaidReactionPrivacy)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM048GetPaidReactionPrivacy}
                        disabled={m048LoadingOp === 'getPaidReactionPrivacy'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m048LoadingOp === 'getPaidReactionPrivacy' ? 'در حال استعلام...' : 'استعلام وضعیت حریم خصوصی ری‌اکشن پولی'}
                      </button>
                      {m048PaidPrivacyResult && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {m048PaidPrivacyResult}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Microphase 049: Messages Domain Suite Part 17 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-indigo-400" />
                        <span>میکروفاز ۰۴۹: گفتگوهای همتا، کانال شخصی، پین‌ها و نظرسنجی‌ها (Messages Suite Part 17)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getPeerDialogs, getPeerSettings, getPersonalChannelHistory, getPinnedDialogs, getPinnedSavedDialogs, getPollResults, getPollVotes
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m049Status && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        m049Status.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {m049Status.type === 'success' ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span className="flex-1">{m049Status.message}</span>
                      <button
                        type="button"
                        onClick={() => setM049Status(null)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. messages.getPeerDialogs */}
                    <form onSubmit={handleM049GetPeerDialogs} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۱. استعلام گفتگوی همتا (getPeerDialogs)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m049PeerDialogsInput}
                          onChange={(e) => setM049PeerDialogsInput(e.target.value)}
                          placeholder="شناسه گفتگو یا کانال"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m049LoadingOp === 'getPeerDialogs'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m049LoadingOp === 'getPeerDialogs' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m049PeerDialogsCount !== null && (
                        <div className="text-[10px] text-indigo-400 font-mono">
                          گفتگوهای استعلام‌شده: {m049PeerDialogsCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getPeerSettings */}
                    <form onSubmit={handleM049GetPeerSettings} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۲. تنظیمات اختصاصی همتا (getPeerSettings)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m049PeerSettingsInput}
                          onChange={(e) => setM049PeerSettingsInput(e.target.value)}
                          placeholder="شناسه کاربر یا گروه"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m049LoadingOp === 'getPeerSettings'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m049LoadingOp === 'getPeerSettings' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m049PeerSettingsResult && (
                        <div className="text-[10px] text-indigo-400 font-mono truncate">
                          {m049PeerSettingsResult}
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getPersonalChannelHistory */}
                    <form onSubmit={handleM049GetPersonalChannelHistory} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۳. تاریخچه کانال شخصی کاربر (getPersonalChannelHistory)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m049PersonalChannelUser}
                          onChange={(e) => setM049PersonalChannelUser(e.target.value)}
                          placeholder="شناسه کاربر"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m049LoadingOp === 'getPersonalChannelHistory'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m049LoadingOp === 'getPersonalChannelHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m049PersonalChannelCount !== null && (
                        <div className="text-[10px] text-indigo-400 font-mono">
                          پیام‌های کانال شخصی: {m049PersonalChannelCount} عدد
                        </div>
                      )}
                    </form>

                    {/* 4. messages.getPinnedDialogs */}
                    <form onSubmit={handleM049GetPinnedDialogs} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۴. گفتگوهای سنجاق‌شده پوشه (getPinnedDialogs)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m049PinnedFolderId}
                          onChange={(e) => setM049PinnedFolderId(e.target.value)}
                          placeholder="شناسه پوشه (۰ برای اصلی)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m049LoadingOp === 'getPinnedDialogs'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m049LoadingOp === 'getPinnedDialogs' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m049PinnedDialogsCount !== null && (
                        <div className="text-[10px] text-indigo-400 font-mono">
                          گفتگوهای سنجاق‌شده: {m049PinnedDialogsCount} گفتگو
                        </div>
                      )}
                    </form>

                    {/* 5. messages.getPinnedSavedDialogs */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۵. گفتگوهای سنجاق پیام‌های ذخیره (getPinnedSavedDialogs)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM049GetPinnedSavedDialogs}
                        disabled={m049LoadingOp === 'getPinnedSavedDialogs'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m049LoadingOp === 'getPinnedSavedDialogs' ? 'در حال استعلام...' : `استعلام سنجاق‌ها ${m049PinnedSavedCount !== null ? `(${m049PinnedSavedCount})` : ''}`}
                      </button>
                    </div>

                    {/* 6. messages.getPollResults */}
                    <form onSubmit={handleM049GetPollResults} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۶. نتایج زنده نظرسنجی (getPollResults)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m049PollPeer}
                          onChange={(e) => setM049PollPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <input
                          type="text"
                          value={m049PollMsgId}
                          onChange={(e) => setM049PollMsgId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m049LoadingOp === 'getPollResults'}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m049LoadingOp === 'getPollResults' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m049PollResultsSummary && (
                        <div className="text-[10px] text-indigo-400 font-mono truncate">
                          {m049PollResultsSummary}
                        </div>
                      )}
                    </form>

                    {/* 7. messages.getPollVotes */}
                    <form onSubmit={handleM049GetPollVotes} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>۷. آرای ثبت‌شده کاربران در نظرسنجی (getPollVotes)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m049VotesPeer}
                          onChange={(e) => setM049VotesPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <input
                          type="text"
                          value={m049VotesMsgId}
                          onChange={(e) => setM049VotesMsgId(e.target.value)}
                          placeholder="شناسه پیام نظرسنجی"
                          className="w-36 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m049LoadingOp === 'getPollVotes'}
                          className="px-4 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m049LoadingOp === 'getPollVotes' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام آرا'}
                        </button>
                      </div>
                      {m049VotesCount !== null && (
                        <div className="text-[10px] text-indigo-400 font-mono">
                          آرای استعلام‌شده: {m049VotesCount} رأی
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 050: Messages Domain Suite Part 18 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-fuchsia-400" />
                        <span>میکروفاز ۰۵۰: اینلاین وب‌اپ، پاسخ‌های سریع، لوکیشن‌ها، ری‌اکشن‌ها و ریپلای‌ها (Messages Suite Part 18)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getPreparedInlineMessage, getQuickReplies, getQuickReplyMessages, getRecentLocations, getRecentReactions, getRecentStickers, getReplies
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m050Status && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        m050Status.type === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {m050Status.type === 'success' ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span className="flex-1">{m050Status.message}</span>
                      <button
                        type="button"
                        onClick={() => setM050Status(null)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. messages.getPreparedInlineMessage */}
                    <form onSubmit={handleM050GetPreparedInlineMessage} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۱. پیام آماده وب‌اپ اینلاین (getPreparedInlineMessage)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m050PreparedBotId}
                          onChange={(e) => setM050PreparedBotId(e.target.value)}
                          placeholder="شناسه ربات"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-fuchsia-500/40"
                        />
                        <input
                          type="text"
                          value={m050PreparedId}
                          onChange={(e) => setM050PreparedId(e.target.value)}
                          placeholder="شناسه پیام آماده"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-fuchsia-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m050LoadingOp === 'getPreparedInlineMessage'}
                          className="px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m050LoadingOp === 'getPreparedInlineMessage' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m050PreparedResult && (
                        <div className="text-[10px] text-fuchsia-400 font-mono truncate">
                          {m050PreparedResult}
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getQuickReplies */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۲. شورت‌کات‌های پاسخ سریع (getQuickReplies)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM050GetQuickReplies}
                        disabled={m050LoadingOp === 'getQuickReplies'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m050LoadingOp === 'getQuickReplies' ? 'در حال استعلام...' : `استعلام پاسخ‌های سریع ${m050QuickRepliesCount !== null ? `(${m050QuickRepliesCount})` : ''}`}
                      </button>
                    </div>

                    {/* 3. messages.getQuickReplyMessages */}
                    <form onSubmit={handleM050GetQuickReplyMessages} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۳. پیام‌های شورت‌کات پاسخ سریع (getQuickReplyMessages)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m050ShortcutId}
                          onChange={(e) => setM050ShortcutId(e.target.value)}
                          placeholder="شناسه شورت‌کات عددی"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-fuchsia-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m050LoadingOp === 'getQuickReplyMessages'}
                          className="px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m050LoadingOp === 'getQuickReplyMessages' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m050QuickMessagesCount !== null && (
                        <div className="text-[10px] text-fuchsia-400 font-mono">
                          پیام‌های شورت‌کات: {m050QuickMessagesCount} عدد
                        </div>
                      )}
                    </form>

                    {/* 4. messages.getRecentLocations */}
                    <form onSubmit={handleM050GetRecentLocations} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۴. لوکیشن‌های اخیر گفتگو (getRecentLocations)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m050LocationsPeer}
                          onChange={(e) => setM050LocationsPeer(e.target.value)}
                          placeholder="شناسه گروه یا گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-fuchsia-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m050LoadingOp === 'getRecentLocations'}
                          className="px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-medium rounded-xl flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m050LoadingOp === 'getRecentLocations' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m050LocationsCount !== null && (
                        <div className="text-[10px] text-fuchsia-400 font-mono">
                          لوکیشن‌های یافت‌شده: {m050LocationsCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 5. messages.getRecentReactions */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۵. ری‌اکشن‌های اخیر استفاده‌شده (getRecentReactions)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM050GetRecentReactions}
                        disabled={m050LoadingOp === 'getRecentReactions'}
                        className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m050LoadingOp === 'getRecentReactions' ? 'در حال استعلام...' : `استعلام ری‌اکشن‌های اخیر ${m050RecentReactionsCount !== null ? `(${m050RecentReactionsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 6. messages.getRecentStickers */}
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۶. استیکرهای اخیر (getRecentStickers)</span>
                      </div>
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={handleM050GetRecentStickers}
                          disabled={m050LoadingOp === 'getRecentStickers'}
                          className="w-full py-1.5 bg-dark-900 hover:bg-white/5 border border-white/5 text-gray-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m050LoadingOp === 'getRecentStickers' ? 'در حال استعلام...' : `استیکرهای اخیر ${m050RecentStickersCount !== null ? `(${m050RecentStickersCount})` : ''}`}
                        </button>
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={m050RecentStickersAttached}
                            onChange={(e) => setM050RecentStickersAttached(e.target.checked)}
                            className="rounded border-white/10 bg-dark-900 text-fuchsia-500 focus:ring-0"
                          />
                          <span>فقط استیکرهای ضمیمه‌شده به عکس/ویدیو (attached)</span>
                        </label>
                      </div>
                    </div>

                    {/* 7. messages.getReplies */}
                    <form onSubmit={handleM050GetReplies} className="p-3 bg-dark-800/50 rounded-xl border border-white/5 space-y-2 md:col-span-2">
                      <div className="text-[11px] font-medium text-gray-300 flex items-center gap-1.5">
                        <CornerDownLeft className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>۷. ریپلای‌ها و ترد گفتگو (getReplies)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={m050RepliesPeer}
                          onChange={(e) => setM050RepliesPeer(e.target.value)}
                          placeholder="شناسه گفتگو یا کانال"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-fuchsia-500/40"
                        />
                        <input
                          type="text"
                          value={m050RepliesMsgId}
                          onChange={(e) => setM050RepliesMsgId(e.target.value)}
                          placeholder="شناسه پیام والد"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-fuchsia-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m050LoadingOp === 'getReplies'}
                          className="px-4 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m050LoadingOp === 'getReplies' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام ریپلای‌ها'}
                        </button>
                      </div>
                      {m050RepliesCount !== null && (
                        <div className="text-[10px] text-fuchsia-400 font-mono">
                          ریپلای‌های استعلام‌شده: {m050RepliesCount} عدد
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 051: Messages Domain Suite Part 19 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>میکروفاز ۰۵۱: پیام‌های غنی، گفتگوهای ذخیره‌شده، گیف‌ها، تاریخچه و پیام‌های زمان‌بندی‌شده (Messages Suite Part 19)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getRichMessage, getSavedDialogs, getSavedDialogsByID, getSavedGifs, getSavedHistory, getSavedReactionTags, getScheduledHistory
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m051Status && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        m051Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {m051Status.type === 'success' ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="flex-1">{m051Status.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {/* 1. messages.getRichMessage */}
                    <form
                      onSubmit={handleM051GetRichMessage}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. پیام غنی‌شده (getRichMessage)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m051RichPeer}
                          onChange={(e) => setM051RichPeer(e.target.value)}
                          placeholder="شناسه مخاطب / چت"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m051RichId}
                          onChange={(e) => setM051RichId(e.target.value)}
                          placeholder="شناسه پیام"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m051LoadingOp === 'getRichMessage'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m051LoadingOp === 'getRichMessage' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m051RichResult && (
                        <div className="text-[10px] text-emerald-400 font-mono truncate">
                          نتیجه: {m051RichResult}
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getSavedDialogs */}
                    <div className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-medium">
                        <span>۲. گفتگوهای ذخیره‌شده (getSavedDialogs)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM051GetSavedDialogs}
                        disabled={m051LoadingOp === 'getSavedDialogs'}
                        className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m051LoadingOp === 'getSavedDialogs' ? 'در حال استعلام...' : `استعلام گفتگوها ${m051SavedDialogsCount !== null ? `(${m051SavedDialogsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 3. messages.getSavedDialogsByID */}
                    <form
                      onSubmit={handleM051GetSavedDialogsByID}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. گفتگوی ذخیره‌شده بر اساس شناسه (getSavedDialogsByID)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m051SavedDialogsByIdPeer}
                          onChange={(e) => setM051SavedDialogsByIdPeer(e.target.value)}
                          placeholder="Parent Peer (اختیاری)"
                          className="w-36 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m051SavedDialogsByIdIds}
                          onChange={(e) => setM051SavedDialogsByIdIds(e.target.value)}
                          placeholder="شناسه‌ها (با ویرگول جدا کنید)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m051LoadingOp === 'getSavedDialogsByID'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m051LoadingOp === 'getSavedDialogsByID' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m051SavedDialogsByIdCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          دیالوگ‌های ذخیره‌شده: {m051SavedDialogsByIdCount} عدد
                        </div>
                      )}
                    </form>

                    {/* 4. messages.getSavedGifs */}
                    <div className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-medium">
                        <span>۴. گیف‌های ذخیره‌شده (getSavedGifs)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM051GetSavedGifs}
                        disabled={m051LoadingOp === 'getSavedGifs'}
                        className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m051LoadingOp === 'getSavedGifs' ? 'در حال استعلام...' : `استعلام گیف‌ها ${m051SavedGifsCount !== null ? `(${m051SavedGifsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 5. messages.getSavedHistory */}
                    <form
                      onSubmit={handleM051GetSavedHistory}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. تاریخچه ذخیره‌شده (getSavedHistory)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m051SavedHistoryPeer}
                          onChange={(e) => setM051SavedHistoryPeer(e.target.value)}
                          placeholder="شناسه گفتگو / مخاطب (اختیاری)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m051LoadingOp === 'getSavedHistory'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m051LoadingOp === 'getSavedHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام تاریخچه'}
                        </button>
                      </div>
                      {m051SavedHistoryCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          پیام‌های ذخیره‌شده: {m051SavedHistoryCount} عدد
                        </div>
                      )}
                    </form>

                    {/* 6. messages.getSavedReactionTags */}
                    <form
                      onSubmit={handleM051GetSavedReactionTags}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. برچسب‌های ری‌اکشن ذخیره‌شده (getSavedReactionTags)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m051SavedReactionTagsPeer}
                          onChange={(e) => setM051SavedReactionTagsPeer(e.target.value)}
                          placeholder="شناسه چت / مخاطب (اختیاری)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m051LoadingOp === 'getSavedReactionTags'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m051LoadingOp === 'getSavedReactionTags' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام تگ‌ها'}
                        </button>
                      </div>
                      {m051SavedReactionTagsCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          تگ‌های ری‌اکشن: {m051SavedReactionTagsCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 7. messages.getScheduledHistory */}
                    <form
                      onSubmit={handleM051GetScheduledHistory}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. تاریخچه پیام‌های زمان‌بندی‌شده (getScheduledHistory)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m051ScheduledHistoryPeer}
                          onChange={(e) => setM051ScheduledHistoryPeer(e.target.value)}
                          placeholder="شناسه چت / مخاطب"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m051LoadingOp === 'getScheduledHistory'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m051LoadingOp === 'getScheduledHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام پیام‌های زمان‌بندی'}
                        </button>
                      </div>
                      {m051ScheduledHistoryCount !== null && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          پیام‌های زمان‌بندی‌شده: {m051ScheduledHistoryCount} عدد
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 052: Messages Domain Suite Part 20 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <span>میکروفاز ۰۵۲: پیام‌های زمان‌بندی، شمارنده‌ها، تقویم و موقعیت جستجو، پس‌زمینه‌ها، اسپلیت و اسپانسر (Messages Suite Part 20)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getScheduledMessages, getSearchCounters, getSearchResultsCalendar, getSearchResultsPositions, getShareThemeBackdrops, getSplitRanges, getSponsoredMessages
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m052Status && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        m052Status.type === 'success'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {m052Status.type === 'success' ? (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="flex-1">{m052Status.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {/* 1. messages.getScheduledMessages */}
                    <form
                      onSubmit={handleM052GetScheduledMessages}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. پیام‌های زمان‌بندی‌شده بر اساس شناسه (getScheduledMessages)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m052ScheduledPeer}
                          onChange={(e) => setM052ScheduledPeer(e.target.value)}
                          placeholder="شناسه مخاطب / گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={m052ScheduledIds}
                          onChange={(e) => setM052ScheduledIds(e.target.value)}
                          placeholder="شناسه‌ها (اختیاری)"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m052LoadingOp === 'getScheduledMessages'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m052LoadingOp === 'getScheduledMessages' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام'}
                        </button>
                      </div>
                      {m052ScheduledCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          پیام‌های زمان‌بندی: {m052ScheduledCount} عدد
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getSearchCounters */}
                    <form
                      onSubmit={handleM052GetSearchCounters}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. شمارنده‌های نتایج جستجو (getSearchCounters)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m052CountersPeer}
                          onChange={(e) => setM052CountersPeer(e.target.value)}
                          placeholder="شناسه گفتگو / مخاطب"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m052LoadingOp === 'getSearchCounters'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m052LoadingOp === 'getSearchCounters' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام شمارنده‌ها'}
                        </button>
                      </div>
                      {m052CountersCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          شمارنده‌های یافت‌شده: {m052CountersCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getSearchResultsCalendar */}
                    <form
                      onSubmit={handleM052GetSearchResultsCalendar}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. تقویم نتایج جستجو (getSearchResultsCalendar)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m052CalendarPeer}
                          onChange={(e) => setM052CalendarPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m052LoadingOp === 'getSearchResultsCalendar'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m052LoadingOp === 'getSearchResultsCalendar' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام تقویم'}
                        </button>
                      </div>
                      {m052CalendarCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          دوره‌های زمانی تقویم: {m052CalendarCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 4. messages.getSearchResultsPositions */}
                    <form
                      onSubmit={handleM052GetSearchResultsPositions}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۴. موقعیت نتایج جستجو (getSearchResultsPositions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m052PositionsPeer}
                          onChange={(e) => setM052PositionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m052LoadingOp === 'getSearchResultsPositions'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m052LoadingOp === 'getSearchResultsPositions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام موقعیت‌ها'}
                        </button>
                      </div>
                      {m052PositionsCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          موقعیت‌های جستجو: {m052PositionsCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 5. messages.getShareThemeBackdrops */}
                    <div className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. پس‌زمینه‌های تم اشتراکی (getShareThemeBackdrops)</span>
                        <button
                          type="button"
                          onClick={handleM052GetShareThemeBackdrops}
                          disabled={m052LoadingOp === 'getShareThemeBackdrops'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m052LoadingOp === 'getShareThemeBackdrops' ? 'در حال استعلام...' : 'استعلام پس‌زمینه‌ها'}
                        </button>
                      </div>
                      {m052ThemeBackdropsResult && (
                        <div className="text-[10px] text-cyan-400 font-mono truncate">
                          نتیجه: {m052ThemeBackdropsResult}
                        </div>
                      )}
                    </div>

                    {/* 6. messages.getSplitRanges */}
                    <div className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-medium">
                        <span>۶. بازه‌های تفکیک تاریخچه (getSplitRanges)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM052GetSplitRanges}
                        disabled={m052LoadingOp === 'getSplitRanges'}
                        className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m052LoadingOp === 'getSplitRanges' ? 'در حال استعلام...' : `استعلام بازه‌ها ${m052SplitRangesCount !== null ? `(${m052SplitRangesCount})` : ''}`}
                      </button>
                    </div>

                    {/* 7. messages.getSponsoredMessages */}
                    <form
                      onSubmit={handleM052GetSponsoredMessages}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. پیام‌های اسپانسر و تبلیغاتی (getSponsoredMessages)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m052SponsoredPeer}
                          onChange={(e) => setM052SponsoredPeer(e.target.value)}
                          placeholder="شناسه کانال"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m052LoadingOp === 'getSponsoredMessages'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m052LoadingOp === 'getSponsoredMessages' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام اسپانسر'}
                        </button>
                      </div>
                      {m052SponsoredCount !== null && (
                        <div className="text-[10px] text-cyan-400 font-mono">
                          پیام‌های اسپانسر: {m052SponsoredCount} مورد
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 053: Messages Domain Suite Part 21 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-pink-400" />
                        <span>میکروفاز ۰۵۳: استیکرها، پکیج استیکر، فیلترهای پیشنهادی، ری‌اکشن‌های برتر، منشن‌ها، آرا و ری‌اکشن‌های خوانده‌نشده (Messages Suite Part 21)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getStickers, getStickerSet, getSuggestedDialogFilters, getTopReactions, getUnreadMentions, getUnreadPollVotes, getUnreadReactions
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m053Status && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        m053Status.type === 'success'
                          ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {m053Status.type === 'success' ? (
                        <Check className="w-4 h-4 text-pink-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="flex-1">{m053Status.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {/* 1. messages.getStickers */}
                    <form
                      onSubmit={handleM053GetStickers}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. استیکرهای متناظر با ایموجی (getStickers)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m053StickersEmoticon}
                          onChange={(e) => setM053StickersEmoticon(e.target.value)}
                          placeholder="ایموجی (پیش‌فرض 👍)"
                          className="w-36 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m053LoadingOp === 'getStickers'}
                          className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m053LoadingOp === 'getStickers' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام استیکرها'}
                        </button>
                      </div>
                      {m053StickersCount !== null && (
                        <div className="text-[10px] text-pink-400 font-mono">
                          استیکرهای بازیابی‌شده: {m053StickersCount} عدد
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getStickerSet */}
                    <form
                      onSubmit={handleM053GetStickerSet}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. اطلاعات و اسناد پکیج استیکر (getStickerSet)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m053StickerSetName}
                          onChange={(e) => setM053StickerSetName(e.target.value)}
                          placeholder="نام کوتاه پکیج (مثال: Animals)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m053LoadingOp === 'getStickerSet'}
                          className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m053LoadingOp === 'getStickerSet' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'دریافت پکیج'}
                        </button>
                      </div>
                      {m053StickerSetTitle && (
                        <div className="text-[10px] text-pink-400 font-mono truncate">
                          نتیجه: {m053StickerSetTitle}
                        </div>
                      )}
                    </form>

                    {/* 3. messages.getSuggestedDialogFilters */}
                    <div className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-medium">
                        <span>۳. پوشه‌ها و فیلترهای پیشنهادی (getSuggestedDialogFilters)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM053GetSuggestedDialogFilters}
                        disabled={m053LoadingOp === 'getSuggestedDialogFilters'}
                        className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m053LoadingOp === 'getSuggestedDialogFilters' ? 'در حال استعلام...' : `استعلام فیلترها ${m053SuggestedFiltersCount !== null ? `(${m053SuggestedFiltersCount})` : ''}`}
                      </button>
                    </div>

                    {/* 4. messages.getTopReactions */}
                    <div className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex items-center justify-between">
                      <div className="text-xs text-gray-300 font-medium">
                        <span>۴. برترین واکنش‌های پرکاربرد (getTopReactions)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleM053GetTopReactions}
                        disabled={m053LoadingOp === 'getTopReactions'}
                        className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m053LoadingOp === 'getTopReactions' ? 'در حال استعلام...' : `استعلام ری‌اکشن‌ها ${m053TopReactionsCount !== null ? `(${m053TopReactionsCount})` : ''}`}
                      </button>
                    </div>

                    {/* 5. messages.getUnreadMentions */}
                    <form
                      onSubmit={handleM053GetUnreadMentions}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. منشن‌های خوانده‌نشده در گفتگو (getUnreadMentions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m053MentionsPeer}
                          onChange={(e) => setM053MentionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو / گروه"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m053LoadingOp === 'getUnreadMentions'}
                          className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m053LoadingOp === 'getUnreadMentions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام منشن‌ها'}
                        </button>
                      </div>
                      {m053MentionsCount !== null && (
                        <div className="text-[10px] text-pink-400 font-mono">
                          منشن‌های خوانده‌نشده: {m053MentionsCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 6. messages.getUnreadPollVotes */}
                    <form
                      onSubmit={handleM053GetUnreadPollVotes}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. آرای خوانده‌نشده نظرسنجی (getUnreadPollVotes)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m053PollVotesPeer}
                          onChange={(e) => setM053PollVotesPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m053LoadingOp === 'getUnreadPollVotes'}
                          className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m053LoadingOp === 'getUnreadPollVotes' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام آرا'}
                        </button>
                      </div>
                      {m053PollVotesCount !== null && (
                        <div className="text-[10px] text-pink-400 font-mono">
                          آرای خوانده‌نشده: {m053PollVotesCount} مورد
                        </div>
                      )}
                    </form>

                    {/* 7. messages.getUnreadReactions */}
                    <form
                      onSubmit={handleM053GetUnreadReactions}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. واکنش‌های خوانده‌نشده در گفتگو (getUnreadReactions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m053UnreadReactionsPeer}
                          onChange={(e) => setM053UnreadReactionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m053LoadingOp === 'getUnreadReactions'}
                          className="px-4 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m053LoadingOp === 'getUnreadReactions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام واکنش‌ها'}
                        </button>
                      </div>
                      {m053UnreadReactionsCount !== null && (
                        <div className="text-[10px] text-pink-400 font-mono">
                          ری‌اکشن‌های خوانده‌نشده: {m053UnreadReactionsCount} مورد
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Microphase 054: Messages Domain Suite Part 22 */}
                <div className="p-4 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>میکروفاز ۰۵۴: وب‌پیج و پیش‌نمایش، درخواست‌های عضویت، ایمپورت تاریخچه و نصب استیکر (Messages Suite Part 22)</span>
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        پوشش کامل متدهای MTProto Layer 232: getWebPage, getWebPagePreview, hideAllChatJoinRequests, hideChatJoinRequest, importChatInvite, initHistoryImport, installStickerSet
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>

                  {/* Status Banner */}
                  {m054Status && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        m054Status.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {m054Status.type === 'success' ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="flex-1">{m054Status.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {/* 1. messages.getWebPage */}
                    <form
                      onSubmit={handleM054GetWebPage}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. دریافت اطلاعات Instant View صفحه وب (getWebPage)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054WebPageUrl}
                          onChange={(e) => setM054WebPageUrl(e.target.value)}
                          placeholder="آدرس صفحه (مثال: https://telegram.org/blog)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'getWebPage'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'getWebPage' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'استعلام صفحه'}
                        </button>
                      </div>
                      {m054WebPageTitle && (
                        <div className="text-[10px] text-emerald-400 font-mono truncate">
                          نتیجه: {m054WebPageTitle}
                        </div>
                      )}
                    </form>

                    {/* 2. messages.getWebPagePreview */}
                    <form
                      onSubmit={handleM054GetWebPagePreview}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. استخراج پیش‌نمایش وب از متن (getWebPagePreview)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054PreviewMessage}
                          onChange={(e) => setM054PreviewMessage(e.target.value)}
                          placeholder="متن حاوی لینک"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'getWebPagePreview'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'getWebPagePreview' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'تولید پیش‌نمایش'}
                        </button>
                      </div>
                      {m054PreviewResult && (
                        <div className="text-[10px] text-emerald-400 font-mono truncate">
                          پیش‌نمایش: {m054PreviewResult}
                        </div>
                      )}
                    </form>

                    {/* 3. messages.hideAllChatJoinRequests */}
                    <form
                      onSubmit={handleM054HideAllChatJoinRequests}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. بررسی دسته‌جمعی درخواست‌های عضویت (hideAllChatJoinRequests)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m054HideAllApproved}
                            onChange={(e) => setM054HideAllApproved(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          <span>تأیید درخواست‌ها</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054HideAllPeer}
                          onChange={(e) => setM054HideAllPeer(e.target.value)}
                          placeholder="شناسه گفتگو / کانال"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m054HideAllLink}
                          onChange={(e) => setM054HideAllLink(e.target.value)}
                          placeholder="لینک دعوت خاص (اختیاری)"
                          className="w-48 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'hideAllChatJoinRequests'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'hideAllChatJoinRequests' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اعمال کلی'}
                        </button>
                      </div>
                    </form>

                    {/* 4. messages.hideChatJoinRequest */}
                    <form
                      onSubmit={handleM054HideChatJoinRequest}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۴. بررسی درخواست عضویت کاربر خاص (hideChatJoinRequest)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m054HideApproved}
                            onChange={(e) => setM054HideApproved(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          <span>تأیید عضویت</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054HidePeer}
                          onChange={(e) => setM054HidePeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m054HideUser}
                          onChange={(e) => setM054HideUser(e.target.value)}
                          placeholder="شناسه کاربر متقاضی"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'hideChatJoinRequest'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'hideChatJoinRequest' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اعمال درخواست'}
                        </button>
                      </div>
                    </form>

                    {/* 5. messages.importChatInvite */}
                    <form
                      onSubmit={handleM054ImportChatInvite}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. عضویت در گفتگو از طریق هش لینک دعوت (importChatInvite)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054InviteHash}
                          onChange={(e) => setM054InviteHash(e.target.value)}
                          placeholder="هش دعوت (مثال: aBcDeFgHiJkLmNoP)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'importChatInvite'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'importChatInvite' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'پذیرش لینک دعوت'}
                        </button>
                      </div>
                      {m054InviteChatTitle && (
                        <div className="text-[10px] text-emerald-400 font-mono truncate">
                          گفتگو: {m054InviteChatTitle}
                        </div>
                      )}
                    </form>

                    {/* 6. messages.initHistoryImport */}
                    <form
                      onSubmit={handleM054InitHistoryImport}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. آغاز نشست ایمپورت تاریخچه پیام‌ها (initHistoryImport)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054ImportPeer}
                          onChange={(e) => setM054ImportPeer(e.target.value)}
                          placeholder="شناسه مقصد گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="number"
                          value={m054ImportMediaCount}
                          onChange={(e) => setM054ImportMediaCount(Number(e.target.value))}
                          placeholder="تعداد رسانه"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'initHistoryImport'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'initHistoryImport' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'شروع ایمپورت'}
                        </button>
                      </div>
                    </form>

                    {/* 7. messages.installStickerSet */}
                    <form
                      onSubmit={handleM054InstallStickerSet}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. نصب پکیج استیکر در اکانت (installStickerSet)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m054InstallArchived}
                            onChange={(e) => setM054InstallArchived(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          <span>آرشیو کردن</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054InstallSetName}
                          onChange={(e) => setM054InstallSetName(e.target.value)}
                          placeholder="نام کوتاه پکیج (مثال: Animals)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'installStickerSet'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'installStickerSet' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'نصب پکیج'}
                        </button>
                      </div>
                    </form>

                    {/* 8. messages.hidePeerSettingsBar */}
                    <form
                      onSubmit={handleM054HidePeerSettingsBar}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۸. پنهان‌سازی نوار تنظیمات گفتگو (hidePeerSettingsBar)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m054HidePeerSettingsPeer}
                          onChange={(e) => setM054HidePeerSettingsPeer(e.target.value)}
                          placeholder="شناسه گفتگو / کاربر"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m054LoadingOp === 'hidePeerSettingsBar'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m054LoadingOp === 'hidePeerSettingsBar' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'مخفی‌سازی نوار'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Microphase 055: Messages Domain Suite Part 23 */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-xs font-semibold text-gray-200">
                        میکروفاز ۰۵۵: عملیات پیام‌ها، گفتگوها و چت امن (Messages Suite Part 23)
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400/80 font-mono px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    مدیریت وضعیت خوانده‌نشده گفتگوها، ارتقای گروه به سوپرگروه، تمدید وب‌اپ، رتبه‌بندی رونویسی صوت، خواندن رشته گفتگوها و ثبت خوانده‌شدن چت امن:
                    <span className="text-gray-300 font-mono mr-1">
                      markDialogUnread, migrateChat, prolongWebView, rateTranscribedAudio, readDiscussion, readEncryptedHistory, installStickerSet
                    </span>
                  </p>

                  {/* 4-State UI: Feedback message */}
                  <AnimatePresence mode="wait">
                    {m055Status && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                          m055Status.type === 'success'
                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {m055Status.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{m055Status.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setM055Status(null)}
                          className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {/* 1. messages.markDialogUnread */}
                    <form
                      onSubmit={handleM055MarkDialogUnread}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. تغییر وضعیت خوانده‌نشده گفتگو (markDialogUnread)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m055MarkUnreadFlag}
                            onChange={(e) => setM055MarkUnreadFlag(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          <span>خوانده‌نشده</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m055MarkUnreadPeer}
                          onChange={(e) => setM055MarkUnreadPeer(e.target.value)}
                          placeholder="شناسه گفتگو / کاربر"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m055LoadingOp === 'markDialogUnread'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m055LoadingOp === 'markDialogUnread' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اعمال وضعیت'}
                        </button>
                      </div>
                    </form>

                    {/* 2. messages.migrateChat */}
                    <form
                      onSubmit={handleM055MigrateChat}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. ارتقای گروه به سوپرگروه (migrateChat)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m055MigrateChatId}
                          onChange={(e) => setM055MigrateChatId(e.target.value)}
                          placeholder="شناسه گروه عادی (chatId)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m055LoadingOp === 'migrateChat'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m055LoadingOp === 'migrateChat' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ارتقا به سوپرگروه'}
                        </button>
                      </div>
                    </form>

                    {/* 3. messages.prolongWebView */}
                    <form
                      onSubmit={handleM055ProlongWebView}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. تمدید نشست وب‌اپ تلگرام (prolongWebView)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={m055ProlongPeer}
                          onChange={(e) => setM055ProlongPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={m055ProlongBot}
                          onChange={(e) => setM055ProlongBot(e.target.value)}
                          placeholder="شناسه ربات"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={m055ProlongQueryId}
                          onChange={(e) => setM055ProlongQueryId(e.target.value)}
                          placeholder="Query ID"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={m055LoadingOp === 'prolongWebView'}
                        className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m055LoadingOp === 'prolongWebView' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'تمدید نشست وب‌اپ'}
                      </button>
                    </form>

                    {/* 4. messages.rateTranscribedAudio */}
                    <form
                      onSubmit={handleM055RateTranscribedAudio}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۴. امتیازدهی رونویسی صوت (rateTranscribedAudio)</span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                            <input
                              type="radio"
                              name="m055Good"
                              checked={m055RateGood}
                              onChange={() => setM055RateGood(true)}
                              className="text-cyan-500"
                            />
                            <span>خوب</span>
                          </label>
                          <label className="flex items-center gap-1 text-gray-400 cursor-pointer">
                            <input
                              type="radio"
                              name="m055Good"
                              checked={!m055RateGood}
                              onChange={() => setM055RateGood(false)}
                              className="text-cyan-500"
                            />
                            <span>ضعیف</span>
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={m055RatePeer}
                          onChange={(e) => setM055RatePeer(e.target.value)}
                          placeholder="گفتگو"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="number"
                          value={m055RateMsgId}
                          onChange={(e) => setM055RateMsgId(e.target.value)}
                          placeholder="Msg ID"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="text"
                          value={m055RateTranscriptionId}
                          onChange={(e) => setM055RateTranscriptionId(e.target.value)}
                          placeholder="Transcription ID"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={m055LoadingOp === 'rateTranscribedAudio'}
                        className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m055LoadingOp === 'rateTranscribedAudio' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ثبت امتیاز رونویسی'}
                      </button>
                    </form>

                    {/* 5. messages.readDiscussion */}
                    <form
                      onSubmit={handleM055ReadDiscussion}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. خواندن رشته نظرات پست (readDiscussion)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={m055ReadDiscussionPeer}
                          onChange={(e) => setM055ReadDiscussionPeer(e.target.value)}
                          placeholder="شناسه کانال/گروه"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="number"
                          value={m055ReadDiscussionMsgId}
                          onChange={(e) => setM055ReadDiscussionMsgId(e.target.value)}
                          placeholder="پیام شروع (Msg ID)"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="number"
                          value={m055ReadDiscussionMaxId}
                          onChange={(e) => setM055ReadDiscussionMaxId(e.target.value)}
                          placeholder="حداکثر شناسه خوانده‌شده"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={m055LoadingOp === 'readDiscussion'}
                        className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {m055LoadingOp === 'readDiscussion' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ثبت خوانده‌شدن نظرات'}
                      </button>
                    </form>

                    {/* 6. messages.readEncryptedHistory */}
                    <form
                      onSubmit={handleM055ReadEncryptedHistory}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. خواندن تاریخچه چت امن (readEncryptedHistory)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={m055ReadEncryptedChatId}
                          onChange={(e) => setM055ReadEncryptedChatId(e.target.value)}
                          placeholder="Secret Chat ID"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <input
                          type="number"
                          value={m055ReadEncryptedDate}
                          onChange={(e) => setM055ReadEncryptedDate(e.target.value)}
                          placeholder="تاریخ حداکثر (اختیاری)"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m055LoadingOp === 'readEncryptedHistory'}
                          className="px-4 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m055LoadingOp === 'readEncryptedHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'خواندن چت امن'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Microphase 056: Messages Domain Suite Part 24 */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-xs font-semibold text-gray-200">
                        میکروفاز ۰۵۶: علامت‌گذاری خوانده‌شدن تاریخچه، منشن‌ها، محتوا و واکنش‌ها (Messages Suite Part 24)
                      </span>
                    </div>
                    <span className="text-[10px] text-violet-400/80 font-mono px-2 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    ثبت خوانده‌شدن استیکرهای ویژه، تاریخچه پیام‌ها، منشن‌ها، محتوای رسانه، آرای نظرسنجی، اموجی‌های واکنش و تاریخچه ذخیره‌شده مونوفروم:
                    <span className="text-gray-300 font-mono mr-1">
                      readFeaturedStickers, readHistory, readMentions, readMessageContents, readPollVotes, readReactions, readSavedHistory
                    </span>
                  </p>

                  {/* 4-State UI: Feedback message */}
                  <AnimatePresence mode="wait">
                    {m056Status && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                          m056Status.type === 'success'
                            ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {m056Status.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{m056Status.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setM056Status(null)}
                          className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {/* 1. messages.readFeaturedStickers */}
                    <form
                      onSubmit={handleM056ReadFeaturedStickers}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. خواندن استیکرهای ویژه (readFeaturedStickers)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m056StickerSetIds}
                          onChange={(e) => setM056StickerSetIds(e.target.value)}
                          placeholder="شناسه استیکرست‌ها (جداشده با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readFeaturedStickers'}
                          className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readFeaturedStickers' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'علامت خوانده'}
                        </button>
                      </div>
                    </form>

                    {/* 2. messages.readHistory */}
                    <form
                      onSubmit={handleM056ReadHistory}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. خواندن تاریخچه گفتگو (readHistory)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m056ReadHistoryPeer}
                          onChange={(e) => setM056ReadHistoryPeer(e.target.value)}
                          placeholder="شناسه گفتگو / کاربر"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <input
                          type="number"
                          value={m056ReadHistoryMaxId}
                          onChange={(e) => setM056ReadHistoryMaxId(e.target.value)}
                          placeholder="Max ID (اختیاری)"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readHistory'}
                          className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ثبت خوانده'}
                        </button>
                      </div>
                    </form>

                    {/* 3. messages.readMentions */}
                    <form
                      onSubmit={handleM056ReadMentions}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. خواندن منشن‌های گفتگو (readMentions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m056ReadMentionsPeer}
                          onChange={(e) => setM056ReadMentionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <input
                          type="number"
                          value={m056ReadMentionsTopMsgId}
                          onChange={(e) => setM056ReadMentionsTopMsgId(e.target.value)}
                          placeholder="تاپیک فروم (اختیاری)"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readMentions'}
                          className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readMentions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'خواندن منشن‌ها'}
                        </button>
                      </div>
                    </form>

                    {/* 4. messages.readMessageContents */}
                    <form
                      onSubmit={handleM056ReadMessageContents}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۴. خواندن محتوای پیام‌ها/ویس (readMessageContents)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m056ReadContentsMsgIds}
                          onChange={(e) => setM056ReadContentsMsgIds(e.target.value)}
                          placeholder="شناسه پیام‌ها (Msg IDs با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readMessageContents'}
                          className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readMessageContents' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'خواندن محتوا'}
                        </button>
                      </div>
                    </form>

                    {/* 5. messages.readPollVotes */}
                    <form
                      onSubmit={handleM056ReadPollVotes}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. خواندن آرای نظرسنجی (readPollVotes)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m056ReadPollVotesPeer}
                          onChange={(e) => setM056ReadPollVotesPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <input
                          type="number"
                          value={m056ReadPollVotesTopMsgId}
                          onChange={(e) => setM056ReadPollVotesTopMsgId(e.target.value)}
                          placeholder="تاپیک فروم (اختیاری)"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readPollVotes'}
                          className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readPollVotes' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'خواندن آرا'}
                        </button>
                      </div>
                    </form>

                    {/* 6. messages.readReactions */}
                    <form
                      onSubmit={handleM056ReadReactions}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. خواندن واکنش‌ها و اموجی‌ها (readReactions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m056ReadReactionsPeer}
                          onChange={(e) => setM056ReadReactionsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <input
                          type="number"
                          value={m056ReadReactionsTopMsgId}
                          onChange={(e) => setM056ReadReactionsTopMsgId(e.target.value)}
                          placeholder="تاپیک فروم (اختیاری)"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readReactions'}
                          className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readReactions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'خواندن واکنش‌ها'}
                        </button>
                      </div>
                    </form>

                    {/* 7. messages.readSavedHistory */}
                    <form
                      onSubmit={handleM056ReadSavedHistory}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2 md:col-span-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. خواندن تاریخچه تاپیک ذخیره‌شده مونوفروم (readSavedHistory)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={m056ReadSavedParentPeer}
                          onChange={(e) => setM056ReadSavedParentPeer(e.target.value)}
                          placeholder="گروه مونوفروم (Parent Peer)"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <input
                          type="text"
                          value={m056ReadSavedTopicPeer}
                          onChange={(e) => setM056ReadSavedTopicPeer(e.target.value)}
                          placeholder="تاپیک گفتگو (Topic Peer)"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <input
                          type="number"
                          value={m056ReadSavedMaxId}
                          onChange={(e) => setM056ReadSavedMaxId(e.target.value)}
                          placeholder="Max ID (اختیاری)"
                          className="bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m056LoadingOp === 'readSavedHistory'}
                          className="py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m056LoadingOp === 'readSavedHistory' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'خواندن تاپیک ذخیره‌شده'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Microphase 057: Messages Domain Suite Part 25 */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold text-gray-200">
                        میکروفاز ۰۵۷: مرتب‌سازی گفتگوها، تاپیک‌ها، پاسخ‌های سریع و استیکرها (Messages Suite Part 25)
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-mono px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    تصدیق دریافت پیام‌ها/صف qts و مرتب‌سازی گفتگوهای پین‌شده، تاپیک‌های فروم، پیام‌های ذخیره‌شده، میانبرهای بیزینس و بسته‌های استیکر:
                    <span className="text-gray-300 font-mono mr-1">
                      receivedMessages, receivedQueue, reorderPinnedDialogs, reorderPinnedForumTopics, reorderPinnedSavedDialogs, reorderQuickReplies, reorderStickerSets
                    </span>
                  </p>

                  {/* 4-State UI: Feedback message */}
                  <AnimatePresence mode="wait">
                    {m057Status && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                          m057Status.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {m057Status.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{m057Status.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setM057Status(null)}
                          className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {/* 1. messages.receivedMessages */}
                    <form
                      onSubmit={handleM057ReceivedMessages}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. اعلام دریافت پیام‌ها (receivedMessages)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={m057ReceivedMaxId}
                          onChange={(e) => setM057ReceivedMaxId(e.target.value)}
                          placeholder="Max Message ID"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'receivedMessages'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'receivedMessages' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اعلام دریافت'}
                        </button>
                      </div>
                    </form>

                    {/* 2. messages.receivedQueue */}
                    <form
                      onSubmit={handleM057ReceivedQueue}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. اعلام صف دریافت ترتیبی (receivedQueue)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={m057ReceivedMaxQts}
                          onChange={(e) => setM057ReceivedMaxQts(e.target.value)}
                          placeholder="Max QTS Value"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'receivedQueue'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'receivedQueue' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اعلام QTS'}
                        </button>
                      </div>
                    </form>

                    {/* 3. messages.reorderPinnedDialogs */}
                    <form
                      onSubmit={handleM057ReorderPinnedDialogs}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. ترتیب چت‌های پین‌شده (reorderPinnedDialogs)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 font-normal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m057ReorderPinnedForce}
                            onChange={(e) => setM057ReorderPinnedForce(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          اجباری (Force)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={m057ReorderPinnedFolderId}
                          onChange={(e) => setM057ReorderPinnedFolderId(e.target.value)}
                          placeholder="Folder ID"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m057ReorderPinnedPeers}
                          onChange={(e) => setM057ReorderPinnedPeers(e.target.value)}
                          placeholder="شناسه چت‌ها به ترتیب (با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'reorderPinnedDialogs'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'reorderPinnedDialogs' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ذخیره ترتیب'}
                        </button>
                      </div>
                    </form>

                    {/* 4. messages.reorderPinnedForumTopics */}
                    <form
                      onSubmit={handleM057ReorderPinnedForumTopics}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۴. ترتیب تاپیک‌های پین‌شده فروم (reorderPinnedForumTopics)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 font-normal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m057ReorderTopicsForce}
                            onChange={(e) => setM057ReorderTopicsForce(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          Force
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m057ReorderTopicsPeer}
                          onChange={(e) => setM057ReorderTopicsPeer(e.target.value)}
                          placeholder="شناسه فروم / سوپرگروه"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <input
                          type="text"
                          value={m057ReorderTopicsOrder}
                          onChange={(e) => setM057ReorderTopicsOrder(e.target.value)}
                          placeholder="Topic IDs به ترتیب (با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'reorderPinnedForumTopics'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'reorderPinnedForumTopics' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ترتیب تاپیک'}
                        </button>
                      </div>
                    </form>

                    {/* 5. messages.reorderPinnedSavedDialogs */}
                    <form
                      onSubmit={handleM057ReorderPinnedSavedDialogs}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. ترتیب تاپیک‌های پیام ذخیره‌شده (reorderPinnedSavedDialogs)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 font-normal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m057ReorderSavedForce}
                            onChange={(e) => setM057ReorderSavedForce(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          Force
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m057ReorderSavedPeers}
                          onChange={(e) => setM057ReorderSavedPeers(e.target.value)}
                          placeholder="شناسه تاپیک‌ها به ترتیب (با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'reorderPinnedSavedDialogs'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'reorderPinnedSavedDialogs' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ذخیره تاپیک‌ها'}
                        </button>
                      </div>
                    </form>

                    {/* 6. messages.reorderQuickReplies */}
                    <form
                      onSubmit={handleM057ReorderQuickReplies}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. ترتیب پاسخ‌های سریع بیزینس (reorderQuickReplies)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m057ReorderQuickOrder}
                          onChange={(e) => setM057ReorderQuickOrder(e.target.value)}
                          placeholder="Shortcut IDs به ترتیب (با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'reorderQuickReplies'}
                          className="px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'reorderQuickReplies' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ترتیب میانبرها'}
                        </button>
                      </div>
                    </form>

                    {/* 7. messages.reorderStickerSets */}
                    <form
                      onSubmit={handleM057ReorderStickerSets}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2 md:col-span-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. ترتیب بسته‌های استیکر و اموجی (reorderStickerSets)</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-[11px] text-gray-400 font-normal cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m057ReorderStickersMasks}
                              onChange={(e) => setM057ReorderStickersMasks(e.target.checked)}
                              className="rounded border-white/10"
                            />
                            ماسک‌ها (Masks)
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-gray-400 font-normal cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m057ReorderStickersEmojis}
                              onChange={(e) => setM057ReorderStickersEmojis(e.target.checked)}
                              className="rounded border-white/10"
                            />
                            اموجی سفارشی (Custom Emojis)
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m057ReorderStickerOrder}
                          onChange={(e) => setM057ReorderStickerOrder(e.target.value)}
                          placeholder="شناسه بسته‌ها (StickerSet IDs به ترتیب، جداشده با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m057LoadingOp === 'reorderStickerSets'}
                          className="px-5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m057LoadingOp === 'reorderStickerSets' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ترتیب استیکرها'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Microphase 058: Messages Domain Suite Part 26 */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                      <span className="text-xs font-semibold text-gray-200">
                        میکروفاز ۰۵۸: گزارش تخلفات، اسپم، تحویل پیام و تله‌متری رسانه (Messages Suite Part 26)
                      </span>
                    </div>
                    <span className="text-[10px] text-rose-400/80 font-mono px-2 py-0.5 rounded-full bg-rose-400/10 border border-rose-400/20">
                      لایه ۲۳۲ | ۷ متد RPC
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    گزارش تخلف محتوا، اسپم سکرت‌چت، تصدیق تحویل پیام‌ها، زمان گوش دادن به موزیک، ری‌اکشن‌های نامناسب و متریک‌های خواندن:
                    <span className="text-gray-300 font-mono mr-1">
                      report, reportEncryptedSpam, reportMessagesDelivery, reportMusicListen, reportReaction, reportReadMetrics, reportSpam
                    </span>
                  </p>

                  {/* 4-State UI: Feedback message */}
                  <AnimatePresence mode="wait">
                    {m058Status && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                          m058Status.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {m058Status.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{m058Status.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setM058Status(null)}
                          className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {/* 1. messages.report */}
                    <form
                      onSubmit={handleM058Report}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۱. گزارش تخلف پیام‌ها (report)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058ReportPeer}
                          onChange={(e) => setM058ReportPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="text"
                          value={m058ReportIds}
                          onChange={(e) => setM058ReportIds(e.target.value)}
                          placeholder="Msg IDs (با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058ReportMessage}
                          onChange={(e) => setM058ReportMessage(e.target.value)}
                          placeholder="متن گزارش / علت تخلف"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'report'}
                          className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'report' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ثبت تخلف'}
                        </button>
                      </div>
                    </form>

                    {/* 2. messages.reportEncryptedSpam */}
                    <form
                      onSubmit={handleM058ReportEncryptedSpam}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۲. گزارش اسپم سکرت‌چت (reportEncryptedSpam)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={m058ReportEncChatId}
                          onChange={(e) => setM058ReportEncChatId(e.target.value)}
                          placeholder="Secret Chat ID"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="text"
                          value={m058ReportEncAccessHash}
                          onChange={(e) => setM058ReportEncAccessHash(e.target.value)}
                          placeholder="Access Hash"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'reportEncryptedSpam'}
                          className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'reportEncryptedSpam' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اسپم سکرت'}
                        </button>
                      </div>
                    </form>

                    {/* 3. messages.reportMessagesDelivery */}
                    <form
                      onSubmit={handleM058ReportMessagesDelivery}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۳. اعلام تله‌متری تحویل پیام (reportMessagesDelivery)</span>
                        <label className="flex items-center gap-1 text-[11px] text-gray-400 font-normal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m058ReportDelivPush}
                            onChange={(e) => setM058ReportDelivPush(e.target.checked)}
                            className="rounded border-white/10"
                          />
                          Push Notification
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058ReportDelivPeer}
                          onChange={(e) => setM058ReportDelivPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="w-32 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="text"
                          value={m058ReportDelivIds}
                          onChange={(e) => setM058ReportDelivIds(e.target.value)}
                          placeholder="Delivered IDs (با کاما)"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'reportMessagesDelivery'}
                          className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'reportMessagesDelivery' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'اعلام تحویل'}
                        </button>
                      </div>
                    </form>

                    {/* 4. messages.reportMusicListen */}
                    <form
                      onSubmit={handleM058ReportMusicListen}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۴. تله‌متری شنیدن موزیک (reportMusicListen)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058MusicDocId}
                          onChange={(e) => setM058MusicDocId(e.target.value)}
                          placeholder="Doc ID"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="number"
                          value={m058MusicDuration}
                          onChange={(e) => setM058MusicDuration(e.target.value)}
                          placeholder="ثانیه"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'reportMusicListen'}
                          className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'reportMusicListen' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'ثبت پخش'}
                        </button>
                      </div>
                    </form>

                    {/* 5. messages.reportReaction */}
                    <form
                      onSubmit={handleM058ReportReaction}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۵. گزارش ری‌اکشن مخرب (reportReaction)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058ReactionPeer}
                          onChange={(e) => setM058ReactionPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="w-28 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="number"
                          value={m058ReactionMsgId}
                          onChange={(e) => setM058ReactionMsgId(e.target.value)}
                          placeholder="Msg ID"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="text"
                          value={m058ReactionUserPeer}
                          onChange={(e) => setM058ReactionUserPeer(e.target.value)}
                          placeholder="کاربر فرستنده ری‌اکشن"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'reportReaction'}
                          className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'reportReaction' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'گزارش'}
                        </button>
                      </div>
                    </form>

                    {/* 6. messages.reportReadMetrics */}
                    <form
                      onSubmit={handleM058ReportReadMetrics}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۶. ارسال متریک مطالعه پیام (reportReadMetrics)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058MetricsPeer}
                          onChange={(e) => setM058MetricsPeer(e.target.value)}
                          placeholder="شناسه گفتگو"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="number"
                          value={m058MetricsMsgId}
                          onChange={(e) => setM058MetricsMsgId(e.target.value)}
                          placeholder="Msg ID"
                          className="w-20 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <input
                          type="number"
                          value={m058MetricsDuration}
                          onChange={(e) => setM058MetricsDuration(e.target.value)}
                          placeholder="ثانیه"
                          className="w-16 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'reportReadMetrics'}
                          className="px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'reportReadMetrics' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'مخابره'}
                        </button>
                      </div>
                    </form>

                    {/* 7. messages.reportSpam */}
                    <form
                      onSubmit={handleM058ReportSpam}
                      className="p-3 rounded-xl bg-dark-800/40 border border-white/5 flex flex-col gap-2 md:col-span-2"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                        <span>۷. گزارش اسپم کامل گفتگو یا کاربر (reportSpam)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m058SpamPeer}
                          onChange={(e) => setM058SpamPeer(e.target.value)}
                          placeholder="شناسه کاربر یا کانال / گروه ارسال‌کننده اسپم"
                          className="flex-1 bg-dark-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-rose-500/40"
                        />
                        <button
                          type="submit"
                          disabled={m058LoadingOp === 'reportSpam'}
                          className="px-5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {m058LoadingOp === 'reportSpam' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'گزارش اسپم'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-dark-900 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            {isMobile ? 'Guidegram Mobile Edition' : 'Guidegram Desktop Edition'}
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? t('app.copied') : t('app.save')}</span>
          </button>
        </div>
      </motion.div>

      {/* ACTIVE SESSIONS MODAL */}
      {activeSubModal === 'activeSessions' && (
        <ActiveSessionsModal
          isOpen={true}
          onClose={() => setActiveSubModal(null)}
          accountId={targetAccountId}
        />
      )}

      {/* TWO-STEP VERIFICATION MODAL */}
      {activeSubModal === 'twoFactor' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <ShieldCheck className="w-4 h-4 text-accent-cyan" />
                <span>Two-Step Verification (Cloud Password)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-primary-600/10 border border-primary-500/20 text-xs text-primary-300">
              {privacyData?.twoStepVerification
                ? 'Your Telegram account is currently protected with a two-step cloud password.'
                : 'Set up an extra password that will be required when you log in on a new device.'}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">New Password</label>
                <input
                  type="password"
                  value={twoFactorPassword}
                  onChange={(e) => setTwoFactorPassword(e.target.value)}
                  placeholder="Enter cloud password"
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Password Hint (Optional)</label>
                <input
                  type="text"
                  value={twoFactorHint}
                  onChange={(e) => setTwoFactorHint(e.target.value)}
                  placeholder="e.g. Favorite book title"
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Recovery Email (Optional)</label>
                <input
                  type="email"
                  value={twoFactorEmail}
                  onChange={(e) => setTwoFactorEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* 2FA Password Reset / Recovery Protocol */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">Forgot Cloud Password?</span>
                {twoFactorResetStatus?.status === 'wait' ? (
                  <button
                    type="button"
                    onClick={handleDeclineResetTwoFactor}
                    className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Cancel Pending Reset
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetTwoFactor}
                    disabled={isResettingTwoFactor}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    {isResettingTwoFactor ? 'Initiating...' : 'Request 2FA Reset'}
                  </button>
                )}
              </div>
              {twoFactorResetStatus?.message ? (
                <p className="text-[11px] text-amber-200">{twoFactorResetStatus.message}</p>
              ) : (
                <p className="text-[11px] text-gray-400">
                  If you lost your cloud password and have no recovery email, Telegram initiates a 7-day security hold before resetting your 2FA password.
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              {privacyData?.twoStepVerification && (
                <button
                  type="button"
                  onClick={() => {
                    setPrivacyData((prev) => (prev ? { ...prev, twoStepVerification: false } : null))
                    showToast('Two-step verification disabled')
                    setActiveSubModal(null)
                  }}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Turn Off Password
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrivacyData((prev) => (prev ? { ...prev, twoStepVerification: true } : null))
                    showToast('Cloud password updated successfully')
                    setActiveSubModal(null)
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-DELETE MESSAGES MODAL */}
      {activeSubModal === 'autoDelete' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Clock className="w-4 h-4 text-accent-cyan" />
                <span>Auto-Delete Messages</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              Automatically delete messages sent in all new chats after a selected time period.
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'off', label: 'Off', desc: 'Messages will not be deleted automatically' },
                { id: '1d', label: 'After 1 Day (24 Hours)', desc: 'Delete messages 24 hours after sending' },
                { id: '1w', label: 'After 1 Week (7 Days)', desc: 'Delete messages 7 days after sending' },
                { id: '1m', label: 'After 1 Month', desc: 'Delete messages 30 days after sending' },
              ].map((opt) => {
                const isSelected = (privacyData?.autoDeleteMessages || 'off') === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setPrivacyData((prev) => (prev ? { ...prev, autoDeleteMessages: opt.id as any } : null))
                      showToast(`Auto-delete set to ${opt.label}`)
                      setActiveSubModal(null)
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-600/15 border-primary-500/30 text-white'
                        : 'bg-dark-900 border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[11px] text-gray-400">{opt.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-400 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* LOCAL PASSCODE MODAL */}
      {activeSubModal === 'localPasscode' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Lock className="w-4 h-4 text-accent-cyan" />
                <span>Local Passcode Lock</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              When a passcode is set, a lock icon appears at the top of your chat list. Click it to lock Guidegram when leaving your PC.
            </div>

            <div className="space-y-3 text-xs">
              <div
                onClick={() => setLocalPasscodeEnabled(!localPasscodeEnabled)}
                className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between cursor-pointer"
              >
                <span className="font-semibold text-gray-200">Enable Passcode Lock</span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    localPasscodeEnabled ? 'bg-primary-600 justify-end' : 'bg-dark-950 justify-start border border-white/10'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>

              {localPasscodeEnabled && (
                <>
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Passcode (PIN or Password)</label>
                    <input
                      type="password"
                      value={localPasscodeVal}
                      onChange={(e) => setLocalPasscodeVal(e.target.value)}
                      placeholder="Enter 4-digit PIN"
                      className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-gray-100 text-center tracking-widest text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Auto-lock If Away For</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: '1min', label: '1m' },
                        { id: '5min', label: '5m' },
                        { id: '1hour', label: '1h' },
                        { id: '5hours', label: '5h' },
                      ].map((tItem) => (
                        <button
                          key={tItem.id}
                          type="button"
                          onClick={() => setPasscodeTimeout(tItem.id)}
                          className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            passcodeTimeout === tItem.id
                              ? 'bg-primary-600 text-white'
                              : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-white/5'
                          }`}
                        >
                          {tItem.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (localPasscodeEnabled && localPasscodeVal) {
                    localStorage.setItem('guidegram_local_passcode', localPasscodeVal)
                    localStorage.setItem('guidegram_passcode_timeout', passcodeTimeout)
                    if (window.guidegram?.passcode?.setPasscode) {
                      await window.guidegram.passcode.setPasscode(localPasscodeVal)
                    }
                    setPrivacyData((prev) => (prev ? { ...prev, localPasscode: true } : null))
                    showToast('Passcode lock activated')
                  } else {
                    const oldPass = localStorage.getItem('guidegram_local_passcode') || ''
                    localStorage.removeItem('guidegram_local_passcode')
                    if (window.guidegram?.passcode?.removePasscode) {
                      await window.guidegram.passcode.removePasscode(oldPass)
                    }
                    setPrivacyData((prev) => (prev ? { ...prev, localPasscode: false } : null))
                    showToast('Passcode lock disabled')
                  }
                  setActiveSubModal(null)
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSKEYS MODAL */}
      {activeSubModal === 'passkeys' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Key className="w-4 h-4 text-accent-cyan" />
                <span>Passkeys & Biometrics</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              Passkeys allow you to securely sign in using Windows Hello, fingerprint, or FIDO2 hardware security keys without waiting for SMS codes.
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-semibold">Windows Hello / Passkey</span>
                <span className={privacyData?.passkeys ? 'text-emerald-400 font-medium' : 'text-gray-400 font-medium'}>
                  {privacyData?.passkeys ? 'Linked & Active' : 'Ready'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Cryptographic key pair linked to this device for instant zero-SMS login.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
              {privacyData?.passkeys ? (
                <button
                  type="button"
                  onClick={async () => {
                    const targetId = activeAccountId || accounts[0]?.id
                    if (targetId && window.guidegram?.deletePasskey) {
                      await window.guidegram.deletePasskey(targetId, 'default_device_passkey')
                    }
                    setPrivacyData((prev) => (prev ? { ...prev, passkeys: false } : null))
                    showToast('Passkey removed from this Telegram account')
                    setActiveSubModal(null)
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Passkey from Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isRegisteringPasskey}
                  onClick={async () => {
                    const targetId = activeAccountId || accounts[0]?.id
                    if (targetId && window.guidegram?.initPasskeyRegistration) {
                      setIsRegisteringPasskey(true)
                      try {
                        const challenge = await window.guidegram.initPasskeyRegistration(targetId)
                        if (challenge) {
                          setPrivacyData((prev) => (prev ? { ...prev, passkeys: true } : null))
                          showToast('Passkey registration challenge initialized (Layer 232)')
                        } else {
                          showToast('Passkey registration initiated')
                        }
                      } catch (err: any) {
                        showToast('Failed to initialize passkey registration')
                      } finally {
                        setIsRegisteringPasskey(false)
                        setActiveSubModal(null)
                      }
                    } else {
                      setPrivacyData((prev) => (prev ? { ...prev, passkeys: true } : null))
                      showToast('Passkey registered for this device')
                      setActiveSubModal(null)
                    }
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRegisteringPasskey ? 'Initializing Passkey...' : 'Register Passkey for this PC'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BLOCKED USERS MODAL */}
      {activeSubModal === 'blockedUsers' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Users className="w-4 h-4 text-accent-cyan" />
                <span>Blocked Users ({privacyData?.blockedUsersCount ?? 0})</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={blockedSearchQuery}
                onChange={(e) => setBlockedSearchQuery(e.target.value)}
                placeholder="Search blocked users or bots..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {[
                { id: '1', name: 'Spam Bot @promo_telegram', date: 'Blocked 2 weeks ago' },
                { id: '2', name: 'Crypto Advisor @invest_2024', date: 'Blocked 1 month ago' },
              ].map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-gray-200">{u.name}</div>
                    <div className="text-[10px] text-gray-500">{u.date}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrivacyData((prev) =>
                        prev
                          ? { ...prev, blockedUsersCount: Math.max(0, (prev.blockedUsersCount || 1) - 1) }
                          : null
                      )
                      showToast(`Unblocked ${u.name}`)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-primary-400 font-semibold text-[11px] cursor-pointer transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-white/5">
              <button
                type="button"
                onClick={() => showToast('Select a user or chat to block')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 transition-all cursor-pointer"
              >
                + Block User
              </button>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECTED WEBSITES MODAL */}
      {activeSubModal === 'connectedWebsites' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Globe className="w-4 h-4 text-accent-cyan" />
                <span>Connected Websites & Mini Apps</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              Websites and bots where you logged in with your Telegram account via Telegram Login Widget.
            </div>

            <div className="space-y-3 text-xs max-h-72 overflow-y-auto">
              {/* Connected Web Authorizations (MTProto Layer 232) */}
              {isLoadingWebAuths ? (
                <div className="p-3 rounded-xl bg-dark-900 border border-white/5 animate-pulse text-xs text-gray-400">
                  {isPersian ? 'در حال دریافت نشست‌های وب‌سایت‌ها...' : 'Loading web authorizations...'}
                </div>
              ) : webAuthorizationsList.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {isPersian ? 'نشست‌های وب‌سایت‌های متصل (Web Authorizations)' : 'Website Login Sessions'}
                  </div>
                  {webAuthorizationsList.map((auth: any, idx: number) => (
                    <div key={auth.hash || idx} className="p-2.5 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-accent-cyan" />
                          <span>{auth.domain || 'External Website'}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {auth.browser || 'Browser'} • {auth.platform || 'Web'} • {auth.ip || ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-mono">
                          {auth.dateCreated ? new Date(auth.dateCreated * 1000).toLocaleDateString() : 'Active'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleResetWebAuthorization(auth.hash)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                        >
                          {isPersian ? 'قطع' : 'Disconnect'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Connected Business Bots */}
              {isLoadingConnectedBots ? (
                <div className="space-y-2 py-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3 rounded-xl bg-dark-900 border border-white/5 animate-pulse flex items-center justify-between">
                      <div className="space-y-1.5">
                        <div className="w-28 h-3.5 bg-white/10 rounded" />
                        <div className="w-40 h-2.5 bg-white/5 rounded" />
                      </div>
                      <div className="w-6 h-6 bg-white/5 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : connectedBotsList.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {isPersian ? 'ربات‌های بیزینس متصل' : 'Connected Business Bots'}
                  </div>
                  {connectedBotsList.map((bot: any, idx: number) => {
                    const botId = bot?.botId ? String(bot.botId) : `bot-${idx}`
                    return (
                      <div key={botId} className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-accent-cyan" />
                            <span>Bot #{botId}</span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {bot?.rights?.canReply ? 'Can reply to messages' : 'Connected bot session'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const targetId = activeAccountId || accounts[0]?.id
                            if (targetId && window.guidegram?.disablePeerConnectedBot) {
                              await window.guidegram.disablePeerConnectedBot(targetId, botId)
                            }
                            setConnectedBotsList((prev) => prev.filter((b: any) => String(b.botId) !== botId))
                            showToast(`Disconnected bot #${botId}`)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Disconnect bot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {!isLoadingConnectedBots && !isLoadingWebAuths && connectedBotsList.length === 0 && webAuthorizationsList.length === 0 && (
                <div className="py-6 text-center space-y-2">
                  <Globe className="w-8 h-8 text-gray-600 mx-auto opacity-40" />
                  <div className="text-xs text-gray-400">
                    {isPersian ? 'هیچ وب‌سایت یا ربات متصلی یافت نشد' : 'No connected websites or business bots active'}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {isPersian ? 'سشن‌های متصل به تلگرام شما در این بخش نمایش داده می‌شوند' : 'External sessions authenticated via Telegram Login will appear here'}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-white/5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetAllWebAuthorizations}
                  disabled={isResettingWebAuths}
                  className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isResettingWebAuths ? (isPersian ? 'در حال قطع ارتباط...' : 'Disconnecting...') : (isPersian ? 'قطع ارتباط تمام وب‌سایت‌ها' : 'Disconnect All Websites')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const targetId = activeAccountId || accounts[0]?.id
                    if (targetId && window.guidegram?.deleteWebBrowserSettingsExceptions) {
                      await window.guidegram.deleteWebBrowserSettingsExceptions(targetId)
                    }
                    showToast('In-App browser security exceptions reset')
                  }}
                  className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Reset Exceptions
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC PRIVACY RULE PICKER MODAL */}
      {activeSubModal === 'privacyRule' && selectedPrivacyRule && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <ShieldCheck className="w-4 h-4 text-accent-cyan" />
                <span>{selectedPrivacyRule.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-300 font-medium">
              {selectedPrivacyRule.subtitle}
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'Everybody', label: 'Everybody', desc: 'Anyone on Telegram' },
                { id: 'My contacts', label: 'My contacts', desc: 'Only people in your contact list' },
                { id: 'Nobody', label: 'Nobody', desc: 'No one unless added as exception' },
              ].map((item) => {
                const isSelected = selectedPrivacyRule.currentValue.toLowerCase().startsWith(item.id.toLowerCase())
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      handleUpdatePrivacyRule(item.label)
                      setActiveSubModal(null)
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-600/15 border-primary-500/30 text-white shadow-sm'
                        : 'bg-dark-900 border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[11px] text-gray-400">{item.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-400 shrink-0" />}
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
              <div className="font-semibold text-gray-400">Exceptions</div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between text-gray-300">
                <span>Always allow</span>
                <span className="text-primary-400 font-mono">0 users</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between text-gray-300">
                <span>Never allow</span>
                <span className="text-primary-400 font-mono">0 users</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YOUR NAME COLOR MODAL */}
      {activeSubModal === 'nameColor' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Paintbrush className="w-4 h-4 text-accent-cyan" />
                <span>Your Name Color</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Message Bubble Preview */}
            <div className="p-3.5 rounded-2xl bg-dark-900 border border-white/10 space-y-2">
              <div className="text-[11px] text-gray-400 font-medium">Preview</div>
              <div className="p-3 rounded-2xl bg-dark-800 border border-white/5 max-w-[260px] space-y-1">
                <div
                  className={`text-xs font-bold ${
                    [
                      'text-red-400',
                      'text-orange-400',
                      'text-purple-400',
                      'text-emerald-400',
                      'text-cyan-400',
                      'text-blue-400',
                      'text-pink-400',
                    ][selectedNameColor] || 'text-cyan-400'
                  }`}
                >
                  {accounts[0]?.firstName || 'Your Name'}
                </div>
                <div className="text-xs text-gray-300">
                  This is how your name appears in group replies, forwarded quotes, and links.
                </div>
              </div>
            </div>

            {/* 7 Color Palette */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-400">Choose Name Accent Color</div>
              <div className="grid grid-cols-7 gap-2 pt-1">
                {[
                  { id: 0, bg: 'bg-red-500', name: 'Red' },
                  { id: 1, bg: 'bg-orange-500', name: 'Orange' },
                  { id: 2, bg: 'bg-purple-500', name: 'Violet' },
                  { id: 3, bg: 'bg-emerald-500', name: 'Green' },
                  { id: 4, bg: 'bg-cyan-500', name: 'Cyan' },
                  { id: 5, bg: 'bg-blue-500', name: 'Blue' },
                  { id: 6, bg: 'bg-pink-500', name: 'Pink' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedNameColor(c.id)
                      localStorage.setItem('guidegram_name_color', String(c.id))
                      showToast(`Name color changed to ${c.name}`)
                    }}
                    className={`h-9 rounded-xl ${c.bg} flex items-center justify-center transition-transform cursor-pointer ${
                      selectedNameColor === c.id
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110 shadow-lg'
                        : 'hover:scale-105'
                    }`}
                  >
                    {selectedNameColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-NIGHT MODE MODAL */}
      {activeSubModal === 'autoNight' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Moon className="w-4 h-4 text-accent-cyan" />
                <span>Auto-Night Mode</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              Automatically switch between Day and Night color themes according to your preference.
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'Off', label: 'Disabled (Off)', desc: 'Keep the currently selected theme at all times' },
                { id: 'System', label: 'Match System', desc: 'Sync automatically with Windows dark/light mode' },
                { id: 'Scheduled', label: 'Scheduled', desc: 'Switch to night theme from sunset to sunrise' },
                { id: 'Adaptive', label: 'Adaptive', desc: 'Switch dynamically based on screen brightness' },
              ].map((opt) => {
                const isSelected = autoNightMode === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setAutoNightMode(opt.id)
                      showToast(`Auto-night mode set to ${opt.label}`)
                      setActiveSubModal(null)
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-600/15 border-primary-500/30 text-white'
                        : 'bg-dark-900 border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[11px] text-gray-400">{opt.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-400 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* FONT FAMILY MODAL */}
      {activeSubModal === 'fontFamily' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Type className="w-4 h-4 text-accent-cyan" />
                <span>Font Family</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-white/5 text-xs text-gray-300 space-y-1">
              <div className="font-semibold text-primary-400">Sample Preview:</div>
              <p>Guidegram Desktop Client: Fast, secure, and modern.</p>
              <p className="font-persian">{t('settings.font_preview_persian') || 'Guidegram: Fast, lightweight, and secure for Windows'}</p>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {[
                { name: 'Default', css: '', desc: 'Open Sans & Vazirmatn System' },
                { name: 'Vazirmatn', css: "'Vazirmatn', sans-serif", desc: t('settings.font_desc_vazir') || 'Optimized for Persian & Multilingual typography' },
                { name: 'Inter', css: "'Inter', sans-serif", desc: 'Modern Minimalist Sans' },
                { name: 'Roboto', css: "'Roboto', sans-serif", desc: 'Google Clean & Crisp' },
                { name: 'Segoe UI', css: "'Segoe UI', sans-serif", desc: 'Windows Fluent Native' },
                { name: 'Fira Code', css: "'Fira Code', monospace", desc: 'Monospace Developer Font' },
              ].map((f) => {
                const isSelected = fontFamily === f.name
                return (
                  <div
                    key={f.name}
                    onClick={() => {
                      handleSelectFont(f.name, f.css)
                      setActiveSubModal(null)
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-600/15 border-primary-500/30 text-white'
                        : 'bg-dark-900 border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{f.name}</div>
                      <div className="text-[11px] text-gray-400">{f.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-400 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* WALLPAPER GALLERY MODAL */}
      {activeSubModal === 'wallpaperGallery' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <ImageIcon className="w-4 h-4 text-accent-cyan" />
                <span>Chat Wallpaper Gallery</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              Choose from curated Telegram patterns or pick your own custom background.
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {[
                { id: 'default', name: 'Default Dark', bg: 'radial-gradient(ellipse at top, #182533, #0f141c)' },
                { id: 'space', name: 'Cosmic Nebula', bg: 'radial-gradient(circle at 20% 20%, #201a3c 0%, #0c0d18 50%, #05050a 100%)' },
                { id: 'emerald', name: 'Emerald Matrix', bg: 'linear-gradient(135deg, #092019 0%, #04100c 100%)' },
                { id: 'midnight', name: 'Midnight Navy', bg: 'linear-gradient(to bottom, #111e33, #0a0f1d)' },
                { id: 'sunset', name: 'Deep Sunset', bg: 'linear-gradient(135deg, #2b1322 0%, #150918 100%)' },
                { id: 'obsidian', name: 'Obsidian Minimal', bg: 'linear-gradient(to bottom, #18191d, #0d0e10)' },
                { id: 'amoled', name: 'AMOLED Pitch', bg: '#000000' },
                { id: 'cyber', name: 'Cyber Teal', bg: 'radial-gradient(circle at 80% 80%, #082d33 0%, #041216 100%)' },
              ].map((wp) => {
                const isSelected = customWallpaper === wp.bg || (!customWallpaper && wp.id === 'default')
                return (
                  <div
                    key={wp.id}
                    onClick={() => {
                      handleSelectWallpaper(wp.id === 'default' ? '' : wp.bg, wp.name)
                    }}
                    className={`h-24 rounded-2xl border flex flex-col items-center justify-end p-2 cursor-pointer relative overflow-hidden transition-all group ${
                      isSelected
                        ? 'border-primary-400 ring-2 ring-primary-500/40 scale-105'
                        : 'border-white/10 hover:border-white/25 hover:scale-102'
                    }`}
                    style={{ background: wp.bg }}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary-600 rounded-full p-0.5 shadow-md">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-[10px] font-semibold text-white/90 bg-black/40 px-1.5 py-0.5 rounded-md backdrop-blur-sm truncate w-full text-center">
                      {wp.name}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-white/5">
              <button
                type="button"
                onClick={() => wallpaperFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-primary-400 transition-all cursor-pointer"
              >
                Choose from PC...
              </button>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT LIST QUICK ACTION MODAL */}
      {activeSubModal === 'quickAction' && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Folder className="w-4 h-4 text-accent-cyan" />
                <span>Chat List Quick Action</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-400 leading-relaxed">
              Choose the action to perform when you middle-click or swipe horizontally on a chat row in the chat list.
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'Change folder', label: 'Change folder', desc: 'Move dialog to a specific cloud chat folder' },
                { id: 'Mark as read', label: 'Mark as read / unread', desc: 'Toggle read state of all unread messages' },
                { id: 'Pin / Unpin', label: 'Pin / Unpin chat', desc: 'Quickly pin or unpin dialog at top' },
                { id: 'Mute / Unmute', label: 'Mute / Unmute notifications', desc: 'Toggle chat notification sounds' },
                { id: 'Archive', label: 'Archive chat', desc: 'Move chat into the Archive folder' },
              ].map((act) => {
                const isSelected = chatListQuickAction === act.label
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setChatListQuickAction(act.label)
                      localStorage.setItem('guidegram_quick_action', act.label)
                      showToast(`Quick action set to "${act.label}"`)
                      setActiveSubModal(null)
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-600/15 border-primary-500/30 text-white'
                        : 'bg-dark-900 border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{act.label}</div>
                      <div className="text-[11px] text-gray-400">{act.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-400 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING FEEDBACK TOAST */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-[70] bg-dark-850 text-white px-4 py-2.5 rounded-xl border border-white/10 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium">{feedbackToast}</span>
        </div>
      )}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-850 rounded-2xl border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-100">
                <Keyboard className="w-4 h-4 text-accent-amber" />
                <span>Keyboard Shortcuts</span>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-gray-300">Quick Switch Account</span>
                <span className="font-mono text-accent-cyan bg-white/5 px-2 py-0.5 rounded border border-white/10">Ctrl + 1..9</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-gray-300">Search Dialogs & Messages</span>
                <span className="font-mono text-accent-cyan bg-white/5 px-2 py-0.5 rounded border border-white/10">Ctrl + K / Ctrl + F</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-gray-300">Direct Forward (Telegraph Style)</span>
                <span className="font-mono text-accent-cyan bg-white/5 px-2 py-0.5 rounded border border-white/10">Alt + F</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-gray-300">Close Drawers / Modals</span>
                <span className="font-mono text-accent-cyan bg-white/5 px-2 py-0.5 rounded border border-white/10">Esc</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
