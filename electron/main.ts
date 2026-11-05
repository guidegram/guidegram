import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, protocol, net, dialog, session, clipboard, powerMonitor, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'url'
import { SessionStore } from './telegram/sessionStore'
import { AccountManager, decodeMtprotoWaveform, encodeMtprotoWaveform, normalizeWaveformSamples } from './telegram/accountManager'
import { ProxyManager } from './telegram/proxyManager'
import { Logger } from './telegram/logger'
import { UpdateManager } from './telegram/updateManager'
import type { WebPagePreview, McpServerConfig, ProxyConfig } from './telegram/types'
import { GuidegramMcpServer } from './mcp/mcpServer'
import { mcpEventBus } from './mcp/eventBus'
import { validateIpcPayload, BotAuthSchema, PhoneAuthSchema, CompletePhoneAuthSchema, AccountIdSchema } from './ipcValidation'
import { globalIpcRateLimiter } from './rateLimiter'
import { idempotencyManager } from './idempotency'
import { offlineQueue } from './offlineQueue'
import { SecurityGuardrails } from './securityGuardrails'
import { memoryMonitor } from './memoryMonitor'
import { SafeDownloader } from './safeDownloader'
import { crashRecoveryManager } from './crashRecovery'
import { StorageGuardrails } from './storageGuardrails'
import { DeepLinkHandler } from './deepLinkHandler'
import { WebrtcSecurityGuard } from './webrtcSecurityGuard'
import { ClipboardGuard } from './clipboardGuard'
import { DohResolver } from './telegram/dohResolver'
import { IntegrityGuard } from './integrityGuard'
import { SqliteTuner } from './telegram/sqliteTuner'
import { EphemeralMediaManager } from './ephemeralMediaManager'
import { SecretChatCrypto } from './telegram/secretChatCrypto'
import { passcodeGuard } from './passcodeGuard'
import { IpcSecurityFilter } from './ipcSecurityFilter'
import { privacyProtectionGuard } from './privacyProtectionGuard'
import { accountVaultManager } from './telegram/accountVaultManager'
import { MediaStreamValidator } from './mediaStreamValidator'
import { networkReconnectManager } from './telegram/reconnectManager'
import { sqliteDeadlockGuard } from './telegram/sqliteDeadlockGuard'
import { AccountExportService } from './telegram/accountExportService'
import { dragDropSanitizer } from './dragDropSanitizer'
import { memoryPressureManager } from './memoryPressureManager'
import { swrCache } from './swrCache'
import { IpcPayloadRedactor } from './ipcPayloadRedactor'
import { powerLifecycleManager } from './powerLifecycleManager'
import { MtprotoAuditInspector } from './telegram/mtprotoAuditInspector'

// Anti-Tampering: Sanitize hostile environment variables before runtime initialization (Layer 08)
IntegrityGuard.sanitizeEnvironment()

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'guidegram-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

// Enforce App Identity and Windows Taskbar grouping
app.name = 'Guidegram'
app.setName('Guidegram')
app.setAppUserModelId('com.guidegram.desktop')

// Hardware & GPU Acceleration optimization switches
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization')

// WebRTC Media & Calling IP Leak Prevention (MM-015 / Layer 08)
WebrtcSecurityGuard.applyCommandLineSwitches(app, false)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure 100% Portable User Data Directory BEFORE requesting single instance lock
// (Chromium requires userData path to be set first so singleton pipe & lock use the same path)
const isDev = !app.isPackaged
const dataDirOverride = process.env.GUIDEGRAM_DATA_DIR?.trim()
const portableDataDir = dataDirOverride
  ? path.resolve(dataDirOverride)
  : isDev
    ? path.resolve(__dirname, '../data')
    : path.join(path.dirname(app.getPath('exe')), 'data')

app.setPath('userData', portableDataDir)
passcodeGuard.init(portableDataDir)
StorageGuardrails.setApp(app)

// Enforce Single Instance Application Lock: prevent duplicate instances/windows
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
  process.exit(0)
}

// System-wide Portable Locator path: %APPDATA%\Guidegram\portable_locator.json
const systemAppDataDir = app.getPath('appData')
const locatorDir = path.join(systemAppDataDir, 'Guidegram')
const locatorFile = path.join(locatorDir, 'portable_locator.json')

function registerPortableLocator(currentExe: string, currentDataDir: string) {
  try {
    if (!fs.existsSync(locatorDir)) {
      fs.mkdirSync(locatorDir, { recursive: true })
    }
    const info = {
      executablePath: currentExe,
      dataPath: currentDataDir,
      version: app.getVersion() || '1.3.1',
      lastSeen: Date.now(),
    }
    fs.writeFileSync(locatorFile, JSON.stringify(info, null, 2), 'utf-8')
  } catch (_) {}
}

function readPortableLocator(): any {
  try {
    if (fs.existsSync(locatorFile)) {
      const content = fs.readFileSync(locatorFile, 'utf-8')
      return JSON.parse(content)
    }
  } catch (_) {}
  return null
}

registerPortableLocator(app.getPath('exe'), portableDataDir)

// Initialize File Logging System
Logger.initialize(portableDataDir)

function isPipeError(err: any): boolean {
  if (!err) return false
  const code = err.code || ''
  const msg = String(err.message || '')
  return code === 'EPIPE' || code === 'ERR_STREAM_DESTROYED' || msg.includes('EPIPE') || msg.includes('broken pipe')
}

process.stdout?.on('error', (err: any) => {
  if (isPipeError(err)) return
})
process.stderr?.on('error', (err: any) => {
  if (isPipeError(err)) return
})

let isHandlingUncaught = false
process.on('uncaughtException', (err: any) => {
  if (isPipeError(err) || isHandlingUncaught) return
  isHandlingUncaught = true
  try {
    Logger.error('[Process] Uncaught Exception in Main process:', err)
    crashRecoveryManager.recordCrash('main', err)
  } catch (_) {
    // Prevent unhandled crashes inside uncaught handler
  } finally {
    isHandlingUncaught = false
  }
})

process.on('unhandledRejection', (reason: any) => {
  if (isPipeError(reason)) return
  try {
    Logger.error('[Process] Unhandled Rejection in Main process:', reason)
  } catch (_) {}
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let sessionStore: SessionStore
let accountManager: AccountManager
let updateManager: UpdateManager
let accountExportService: AccountExportService
let mcpServer: GuidegramMcpServer | null = null
let isQuitting = false

// Focus primary window when user clicks pinned taskbar icon or second instance launches
app.on('second-instance', (_event, commandLine) => {
  Logger.info('[App] Second instance launch detected.')
  const isHeadless = Array.isArray(commandLine)
    ? commandLine.some((arg) => typeof arg === 'string' && arg.includes('--headless'))
    : typeof commandLine === 'string' && (commandLine as string).includes('--headless')

  if (isHeadless) {
    Logger.info('[App] Second instance launch was headless (--headless). Keeping window state intact.')
    return
  }

  Logger.info('[App] Focusing primary window for user interaction.')
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents?.focus()
    mainWindow.flashFrame(false)

    // DeepLinkHandler: Safely extract and dispatch deep link from second instance commandLine
    const rawDeepLink = DeepLinkHandler.extractDeepLinkFromArgv(commandLine)
    if (rawDeepLink) {
      const parsed = DeepLinkHandler.parseAndValidateDeepLink(rawDeepLink)
      if (parsed) {
        Logger.info(`[DeepLink] Dispatched deep link: ${parsed.scheme}://${parsed.action}`)
        DeepLinkHandler.dispatchDeepLink(mainWindow, parsed)
      } else {
        Logger.warn(`[DeepLink] Rejected invalid or malicious deep link: "${rawDeepLink}"`)
      }
    }
  } else {
    createWindow()
  }
})

// macOS open-url deep link handler
app.on('open-url', (event, url) => {
  event.preventDefault()
  const parsed = DeepLinkHandler.parseAndValidateDeepLink(url)
  if (parsed && mainWindow && !mainWindow.isDestroyed()) {
    Logger.info(`[DeepLink] Dispatched open-url: ${parsed.scheme}://${parsed.action}`)
    DeepLinkHandler.dispatchDeepLink(mainWindow, parsed)
  }
})

let cachedAppIcon: InstanceType<typeof nativeImage> | null = null
let cachedTrayIcon: InstanceType<typeof nativeImage> | null = null

function getResourcesPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'resources'),
    process.resourcesPath,
    path.join(app.getAppPath(), 'resources'),
    path.resolve(__dirname, '../resources'),
    path.resolve(__dirname, '../../resources'),
    path.resolve(process.cwd(), 'resources'),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, 'icon32.png')) || fs.existsSync(path.join(c, 'icon.ico'))) {
        return c
      }
    } catch (_) {}
  }
  return path.resolve(__dirname, '../resources')
}

function getAppIconPath(): string {
  const base = getResourcesPath()
  const iconIco = path.join(base, 'icon.ico')
  const iconPng = path.join(base, 'icon256.png')
  if (fs.existsSync(iconIco)) return iconIco
  if (fs.existsSync(iconPng)) return iconPng
  return ''
}

function getAppIcon(): InstanceType<typeof nativeImage> {
  if (cachedAppIcon && !cachedAppIcon.isEmpty()) return cachedAppIcon
  const iconPath = getAppIconPath()
  if (iconPath && fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      cachedAppIcon = img
      return img
    }
  }
  return nativeImage.createEmpty()
}

function getTrayIconPath(): string {
  const base = getResourcesPath()
  const icon32 = path.join(base, 'icon32.png')
  const icon16 = path.join(base, 'icon16.png')
  if (fs.existsSync(icon32)) return icon32
  if (fs.existsSync(icon16)) return icon16
  const iconPng = path.join(base, 'icon256.png')
  if (fs.existsSync(iconPng)) return iconPng
  return ''
}

function getTrayIcon(): InstanceType<typeof nativeImage> {
  if (cachedTrayIcon && !cachedTrayIcon.isEmpty()) return cachedTrayIcon
  const iconPath = getTrayIconPath()
  if (iconPath && fs.existsSync(iconPath)) {
    let img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      if (process.platform === 'win32') {
        img = img.resize({ width: 16, height: 16 })
      }
      cachedTrayIcon = img
      return img
    }
  }
  return nativeImage.createEmpty()
}

function createTray() {
  if (tray) return

  const trayIcon = getTrayIcon()
  tray = new Tray(trayIcon)
  tray.setToolTip('Guidegram')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Guidegram',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    {
      label: 'Check for Updates...',
      click: async () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
        const cfg = sessionStore.getConfig()
        const activeProxy = cfg.proxies.find((p) => p.enabled)
        try {
          const info = await updateManager.checkForUpdates(activeProxy)
          if (info && info.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app:update-available', info)
          }
        } catch (e) {
          Logger.warn('[Tray] Check updates error:', e)
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Guidegram',
      click: () => {
        isQuitting = true
        if (tray) {
          tray.destroy()
          tray = null
        }
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  const showMainWindow = () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
    mainWindow.setAlwaysOnTop(true)
    mainWindow.show()
    mainWindow.focus()
    mainWindow.setAlwaysOnTop(false)
  }

  tray.on('click', showMainWindow)
  tray.on('double-click', showMainWindow)
}

function createWindow() {
  Logger.info('[Window] Creating main application window...')

  // Configure Clickjacking, Frame-denial headers, and strict Permission Lockdown (MM-015 / Layer 08)
  SecurityGuardrails.configureSecurityHeaders()
  SecurityGuardrails.configurePermissionLockdown()

  const appIcon = getAppIcon()
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    center: true,
    show: false, // Prevents blank/black flash during startup
    backgroundColor: '#08090C',
    title: 'Guidegram',
    frame: false, // Frameless window with custom titlebar
    icon: appIcon,
    webPreferences: SecurityGuardrails.getHardenedWebPreferences({
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
    }) as any,
  })

  // Enforce secure window opening and prevent open-redirect hijacking (MM-015)
  SecurityGuardrails.attachSecureWindowHandlers(mainWindow, true)

  // Attach OS-level anti-screen capture & window sharing privacy guard (Layer 08)
  privacyProtectionGuard.attachWindow(mainWindow)

  // Attach Drag-and-Drop sanitization & drop navigation guard (Layer 08)
  dragDropSanitizer.attachToWebContents(mainWindow.webContents)

  // Window lifecycle events
  mainWindow.once('ready-to-show', () => {
    Logger.info('[Window] Window is ready to show. Displaying now.')
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents?.focus()
    }
  })

  let lastFocusProfileSync = 0
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents?.focus()
      const now = Date.now()
      if (now - lastFocusProfileSync > 120_000) {
        lastFocusProfileSync = now
        accountManager?.syncAllActiveAccountsProfile?.().catch(() => {})
      }
    }
  })

  mainWindow.on('minimize', () => {
    // Window minimized - preemptively trim VRAM and in-memory caches (Hardened for #2464, #30060)
    try {
      const sess: any = session.defaultSession
      if (typeof sess.clearImageCache === 'function') {
        sess.clearImageCache().catch(() => {})
      } else {
        sess.clearCache().catch(() => {})
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        IpcSecurityFilter.safeSend(mainWindow.webContents, 'system:memory-trim', { reason: 'window-minimized' })
      }
      memoryPressureManager.evaluatePressure().catch(() => {})
    } catch {}
  })

  mainWindow.on('hide', () => {
    // Window hidden - purge volatile texture caches
    try {
      const sess: any = session.defaultSession
      if (typeof sess.clearImageCache === 'function') {
        sess.clearImageCache().catch(() => {})
      } else {
        sess.clearCache().catch(() => {})
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        IpcSecurityFilter.safeSend(mainWindow.webContents, 'system:memory-trim', { reason: 'window-hidden' })
      }
    } catch {}
  })

  mainWindow.webContents.on('did-finish-load', () => {
    Logger.info('[Renderer] Main HTML content loaded successfully.')
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
    }

    // Check if an update was just applied
    try {
      const updateMarkerPath = path.join(portableDataDir, 'temp', 'update_completed.json')
      if (fs.existsSync(updateMarkerPath)) {
        const markerRaw = fs.readFileSync(updateMarkerPath, 'utf-8').replace(/^\uFEFF/, '').trim()
        const marker = JSON.parse(markerRaw)
        fs.unlinkSync(updateMarkerPath)
        Logger.info(`[Main] Detected fresh update to v${marker.version || app.getVersion()}. Notifying renderer...`)
        mainWindow?.webContents.send('app:update-installed', marker)
      }
    } catch (markerErr) {
      Logger.warn('[Main] Error reading update marker:', markerErr)
    }

    // Dispatch any deep link passed via process.argv at startup
    try {
      const rawDeepLink = DeepLinkHandler.extractDeepLinkFromArgv(process.argv)
      if (rawDeepLink) {
        const parsed = DeepLinkHandler.parseAndValidateDeepLink(rawDeepLink)
        if (parsed) {
          Logger.info(`[DeepLink] Dispatching startup deep link: ${parsed.scheme}://${parsed.action}`)
          DeepLinkHandler.dispatchDeepLink(mainWindow, parsed)
        }
      }
    } catch (deepLinkErr) {
      Logger.warn('[DeepLink] Error checking startup deep link:', deepLinkErr)
    }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    Logger.error(`[Renderer] Failed to load URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    Logger.error('[Renderer] Renderer process gone / crashed:', details)
    crashRecoveryManager.handleRendererCrash(mainWindow, details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    Logger.warn('[Renderer] Window became unresponsive.')
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = level === 3 ? 'ERROR' : level === 2 ? 'WARN' : 'INFO'
    const cleanSource = sourceId ? path.basename(sourceId) : 'app'
    if (level >= 2) {
      Logger.warn(`[Renderer:${levelName}] (${cleanSource}:${line}) ${message}`)
    } else {
      Logger.info(`[Renderer:${levelName}] ${message}`)
    }
  })

  // In development, load from Vite dev server; in production, load the built HTML
  if (process.env.VITE_DEV_SERVER_URL) {
    Logger.info(`[Window] Loading Vite Dev Server: ${process.env.VITE_DEV_SERVER_URL}`)
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const htmlPath = path.join(__dirname, '../dist/index.html')
    Logger.info(`[Window] Loading production bundle: ${htmlPath}`)
    mainWindow.loadFile(htmlPath)
  }

  mainWindow.on('close', (event) => {
    if (isQuitting) return

    const cfg = sessionStore ? sessionStore.getConfig() : null
    const action = cfg?.closeAction || 'ask'

    if (action === 'minimize') {
      event.preventDefault()
      mainWindow?.minimize()
      Logger.info('[Window] Close event intercepted: window minimized to taskbar.')
      return
    }

    if (action === 'ask') {
      event.preventDefault()
      mainWindow?.show()
      mainWindow?.focus()
      mainWindow?.webContents.send('app:request-close-confirm')
      Logger.info('[Window] Close event intercepted: prompting user for confirmation.')
      return
    }

    Logger.info('[Window] Close event proceeding: action is quit.')
  })

  mainWindow.on('closed', () => {
    Logger.info('[Window] Main window closed.')
    mainWindow = null
  })
}

const activeMiniApps = new Set<BrowserWindow>()
const accountWindows = new Map<string, BrowserWindow>()
let notificationWindow: BrowserWindow | null = null

function getOrCreateNotificationWindow(position: string = 'bottom-right'): BrowserWindow {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    repositionNotificationWindow(position)
    return notificationWindow
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const width = 400
  const height = 520

  let x = workArea.x + workArea.width - width - 16
  let y = workArea.y + workArea.height - height - 16

  if (position === 'top-right') {
    x = workArea.x + workArea.width - width - 16
    y = workArea.y + 16
  } else if (position === 'top-left') {
    x = workArea.x + 16
    y = workArea.y + 16
  } else if (position === 'bottom-left') {
    x = workArea.x + 16
    y = workArea.y + workArea.height - height - 16
  }

  notificationWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: false,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: SecurityGuardrails.getHardenedWebPreferences({
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
    }) as any,
  })

  notificationWindow.setAlwaysOnTop(true, 'screen-saver')
  notificationWindow.setVisibleOnAllWorkspaces(true)
  SecurityGuardrails.attachSecureWindowHandlers(notificationWindow, false)

  if (process.env.VITE_DEV_SERVER_URL) {
    notificationWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?window=notifications`)
  } else {
    const htmlPath = path.join(__dirname, '../dist/index.html')
    notificationWindow.loadFile(htmlPath, { query: { window: 'notifications' } })
  }

  notificationWindow.on('closed', () => {
    notificationWindow = null
  })

  return notificationWindow
}

function repositionNotificationWindow(position: string = 'bottom-right') {
  if (!notificationWindow || notificationWindow.isDestroyed()) return
  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const width = 400
  const height = 520

  let x = workArea.x + workArea.width - width - 16
  let y = workArea.y + workArea.height - height - 16

  if (position === 'top-right') {
    x = workArea.x + workArea.width - width - 16
    y = workArea.y + 16
  } else if (position === 'top-left') {
    x = workArea.x + 16
    y = workArea.y + 16
  } else if (position === 'bottom-left') {
    x = workArea.x + 16
    y = workArea.y + workArea.height - height - 16
  }

  notificationWindow.setBounds({ x, y, width, height })
}

function broadcastToAllWindows(event: string, payload: any) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send(event, payload)
      } catch (_) {}
    }
  }
}

function openAccountWindow(accountId: string) {
  Logger.info(`[Window] Opening dedicated window for account: ${accountId}`)
  const existing = accountWindows.get(accountId)
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.show()
    existing.focus()
    existing.webContents?.focus()
    return existing
  }

  const appIcon = getAppIcon()
  const accWin = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    center: true,
    show: false,
    backgroundColor: '#08090C',
    title: `Guidegram - Account ${accountId}`,
    frame: false,
    icon: appIcon,
    webPreferences: SecurityGuardrails.getHardenedWebPreferences({
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
    }) as any,
  })

  SecurityGuardrails.attachSecureWindowHandlers(accWin, true)
  privacyProtectionGuard.attachWindow(accWin)
  dragDropSanitizer.attachToWebContents(accWin.webContents)

  accountWindows.set(accountId, accWin)

  accWin.once('ready-to-show', () => {
    Logger.info(`[Window] Dedicated account window for ${accountId} ready to show.`)
    if (!accWin.isDestroyed()) {
      accWin.show()
      accWin.focus()
      accWin.webContents?.focus()
    }
  })

  accWin.on('closed', () => {
    Logger.info(`[Window] Dedicated window for account ${accountId} closed.`)
    accountWindows.delete(accountId)
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    accWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}?accountId=${encodeURIComponent(accountId)}`)
  } else {
    const htmlPath = path.join(__dirname, '../dist/index.html')
    accWin.loadFile(htmlPath, { query: { accountId } })
  }

  return accWin
}

function openMiniAppWindow(url: string, title = 'Telegram Mini App') {
  const win = new BrowserWindow({
    width: 480,
    height: 760,
    minWidth: 360,
    minHeight: 520,
    title,
    backgroundColor: '#0F1117',
    icon: getAppIcon(),
    webPreferences: SecurityGuardrails.getHardenedWebPreferences({
      sandbox: true,
    }) as any,
  })

  activeMiniApps.add(win)
  win.setMenu(null)

  // Enforce Clickjacking and open-redirect defense on Mini Apps (MM-015)
  SecurityGuardrails.attachSecureWindowHandlers(win, false)

  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      if (!window.Telegram) window.Telegram = {};
      if (!window.Telegram.WebApp) {
        window.Telegram.WebApp = {
          initData: "",
          initDataUnsafe: {},
          version: "8.0",
          platform: "tdesktop",
          colorScheme: "dark",
          themeParams: {
            bg_color: "#0F1117",
            text_color: "#FFFFFF",
            hint_color: "#7E8597",
            link_color: "#6366F1",
            button_color: "#6366F1",
            button_text_color: "#FFFFFF",
            secondary_bg_color: "#181B26"
          },
          isExpanded: true,
          viewportHeight: window.innerHeight,
          viewportStableHeight: window.innerHeight,
          headerColor: "#0F1117",
          backgroundColor: "#0F1117",
          BackButton: {
            isVisible: false,
            show: function() { this.isVisible = true; },
            hide: function() { this.isVisible = false; },
            onClick: function(cb) { window.addEventListener('popstate', cb); }
          },
          MainButton: {
            text: "CONTINUE",
            color: "#6366F1",
            textColor: "#FFFFFF",
            isVisible: false,
            isActive: true,
            isProgressVisible: false,
            setText: function(t) { this.text = t; },
            onClick: function(cb) {},
            show: function() { this.isVisible = true; },
            hide: function() { this.isVisible = false; },
            enable: function() { this.isActive = true; },
            disable: function() { this.isActive = false; }
          },
          HapticFeedback: {
            impactOccurred: function() {},
            notificationOccurred: function() {},
            selectionChanged: function() {}
          },
          ready: function() {},
          expand: function() {},
          close: function() { window.close(); },
          openLink: function(url) { window.open(url, '_blank'); },
          openTelegramLink: function(url) { window.open(url, '_blank'); },
          sendData: function(data) {}
        };
      }
    `).catch(() => {})
  })

  win.on('closed', () => {
    activeMiniApps.delete(win)
  })

  win.loadURL(url)
  return win
}

