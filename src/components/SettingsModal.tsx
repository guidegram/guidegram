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
} from 'lucide-react'
import { AppConfig, AccountInfo, CloseAction, UpdateInfo, UpdateProgress, PortableLocatorInfo, AutoDownloadConfig, CacheStats, PrivacySecuritySettings } from '../types/telegram'
import { playNotificationSound } from '../utils/soundEffects'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'

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

type SettingsTab = 'profile' | 'general' | 'notifications' | 'privacy' | 'chat' | 'advanced'

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

  // Chat Font Size
  const [chatFontSize, setChatFontSize] = useState(14)

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

  // Log Viewer State
  const [showLogs, setShowLogs] = useState(false)
  const [logText, setLogText] = useState('')
  const [logPath, setLogPath] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

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
                      onClick={() => setCloseAction('ask')}
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
                      onClick={() => setCloseAction('minimize')}
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
                      onClick={() => setCloseAction('quit')}
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

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Two-Step Verification</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">
                      {privacyData?.twoStepVerification ? 'On' : 'On'}
                    </span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Auto-Delete Messages</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">Off</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Local passcode</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">On</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Passkeys</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">Off</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Blocked users</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] font-mono">
                      {privacyData?.blockedUsersCount ?? 208}
                    </span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Connected websites</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] font-mono">
                      {privacyData?.connectedWebsitesCount ?? 2}
                    </span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Active sessions</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9] font-mono">
                      {privacyData?.activeSessionsCount ?? 4}
                    </span>
                  </div>

                  <div className="px-3 text-[11px] text-gray-500 pt-0.5">
                    Manage your sessions on all your devices.
                  </div>
                </div>

                {/* Section: Privacy */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Privacy</div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Phone number</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Nobody (+45)</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Last seen & online</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Nobody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Profile photos</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Forwarded messages</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Calls</span>
                    <span className="text-xs font-medium text-[#50a2e9]">My contacts</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-200">Voice messages</span>
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-200">Messages</span>
                      <Sparkles className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Birthday</span>
                    <span className="text-xs font-medium text-[#50a2e9]">My contacts</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Gifts</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Bio</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Saved Music</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Everybody</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <span className="text-xs text-gray-200">Invites</span>
                    <span className="text-xs font-medium text-[#50a2e9]">Nobody (+1)</span>
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
                    onClick={() => setActiveTheme('classic')}
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
                    onClick={() => setActiveTheme('day')}
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
                    onClick={() => setActiveTheme('tinted')}
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
                    onClick={() => setActiveTheme('night')}
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
                    { id: 0, bg: 'bg-[#50a2e9]' },
                    { id: 1, bg: 'bg-[#29b6f6]' },
                    { id: 2, bg: 'bg-[#4caf50]' },
                    { id: 3, bg: 'bg-[#e91e63]' },
                    { id: 4, bg: 'bg-[#ff9800]' },
                    { id: 5, bg: 'bg-[#9c27b0]' },
                    { id: 6, bg: 'bg-[#f44336]' },
                    { id: 7, bg: 'bg-[#607d8b]' },
                    { id: 8, bg: 'bg-[#009688]' }, // Tinted teal
                    { id: 9, bg: 'bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400' }, // Rainbow
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAccentColor(item.id)}
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

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Paintbrush className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Your name color</span>
                    </div>
                    <div className="flex items-center -space-x-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-dark-900" />
                      <span className="w-3.5 h-3.5 rounded-full bg-teal-300 border border-dark-900" />
                    </div>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Moon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Auto-night mode</span>
                    </div>
                    <span className="text-xs font-medium text-[#50a2e9]">{autoNightMode}</span>
                  </div>

                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
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
                    <div className="w-20 h-20 rounded-2xl bg-dark-850 border border-white/10 flex flex-col items-center justify-center gap-1.5 p-2 text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                      <Paintbrush className="w-5 h-5 text-accent-cyan" />
                      <span className="text-[11px] font-medium">Night</span>
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-dark-850 border border-white/10 flex flex-col items-center justify-center gap-1.5 p-2 text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                      <Paintbrush className="w-5 h-5 text-accent-cyan" />
                      <span className="text-[11px] font-medium">Night</span>
                    </div>
                  </div>
                </div>

                {/* Section: Chat wallpaper */}
                <div className="space-y-2.5 pt-2 border-t border-white/5">
                  <div className="text-xs font-bold text-accent-cyan px-1 py-1">Chat wallpaper</div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0e1621] border border-white/10 shadow-inner shrink-0" />
                    <div className="space-y-1 text-xs">
                      <button type="button" className="text-[#50a2e9] hover:underline cursor-pointer block">Choose from gallery</button>
                      <button type="button" className="text-[#50a2e9] hover:underline cursor-pointer block">Choose from file</button>
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
                  <div className="p-2.5 px-3 rounded-xl hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-200">Change folder</span>
                    </div>
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

      {/* Keyboard Shortcuts Reference Modal */}
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
