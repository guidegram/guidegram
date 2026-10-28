/**
 * Guidegram Mobile & Web Bridge Polyfill
 * Ensures window.guidegram is always defined and functional even in Capacitor/Android or mobile web
 * without throwing TypeError: Cannot read properties of undefined.
 */

import type { AppConfig, ProxyConfig, AutoHarvestStatus, WarpStatus, AccountInfo } from '../types/telegram'

const LOCAL_STORAGE_KEY_CONFIG = 'guidegram_mobile_config'
const LOCAL_STORAGE_KEY_ACCOUNTS = 'guidegram_mobile_accounts'
const LOCAL_STORAGE_KEY_PROXIES = 'guidegram_mobile_harvested_proxies'

const defaultAppConfig: AppConfig = {
  apiId: 0,
  apiHash: '',
  theme: 'dark',
  closeAction: 'quit',
  rememberCloseAction: true,
  accounts: [],
  proxies: [],
  ghostMode: false,
  showChatId: true,
  showMessageId: true,
  showSeconds: true,
  showSenderAvatar: true,
  quickForwardToSaved: true,
  alwaysDeleteBoth: true,
  copyCallbackData: true,
  suppressLinkWarning: false,
  chatFontSize: 14,
  bubbleRadius: 16,
  bubblePadding: 10,
  markAllReadEnabled: true,
  notificationsEnabled: true,
  soundEnabled: true,
  notificationTone: 'classic',
  notificationPosition: 'bottom-right',
  notificationMaxStack: 3,
  notificationPrivateChats: true,
  notificationGroups: true,
  notificationChannels: false,
  notificationPrivacyMode: 'full',
  notificationQuickReply: true,
  notificationBatching: true,
  notificationVibrate: true,
  notificationFlashTaskbar: true,
}

const defaultHarvestStatus: AutoHarvestStatus = {
  enabled: true,
  scannedChannels: ['ProxyMTProto', 'proxymtprotoir', 'mineproxy', 'iMTProto'],
  healthyCount: 12,
  totalHarvested: 24,
  isScanning: false,
}

const defaultWarpStatus: WarpStatus = {
  enabled: false,
  connected: false,
}

const sampleProxies: ProxyConfig[] = [
  {
    id: 'mobile_sample_mtp',
    name: 'Auto-Harvest MTProto (Fast)',
    type: 'mtproto',
    host: 'proxy.digitalresistance.dog',
    port: 443,
    secret: 'ee112233445566778899aabbccddeeff7777772e676f6f676c652e636f6d',
    enabled: true,
    pingMs: 42,
  },
  {
    id: 'mobile_sample_socks',
    name: 'Local SOCKS5 (v2ray / Clash)',
    type: 'socks5',
    host: '127.0.0.1',
    port: 10808,
    enabled: true,
    pingMs: 25,
  },
]