app.whenReady().then(async () => {
  Logger.info('[App] Electron app is ready. Initializing SessionStore & AccountManager...')

  // Register OS protocol clients (tg:// and guidegram://)
  DeepLinkHandler.registerProtocolClients()

  // Register local media streaming protocol for videos, voice, audio, photos, and documents
  protocol.handle('guidegram-media', async (request) => {
    try {
      const url = new URL(request.url)
      let decodedPath = ''
      if (url.searchParams.has('path')) {
        decodedPath = url.searchParams.get('path')!
      } else if (/^[a-zA-Z]$/.test(url.host)) {
        // e.g. guidegram-media://D/path/file.jpg -> D:/path/file.jpg
        decodedPath = `${url.host}:${decodeURIComponent(url.pathname)}`
      } else if (/^[a-zA-Z]:/.test(url.host)) {
        decodedPath = `${url.host}${decodeURIComponent(url.pathname)}`
      } else {
        // e.g. guidegram-media://local/D%3A%5C... or guidegram-media:///D:/...
        let raw = url.pathname.replace(/^\/+/, '')
        decodedPath = decodeURIComponent(raw)
      }

      // Normalize Windows drive letter
      if (process.platform === 'win32') {
        if (/^\/?[a-zA-Z]:/.test(decodedPath)) {
          decodedPath = decodedPath.replace(/^\/+/, '')
        } else if (/^[a-zA-Z]\//.test(decodedPath)) {
          // If Chromium stripped colon (e.g. D/Users/...)
          decodedPath = decodedPath.charAt(0) + ':/' + decodedPath.slice(2)
        }
      }

      decodedPath = path.normalize(decodedPath)

      // StorageGuardrails (Layer 08): Deny access to files outside authorized storage roots
      if (!StorageGuardrails.isPathWithinAuthorizedBounds(decodedPath)) {
        Logger.warn(`[Protocol] Access denied: "${decodedPath}" is outside authorized storage bounds.`)
        return new Response('Access Denied: Path outside authorized storage bounds', { status: 403 })
      }

      if (!fs.existsSync(decodedPath)) {
        Logger.warn(`[Protocol] File not found: "${decodedPath}" from request "${request.url}"`)
        return new Response('Media file not found', { status: 404 })
      }

      // Stream media safely via native net.fetch (with RFC 9110 MediaStreamValidator fallback)
      const rangeHeader = request.headers.get('Range') || request.headers.get('range')
      try {
        const fileUrl = pathToFileURL(decodedPath).toString()
        return await net.fetch(fileUrl, {
          headers: rangeHeader ? { Range: rangeHeader } : undefined,
        })
      } catch (_) {
        return await MediaStreamValidator.createMediaResponse(decodedPath, rangeHeader)
      }
    } catch (err) {
      Logger.error('[Protocol] Failed to serve guidegram-media request:', err)
      return new Response('Media error', { status: 500 })
    }
  })

  sessionStore = new SessionStore(portableDataDir)
  const guidegramRootDir = app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd()
  const guidegramDownloadsDir = path.join(guidegramRootDir, 'downloads')
  if (!fs.existsSync(guidegramDownloadsDir)) {
    try { fs.mkdirSync(guidegramDownloadsDir, { recursive: true }) } catch {}
  }

  StorageGuardrails.addAllowedRoot(sessionStore.getDataDirectory())
  StorageGuardrails.addAllowedRoot(path.join(sessionStore.getDataDirectory(), 'media_cache'))
  StorageGuardrails.addAllowedRoot(guidegramRootDir)
  StorageGuardrails.addAllowedRoot(guidegramDownloadsDir)

  // Auto-grant microphone permission for voice message recording
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media'
  })
  accountManager = new AccountManager(sessionStore, (event, payload) => {
    try {
      mcpEventBus.dispatch(event, payload)
    } catch (err) {
      Logger.warn('[MCP] Event bus dispatch warning:', err)
    }
    broadcastToAllWindows(event, payload)
  })

  ProxyManager.init(
    (proxies) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('proxy:harvested-updated', { proxies })
      }
    },
    () => accountManager.getActiveClient()
  )
  ProxyManager.startAutoHarvest()

  updateManager = new UpdateManager()
  accountExportService = new AccountExportService(sessionStore)

  try {
    setupIpcHandlers()
  } catch (err: any) {
    Logger.error('[Main] setupIpcHandlers failed:', err)
  }
  const isHeadless = process.argv.includes('--headless')
  createTray()
  if (!isHeadless) {
    createWindow()
  } else {
    Logger.info('[Main] Guidegram started in HEADLESS mode (MCP Agent Server)')
  }

  // Initialize and start Guidegram MCP Server for AI Agents
  try {
    mcpServer = new GuidegramMcpServer(accountManager, sessionStore, undefined, mcpEventBus)
    mcpServer.start().catch((err) => {
      Logger.warn('[Main] MCP Server startup warning:', err)
    })
  } catch (err) {
    Logger.error('[Main] Failed to initialize GuidegramMcpServer:', err)
  }

  // Start background hourly check for updates
  updateManager.startHourlyCheck(
    (updateInfo) => {
      Logger.info(`[Main] Update found: v${updateInfo.latestVersion}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:update-available', updateInfo)
      }
    },
    () => {
      // Pick first active proxy if available
      const cfg = sessionStore.getConfig()
      return cfg.proxies.find((p) => p.enabled)
    }
  )

  // Non-blocking initialization in the background
  accountManager.initialize().catch((err) => {
    Logger.warn('[Main] Background account init warning:', err)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  Logger.info('[App] All windows closed.')
  const mcpConfig = sessionStore?.getConfig()?.mcp
  const isHeadless = process.argv.includes('--headless')
  if (isHeadless || (mcpConfig?.enabled && !isQuitting)) {
    Logger.info('[App] Keeping background process active for MCP AI agents and system tray.')
    return
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  try {
    mcpServer?.stop()
  } catch {}
  Logger.info('[App] Application quitting. Flushing pending audit logs...')
  sessionStore?.flushAllAuditsSync()
  try {
    accountManager?.activityTrackerService.flushSync()
  } catch (_) {}
})

// =========================================================================
// Feature 22: Rich Web Link Preview Engine (Zero Extra Dependencies)
// =========================================================================

interface CachedPreview {
  data: WebPagePreview | null
  timestamp: number
}

const linkPreviewCache = new Map<string, CachedPreview>()
const MAX_PREVIEW_CACHE = 500
const PREVIEW_CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours

function isPrivateIpOrHost(hostname: string): boolean {
  if (!hostname) return true
  const lower = hostname.toLowerCase().trim()
  const unbracketed = lower.replace(/^\[|\]$/g, '')

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    unbracketed === '127.0.0.1' ||
    unbracketed === '::1' ||
    unbracketed === '0.0.0.0' ||
    unbracketed === '::'
  ) {
    return true
  }

  // Loopback 127.0.0.0/8 range
  if (/^127\./.test(unbracketed)) return true
  // IPv4-mapped IPv6 loopback / private
  if (/^::ffff:127\./i.test(unbracketed)) return true
  // Private IPv4 ranges (RFC 1918 & RFC 3927)
  if (/^10\./.test(unbracketed)) return true
  if (/^192\.168\./.test(unbracketed)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(unbracketed)) return true
  if (/^169\.254\./.test(unbracketed)) return true

  // IPv6 Link-local and Unique Local Addresses (ULA)
  if (unbracketed.startsWith('fe80:') || unbracketed.startsWith('fc00:') || unbracketed.startsWith('fd')) {
    return true
  }

  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.lan')) return true
  return false
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10))
      } catch {
        return ''
      }
    })
}

function extractMetaTag(headHtml: string, propertyOrName: string): string | undefined {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const p1 = new RegExp(`<meta\\s+[^>]*?(?:property|name)=["']${escaped}["'][^>]*?content=["']([^"']*)["']`, 'i')
  const m1 = headHtml.match(p1)
  if (m1 && m1[1]) return decodeHtml(m1[1].trim())

  const p2 = new RegExp(`<meta\\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${escaped}["']`, 'i')
  const m2 = headHtml.match(p2)
  if (m2 && m2[1]) return decodeHtml(m2[1].trim())

  return undefined
}

async function scrapeLinkPreview(targetUrl: string): Promise<WebPagePreview | null> {
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (isPrivateIpOrHost(parsed.hostname)) return null
  } catch {
    return null
  }

  // Check cache
  const cached = linkPreviewCache.get(targetUrl)
  if (cached && Date.now() - cached.timestamp < PREVIEW_CACHE_TTL) {
    return cached.data
  }

  const cleanDomain = parsed.hostname.replace(/^www\./i, '')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Guidegram/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    clearTimeout(timeoutId)

    // Defend against SSRF via HTTP 30x redirects to internal IPs
    if (res.url) {
      try {
        const redirected = new URL(res.url)
        if (isPrivateIpOrHost(redirected.hostname)) {
          linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
          return null
        }
      } catch {
        return null
      }
    }

    if (!res.ok) {
      linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
      return null
    }

    const contentType = res.headers.get('content-type') || ''

    // If direct image URL, return image preview
    if (contentType.startsWith('image/')) {
      const imgPreview: WebPagePreview = {
        url: targetUrl,
        siteName: cleanDomain,
        domain: cleanDomain,
        title: path.basename(parsed.pathname) || cleanDomain,
        image: targetUrl,
        photoUrl: targetUrl,
      }
      linkPreviewCache.set(targetUrl, { data: imgPreview, timestamp: Date.now() })
      return imgPreview
    }

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
      return null
    }

    // Read up to 300KB to capture <head>
    let htmlChunk = ''
    const reader = res.body?.getReader()
    if (reader) {
      let bytesRead = 0
      const decoder = new TextDecoder('utf-8')
      while (bytesRead < 300 * 1024) {
        const { done, value } = await reader.read()
        if (done || !value) break
        bytesRead += value.length
        htmlChunk += decoder.decode(value, { stream: true })
        if (htmlChunk.includes('</head>')) break
      }
      reader.cancel().catch(() => {})
    } else {
      htmlChunk = await res.text()
    }

    // Extract OpenGraph / Meta attributes
    const ogTitle =
      extractMetaTag(htmlChunk, 'og:title') ||
      extractMetaTag(htmlChunk, 'twitter:title') ||
      (() => {
        const titleMatch = htmlChunk.match(/<title[^>]*>([^<]+)<\/title>/i)
        return titleMatch ? decodeHtml(titleMatch[1].trim()) : undefined
      })()

    const ogDesc =
      extractMetaTag(htmlChunk, 'og:description') ||
      extractMetaTag(htmlChunk, 'twitter:description') ||
      extractMetaTag(htmlChunk, 'description')

    let ogImage =
      extractMetaTag(htmlChunk, 'og:image') ||
      extractMetaTag(htmlChunk, 'twitter:image') ||
      extractMetaTag(htmlChunk, 'image')

    // Resolve relative image URLs
    if (ogImage) {
      try {
        ogImage = new URL(ogImage, res.url || targetUrl).href
      } catch {
        ogImage = undefined
      }
    }

    const ogSiteName =
      extractMetaTag(htmlChunk, 'og:site_name') ||
      cleanDomain

    const faviconMatch = htmlChunk.match(/<link[^>]*?rel=["'](?:shortcut )?icon["'][^>]*?href=["']([^"']*)["']/i)
    let faviconUrl = faviconMatch ? faviconMatch[1] : undefined
    if (faviconUrl) {
      try {
        faviconUrl = new URL(faviconUrl, res.url || targetUrl).href
      } catch {
        faviconUrl = undefined
      }
    } else {
      faviconUrl = `${parsed.origin}/favicon.ico`
    }

    // If neither title nor description nor image found, don't generate empty card
    if (!ogTitle && !ogDesc && !ogImage) {
      linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
      return null
    }

    const preview: WebPagePreview = {
      url: targetUrl,
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      photoUrl: ogImage,
      siteName: ogSiteName,
      domain: cleanDomain,
      favicon: faviconUrl,
    }

    // Evict oldest if cache limit reached
    if (linkPreviewCache.size >= MAX_PREVIEW_CACHE) {
      const firstKey = linkPreviewCache.keys().next().value
      if (firstKey) linkPreviewCache.delete(firstKey)
    }

    linkPreviewCache.set(targetUrl, { data: preview, timestamp: Date.now() })
    return preview
  } catch (err) {
    Logger.warn(`[LinkPreview] Failed to scrape preview for ${targetUrl}:`, err)
    linkPreviewCache.set(targetUrl, { data: null, timestamp: Date.now() })
    return null
  }
}

function setupIpcHandlers() {
  // Window Controls
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    win?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (!win) return false
    if (win.isMaximized()) {
      win.unmaximize()
      return false
    } else {
      win.maximize()
      return true
    }
  })

  ipcMain.handle('window:request-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && win !== mainWindow) {
      win.close()
      return { action: 'quit' }
    }
    const cfg = sessionStore.getConfig()
    if (cfg.closeAction === 'minimize') {
      mainWindow?.minimize()
      return { action: 'minimize' }
    } else if (cfg.closeAction === 'quit') {
      isQuitting = true
      mainWindow?.close()
      return { action: 'quit' }
    }
    // Default or 'ask': renderer will show modal
    return { action: 'ask' }
  })

  ipcMain.handle('window:confirm-close', (event, { action, remember }: { action: 'minimize' | 'quit'; remember: boolean }) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && win !== mainWindow) {
      win.close()
      return
    }
    Logger.info(`[IPC] window:confirm-close action=${action} remember=${remember}`)
    if (remember) {
      sessionStore.updateConfig({
        closeAction: action,
        rememberCloseAction: true,
      })
    }
    if (action === 'minimize') {
      mainWindow?.minimize()
    } else {
      isQuitting = true
      mainWindow?.close()
    }
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && win !== mainWindow) {
      win.close()
      return
    }
    const cfg = sessionStore.getConfig()
    if (cfg.closeAction === 'minimize') {
      mainWindow?.minimize()
    } else if (cfg.closeAction === 'quit') {
      isQuitting = true
      mainWindow?.close()
    } else {
      mainWindow?.webContents.send('app:request-close-confirm')
    }
  })

  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    return win?.isMaximized() || false
  })

  ipcMain.handle('window:open-account-window', (_event, { accountId }: { accountId: string }) => {
    if (!accountId) return { success: false, error: 'Account ID required' }
    openAccountWindow(accountId)
    return { success: true }
  })

  ipcMain.handle('window:flash', (_event, flag: boolean = true) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(flag)
    }
    return true
  })

  ipcMain.handle('window:focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents?.focus()
      mainWindow.flashFrame(false)
    }
    return true
  })

  ipcMain.handle('window:show-titlebar-menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (!win || win.isDestroyed()) return

    const isMax = win.isMaximized()
    const menu = Menu.buildFromTemplate([
      {
        label: isMax ? 'Restore' : 'Maximize',
        click: () => {
          if (isMax) win.unmaximize()
          else win.maximize()
        },
      },
      {
        label: 'Minimize',
        click: () => {
          win.minimize()
        },
      },
      { type: 'separator' },
      {
        label: 'Close (Alt+F4)',
        click: () => {
          win.close()
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Guidegram Completely',
        click: () => {
          isQuitting = true
          if (tray) {
            tray.destroy()
            tray = null
          }
          app.quit()
        },
      },
    ])

    menu.popup({ window: win })
  })

  // Desktop Corner Notification System
  let lastSyncedNotifications: any[] = []

  ipcMain.handle(
    'notifications:sync',
    async (
      _event,
      payload: {
        notifications: any[]
        position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'
        privacyMode?: 'full' | 'hide-text' | 'hide-all'
        quickReplyEnabled?: boolean
      }
    ) => {
      const { notifications, position = 'bottom-right', privacyMode = 'full', quickReplyEnabled = true } = payload || {}
      lastSyncedNotifications = notifications || []

      if (lastSyncedNotifications.length === 0) {
        if (notificationWindow && !notificationWindow.isDestroyed() && notificationWindow.isVisible()) {
          notificationWindow.hide()
        }
        return true
      }

      const win = getOrCreateNotificationWindow(position)
      repositionNotificationWindow(position)

      const sendPayload = () => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('notifications:render', {
            notifications: lastSyncedNotifications,
            position,
            privacyMode,
            quickReplyEnabled,
          })
          if (!win.isVisible()) {
            win.showInactive()
          }
        }
      }

      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', sendPayload)
      } else {
        sendPayload()
      }

      return true
    }
  )

  ipcMain.handle(
    'notifications:dispatch-action',
    async (_event, { action, payload }: { action: string; payload: any }) => {
      switch (action) {
        case 'dismiss': {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('notification:action:dismiss', payload)
          }
          break
        }
        case 'select': {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            if (!mainWindow.isVisible()) mainWindow.show()
            mainWindow.show()
            mainWindow.focus()
            mainWindow.webContents.send('notification:action:select', payload)
          }
          break
        }
        case 'read': {
          const { accountId, chatId, messageId } = payload || {}
          if (accountId && chatId) {
            try {
              await accountManager.markAsRead(accountId, chatId, messageId ? Number(messageId) : undefined)
            } catch (err) {
              Logger.warn('[Notification] markAsRead action error:', err)
            }
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('notification:action:read', payload)
          }
          break
        }
        case 'reply': {
          const { accountId, chatId, text, replyToMsgId } = payload || {}
          if (accountId && chatId && text) {
            try {
              await accountManager.sendMessage(
                accountId,
                chatId,
                text,
                replyToMsgId ? Number(replyToMsgId) : undefined
              )
            } catch (err) {
              Logger.warn('[Notification] quick reply action error:', err)
            }
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('notification:action:reply', payload)
          }
          break
        }
        case 'mute': {
          const { accountId, chatId } = payload || {}
          if (accountId && chatId) {
            try {
              await accountManager.toggleChatNotifications(accountId, chatId, true)
            } catch (err) {
              Logger.warn('[Notification] mute chat action error:', err)
            }
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('notification:action:mute', payload)
          }
          break
        }
      }
      return true
    }
  )

  // Update System Handlers
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('system:check-for-updates', async () => {
    const cfg = sessionStore.getConfig()
    const activeProxy = cfg.proxies.find((p) => p.enabled)
    const info = await updateManager.checkForUpdates(activeProxy)
    if (info && info.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:update-available', info)
    }
    return info
  })

  ipcMain.handle('system:install-update', async (_event, { downloadUrl, version }: { downloadUrl: string; version?: string }) => {
    const appDir = isDev
      ? path.resolve(__dirname, '..')
      : path.dirname(app.getPath('exe'))
    return updateManager.performPortableUpdate(downloadUrl, appDir, portableDataDir, version, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:update-progress', progress)
      }
    })
  })

  ipcMain.handle('telegram:get-mtproto-status', async () => {
    return accountManager.getMtprotoStatus()
  })

  // Telegram Accounts
  ipcMain.handle('telegram:get-accounts', async () => {
    Logger.structured('INFO', 'ipc:telegram:get-accounts')
    return accountManager.getAccounts()
  })

  ipcMain.handle('telegram:refresh-account-profile', async (_event, rawPayload: any) => {
    const { accountId } = validateIpcPayload(AccountIdSchema, rawPayload, 'telegram:refresh-account-profile')
    Logger.info(`[IPC] telegram:refresh-account-profile for ${accountId}`)
    try {
      return await accountManager.syncAccountProfile(accountId, true)
    } catch (err: any) {
      Logger.warn(`[IPC] refresh-account-profile failed for ${accountId}:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:reconnect-account', async (_event, rawPayload: any) => {
    const { accountId } = validateIpcPayload(AccountIdSchema, rawPayload, 'telegram:reconnect-account')
    Logger.info(`[IPC] telegram:reconnect-account for ${accountId}`)
    try {
      return await accountManager.reconnectAccount(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] reconnectAccount failed for ${accountId}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:start-phone-auth', async (_event, rawPayload: any) => {
    globalIpcRateLimiter.checkOrThrow('start-phone-auth', 1, { capacity: 10, refillTokensPerSec: 1 })
    const { phone, proxy } = validateIpcPayload(PhoneAuthSchema, rawPayload, 'telegram:start-phone-auth')
    Logger.info(`[IPC] telegram:start-phone-auth for ${phone}`)
    try {
      return await accountManager.startPhoneAuth(phone, proxy)
    } catch (err: any) {
      Logger.error(`[IPC] startPhoneAuth failed for ${phone}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:complete-phone-auth', async (_event, rawPayload: any) => {
    const { phone, code, password } = validateIpcPayload(CompletePhoneAuthSchema, rawPayload, 'telegram:complete-phone-auth')
    Logger.info(`[IPC] telegram:complete-phone-auth for ${phone}`)
    try {
      return await accountManager.completePhoneAuth(phone, code, password)
    } catch (err: any) {
      Logger.error(`[IPC] completePhoneAuth failed for ${phone}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:login-bot', async (_event, rawPayload: any) => {
    globalIpcRateLimiter.checkOrThrow('login-bot', 1, { capacity: 15, refillTokensPerSec: 2 })
    const { token, proxy } = validateIpcPayload(BotAuthSchema, rawPayload, 'telegram:login-bot')
    Logger.info('[IPC] telegram:login-bot')
    try {
      return await accountManager.startBotAuth(token, proxy)
    } catch (err: any) {
      Logger.error('[IPC] startBotAuth failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:start-qr-auth', async (_event, { proxy }) => {
    Logger.info('[IPC] telegram:start-qr-auth')
    try {
      return await accountManager.startQrAuth(proxy)
    } catch (err: any) {
      if (err?.message?.includes('CANCEL') || err?.message?.includes('disconnect')) {
        Logger.info('[IPC] startQrAuth cancelled or disconnected, returning empty token payload.')
        return { url: '', qrDataUrl: '', expires: 0 }
      }
      Logger.error('[IPC] startQrAuth failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:cancel-qr-auth', async () => {
    Logger.info('[IPC] telegram:cancel-qr-auth')
    return accountManager.cancelQrAuth()
  })

  ipcMain.handle('telegram:submit-qr-password', async (_event, { password }) => {
    Logger.info('[IPC] telegram:submit-qr-password')
    try {
      return await accountManager.submitQrPassword(password)
    } catch (err: any) {
      Logger.error('[IPC] submitQrPassword failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:prepare-account-export', async (_event, { accountIds }: { accountIds?: string[] } = {}) => {
    Logger.info('[IPC] telegram:prepare-account-export')
    try {
      return accountExportService.prepareExport(accountIds)
    } catch (err: any) {
      Logger.error('[IPC] prepareExport failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:cancel-account-export', async () => {
    Logger.info('[IPC] telegram:cancel-account-export')
    accountExportService.cancelExport()
    return true
  })

  ipcMain.handle('telegram:decrypt-account-export', async (_event, { wirePacket, pin }: { wirePacket: string; pin: string }) => {
    Logger.info('[IPC] telegram:decrypt-account-export')
    try {
      return AccountExportService.decryptPayload(wirePacket, pin)
    } catch (err: any) {
      Logger.error('[IPC] decryptAccountExport failed:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:logout-account', async (_event, { accountId }) => {
    Logger.info(`[IPC] telegram:logout-account ${accountId}`)
    return accountManager.logoutAccount(accountId)
  })

  ipcMain.handle('telegram:get-cached-dialogs', async (_event, { accountId }) => {
    try {
      return accountManager.getCachedDialogs(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] getCachedDialogs failed for ${accountId}:`, err)
      return []
    }
  })

  ipcMain.handle(
    'telegram:get-dialogs',
    async (_event, args: any) => {
      const { accountId, limit, offsetDate, offsetId } = args || {}
      const offsetPeerId = args?.offsetPeerId
      try {
        if (offsetPeerId) {
          return await accountManager.getDialogs(accountId, limit, offsetDate, offsetId, offsetPeerId)
        }
        return await accountManager.getDialogs(accountId, limit, offsetDate, offsetId)
      } catch (err: any) {
        Logger.error(`[IPC] getDialogs failed for ${accountId}:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:get-contacts', async (_event, { accountId }) => {
    try {
      return await accountManager.getContacts(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getContacts failed for ${accountId}:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-messages', async (_event, { accountId, chatId, limit, offsetId, addOffset }) => {
    try {
      return await accountManager.getMessages(accountId, chatId, limit, offsetId, addOffset)
    } catch (err: any) {
      Logger.error(`[IPC] getMessages failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-message', async (_event, { accountId, chatId, text, replyToMsgId, options, idempotencyKey }) => {
    try {
      const key = idempotencyKey || idempotencyManager.generateKey('send-message', { accountId, chatId, text, replyToMsgId })
      return await idempotencyManager.execute(key, () =>
        accountManager.sendMessage(accountId, chatId, text, replyToMsgId, options)
      )
    } catch (err: any) {
      Logger.error(`[IPC] sendMessage failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:edit-message', async (_event, { accountId, chatId, messageId, text }) => {
    try {
      return await accountManager.editMessage(accountId, chatId, messageId, text)
    } catch (err: any) {
      Logger.error(`[IPC] editMessage failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:pin-message', async (_event, { accountId, chatId, messageId, notify, bothSides }) => {
    try {
      return await accountManager.pinMessage(accountId, chatId, messageId, notify, bothSides)
    } catch (err: any) {
      Logger.error(`[IPC] pinMessage failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:unpin-message', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.unpinMessage(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.error(`[IPC] unpinMessage failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-pinned-messages', async (_event, { accountId, chatId, limit, offsetId }) => {
    try {
      return await accountManager.getPinnedMessages(accountId, chatId, limit, offsetId)
    } catch (err: any) {
      Logger.error(`[IPC] getPinnedMessages failed:`, err)
      return { count: 0, messages: [] }
    }
  })

  ipcMain.handle('telegram:unpin-all-messages', async (_event, { accountId, chatId, topMsgId }) => {
    try {
      return await accountManager.unpinAllMessages(accountId, chatId, topMsgId)
    } catch (err: any) {
      Logger.error(`[IPC] unpinAllMessages failed:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-typing', async (_event, { accountId, chatId, status }) => {
    try {
      return await accountManager.sendTyping(accountId, chatId, status)
    } catch (err: any) {
      Logger.warn(`[IPC] sendTyping failed:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:export-chat-invite', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.exportChatInvite(accountId, chatId)
    } catch (err: any) {
      Logger.error(`[IPC] exportChatInvite failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:join-chat-invite', async (_event, { accountId, inviteLink }) => {
    try {
      return await accountManager.joinChatInvite(accountId, inviteLink)
    } catch (err: any) {
      Logger.error(`[IPC] joinChatInvite failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-chat-invite-links', async (_event, { accountId, chatId, query }) => {
    try {
      return await accountManager.getChatInviteLinks(accountId, chatId, query)
    } catch (err: any) {
      Logger.error(`[IPC] getChatInviteLinks failed:`, err)
      throw err
    }
  })

  ipcMain.handle(
    'telegram:create-chat-invite-link',
    async (_event, { accountId, chatId, input }) => {
      try {
        return await accountManager.createChatInviteLink(accountId, chatId, input)
      } catch (err: any) {
        Logger.error(`[IPC] createChatInviteLink failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'telegram:edit-chat-invite-link',
    async (_event, { accountId, chatId, link, input }) => {
      try {
        return await accountManager.editChatInviteLink(accountId, chatId, link, input)
      } catch (err: any) {
        Logger.error(`[IPC] editChatInviteLink failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:revoke-chat-invite-link', async (_event, { accountId, chatId, link }) => {
    try {
      return await accountManager.revokeChatInviteLink(accountId, chatId, link)
    } catch (err: any) {
      Logger.error(`[IPC] revokeChatInviteLink failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:delete-chat-invite-link', async (_event, { accountId, chatId, link }) => {
    try {
      return await accountManager.deleteChatInviteLink(accountId, chatId, link)
    } catch (err: any) {
      Logger.error(`[IPC] deleteChatInviteLink failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-chat-join-requests', async (_event, { accountId, chatId, link, query }) => {
    try {
      return await accountManager.getChatJoinRequests(accountId, chatId, link, query)
    } catch (err: any) {
      Logger.error(`[IPC] getChatJoinRequests failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:hide-chat-join-request', async (_event, { accountId, chatId, userId, action }) => {
    try {
      return await accountManager.hideChatJoinRequest(accountId, chatId, userId, action)
    } catch (err: any) {
      Logger.error(`[IPC] hideChatJoinRequest failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:hide-all-chat-join-requests', async (_event, { accountId, chatId, action, link }) => {
    try {
      return await accountManager.hideAllChatJoinRequests(accountId, chatId, action, link)
    } catch (err: any) {
      Logger.error(`[IPC] hideAllChatJoinRequests failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:block-user', async (_event, { accountId, userId, blocked }) => {
    try {
      return await accountManager.blockUser(accountId, userId, blocked)
    } catch (err: any) {
      Logger.error(`[IPC] blockUser failed:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-common-chats', async (_event, { accountId, userId, limit }) => {
    try {
      return await accountManager.getCommonChats(accountId, userId, limit)
    } catch (err: any) {
      Logger.error(`[IPC] getCommonChats failed:`, err)
      return []
    }
  })

  // ==========================================
  // Guidegram User Activity & Contact Changes Tracking IPC
  // ==========================================

  ipcMain.handle('telegram:get-user-activity', async (_event, { accountId, userId }) => {
    try {
      return accountManager.activityTrackerService.getUserActivityStats(accountId, userId)
    } catch (err: any) {
      Logger.error(`[IPC] getUserActivity failed:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-contact-changes', async (_event, { accountId, filter }) => {
    try {
      return accountManager.activityTrackerService.getContactChanges(accountId, filter)
    } catch (err: any) {
      Logger.error(`[IPC] getContactChanges failed:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-online-timeline', async (_event, { accountId }) => {
    try {
      return accountManager.activityTrackerService.getOnlineTimeline(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] getOnlineTimeline failed:`, err)
      return { sessions: [], users: [], timeRange: { start: 0, end: 0 } }
    }
  })

  ipcMain.handle('telegram:sync-contacts-audit', async (_event, { accountId }) => {
    try {
      return await accountManager.syncAndAuditContacts(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] syncContactsAudit failed for ${accountId}:`, err)
      return { totalContacts: 0, newEventsCount: 0 }
    }
  })

  ipcMain.handle('telegram:get-user-change-history', async (_event, { accountId, userId }) => {
    try {
      return accountManager.activityTrackerService.getUserChangeHistory(accountId, userId)
    } catch (err: any) {
      Logger.error(`[IPC] getUserChangeHistory failed:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:set-user-tracking', async (_event, { userId, enabled }) => {
    try {
      const cfg = sessionStore.getConfig()
      const current = cfg.ignoredUserTrackingIds || []
      let next: string[]
      if (enabled) {
        next = current.filter((id) => id !== userId)
      } else {
        next = Array.from(new Set([...current, userId]))
      }
      sessionStore.updateConfig({ ignoredUserTrackingIds: next })
      mainWindow?.webContents.send('telegram:user-tracking-changed', { userId, enabled })
      return true
    } catch (err: any) {
      Logger.error(`[IPC] setUserTracking failed:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-user-tracking', async (_event, { accountId, userId }) => {
    try {
      return accountManager.activityTrackerService.isUserTrackingEnabled(accountId, userId)
    } catch (err: any) {
      Logger.error(`[IPC] getUserTracking failed:`, err)
      return true
    }
  })

  ipcMain.handle('telegram:clear-activity-data', async (_event, { accountId, type }) => {
    try {
      accountManager.activityTrackerService.clearData(accountId, type || 'all')
      return true
    } catch (err: any) {
      Logger.error(`[IPC] clearActivityData failed:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-activity-stats', async (_event, { accountId }) => {
    try {
      return accountManager.activityTrackerService.getStorageStats(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] getActivityStats failed:`, err)
      return { totalEvents: 0, totalSessions: 0, totalUsersTracked: 0, dataSizeBytes: 0 }
    }
  })

  ipcMain.handle('telegram:prune-activity-data', async (_event, { accountId, retentionPeriod }) => {
    try {
      return accountManager.activityTrackerService.pruneOldRecords(accountId, retentionPeriod)
    } catch (err: any) {
      Logger.error(`[IPC] pruneActivityData failed:`, err)
      return { prunedStatusCount: 0, prunedChangesCount: 0 }
    }
  })

  ipcMain.handle('telegram:send-media', async (_event, { accountId, chatId, filePath, options }) => {
    try {
      return await accountManager.sendMedia(accountId, chatId, filePath, options)
    } catch (err: any) {
      Logger.error(`[IPC] sendMedia failed for ${accountId} in ${chatId}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-media-group', async (_event, { accountId, chatId, items, options }) => {
    try {
      return await accountManager.sendMediaGroup(accountId, chatId, items, options)
    } catch (err: any) {
      Logger.error(`[IPC] sendMediaGroup failed for ${accountId} in ${chatId}:`, err)
      throw err
    }
  })

  ipcMain.handle('dialog:open-file', async (_event, options?: { type?: 'media' | 'document' | 'audio'; allowMultiple?: boolean; title?: string; filters?: Array<{ name: string; extensions: string[] }>; properties?: Array<'openFile' | 'multiSelections'> }) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow
    if (!win) return { canceled: true, filePaths: [] }

    let filters = options?.filters
    let title = options?.title || 'Select File'

    if (!filters) {
      const type = options?.type || 'document'
      if (type === 'media') {
        title = options?.title || 'Select Photo or Video'
        filters = [
          { name: 'Photos & Videos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] },
          { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'All Files', extensions: ['*'] },
        ]
      } else if (type === 'audio') {
        title = options?.title || 'Select Audio File'
        filters = [
          { name: 'Audio Files', extensions: ['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac', 'wma'] },
          { name: 'All Files', extensions: ['*'] },
        ]
      } else {
        title = options?.title || 'Select Document or File'
        filters = [
          { name: 'All Files', extensions: ['*'] },
        ]
      }
    }

    const properties = options?.properties || (options?.allowMultiple !== false ? ['openFile', 'multiSelections'] : ['openFile'])

    const result = await dialog.showOpenDialog(win, {
      title,
      properties: properties as any,
      filters,
    })

    return {
      canceled: result.canceled,
      filePaths: result.filePaths || [],
    }
  })

  ipcMain.handle('system:save-temp-file', async (_event, { buffer, filename }: { buffer: ArrayBuffer | Uint8Array; filename: string }) => {
    const tempDir = app.getPath('temp')
    const sanitized = SafeDownloader.sanitizeFilename(filename, 'temp_media.bin')
    const safeTarget = SafeDownloader.resolveSafePath(tempDir, sanitized)
    const nonColliding = SafeDownloader.getNonCollidingPath(safeTarget)
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any)
    await fs.promises.writeFile(nonColliding, nodeBuf)
    return nonColliding
  })

  ipcMain.handle('temp:save-file', async (_event, params: { buffer: ArrayBuffer | Uint8Array; filename: string }) => {
    const tempDir = app.getPath('temp')
    const sanitized = SafeDownloader.sanitizeFilename(params.filename, 'temp_file.bin')
    const safeTarget = SafeDownloader.resolveSafePath(tempDir, sanitized)
    const nonColliding = SafeDownloader.getNonCollidingPath(safeTarget)
    const nodeBuf = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer as any)
    await fs.promises.writeFile(nonColliding, nodeBuf)
    return nonColliding
  })

  ipcMain.handle('system:show-in-folder', async (_event, { filePath }: { filePath: string }) => {
    if (!filePath || typeof filePath !== 'string') return false
    try {
      const normalized = path.normalize(filePath)
      if (!StorageGuardrails.isPathWithinAuthorizedBounds(normalized)) {
        Logger.warn(`[IPC] Access denied for system:show-in-folder: "${normalized}" outside authorized bounds.`)
        return false
      }
      shell.showItemInFolder(normalized)
      return true
    } catch (err) {
      Logger.warn('[IPC] showItemInFolder error:', err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:forward-messages',
    async (_event, { accountId, fromChatId, toChatId, toChatIds, messageIds, options }) => {
      try {
        const target = toChatIds || toChatId
        return await accountManager.forwardMessages(accountId, fromChatId, target, messageIds, options)
      } catch (err: any) {
        Logger.error(`[IPC] forwardMessages failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:mark-as-read', async (_event, { accountId, chatId, maxId }) => {
    return accountManager.markAsRead(accountId, chatId, maxId)
  })

  ipcMain.handle('telegram:mark-all-as-read', async (_event, { accountId }) => {
    try {
      return await accountManager.markAllAsRead(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] markAllAsRead failed:`, err)
      throw err
    }
  })

  ipcMain.handle(
    'telegram:delete-messages',
    async (_event, { accountId, chatId, messageIds, revoke }) => {
      try {
        return await accountManager.deleteMessages(accountId, chatId, messageIds, revoke)
      } catch (err: any) {
        Logger.error(`[IPC] deleteMessages failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:get-profile-photo', async (_event, { accountId, peerId, isBig, forceRefresh }: { accountId: string; peerId: string; isBig?: boolean; forceRefresh?: boolean }) => {
    try {
      return await accountManager.getProfilePhoto(accountId, peerId, isBig, forceRefresh)
    } catch (err: any) {
      Logger.warn(`[IPC] getProfilePhoto error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-user-profile-photos', async (_event, { accountId, peerId }: { accountId: string; peerId: string }) => {
    try {
      return await accountManager.getUserProfilePhotos(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getUserProfilePhotos error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:download-media', async (_event, { accountId, chatId, messageId, thumb }) => {
    try {
      return await accountManager.downloadMedia(accountId, chatId, messageId, thumb)
    } catch (err: any) {
      Logger.warn(`[IPC] downloadMedia error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:cancel-download-media', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.cancelDownloadMedia(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.warn(`[IPC] cancelDownloadMedia error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-bot-callback', async (_event, { accountId, chatId, messageId, data, row, col }) => {
    try {
      return await accountManager.sendBotCallbackQuery(accountId, chatId, messageId, data, row, col)
    } catch (err: any) {
      Logger.warn(`[IPC] sendBotCallbackQuery error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-custom-emoji', async (_event, { accountId, documentId }) => {
    try {
      return await accountManager.getCustomEmojiUrl(accountId, documentId)
    } catch (err: any) {
      Logger.warn(`[IPC] getCustomEmojiUrl error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-custom-emoji-data', async (_event, { accountId, documentId }) => {
    try {
      return await accountManager.getCustomEmojiData(accountId, documentId)
    } catch (err: any) {
      Logger.warn(`[IPC] getCustomEmojiData error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:save-media-to-file', async (_event, { accountId, chatId, messageId, defaultName, promptSaveAs }) => {
    try {
      return await accountManager.saveMediaToFile(mainWindow, accountId, chatId, messageId, defaultName, !!promptSaveAs)
    } catch (err: any) {
      Logger.warn(`[IPC] saveMediaToFile error:`, err)
      return { success: false, error: err?.message || 'Failed to save media' }
    }
  })

  ipcMain.handle('telegram:show-media-in-folder', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.showMediaInFolder(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.warn(`[IPC] showMediaInFolder error:`, err)
      return { success: false, error: err?.message || 'Failed to reveal media in folder' }
    }
  })

  ipcMain.handle('telegram:open-media-file', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.openMediaFile(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.warn(`[IPC] openMediaFile error:`, err)
      return { success: false, error: err?.message || 'Failed to open media file' }
    }
  })

  ipcMain.handle('telegram:get-chat-details', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.getChatDetails(accountId, chatId)
    } catch (err: any) {
      Logger.warn(`[IPC] getChatDetails error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-chat-members', async (_event, { accountId, chatId, options }) => {
    try {
      return await accountManager.getChatMembers(accountId, chatId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] getChatMembers error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:add-chat-members', async (_event, { accountId, chatId, userIds }) => {
    try {
      return await accountManager.addChatMembers(accountId, chatId, userIds)
    } catch (err: any) {
      Logger.warn(`[IPC] addChatMembers error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:kick-chat-member', async (_event, { accountId, chatId, userId }) => {
    try {
      return await accountManager.kickChatMember(accountId, chatId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] kickChatMember error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:ban-chat-member', async (_event, { accountId, chatId, userId, untilDate }) => {
    try {
      return await accountManager.banChatMember(accountId, chatId, userId, untilDate)
    } catch (err: any) {
      Logger.warn(`[IPC] banChatMember error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:unban-chat-member', async (_event, { accountId, chatId, userId }) => {
    try {
      return await accountManager.unbanChatMember(accountId, chatId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] unbanChatMember error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:restrict-chat-member', async (_event, { accountId, chatId, userId, restrictions }) => {
    try {
      return await accountManager.restrictChatMember(accountId, chatId, userId, restrictions)
    } catch (err: any) {
      Logger.warn(`[IPC] restrictChatMember error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:promote-chat-member', async (_event, { accountId, chatId, userId, rights, rank }) => {
    try {
      return await accountManager.promoteChatMember(accountId, chatId, userId, rights, rank)
    } catch (err: any) {
      Logger.warn(`[IPC] promoteChatMember error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:set-chat-member-rank', async (_event, { accountId, chatId, userId, rank }) => {
    try {
      return await accountManager.setChatMemberRank(accountId, chatId, userId, rank)
    } catch (err: any) {
      Logger.warn(`[IPC] setChatMemberRank error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:demote-chat-member', async (_event, { accountId, chatId, userId }) => {
    try {
      return await accountManager.demoteChatMember(accountId, chatId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] demoteChatMember error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:transfer-chat-ownership', async (_event, { accountId, chatId, userId, password }) => {
    try {
      return await accountManager.transferChatOwnership(accountId, chatId, userId, password)
    } catch (err: any) {
      Logger.warn(`[IPC] transferChatOwnership error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:update-chat-settings', async (_event, { accountId, chatId, settings }) => {
    try {
      return await accountManager.updateChatSettings(accountId, chatId, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] updateChatSettings error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:resolve-peer', async (_event, { accountId, target }) => {
    try {
      return await accountManager.resolvePeer(accountId, target)
    } catch (err: any) {
      Logger.warn(`[IPC] resolvePeer error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:toggle-chat-notifications', async (_event, { accountId, chatId, mute }) => {
    try {
      return await accountManager.toggleChatNotifications(accountId, chatId, mute)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleChatNotifications error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:toggle-dialog-pin', async (_event, { accountId, chatId, pinned }) => {
    try {
      return await accountManager.toggleDialogPin(accountId, chatId, pinned)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleDialogPin error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:mark-dialog-unread', async (_event, { accountId, chatId, unread }) => {
    try {
      return await accountManager.markDialogUnread(accountId, chatId, unread)
    } catch (err: any) {
      Logger.warn(`[IPC] markDialogUnread error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:delete-chat-history', async (_event, { accountId, chatId, revoke }) => {
    try {
      return await accountManager.deleteChatHistory(accountId, chatId, revoke)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteChatHistory error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:leave-chat', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.leaveChat(accountId, chatId)
    } catch (err: any) {
      Logger.warn(`[IPC] leaveChat error:`, err)
      return false
    }
  })

  ipcMain.handle('system:open-external', async (_event, { url }: { url: string }) => {
    if (!url || typeof url !== 'string') return
    let targetUrl = url.trim()
    if (!targetUrl) return

    // 1. Normalize protocol-relative URLs
    if (targetUrl.startsWith('//')) {
      targetUrl = `https:${targetUrl}`
    }

    // 2. Normalize scheme-less URLs (e.g. google.com, www.site.org, t.me/user)
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(targetUrl) && !targetUrl.startsWith('mailto:') && !targetUrl.startsWith('tel:')) {
      targetUrl = `https://${targetUrl}`
    }

    // 3. Security verification: Allow only web and safe standard protocols
    try {
      const parsed = new URL(targetUrl)
      const allowedProtocols = ['http:', 'https:', 'tg:', 'mailto:', 'tel:']
      if (!allowedProtocols.includes(parsed.protocol)) {
        Logger.warn(`[IPC] Blocked unsafe external URL protocol: ${parsed.protocol} for ${targetUrl}`)
        return
      }
    } catch {
      if (!targetUrl.startsWith('tg://')) {
        Logger.warn(`[IPC] Malformed external URL format: ${targetUrl}`)
        return
      }
    }

    try {
      await shell.openExternal(targetUrl)
    } catch (err: any) {
      Logger.warn(`[IPC] shell.openExternal failed for ${targetUrl}:`, err?.message || err)

      // Fallback 1: If tg:// protocol is unmapped on the OS, convert to t.me web URL
      if (targetUrl.startsWith('tg://')) {
        let webUrl = targetUrl
          .replace(/^tg:\/\/resolve\?(?:.*&)?domain=([a-zA-Z0-9_]+)(?:&post=([0-9]+))?.*$/, 'https://t.me/$1/$2')
          .replace(/^tg:\/\/join\?(?:.*&)?invite=([a-zA-Z0-9_-]+).*$/, 'https://t.me/+$1')
          .replace(/^tg:\/\/proxy\?/, 'https://t.me/proxy?')
          .replace(/^tg:\/\/socks\?/, 'https://t.me/socks?')
        if (webUrl.endsWith('/undefined')) webUrl = webUrl.replace('/undefined', '')
        if (webUrl !== targetUrl && webUrl.startsWith('https://')) {
          try {
            await shell.openExternal(webUrl)
            return
          } catch (_) {}
        }
      }

      // Fallback 2: Windows OS cmd start fallback
      if (process.platform === 'win32') {
        try {
          const { execFile } = await import('child_process')
          execFile('cmd.exe', ['/c', 'start', '', targetUrl], (cmdErr) => {
            if (cmdErr) Logger.error(`[IPC] Windows cmd.exe start fallback failed for ${targetUrl}:`, cmdErr)
          })
        } catch (fbErr) {
          Logger.error(`[IPC] Windows start fallback invocation error:`, fbErr)
        }
      }
    }
  })

  ipcMain.handle('web:get-link-preview', async (_event, { url, accountId }: { url: string; accountId?: string }) => {
    if (accountId) {
      try {
        const mtprotoPreview = await accountManager.getWebPagePreview(accountId, url)
        if (mtprotoPreview) return mtprotoPreview
      } catch (_) {}
    }
    return scrapeLinkPreview(url)
  })

  ipcMain.handle('telegram:get-webpage-preview', async (_event, { accountId, message, entities }: { accountId: string; message: string; entities?: any }) => {
    try {
      return await accountManager.getWebPagePreview(accountId, message, entities)
    } catch (err: any) {
      Logger.warn('[IPC] telegram:get-webpage-preview error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:get-webpage', async (_event, { accountId, url, hash }: { accountId: string; url: string; hash?: number }) => {
    try {
      return await accountManager.getWebPage(accountId, url, hash)
    } catch (err: any) {
      Logger.warn('[IPC] telegram:get-webpage error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:get-instant-view', async (_event, { accountId, url, hash }: { accountId: string; url: string; hash?: number }) => {
    try {
      return await accountManager.getInstantView(accountId, url, hash)
    } catch (err: any) {
      Logger.warn('[IPC] telegram:get-instant-view error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:get-discussion-message', async (_event, { accountId, peerId, msgId }: { accountId: string; peerId: string; msgId: number }) => {
    try {
      return await accountManager.getDiscussionMessage(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn('[IPC] telegram:get-discussion-message error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:set-discussion-group', async (_event, { accountId, broadcastId, groupId }: { accountId: string; broadcastId: string; groupId: string }) => {
    try {
      return await accountManager.setDiscussionGroup(accountId, broadcastId, groupId)
    } catch (err: any) {
      Logger.warn('[IPC] telegram:set-discussion-group error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:test-proxy-ping', async (_event, payload: any) => {
    const proxy = payload?.proxy || payload
    return ProxyManager.testProxyPing(proxy)
  })

  ipcMain.handle('telegram:set-account-proxy', async (_event, payload: any) => {
    try {
      const accountId = payload?.accountId || (typeof payload === 'string' ? payload : '')
      const proxy = payload?.proxy
      return await accountManager.setAccountProxy(accountId, proxy)
    } catch (err: any) {
      Logger.error('[IPC] telegram:set-account-proxy error:', err)
      throw err
    }
  })

  ipcMain.handle('proxy:parse-url', async (_event, { url }: { url: string }) => {
    return ProxyManager.parseProxyUrlOrText(url)
  })

  ipcMain.handle('proxy:to-shareable-url', async (_event, { proxy }: { proxy: ProxyConfig }) => {
    return ProxyManager.toShareableUrl(proxy)
  })

  ipcMain.handle('proxy:start-auto-harvest', async (_event, { intervalMs } = {}) => {
    ProxyManager.startAutoHarvest(intervalMs)
    return ProxyManager.getHarvestStatus()
  })

  ipcMain.handle('proxy:stop-auto-harvest', async () => {
    ProxyManager.stopAutoHarvest()
    return ProxyManager.getHarvestStatus()
  })

  ipcMain.handle('proxy:harvest-now', async (_event, { channels } = {}) => {
    return await ProxyManager.harvestNow(channels)
  })

  ipcMain.handle('proxy:get-harvested-proxies', async () => {
    return ProxyManager.getHarvestedProxies()
  })

  ipcMain.handle('proxy:get-distinct-proxy', async (_event, { accountId }: { accountId: string }) => {
    const config = sessionStore.getConfig()
    return ProxyManager.getDistinctProxyForAccount(accountId, config.accounts)
  })

  ipcMain.handle('proxy:distribute-to-accounts', async (_event, { accountIds }: { accountIds?: string[] } = {}) => {
    const config = sessionStore.getConfig()
    const targetIds = accountIds && accountIds.length > 0 ? accountIds : config.accounts.map((a) => a.id)
    const distributionMap = ProxyManager.distributeProxiesToAccounts(targetIds)
    const updatedAccounts = config.accounts.map((acc) => {
      if (distributionMap.has(acc.id)) {
        const assignedProxy = distributionMap.get(acc.id)
        return {
          ...acc,
          proxyConfig: assignedProxy,
        }
      }
      return acc
    })
    sessionStore.updateConfig({ accounts: updatedAccounts })
    for (const acc of updatedAccounts) {
      if (distributionMap.has(acc.id)) {
        accountManager.reconnectAccount(acc.id).catch((err) => {
          Logger.warn(`[ProxyManager] Reconnect after distribute failed for ${acc.id}:`, err)
        })
      }
    }
    return updatedAccounts
  })

  ipcMain.handle('proxy:get-harvest-status', async () => {
    return ProxyManager.getHarvestStatus()
  })

  ipcMain.handle('proxy:get-detailed-health', async () => {
    return ProxyManager.getDetailedHealth()
  })

  ipcMain.handle('proxy:toggle-warp', async (_event, { enabled } = {}) => {
    return await ProxyManager.toggleWarp(enabled)
  })

  ipcMain.handle('proxy:get-warp-status', async () => {
    return ProxyManager.getWarpStatus()
  })

  ipcMain.handle('proxy:benchmark-proxies', async (_event, { proxies } = {}) => {
    return await ProxyManager.benchmarkProxies(proxies)
  })

  ipcMain.handle('proxy:rotate-account-proxy', async (_event, { accountId }) => {
    const best = await ProxyManager.rotateProxyForAccount(accountId)
    if (best) {
      const config = sessionStore.getConfig()
      const updatedAccounts = config.accounts.map((acc) => {
        if (acc.id === accountId) {
          return { ...acc, proxyConfig: best }
        }
        return acc
      })
      sessionStore.updateConfig({ accounts: updatedAccounts })
      accountManager.reconnectAccount(accountId).catch((err) => {
        Logger.warn(`[ProxyManager] Reconnect after rotate failed for ${accountId}:`, err)
      })
    }
    return best
  })

  ipcMain.handle('telegram:get-config', async () => {
    return sessionStore.getConfig()
  })

  ipcMain.handle('telegram:update-config', async (_event, { partial }) => {
    return sessionStore.updateConfig(partial)
  })

  ipcMain.handle('system:get-portable-data-path', async () => {
    return sessionStore.getDataDirectory()
  })

  // Global Telegram Search & Historical Messages Handlers
  ipcMain.handle('telegram:search-public-peers', async (_event, { accountId, query }) => {
    try {
      return await accountManager.searchPublicPeers(accountId, query)
    } catch (err: any) {
      Logger.warn(`[IPC] searchPublicPeers error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:search-global', async (_event, { accountId, query, filterType, limit, minDate, maxDate, chatTypeScope }) => {
    try {
      return await accountManager.searchGlobal(accountId, query, filterType, limit, minDate, maxDate, chatTypeScope)
    } catch (err: any) {
      Logger.warn(`[IPC] searchGlobal error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:search-messages', async (_event, { accountId, chatId, query, options }) => {
    try {
      return await accountManager.searchMessages(accountId, chatId, query, options)
    } catch (err: any) {
      Logger.warn(`[IPC] searchMessages error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-historical-messages', async (_event, { accountId, chatId, limit, offsetDate, offsetId }) => {
    try {
      return await accountManager.getHistoricalMessages(accountId, chatId, limit, offsetDate, offsetId)
    } catch (err: any) {
      Logger.warn(`[IPC] getHistoricalMessages error:`, err)
      return []
    }
  })

  // Forum Topics, Scheduled Messages, Reactions & Star Gifts Handlers
  ipcMain.handle('telegram:get-forum-topics', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.getForumTopics(accountId, chatId)
    } catch (err: any) {
      Logger.warn(`[IPC] getForumTopics error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:set-chat-forum-enabled', async (_event, { accountId, chatId, enabled }) => {
    return await accountManager.setChatForumEnabled(accountId, chatId, !!enabled)
  })

  ipcMain.handle('telegram:create-forum-topic', async (_event, { accountId, chatId, title, iconColor, iconEmojiId }) => {
    return await accountManager.createForumTopic(accountId, chatId, title, { iconColor, iconEmojiId })
  })

  ipcMain.handle('telegram:edit-forum-topic', async (_event, { accountId, chatId, topicId, input }) => {
    return await accountManager.editForumTopic(accountId, chatId, Number(topicId), input)
  })

  ipcMain.handle('telegram:set-forum-topic-pinned', async (_event, { accountId, chatId, topicId, pinned }) => {
    return await accountManager.setForumTopicPinned(accountId, chatId, Number(topicId), !!pinned)
  })

  ipcMain.handle('telegram:delete-forum-topic', async (_event, { accountId, chatId, topicId }) => {
    return await accountManager.deleteForumTopic(accountId, chatId, Number(topicId))
  })

  ipcMain.handle('telegram:get-scheduled-messages', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.getScheduledMessages(accountId, chatId)
    } catch (err: any) {
      Logger.warn(`[IPC] getScheduledMessages error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:send-scheduled-message-now', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.sendScheduledMessageNow(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.warn(`[IPC] sendScheduledMessageNow error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:delete-scheduled-messages', async (_event, { accountId, chatId, messageIds }) => {
    try {
      return await accountManager.deleteScheduledMessages(accountId, chatId, messageIds)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteScheduledMessages error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-reaction', async (_event, { accountId, chatId, messageId, reactionEmoji, reaction, options, idempotencyKey }) => {
    try {
      const activeReaction = reaction !== undefined ? reaction : reactionEmoji
      const key = idempotencyKey || idempotencyManager.generateKey('send-reaction', { accountId, chatId, messageId, activeReaction })
      return await idempotencyManager.execute(key, () =>
        accountManager.sendReaction(accountId, chatId, messageId, activeReaction, options)
      )
    } catch (err: any) {
      Logger.warn(`[IPC] sendReaction error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-message-reactions-list', async (_event, { accountId, chatId, messageId, options }) => {
    try {
      return await accountManager.getMessageReactionsList(accountId, chatId, messageId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] getMessageReactionsList error:`, err)
      return { _: 'messages.messageReactionsList', count: 0, reactions: [], users: [] }
    }
  })

  ipcMain.handle('telegram:get-available-reactions', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getAvailableReactions(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getAvailableReactions error:`, err)
      return { _: 'messages.availableReactionsNotModified' }
    }
  })

  ipcMain.handle('telegram:send-vote', async (_event, { accountId, chatId, messageId, options }) => {
    try {
      return await accountManager.sendVote(accountId, chatId, messageId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] sendVote error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:create-poll', async (_event, { accountId, chatId, question, answers, options }) => {
    try {
      return await accountManager.createPoll(accountId, chatId, question, answers, options)
    } catch (err: any) {
      Logger.error(`[IPC] createPoll error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-location', async (_event, { accountId, chatId, params }) => {
    try {
      return await accountManager.sendLocation(accountId, chatId, params)
    } catch (err: any) {
      Logger.error(`[IPC] sendLocation error:`, err)
      return { success: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('telegram:edit-live-location', async (_event, { accountId, chatId, messageId, params }) => {
    try {
      return await accountManager.editLiveLocation(accountId, chatId, messageId, params)
    } catch (err: any) {
      Logger.warn(`[IPC] editLiveLocation error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:stop-live-location', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.stopLiveLocation(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.warn(`[IPC] stopLiveLocation error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-recent-locations', async (_event, { accountId, chatId, limit }) => {
    try {
      return await accountManager.getRecentLocations(accountId, chatId, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] getRecentLocations error:`, err)
      return { count: 0, locations: [] }
    }
  })

  // OfflineQueue and Dead-Letter Queue (DLQ) handlers (MM-019)
  offlineQueue.registerHandler('send-message', async (task) => {
    const { accountId, chatId, text, replyToMsgId, options } = task.payload
    return await accountManager.sendMessage(accountId, chatId, text, replyToMsgId, options)
  })

  offlineQueue.registerHandler('send-reaction', async (task) => {
    const { accountId, chatId, messageId, reactionEmoji } = task.payload
    return await accountManager.sendReaction(accountId, chatId, messageId, reactionEmoji)
  })

  ipcMain.handle('telegram:get-offline-stats', () => {
    return offlineQueue.getStats()
  })

  ipcMain.handle('telegram:get-dead-letters', () => {
    return offlineQueue.getDeadLetters()
  })

  ipcMain.handle('telegram:retry-dead-letter', (_event, { id }) => {
    return offlineQueue.retryDeadLetter(id)
  })

  ipcMain.handle('telegram:purge-dead-letters', () => {
    return offlineQueue.purgeDeadLetters()
  })

  // Memory Monitor & Memory Pressure Manager (MM-211)
  memoryMonitor.registerIpc()
  memoryPressureManager.registerHandler('elevated', 'swr_cache', () => {
    swrCache.clear()
  })
  memoryPressureManager.registerHandler('elevated', 'account_manager', () => {
    accountManager.purgeStaleCaches()
  })
  memoryPressureManager.registerHandler('critical', 'all_caches', () => {
    swrCache.clear()
    accountManager.purgeStaleCaches()
    session.defaultSession.clearCache().catch(() => {})
  })
  memoryPressureManager.start(30_000)

  // Power Lifecycle Manager (Layer 11 Network Resilience / OS Sleep & Wake Guard)
  powerLifecycleManager.updateDependencies({
    powerMonitor,
    accountManager,
    networkReconnectManager,
    dohResolver: DohResolver,
    sqliteTuner: SqliteTuner,
    getDatabase: () => (accountManager as any).database,
    getProxyConfig: () => sessionStore.getConfig()?.proxies?.find((p) => p.enabled),
    testProxyPing: (proxy: any) => ProxyManager.testProxyPing(proxy),
    broadcastWebContents: (channel: string, payload: any) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        IpcSecurityFilter.safeSend(mainWindow.webContents, channel, payload)
      }
    },
  })
  powerLifecycleManager.init()

  // Crash Recovery IPC Handlers (MM-205)
  ipcMain.handle('system:get-crash-reports', () => {
    return crashRecoveryManager.getCrashReports()
  })

  ipcMain.handle('system:purge-crash-reports', () => {
    return crashRecoveryManager.purgeCrashReports()
  })

  ipcMain.handle('telegram:save-draft', async (_event, { accountId, chatId, message, replyToMsgId, entities }) => {
    try {
      return await accountManager.saveDraft(accountId, chatId, message, replyToMsgId, entities)
    } catch (err: any) {
      Logger.error(`[IPC] saveDraft error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:clear-draft', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.clearDraft(accountId, chatId)
    } catch (err: any) {
      Logger.error(`[IPC] clearDraft error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-all-drafts', async (_event, { accountId }) => {
    try {
      return await accountManager.getAllDrafts(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] getAllDrafts error:`, err)
      return {}
    }
  })

  ipcMain.handle('telegram:request-web-view', async (_event, { accountId, peerId, botId, url, startParam, fromBotMenu }) => {
    try {
      return await accountManager.requestWebView(accountId, peerId, botId, url, startParam, fromBotMenu)
    } catch (err: any) {
      Logger.error(`[IPC] requestWebView error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:open-mini-app', async (_event, { url, title }) => {
    try {
      openMiniAppWindow(url, title)
      return true
    } catch (err: any) {
      Logger.error(`[IPC] openMiniApp error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:decode-waveform', async (_event, { waveform }) => {
    try {
      return decodeMtprotoWaveform(waveform)
    } catch (err: any) {
      Logger.warn(`[IPC] decodeWaveform error:`, err)
      return undefined
    }
  })

  ipcMain.handle('telegram:encode-waveform', async (_event, { samples }) => {
    try {
      const normalized = normalizeWaveformSamples(samples)
      const buf = encodeMtprotoWaveform(normalized)
      return Array.from(buf)
    } catch (err: any) {
      Logger.warn(`[IPC] encodeWaveform error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:start-bot', async (_event, { accountId, botPeerId, startParam }) => {
    try {
      return await accountManager.startBot(accountId, botPeerId, startParam)
    } catch (err: any) {
      Logger.error(`[IPC] startBot error:`, err)
      return { success: false, error: err?.message || 'Failed to start bot' }
    }
  })

  ipcMain.handle('telegram:get-bot-info', async (_event, { accountId, botPeerId }) => {
    try {
      return await accountManager.getBotInfo(accountId, botPeerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getBotInfo error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-bot-menu-button', async (_event, { accountId, botPeerId }) => {
    try {
      return await accountManager.getBotMenuButton(accountId, botPeerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getBotMenuButton error:`, err)
      return { type: 'default' }
    }
  })

  ipcMain.handle('telegram:get-admin-log', async (_event, { accountId, channelId, q, limit, maxId }) => {
    try {
      return await accountManager.getAdminLog(accountId, channelId, q, limit, maxId)
    } catch (err: any) {
      Logger.warn(`[IPC] getAdminLog error:`, err)
      return { events: [], hasMore: false }
    }
  })

  ipcMain.handle('telegram:get-business-profile', async (_event, { accountId }) => {
    try {
      return await accountManager.getBusinessProfile(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getBusinessProfile error:`, err)
      return { links: [] }
    }
  })

  ipcMain.handle('telegram:update-business-intro', async (_event, { accountId, intro }) => {
    try {
      return await accountManager.updateBusinessIntro(accountId, intro)
    } catch (err: any) {
      Logger.warn(`[IPC] updateBusinessIntro error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-business-work-hours', async (_event, { accountId, workHours }) => {
    try {
      return await accountManager.updateBusinessWorkHours(accountId, workHours)
    } catch (err: any) {
      Logger.warn(`[IPC] updateBusinessWorkHours error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-business-location', async (_event, { accountId, location }) => {
    try {
      return await accountManager.updateBusinessLocation(accountId, location)
    } catch (err: any) {
      Logger.warn(`[IPC] updateBusinessLocation error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-business-greeting-message', async (_event, { accountId, greeting }) => {
    try {
      return await accountManager.updateBusinessGreetingMessage(accountId, greeting)
    } catch (err: any) {
      Logger.warn(`[IPC] updateBusinessGreetingMessage error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-business-away-message', async (_event, { accountId, away }) => {
    try {
      return await accountManager.updateBusinessAwayMessage(accountId, away)
    } catch (err: any) {
      Logger.warn(`[IPC] updateBusinessAwayMessage error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:create-business-chat-link', async (_event, { accountId, link }) => {
    try {
      return await accountManager.createBusinessChatLink(accountId, link)
    } catch (err: any) {
      Logger.warn(`[IPC] createBusinessChatLink error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:delete-business-chat-link', async (_event, { accountId, slug }) => {
    try {
      return await accountManager.deleteBusinessChatLink(accountId, slug)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteBusinessChatLink error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:edit-business-chat-link', async (_event, { accountId, slug, link }) => {
    try {
      return await accountManager.editBusinessChatLink(accountId, slug, link)
    } catch (err: any) {
      Logger.warn(`[IPC] editBusinessChatLink error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-star-gifts', async (_event, { accountId, userId }) => {
    try {
      return await accountManager.getSavedStarGifts(accountId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarGifts error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-star-gift-catalog', async (_event, { accountId }) => {
    try {
      return await accountManager.getStarGifts(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarGiftCatalog error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-star-gift-media', async (_event, { accountId, documentId, rawDoc }) => {
    try {
      return await accountManager.getStarGiftMedia(accountId, documentId, rawDoc)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarGiftMedia error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-star-gift-collection-traits', async (_event, { accountId, slug, title }) => {
    try {
      return await accountManager.getStarGiftCollectionTraits(accountId, slug, title)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarGiftCollectionTraits error:`, err)
      return { models: [], backdrops: [], symbols: [] }
    }
  })

  ipcMain.handle('telegram:convert-star-gift', async (_event, { accountId, stargiftMsgId }) => {
    try {
      return await accountManager.convertStarGift(accountId, stargiftMsgId)
    } catch (err: any) {
      Logger.warn(`[IPC] convertStarGift error:`, err)
      return { success: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('telegram:toggle-save-star-gift', async (_event, { accountId, stargiftMsgId, unsave }) => {
    try {
      return await accountManager.toggleSaveStarGift(accountId, stargiftMsgId, unsave)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleSaveStarGift error:`, err)
      return { success: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('telegram:get-stars-subscriptions', async (_event, { accountId, peerId, offset }) => {
    try {
      return await accountManager.getStarsSubscriptions(accountId, peerId, offset)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarsSubscriptions error:`, err)
      return { count: 0, subscriptions: [], chats: [], users: [] }
    }
  })

  ipcMain.handle('telegram:change-stars-subscription', async (_event, { accountId, peerId, subscriptionId, canceled }) => {
    try {
      return await accountManager.changeStarsSubscription(accountId, peerId, subscriptionId, canceled)
    } catch (err: any) {
      Logger.warn(`[IPC] changeStarsSubscription error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-giveaway-info', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.getGiveawayInfo(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn(`[IPC] getGiveawayInfo error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:check-can-send-gift', async (_event, { accountId, giftId }) => {
    try {
      return await accountManager.checkCanSendGift(accountId, giftId)
    } catch (err: any) {
      Logger.warn(`[IPC] checkCanSendGift error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-paid-reaction', async (_event, { accountId, chatId, messageId, count, isPrivate }) => {
    try {
      return await accountManager.sendPaidReaction(accountId, chatId, messageId, count, isPrivate)
    } catch (err: any) {
      Logger.warn(`[IPC] sendPaidReaction error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:toggle-paid-reaction-privacy', async (_event, { accountId, chatId, messageId, isPrivate }) => {
    try {
      return await accountManager.togglePaidReactionPrivacy(accountId, chatId, messageId, isPrivate)
    } catch (err: any) {
      Logger.warn(`[IPC] togglePaidReactionPrivacy error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-paid-media', async (_event, { accountId, chatId, starsAmount, media, caption, payload }) => {
    try {
      return await accountManager.sendPaidMedia(accountId, chatId, starsAmount, media, caption, payload)
    } catch (err: any) {
      Logger.warn(`[IPC] sendPaidMedia error:`, err)
      return { success: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('telegram:get-stars-status', async (_event, { accountId }) => {
    try {
      return await accountManager.getStarsStatus(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarsStatus error:`, err)
      return { balance: 0 }
    }
  })

  ipcMain.handle('telegram:get-stars-transactions', async (_event, { accountId, offset, limit }) => {
    try {
      return await accountManager.getStarsTransactions(accountId, offset, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] getStarsTransactions error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-saved-dialogs', async (_event, { accountId, limit }) => {
    try {
      return await accountManager.getSavedDialogs(accountId, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] getSavedDialogs error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-saved-reaction-tags', async (_event, { accountId }) => {
    try {
      return await accountManager.getSavedReactionTags(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getSavedReactionTags error:`, err)
      return []
    }
  })

  ipcMain.handle(
    'telegram:get-call-log',
    async (_event, { accountId, limit, offsetId, missedOnly }) => {
      try {
        return await accountManager.getCallLog(accountId, limit, offsetId, missedOnly)
      } catch (err: any) {
        Logger.warn(`[IPC] getCallLog error:`, err)
        return { items: [], total: 0 }
      }
    }
  )

  ipcMain.handle('telegram:get-chat-stats', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.getChatStats(accountId, chatId)
    } catch (err: any) {
      Logger.warn(`[IPC] getChatStats error:`, err)
      return {
        ok: false,
        error: 'unknown',
        message: 'Failed to load Telegram statistics.',
      }
    }
  })

  // Telegram Group Calls / Live Streams (MTProto phone.*)
  ipcMain.handle('telegram:get-group-call', async (_event, { accountId, chatId, callId, accessHash }) => {
    try {
      return await accountManager.getGroupCall(accountId, chatId, callId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] getGroupCall error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:create-group-call', async (_event, { accountId, chatId, title }) => {
    try {
      return await accountManager.createGroupCall(accountId, chatId, title)
    } catch (err: any) {
      Logger.warn(`[IPC] createGroupCall error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:join-group-call', async (_event, { accountId, callId, accessHash, muted }) => {
    try {
      return await accountManager.joinGroupCall(accountId, callId, accessHash, muted)
    } catch (err: any) {
      Logger.warn(`[IPC] joinGroupCall error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:leave-group-call', async (_event, { accountId, callId, accessHash }) => {
    try {
      return await accountManager.leaveGroupCall(accountId, callId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] leaveGroupCall error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:edit-group-call-participant', async (_event, { accountId, callId, accessHash, participantId, muted, raiseHand, volume }) => {
    try {
      return await accountManager.editGroupCallParticipant(accountId, callId, accessHash, participantId, muted, raiseHand, volume)
    } catch (err: any) {
      Logger.warn(`[IPC] editGroupCallParticipant error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-call-config', async (_event, { accountId }) => {
    try {
      return await accountManager.getCallConfig(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getCallConfig error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:request-call', async (_event, { accountId, userId, isVideo }) => {
    try {
      return await accountManager.requestCall(accountId, userId, isVideo)
    } catch (err: any) {
      Logger.warn(`[IPC] requestCall error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:accept-call', async (_event, { accountId, callId, accessHash, gBHex }) => {
    try {
      return await accountManager.acceptCall(accountId, callId, accessHash, gBHex)
    } catch (err: any) {
      Logger.warn(`[IPC] acceptCall error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:confirm-call', async (_event, { accountId, callId, accessHash, gAHex, keyFingerprint }) => {
    try {
      return await accountManager.confirmCall(accountId, callId, accessHash, gAHex, keyFingerprint)
    } catch (err: any) {
      Logger.warn(`[IPC] confirmCall error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:received-call', async (_event, { accountId, callId, accessHash }) => {
    try {
      return await accountManager.receivedCall(accountId, callId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] receivedCall error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:discard-call', async (_event, { accountId, callId, accessHash, duration, reason }) => {
    try {
      return await accountManager.discardCall(accountId, callId, accessHash, duration, reason)
    } catch (err: any) {
      Logger.warn(`[IPC] discardCall error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-call-signaling-data', async (_event, { accountId, callId, accessHash, dataHex }) => {
    try {
      return await accountManager.sendCallSignalingData(accountId, callId, accessHash, dataHex)
    } catch (err: any) {
      Logger.warn(`[IPC] sendCallSignalingData error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:invite-to-group-call', async (_event, { accountId, callId, accessHash, userIds }) => {
    try {
      return await accountManager.inviteToGroupCall(accountId, callId, accessHash, userIds)
    } catch (err: any) {
      Logger.warn(`[IPC] inviteToGroupCall error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:discard-group-call', async (_event, { accountId, callId, accessHash }) => {
    try {
      return await accountManager.discardGroupCall(accountId, callId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] discardGroupCall error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:export-group-call-invite', async (_event, { accountId, callId, accessHash, canSelfUnmute }) => {
    try {
      return await accountManager.exportGroupCallInvite(accountId, callId, accessHash, canSelfUnmute)
    } catch (err: any) {
      Logger.warn(`[IPC] exportGroupCallInvite error:`, err)
      return null
    }
  })

  // End-to-End Secret Chats (MTProto messages.*)
  ipcMain.handle('telegram:get-dh-config', async (_event, { accountId, version, randomLength }) => {
    try {
      return await accountManager.getDhConfig(accountId, version, randomLength)
    } catch (err: any) {
      Logger.warn(`[IPC] getDhConfig error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:request-encryption', async (_event, { accountId, userId, gAHex }) => {
    try {
      return await accountManager.requestEncryption(accountId, userId, gAHex)
    } catch (err: any) {
      Logger.warn(`[IPC] requestEncryption error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:accept-encryption', async (_event, { accountId, chatId, accessHash, gBHex, keyFingerprint }) => {
    try {
      return await accountManager.acceptEncryption(accountId, chatId, accessHash, gBHex, keyFingerprint)
    } catch (err: any) {
      Logger.warn(`[IPC] acceptEncryption error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:discard-encryption', async (_event, { accountId, chatId, deleteHistory }) => {
    try {
      return await accountManager.discardEncryption(accountId, chatId, deleteHistory)
    } catch (err: any) {
      Logger.warn(`[IPC] discardEncryption error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-encrypted-typing', async (_event, { accountId, chatId, accessHash, typing }) => {
    try {
      return await accountManager.setEncryptedTyping(accountId, chatId, accessHash, typing)
    } catch (err: any) {
      Logger.warn(`[IPC] setEncryptedTyping error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:generate-secret-chat-dh', async (_event, { primeHex, g } = {}) => {
    try {
      const prime = primeHex ? Buffer.from(primeHex, 'hex') : SecretChatCrypto.getStandardGroup14Prime()
      const generator = typeof g === 'number' ? g : 3
      const keyPair = SecretChatCrypto.generateDhKeyPair(prime, generator)
      return {
        privateKeyHex: keyPair.privateKey.toString('hex'),
        publicKeyHex: keyPair.publicKey.toString('hex'),
      }
    } catch (err: any) {
      Logger.warn(`[IPC] generate-secret-chat-dh error:`, err)
      throw err
    }
  })

  ipcMain.handle(
    'telegram:compute-secret-chat-auth',
    async (_event, { privateKeyHex, peerPublicKeyHex, primeHex, g }) => {
      try {
        const prime = primeHex ? Buffer.from(primeHex, 'hex') : SecretChatCrypto.getStandardGroup14Prime()
        const generator = typeof g === 'number' ? g : 3
        const privateKey = Buffer.from(privateKeyHex, 'hex')
        const peerPublicKey = Buffer.from(peerPublicKeyHex, 'hex')
        const sharedKey = SecretChatCrypto.computeSharedKey(privateKey, peerPublicKey, prime, generator)
        const details = SecretChatCrypto.deriveAuthKeyDetails(sharedKey)
        return {
          authKeyHex: details.authKey.toString('hex'),
          fingerprint: details.fingerprint.toString(),
          fingerprintHex: details.fingerprintHex,
          visualFingerprint: details.visualFingerprint,
        }
      } catch (err: any) {
        Logger.warn(`[IPC] compute-secret-chat-auth error:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:read-encrypted-history', async (_event, { accountId, chatId, accessHash, maxDate }) => {
    try {
      return await accountManager.readEncryptedHistory(accountId, chatId, accessHash, maxDate)
    } catch (err: any) {
      Logger.warn(`[IPC] readEncryptedHistory error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-encrypted', async (_event, { accountId, chatId, accessHash, dataHex, silent }) => {
    try {
      return await accountManager.sendEncrypted(accountId, chatId, accessHash, dataHex, silent)
    } catch (err: any) {
      Logger.warn(`[IPC] sendEncrypted error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-encrypted-service', async (_event, { accountId, chatId, accessHash, dataHex }) => {
    try {
      return await accountManager.sendEncryptedService(accountId, chatId, accessHash, dataHex)
    } catch (err: any) {
      Logger.warn(`[IPC] sendEncryptedService error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:send-encrypted-file', async (_event, { accountId, chatId, accessHash, dataHex, fileInput, silent }) => {
    try {
      return await accountManager.sendEncryptedFile(accountId, chatId, accessHash, dataHex, fileInput, silent)
    } catch (err: any) {
      Logger.warn(`[IPC] sendEncryptedFile error:`, err)
      throw err
    }
  })

  // Telegram Ad Platform & Sponsored Messages
  ipcMain.handle('telegram:get-sponsored-messages', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.getSponsoredMessages(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn(`[IPC] getSponsoredMessages error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:view-sponsored-message', async (_event, { accountId, randomIdHex }) => {
    try {
      return await accountManager.viewSponsoredMessage(accountId, randomIdHex)
    } catch (err: any) {
      Logger.warn(`[IPC] viewSponsoredMessage error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:click-sponsored-message', async (_event, { accountId, randomIdHex, media, fullscreen }) => {
    try {
      return await accountManager.clickSponsoredMessage(accountId, randomIdHex, media, fullscreen)
    } catch (err: any) {
      Logger.warn(`[IPC] clickSponsoredMessage error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:report-sponsored-message', async (_event, { accountId, randomIdHex, optionHex }) => {
    try {
      return await accountManager.reportSponsoredMessage(accountId, randomIdHex, optionHex)
    } catch (err: any) {
      Logger.warn(`[IPC] reportSponsoredMessage error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:toggle-sponsored-messages', async (_event, { accountId, enabled }) => {
    try {
      return await accountManager.toggleSponsoredMessages(accountId, enabled)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleSponsoredMessages error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:restrict-sponsored-messages', async (_event, { accountId, channelId, restricted }) => {
    try {
      return await accountManager.restrictSponsoredMessages(accountId, channelId, restricted)
    } catch (err: any) {
      Logger.warn(`[IPC] restrictSponsoredMessages error:`, err)
      return false
    }
  })

  // --- Fragment & Collectibles IPC ---
  ipcMain.handle('telegram:get-collectible-info', async (_event, { accountId, query, type }) => {
    try {
      return await accountManager.getCollectibleInfo(accountId, query, type)
    } catch (err: any) {
      Logger.warn(`[IPC] getCollectibleInfo error:`, err)
      return null
    }
  })

  // --- TON Center & Blockchain IPC ---
  ipcMain.handle('telegram:perform-ton-api-request', async (_event, { accountId, endpoint, isPost, query, payload }) => {
    try {
      return await accountManager.performTonApiRequest(accountId, endpoint, isPost, query, payload)
    } catch (err: any) {
      Logger.warn(`[IPC] performTonApiRequest error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-ton-streaming-url', async (_event, { accountId }) => {
    try {
      return await accountManager.getTonStreamingUrl(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getTonStreamingUrl error:`, err)
      return null
    }
  })

  // --- Onramp Payments IPC ---
  ipcMain.handle('telegram:get-onramp-providers', async (_event, { accountId, cryptoCurrency }) => {
    try {
      return await accountManager.getOnrampProviders(accountId, cryptoCurrency)
    } catch (err: any) {
      Logger.warn(`[IPC] getOnrampProviders error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-onramp-base-currencies', async (_event, { accountId, provider, cryptoCurrency }) => {
    try {
      return await accountManager.getOnrampBaseCurrencies(accountId, provider, cryptoCurrency)
    } catch (err: any) {
      Logger.warn(`[IPC] getOnrampBaseCurrencies error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-onramp-availability', async (_event, { accountId, provider, cryptoCurrency, baseCurrency }) => {
    try {
      return await accountManager.getOnrampAvailability(accountId, provider, cryptoCurrency, baseCurrency)
    } catch (err: any) {
      Logger.warn(`[IPC] getOnrampAvailability error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-onramp-limits', async (_event, { accountId, provider, cryptoCurrency, baseCurrency, paymentMethod }) => {
    try {
      return await accountManager.getOnrampLimits(accountId, provider, cryptoCurrency, baseCurrency, paymentMethod)
    } catch (err: any) {
      Logger.warn(`[IPC] getOnrampLimits error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-onramp-quote', async (_event, { accountId, provider, cryptoCurrency, baseCurrency, baseAmount, cryptoAmount, paymentMethod }) => {
    try {
      return await accountManager.getOnrampQuote(accountId, provider, cryptoCurrency, baseCurrency, baseAmount, cryptoAmount, paymentMethod)
    } catch (err: any) {
      Logger.warn(`[IPC] getOnrampQuote error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:create-onramp-session', async (_event, { accountId, provider, cryptoCurrency, address, options }) => {
    try {
      return await accountManager.createOnrampSession(accountId, provider, cryptoCurrency, address, options)
    } catch (err: any) {
      Logger.warn(`[IPC] createOnrampSession error:`, err)
      return null
    }
  })

  // --- Telegram Wallet & TonConnect IPC ---
  ipcMain.handle('telegram:get-wallet-state', async (_event, { accountId }) => {
    try {
      return await accountManager.getWalletState(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getWalletState error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-wallet-user-addresses', async (_event, { accountId, userIds, addresses, force }) => {
    try {
      return await accountManager.getWalletUserAddresses(accountId, userIds, addresses, force)
    } catch (err: any) {
      Logger.warn(`[IPC] getWalletUserAddresses error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-wallet-transactions', async (_event, { accountId, offset, limit, inbound, outbound }) => {
    try {
      return await accountManager.getWalletTransactions(accountId, offset, limit, inbound, outbound)
    } catch (err: any) {
      Logger.warn(`[IPC] getWalletTransactions error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-wallet-nfts', async (_event, { accountId, offset, limit }) => {
    try {
      return await accountManager.getWalletNfts(accountId, offset, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] getWalletNfts error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-ton-connect-sessions', async (_event, { accountId }) => {
    try {
      return await accountManager.getTonConnectSessions(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getTonConnectSessions error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:create-ton-connect-session', async (_event, { accountId, dappClientId, manifestUrl }) => {
    try {
      return await accountManager.createTonConnectSession(accountId, dappClientId, manifestUrl)
    } catch (err: any) {
      Logger.warn(`[IPC] createTonConnectSession error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:close-ton-connect-session', async (_event, { accountId, sessionId, bodyHex }) => {
    try {
      return await accountManager.closeTonConnectSession(accountId, sessionId, bodyHex)
    } catch (err: any) {
      Logger.warn(`[IPC] closeTonConnectSession error:`, err)
      return false
    }
  })

  // --- Telegram Passport & Identity IPC ---
  ipcMain.handle('telegram:get-passport-config', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getPassportConfig(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getPassportConfig error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-all-secure-values', async (_event, { accountId }) => {
    try {
      return await accountManager.getAllSecureValues(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getAllSecureValues error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-secure-value', async (_event, { accountId, types }) => {
    try {
      return await accountManager.getSecureValue(accountId, types)
    } catch (err: any) {
      Logger.warn(`[IPC] getSecureValue error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:save-secure-value', async (_event, { accountId, value, secureSecretId }) => {
    try {
      return await accountManager.saveSecureValue(accountId, value, secureSecretId)
    } catch (err: any) {
      Logger.warn(`[IPC] saveSecureValue error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:delete-secure-value', async (_event, { accountId, types }) => {
    try {
      return await accountManager.deleteSecureValue(accountId, types)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteSecureValue error:`, err)
      return false
    }
  })

  // --- Sticker Creation IPC ---
  ipcMain.handle('telegram:create-sticker-set', async (_event, { accountId, title, shortName, stickers, options }) => {
    try {
      return await accountManager.createStickerSet(accountId, title, shortName, stickers, options)
    } catch (err: any) {
      Logger.warn(`[IPC] createStickerSet error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:add-sticker-to-set', async (_event, { accountId, stickerset, sticker }) => {
    try {
      return await accountManager.addStickerToSet(accountId, stickerset, sticker)
    } catch (err: any) {
      Logger.warn(`[IPC] addStickerToSet error:`, err)
      return null
    }
  })

  // --- Universal MTProto Layer 229+ RPC Dispatcher (100% Protocol Parity) ---
  ipcMain.handle('telegram:invoke-mtproto-rpc', async (_event, { accountId, method, params }) => {
    try {
      return await accountManager.invokeMtprotoRpc(accountId, method, params)
    } catch (err: any) {
      Logger.warn(`[IPC] invokeMtprotoRpc error (${method}):`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-all-mtproto-methods', async () => {
    return accountManager.getAllMtprotoMethods()
  })

  // --- Contacts & Users Service IPC (Phase 1) ---
  ipcMain.handle('telegram:get-full-user', async (_event, { accountId, userId }) => {
    try {
      return await accountManager.getFullUser(accountId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] getFullUser error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:import-contacts', async (_event, { accountId, contacts }) => {
    try {
      return await accountManager.importContacts(accountId, contacts)
    } catch (err: any) {
      Logger.warn(`[IPC] importContacts error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:add-contact', async (_event, { accountId, userId, firstName, lastName, phone, addPhonePrivacyException, note }) => {
    try {
      return await accountManager.addContact(accountId, userId, firstName, lastName, phone, addPhonePrivacyException, note)
    } catch (err: any) {
      Logger.warn(`[IPC] addContact error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:block-peer', async (_event, { accountId, peerId, myStoriesFrom }) => {
    try {
      return await accountManager.blockPeer(accountId, peerId, myStoriesFrom)
    } catch (err: any) {
      Logger.warn(`[IPC] blockPeer error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:unblock-peer', async (_event, { accountId, peerId, myStoriesFrom }) => {
    try {
      return await accountManager.unblockPeer(accountId, peerId, myStoriesFrom)
    } catch (err: any) {
      Logger.warn(`[IPC] unblockPeer error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-blocked-peers', async (_event, { accountId, offset, limit, myStoriesFrom }) => {
    try {
      return await accountManager.getBlockedPeers(accountId, offset, limit, myStoriesFrom)
    } catch (err: any) {
      Logger.warn(`[IPC] getBlockedPeers error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-top-peers', async (_event, { accountId, options }) => {
    try {
      return await accountManager.getTopPeers(accountId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] getTopPeers error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-birthdays', async (_event, { accountId }) => {
    try {
      return await accountManager.getBirthdays(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getBirthdays error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:update-contact-note', async (_event, { accountId, userId, note }) => {
    try {
      return await accountManager.updateContactNote(accountId, userId, note)
    } catch (err: any) {
      Logger.warn(`[IPC] updateContactNote error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-requirements-to-contact', async (_event, { accountId, userIds }) => {
    try {
      return await accountManager.getRequirementsToContact(accountId, userIds)
    } catch (err: any) {
      Logger.warn(`[IPC] getRequirementsToContact error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:export-contact-card', async (_event, { accountId }) => {
    try {
      return await accountManager.exportContactCard(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] exportContactCard error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:export-chat-history', async (_event, { accountId, chatId, options, saveToFile }) => {
    try {
      const res = await accountManager.exportChatHistory(accountId, chatId, options)
      if (!res.success || !res.content) {
        return res
      }

      if (saveToFile) {
        const ext = options.format === 'html' ? 'html' : 'json'
        const filterName = options.format === 'html' ? 'HTML Archive (*.html)' : 'JSON Data (*.json)'
        const dialogRes = await dialog.showSaveDialog({
          title: 'Save Chat Export',
          defaultPath: `chat_export_${chatId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${ext}`,
          filters: [{ name: filterName, extensions: [ext] }],
        })

        if (!dialogRes.canceled && dialogRes.filePath) {
          await fs.promises.writeFile(dialogRes.filePath, res.content, 'utf8')
          return {
            success: true,
            totalMessages: res.totalMessages,
            filePath: dialogRes.filePath,
          }
        }
      }

      return res
    } catch (err: any) {
      Logger.error(`[IPC] exportChatHistory error for ${chatId}:`, err)
      return { success: false, totalMessages: 0, error: err?.message || 'Export failed' }
    }
  })

  ipcMain.handle('telegram:get-autodownload-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getAutoDownloadSettings(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] getAutoDownloadSettings error for ${accountId}:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:save-autodownload-settings', async (_event, { accountId, low, high, settings }) => {
    try {
      return await accountManager.saveAutoDownloadSettings(accountId, low, high, settings)
    } catch (err: any) {
      Logger.error(`[IPC] saveAutoDownloadSettings error for ${accountId}:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-saved-ringtones', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getSavedRingtones(accountId, hash)
    } catch (err: any) {
      Logger.error(`[IPC] getSavedRingtones error for ${accountId}:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:save-ringtone', async (_event, { accountId, id, unsave }) => {
    try {
      return await accountManager.saveRingtone(accountId, id, unsave)
    } catch (err: any) {
      Logger.error(`[IPC] saveRingtone error for ${accountId}:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:upload-ringtone', async (_event, { accountId, file, fileName, mimeType }) => {
    try {
      return await accountManager.uploadRingtone(accountId, file, fileName, mimeType)
    } catch (err: any) {
      Logger.error(`[IPC] uploadRingtone error for ${accountId}:`, err)
      return null
    }
  })

  // --- Channels & Supergroups Administration IPC (Phase 2) ---
  ipcMain.handle('telegram:channel-get-participants', async (_event, { accountId, channelId, filterName, offset, limit }) => {
    try {
      return await accountManager.channelGetParticipants(accountId, channelId, filterName, offset, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] channelGetParticipants error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:channel-get-admin-log', async (_event, { accountId, channelId, options }) => {
    try {
      return await accountManager.channelGetAdminLog(accountId, channelId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] channelGetAdminLog error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:channel-toggle-slow-mode', async (_event, { accountId, channelId, seconds }) => {
    try {
      return await accountManager.channelToggleSlowMode(accountId, channelId, seconds)
    } catch (err: any) {
      Logger.warn(`[IPC] channelToggleSlowMode error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:channel-toggle-join-request', async (_event, { accountId, channelId, enabled }) => {
    try {
      return await accountManager.channelToggleJoinRequest(accountId, channelId, enabled)
    } catch (err: any) {
      Logger.warn(`[IPC] channelToggleJoinRequest error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:channel-toggle-anti-spam', async (_event, { accountId, channelId, enabled }) => {
    try {
      return await accountManager.channelToggleAntiSpam(accountId, channelId, enabled)
    } catch (err: any) {
      Logger.warn(`[IPC] channelToggleAntiSpam error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:channel-toggle-forum', async (_event, { accountId, channelId, enabled }) => {
    try {
      return await accountManager.channelToggleForum(accountId, channelId, enabled)
    } catch (err: any) {
      Logger.warn(`[IPC] channelToggleForum error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:channel-get-recommendations', async (_event, { accountId, channelId }) => {
    try {
      return await accountManager.channelGetRecommendations(accountId, channelId)
    } catch (err: any) {
      Logger.warn(`[IPC] channelGetRecommendations error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:channel-update-paid-messages-price', async (_event, { accountId, channelId, stars }) => {
    try {
      return await accountManager.channelUpdatePaidMessagesPrice(accountId, channelId, stars)
    } catch (err: any) {
      Logger.warn(`[IPC] channelUpdatePaidMessagesPrice error:`, err)
      return null
    }
  })

  // --- Bots, Games & WebApps IPC (Phase 3) ---
  ipcMain.handle('telegram:bot-get-commands', async (_event, { accountId, scope, langCode }) => {
    try {
      return await accountManager.botGetCommands(accountId, scope, langCode)
    } catch (err: any) {
      Logger.warn(`[IPC] botGetCommands error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:bot-set-commands', async (_event, { accountId, commands, scope, langCode }) => {
    try {
      return await accountManager.botSetCommands(accountId, commands, scope, langCode)
    } catch (err: any) {
      Logger.warn(`[IPC] botSetCommands error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:bot-get-info', async (_event, { accountId, botId, langCode }) => {
    try {
      return await accountManager.botGetInfo(accountId, botId, langCode)
    } catch (err: any) {
      Logger.warn(`[IPC] botGetInfo error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:bot-set-info', async (_event, { accountId, botId, langCode, name, about, description }) => {
    try {
      return await accountManager.botSetInfo(accountId, botId, langCode, name, about, description)
    } catch (err: any) {
      Logger.warn(`[IPC] botSetInfo error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:bot-get-menu-button', async (_event, { accountId, botId }) => {
    try {
      return await accountManager.botGetMenuButton(accountId, botId)
    } catch (err: any) {
      Logger.warn(`[IPC] botGetMenuButton error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:bot-set-menu-button', async (_event, { accountId, botId, button }) => {
    try {
      return await accountManager.botSetMenuButton(accountId, botId, button)
    } catch (err: any) {
      Logger.warn(`[IPC] botSetMenuButton error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:bot-get-admined-bots', async (_event, { accountId }) => {
    try {
      return await accountManager.botGetAdminedBots(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] botGetAdminedBots error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:bot-get-popular-apps', async (_event, { accountId, offset, limit }) => {
    try {
      return await accountManager.botGetPopularApps(accountId, offset, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] botGetPopularApps error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:bot-get-recommendations', async (_event, { accountId, botId }) => {
    try {
      return await accountManager.botGetRecommendations(accountId, botId)
    } catch (err: any) {
      Logger.warn(`[IPC] botGetRecommendations error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:bot-invoke-webview-custom-method', async (_event, { accountId, botId, customMethod, params }) => {
    try {
      return await accountManager.botInvokeWebViewCustomMethod(accountId, botId, customMethod, params)
    } catch (err: any) {
      Logger.warn(`[IPC] botInvokeWebViewCustomMethod error:`, err)
      return null
    }
  })

  // --- Payments, Invoices & Telegram Stars IPC (Phase 4) ---
  ipcMain.handle('telegram:payment-get-payment-form', async (_event, { accountId, invoice, themeParams }) => {
    try {
      return await accountManager.paymentGetPaymentForm(accountId, invoice, themeParams)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetPaymentForm error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-get-stars-status', async (_event, { accountId, peerId, ton }) => {
    try {
      return await accountManager.paymentGetStarsStatus(accountId, peerId, ton)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetStarsStatus error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-get-stars-transactions', async (_event, { accountId, peerId, offset, limit, options }) => {
    try {
      return await accountManager.paymentGetStarsTransactions(accountId, peerId, offset, limit, options)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetStarsTransactions error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-get-stars-topup-options', async (_event, { accountId }) => {
    try {
      return await accountManager.paymentGetStarsTopupOptions(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetStarsTopupOptions error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:payment-get-star-gifts', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.paymentGetStarGifts(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetStarGifts error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-get-saved-star-gifts', async (_event, { accountId, peerId, options }) => {
    try {
      return await accountManager.paymentGetSavedStarGifts(accountId, peerId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetSavedStarGifts error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-get-stars-revenue-stats', async (_event, { accountId, peerId, dark, ton }) => {
    try {
      return await accountManager.paymentGetStarsRevenueStats(accountId, peerId, dark, ton)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetStarsRevenueStats error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-get-connected-star-ref-bots', async (_event, { accountId, peerId, offsetDate, offsetLink, limit }) => {
    try {
      return await accountManager.paymentGetConnectedStarRefBots(accountId, peerId, offsetDate, offsetLink, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentGetConnectedStarRefBots error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-connect-star-ref-bot', async (_event, { accountId, peerId, botId }) => {
    try {
      return await accountManager.paymentConnectStarRefBot(accountId, peerId, botId)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentConnectStarRefBot error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:payment-send-stars-form', async (_event, { accountId, formId, invoice }) => {
    try {
      return await accountManager.paymentSendStarsForm(accountId, formId, invoice)
    } catch (err: any) {
      Logger.warn(`[IPC] paymentSendStarsForm error:`, err)
      return null
    }
  })

  // --- Security, Authentication & Account Suite IPC (Phase 5) ---
  ipcMain.handle('telegram:security-get-notify-settings', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.securityGetNotifySettings(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] securityGetNotifySettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:security-update-notify-settings', async (_event, { accountId, peerId, settings }) => {
    try {
      return await accountManager.securityUpdateNotifySettings(accountId, peerId, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] securityUpdateNotifySettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:security-reset-notify-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.securityResetNotifySettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] securityResetNotifySettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:security-get-authorizations', async (_event, { accountId }) => {
    try {
      return await accountManager.securityGetAuthorizations(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] securityGetAuthorizations error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:security-reset-authorizations', async (_event, { accountId }) => {
    try {
      return await accountManager.securityResetAuthorizations(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] securityResetAuthorizations error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:security-get-password', async (_event, { accountId }) => {
    try {
      return await accountManager.securityGetPassword(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] securityGetPassword error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:security-get-privacy', async (_event, { accountId, key }) => {
    try {
      return await accountManager.securityGetPrivacy(accountId, key)
    } catch (err: any) {
      Logger.warn(`[IPC] securityGetPrivacy error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:security-set-privacy', async (_event, { accountId, key, rules }) => {
    try {
      return await accountManager.securitySetPrivacy(accountId, key, rules)
    } catch (err: any) {
      Logger.warn(`[IPC] securitySetPrivacy error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:security-get-wallpapers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.securityGetWallpapers(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] securityGetWallpapers error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:security-update-personal-channel', async (_event, { accountId, channelId }) => {
    try {
      return await accountManager.securityUpdatePersonalChannel(accountId, channelId)
    } catch (err: any) {
      Logger.warn(`[IPC] securityUpdatePersonalChannel error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:security-update-color', async (_event, { accountId, color, backgroundEmojiId, forProfile }) => {
    try {
      return await accountManager.securityUpdateColor(accountId, color, backgroundEmojiId, forProfile)
    } catch (err: any) {
      Logger.warn(`[IPC] securityUpdateColor error:`, err)
      return false
    }
  })

  // --- Core Messaging Engine, Stories & Media IPC (Phase 6) ---
  ipcMain.handle('telegram:messaging-get-history', async (_event, { accountId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash }) => {
    try {
      return await accountManager.messagingGetHistory(accountId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] messagingGetHistory error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:messaging-search-global', async (_event, { accountId, q, filter, minDate, maxDate, offsetRate, offsetId, limit }) => {
    try {
      return await accountManager.messagingSearchGlobal(accountId, q, filter, minDate, maxDate, offsetRate, offsetId, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] messagingSearchGlobal error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:messaging-send-reaction', async (_event, { accountId, peerId, msgId, reaction, big, addToRecent }) => {
    try {
      return await accountManager.messagingSendReaction(accountId, peerId, msgId, reaction, big, addToRecent)
    } catch (err: any) {
      Logger.warn(`[IPC] messagingSendReaction error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:messaging-stories-get-peer-stories', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.messagingStoriesGetPeerStories(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] messagingStoriesGetPeerStories error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:messaging-stories-send-story', async (_event, { accountId, peerId, media, privacyRules, caption }) => {
    try {
      return await accountManager.messagingStoriesSendStory(accountId, peerId, media, privacyRules, caption)
    } catch (err: any) {
      Logger.warn(`[IPC] messagingStoriesSendStory error:`, err)
      return null
    }
  })

  // --- System & Specialized Namespaces IPC (Phase 7) ---
  ipcMain.handle('telegram:system-get-config', async (_event, { accountId }) => {
    try {
      return await accountManager.systemGetConfig(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] systemGetConfig error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:system-get-app-config', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.systemGetAppConfig(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] systemGetAppConfig error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:system-get-nearest-dc', async (_event, { accountId }) => {
    try {
      return await accountManager.systemGetNearestDc(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] systemGetNearestDc error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:system-phone-get-call-config', async (_event, { accountId }) => {
    try {
      return await accountManager.systemPhoneGetCallConfig(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] systemPhoneGetCallConfig error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:system-stats-get-broadcast-stats', async (_event, { accountId, channelId, dark }) => {
    try {
      return await accountManager.systemStatsGetBroadcastStats(accountId, channelId, dark)
    } catch (err: any) {
      Logger.warn(`[IPC] systemStatsGetBroadcastStats error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:system-chatlists-get-exported-invites', async (_event, { accountId, chatlistId }) => {
    try {
      return await accountManager.systemChatlistsGetExportedInvites(accountId, chatlistId)
    } catch (err: any) {
      Logger.warn(`[IPC] systemChatlistsGetExportedInvites error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-active-sessions', async (_event, { accountId }) => {
    try {
      return await accountManager.getActiveSessions(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getActiveSessions error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:terminate-session', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.terminateSession(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] terminateSession error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:translate-message', async (_event, { accountId, chatId, messageId, toLang }) => {
    try {
      return await accountManager.translateMessage(accountId, chatId, messageId, toLang)
    } catch (err: any) {
      Logger.warn(`[IPC] translateMessage error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-cloud-folders', async (_event, { accountId }) => {
    try {
      return await accountManager.getCloudFolders(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getCloudFolders error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:update-dialog-filter', async (_event, { accountId, id, filterData }) => {
    try {
      return await accountManager.updateDialogFilter(accountId, id, filterData)
    } catch (err: any) {
      Logger.warn(`[IPC] updateDialogFilter error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-dialog-filters-order', async (_event, { accountId, order }) => {
    try {
      return await accountManager.updateDialogFiltersOrder(accountId, order)
    } catch (err: any) {
      Logger.warn(`[IPC] updateDialogFiltersOrder error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-suggested-dialog-filters', async (_event, { accountId }) => {
    try {
      return await accountManager.getSuggestedDialogFilters(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getSuggestedDialogFilters error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:toggle-folder-pin', async (_event, { accountId, folderId, chatId, pinned }) => {
    try {
      return await accountManager.toggleFolderPin(accountId, folderId, chatId, pinned)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleFolderPin error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-folder-peer-dialogs', async (_event, { accountId, peerIds }) => {
    try {
      return await accountManager.getFolderPeerDialogs(accountId, peerIds)
    } catch (err: any) {
      Logger.warn(`[IPC] getFolderPeerDialogs error:`, err)
      return []
    }
  })

  // Stickers IPC
  ipcMain.handle('telegram:get-installed-stickers', async (_event, { accountId }) => {
    try {
      return await accountManager.getInstalledStickerSets(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getInstalledStickerSets error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-stickerset', async (_event, { accountId, setId, accessHash }) => {
    try {
      return await accountManager.getStickerSet(accountId, setId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] getStickerSet error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:install-stickerset', async (_event, { accountId, setId, accessHash, archived }) => {
    try {
      return await accountManager.installStickerSet(accountId, setId, accessHash, archived)
    } catch (err: any) {
      Logger.warn(`[IPC] installStickerSet error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:uninstall-stickerset', async (_event, { accountId, setId, accessHash }) => {
    try {
      return await accountManager.uninstallStickerSet(accountId, setId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] uninstallStickerSet error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:check-sticker-short-name', async (_event, { accountId, shortName }) => {
    try {
      return await accountManager.checkStickerShortName(accountId, shortName)
    } catch (err: any) {
      Logger.warn(`[IPC] checkStickerShortName error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:suggest-sticker-short-name', async (_event, { accountId, title }) => {
    try {
      return await accountManager.suggestStickerShortName(accountId, title)
    } catch (err: any) {
      Logger.warn(`[IPC] suggestStickerShortName error:`, err)
      return ''
    }
  })

  ipcMain.handle('telegram:rename-stickerset', async (_event, { accountId, setId, accessHash, title }) => {
    try {
      return await accountManager.renameStickerSet(accountId, setId, accessHash, title)
    } catch (err: any) {
      Logger.warn(`[IPC] renameStickerSet error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:delete-stickerset', async (_event, { accountId, setId, accessHash }) => {
    try {
      return await accountManager.deleteStickerSet(accountId, setId, accessHash)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteStickerSet error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:remove-sticker-from-set', async (_event, { accountId, docId, accessHash, fileReferenceHex }) => {
    try {
      return await accountManager.removeStickerFromSet(accountId, docId, accessHash, fileReferenceHex)
    } catch (err: any) {
      Logger.warn(`[IPC] removeStickerFromSet error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:change-sticker-position', async (_event, { accountId, docId, accessHash, position, fileReferenceHex }) => {
    try {
      return await accountManager.changeStickerPosition(accountId, docId, accessHash, position, fileReferenceHex)
    } catch (err: any) {
      Logger.warn(`[IPC] changeStickerPosition error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-sticker', async (_event, { accountId, chatId, documentId, accessHash, fileRef, replyToMsgId }) => {
    try {
      return await accountManager.sendSticker(accountId, chatId, documentId, accessHash, fileRef, replyToMsgId)
    } catch (err: any) {
      Logger.warn(`[IPC] sendSticker error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-sticker-data', async (_event, { accountId, documentId, accessHash, fileRef }) => {
    try {
      return await accountManager.getStickerData(accountId, documentId, accessHash, fileRef)
    } catch (err: any) {
      return null
    }
  })

  ipcMain.handle('telegram:get-installed-emojis', async (_event, { accountId }) => {
    try {
      return await accountManager.getInstalledEmojiSets(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getInstalledEmojiSets error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-recent-stickers', async (_event, { accountId }) => {
    try {
      return await accountManager.getRecentStickers(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getRecentStickers error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-saved-gifs', async (_event, { accountId }) => {
    try {
      return await accountManager.getSavedGifs(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getSavedGifs error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:send-saved-gif', async (_event, { accountId, chatId, documentId, accessHash, fileRef, replyToMsgId }) => {
    try {
      return await accountManager.sendSavedGif(accountId, chatId, documentId, accessHash, fileRef, replyToMsgId)
    } catch (err: any) {
      Logger.warn(`[IPC] sendSavedGif error:`, err)
      throw err
    }
  })

  // Stories IPC
  ipcMain.handle('telegram:get-all-stories', async (_event, { accountId }) => {
    try {
      return await accountManager.getAllStories(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getAllStories error:`, err)
      return { peers: [], totalCount: 0, hasMore: false }
    }
  })

  ipcMain.handle('telegram:get-peer-stories', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getPeerStories(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getPeerStories error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-story-media', async (_event, { accountId, peerId, storyId }) => {
    try {
      return await accountManager.getStoryMedia(accountId, peerId, storyId)
    } catch (err: any) {
      Logger.warn(`[IPC] getStoryMedia error:`, err)
      return { error: err?.message || 'Failed to load story media.' }
    }
  })

  ipcMain.handle('telegram:read-stories', async (_event, { accountId, peerId, maxId }) => {
    try {
      return await accountManager.readStories(accountId, peerId, maxId)
    } catch (err: any) {
      Logger.warn(`[IPC] readStories error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-story', async (_event, { accountId, filePath, options }) => {
    try {
      return await accountManager.sendStory(accountId, filePath, options)
    } catch (err: any) {
      Logger.warn(`[IPC] sendStory error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:delete-story', async (_event, { accountId, storyId, peerId }) => {
    try {
      return await accountManager.deleteStory(accountId, storyId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteStory error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:can-send-story', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.canSendStory(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] canSendStory error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-stories-privacy', async (_event, { accountId, privacy, allowedUserIds }) => {
    try {
      return await accountManager.setStoriesPrivacy(accountId, privacy, allowedUserIds)
    } catch (err: any) {
      Logger.warn(`[IPC] setStoriesPrivacy error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:export-story-link', async (_event, { accountId, peerId, storyId }) => {
    try {
      return await accountManager.exportStoryLink(accountId, peerId, storyId)
    } catch (err: any) {
      Logger.warn(`[IPC] exportStoryLink error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:toggle-story-pinned', async (_event, { accountId, storyIds, pinned, peerId }) => {
    try {
      return await accountManager.toggleStoryPinned(accountId, storyIds, pinned, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleStoryPinned error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-story-views-list', async (_event, { accountId, storyId, options }) => {
    try {
      return await accountManager.getStoryViewsList(accountId, storyId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] getStoryViewsList error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:activate-story-stealth-mode', async (_event, { accountId, past, future }) => {
    return await accountManager.activateStoryStealthMode(accountId, { past, future })
  })

  ipcMain.handle('telegram:send-story-reaction', async (_event, { accountId, peerId, storyId, reaction }) => {
    return await accountManager.sendStoryReaction(accountId, peerId, Number(storyId), reaction)
  })

  ipcMain.handle('telegram:get-stories-archive', async (_event, { accountId, peerId, offsetId, limit }) => {
    try {
      return await accountManager.getStoriesArchive(accountId, peerId, offsetId, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] getStoriesArchive error:`, err)
      return { count: 0, stories: [] }
    }
  })

  ipcMain.handle('telegram:get-pinned-stories', async (_event, { accountId, peerId, offsetId, limit }) => {
    try {
      return await accountManager.getPinnedStories(accountId, peerId, offsetId, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] getPinnedStories error:`, err)
      return { count: 0, stories: [] }
    }
  })

  ipcMain.handle('telegram:check-chatlist-invite', async (_event, { accountId, slug }) => {
    try {
      return await accountManager.checkChatlistInvite(accountId, slug)
    } catch (err: any) {
      Logger.warn(`[IPC] checkChatlistInvite error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:join-chatlist-invite', async (_event, { accountId, slug, peerIds }) => {
    try {
      return await accountManager.joinChatlistInvite(accountId, slug, peerIds)
    } catch (err: any) {
      Logger.warn(`[IPC] joinChatlistInvite error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-web-view-data', async (_event, { accountId, botPeerId, buttonText, data }) => {
    try {
      return await accountManager.sendWebViewData(accountId, botPeerId, buttonText, data)
    } catch (err: any) {
      Logger.warn(`[IPC] sendWebViewData error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:prolong-web-view', async (_event, { accountId, peerId, botId, queryId, silent }) => {
    try {
      return await accountManager.prolongWebView(accountId, peerId, botId, queryId, silent)
    } catch (err: any) {
      Logger.warn(`[IPC] prolongWebView error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-channel-boost-status', async (_event, { accountId, channelId }) => {
    try {
      return await accountManager.getChannelBoostStatus(accountId, channelId)
    } catch (err: any) {
      Logger.warn(`[IPC] getChannelBoostStatus error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:apply-channel-boost', async (_event, { accountId, channelId, slots }) => {
    try {
      return await accountManager.applyChannelBoost(accountId, channelId, slots)
    } catch (err: any) {
      Logger.warn(`[IPC] applyChannelBoost error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-my-boosts', async (_event, { accountId }) => {
    try {
      return await accountManager.getMyBoosts(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getMyBoosts error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-inline-bot-results', async (_event, { accountId, botUsername, query, offset, peerId }) => {
    try {
      return await accountManager.getInlineBotResults(accountId, botUsername, query, offset, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getInlineBotResults error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:send-inline-bot-result', async (_event, { accountId, peerId, queryId, resultId, options }) => {
    try {
      return await accountManager.sendInlineBotResult(accountId, peerId, queryId, resultId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] sendInlineBotResult error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-game-high-scores', async (_event, { accountId, peerId, messageId, userId }) => {
    try {
      return await accountManager.getGameHighScores(accountId, peerId, messageId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] getGameHighScores error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:set-game-score', async (_event, { accountId, peerId, messageId, score, userId, force, editMessage }) => {
    try {
      return await accountManager.setGameScore(accountId, peerId, messageId, score, userId, force, editMessage)
    } catch (err: any) {
      Logger.warn(`[IPC] setGameScore error:`, err)
      throw err
    }
  })

  // History TTL & Auto-Delete Timer IPC
  ipcMain.handle('telegram:set-history-ttl', async (_event, { accountId, peerId, period }) => {
    try {
      return await accountManager.setHistoryTTL(accountId, peerId, period)
    } catch (err: any) {
      Logger.warn(`[IPC] setHistoryTTL error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-default-history-ttl', async (_event, { accountId }) => {
    try {
      return await accountManager.getDefaultHistoryTTL(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getDefaultHistoryTTL error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:set-default-history-ttl', async (_event, { accountId, period }) => {
    try {
      return await accountManager.setDefaultHistoryTTL(accountId, period)
    } catch (err: any) {
      Logger.warn(`[IPC] setDefaultHistoryTTL error:`, err)
      throw err
    }
  })

  // Voice Transcription IPC (Speech-to-Text)
  ipcMain.handle('telegram:transcribe-audio', async (_event, { accountId, chatId, messageId }) => {
    try {
      return await accountManager.transcribeAudio(accountId, chatId, messageId)
    } catch (err: any) {
      Logger.warn(`[IPC] transcribeAudio error:`, err)
      throw err
    }
  })

  // Quick Replies & Shortcuts IPC (Telegram Business / Premium Layer 178+)
  ipcMain.handle('telegram:get-quick-replies', async (_event, { accountId }) => {
    try {
      return await accountManager.getQuickReplies(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getQuickReplies error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:send-quick-reply-messages', async (_event, { accountId, peerId, shortcutId }) => {
    try {
      return await accountManager.sendQuickReplyMessages(accountId, peerId, shortcutId)
    } catch (err: any) {
      Logger.warn(`[IPC] sendQuickReplyMessages error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:edit-quick-reply-shortcut', async (_event, { accountId, shortcutId, shortcut }) => {
    try {
      return await accountManager.editQuickReplyShortcut(accountId, shortcutId, shortcut)
    } catch (err: any) {
      Logger.warn(`[IPC] editQuickReplyShortcut error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:delete-quick-reply-shortcut', async (_event, { accountId, shortcutId }) => {
    try {
      return await accountManager.deleteQuickReplyShortcut(accountId, shortcutId)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteQuickReplyShortcut error:`, err)
      throw err
    }
  })

  // Chat Themes & Custom Wallpaper IPC (MTProto messages.setChatTheme & messages.setChatWallPaper)
  ipcMain.handle('telegram:set-chat-theme', async (_event, { accountId, chatId, emoticon }) => {
    try {
      return await accountManager.setChatTheme(accountId, chatId, emoticon)
    } catch (err: any) {
      Logger.warn(`[IPC] setChatTheme error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:set-chat-wallpaper', async (_event, { accountId, chatId, wallpaperSlug, forBoth }) => {
    try {
      return await accountManager.setChatWallPaper(accountId, chatId, wallpaperSlug, forBoth)
    } catch (err: any) {
      Logger.warn(`[IPC] setChatWallPaper error:`, err)
      throw err
    }
  })

  // Channel Boosts IPC
  ipcMain.handle('telegram:get-channel-boosts', async (_event, { accountId, channelId }) => {
    try {
      return await accountManager.getChannelBoostStatus(accountId, channelId)
    } catch (err: any) {
      Logger.warn(`[IPC] getChannelBoostStatus error:`, err)
      return null
    }
  })

  // 2FA Security IPC
  ipcMain.handle('telegram:get-two-factor-status', async (_event, { accountId }) => {
    try {
      return await accountManager.getTwoFactorStatus(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getTwoFactorStatus error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:account-reset-password', async (_event, { accountId }) => {
    try {
      return await accountManager.accountResetPassword(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] accountResetPassword error:`, err)
      return { status: 'failed', error: err?.message || String(err) }
    }
  })

  ipcMain.handle('telegram:account-decline-password-reset', async (_event, { accountId }) => {
    try {
      return await accountManager.accountDeclinePasswordReset(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] accountDeclinePasswordReset error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:clear-recent-emoji-statuses', async (_event, { accountId }) => {
    try {
      return await accountManager.clearRecentEmojiStatuses(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] clearRecentEmojiStatuses error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:delete-autosave-exceptions', async (_event, { accountId }) => {
    try {
      return await accountManager.deleteAutoSaveExceptions(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteAutoSaveExceptions error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:create-theme', async (_event, { accountId, slug, title, settings }) => {
    try {
      return await accountManager.createTheme(accountId, { slug, title, settings })
    } catch (err: any) {
      Logger.warn(`[IPC] createTheme error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:delete-passkey', async (_event, { accountId, id }) => {
    try {
      return await accountManager.deletePasskey(accountId, id)
    } catch (err: any) {
      Logger.warn(`[IPC] deletePasskey error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:delete-web-browser-settings-exceptions', async (_event, { accountId }) => {
    try {
      return await accountManager.deleteWebBrowserSettingsExceptions(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteWebBrowserSettingsExceptions error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:disable-peer-connected-bot', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.disablePeerConnectedBot(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] disablePeerConnectedBot error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:finish-takeout-session', async (_event, { accountId, success }) => {
    try {
      return await accountManager.finishTakeoutSession(accountId, success)
    } catch (err: any) {
      Logger.warn(`[IPC] finishTakeoutSession error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-account-ttl', async (_event, { accountId }) => {
    try {
      return await accountManager.getAccountTTL(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getAccountTTL error:`, err)
      return 180
    }
  })

  ipcMain.handle('telegram:set-account-ttl', async (_event, { accountId, days }) => {
    try {
      return await accountManager.setAccountTTL(accountId, days)
    } catch (err: any) {
      Logger.warn(`[IPC] setAccountTTL error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-autosave-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getAutoSaveSettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getAutoSaveSettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-authorizations', async (_event, { accountId }) => {
    try {
      return await accountManager.getAuthorizations(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getAuthorizations error:`, err)
      return { authorizations: [] }
    }
  })

  ipcMain.handle(
    'telegram:get-authorization-form',
    async (_event, { accountId, botId, scope, publicKey }) => {
      try {
        return await accountManager.getAuthorizationForm(accountId, botId, scope, publicKey)
      } catch (err: any) {
        Logger.warn(`[IPC] getAuthorizationForm error:`, err)
        return null
      }
    }
  )

  ipcMain.handle('telegram:get-bot-business-connection', async (_event, { accountId, connectionId }) => {
    try {
      return await accountManager.getBotBusinessConnection(accountId, connectionId)
    } catch (err: any) {
      Logger.warn(`[IPC] getBotBusinessConnection error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-contact-signup-notification', async (_event, { accountId }) => {
    try {
      return await accountManager.getContactSignUpNotification(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getContactSignUpNotification error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:get-chat-themes', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getChatThemes(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getChatThemes error:`, err)
      return { themes: [] }
    }
  })

  ipcMain.handle('telegram:get-channel-default-emoji-statuses', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getChannelDefaultEmojiStatuses(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getChannelDefaultEmojiStatuses error:`, err)
      return { statuses: [] }
    }
  })

  ipcMain.handle('telegram:get-channel-restricted-status-emojis', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getChannelRestrictedStatusEmojis(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getChannelRestrictedStatusEmojis error:`, err)
      return { documentIds: [] }
    }
  })

  ipcMain.handle('telegram:get-connected-bots', async (_event, { accountId }) => {
    try {
      return await accountManager.getConnectedBots(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getConnectedBots error:`, err)
      return { connectedBots: [] }
    }
  })

  ipcMain.handle('telegram:get-content-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getContentSettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getContentSettings error:`, err)
      return { sensitiveEnabled: false, sensitiveCanChange: false }
    }
  })

  ipcMain.handle('telegram:get-global-privacy-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getGlobalPrivacySettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getGlobalPrivacySettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-multi-wallpapers', async (_event, { accountId, wallpapers }) => {
    try {
      return await accountManager.getMultiWallPapers(accountId, wallpapers)
    } catch (err: any) {
      Logger.warn(`[IPC] getMultiWallPapers error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-default-background-emojis', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getDefaultBackgroundEmojis(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getDefaultBackgroundEmojis error:`, err)
      return { documentIds: [] }
    }
  })

  ipcMain.handle('telegram:get-default-profile-photo-emojis', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getDefaultProfilePhotoEmojis(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getDefaultProfilePhotoEmojis error:`, err)
      return { documentIds: [] }
    }
  })

  ipcMain.handle('telegram:get-default-group-photo-emojis', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getDefaultGroupPhotoEmojis(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getDefaultGroupPhotoEmojis error:`, err)
      return { documentIds: [] }
    }
  })

  // Microphase 014: Account Domain Suite Part 7
  ipcMain.handle('telegram:get-notify-settings', async (_event, { accountId, scope }) => {
    try {
      return await accountManager.getNotifySettings(accountId, scope)
    } catch (err: any) {
      Logger.warn(`[IPC] getNotifySettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-notify-exceptions', async (_event, { accountId, compareSound, compareStories }) => {
    try {
      return await accountManager.getNotifyExceptions(accountId, compareSound, compareStories)
    } catch (err: any) {
      Logger.warn(`[IPC] getNotifyExceptions error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-paid-messages-revenue', async (_event, { accountId, userId, parentPeerId }) => {
    try {
      return await accountManager.getPaidMessagesRevenue(accountId, userId, parentPeerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getPaidMessagesRevenue error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-passkeys', async (_event, { accountId }) => {
    try {
      return await accountManager.getPasskeys(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getPasskeys error:`, err)
      return { passkeys: [] }
    }
  })

  ipcMain.handle('telegram:get-password-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getPasswordSettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getPasswordSettings error:`, err)
      return null
    }
  })

  // Microphase 015: Account Domain Suite Part 8
  ipcMain.handle('telegram:get-reactions-notify-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getReactionsNotifySettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getReactionsNotifySettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-recent-emoji-statuses', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getRecentEmojiStatuses(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getRecentEmojiStatuses error:`, err)
      return { statuses: [] }
    }
  })

  ipcMain.handle('telegram:get-saved-music-ids', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getSavedMusicIds(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getSavedMusicIds error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-theme', async (_event, { accountId, format, theme }) => {
    try {
      return await accountManager.getTheme(accountId, format, theme)
    } catch (err: any) {
      Logger.warn(`[IPC] getTheme error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-themes', async (_event, { accountId, format, hash }) => {
    try {
      return await accountManager.getThemes(accountId, format, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getThemes error:`, err)
      return { themes: [] }
    }
  })

  // Microphase 016: Account Domain Suite Part 9
  ipcMain.handle('telegram:get-tmp-password', async (_event, { accountId, passwordSRP, period }) => {
    try {
      return await accountManager.getTmpPassword(accountId, passwordSRP, period)
    } catch (err: any) {
      Logger.warn(`[IPC] getTmpPassword error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-unique-gift-chat-themes', async (_event, { accountId, offset, limit, hash }) => {
    try {
      return await accountManager.getUniqueGiftChatThemes(accountId, offset, limit, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getUniqueGiftChatThemes error:`, err)
      return { themes: [] }
    }
  })

  ipcMain.handle('telegram:get-wallpaper', async (_event, { accountId, wallpaper }) => {
    try {
      return await accountManager.getWallPaper(accountId, wallpaper)
    } catch (err: any) {
      Logger.warn(`[IPC] getWallPaper error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-wallpapers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getWallPapers(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getWallPapers error:`, err)
      return { wallpapers: [] }
    }
  })

  ipcMain.handle('telegram:get-web-authorizations', async (_event, { accountId }) => {
    try {
      return await accountManager.getWebAuthorizations(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getWebAuthorizations error:`, err)
      return { authorizations: [] }
    }
  })

  ipcMain.handle('telegram:get-web-browser-settings', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getWebBrowserSettings(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getWebBrowserSettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:init-passkey-registration', async (_event, { accountId, params }) => {
    try {
      return await accountManager.initPasskeyRegistration(accountId, params)
    } catch (err: any) {
      Logger.warn(`[IPC] initPasskeyRegistration error:`, err)
      return null
    }
  })

  // Microphase 017: Account Domain Suite Part 10
  ipcMain.handle('telegram:init-takeout-session', async (_event, { accountId, options }) => {
    try {
      return await accountManager.initTakeoutSession(accountId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] initTakeoutSession error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:install-theme', async (_event, { accountId, dark, theme, format, baseTheme }) => {
    try {
      return await accountManager.installTheme(accountId, dark, theme, format, baseTheme)
    } catch (err: any) {
      Logger.warn(`[IPC] installTheme error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:install-wallpaper', async (_event, { accountId, wallpaper, settings }) => {
    try {
      return await accountManager.installWallPaper(accountId, wallpaper, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] installWallPaper error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:invalidate-signin-codes', async (_event, { accountId, codes }) => {
    try {
      return await accountManager.invalidateSignInCodes(accountId, codes)
    } catch (err: any) {
      Logger.warn(`[IPC] invalidateSignInCodes error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:register-device', async (_event, { accountId, options }) => {
    try {
      return await accountManager.registerDevice(accountId, options)
    } catch (err: any) {
      Logger.warn(`[IPC] registerDevice error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:register-passkey', async (_event, { accountId, credential }) => {
    try {
      return await accountManager.registerPasskey(accountId, credential)
    } catch (err: any) {
      Logger.warn(`[IPC] registerPasskey error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:reorder-usernames', async (_event, { accountId, order }) => {
    try {
      return await accountManager.reorderUsernames(accountId, order)
    } catch (err: any) {
      Logger.warn(`[IPC] reorderUsernames error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:report-peer', async (_event, { accountId, peerId, reason, message }) => {
    try {
      return await accountManager.reportPeer(accountId, peerId, reason, message)
    } catch (err: any) {
      Logger.warn(`[IPC] reportPeer error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:report-profile-photo', async (_event, { accountId, peerId, photoId, reason, message }) => {
    try {
      return await accountManager.reportProfilePhoto(accountId, peerId, photoId, reason, message)
    } catch (err: any) {
      Logger.warn(`[IPC] reportProfilePhoto error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:resend-password-email', async (_event, { accountId }) => {
    try {
      return await accountManager.resendPasswordEmail(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] resendPasswordEmail error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:reset-authorization', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.resetAuthorization(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] resetAuthorization error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:reset-notify-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.resetNotifySettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] resetNotifySettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:reset-password', async (_event, { accountId }) => {
    try {
      return await accountManager.resetPassword(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] resetPassword error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:reset-wallpapers', async (_event, { accountId }) => {
    try {
      return await accountManager.resetWallPapers(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] resetWallPapers error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:reset-web-authorization', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.resetWebAuthorization(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] resetWebAuthorization error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:reset-web-authorizations', async (_event, { accountId }) => {
    try {
      return await accountManager.resetWebAuthorizations(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] resetWebAuthorizations error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:resolve-business-chat-link', async (_event, { accountId, slug }) => {
    try {
      return await accountManager.resolveBusinessChatLink(accountId, slug)
    } catch (err: any) {
      Logger.warn(`[IPC] resolveBusinessChatLink error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:save-auto-save-settings', async (_event, { accountId, users, chats, broadcasts, peerId, settings }) => {
    try {
      return await accountManager.saveAutoSaveSettings(accountId, users, chats, broadcasts, peerId, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] saveAutoSaveSettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:save-music', async (_event, { accountId, unsave, id, afterId }) => {
    try {
      return await accountManager.saveMusic(accountId, unsave, id, afterId)
    } catch (err: any) {
      Logger.warn(`[IPC] saveMusic error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:save-theme', async (_event, { accountId, theme, unsave }) => {
    try {
      return await accountManager.saveTheme(accountId, theme, unsave)
    } catch (err: any) {
      Logger.warn(`[IPC] saveTheme error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:save-wallpaper', async (_event, { accountId, wallpaper, unsave, settings }) => {
    try {
      return await accountManager.saveWallPaper(accountId, wallpaper, unsave, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] saveWallPaper error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:send-change-phone-code', async (_event, { accountId, phoneNumber, settings }) => {
    try {
      return await accountManager.sendChangePhoneCode(accountId, phoneNumber, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] sendChangePhoneCode error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:send-confirm-phone-code', async (_event, { accountId, hash, settings }) => {
    try {
      return await accountManager.sendConfirmPhoneCode(accountId, hash, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] sendConfirmPhoneCode error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:send-verify-email-code', async (_event, { accountId, purpose, email }) => {
    try {
      return await accountManager.sendVerifyEmailCode(accountId, purpose, email)
    } catch (err: any) {
      Logger.warn(`[IPC] sendVerifyEmailCode error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:send-verify-phone-code', async (_event, { accountId, phoneNumber, settings }) => {
    try {
      return await accountManager.sendVerifyPhoneCode(accountId, phoneNumber, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] sendVerifyPhoneCode error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:set-authorization-ttl', async (_event, { accountId, authorizationTtlDays }) => {
    try {
      return await accountManager.setAuthorizationTTL(accountId, authorizationTtlDays)
    } catch (err: any) {
      Logger.warn(`[IPC] setAuthorizationTTL error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-contact-sign-up-notification', async (_event, { accountId, silent }) => {
    try {
      return await accountManager.setContactSignUpNotification(accountId, silent)
    } catch (err: any) {
      Logger.warn(`[IPC] setContactSignUpNotification error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-content-settings', async (_event, { accountId, sensitiveEnabled }) => {
    try {
      return await accountManager.setContentSettings(accountId, sensitiveEnabled)
    } catch (err: any) {
      Logger.warn(`[IPC] setContentSettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-global-privacy-settings', async (_event, { accountId, settings }) => {
    try {
      return await accountManager.setGlobalPrivacySettings(accountId, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] setGlobalPrivacySettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-main-profile-tab', async (_event, { accountId, tab }) => {
    try {
      return await accountManager.setMainProfileTab(accountId, tab)
    } catch (err: any) {
      Logger.warn(`[IPC] setMainProfileTab error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-privacy', async (_event, { accountId, key, rules }) => {
    try {
      return await accountManager.setPrivacy(accountId, key, rules)
    } catch (err: any) {
      Logger.warn(`[IPC] setPrivacy error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:set-reactions-notify-settings', async (_event, { accountId, settings }) => {
    try {
      return await accountManager.setReactionsNotifySettings(accountId, settings)
    } catch (err: any) {
      Logger.warn(`[IPC] setReactionsNotifySettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:toggle-connected-bot-paused', async (_event, { accountId, peerId, paused }) => {
    try {
      return await accountManager.toggleConnectedBotPaused(accountId, peerId, paused)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleConnectedBotPaused error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:toggle-no-paid-messages-exception',
    async (_event, { accountId, refundCharged, requirePayment, parentPeerId, userIdId }) => {
      try {
        return await accountManager.toggleNoPaidMessagesException(
          accountId,
          refundCharged,
          requirePayment,
          parentPeerId,
          userIdId
        )
      } catch (err: any) {
        Logger.warn(`[IPC] toggleNoPaidMessagesException error:`, err)
        return false
      }
    }
  )

  ipcMain.handle('telegram:toggle-account-username', async (_event, { accountId, username, active }) => {
    try {
      return await accountManager.toggleAccountUsername(accountId, username, active)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleAccountUsername error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:toggle-web-browser-settings-exception',
    async (_event, { accountId, deleteException, openExternalBrowser, url }) => {
      try {
        return await accountManager.toggleWebBrowserSettingsException(
          accountId,
          deleteException,
          openExternalBrowser,
          url
        )
      } catch (err: any) {
        Logger.warn(`[IPC] toggleWebBrowserSettingsException error:`, err)
        return false
      }
    }
  )

  ipcMain.handle('telegram:unregister-device', async (_event, { accountId, tokenType, token, otherUids }) => {
    try {
      return await accountManager.unregisterDevice(accountId, tokenType, token, otherUids)
    } catch (err: any) {
      Logger.warn(`[IPC] unregisterDevice error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-birthday', async (_event, { accountId, birthday }) => {
    try {
      return await accountManager.updateBirthday(accountId, birthday)
    } catch (err: any) {
      Logger.warn(`[IPC] updateBirthday error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-color', async (_event, { accountId, forProfile, color }) => {
    try {
      return await accountManager.updateAccountColor(accountId, forProfile, color)
    } catch (err: any) {
      Logger.warn(`[IPC] updateAccountColor error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:update-connected-bot',
    async (_event, { accountId, deleted, rights, botId, recipients }) => {
      try {
        return await accountManager.updateConnectedBot(accountId, deleted, rights, botId, recipients)
      } catch (err: any) {
        Logger.warn(`[IPC] updateConnectedBot error:`, err)
        return false
      }
    }
  )

  ipcMain.handle('telegram:update-device-locked', async (_event, { accountId, period }) => {
    try {
      return await accountManager.updateDeviceLocked(accountId, period)
    } catch (err: any) {
      Logger.warn(`[IPC] updateDeviceLocked error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-password-settings', async (_event, { accountId, password, newSettings }) => {
    try {
      return await accountManager.updatePasswordSettings(accountId, password, newSettings)
    } catch (err: any) {
      Logger.warn(`[IPC] updatePasswordSettings error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-profile', async (_event, { accountId, firstName, lastName, about }) => {
    try {
      return await accountManager.updateProfile(accountId, firstName, lastName, about)
    } catch (err: any) {
      Logger.warn(`[IPC] updateProfile error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:update-status', async (_event, { accountId, offline }) => {
    try {
      return await accountManager.updateStatus(accountId, offline)
    } catch (err: any) {
      Logger.warn(`[IPC] updateStatus error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:update-theme',
    async (_event, { accountId, format, theme, slug, title, document, settings }) => {
      try {
        return await accountManager.updateTheme(accountId, format, theme, slug, title, document, settings)
      } catch (err: any) {
        Logger.warn(`[IPC] updateTheme error:`, err)
        return false
      }
    }
  )

  ipcMain.handle('telegram:update-account-username', async (_event, { accountId, username }) => {
    try {
      return await accountManager.updateAccountUsername(accountId, username)
    } catch (err: any) {
      Logger.warn(`[IPC] updateAccountUsername error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:update-web-browser-settings',
    async (_event, { accountId, openExternalBrowser, displayCloseButton }) => {
      try {
        return await accountManager.updateWebBrowserSettings(accountId, openExternalBrowser, displayCloseButton)
      } catch (err: any) {
        Logger.warn(`[IPC] updateWebBrowserSettings error:`, err)
        return false
      }
    }
  )

  ipcMain.handle('telegram:upload-theme', async (_event, { accountId, file, thumb, fileName, mimeType }) => {
    try {
      return await accountManager.uploadTheme(accountId, file, thumb, fileName, mimeType)
    } catch (err: any) {
      Logger.warn(`[IPC] uploadTheme error:`, err)
      return null
    }
  })

  ipcMain.handle(
    'telegram:upload-wallpaper',
    async (_event, { accountId, forChat, file, mimeType, settings }) => {
      try {
        return await accountManager.uploadWallPaper(accountId, forChat, file, mimeType, settings)
      } catch (err: any) {
        Logger.warn(`[IPC] uploadWallPaper error:`, err)
        return null
      }
    }
  )

  ipcMain.handle('telegram:verify-email', async (_event, { accountId, purpose, verification }) => {
    try {
      return await accountManager.verifyEmail(accountId, purpose, verification)
    } catch (err: any) {
      Logger.warn(`[IPC] verifyEmail error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:verify-phone', async (_event, { accountId, phoneNumber, phoneCodeHash, phoneCode }) => {
    try {
      return await accountManager.verifyPhone(accountId, phoneNumber, phoneCodeHash, phoneCode)
    } catch (err: any) {
      Logger.warn(`[IPC] verifyPhone error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:get-user-saved-music',
    async (_event, { accountId, userId, offset, limit, hash }) => {
      try {
        return await accountManager.getUserSavedMusic(accountId, userId, offset, limit, hash)
      } catch (err: any) {
        Logger.warn(`[IPC] getUserSavedMusic error:`, err)
        return null
      }
    }
  )

  ipcMain.handle(
    'telegram:get-user-saved-music-by-id',
    async (_event, { accountId, userId, id }) => {
      try {
        return await accountManager.getUserSavedMusicByID(accountId, userId, id)
      } catch (err: any) {
        Logger.warn(`[IPC] getUserSavedMusicByID error:`, err)
        return []
      }
    }
  )

  ipcMain.handle('telegram:get-users', async (_event, { accountId, userIds }) => {
    try {
      return await accountManager.getUsers(accountId, userIds)
    } catch (err: any) {
      Logger.warn(`[IPC] getUsers error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:set-secure-value-errors', async (_event, { accountId, userId, errors }) => {
    try {
      return await accountManager.setSecureValueErrors(accountId, userId, errors)
    } catch (err: any) {
      Logger.warn(`[IPC] setSecureValueErrors error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:suggest-birthday',
    async (_event, { accountId, userId, day, month, year }) => {
      try {
        return await accountManager.suggestBirthday(accountId, userId, day, month, year)
      } catch (err: any) {
        Logger.warn(`[IPC] suggestBirthday error:`, err)
        return false
      }
    }
  )

  ipcMain.handle('telegram:accept-contact', async (_event, { accountId, userId }) => {
    try {
      return await accountManager.acceptContact(accountId, userId)
    } catch (err: any) {
      Logger.warn(`[IPC] acceptContact error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:block-contact', async (_event, { accountId, peerId, myStoriesFrom }) => {
    try {
      return await accountManager.blockContact(accountId, peerId, myStoriesFrom)
    } catch (err: any) {
      Logger.warn(`[IPC] blockContact error:`, err)
      return false
    }
  })

  ipcMain.handle(
    'telegram:block-from-replies',
    async (_event, { accountId, msgId, deleteMessage, deleteHistory, reportSpam }) => {
      try {
        return await accountManager.blockFromReplies(
          accountId,
          msgId,
          deleteMessage,
          deleteHistory,
          reportSpam
        )
      } catch (err: any) {
        Logger.warn(`[IPC] blockFromReplies error:`, err)
        return null
      }
    }
  )

  ipcMain.handle('telegram:delete-by-phones', async (_event, { accountId, phones }) => {
    try {
      return await accountManager.deleteByPhones(accountId, phones)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteByPhones error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:delete-contacts', async (_event, { accountId, userIds }) => {
    try {
      return await accountManager.deleteContacts(accountId, userIds)
    } catch (err: any) {
      Logger.warn(`[IPC] deleteContacts error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:edit-close-friends', async (_event, { accountId, userIds }) => {
    try {
      return await accountManager.editCloseFriends(accountId, userIds)
    } catch (err: any) {
      Logger.warn(`[IPC] editCloseFriends error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:export-contact-token', async (_event, { accountId }) => {
    try {
      return await accountManager.exportContactToken(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] exportContactToken error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:export-no-paid-messages-token', async (_event, { accountId }) => {
    try {
      return await accountManager.exportNoPaidMessagesToken(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] exportNoPaidMessagesToken error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-contact-ids', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getContactIDs(accountId, hash)
    } catch (err: any) {
      Logger.warn(`[IPC] getContactIDs error:`, err)
      return []
    }
  })

  ipcMain.handle(
    'telegram:get-located',
    async (_event, { accountId, lat, long, background, selfExpires }) => {
      try {
        return await accountManager.getLocated(accountId, lat, long, background, selfExpires)
      } catch (err: any) {
        Logger.warn(`[IPC] getLocated error:`, err)
        return null
      }
    }
  )

  ipcMain.handle('telegram:get-saved-contacts', async (_event, { accountId }) => {
    try {
      return await accountManager.getSavedContacts(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getSavedContacts error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-sponsored-peers', async (_event, { accountId, query }) => {
    try {
      return await accountManager.getSponsoredPeers(accountId, query)
    } catch (err: any) {
      Logger.warn(`[IPC] getSponsoredPeers error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:get-contact-statuses', async (_event, { accountId }) => {
    try {
      return await accountManager.getContactStatuses(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getContactStatuses error:`, err)
      return []
    }
  })

  ipcMain.handle('telegram:import-contact-token', async (_event, { accountId, token }) => {
    try {
      return await accountManager.importContactToken(accountId, token)
    } catch (err: any) {
      Logger.warn(`[IPC] importContactToken error:`, err)
      return null
    }
  })

  ipcMain.handle(
    'telegram:import-no-paid-messages-token',
    async (_event, { accountId, userId, token }) => {
      try {
        return await accountManager.importNoPaidMessagesToken(accountId, userId, token)
      } catch (err: any) {
        Logger.warn(`[IPC] importNoPaidMessagesToken error:`, err)
        return null
      }
    }
  )

  ipcMain.handle('telegram:reset-saved-contacts', async (_event, { accountId }) => {
    try {
      return await accountManager.resetSavedContacts(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] resetSavedContacts error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:reset-top-peer-rating', async (_event, { accountId, category, peer }) => {
    try {
      return await accountManager.resetTopPeerRating(accountId, category, peer)
    } catch (err: any) {
      Logger.warn(`[IPC] resetTopPeerRating error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:resolve-phone', async (_event, { accountId, phone }) => {
    try {
      return await accountManager.resolvePhone(accountId, phone)
    } catch (err: any) {
      Logger.warn(`[IPC] resolvePhone error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:resolve-username', async (_event, { accountId, username, referer }) => {
    try {
      return await accountManager.resolveUsername(accountId, username, referer)
    } catch (err: any) {
      Logger.warn(`[IPC] resolveUsername error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:search-contacts', async (_event, { accountId, query, limit }) => {
    try {
      return await accountManager.searchContacts(accountId, query, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] searchContacts error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:set-blocked', async (_event, { accountId, id, myStoriesFrom }) => {
    try {
      return await accountManager.setBlocked(accountId, id, myStoriesFrom)
    } catch (err: any) {
      Logger.warn(`[IPC] setBlocked error:`, err)
      return false
    }
  })

  ipcMain.handle('telegram:toggle-top-peers', async (_event, { accountId, enabled }) => {
    try {
      return await accountManager.toggleTopPeers(accountId, enabled)
    } catch (err: any) {
      Logger.warn(`[IPC] toggleTopPeers error:`, err)
      return false
    }
  })

  // Layer 232 Messages Suite IPC Handlers (Microphase 033)
  ipcMain.handle('telegram:messages:add-chat-user', async (_event, { accountId, chatId, userId, fwdLimit }) => {
    try {
      return await accountManager.addChatUser(accountId, chatId, userId, fwdLimit)
    } catch (err: any) {
      Logger.warn('[IPC] addChatUser error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:check-chat-invite', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.checkChatInvite(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] checkChatInvite error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:accept-url-auth', async (_event, { accountId, options }) => {
    try {
      return await accountManager.acceptUrlAuth(accountId, options)
    } catch (err: any) {
      Logger.warn('[IPC] acceptUrlAuth error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:check-history-import', async (_event, { accountId, importHead }) => {
    try {
      return await accountManager.checkHistoryImport(accountId, importHead)
    } catch (err: any) {
      Logger.warn('[IPC] checkHistoryImport error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:append-todo-list', async (_event, { accountId, peerId, msgId, list }) => {
    try {
      return await accountManager.appendTodoList(accountId, peerId, msgId, list)
    } catch (err: any) {
      Logger.warn('[IPC] appendTodoList error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:add-poll-answer', async (_event, { accountId, peerId, msgId, answer }) => {
    try {
      return await accountManager.addPollAnswer(accountId, peerId, msgId, answer)
    } catch (err: any) {
      Logger.warn('[IPC] addPollAnswer error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite IPC Handlers (Microphase 034)
  ipcMain.handle('telegram:messages:check-history-import-peer', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.checkHistoryImportPeer(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] checkHistoryImportPeer error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:check-quick-reply-shortcut', async (_event, { accountId, shortcut }) => {
    try {
      return await accountManager.checkQuickReplyShortcut(accountId, shortcut)
    } catch (err: any) {
      Logger.warn('[IPC] checkQuickReplyShortcut error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:messages:clear-all-drafts', async (_event, { accountId }) => {
    try {
      return await accountManager.clearAllDrafts(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] clearAllDrafts error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:messages:clear-recent-reactions', async (_event, { accountId }) => {
    try {
      return await accountManager.clearRecentReactions(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] clearRecentReactions error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:messages:clear-recent-stickers', async (_event, { accountId, attached }) => {
    try {
      return await accountManager.clearRecentStickers(accountId, attached)
    } catch (err: any) {
      Logger.warn('[IPC] clearRecentStickers error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:messages:create-chat', async (_event, { accountId, userIds, title, ttlPeriod }) => {
    try {
      return await accountManager.createChat(accountId, userIds, title, ttlPeriod)
    } catch (err: any) {
      Logger.warn('[IPC] createChat error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-chat', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.deleteChat(accountId, chatId)
    } catch (err: any) {
      Logger.warn('[IPC] deleteChat error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:messages:check-url-auth-match-code', async (_event, { accountId, url, matchCode }) => {
    try {
      return await accountManager.checkUrlAuthMatchCode(accountId, url, matchCode)
    } catch (err: any) {
      Logger.warn('[IPC] checkUrlAuthMatchCode error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 035)
  ipcMain.handle('telegram:messages:compose-message-with-ai', async (_event, { accountId, options }) => {
    try {
      return await accountManager.composeMessageWithAI(accountId, options)
    } catch (err: any) {
      Logger.warn('[IPC] composeMessageWithAI error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:compose-rich-message-with-ai', async (_event, { accountId, options }) => {
    try {
      return await accountManager.composeRichMessageWithAI(accountId, options)
    } catch (err: any) {
      Logger.warn('[IPC] composeRichMessageWithAI error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:decline-url-auth', async (_event, { accountId, url }) => {
    try {
      return await accountManager.declineUrlAuth(accountId, url)
    } catch (err: any) {
      Logger.warn('[IPC] declineUrlAuth error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-chat-user', async (_event, { accountId, chatId, userId, revokeHistory }) => {
    try {
      return await accountManager.deleteChatUser(accountId, chatId, userId, revokeHistory)
    } catch (err: any) {
      Logger.warn('[IPC] deleteChatUser error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 036)
  ipcMain.handle('telegram:messages:delete-exported-chat-invite', async (_event, { accountId, peerId, link }) => {
    try {
      return await accountManager.deleteExportedChatInvite(accountId, peerId, link)
    } catch (err: any) {
      Logger.warn('[IPC] deleteExportedChatInvite error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-fact-check', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.deleteFactCheck(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn('[IPC] deleteFactCheck error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-participant-reaction', async (_event, { accountId, peerId, msgId, participantId }) => {
    try {
      return await accountManager.deleteParticipantReaction(accountId, peerId, msgId, participantId)
    } catch (err: any) {
      Logger.warn('[IPC] deleteParticipantReaction error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-participant-reactions', async (_event, { accountId, peerId, participantId }) => {
    try {
      return await accountManager.deleteParticipantReactions(accountId, peerId, participantId)
    } catch (err: any) {
      Logger.warn('[IPC] deleteParticipantReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-phone-call-history', async (_event, { accountId, revoke }) => {
    try {
      return await accountManager.deletePhoneCallHistory(accountId, revoke)
    } catch (err: any) {
      Logger.warn('[IPC] deletePhoneCallHistory error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 037)
  ipcMain.handle('telegram:messages:delete-poll-answer', async (_event, { accountId, peerId, msgId, option }) => {
    try {
      return await accountManager.deletePollAnswer(accountId, peerId, msgId, option)
    } catch (err: any) {
      Logger.warn('[IPC] deletePollAnswer error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-quick-reply-messages', async (_event, { accountId, shortcutId, id }) => {
    try {
      return await accountManager.deleteQuickReplyMessages(accountId, shortcutId, id)
    } catch (err: any) {
      Logger.warn('[IPC] deleteQuickReplyMessages error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-revoked-exported-chat-invites', async (_event, { accountId, peerId, adminId }) => {
    try {
      return await accountManager.deleteRevokedExportedChatInvites(accountId, peerId, adminId)
    } catch (err: any) {
      Logger.warn('[IPC] deleteRevokedExportedChatInvites error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-saved-history', async (_event, { accountId, options }) => {
    try {
      return await accountManager.deleteSavedHistory(accountId, options)
    } catch (err: any) {
      Logger.warn('[IPC] deleteSavedHistory error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:delete-topic-history', async (_event, { accountId, peerId, topMsgId }) => {
    try {
      return await accountManager.deleteTopicHistory(accountId, peerId, topMsgId)
    } catch (err: any) {
      Logger.warn('[IPC] deleteTopicHistory error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 038)
  ipcMain.handle('telegram:messages:edit-chat-about', async (_event, { accountId, peerId, about }) => {
    try {
      return await accountManager.editChatAbout(accountId, peerId, about)
    } catch (err: any) {
      Logger.warn('[IPC] editChatAbout error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-chat-admin', async (_event, { accountId, chatId, userId, isAdmin }) => {
    try {
      return await accountManager.editChatAdmin(accountId, chatId, userId, isAdmin)
    } catch (err: any) {
      Logger.warn('[IPC] editChatAdmin error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-chat-creator', async (_event, { accountId, peerId, userId, password }) => {
    try {
      return await accountManager.editChatCreator(accountId, peerId, userId, password)
    } catch (err: any) {
      Logger.warn('[IPC] editChatCreator error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-chat-default-banned-rights', async (_event, { accountId, peerId, bannedRights }) => {
    try {
      return await accountManager.editChatDefaultBannedRights(accountId, peerId, bannedRights)
    } catch (err: any) {
      Logger.warn('[IPC] editChatDefaultBannedRights error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-chat-participant-rank', async (_event, { accountId, peerId, participantId, rank }) => {
    try {
      return await accountManager.editChatParticipantRank(accountId, peerId, participantId, rank)
    } catch (err: any) {
      Logger.warn('[IPC] editChatParticipantRank error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-chat-photo', async (_event, { accountId, chatId, photo }) => {
    try {
      return await accountManager.editChatPhoto(accountId, chatId, photo)
    } catch (err: any) {
      Logger.warn('[IPC] editChatPhoto error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 039)
  ipcMain.handle('telegram:messages:edit-chat-title', async (_event, { accountId, chatId, title }) => {
    try {
      return await accountManager.editChatTitle(accountId, chatId, title)
    } catch (err: any) {
      Logger.warn('[IPC] editChatTitle error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-exported-chat-invite', async (_event, { accountId, peerId, link, options }) => {
    try {
      return await accountManager.editExportedChatInvite(accountId, peerId, link, options)
    } catch (err: any) {
      Logger.warn('[IPC] editExportedChatInvite error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-fact-check', async (_event, { accountId, peerId, msgId, text }) => {
    try {
      return await accountManager.editFactCheck(accountId, peerId, msgId, text)
    } catch (err: any) {
      Logger.warn('[IPC] editFactCheck error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-forum-topic', async (_event, { accountId, chatId, topicId, options }) => {
    try {
      return await accountManager.editForumTopic(accountId, chatId, topicId, options || {})
    } catch (err: any) {
      Logger.warn('[IPC] editForumTopic error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-inline-bot-message', async (_event, { accountId, options }) => {
    try {
      return await accountManager.editInlineBotMessage(accountId, options || {})
    } catch (err: any) {
      Logger.warn('[IPC] editInlineBotMessage error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-message', async (_event, { accountId, chatId, messageId, text }) => {
    try {
      return await accountManager.editMessage(accountId, chatId, messageId, text)
    } catch (err: any) {
      Logger.warn('[IPC] editMessage error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:edit-quick-reply-shortcut', async (_event, { accountId, shortcutId, shortcut }) => {
    try {
      return await accountManager.editQuickReplyShortcut(accountId, shortcutId, shortcut)
    } catch (err: any) {
      Logger.warn('[IPC] editQuickReplyShortcut error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 040)
  ipcMain.handle('telegram:messages:export-chat-invite', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.exportChatInvite(accountId, chatId)
    } catch (err: any) {
      Logger.warn('[IPC] exportChatInvite error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:fave-sticker', async (_event, { accountId, id, unfave }) => {
    try {
      return await accountManager.faveSticker(accountId, id, unfave)
    } catch (err: any) {
      Logger.warn('[IPC] faveSticker error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:forward-messages', async (_event, { accountId, fromChatId, toChatId, messageIds, options }) => {
    try {
      return await accountManager.forwardMessages(accountId, fromChatId, toChatId, messageIds, options)
    } catch (err: any) {
      Logger.warn('[IPC] forwardMessages error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-admins-with-invites', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getAdminsWithInvites(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] getAdminsWithInvites error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-all-drafts', async (_event, { accountId }) => {
    try {
      return await accountManager.getAllDrafts(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] getAllDrafts error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-all-stickers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getAllStickersRaw(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getAllStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-archived-stickers', async (_event, { accountId, options }) => {
    try {
      return await accountManager.getArchivedStickers(accountId, options || {})
    } catch (err: any) {
      Logger.warn('[IPC] getArchivedStickers error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 041)
  ipcMain.handle('telegram:messages:get-attach-menu-bot', async (_event, { accountId, botId }) => {
    try {
      return await accountManager.getAttachMenuBot(accountId, botId)
    } catch (err: any) {
      Logger.warn('[IPC] getAttachMenuBot error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-attach-menu-bots', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getAttachMenuBots(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getAttachMenuBots error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-attached-stickers', async (_event, { accountId, media }) => {
    try {
      return await accountManager.getAttachedStickers(accountId, media)
    } catch (err: any) {
      Logger.warn('[IPC] getAttachedStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-available-effects', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getAvailableEffects(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getAvailableEffects error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-available-reactions', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getAvailableReactions(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getAvailableReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-bot-app', async (_event, { accountId, app, hash }) => {
    try {
      return await accountManager.getBotApp(accountId, app, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getBotApp error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-bot-callback-answer', async (_event, { accountId, options }) => {
    try {
      return await accountManager.getBotCallbackAnswerDirect(accountId, options || {})
    } catch (err: any) {
      Logger.warn('[IPC] getBotCallbackAnswer error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 042)
  ipcMain.handle('telegram:messages:get-chat-invite-importers', async (_event, { accountId, options }) => {
    try {
      return await accountManager.getChatInviteImporters(accountId, options || {})
    } catch (err: any) {
      Logger.warn('[IPC] getChatInviteImporters error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-chats', async (_event, { accountId, id }) => {
    try {
      return await accountManager.getChatsRaw(accountId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getChats error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-common-chats', async (_event, { accountId, userId, limit }) => {
    try {
      return await accountManager.getCommonChats(accountId, userId, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getCommonChats error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:messages:get-custom-emoji-documents', async (_event, { accountId, documentId }) => {
    try {
      return await accountManager.getCustomEmojiDocumentsRaw(accountId, documentId)
    } catch (err: any) {
      Logger.warn('[IPC] getCustomEmojiDocuments error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-default-history-ttl', async (_event, { accountId }) => {
    try {
      return await accountManager.getDefaultHistoryTTL(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] getDefaultHistoryTTL error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-default-tag-reactions', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getDefaultTagReactions(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getDefaultTagReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-dh-config', async (_event, { accountId, version, randomLength }) => {
    try {
      return await accountManager.getDhConfig(accountId, version, randomLength)
    } catch (err: any) {
      Logger.warn('[IPC] getDhConfig error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 043)
  ipcMain.handle('telegram:messages:get-dialog-filters', async (_event, { accountId }) => {
    try {
      return await accountManager.getDialogFiltersRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] getDialogFilters error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-dialog-unread-marks', async (_event, { accountId, parentPeerId }) => {
    try {
      return await accountManager.getDialogUnreadMarks(accountId, parentPeerId)
    } catch (err: any) {
      Logger.warn('[IPC] getDialogUnreadMarks error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-document-by-hash', async (_event, { accountId, sha256, size, mimeType }) => {
    try {
      return await accountManager.getDocumentByHash(accountId, sha256, size, mimeType)
    } catch (err: any) {
      Logger.warn('[IPC] getDocumentByHash error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-game-info', async (_event, { accountId, params }) => {
    try {
      return await accountManager.getEmojiGameInfo(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiGameInfo error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-groups', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getEmojiGroups(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiGroups error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 044)
  ipcMain.handle('telegram:messages:get-emoji-keywords', async (_event, { accountId, langCode }) => {
    try {
      return await accountManager.getEmojiKeywords(accountId, langCode)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiKeywords error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-keywords-difference', async (_event, { accountId, langCode, fromVersion }) => {
    try {
      return await accountManager.getEmojiKeywordsDifference(accountId, langCode, fromVersion)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiKeywordsDifference error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-keywords-languages', async (_event, { accountId, langCodes }) => {
    try {
      return await accountManager.getEmojiKeywordsLanguages(accountId, langCodes)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiKeywordsLanguages error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-profile-photo-groups', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getEmojiProfilePhotoGroups(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiProfilePhotoGroups error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-status-groups', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getEmojiStatusGroups(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiStatusGroups error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-sticker-groups', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getEmojiStickerGroups(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiStickerGroups error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-emoji-stickers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getEmojiStickersRaw(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiStickers error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 045)
  ipcMain.handle('telegram:messages:get-emoji-url', async (_event, { accountId, langCode }) => {
    try {
      return await accountManager.getEmojiURL(accountId, langCode)
    } catch (err: any) {
      Logger.warn('[IPC] getEmojiURL error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-exported-chat-invite', async (_event, { accountId, peerId, link }) => {
    try {
      return await accountManager.getExportedChatInvite(accountId, peerId, link)
    } catch (err: any) {
      Logger.warn('[IPC] getExportedChatInvite error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-exported-chat-invites', async (_event, { accountId, revoked, peerId, adminIdId, offsetDate, offsetLink, limit }) => {
    try {
      return await accountManager.getExportedChatInvitesRaw(accountId, revoked, peerId, adminIdId, offsetDate, offsetLink, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getExportedChatInvites error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-extended-media', async (_event, { accountId, peerId, id }) => {
    try {
      return await accountManager.getExtendedMedia(accountId, peerId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getExtendedMedia error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-fact-check', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.getFactCheck(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn('[IPC] getFactCheck error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-faved-stickers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getFavedStickers(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getFavedStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-featured-emoji-stickers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getFeaturedEmojiStickers(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getFeaturedEmojiStickers error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 046)
  ipcMain.handle('telegram:messages:get-featured-stickers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getFeaturedStickers(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getFeaturedStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-forum-topics', async (_event, { accountId, peerId, q, offsetDate, offsetId, offsetTopic, limit }) => {
    try {
      return await accountManager.getForumTopicsRaw(accountId, peerId, q, offsetDate, offsetId, offsetTopic, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getForumTopics error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-forum-topics-by-id', async (_event, { accountId, peerId, topics }) => {
    try {
      return await accountManager.getForumTopicsByID(accountId, peerId, topics)
    } catch (err: any) {
      Logger.warn('[IPC] getForumTopicsByID error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-full-chat', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.getFullChat(accountId, chatId)
    } catch (err: any) {
      Logger.warn('[IPC] getFullChat error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-future-chat-creator-after-leave', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getFutureChatCreatorAfterLeave(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] getFutureChatCreatorAfterLeave error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-game-high-scores', async (_event, { accountId, peerId, id, userIdId }) => {
    try {
      return await accountManager.getGameHighScoresRaw(accountId, peerId, id, userIdId)
    } catch (err: any) {
      Logger.warn('[IPC] getGameHighScores error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-history', async (_event, { accountId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash }) => {
    try {
      return await accountManager.getHistoryRaw(accountId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getHistory error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 047)
  ipcMain.handle('telegram:messages:get-inline-bot-results', async (_event, { accountId, botId, peerId, geoPoint, query, offset }) => {
    try {
      return await accountManager.getInlineBotResultsRaw(accountId, botId, peerId, geoPoint, query, offset)
    } catch (err: any) {
      Logger.warn('[IPC] getInlineBotResults error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-inline-game-high-scores', async (_event, { accountId, id, userIdId }) => {
    try {
      return await accountManager.getInlineGameHighScores(accountId, id, userIdId)
    } catch (err: any) {
      Logger.warn('[IPC] getInlineGameHighScores error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-mask-stickers', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getMaskStickers(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getMaskStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-message-edit-data', async (_event, { accountId, peerId, id }) => {
    try {
      return await accountManager.getMessageEditData(accountId, peerId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getMessageEditData error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-message-reactions-list', async (_event, { accountId, peerId, id, reaction, offset, limit }) => {
    try {
      return await accountManager.getMessageReactionsListRaw(accountId, peerId, id, reaction, offset, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getMessageReactionsList error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-message-read-participants', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.getMessageReadParticipants(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn('[IPC] getMessageReadParticipants error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-messages', async (_event, { accountId, id }) => {
    try {
      return await accountManager.getMessagesRaw(accountId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getMessages error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 048)
  ipcMain.handle('telegram:messages:get-messages-reactions', async (_event, { accountId, peerId, id }) => {
    try {
      return await accountManager.getMessagesReactions(accountId, peerId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getMessagesReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-messages-views', async (_event, { accountId, peerId, id, increment }) => {
    try {
      return await accountManager.getMessagesViews(accountId, peerId, id, increment)
    } catch (err: any) {
      Logger.warn('[IPC] getMessagesViews error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-my-stickers', async (_event, { accountId, offsetId, limit }) => {
    try {
      return await accountManager.getMyStickers(accountId, offsetId, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getMyStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-old-featured-stickers', async (_event, { accountId, offset, limit, hash }) => {
    try {
      return await accountManager.getOldFeaturedStickers(accountId, offset, limit, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getOldFeaturedStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-onlines', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getOnlines(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] getOnlines error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-outbox-read-date', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.getOutboxReadDate(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn('[IPC] getOutboxReadDate error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-paid-reaction-privacy', async (_event, { accountId, params }) => {
    try {
      return await accountManager.getPaidReactionPrivacy(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] getPaidReactionPrivacy error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 049)
  ipcMain.handle('telegram:messages:get-peer-dialogs', async (_event, { accountId, peers }) => {
    try {
      return await accountManager.getPeerDialogs(accountId, peers)
    } catch (err: any) {
      Logger.warn('[IPC] getPeerDialogs error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-peer-settings', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getPeerSettings(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] getPeerSettings error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-personal-channel-history', async (_event, { accountId, userIdId, limit, maxId, minId, hash }) => {
    try {
      return await accountManager.getPersonalChannelHistory(accountId, userIdId, limit, maxId, minId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getPersonalChannelHistory error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-pinned-dialogs', async (_event, { accountId, folderId }) => {
    try {
      return await accountManager.getPinnedDialogs(accountId, folderId)
    } catch (err: any) {
      Logger.warn('[IPC] getPinnedDialogs error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-pinned-saved-dialogs', async (_event, { accountId, params }) => {
    try {
      return await accountManager.getPinnedSavedDialogs(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] getPinnedSavedDialogs error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-poll-results', async (_event, { accountId, peerId, msgId, pollHash }) => {
    try {
      return await accountManager.getPollResults(accountId, peerId, msgId, pollHash)
    } catch (err: any) {
      Logger.warn('[IPC] getPollResults error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-poll-votes', async (_event, { accountId, peerId, id, option, offset, limit }) => {
    try {
      return await accountManager.getPollVotes(accountId, peerId, id, option, offset, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getPollVotes error:', err)
      return null
    }
  })

  // Layer 232 Messages Suite (Microphase 050)
  ipcMain.handle('telegram:messages:get-prepared-inline-message', async (_event, { accountId, botId, id }) => {
    try {
      return await accountManager.getPreparedInlineMessage(accountId, botId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getPreparedInlineMessage error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-quick-replies', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getQuickRepliesRaw(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getQuickReplies error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-quick-reply-messages', async (_event, { accountId, shortcutId, id, hash }) => {
    try {
      return await accountManager.getQuickReplyMessages(accountId, shortcutId, id, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getQuickReplyMessages error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-recent-locations', async (_event, { accountId, peerId, limit, hash }) => {
    try {
      return await accountManager.getRecentLocationsRaw(accountId, peerId, limit, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getRecentLocations error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-recent-reactions', async (_event, { accountId, limit, hash }) => {
    try {
      return await accountManager.getRecentReactions(accountId, limit, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getRecentReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-recent-stickers', async (_event, { accountId, attached, hash }) => {
    try {
      return await accountManager.getRecentStickersRaw(accountId, attached, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getRecentStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-replies', async (_event, { accountId, peerId, msgId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash }) => {
    try {
      return await accountManager.getReplies(accountId, peerId, msgId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getReplies error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-rich-message', async (_event, { accountId, peerId, id }) => {
    try {
      return await accountManager.getRichMessage(accountId, peerId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getRichMessage error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-saved-dialogs', async (_event, { accountId, excludePinned, parentPeerId, offsetDate, offsetId, offsetPeerId, limit, hash }) => {
    try {
      return await accountManager.getSavedDialogsRaw(accountId, excludePinned, parentPeerId, offsetDate, offsetId, offsetPeerId, limit, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getSavedDialogs error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-saved-dialogs-by-id', async (_event, { accountId, parentPeerId, ids }) => {
    try {
      return await accountManager.getSavedDialogsByID(accountId, parentPeerId, ids)
    } catch (err: any) {
      Logger.warn('[IPC] getSavedDialogsByID error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-saved-gifs', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.getSavedGifsRaw(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getSavedGifs error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-saved-history', async (_event, { accountId, parentPeerId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash }) => {
    try {
      return await accountManager.getSavedHistory(accountId, parentPeerId, peerId, offsetId, offsetDate, addOffset, limit, maxId, minId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getSavedHistory error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-saved-reaction-tags', async (_event, { accountId, peerId, hash }) => {
    try {
      return await accountManager.getSavedReactionTagsRaw(accountId, peerId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getSavedReactionTags error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-scheduled-history', async (_event, { accountId, peerId, hash }) => {
    try {
      return await accountManager.getScheduledHistory(accountId, peerId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getScheduledHistory error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-scheduled-messages', async (_event, { accountId, peerId, id }) => {
    try {
      return await accountManager.getScheduledMessagesRaw(accountId, peerId, id)
    } catch (err: any) {
      Logger.warn('[IPC] getScheduledMessages error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-search-counters', async (_event, { accountId, peerId, savedPeerIdId, topMsgId, filters }) => {
    try {
      return await accountManager.getSearchCounters(accountId, peerId, savedPeerIdId, topMsgId, filters)
    } catch (err: any) {
      Logger.warn('[IPC] getSearchCounters error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-search-results-calendar', async (_event, { accountId, peerId, savedPeerIdId, filter, offsetId, offsetDate }) => {
    try {
      return await accountManager.getSearchResultsCalendar(accountId, peerId, savedPeerIdId, filter, offsetId, offsetDate)
    } catch (err: any) {
      Logger.warn('[IPC] getSearchResultsCalendar error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-search-results-positions', async (_event, { accountId, peerId, savedPeerIdId, filter, offsetId, limit }) => {
    try {
      return await accountManager.getSearchResultsPositions(accountId, peerId, savedPeerIdId, filter, offsetId, limit)
    } catch (err: any) {
      Logger.warn('[IPC] getSearchResultsPositions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-share-theme-backdrops', async (_event, { accountId, params }) => {
    try {
      return await accountManager.getShareThemeBackdrops(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] getShareThemeBackdrops error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-split-ranges', async (_event, { accountId, params }) => {
    try {
      return await accountManager.getSplitRanges(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] getSplitRanges error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-sponsored-messages', async (_event, { accountId, peerId, msgId }) => {
    try {
      return await accountManager.getSponsoredMessagesRaw(accountId, peerId, msgId)
    } catch (err: any) {
      Logger.warn('[IPC] getSponsoredMessages error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-stickers', async (_event, { accountId, emoticon, hash }) => {
    try {
      return await accountManager.getStickersRaw(accountId, emoticon, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-sticker-set', async (_event, { accountId, stickerset, hash }) => {
    try {
      return await accountManager.getStickerSetRaw(accountId, stickerset, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getStickerSet error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-suggested-dialog-filters', async (_event, { accountId, params }) => {
    try {
      return await accountManager.getSuggestedDialogFiltersRaw(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] getSuggestedDialogFilters error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-top-reactions', async (_event, { accountId, limit, hash }) => {
    try {
      return await accountManager.getTopReactions(accountId, limit, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getTopReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-unread-mentions', async (_event, { accountId, peerId, topMsgId, offsetId, addOffset, limit, maxId, minId }) => {
    try {
      return await accountManager.getUnreadMentions(accountId, peerId, topMsgId, offsetId, addOffset, limit, maxId, minId)
    } catch (err: any) {
      Logger.warn('[IPC] getUnreadMentions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-unread-poll-votes', async (_event, { accountId, peerId, topMsgId, offsetId, addOffset, limit, maxId, minId }) => {
    try {
      return await accountManager.getUnreadPollVotes(accountId, peerId, topMsgId, offsetId, addOffset, limit, maxId, minId)
    } catch (err: any) {
      Logger.warn('[IPC] getUnreadPollVotes error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-unread-reactions', async (_event, { accountId, peerId, topMsgId, savedPeerIdId, offsetId, addOffset, limit, maxId, minId }) => {
    try {
      return await accountManager.getUnreadReactions(accountId, peerId, topMsgId, savedPeerIdId, offsetId, addOffset, limit, maxId, minId)
    } catch (err: any) {
      Logger.warn('[IPC] getUnreadReactions error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-web-page', async (_event, { accountId, url, hash }) => {
    try {
      return await accountManager.getWebPageRaw(accountId, url, hash)
    } catch (err: any) {
      Logger.warn('[IPC] getWebPage error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:get-web-page-preview', async (_event, { accountId, message, entities }) => {
    try {
      return await accountManager.getWebPagePreviewRaw(accountId, message, entities)
    } catch (err: any) {
      Logger.warn('[IPC] getWebPagePreview error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:hide-all-chat-join-requests', async (_event, { accountId, approved, peerId, link }) => {
    try {
      return await accountManager.hideAllChatJoinRequestsRaw(accountId, approved, peerId, link)
    } catch (err: any) {
      Logger.warn('[IPC] hideAllChatJoinRequests error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:hide-chat-join-request', async (_event, { accountId, approved, peerId, userIdId }) => {
    try {
      return await accountManager.hideChatJoinRequestRaw(accountId, approved, peerId, userIdId)
    } catch (err: any) {
      Logger.warn('[IPC] hideChatJoinRequest error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:import-chat-invite', async (_event, { accountId, hash }) => {
    try {
      return await accountManager.importChatInvite(accountId, hash)
    } catch (err: any) {
      Logger.warn('[IPC] importChatInvite error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:init-history-import', async (_event, { accountId, peerId, file, mediaCount }) => {
    try {
      return await accountManager.initHistoryImport(accountId, peerId, file, mediaCount)
    } catch (err: any) {
      Logger.warn('[IPC] initHistoryImport error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:install-sticker-set', async (_event, { accountId, stickerset, archived }) => {
    try {
      return await accountManager.installStickerSetRaw(accountId, stickerset, archived)
    } catch (err: any) {
      Logger.warn('[IPC] installStickerSet error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:hide-peer-settings-bar', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.hidePeerSettingsBar(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] hidePeerSettingsBar error:', err)
      return null
    }
  })

  // Microphase 055 IPC Handlers
  ipcMain.handle('telegram:messages:mark-dialog-unread-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.markDialogUnreadRaw(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] markDialogUnreadRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:migrate-chat', async (_event, { accountId, chatId }) => {
    try {
      return await accountManager.migrateChatRaw(accountId, chatId)
    } catch (err: any) {
      Logger.warn('[IPC] migrateChat error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:prolong-web-view', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.prolongWebViewRaw(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] prolongWebView error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:rate-transcribed-audio', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.rateTranscribedAudioRaw(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] rateTranscribedAudio error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-discussion', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readDiscussionRaw(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] readDiscussion error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-encrypted-history', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readEncryptedHistoryRaw(accountId, params)
    } catch (err: any) {
      Logger.warn('[IPC] readEncryptedHistory error:', err)
      return null
    }
  })

  // Microphase 056 IPC Handlers
  ipcMain.handle('telegram:messages:read-featured-stickers', async (_event, { accountId, id }) => {
    try {
      return await accountManager.readFeaturedStickersRaw(accountId, id)
    } catch (err: any) {
      Logger.warn('[IPC] readFeaturedStickers error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-history-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readHistoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] readHistoryRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-mentions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readMentionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] readMentionsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-message-contents-raw', async (_event, { accountId, id }) => {
    try {
      return await accountManager.readMessageContentsRaw(accountId, id)
    } catch (err: any) {
      Logger.warn('[IPC] readMessageContentsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-poll-votes-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readPollVotesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] readPollVotesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-reactions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readReactionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] readReactionsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:read-saved-history-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.readSavedHistoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] readSavedHistoryRaw error:', err)
      return null
    }
  })

  // Microphase 057 IPC Handlers
  ipcMain.handle('telegram:messages:received-messages-raw', async (_event, { accountId, maxId }) => {
    try {
      return await accountManager.receivedMessagesRaw(accountId, maxId)
    } catch (err: any) {
      Logger.warn('[IPC] receivedMessagesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:received-queue-raw', async (_event, { accountId, maxQts }) => {
    try {
      return await accountManager.receivedQueueRaw(accountId, maxQts)
    } catch (err: any) {
      Logger.warn('[IPC] receivedQueueRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:reorder-pinned-dialogs-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reorderPinnedDialogsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reorderPinnedDialogsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:reorder-pinned-forum-topics-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reorderPinnedForumTopicsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reorderPinnedForumTopicsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:reorder-pinned-saved-dialogs-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reorderPinnedSavedDialogsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reorderPinnedSavedDialogsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:reorder-quick-replies-raw', async (_event, { accountId, order }) => {
    try {
      return await accountManager.reorderQuickRepliesRaw(accountId, order)
    } catch (err: any) {
      Logger.warn('[IPC] reorderQuickRepliesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:reorder-sticker-sets-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reorderStickerSetsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reorderStickerSetsRaw error:', err)
      return null
    }
  })

  // Microphase 058 IPC Handlers
  ipcMain.handle('telegram:messages:report-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reportRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reportRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:report-encrypted-spam-raw', async (_event, { accountId, peer }) => {
    try {
      return await accountManager.reportEncryptedSpamRaw(accountId, peer)
    } catch (err: any) {
      Logger.warn('[IPC] reportEncryptedSpamRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:report-messages-delivery-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reportMessagesDeliveryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reportMessagesDeliveryRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:report-music-listen-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reportMusicListenRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reportMusicListenRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:report-reaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reportReactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reportReactionRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:report-read-metrics-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reportReadMetricsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reportReadMetricsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:report-spam-raw', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.reportSpamRaw(accountId, peerId)
    } catch (err: any) {
      Logger.warn('[IPC] reportSpamRaw error:', err)
      return null
    }
  })

  // Microphase 059 IPC Handlers
  ipcMain.handle('telegram:messages:report-sponsored-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.reportSponsoredMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] reportSponsoredMessageRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:request-app-web-view-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestAppWebViewRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestAppWebViewRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:request-chat-join-web-view-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestChatJoinWebViewRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestChatJoinWebViewRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:request-encryption-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestEncryptionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestEncryptionRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:request-main-web-view-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestMainWebViewRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestMainWebViewRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:request-simple-web-view-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestSimpleWebViewRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestSimpleWebViewRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:request-url-auth-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestUrlAuthRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestUrlAuthRaw error:', err)
      return null
    }
  })

  // Microphase 060 IPC Handlers
  ipcMain.handle('telegram:messages:request-web-view-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.requestWebViewRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] requestWebViewRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:save-default-send-as-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.saveDefaultSendAsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] saveDefaultSendAsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:save-draft-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.saveDraftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] saveDraftRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:save-gif-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.saveGifRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] saveGifRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:save-prepared-inline-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.savePreparedInlineMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] savePreparedInlineMessageRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:save-recent-sticker-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.saveRecentStickerRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] saveRecentStickerRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:search-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchMessagesRaw error:', err)
      return null
    }
  })

  // Microphase 061 IPC Handlers
  ipcMain.handle('telegram:messages:search-custom-emoji-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchCustomEmojiRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchCustomEmojiRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:search-emoji-sticker-sets-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchEmojiStickerSetsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchEmojiStickerSetsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:search-global-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchGlobalRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchGlobalRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:search-sent-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchSentMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchSentMediaRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:search-sticker-sets-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchStickerSetsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchStickerSetsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:search-stickers-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.searchStickersRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] searchStickersRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-bot-requested-peer-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendBotRequestedPeerRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendBotRequestedPeerRaw error:', err)
      return null
    }
  })

  // Microphase 062 IPC Handlers
  ipcMain.handle('telegram:messages:send-encrypted-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendEncryptedRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendEncryptedRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-encrypted-file-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendEncryptedFileRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendEncryptedFileRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-encrypted-service-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendEncryptedServiceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendEncryptedServiceRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-inline-bot-result-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendInlineBotResultRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendInlineBotResultRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendMediaRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendMessageRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-multi-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendMultiMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendMultiMediaRaw error:', err)
      return null
    }
  })

  // Microphase 063 IPC Handlers
  ipcMain.handle('telegram:messages:send-paid-reaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendPaidReactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendPaidReactionRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-quick-reply-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendQuickReplyMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendQuickReplyMessagesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-reaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendReactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendReactionRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-scheduled-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendScheduledMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendScheduledMessagesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-screenshot-notification-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendScreenshotNotificationRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendScreenshotNotificationRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-vote-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendVoteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendVoteRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:send-web-view-data-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendWebViewDataRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendWebViewDataRaw error:', err)
      return null
    }
  })

  // Microphase 064 IPC Handlers
  ipcMain.handle('telegram:messages:send-web-view-result-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.sendWebViewResultMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] sendWebViewResultMessageRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-bot-callback-answer-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setBotCallbackAnswerRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setBotCallbackAnswerRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-bot-guest-chat-result-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setBotGuestChatResultRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setBotGuestChatResultRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-bot-precheckout-results-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setBotPrecheckoutResultsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setBotPrecheckoutResultsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-bot-shipping-results-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setBotShippingResultsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setBotShippingResultsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-chat-available-reactions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setChatAvailableReactionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setChatAvailableReactionsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-chat-theme-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setChatThemeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setChatThemeRaw error:', err)
      return null
    }
  })

  // Microphase 065 IPC Handlers
  ipcMain.handle('telegram:messages:set-chat-wall-paper-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setChatWallPaperRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setChatWallPaperRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-default-history-ttl-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setDefaultHistoryTTLRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setDefaultHistoryTTLRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-default-reaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setDefaultReactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setDefaultReactionRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-encrypted-typing-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setEncryptedTypingRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setEncryptedTypingRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-game-score-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setGameScoreRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setGameScoreRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-history-ttl-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setHistoryTTLRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setHistoryTTLRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-inline-bot-results-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setInlineBotResultsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setInlineBotResultsRaw error:', err)
      return null
    }
  })

  // Microphase 066 IPC Handlers
  ipcMain.handle('telegram:messages:set-inline-game-score-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setInlineGameScoreRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setInlineGameScoreRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-share-theme-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setShareThemeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setShareThemeRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:set-typing-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.setTypingRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] setTypingRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:start-bot-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.startBotRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] startBotRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:start-history-import-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.startHistoryImportRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] startHistoryImportRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:summarize-text-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.summarizeTextRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] summarizeTextRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-bot-in-attach-menu-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleBotInAttachMenuRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleBotInAttachMenuRaw error:', err)
      return null
    }
  })

  // Microphase 067 IPC Handlers
  ipcMain.handle('telegram:messages:toggle-dialog-filter-tags-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleDialogFilterTagsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleDialogFilterTagsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-dialog-pin-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleDialogPinRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleDialogPinRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-no-forwards-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleNoForwardsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleNoForwardsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-paid-reaction-privacy-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.togglePaidReactionPrivacyRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] togglePaidReactionPrivacyRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-peer-translations-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.togglePeerTranslationsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] togglePeerTranslationsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-saved-dialog-pin-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleSavedDialogPinRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleSavedDialogPinRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-sticker-sets-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleStickerSetsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleStickerSetsRaw error:', err)
      return null
    }
  })

  // Microphase 068 IPC Handlers
  ipcMain.handle('telegram:messages:toggle-suggested-post-approval-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleSuggestedPostApprovalRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleSuggestedPostApprovalRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:toggle-todo-completed-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toggleTodoCompletedRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toggleTodoCompletedRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:transcribe-audio-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.transcribeAudioRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] transcribeAudioRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:translate-rich-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.translateRichMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] translateRichMessageRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:translate-text-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.translateTextRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] translateTextRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:uninstall-sticker-set-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uninstallStickerSetRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uninstallStickerSetRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:unpin-all-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.unpinAllMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] unpinAllMessagesRaw error:', err)
      return null
    }
  })

  // Microphase 069 IPC Handlers
  ipcMain.handle('telegram:messages:update-dialog-filter-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updateDialogFilterRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updateDialogFilterRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:update-dialog-filters-order-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updateDialogFiltersOrderRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updateDialogFiltersOrderRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:update-pinned-forum-topic-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updatePinnedForumTopicRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updatePinnedForumTopicRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:update-pinned-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updatePinnedMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updatePinnedMessageRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:update-saved-reaction-tag-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updateSavedReactionTagRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updateSavedReactionTagRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:upload-encrypted-file-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadEncryptedFileRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadEncryptedFileRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:upload-imported-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadImportedMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadImportedMediaRaw error:', err)
      return null
    }
  })

  // Microphase 070 IPC Handlers (Messages Domain Part 38 - Final)
  ipcMain.handle('telegram:messages:upload-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadMediaRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:messages:view-sponsored-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.viewSponsoredMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] viewSponsoredMessageRaw error:', err)
      return null
    }
  })

  // Microphase 071 IPC Handlers (Updates Domain Part 1)
  ipcMain.handle('telegram:updates:get-state-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.updatesGetStateRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] updatesGetStateRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:updates:get-difference-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updatesGetDifferenceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updatesGetDifferenceRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:updates:get-channel-difference-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.updatesGetChannelDifferenceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] updatesGetChannelDifferenceRaw error:', err)
      return null
    }
  })

  // Microphase 072 IPC Handlers (Photos Domain Part 1)
  ipcMain.handle('telegram:photos:update-profile-photo-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.photosUpdateProfilePhotoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] photosUpdateProfilePhotoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:photos:upload-profile-photo-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.photosUploadProfilePhotoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] photosUploadProfilePhotoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:photos:delete-photos-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.photosDeletePhotosRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] photosDeletePhotosRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:photos:get-user-photos-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.photosGetUserPhotosRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] photosGetUserPhotosRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:photos:upload-contact-profile-photo-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.photosUploadContactProfilePhotoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] photosUploadContactProfilePhotoRaw error:', err)
      return null
    }
  })

  // Microphase 073 IPC Handlers (Upload Domain Part 1)
  ipcMain.handle('telegram:upload:get-file-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadGetFileRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadGetFileRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:upload:save-big-file-part-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadSaveBigFilePartRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadSaveBigFilePartRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:upload:get-web-file-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadGetWebFileRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadGetWebFileRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:upload:get-cdn-file-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadGetCdnFileRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadGetCdnFileRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:upload:reupload-cdn-file-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadReuploadCdnFileRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadReuploadCdnFileRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:upload:get-cdn-file-hashes-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadGetCdnFileHashesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadGetCdnFileHashesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:upload:get-file-hashes-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadGetFileHashesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadGetFileHashesRaw error:', err)
      return null
    }
  })

  // Microphase 074 IPC Handler (Upload Domain Part 2)
  ipcMain.handle('telegram:upload:save-file-part-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.uploadSaveFilePartRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] uploadSaveFilePartRaw error:', err)
      return null
    }
  })

  // Microphase 075 IPC Handlers (Help Domain Part 1)
  ipcMain.handle('telegram:help:accept-terms-of-service-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpAcceptTermsOfServiceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpAcceptTermsOfServiceRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:dismiss-suggestion-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpDismissSuggestionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpDismissSuggestionRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:edit-user-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpEditUserInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpEditUserInfoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-app-config-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetAppConfigRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetAppConfigRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-app-update-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetAppUpdateRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetAppUpdateRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-cdn-config-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetCdnConfigRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetCdnConfigRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-config-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetConfigRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetConfigRaw error:', err)
      return null
    }
  })

  // Microphase 076 IPC Handlers (Help Domain Part 2)
  ipcMain.handle('telegram:help:get-countries-list-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetCountriesListRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetCountriesListRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-deep-link-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetDeepLinkInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetDeepLinkInfoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-invite-text-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetInviteTextRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetInviteTextRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-nearest-dc-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetNearestDcRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetNearestDcRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-passport-config-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetPassportConfigRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetPassportConfigRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-peer-colors-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetPeerColorsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetPeerColorsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-peer-profile-colors-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetPeerProfileColorsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetPeerProfileColorsRaw error:', err)
      return null
    }
  })

  // Microphase 077 IPC Handlers (Help Domain Part 3)
  ipcMain.handle('telegram:help:get-premium-promo-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetPremiumPromoRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetPremiumPromoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-promo-data-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetPromoDataRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetPromoDataRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-recent-me-urls-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetRecentMeUrlsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetRecentMeUrlsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-support-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetSupportRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetSupportRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-support-name-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetSupportNameRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetSupportNameRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-terms-of-service-update-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.helpGetTermsOfServiceUpdateRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetTermsOfServiceUpdateRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:get-timezones-list-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetTimezonesListRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetTimezonesListRaw error:', err)
      return null
    }
  })

  // Microphase 078 IPC Handlers (Help Domain Part 4)
  ipcMain.handle('telegram:help:get-user-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpGetUserInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpGetUserInfoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:hide-promo-data-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpHidePromoDataRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpHidePromoDataRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:save-app-log-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpSaveAppLogRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpSaveAppLogRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:help:set-bot-updates-status-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.helpSetBotUpdatesStatusRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] helpSetBotUpdatesStatusRaw error:', err)
      return null
    }
  })

  // Microphase 079 IPC Handlers (Channels Domain Part 1)
  ipcMain.handle('telegram:channels:check-search-posts-flood-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsCheckSearchPostsFloodRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsCheckSearchPostsFloodRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:check-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsCheckUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsCheckUsernameRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:convert-to-gigagroup-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsConvertToGigagroupRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsConvertToGigagroupRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:create-channel-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsCreateChannelRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsCreateChannelRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:deactivate-all-usernames-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsDeactivateAllUsernamesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsDeactivateAllUsernamesRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:delete-channel-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsDeleteChannelRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsDeleteChannelRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:delete-history-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsDeleteHistoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsDeleteHistoryRaw error:', err)
      return null
    }
  })

  // Microphase 080 IPC Handlers (Channels Domain Part 2)
  ipcMain.handle('telegram:channels:delete-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsDeleteMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsDeleteMessagesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:delete-participant-history-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsDeleteParticipantHistoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsDeleteParticipantHistoryRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:edit-admin-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsEditAdminRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsEditAdminRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:edit-banned-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsEditBannedRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsEditBannedRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:edit-location-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsEditLocationRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsEditLocationRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:edit-photo-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsEditPhotoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsEditPhotoRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:edit-title-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsEditTitleRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsEditTitleRaw error:', err)
      return null
    }
  })

  // Microphase 081 IPC Handlers (Channels Domain Part 3)
  ipcMain.handle('telegram:channels:export-message-link-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsExportMessageLinkRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsExportMessageLinkRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-admin-log-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetAdminLogRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetAdminLogRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-admined-public-channels-raw', async (_event, { accountId, ...options }) => {
    try {
      return await accountManager.channelsGetAdminedPublicChannelsRaw(accountId, options)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetAdminedPublicChannelsRaw error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:channels:get-channel-recommendations-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetChannelRecommendationsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetChannelRecommendationsRaw error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:channels:get-channels-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetChannelsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetChannelsRaw error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:channels:get-full-channel-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetFullChannelRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetFullChannelRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-groups-for-discussion-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.channelsGetGroupsForDiscussionRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetGroupsForDiscussionRaw error:', err)
      return []
    }
  })

  // Microphase 082 IPC Handlers (Channels Domain Part 4)
  ipcMain.handle('telegram:channels:get-inactive-channels-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.channelsGetInactiveChannelsRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetInactiveChannelsRaw error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:channels:get-left-channels-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetLeftChannelsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetLeftChannelsRaw error:', err)
      return []
    }
  })

  ipcMain.handle('telegram:channels:get-message-author-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetMessageAuthorRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetMessageAuthorRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetMessagesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-participant-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetParticipantRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetParticipantRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-participants-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetParticipantsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetParticipantsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:get-send-as-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsGetSendAsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsGetSendAsRaw error:', err)
      return []
    }
  })

  // Microphase 083 IPC Handlers (Channels Domain Part 5)
  ipcMain.handle('telegram:channels:invite-to-channel-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsInviteToChannelRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsInviteToChannelRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:join-channel-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsJoinChannelRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsJoinChannelRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:leave-channel-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsLeaveChannelRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsLeaveChannelRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:read-history-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsReadHistoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsReadHistoryRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:read-message-contents-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsReadMessageContentsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsReadMessageContentsRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:reorder-usernames-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsReorderUsernamesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsReorderUsernamesRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:report-anti-spam-false-positive-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsReportAntiSpamFalsePositiveRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsReportAntiSpamFalsePositiveRaw error:', err)
      return false
    }
  })

  // Microphase 084 IPC Handlers (Channels Domain Part 6)
  ipcMain.handle('telegram:channels:report-spam-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsReportSpamRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsReportSpamRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:restrict-sponsored-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsRestrictSponsoredMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsRestrictSponsoredMessagesRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:search-posts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsSearchPostsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsSearchPostsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:set-boosts-to-unblock-restrictions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsSetBoostsToUnblockRestrictionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsSetBoostsToUnblockRestrictionsRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:set-discussion-group-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsSetDiscussionGroupRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsSetDiscussionGroupRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:set-emoji-stickers-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsSetEmojiStickersRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsSetEmojiStickersRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:set-main-profile-tab-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsSetMainProfileTabRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsSetMainProfileTabRaw error:', err)
      return false
    }
  })

  // Microphase 085 IPC Handlers (Channels Domain Part 7)
  ipcMain.handle('telegram:channels:set-stickers-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsSetStickersRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsSetStickersRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:toggle-anti-spam-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleAntiSpamRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleAntiSpamRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-autotranslation-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleAutotranslationRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleAutotranslationRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-forum-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleForumRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleForumRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-join-request-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleJoinRequestRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleJoinRequestRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-join-to-send-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleJoinToSendRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleJoinToSendRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-participants-hidden-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleParticipantsHiddenRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleParticipantsHiddenRaw error:', err)
      return null
    }
  })

  // Microphase 086 IPC Handlers (Channels Domain Part 8)
  ipcMain.handle('telegram:channels:toggle-pre-history-hidden-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsTogglePreHistoryHiddenRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsTogglePreHistoryHiddenRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-signatures-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleSignaturesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleSignaturesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-slow-mode-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleSlowModeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleSlowModeRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:toggle-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleUsernameRaw error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:channels:toggle-view-forum-as-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsToggleViewForumAsMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsToggleViewForumAsMessagesRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:update-color-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsUpdateColorRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsUpdateColorRaw error:', err)
      return null
    }
  })

  ipcMain.handle('telegram:channels:update-emoji-status-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsUpdateEmojiStatusRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsUpdateEmojiStatusRaw error:', err)
      return null
    }
  })

  // Microphase 087 IPC Handlers (Channels Domain Part 9 - Final)
  ipcMain.handle('telegram:channels:update-paid-messages-price-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsUpdatePaidMessagesPriceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsUpdatePaidMessagesPriceRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:channels:update-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.channelsUpdateUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] channelsUpdateUsernameRaw error:', err)
      throw err
    }
  })

  // Microphase 088 IPC Handlers (Bots Domain Part 1)
  ipcMain.handle('telegram:bots:add-preview-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsAddPreviewMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsAddPreviewMediaRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:add-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsAddUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsAddUsernameRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:allow-send-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsAllowSendMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsAllowSendMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:answer-webhook-json-query-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsAnswerWebhookJSONQueryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsAnswerWebhookJSONQueryRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:can-send-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsCanSendMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsCanSendMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:check-download-file-params-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsCheckDownloadFileParamsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsCheckDownloadFileParamsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:check-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsCheckUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsCheckUsernameRaw error:', err)
      throw err
    }
  })

  // Microphase 089 IPC Handlers: Bots Domain Suite Part 2 (7 RPCs)
  ipcMain.handle('telegram:bots:create-bot-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsCreateBotRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsCreateBotRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:delete-preview-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsDeletePreviewMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsDeletePreviewMediaRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:edit-access-settings-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsEditAccessSettingsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsEditAccessSettingsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:edit-preview-media-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsEditPreviewMediaRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsEditPreviewMediaRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:export-bot-token-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsExportBotTokenRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsExportBotTokenRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-access-settings-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetAccessSettingsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetAccessSettingsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-admined-bots-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.botsGetAdminedBotsRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetAdminedBotsRaw error:', err)
      throw err
    }
  })

  // Microphase 090 IPC Handlers: Bots Domain Suite Part 3 (7 RPCs)
  ipcMain.handle('telegram:bots:get-bot-commands-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetBotCommandsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetBotCommandsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-bot-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetBotInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetBotInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-bot-menu-button-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetBotMenuButtonRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetBotMenuButtonRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-bot-recommendations-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetBotRecommendationsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetBotRecommendationsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-popular-app-bots-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetPopularAppBotsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetPopularAppBotsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-preview-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetPreviewInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetPreviewInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:get-preview-medias-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetPreviewMediasRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetPreviewMediasRaw error:', err)
      throw err
    }
  })

  // Microphase 091 IPC Handlers: Bots Domain Suite Part 4 (7 RPCs)
  ipcMain.handle('telegram:bots:get-requested-web-view-button-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsGetRequestedWebViewButtonRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsGetRequestedWebViewButtonRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:invoke-web-view-custom-method-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsInvokeWebViewCustomMethodRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsInvokeWebViewCustomMethodRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:remove-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsRemoveUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsRemoveUsernameRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:reorder-preview-medias-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsReorderPreviewMediasRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsReorderPreviewMediasRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:reorder-usernames-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsReorderUsernamesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsReorderUsernamesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:request-web-view-button-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsRequestWebViewButtonRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsRequestWebViewButtonRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:reset-bot-commands-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsResetBotCommandsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsResetBotCommandsRaw error:', err)
      throw err
    }
  })

  // Microphase 092: Bots Domain Suite Part 5 (7 RPCs)
  ipcMain.handle('telegram:bots:send-custom-request-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSendCustomRequestRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSendCustomRequestRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:set-bot-broadcast-default-admin-rights-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetBotBroadcastDefaultAdminRightsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetBotBroadcastDefaultAdminRightsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:set-bot-commands-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetBotCommandsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetBotCommandsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:set-bot-group-default-admin-rights-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetBotGroupDefaultAdminRightsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetBotGroupDefaultAdminRightsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:set-bot-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetBotInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetBotInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:set-bot-menu-button-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetBotMenuButtonRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetBotMenuButtonRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:set-custom-verification-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetCustomVerificationRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetCustomVerificationRaw error:', err)
      throw err
    }
  })

  // Microphase 093: Bots Domain Suite Part 6 (5 RPCs)
  ipcMain.handle('telegram:bots:set-join-chat-results-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsSetJoinChatResultsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsSetJoinChatResultsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:toggle-user-emoji-status-permission-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsToggleUserEmojiStatusPermissionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsToggleUserEmojiStatusPermissionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:toggle-username-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsToggleUsernameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsToggleUsernameRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:update-star-ref-program-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsUpdateStarRefProgramRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsUpdateStarRefProgramRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:bots:update-user-emoji-status-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.botsUpdateUserEmojiStatusRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] botsUpdateUserEmojiStatusRaw error:', err)
      throw err
    }
  })

  // Microphase 094: Payments Domain Suite Part 1 (7 RPCs)
  ipcMain.handle('telegram:payments:apply-gift-code-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsApplyGiftCodeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsApplyGiftCodeRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:assign-app-store-transaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsAssignAppStoreTransactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsAssignAppStoreTransactionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:assign-play-market-transaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsAssignPlayMarketTransactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsAssignPlayMarketTransactionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:bot-cancel-stars-subscription-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsBotCancelStarsSubscriptionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsBotCancelStarsSubscriptionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:can-purchase-store-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsCanPurchaseStoreRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsCanPurchaseStoreRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:change-stars-subscription-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsChangeStarsSubscriptionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsChangeStarsSubscriptionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:check-can-send-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsCheckCanSendGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsCheckCanSendGiftRaw error:', err)
      throw err
    }
  })

  // Microphase 095: Payments Domain Suite Part 2 (7 RPCs)
  ipcMain.handle('telegram:payments:check-gift-code-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsCheckGiftCodeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsCheckGiftCodeRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:clear-saved-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsClearSavedInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsClearSavedInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:connect-star-ref-bot-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsConnectStarRefBotRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsConnectStarRefBotRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:convert-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsConvertStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsConvertStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:craft-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsCraftStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsCraftStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:create-onramp-session-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsCreateOnrampSessionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsCreateOnrampSessionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:create-star-gift-collection-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsCreateStarGiftCollectionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsCreateStarGiftCollectionRaw error:', err)
      throw err
    }
  })

  // Microphase 096: Payments Domain Suite Part 3 (7 RPCs)
  ipcMain.handle('telegram:payments:delete-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsDeleteStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsDeleteStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:delete-star-gift-collection-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsDeleteStarGiftCollectionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsDeleteStarGiftCollectionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:deposit-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsDepositStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsDepositStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:display-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsDisplayStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsDisplayStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:edit-connected-star-ref-bot-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsEditConnectedStarRefBotRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsEditConnectedStarRefBotRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:export-invoice-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsExportInvoiceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsExportInvoiceRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:fulfill-stars-subscription-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsFulfillStarsSubscriptionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsFulfillStarsSubscriptionRaw error:', err)
      throw err
    }
  })

  // Microphase 097: Payments Domain Suite Part 4 IPC Handlers
  ipcMain.handle('telegram:payments:get-bank-card-data-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetBankCardDataRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetBankCardDataRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-connected-star-ref-bot-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetConnectedStarRefBotRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetConnectedStarRefBotRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-connected-star-ref-bots-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetConnectedStarRefBotsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetConnectedStarRefBotsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-craft-star-gifts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetCraftStarGiftsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetCraftStarGiftsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-currency-rates-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.paymentsGetCurrencyRatesRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetCurrencyRatesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-giveaway-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetGiveawayInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetGiveawayInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-onramp-availability-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetOnrampAvailabilityRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetOnrampAvailabilityRaw error:', err)
      throw err
    }
  })

  // Microphase 098: Payments Domain Suite Part 5 IPC Handlers
  ipcMain.handle('telegram:payments:get-onramp-base-currencies-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetOnrampBaseCurrenciesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetOnrampBaseCurrenciesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-onramp-limits-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetOnrampLimitsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetOnrampLimitsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-onramp-providers-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetOnrampProvidersRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetOnrampProvidersRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-onramp-quote-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetOnrampQuoteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetOnrampQuoteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-payment-form-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetPaymentFormRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetPaymentFormRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-payment-receipt-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetPaymentReceiptRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetPaymentReceiptRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-premium-gift-code-options-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetPremiumGiftCodeOptionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetPremiumGiftCodeOptionsRaw error:', err)
      throw err
    }
  })

  // Microphase 099: Payments Domain Suite Part 6 IPC Handlers (Resale Gifts, Saved Gifts & Auctions)
  ipcMain.handle('telegram:payments:get-resale-star-gifts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetResaleStarGiftsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetResaleStarGiftsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-saved-info-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.paymentsGetSavedInfoRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetSavedInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-saved-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetSavedStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetSavedStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-saved-star-gifts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetSavedStarGiftsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetSavedStarGiftsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gift-active-auctions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftActiveAuctionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftActiveAuctionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gift-auction-acquired-gifts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftAuctionAcquiredGiftsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftAuctionAcquiredGiftsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gift-auction-state-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftAuctionStateRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftAuctionStateRaw error:', err)
      throw err
    }
  })

  // Microphase 100: Payments Domain Suite Part 7 IPC Handlers (Collections, Upgrades, Withdrawal, Gifts & Giveaways)
  ipcMain.handle('telegram:payments:get-star-gift-collections-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftCollectionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftCollectionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gift-upgrade-attributes-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftUpgradeAttributesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftUpgradeAttributesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gift-upgrade-preview-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftUpgradePreviewRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftUpgradePreviewRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gift-withdrawal-url-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftWithdrawalUrlRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftWithdrawalUrlRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-star-gifts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarGiftsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarGiftsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-gift-options-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsGiftOptionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsGiftOptionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-giveaway-options-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.paymentsGetStarsGiveawayOptionsRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsGiveawayOptionsRaw error:', err)
      throw err
    }
  })

  // Microphase 101: Payments Domain Suite Part 8 IPC Handlers (Revenue, Status, Subscriptions, Topup Options & Transactions)
  ipcMain.handle('telegram:payments:get-stars-revenue-ads-account-url-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsRevenueAdsAccountUrlRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsRevenueAdsAccountUrlRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-revenue-stats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsRevenueStatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsRevenueStatsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-revenue-withdrawal-url-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsRevenueWithdrawalUrlRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsRevenueWithdrawalUrlRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-status-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsStatusRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsStatusRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-subscriptions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsSubscriptionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsSubscriptionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-topup-options-raw', async (_event, { accountId }) => {
    try {
      return await accountManager.paymentsGetStarsTopupOptionsRaw(accountId)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsTopupOptionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-stars-transactions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsTransactionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsTransactionsRaw error:', err)
      throw err
    }
  })

  // Microphase 102: Payments Domain Suite Part 9 IPC Handlers (Transactions By ID, Ref Bots, Unique Gift Info, Prepaid Giveaway, Refund, Reorder Collections)
  ipcMain.handle('telegram:payments:get-stars-transactions-by-id-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetStarsTransactionsByIDRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetStarsTransactionsByIDRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-suggested-star-ref-bots-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetSuggestedStarRefBotsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetSuggestedStarRefBotsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-unique-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetUniqueStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetUniqueStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:get-unique-star-gift-value-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsGetUniqueStarGiftValueInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsGetUniqueStarGiftValueInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:launch-prepaid-giveaway-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsLaunchPrepaidGiveawayRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsLaunchPrepaidGiveawayRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:refund-stars-charge-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsRefundStarsChargeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsRefundStarsChargeRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:reorder-star-gift-collections-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsReorderStarGiftCollectionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsReorderStarGiftCollectionsRaw error:', err)
      throw err
    }
  })

  // Layer 232 Payments Suite (Microphase 103)
  ipcMain.handle('telegram:payments:resolve-star-gift-offer-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsResolveStarGiftOfferRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsResolveStarGiftOfferRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:save-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsSaveStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsSaveStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:send-payment-form-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsSendPaymentFormRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsSendPaymentFormRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:send-star-gift-offer-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsSendStarGiftOfferRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsSendStarGiftOfferRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:send-stars-form-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsSendStarsFormRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsSendStarsFormRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:toggle-chat-star-gift-notifications-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsToggleChatStarGiftNotificationsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsToggleChatStarGiftNotificationsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:toggle-star-gifts-pinned-to-top-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsToggleStarGiftsPinnedToTopRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsToggleStarGiftsPinnedToTopRaw error:', err)
      throw err
    }
  })

  // Layer 232 Payments Suite (Microphase 104)
  ipcMain.handle('telegram:payments:transfer-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsTransferStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsTransferStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:update-star-gift-collection-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsUpdateStarGiftCollectionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsUpdateStarGiftCollectionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:update-star-gift-price-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsUpdateStarGiftPriceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsUpdateStarGiftPriceRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:upgrade-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsUpgradeStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsUpgradeStarGiftRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:validate-requested-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsValidateRequestedInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsValidateRequestedInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:payments:withdraw-star-gift-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.paymentsWithdrawStarGiftRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] paymentsWithdrawStarGiftRaw error:', err)
      throw err
    }
  })

  // Layer 232 Stickers Suite (Microphase 105)
  ipcMain.handle('telegram:stickers:add-sticker-to-set-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersAddStickerToSetRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersAddStickerToSetRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:change-sticker-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersChangeStickerRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersChangeStickerRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:change-sticker-position-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersChangeStickerPositionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersChangeStickerPositionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:check-short-name-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersCheckShortNameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersCheckShortNameRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:create-sticker-set-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersCreateStickerSetRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersCreateStickerSetRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:delete-sticker-set-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersDeleteStickerSetRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersDeleteStickerSetRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:remove-sticker-from-set-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersRemoveStickerFromSetRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersRemoveStickerFromSetRaw error:', err)
      throw err
    }
  })

  // Layer 232 Stickers Suite (Microphase 106)
  ipcMain.handle('telegram:stickers:rename-sticker-set-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersRenameStickerSetRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersRenameStickerSetRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:replace-sticker-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersReplaceStickerRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersReplaceStickerRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:set-sticker-set-thumb-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersSetStickerSetThumbRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersSetStickerSetThumbRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stickers:suggest-short-name-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.stickersSuggestShortNameRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] stickersSuggestShortNameRaw error:', err)
      throw err
    }
  })

  // Layer 232 Phone Suite (Microphase 107)
  ipcMain.handle('telegram:phone:accept-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneAcceptCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneAcceptCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:check-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneCheckGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneCheckGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:confirm-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneConfirmCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneConfirmCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:create-conference-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneCreateConferenceCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneCreateConferenceCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:create-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneCreateGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneCreateGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:decline-conference-call-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneDeclineConferenceCallInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneDeclineConferenceCallInviteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:delete-conference-call-participants-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneDeleteConferenceCallParticipantsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneDeleteConferenceCallParticipantsRaw error:', err)
      throw err
    }
  })

  // Layer 232 Phone Suite (Microphase 108)
  ipcMain.handle('telegram:phone:delete-group-call-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneDeleteGroupCallMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneDeleteGroupCallMessagesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:delete-group-call-participant-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneDeleteGroupCallParticipantMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneDeleteGroupCallParticipantMessagesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:discard-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneDiscardCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneDiscardCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:discard-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneDiscardGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneDiscardGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:edit-group-call-participant-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneEditGroupCallParticipantRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneEditGroupCallParticipantRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:edit-group-call-title-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneEditGroupCallTitleRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneEditGroupCallTitleRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:export-group-call-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneExportGroupCallInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneExportGroupCallInviteRaw error:', err)
      throw err
    }
  })

  // Layer 232 Phone Suite (Microphase 109)
  ipcMain.handle('telegram:phone:get-call-config-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetCallConfigRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetCallConfigRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:get-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:get-group-call-chain-blocks-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupCallChainBlocksRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupCallChainBlocksRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:get-group-call-join-as-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupCallJoinAsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupCallJoinAsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:get-group-call-stars-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupCallStarsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupCallStarsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:get-group-call-stream-channels-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupCallStreamChannelsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupCallStreamChannelsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:get-group-call-stream-rtmp-url-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupCallStreamRtmpUrlRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupCallStreamRtmpUrlRaw error:', err)
      throw err
    }
  })

  // Microphase 110: Phone Domain Suite Part 4 IPC Handlers
  ipcMain.handle('telegram:phone:get-group-participants-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneGetGroupParticipantsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneGetGroupParticipantsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:invite-conference-call-participant-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneInviteConferenceCallParticipantRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneInviteConferenceCallParticipantRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:invite-to-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneInviteToGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneInviteToGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:join-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneJoinGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneJoinGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:join-group-call-presentation-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneJoinGroupCallPresentationRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneJoinGroupCallPresentationRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:leave-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneLeaveGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneLeaveGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:leave-group-call-presentation-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneLeaveGroupCallPresentationRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneLeaveGroupCallPresentationRaw error:', err)
      throw err
    }
  })

  // Microphase 111: Phone Domain Part 5 IPC Handlers
  ipcMain.handle('telegram:phone:received-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneReceivedCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneReceivedCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:request-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneRequestCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneRequestCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:save-call-debug-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSaveCallDebugRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSaveCallDebugRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:save-call-log-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSaveCallLogRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSaveCallLogRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:save-default-group-call-join-as-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSaveDefaultGroupCallJoinAsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSaveDefaultGroupCallJoinAsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:save-default-send-as-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSaveDefaultSendAsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSaveDefaultSendAsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:send-conference-call-broadcast-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSendConferenceCallBroadcastRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSendConferenceCallBroadcastRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:send-group-call-encrypted-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSendGroupCallEncryptedMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSendGroupCallEncryptedMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:send-group-call-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSendGroupCallMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSendGroupCallMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:send-signaling-data-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSendSignalingDataRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSendSignalingDataRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:set-call-rating-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneSetCallRatingRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneSetCallRatingRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:start-scheduled-group-call-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneStartScheduledGroupCallRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneStartScheduledGroupCallRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:toggle-group-call-record-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneToggleGroupCallRecordRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneToggleGroupCallRecordRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:toggle-group-call-settings-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneToggleGroupCallSettingsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneToggleGroupCallSettingsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:phone:toggle-group-call-start-subscription-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.phoneToggleGroupCallStartSubscriptionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] phoneToggleGroupCallStartSubscriptionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:langpack:get-difference-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.langpackGetDifferenceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] langpackGetDifferenceRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:langpack:get-lang-pack-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.langpackGetLangPackRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] langpackGetLangPackRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:langpack:get-language-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.langpackGetLanguageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] langpackGetLanguageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:langpack:get-languages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.langpackGetLanguagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] langpackGetLanguagesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:langpack:get-strings-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.langpackGetStringsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] langpackGetStringsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:folders:edit-peer-folders-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.foldersEditPeerFoldersRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] foldersEditPeerFoldersRaw error:', err)
      throw err
    }
  })

  // Stats Domain Suite Part 1 IPC (Microphase 116)
  ipcMain.handle('telegram:stats:get-broadcast-stats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetBroadcastStatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetBroadcastStatsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stats:get-megagroup-stats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetMegagroupStatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetMegagroupStatsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stats:get-message-public-forwards-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetMessagePublicForwardsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetMessagePublicForwardsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stats:get-message-stats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetMessageStatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetMessageStatsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stats:get-poll-stats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetPollStatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetPollStatsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stats:get-story-public-forwards-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetStoryPublicForwardsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetStoryPublicForwardsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stats:get-story-stats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsGetStoryStatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsGetStoryStatsRaw error:', err)
      throw err
    }
  })

  // Stats Domain Suite Part 2 IPC (Microphase 117)
  ipcMain.handle('telegram:stats:load-async-graph-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.statsLoadAsyncGraphRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] statsLoadAsyncGraphRaw error:', err)
      throw err
    }
  })

  // Chatlists Domain Suite Part 1 IPC (Microphase 118)
  ipcMain.handle('telegram:chatlists:check-chatlist-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsCheckChatlistInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsCheckChatlistInviteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:delete-exported-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsDeleteExportedInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsDeleteExportedInviteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:edit-exported-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsEditExportedInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsEditExportedInviteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:export-chatlist-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsExportChatlistInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsExportChatlistInviteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:get-chatlist-updates-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsGetChatlistUpdatesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsGetChatlistUpdatesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:get-exported-invites-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsGetExportedInvitesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsGetExportedInvitesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:get-leave-chatlist-suggestions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsGetLeaveChatlistSuggestionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsGetLeaveChatlistSuggestionsRaw error:', err)
      throw err
    }
  })

  // Chatlists Domain Suite Part 2 IPC (Microphase 119)
  ipcMain.handle('telegram:chatlists:hide-chatlist-updates-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsHideChatlistUpdatesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsHideChatlistUpdatesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:join-chatlist-invite-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsJoinChatlistInviteRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsJoinChatlistInviteRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:join-chatlist-updates-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsJoinChatlistUpdatesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsJoinChatlistUpdatesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:chatlists:leave-chatlist-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.chatlistsLeaveChatlistRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] chatlistsLeaveChatlistRaw error:', err)
      throw err
    }
  })

  // Stories Domain Suite Part 1 IPC (Microphase 120)
  ipcMain.handle('telegram:stories:activate-stealth-mode-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesActivateStealthModeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesActivateStealthModeRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:can-send-story-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesCanSendStoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesCanSendStoryRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:create-album-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesCreateAlbumRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesCreateAlbumRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:delete-album-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesDeleteAlbumRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesDeleteAlbumRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:delete-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesDeleteStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesDeleteStoriesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:edit-story-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesEditStoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesEditStoryRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:export-story-link-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesExportStoryLinkRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesExportStoryLinkRaw error:', err)
      throw err
    }
  })

  // Stories Domain Suite Part 2 IPC (Microphase 121)
  ipcMain.handle('telegram:stories:get-album-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetAlbumStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetAlbumStoriesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-albums-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetAlbumsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetAlbumsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-all-read-peer-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetAllReadPeerStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetAllReadPeerStoriesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-all-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetAllStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetAllStoriesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-chats-to-send-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetChatsToSendRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetChatsToSendRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-peer-max-ids-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetPeerMaxIDsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetPeerMaxIDsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-peer-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetPeerStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetPeerStoriesRaw error:', err)
      throw err
    }
  })

  // Stories Domain Suite Part 3 IPC (Microphase 122)
  ipcMain.handle('telegram:stories:get-pinned-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetPinnedStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetPinnedStoriesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-stories-archive-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetStoriesArchiveRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetStoriesArchiveRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-stories-by-id-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetStoriesByIDRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetStoriesByIDRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-stories-views-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetStoriesViewsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetStoriesViewsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-story-reactions-list-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetStoryReactionsListRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetStoryReactionsListRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:get-story-views-list-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesGetStoryViewsListRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesGetStoryViewsListRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:increment-story-views-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesIncrementStoryViewsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesIncrementStoryViewsRaw error:', err)
      throw err
    }
  })

  // Stories Domain Suite Part 4 IPC (Microphase 123)
  ipcMain.handle('telegram:stories:read-stories-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesReadStoriesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesReadStoriesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:reorder-albums-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesReorderAlbumsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesReorderAlbumsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:report-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesReportRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesReportRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:search-posts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesSearchPostsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesSearchPostsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:send-reaction-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesSendReactionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesSendReactionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:send-story-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesSendStoryRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesSendStoryRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:start-live-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesStartLiveRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesStartLiveRaw error:', err)
      throw err
    }
  })

  // Stories Domain Suite Part 5 IPC (Microphase 124)
  ipcMain.handle('telegram:stories:toggle-all-stories-hidden-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesToggleAllStoriesHiddenRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesToggleAllStoriesHiddenRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:toggle-peer-stories-hidden-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesTogglePeerStoriesHiddenRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesTogglePeerStoriesHiddenRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:toggle-pinned-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesTogglePinnedRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesTogglePinnedRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:toggle-pinned-to-top-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesTogglePinnedToTopRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesTogglePinnedToTopRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:stories:update-album-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.storiesUpdateAlbumRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] storiesUpdateAlbumRaw error:', err)
      throw err
    }
  })

  // Premium Domain Suite Part 1 IPC (Microphase 125)
  ipcMain.handle('telegram:premium:apply-boost-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.premiumApplyBoostRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] premiumApplyBoostRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:premium:get-boosts-list-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.premiumGetBoostsListRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] premiumGetBoostsListRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:premium:get-boosts-status-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.premiumGetBoostsStatusRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] premiumGetBoostsStatusRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:premium:get-my-boosts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.premiumGetMyBoostsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] premiumGetMyBoostsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:premium:get-user-boosts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.premiumGetUserBoostsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] premiumGetUserBoostsRaw error:', err)
      throw err
    }
  })

  // Smsjobs Domain Suite Part 1 IPC (Microphase 126)
  ipcMain.handle('telegram:smsjobs:is-eligible-to-join-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsIsEligibleToJoinRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsIsEligibleToJoinRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:smsjobs:join-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsJoinRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsJoinRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:smsjobs:leave-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsLeaveRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsLeaveRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:smsjobs:update-settings-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsUpdateSettingsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsUpdateSettingsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:smsjobs:get-status-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsGetStatusRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsGetStatusRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:smsjobs:get-sms-job-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsGetSmsJobRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsGetSmsJobRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:smsjobs:finish-job-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.smsjobsFinishJobRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] smsjobsFinishJobRaw error:', err)
      throw err
    }
  })

  // Fragment Domain Suite Part 1 IPC (Microphase 127)
  ipcMain.handle('telegram:fragment:get-collectible-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.fragmentGetCollectibleInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] fragmentGetCollectibleInfoRaw error:', err)
      throw err
    }
  })

  // Aicompose Domain Suite Part 1 IPC (Microphase 128)
  ipcMain.handle('telegram:aicompose:create-tone-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeCreateToneRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeCreateToneRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:aicompose:update-tone-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeUpdateToneRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeUpdateToneRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:aicompose:save-tone-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeSaveToneRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeSaveToneRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:aicompose:delete-tone-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeDeleteToneRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeDeleteToneRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:aicompose:get-tone-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeGetToneRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeGetToneRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:aicompose:get-tones-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeGetTonesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeGetTonesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:aicompose:get-tone-example-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.aicomposeGetToneExampleRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] aicomposeGetToneExampleRaw error:', err)
      throw err
    }
  })

  // Communities Domain Suite Parts 1 & 2 IPC (Microphases 129 & 130)
  ipcMain.handle('telegram:communities:create-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesCreateRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesCreateRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:get-joined-communities-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesGetJoinedCommunitiesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesGetJoinedCommunitiesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:get-participant-joined-chats-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesGetParticipantJoinedChatsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesGetParticipantJoinedChatsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:get-peer-link-requests-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesGetPeerLinkRequestsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesGetPeerLinkRequestsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:toggle-all-peer-link-request-approval-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesToggleAllPeerLinkRequestApprovalRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesToggleAllPeerLinkRequestApprovalRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:toggle-community-collapsed-in-dialogs-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesToggleCommunityCollapsedInDialogsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesToggleCommunityCollapsedInDialogsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:toggle-participant-banned-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesToggleParticipantBannedRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesToggleParticipantBannedRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:toggle-peer-link-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesTogglePeerLinkRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesTogglePeerLinkRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:communities:toggle-peer-link-request-approval-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.communitiesTogglePeerLinkRequestApprovalRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] communitiesTogglePeerLinkRequestApprovalRaw error:', err)
      throw err
    }
  })

  // Ephemeral Domain Suite Parts 1 & 2 IPC (Microphases 131 & 132 - 8 RPCs)
  ipcMain.handle('telegram:ephemeral:send-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralSendMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralSendMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:delete-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralDeleteMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralDeleteMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:report-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralReportMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralReportMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:get-callback-answer-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralGetCallbackAnswerRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralGetCallbackAnswerRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:edit-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralEditMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralEditMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:delete-welcome-message-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralDeleteWelcomeMessageRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralDeleteWelcomeMessageRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:delete-all-welcome-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralDeleteAllWelcomeMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralDeleteAllWelcomeMessagesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:ephemeral:get-welcome-messages-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.ephemeralGetWelcomeMessagesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] ephemeralGetWelcomeMessagesRaw error:', err)
      throw err
    }
  })

  // --- Toncenter Domain Suite (Microphase 133 - 2 RPCs) ---
  ipcMain.handle('telegram:toncenter:perform-api-request-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toncenterPerformApiRequestRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toncenterPerformApiRequestRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:toncenter:get-streaming-url-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.toncenterGetStreamingUrlRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] toncenterGetStreamingUrlRaw error:', err)
      throw err
    }
  })

  // --- Wallet Domain Suite Parts 1-4 (Microphases 134-137 - 26 RPCs) ---
  ipcMain.handle('telegram:wallet:disable-backup-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletDisableBackupRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletDisableBackupRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:enable-backup-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletEnableBackupRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletEnableBackupRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:export-secret-phrase-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletExportSecretPhraseRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletExportSecretPhraseRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:fetch-encrypted-secret-phrase-part-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletFetchEncryptedSecretPhrasePartRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletFetchEncryptedSecretPhrasePartRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-backup-holder-dcs-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetBackupHolderDcsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetBackupHolderDcsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-existing-walt-balance-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetExistingWaltBalanceRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetExistingWaltBalanceRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-gasless-info-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetGaslessInfoRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetGaslessInfoRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-nfts-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetNftsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetNftsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-proof-challenge-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetProofChallengeRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetProofChallengeRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-state-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetStateRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetStateRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-transactions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetTransactionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetTransactionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-transactions-by-i-ds-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetTransactionsByIDsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetTransactionsByIDsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-transactions-by-msg-hash-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetTransactionsByMsgHashRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetTransactionsByMsgHashRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:get-user-addresses-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletGetUserAddressesRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletGetUserAddressesRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:replace-wallet-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletReplaceWalletRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletReplaceWalletRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:send-transfer-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletSendTransferRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletSendTransferRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:set-card-stickers-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletSetCardStickersRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletSetCardStickersRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-claim-request-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectClaimRequestRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectClaimRequestRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-close-session-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectCloseSessionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectCloseSessionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-create-session-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectCreateSessionRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectCreateSessionRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-get-pending-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectGetPendingRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectGetPendingRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-get-sessions-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectGetSessionsRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectGetSessionsRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-next-event-id-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectNextEventIdRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectNextEventIdRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-register-key-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectRegisterKeyRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectRegisterKeyRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-submit-connect-result-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectSubmitConnectResultRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectSubmitConnectResultRaw error:', err)
      throw err
    }
  })

  ipcMain.handle('telegram:wallet:ton-connect-submit-response-raw', async (_event, { accountId, ...params }) => {
    try {
      return await accountManager.walletTonConnectSubmitResponseRaw(accountId, params as any)
    } catch (err: any) {
      Logger.warn('[IPC] walletTonConnectSubmitResponseRaw error:', err)
      throw err
    }
  })

  // Full Profile & Privacy Settings IPC
  ipcMain.handle('telegram:get-my-full-profile', async (_event, { accountId }) => {
    try {
      return await accountManager.getMyFullProfile(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getMyFullProfile error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:get-emoji-statuses', async (_event, { accountId }) => {
    try {
      return await accountManager.getEmojiStatuses(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getEmojiStatuses error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:set-emoji-status', async (_event, { accountId, documentId, collectibleId, until }) => {
    try {
      return await accountManager.setEmojiStatus(accountId, {
        documentId,
        collectibleId,
        until,
      })
    } catch (err: any) {
      Logger.warn(`[IPC] setEmojiStatus error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-privacy-settings', async (_event, { accountId }) => {
    try {
      return await accountManager.getPrivacySettings(accountId)
    } catch (err: any) {
      Logger.warn(`[IPC] getPrivacySettings error:`, err)
      return null
    }
  })

  ipcMain.handle('telegram:create-group', async (_event, { accountId, title, userIds }) => {
    try {
      return await accountManager.createGroup(accountId, title, userIds)
    } catch (err: any) {
      Logger.error(`[IPC] createGroup error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:create-channel', async (_event, { accountId, title, about, isMegagroup }) => {
    try {
      return await accountManager.createChannel(accountId, title, about, isMegagroup)
    } catch (err: any) {
      Logger.error(`[IPC] createChannel error:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:get-shared-media', async (_event, { accountId, chatId, filterType, limit, offsetId }) => {
    try {
      return await accountManager.getSharedMedia(accountId, chatId, filterType, limit, offsetId)
    } catch (err: any) {
      Logger.error(`[IPC] getSharedMedia error:`, err)
      return { items: [], totalCount: 0, nextOffsetId: 0, hasMore: false }
    }
  })

  // Storage & Cache IPC
  ipcMain.handle('telegram:get-cache-stats', async () => {
    try {
      return sessionStore.getCacheStats()
    } catch (err: any) {
      Logger.warn('[IPC] getCacheStats error:', err)
      return { totalBytes: 0, formattedSize: '0 KB', filesCount: 0 }
    }
  })

  ipcMain.handle('telegram:clear-cache', async () => {
    try {
      return sessionStore.clearCache()
    } catch (err: any) {
      Logger.error('[IPC] clearCache error:', err)
      return { clearedBytes: 0, clearedFiles: 0 }
    }
  })

  ipcMain.handle('telegram:enforce-media-quota', async (_event, { maxBytes }: { maxBytes?: number } = {}) => {
    try {
      return sessionStore.enforceMediaQuota(maxBytes)
    } catch (err: any) {
      Logger.warn('[IPC] enforceMediaQuota error:', err)
      return { evictedFiles: 0, freedBytes: 0, remainingBytes: 0, totalFiles: 0 }
    }
  })

  ipcMain.handle('telegram:mark-ephemeral-played', async (_event, { token }: { token: string }) => {
    try {
      if (typeof token === 'string') {
        return await EphemeralMediaManager.markPlayed(token, 100)
      }
      return false
    } catch (err: any) {
      Logger.warn('[IPC] mark-ephemeral-played error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:register-ephemeral-media', async (_event, payload: { token: string; filePath: string; ttlSeconds?: number; viewOnce?: boolean }) => {
    try {
      if (typeof payload?.token === 'string' && typeof payload?.filePath === 'string') {
        EphemeralMediaManager.registerEphemeralMedia(payload.token, payload.filePath, payload.ttlSeconds || 30, payload.viewOnce ?? false)
        return true
      }
      return false
    } catch (err: any) {
      Logger.warn('[IPC] register-ephemeral-media error:', err)
      return false
    }
  })

  ipcMain.handle('telegram:select-download-directory', async () => {
    try {
      const res = await dialog.showOpenDialog(mainWindow!, {
        title: 'Select Downloads Folder',
        properties: ['openDirectory', 'createDirectory'],
      })
      if (!res.canceled && res.filePaths.length > 0) {
        return res.filePaths[0]
      }
      return null
    } catch (err: any) {
      Logger.error('[IPC] selectDownloadDirectory error:', err)
      return null
    }
  })

  ipcMain.handle('system:get-portable-locator', async () => {
    return readPortableLocator()
  })

  ipcMain.handle('system:sync-from-portable', async (_event, { sourceDataPath }) => {
    try {
      if (!sourceDataPath || !StorageGuardrails.isSafeDirectoryForSync(sourceDataPath)) {
        return { success: false, error: 'Invalid or restricted source directory' }
      }
      const targetDir = sessionStore.getDataDirectory()
      if (path.resolve(sourceDataPath) === path.resolve(targetDir)) {
        return { success: false, error: 'Source and destination are the same folder' }
      }

      // Copy config.json and sessions
      const sourceConfig = path.join(sourceDataPath, 'config.json')
      const targetConfig = path.join(targetDir, 'config.json')
      if (fs.existsSync(sourceConfig)) {
        await fs.promises.copyFile(sourceConfig, targetConfig)
      }

      const sourceSessions = path.join(sourceDataPath, 'sessions')
      const targetSessions = path.join(targetDir, 'sessions')
      if (fs.existsSync(sourceSessions)) {
        if (!fs.existsSync(targetSessions)) fs.mkdirSync(targetSessions, { recursive: true })
        const files = await fs.promises.readdir(sourceSessions)
        for (const file of files) {
          await fs.promises.copyFile(path.join(sourceSessions, file), path.join(targetSessions, file))
        }
      }

      // Re-initialize session store
      sessionStore = new SessionStore(targetDir)
      accountManager = new AccountManager(sessionStore, (event, payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(event, payload)
        }
      })

      return { success: true }
    } catch (err: any) {
      Logger.error(`[System] syncFromPortable error:`, err)
      return { success: false, error: err?.message || 'Failed to sync data' }
    }
  })

  // System Diagnostics & Logging Handlers
  ipcMain.handle('system:get-logs', async (_event, { maxLines } = {}) => {
    return {
      logPath: Logger.getLogPath(),
      content: Logger.getRecentLogs(maxLines || 200),
    }
  })

  ipcMain.handle('system:open-logs-folder', async () => {
    const logDir = path.dirname(Logger.getLogPath())
    Logger.info(`[System] Opening log folder: ${logDir}`)
    await shell.openPath(logDir)
    return logDir
  })

  ipcMain.handle('system:copy-to-clipboard', async (_event, payload: { text: string; isSensitive?: boolean; ttlMs?: number }) => {
    try {
      if (typeof payload?.text === 'string') {
        // clipboard.writeText(text)
        return ClipboardGuard.writeText(payload.text, {
          isSensitive: payload.isSensitive,
          ttlMs: payload.ttlMs,
        }, clipboard)
      }
      return false
    } catch (err: any) {
      Logger.warn('[IPC] copy-to-clipboard error:', err)
      return false
    }
  })

  ipcMain.handle('system:copy-image-to-clipboard', async (_event, payload: { dataUrl?: string; filePath?: string }) => {
    try {
      if (payload?.filePath) {
        let cleanPath = payload.filePath
        if (cleanPath.startsWith('guidegram-media://local/')) {
          cleanPath = decodeURIComponent(cleanPath.replace(/^guidegram-media:\/\/local\//, ''))
        }
        if (fs.existsSync(cleanPath)) {
          const img = nativeImage.createFromPath(cleanPath)
          clipboard.writeImage(img)
          return true
        }
      }
      if (payload?.dataUrl) {
        const img = nativeImage.createFromDataURL(payload.dataUrl)
        clipboard.writeImage(img)
        return true
      }
      return false
    } catch (err: any) {
      Logger.warn('[IPC] copy-image-to-clipboard error:', err)
      return false
    }
  })

  ipcMain.handle('system:save-image-to-file', async (_event, payload: { dataUrl?: string; filePath?: string; defaultName?: string }) => {
    try {
      const defaultFilename = payload?.defaultName || `image_${Date.now()}.jpg`
      const focusedWin = BrowserWindow.getFocusedWindow()
      const dialogRes = focusedWin
        ? await dialog.showSaveDialog(focusedWin, {
            title: 'Save Image As',
            defaultPath: defaultFilename,
            filters: [
              { name: 'Images (*.jpg, *.png, *.webp)', extensions: ['jpg', 'png', 'webp'] },
              { name: 'All Files (*.*)', extensions: ['*'] }
            ]
          })
        : await dialog.showSaveDialog({
            title: 'Save Image As',
            defaultPath: defaultFilename,
            filters: [
              { name: 'Images (*.jpg, *.png, *.webp)', extensions: ['jpg', 'png', 'webp'] },
              { name: 'All Files (*.*)', extensions: ['*'] }
            ]
          })

      if (dialogRes.canceled || !dialogRes.filePath) {
        return { success: false, canceled: true }
      }

      if (payload?.filePath) {
        let cleanPath = payload.filePath
        if (cleanPath.startsWith('guidegram-media://local/')) {
          cleanPath = decodeURIComponent(cleanPath.replace(/^guidegram-media:\/\/local\//, ''))
        }
        if (fs.existsSync(cleanPath)) {
          await fs.promises.copyFile(cleanPath, dialogRes.filePath)
          return { success: true, filePath: dialogRes.filePath }
        }
      }

      if (payload?.dataUrl) {
        const base64Data = payload.dataUrl.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        await fs.promises.writeFile(dialogRes.filePath, buffer)
        return { success: true, filePath: dialogRes.filePath }
      }

      return { success: false, error: 'No image source provided' }
    } catch (err: any) {
      Logger.warn('[IPC] save-image-to-file error:', err)
      return { success: false, error: err?.message || 'Failed to save image' }
    }
  })

  ipcMain.handle('telegram:resolve-doh', async (_event, payload: { hostname: string; recordType?: 'A' | 'AAAA' }) => {
    try {
      if (typeof payload?.hostname === 'string') {
        return await DohResolver.resolve(payload.hostname, payload.recordType || 'A')
      }
      return []
    } catch (err: any) {
      Logger.warn('[IPC] resolve-doh error:', err)
      return []
    }
  })

  ipcMain.handle('system:get-integrity-report', async () => {
    return IntegrityGuard.detectTamperedEnvironment(app.isPackaged)
  })

  ipcMain.handle('system:get-rate-limit-metrics', async () => {
    return globalIpcRateLimiter.getMetrics()
  })

  ipcMain.handle('system:get-sqlite-status', async () => {
    return SqliteTuner.getPragmaStatus(null)
  })

  // Master Local Passcode & Key Derivation Endpoints (Layer 08 / MM-004 / MM-015)
  ipcMain.handle('passcode:get-status', async () => {
    return passcodeGuard.getStatus()
  })

  ipcMain.handle(
    'passcode:set',
    IpcSecurityFilter.wrapHandler('passcode:set', async (_event, payload: { newPasscode: string; currentPasscode?: string }) => {
      return passcodeGuard.setPasscode(payload.newPasscode, payload.currentPasscode)
    })
  )

  ipcMain.handle(
    'passcode:remove',
    IpcSecurityFilter.wrapHandler('passcode:remove', async (_event, payload: { currentPasscode: string }) => {
      return passcodeGuard.removePasscode(payload.currentPasscode)
    })
  )

  ipcMain.handle(
    'passcode:unlock',
    IpcSecurityFilter.wrapHandler('passcode:unlock', async (_event, payload: { passcode: string }) => {
      const res = passcodeGuard.unlock(payload.passcode)
      if (res.success) {
        privacyProtectionGuard.setProtection('passcode_lock', false)
      }
      return res
    })
  )

  ipcMain.handle('passcode:lock', async () => {
    passcodeGuard.lockSession()
    privacyProtectionGuard.setProtection('passcode_lock', true)
    return true
  })

  ipcMain.handle('passcode:set-autolock-minutes', async (_event, payload: { minutes: number }) => {
    return passcodeGuard.setAutoLockMinutes(payload.minutes)
  })

  // OS-level Content Protection (Anti-Screen Capture / Window Sharing Privacy)
  ipcMain.handle(
    'privacy:set-content-protection',
    IpcSecurityFilter.wrapHandler('privacy:set-content-protection', async (_event, payload: { reason: string; enable: boolean }) => {
      return privacyProtectionGuard.setProtection(payload.reason, payload.enable)
    })
  )

  ipcMain.handle('privacy:get-content-protection-status', async () => {
    return privacyProtectionGuard.getStatus()
  })

  ipcMain.handle('system:get-ipc-security-telemetry', async () => {
    return IpcSecurityFilter.getTelemetry()
  })

  ipcMain.handle('system:get-account-vault-telemetry', async () => {
    return accountVaultManager.getTelemetry()
  })

  ipcMain.handle('system:get-media-stream-telemetry', async () => {
    return MediaStreamValidator.getTelemetry()
  })

  ipcMain.handle('system:get-network-reconnect-telemetry', async () => {
    return networkReconnectManager.getTelemetry()
  })

  ipcMain.handle('telegram:reconnect-all-accounts', async () => {
    networkReconnectManager.onNetworkOnline((accId) => async () => {
      const res = await accountManager.reconnectAccount(accId).catch(() => null)
      return res ? res.status === 'connected' : false
    })
    return { ok: true }
  })

  ipcMain.handle('system:get-sqlite-deadlock-telemetry', async () => {
    return sqliteDeadlockGuard.getTelemetry()
  })

  ipcMain.handle('system:sanitize-dropped-file', async (_event, file) => {
    return dragDropSanitizer.sanitizeDroppedFile(file)
  })

  ipcMain.handle('system:sanitize-dropped-text', async (_event, text) => {
    return dragDropSanitizer.sanitizeDroppedText(text)
  })

  ipcMain.handle('system:get-drag-drop-telemetry', async () => {
    return dragDropSanitizer.getTelemetry()
  })

  ipcMain.handle('system:get-memory-pressure-telemetry', async () => {
    return memoryPressureManager.getTelemetry()
  })

  ipcMain.handle('system:force-memory-cleanup', async () => {
    await memoryPressureManager.runCriticalEviction()
    return { ok: true }
  })

  ipcMain.handle('system:get-ipc-redaction-telemetry', async () => {
    return IpcPayloadRedactor.getTelemetry()
  })

  ipcMain.handle('system:redact-ipc-payload', async (_event, payload, options) => {
    return IpcPayloadRedactor.deepRedact(payload, options)
  })

  ipcMain.handle('system:reset-ipc-redaction-telemetry', async () => {
    IpcPayloadRedactor.resetTelemetry()
    return { ok: true }
  })

  ipcMain.handle('system:get-power-lifecycle-telemetry', async () => {
    return powerLifecycleManager.getTelemetry()
  })

  ipcMain.handle('system:simulate-power-suspend', async () => {
    await powerLifecycleManager.simulateSuspend()
    return { ok: true }
  })

  ipcMain.handle('system:simulate-power-resume', async (_event, payload) => {
    return await powerLifecycleManager.simulateResume(payload?.sleepDurationMs)
  })

  ipcMain.handle('telegram:get-mtproto-audit', async () => {
    const activeAccount = accountManager?.getAccounts?.()?.find?.((a) => a.status === 'connected')
    return MtprotoAuditInspector.generateAuditReport({
      status: activeAccount ? 'connected' : 'disconnected',
      primaryDcId: 2,
    })
  })

  ipcMain.handle('system:log-renderer-error', async (_event, { message, stack }) => {
    Logger.error(`[Renderer Crash/Error] ${message}`, stack)
  })

  // MCP (Model Context Protocol) Server IPC Handlers
  ipcMain.handle('mcp:get-status', async () => {
    return mcpServer
      ? mcpServer.getStatus()
      : { isRunning: false, port: 39527, enabled: false, activeToolsCount: 0 }
  })

  ipcMain.handle('mcp:get-config', async () => {
    return mcpServer ? mcpServer.getConfig() : sessionStore.getConfig()?.mcp
  })

  ipcMain.handle('mcp:update-config', async (_event, { config }: { config: Partial<McpServerConfig> }) => {
    if (mcpServer) {
      mcpServer.updateConfig(config)
      return mcpServer.getConfig()
    }
    const current = sessionStore.getConfig()?.mcp || { enabled: true, port: 39527 }
    const updated = { ...current, ...config }
    sessionStore.updateConfig({ mcp: updated })
    return updated
  })

  ipcMain.handle('mcp:get-config-snippets', async () => {
    const bridgeScriptPath = (app.isPackaged ? path.join(process.resourcesPath, 'scripts', 'mcp-bridge.mjs') : path.resolve(__dirname, '../scripts/mcp-bridge.mjs')).replace(/\\/g, '/')
    const port = mcpServer?.getConfig().port || 39527

    const claudeDesktop = {
      mcpServers: {
        guidegram: {
          command: 'node',
          args: [bridgeScriptPath, '--port', String(port)],
        },
      },
    }

    const cursor = {
      mcpServers: {
        guidegram: {
          command: 'node',
          args: [bridgeScriptPath, '--port', String(port)],
        },
      },
    }

    const sseConfig = {
      mcpServers: {
        guidegram: {
          url: `http://127.0.0.1:${port}/sse`,
        },
      },
    }

    return {
      claudeDesktop: JSON.stringify(claudeDesktop, null, 2),
      cursor: JSON.stringify(cursor, null, 2),
      sse: JSON.stringify(sseConfig, null, 2),
      bridgePath: bridgeScriptPath,
      port,
    }
  })
}
