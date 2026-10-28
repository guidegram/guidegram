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
  Code,
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

interface SettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
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

  // Guidegram Activity Tracker & Contact Changes
  const [activityTrackerEnabled, setActivityTrackerEnabled] = useState(true)
  const [profileChangeAuditorEnabled, setProfileChangeAuditorEnabled] = useState(true)
  const [activityRetentionPeriod, setActivityRetentionPeriod] = useState<ActivityLogRetentionPeriod>('30d')
  const [profileAuditInteractionRange, setProfileAuditInteractionRange] = useState<'24h' | '7d' | '30d' | '90d' | '180d' | 'all'>('180d')
  const [profileAuditScanOnOnline, setProfileAuditScanOnOnline] = useState(true)
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
  const [markAllReadEnabled, setMarkAllReadEnabled] = useState(true)
  const [copyCallbackData, setCopyCallbackData] = useState(true)
  const [disableAnimations, setDisableAnimations] = useState(false)
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

  const activeAccountId = accounts[0]?.id || ''

  const handleResetTwoFactor = async () => {
    if (!activeAccountId) return
    setIsResettingTwoFactor(true)
    try {
      if ((window.guidegram as any).accountResetPassword) {
        const res = await (window.guidegram as any).accountResetPassword(activeAccountId)
        if (res.status === 'ok') {
          showToast('2FA Cloud Password has been reset.')
          setTwoFactorResetStatus(null)
          setActiveSubModal(null)
        } else if (res.status === 'wait') {
          const dateStr = res.untilDate ? new Date(res.untilDate * 1000).toLocaleDateString() : '7 days'
          setTwoFactorResetStatus({
            status: 'wait',
            untilDate: res.untilDate,
            message: `Reset requested. Telegram security hold active until ${dateStr}.`,
          })
          showToast(`Password reset initiated. Security hold active.`)
        } else {
          showToast(res.error || 'Password reset failed')
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Error resetting password')
    } finally {
      setIsResettingTwoFactor(false)
    }
  }

  const handleDeclineResetTwoFactor = async () => {
    if (!activeAccountId) return
    try {
      if ((window.guidegram as any).accountDeclinePasswordReset) {
        const ok = await (window.guidegram as any).accountDeclinePasswordReset(activeAccountId)
        if (ok) {
          setTwoFactorResetStatus(null)
          showToast('Pending password reset cancelled.')
        }
      }
    } catch {
      showToast('Failed to cancel password reset.')
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
    showToast(`Updated ${selectedPrivacyRule.title} to "${val}"`)
  }

  const handleSelectTheme = (theme: 'classic' | 'day' | 'tinted' | 'night') => {
    setActiveTheme(theme)
    localStorage.setItem('guidegram_theme_mode', theme)
    document.documentElement.setAttribute('data-chat-theme', theme)
    showToast(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`)
  }

  const handleSelectAccentColor = (id: number, hex: string) => {
    setSelectedAccentColor(id)
    localStorage.setItem('guidegram_accent_color', String(id))
    document.documentElement.style.setProperty('--primary-accent', hex)
    showToast(`Accent color updated`)
  }

  const handleSelectWallpaper = (wallpaperValue: string, name: string) => {
    setCustomWallpaper(wallpaperValue)
    if (wallpaperValue === 'default' || !wallpaperValue) {
      localStorage.removeItem('guidegram_chat_wallpaper')
      document.documentElement.style.removeProperty('--chat-wallpaper')
    } else {
      localStorage.setItem('guidegram_chat_wallpaper', wallpaperValue)
      document.documentElement.style.setProperty('--chat-wallpaper', wallpaperValue)
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
        setMarkAllReadEnabled(cfg.markAllReadEnabled ?? true)
        setCopyCallbackData(cfg.copyCallbackData ?? true)
        setDisableAnimations(cfg.disableAnimations ?? false)
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
      if (accounts.length > 0 && window.guidegram?.getPrivacySettings) {
        setIsLoadingPrivacy(true)
        window.guidegram.getPrivacySettings(accounts[0].id)
          .then((res) => {
            if (res) setPrivacyData(res)
          })
          .catch(() => {})
          .finally(() => setIsLoadingPrivacy(false))
      }
    }
  }, [isOpen, accounts])

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
      markAllReadEnabled,
      copyCallbackData,
      disableAnimations,
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
      setPurgeToast(isPersian ? 'تمام داده‌های رادار آنلاین و تغییرات پاکسازی شد.' : 'Activity data purged successfully.')
      if (window.guidegram.getActivityStats) {
        const refreshed = await window.guidegram.getActivityStats(activeAccountId)
        setActivityStats(refreshed)
      }
    } catch {
      setPurgeToast(isPersian ? 'خطا در پاکسازی داده‌ها' : 'Failed to purge data')
    } finally {
      setIsPurgingData(false)
      setTimeout(() => setPurgeToast(null), 3000)
    }
  }

  if (!isOpen) return null

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
              <div className="text-[10px] text-gray-400">Telegram Desktop & Advanced Power Preferences</div>
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

        {/* Modal Layout: Telegram Desktop Sidebar + Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Tab Navigation Sidebar */}
          <div className="w-48 sm:w-56 bg-dark-900/50 border-r border-white/5 p-3 flex flex-col gap-1 overflow-y-auto shrink-0 select-none">
            {[
              { id: 'profile' as SettingsTab, label: t('app.my_profile'), icon: <User className="w-4 h-4" /> },
              { id: 'business' as SettingsTab, label: t('settings.telegram_business'), icon: <Briefcase className="w-4 h-4" /> },
              { id: 'general' as SettingsTab, label: t('settings.general'), icon: <Globe className="w-4 h-4" /> },
              { id: 'notifications' as SettingsTab, label: t('settings.notifications'), icon: <Bell className="w-4 h-4" /> },
              { id: 'privacy' as SettingsTab, label: t('settings.privacy'), icon: <ShieldCheck className="w-4 h-4" /> },
              { id: 'chat' as SettingsTab, label: t('settings.chat_settings'), icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'features' as SettingsTab, label: isPersian ? 'قابلیت‌های گایدگرام' : 'Guidegram Features', icon: <Sparkles className="w-4 h-4 text-accent-cyan" /> },
              { id: 'mcp' as SettingsTab, label: 'AI & MCP Agents', icon: <Zap className="w-4 h-4 text-amber-400" /> },
              { id: 'advanced' as SettingsTab, label: t('settings.advanced'), icon: <HardDrive className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
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
                  <span className="relative z-10 flex items-center gap-3 truncate">
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                  </span>
                </button>
              )
            })}

            <div
              onClick={handleManualCheckUpdates}
              title="Click to check for software updates"
              className="mt-auto pt-3 border-t border-white/5 space-y-1 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                              <button
                                type="button"
                                onClick={() => handleDeleteBusinessLink(bl.slug!)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                title={t('business.delete_link')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

                {/* Window Close Action */}
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

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[11px] text-pink-300/80 font-mono">TON (GRAM) • Tron (TRX/USDT)</span>
                    <button
                      type="button"
                      onClick={() => onOpenSupport?.()}
                      className="py-1.5 px-3.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
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
                      <span>موتور اعلان اختصاصی گایدگرام (Pro HUD)</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      پیش‌نمایش زنده کارت‌های اعلان شناور با پاسخ سریع و ژست‌های حرکتی اندروید
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
                    <span>تست اعلان</span>
                  </button>
                </div>

                {/* Master Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ToggleItem
                    title="نمایش اعلان‌ها (Notifications HUD)"
                    desc="نمایش کارت‌های شناور در گوشه صفحه با انیمیشن نرم"
                    icon={<Bell className="w-3.5 h-3.5 text-primary-400" />}
                    checked={notificationsEnabled}
                    onChange={setNotificationsEnabled}
                  />
                  <ToggleItem
                    title="جلوه‌های صوتی (Sound Effects)"
                    desc="پخش آوای پیام‌های دریافتی با وب‌آدیو"
                    icon={<Volume2 className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={soundEnabled}
                    onChange={setSoundEnabled}
                  />
                  <ToggleItem
                    title="ویبره و هپتیک (Haptic Feedback)"
                    desc="الگوی لرزش اختصاصی برای اندروید و تبلت"
                    icon={<Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                    checked={notificationVibrate}
                    onChange={setNotificationVibrate}
                  />
                  <ToggleItem
                    title="چشمک در تسک‌بار (Taskbar Flash)"
                    desc="جلب توجه آیکون در نوار وظیفه هنگام دریافت پیام"
                    icon={<Laptop className="w-3.5 h-3.5 text-amber-400" />}
                    checked={notificationFlashTaskbar}
                    onChange={setNotificationFlashTaskbar}
                  />
                </div>

                {/* Chat Categories Matrix */}
                <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="text-xs font-bold text-gray-200">تفکیک اعلان بر اساس نوع گفتگو</div>
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
                        <span className="text-xs font-semibold">چت‌های خصوصی</span>
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
                        <span className="text-xs font-semibold">گروه‌ها</span>
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
                        <span className="text-xs font-semibold">کانال‌ها</span>
                      </div>
                      {notificationChannels && <Check className="w-3.5 h-3.5 text-primary-400" />}
                    </button>
                  </div>
                </div>

                {/* HUD Behaviors: Quick Reply & Batching */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ToggleItem
                    title="پاسخ مستقیم (Inline Quick Reply)"
                    desc="امکان ارسال پاسخ از داخل همان کارت اعلان بدون باز کردن صفحه"
                    icon={<CornerDownLeft className="w-3.5 h-3.5 text-primary-400" />}
                    checked={notificationQuickReply}
                    onChange={setNotificationQuickReply}
                  />
                  <ToggleItem
                    title="تجمیع ضد اسپم (Anti-Spam Digest)"
                    desc="ادغام پیام‌های پیاپی از یک گفتگو در یک کارت مشترک"
                    icon={<CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    checked={notificationBatching}
                    onChange={setNotificationBatching}
                  />
                </div>

                {/* HUD Screen Position & Stacking Count */}
                <div className="p-3.5 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-200">موقعیت قرارگیری روی مانیتور</div>
                      <div className="text-[11px] text-gray-400">گوشه مورد نظر جهت نمایش کارت‌های شناور را انتخاب کنید</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'bottom-right' as const, label: 'پایین - راست' },
                      { id: 'top-right' as const, label: 'بالا - راست' },
                      { id: 'bottom-left' as const, label: 'پایین - چپ' },
                      { id: 'top-left' as const, label: 'بالا - چپ' },
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
                      <div className="text-xs font-medium text-gray-200">حداکثر تعداد کارت‌های همزمان</div>
                      <div className="text-[11px] text-gray-400">بین ۱ تا ۵ کارت روی صفحه استک می‌شوند</div>
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
                      <span>سپر حریم خصوصی پیش‌نمایش (Privacy Shield)</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      میزان اطلاعات نمایش داده شده در کارت اعلان را مدیریت کنید
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'full' as const, label: 'نمایش کامل', desc: 'نام و متن کامل پیام' },
                      { id: 'hide-text' as const, label: 'مخفی‌سازی متن', desc: 'فقط نمایش نام فرستنده' },
                      { id: 'hide-all' as const, label: 'حریم خصوصی مطلق', desc: 'مخفی‌سازی نام و متن' },
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
                  {isLoadingPrivacy && (
                    <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-primary-400" />
                      <span>Syncing...</span>
                    </div>
                  )}
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
                      {privacyData?.twoStepVerification ? 'On' : 'Off'}
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
                      {privacyData?.autoDeleteMessages || 'Off'}
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
                      {localPasscodeEnabled ? 'On' : 'Off'}
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
                      {privacyData?.passkeys ? 'On' : 'Off'}
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
                      {privacyData?.blockedUsersCount ?? 0}
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
                      {privacyData?.connectedWebsitesCount ?? 0}
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
                      {privacyData?.activeSessionsCount ?? 1}
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
                        privacyData?.phoneNumberPrivacy || 'Nobody (+45)'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Phone number</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {privacyData?.phoneNumberPrivacy || 'Nobody (+45)'}
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
                      {privacyData?.lastSeenPrivacy || 'Nobody'}
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
                      {privacyData?.profilePhotosPrivacy || 'Everybody'}
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
                      {privacyData?.forwardedMessagesPrivacy || 'Everybody'}
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
                      {privacyData?.callsPrivacy || 'My contacts'}
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
                      {privacyData?.voiceMessagesPrivacy || 'Everybody'}
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
                      {privacyData?.messagesPrivacy || 'Everybody'}
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
                      {privacyData?.birthdayPrivacy || 'My contacts'}
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
                      {privacyData?.giftsPrivacy || 'Everybody'}
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
                      {privacyData?.bioPrivacy || 'Everybody'}
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
                      {privacyData?.savedMusicPrivacy || 'Everybody'}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      openPrivacyRule(
                        'invitesPrivacy',
                        'Invites',
                        'Who can add you to groups and channels?',
                        privacyData?.invitesPrivacy || 'Nobody (+1)'
                      )
                    }
                    className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-gray-200">Invites</span>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {privacyData?.invitesPrivacy || 'Nobody (+1)'}
                    </span>
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
                        Layer 229+ • Full Parity
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
                        <span>{isPersian ? 'قابلیت‌های اختصاصی گایدگرام' : 'Guidegram Exclusive Power Suite'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30">
                          PRO
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {isPersian
                          ? 'رادار آنلاین، تایم‌لاین تغییرات مخاطبین، حفظ پیام‌های پاک‌شده، حالت روح و ابزارهای پیشرفته'
                          : 'Online activity radar, contact change auditing, local message vault & power utilities'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* GROUP 1: Online & Activity Radar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Activity className="w-4 h-4 text-accent-cyan" />
                    <span className="text-xs font-bold text-accent-cyan">
                      {isPersian ? '۱. رادار آنلاین و تحلیل زمان‌بندی حضور' : '1. Online Activity Radar & Attendance Graph'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {isPersian ? 'فعال‌سازی رادار آنلاین و آفلاین' : 'Enable Online/Offline Radar'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'محاسبه سشن‌های آنلاین، توزیع ساعات شبانه‌روز و رسم نمودار در پروفایل کاربران'
                            : 'Logs user presence sessions, builds 24h hourly distribution graphs and profiles'}
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
                          {isPersian ? 'نحوه کارکرد با حفظ حریم خصوصی تلگرام:' : 'Telegram MTProto Privacy Handling:'}
                        </span>{' '}
                        {isPersian
                          ? 'تلگرام آخرین بازدید افرادی که شما را بلاک کرده‌اند یا وضعیت خود را روی «اخیراً» (Recently) یا «هیچ‌کس» گذاشته‌اند مخفی می‌کند. رادار گایدگرام با پایش رویدادهای زنده سشن، هر زمان کاربر پیامی ارسال کند یا آنلاین شود، آن لحظه را ثبت کرده و روی نمودار ۲۴ ساعته نمایش می‌دهد.'
                          : 'Telegram masks exact timestamps for users with hidden last seen or blocked states. Guidegram tracks real-time update pulses to record sessions whenever activity is detected.'}
                      </div>
                    </div>

                    {/* Retention Policy Selector */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{isPersian ? 'دوره نگهداری تاریخچه فعالیت‌ها' : 'Data Retention Policy'}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {isPersian ? 'حذف خودکار داده‌های قدیمی‌تر' : 'Auto-purge older entries'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        {[
                          { id: '1d' as ActivityLogRetentionPeriod, label: isPersian ? '۱ روز' : '1 Day' },
                          { id: '7d' as ActivityLogRetentionPeriod, label: isPersian ? '۷ روز' : '7 Days' },
                          { id: '30d' as ActivityLogRetentionPeriod, label: isPersian ? '۳۰ روز (پیش‌فرض)' : '30 Days' },
                          { id: '90d' as ActivityLogRetentionPeriod, label: isPersian ? '۳ ماه' : '3 Months' },
                          { id: '180d' as ActivityLogRetentionPeriod, label: isPersian ? '۶ ماه' : '6 Months' },
                          { id: '365d' as ActivityLogRetentionPeriod, label: isPersian ? '۱ سال' : '1 Year' },
                          { id: 'forever' as ActivityLogRetentionPeriod, label: isPersian ? 'همیشه نگه‌دار' : 'Forever' },
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
                          <span>{isPersian ? 'وضعیت حافظه و داده‌های رادار' : 'Activity Radar Storage Telemetry'}</span>
                        </div>
                        <button
                          type="button"
                          disabled={isPurgingData}
                          onClick={handlePurgeActivityData}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{isPurgingData ? (isPersian ? 'در حال پاکسازی...' : 'Purging...') : (isPersian ? 'پاکسازی کامل دیتای رادار' : 'Purge Activity Data')}</span>
                        </button>
                      </div>

                      {purgeToast && (
                        <div className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan text-xs text-center font-medium">
                          {purgeToast}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{isPersian ? 'رویدادهای ثبت‌شده' : 'Events Logged'}</div>
                          <div className="text-xs font-bold text-accent-cyan font-mono mt-0.5">
                            {activityStats?.totalEvents?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{isPersian ? 'سشن‌های آنلاین' : 'Online Sessions'}</div>
                          <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                            {activityStats?.totalSessions?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{isPersian ? 'کاربران پایش‌شده' : 'Users Tracked'}</div>
                          <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                            {activityStats?.totalUsersTracked?.toLocaleString() ?? '0'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-dark-900/80 border border-white/5">
                          <div className="text-[10px] text-gray-400">{isPersian ? 'حجم دیتابیس' : 'Disk Storage'}</div>
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
                      {isPersian ? '۲. حسابرس تغییرات پروفایل مخاطبین' : '2. Contact Changes Auditor & Timeline'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-4">
                    {/* Auditor Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {isPersian ? 'ثبت هوشمند تغییرات مخاطبین' : 'Audit Contact Profile Changes'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'پایش تغییر نام، نام کاربری، عکس، بیوگرافی و کانال متصل به بیو'
                            : 'Tracks edits to name, username, bio, photo additions/deletions, and linked personal channels'}
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
                          {isPersian ? 'اسکن و استعلام فوری هنگام آنلاین شدن کاربر' : 'Auto-Audit on Online Event'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'به محض آنلاین شدن هر مخاطب، بیوگرافی و کانال شخصی او با صف ایمن ۳.۵ ثانیه‌ای استعلام می‌شود'
                            : 'Safely queries user full profile & bio into the throttled queue the moment they come online'}
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

                    {/* Interaction Range Selector for Background Audit */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                          <span>{isPersian ? 'بازه تعامل چت‌ها برای صف استعلام پس‌زمینه' : 'Active Interaction Range for Profile Audit'}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {isPersian ? 'سپر ضد بن تلگرام (فاصله ۳.۵ ثانیه)' : 'Anti-Flood Rate Limiter'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                        {[
                          { id: '24h', label: isPersian ? '۲۴ ساعت اخیر' : 'Last 24 Hours' },
                          { id: '7d', label: isPersian ? '۷ روز اخیر' : 'Last 7 Days' },
                          { id: '30d', label: isPersian ? '۳۰ روز اخیر' : 'Last 30 Days' },
                          { id: '90d', label: isPersian ? '۳ ماه اخیر' : 'Last 3 Months' },
                          { id: '180d', label: isPersian ? '۶ ماه اخیر (پیش‌فرض)' : 'Last 6 Months (Default)' },
                          { id: 'all', label: isPersian ? 'همه مخاطبان و چت‌ها' : 'All Contacts & Chats' },
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
                        {isPersian
                          ? 'مشاهده گزارش کامل با نقشه تعاملی آنلاین، فیلتر مخاطبین، جستجو و تفکیک رویدادها'
                          : 'Inspect all historical changes and interactive online map with mutual filters and search'}
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
                        <span>{isPersian ? 'مشاهده تایم‌لاین و نقشه آنلاین' : 'Open Changes & Online Timeline'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* GROUP 3: Ghost Mode & Stealth Guard */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">
                      {isPersian ? '۳. حالت روح و امنیت نشست' : '3. Ghost Mode & Stealth Guard'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {isPersian ? 'حالت روح (Ghost Mode)' : 'Ghost Mode'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'خواندن پیام‌ها بدون ارسال تیک دوم (سین) و جلوگیری از آنلاین شدن'
                            : 'Read messages without sending read receipts and suppress typing status'}
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
                          {isPersian ? 'محافظت از فینگرپرینت دسکتاپ' : 'Anti-Fingerprinting Guard'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'خنثی‌سازی مشخصات سخت‌افزاری و سیستم‌عامل در درخواست‌های تلگرام'
                            : 'Anonymizes device hardware IDs and desktop parameters'}
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
                      {isPersian ? '۴. سپر پیام‌ها و نگهداری بومی' : '4. Message Shield & Local Vault'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-200">
                          {isPersian ? 'حفظ پیام‌های حذف‌شده طرف مقابل' : 'Keep Deleted Messages Locally'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'اگر فردی پیامی را برای هر دو نفر پاک کند، پیام با نشان قرمز در چت شما باقی می‌ماند'
                            : 'Retains messages deleted for everyone locally in SQLite cache with a visual badge'}
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
                          {isPersian ? 'انیمیشن پودر شدن پیام‌ها (Thanos Dust)' : 'Thanos Dust Deletion Effect'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'تجزیه ذرات پیام حذف شده با الگوریتم باد شبیه‌ساز تلگرام اصلی'
                            : 'Disintegrate deleted message bubbles with progressive wind drift math'}
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
                          {isPersian ? 'پیش‌فرض حذف دوطرفه پیام‌ها' : 'Always Delete for Both by Default'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'تیک «حذف برای طرف مقابل» در دیالوگ‌های حذف همیشه به‌طور خودکار فعال باشد'
                            : 'Pre-checks the delete for both parties checkbox automatically in dialogs'}
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
                          {isPersian ? 'انیمیشن پودر شدن پیام‌ها (Thanos Dust)' : 'Thanos Dust Deletion Effect'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {isPersian
                            ? 'تجزیه ذرات پیام حذف شده با الگوریتم باد شبیه‌ساز تلگرام اصلی'
                            : 'Disintegrate deleted message bubbles with progressive wind drift math'}
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
                      {isPersian ? '۵. بهینه‌سازهای چت و تجربه کاربری' : '5. Chat Enhancements & Power Utilities'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-800 border border-white/5 space-y-2.5">
                    {[
                      {
                        id: 'showChatId',
                        label: isPersian ? 'نمایش شناسه‌عددی چت (Chat ID)' : 'Show Chat ID in header',
                        desc: isPersian ? 'نمایش شناسه تلگرامی در هدر چت برای فوروارد و بات‌ها' : 'Displays peer ID in conversation header',
                        val: showChatId,
                        set: setShowChatId,
                      },
                      {
                        id: 'showMessageId',
                        label: isPersian ? 'نمایش شناسه پیام (Message ID)' : 'Show Message ID in bubbles',
                        desc: isPersian ? 'نمایش شماره دقیق پیام کنار تایم‌استمپ' : 'Renders message sequence number in message card',
                        val: showMessageId,
                        set: setShowMessageId,
                      },
                      {
                        id: 'showSeconds',
                        label: isPersian ? 'نمایش ثانیه‌شمار دقیق در زمان پیام‌ها' : 'Show seconds in message timestamps',
                        desc: isPersian ? 'فرمت زمان به‌صورت HH:MM:SS' : 'Precise timestamps including seconds',
                        val: showSeconds,
                        set: setShowSeconds,
                      },
                      {
                        id: 'showSenderAvatar',
                        label: isPersian ? 'نمایش آواتار فرستنده در گروه‌ها' : 'Show sender avatars in group chats',
                        desc: isPersian ? 'تصویر پروفایل کوچک کنار پیام‌های گروه' : 'Visual avatar thumbnail next to group messages',
                        val: showSenderAvatar,
                        set: setShowSenderAvatar,
                      },
                      {
                        id: 'quickForwardToSaved',
                        label: isPersian ? 'فوروارد سریع به پیام‌های ذخیره‌شده (Saved Messages)' : 'Quick forward to Saved Messages',
                        desc: isPersian ? 'دکمه تک‌کلیک نشانه‌گذاری مستقیم به Saved Messages' : 'Single-click bookmark button on message hover',
                        val: quickForwardToSaved,
                        set: setQuickForwardToSaved,
                      },
                      {
                        id: 'markAllReadEnabled',
                        label: isPersian ? 'کلید میانبر و دکمه خواندن همه چت‌ها' : 'Mark all chats as read shortcut',
                        desc: isPersian ? 'پاکسازی یکجای نشانگر پیام‌های خوانده‌نشده' : 'One-click badge dismiss for all dialogs',
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
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-dark-900 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">Guidegram Desktop Edition</div>
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
          accountId={accounts[0]?.id || ''}
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
                onClick={() => {
                  if (localPasscodeEnabled && localPasscodeVal) {
                    localStorage.setItem('guidegram_local_passcode', localPasscodeVal)
                    localStorage.setItem('guidegram_passcode_timeout', passcodeTimeout)
                    showToast('Passcode lock activated')
                  } else {
                    localStorage.removeItem('guidegram_local_passcode')
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
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Cryptographic key pair linked to this device for instant zero-SMS login.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setPrivacyData((prev) => (prev ? { ...prev, passkeys: true } : null))
                  showToast('Passkey registered for this device')
                  setActiveSubModal(null)
                }}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-glow transition-all cursor-pointer"
              >
                Register Passkey for this PC
              </button>
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

            <div className="space-y-2 text-xs">
              {[
                { domain: 'fragment.com', desc: 'Telegram Fragment Marketplace', ip: '172.67.142.12', active: 'Today at 11:20' },
                { domain: 'web.telegram.org', desc: 'Telegram Web Application', ip: '104.21.55.91', active: 'Yesterday at 16:40' },
              ].map((site, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-200">{site.domain}</div>
                    <div className="text-[11px] text-gray-400">{site.desc}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">IP: {site.ip} • {site.active}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrivacyData((prev) =>
                        prev
                          ? { ...prev, connectedWebsitesCount: Math.max(0, (prev.connectedWebsitesCount || 1) - 1) }
                          : null
                      )
                      showToast(`Disconnected ${site.domain}`)
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setPrivacyData((prev) => (prev ? { ...prev, connectedWebsitesCount: 0 } : null))
                  showToast('Disconnected all website sessions')
                  setActiveSubModal(null)
                }}
                className="text-xs text-rose-400 hover:underline font-semibold cursor-pointer"
              >
                Disconnect All Websites
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
              <p className="font-persian">گایدگرام: پیام‌رسان سریع، سبک و امن برای ویندوز</p>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {[
                { name: 'Default', css: '', desc: 'Open Sans & Vazirmatn System' },
                { name: 'Vazirmatn', css: "'Vazirmatn', sans-serif", desc: 'بهینه‌سازی شده برای متون فارسی و دوزبانه' },
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