export function initMobileBridge(): void {
  if (typeof window === 'undefined') return

  // If already in an Electron environment with window.guidegram injected, keep it!
  if (window.guidegram && typeof window.guidegram.getAccounts === 'function') {
    return
  }

  console.log('[MobileBridge] Initializing Guidegram Mobile Polyfill & Offline State Provider...')

  // In-memory event listeners for polyfill
  const listeners: Record<string, Array<(...args: any[]) => void>> = {}

  const baseBridge: Record<string, any> = {
    // Window controls (noop on mobile)
    minimizeWindow: async () => {},
    maximizeWindow: async () => false,
    closeWindow: async () => {},
    requestClose: async () => ({ action: 'quit' as const }),
    confirmClose: async () => {},
    isMaximized: async () => false,
    openAccountWindow: async () => ({ success: true }),
    showTitlebarMenu: async () => {},
    flashWindow: async () => true,
    focusWindow: async () => true,

    // Accounts
    getAccounts: async (): Promise<AccountInfo[]> => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_ACCOUNTS)
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    },
    prepareAccountExport: async () => ({
      sessionToken: 'mobile_token',
      pin: '000000',
      expiresAt: Date.now() + 90000,
      accountCount: 0,
      chunks: [],
      totalChunks: 0,
    }),
    cancelAccountExport: async () => true,
    decryptAccountExport: async () => [],

    // Config
    getConfig: async (): Promise<AppConfig> => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG)
        return stored ? { ...defaultAppConfig, ...JSON.parse(stored) } : defaultAppConfig
      } catch {
        return defaultAppConfig
      }
    },
    updateConfig: async (partial: Partial<AppConfig>): Promise<AppConfig> => {
      try {
        const existing = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG)
        const current = existing ? JSON.parse(existing) : defaultAppConfig
        const updated = { ...current, ...partial }
        localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(updated))
        return updated
      } catch {
        return defaultAppConfig
      }
    },

    // Version
    getAppVersion: async (): Promise<string> => '2.4.2',
    checkForUpdates: async () => null,
    installUpdate: async () => ({ success: false, error: 'Mobile updates managed via app store / APK' }),

    // Proxy & Harvest Engine
    getHarvestStatus: async (): Promise<AutoHarvestStatus> => defaultHarvestStatus,
    getWarpStatus: async (): Promise<WarpStatus> => defaultWarpStatus,
    toggleWarp: async (enabled?: boolean): Promise<WarpStatus> => {
      const next = { enabled: Boolean(enabled), connected: Boolean(enabled) }
      return next
    },
    getHarvestedProxies: async (): Promise<ProxyConfig[]> => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PROXIES)
        return stored ? JSON.parse(stored) : sampleProxies
      } catch {
        return sampleProxies
      }
    },
    harvestNow: async (): Promise<ProxyConfig[]> => {
      return sampleProxies
    },
    onHarvestedProxiesUpdated: (callback: (proxies: ProxyConfig[]) => void) => {
      return () => {}
    },
    benchmarkProxies: async (proxies?: ProxyConfig[]) => {
      return (proxies || sampleProxies).map((p) => ({ ...p, pingMs: Math.floor(Math.random() * 80) + 20 }))
    },
    getProxyHealthReport: async () => ({
      healthyCount: 2,
      totalCount: 2,
      avgPingMs: 33,
    }),
    parseProxyUrl: async (url: string) => null,
    toShareableProxyUrl: async (proxy: ProxyConfig) => `tg://proxy?server=${proxy.host}&port=${proxy.port}`,

    // Events
    on: (channel: string, callback: (...args: any[]) => void) => {
      if (!listeners[channel]) listeners[channel] = []
      listeners[channel].push(callback)
      return () => {
        listeners[channel] = (listeners[channel] || []).filter((cb) => cb !== callback)
      }
    },

    // Dialogs & Telegram Fallbacks
    getCachedDialogs: async () => [],
    getDialogs: async () => [],
    getCloudFolders: async () => [],
    getMessages: async () => [],
    markAsRead: async () => {},
    markAllAsRead: async () => {},
    sendMessage: async () => null,
    editMessage: async () => null,
    deleteMessages: async () => {},
    resolvePeer: async () => null,

    // File Dialogs
    openFileDialog: async () => ({ canceled: true, filePaths: [] }),
    saveTempFile: async () => '',
    copyToClipboard: async (text: string) => {
      try {
        if (navigator.clipboard) await navigator.clipboard.writeText(text)
      } catch (_) {}
    },

    // Logging & Diagnostics
    logError: (msg: string, stack?: string) => {
      console.warn('[MobileLog]', msg, stack)
    },
    getLogs: async () => [],
    openLogsFolder: async () => {},
  }

  // Use a JavaScript Proxy to gracefully catch any missing API without throwing undefined errors!
  window.guidegram = new Proxy(baseBridge, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop]
      }
      // Return a safe async fallback for any unhandled method
      return async (..._args: any[]) => {
        console.debug(`[MobileBridge Proxy fallback] called: ${String(prop)}`)
        return null
      }
    },
  }) as any
}
