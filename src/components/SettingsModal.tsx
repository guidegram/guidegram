import React, { useState, useEffect } from 'react'
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
  Users,
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
} from 'lucide-react'
import {
  AppConfig,
  AccountInfo,
  CloseAction,
  UpdateInfo,
  UpdateProgress,
  PortableLocatorInfo,
  AutoDownloadConfig,
  CacheStats,
  PrivacySecuritySettings,
  BusinessProfile,
  BusinessChatLink,
  BusinessWorkHours,
  BusinessLocation,
  BusinessIntro,
} from '../types/telegram'
import { playNotificationSound } from '../utils/soundEffects'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'
import { ActiveSessionsModal } from './ActiveSessionsModal'

interface SettingsModalProps {
  isOpen: boolean
  accounts: AccountInfo[]
  onClose: () => void
  onLogoutAccount: (accountId: string) => Promise<void>
  onConfigUpdated?: (config: AppConfig) => void
  onUpdateFound?: (info: UpdateInfo) => void
  onOpenSupport?: () => void
}

interface ToggleItemProps {
  title: string
  desc: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleItem: React.FC<ToggleItemProps> = ({ title, desc, icon, checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    className="p-3 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none"
  >
    <div className="flex items-start gap-2.5 min-w-0">
      <div
        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
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
      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
    </div>
  </div>
)

type SettingsTab = 'profile' | 'business' | 'general' | 'notifications' | 'privacy' | 'chat' | 'advanced'

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onLogoutAccount,
  onConfigUpdated,
  onUpdateFound,
  onOpenSupport,
}) => {
  const { t, language, setLanguage } = useI18n()
  const isPersian = language === 'fa'

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [portablePath, setPortablePath] = useState('')
  const [apiId, setApiId] = useState<number>(2040)
  const [apiHash, setApiHash] = useState<string>('')
  const [ghostMode, setGhostMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

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
  })

  // Window Close Action Preference
  const [closeAction, setCloseAction] = useState<CloseAction>('ask')

  // Notifications & Sound
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Downloads Directory & Ask where to save
  const [downloadsPath, setDownloadsPath] = useState('')
  const [alwaysAskDownloadPath, setAlwaysAskDownloadPath] = useState(false)

  // Chat Font Size & Bubble Customization
  const [chatFontSize, setChatFontSize] = useState(14)
  const [bubbleRadius, setBubbleRadius] = useState(16)
  const [bubblePadding, setBubblePadding] = useState(10)

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
  const [blockedSearchQuery, setBlockedSearchQuery] = useState('')
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const wallpaperFileInputRef = React.useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => setFeedbackToast(null), 2500)
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
        setSuppressLinkWarning(cfg.suppressLinkWarning ?? false)
        setAntiFingerprinting(cfg.antiFingerprinting ?? true)
        setCloseAction(cfg.closeAction || 'ask')
        setNotificationsEnabled(cfg.notificationsEnabled ?? true)
        setSoundEnabled(cfg.soundEnabled ?? true)
        setDownloadsPath(cfg.downloadsPath || '')
        setAlwaysAskDownloadPath(cfg.alwaysAskDownloadPath ?? false)
        setChatFontSize(cfg.chatFontSize || 14)
        setBubbleRadius(cfg.bubbleRadius ?? 16)
        setBubblePadding(cfg.bubblePadding ?? 10)
        if (cfg.autoDownload) {
          setAutoDownload(cfg.autoDownload)
        }
      })
      window.guidegram?.getPortableDataPath?.().then(setDownloadsPath)
      window.guidegram?.getPortableDataPath?.().then(setPortablePath)
      window.guidegram?.getPortableLocator?.().then((info) => {
        if (info) setPortableLocator(info)
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
      suppressLinkWarning,
      antiFingerprinting,
      autoDownload,
      notificationsEnabled,
      soundEnabled,
      downloadsPath,
      alwaysAskDownloadPath,
      chatFontSize,
      bubbleRadius,
      bubblePadding,
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[750px] border border-white/10 animate-in fade-in zoom-in-95 duration-150">
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
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="truncate">{t('app.my_profile')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span className="truncate">{t('settings.telegram_business')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="truncate">{t('settings.general')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="truncate">{t('settings.notifications')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="truncate">{t('settings.privacy')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="truncate">{t('settings.chat_settings')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'advanced'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span className="truncate">{t('settings.advanced')}</span>
            </button>

            <div className="mt-auto pt-3 border-t border-white/5">
              <div className="px-3 py-1 text-[10px] text-gray-500 font-mono">
                v{appVersion} • Desktop Enhanced
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

                <div className="grid grid-cols-1 gap-2.5">
                  <ToggleItem
                    title="Desktop Notifications"
                    desc="Show toast notifications when new messages arrive"
                    icon={<Bell className="w-3.5 h-3.5" />}
                    checked={notificationsEnabled}
                    onChange={setNotificationsEnabled}
                  />
                  <ToggleItem
                    title="Sound Effects"
                    desc="Play sound on incoming direct messages"
                    icon={<Volume2 className="w-3.5 h-3.5 text-accent-cyan" />}
                    checked={soundEnabled}
                    onChange={setSoundEnabled}
                  />
                </div>

                <div className="pt-2 flex items-center justify-between p-3.5 rounded-2xl bg-dark-800 border border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-gray-200">Notification Sound</div>
                    <div className="text-[11px] text-gray-400">High-fidelity Web Audio synthesized chime</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playNotificationSound()}
                    className="px-3.5 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-750 text-xs font-semibold text-primary-400 border border-primary-500/20 hover:border-primary-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play Chime</span>
                  </button>
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

            {/* TAB: ADVANCED & STORAGE (Official Telegram Desktop Parity - Screenshot 4) */}
            {activeTab === 'advanced' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                {/* Section: Data and storage */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Data and storage</div>

                  {/* Connection type */}
                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Connection type</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">Default (TCP used)</span>
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
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Automatic media download</div>

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
      </div>

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
