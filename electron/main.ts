import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, protocol, net, dialog, session, clipboard } from 'electron'
import path from 'path'
import fs from 'fs'
import { Readable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'url'
import { SessionStore } from './telegram/sessionStore'
import { AccountManager } from './telegram/accountManager'
import { ProxyManager } from './telegram/proxyManager'
import { Logger } from './telegram/logger'
import { UpdateManager } from './telegram/updateManager'
import type { WebPagePreview, McpServerConfig } from './telegram/types'
import { GuidegramMcpServer } from './mcp/mcpServer'
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
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

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
let mcpServer: GuidegramMcpServer | null = null
let isQuitting = false

// Focus primary window when user clicks pinned taskbar icon or second instance launches
app.on('second-instance', (_event, commandLine) => {
  Logger.info('[App] Second instance launch detected. Focusing primary window.')
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
    mainWindow.setAlwaysOnTop(true)
    mainWindow.show()
    mainWindow.focus()
    mainWindow.setAlwaysOnTop(false)

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
    const isHeadless = commandLine?.includes('--headless')
    if (!isHeadless) {
      createWindow()
    }
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

  // Window lifecycle events
  mainWindow.once('ready-to-show', () => {
    Logger.info('[Window] Window is ready to show. Displaying now.')
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(true)
      mainWindow.show()
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(false)
    }
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

      // Stream media safely via RFC 9110 compliant MediaStreamValidator (Layer 08 / Layer 11)
      const rangeHeader = request.headers.get('Range') || request.headers.get('range')
      return await MediaStreamValidator.createMediaResponse(decodedPath, rangeHeader)
    } catch (err) {
      Logger.error('[Protocol] Failed to serve guidegram-media request:', err)
      return new Response('Media error', { status: 500 })
    }
  })

  sessionStore = new SessionStore(portableDataDir)

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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, payload)
    }
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
    mcpServer = new GuidegramMcpServer(accountManager, sessionStore)
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
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    } else {
      mainWindow.maximize()
      return true
    }
  })

  ipcMain.handle('window:request-close', () => {
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

  ipcMain.handle('window:confirm-close', (_event, { action, remember }: { action: 'minimize' | 'quit'; remember: boolean }) => {
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

  ipcMain.handle('window:close', () => {
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

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() || false
  })

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
    async (_event, { accountId, limit, offsetDate, offsetId }) => {
      try {
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

  ipcMain.handle('telegram:send-media', async (_event, { accountId, chatId, filePath, options }) => {
    try {
      return await accountManager.sendMedia(accountId, chatId, filePath, options)
    } catch (err: any) {
      Logger.error(`[IPC] sendMedia failed for ${accountId} in ${chatId}:`, err)
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

  ipcMain.handle('telegram:save-media-to-file', async (_event, { accountId, chatId, messageId, defaultName }) => {
    try {
      return await accountManager.saveMediaToFile(mainWindow, accountId, chatId, messageId, defaultName)
    } catch (err: any) {
      Logger.warn(`[IPC] saveMediaToFile error:`, err)
      throw err
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

  ipcMain.handle('system:open-external', async (_event, { url }) => {
    try {
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('tg://'))) {
        await shell.openExternal(url)
      }
    } catch (err) {
      Logger.warn(`[IPC] Failed to open external URL: ${url}`, err)
    }
  })

  ipcMain.handle('web:get-link-preview', async (_event, { url }: { url: string }) => {
    return scrapeLinkPreview(url)
  })

  ipcMain.handle('telegram:test-proxy-ping', async (_event, { proxy }) => {
    return ProxyManager.testProxyPing(proxy)
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

  ipcMain.handle('telegram:search-global', async (_event, { accountId, query, filterType, limit }) => {
    try {
      return await accountManager.searchGlobal(accountId, query, filterType, limit)
    } catch (err: any) {
      Logger.warn(`[IPC] searchGlobal error:`, err)
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

  ipcMain.handle('telegram:create-forum-topic', async (_event, { accountId, chatId, title }) => {
    return await accountManager.createForumTopic(accountId, chatId, title)
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

  ipcMain.handle('telegram:send-reaction', async (_event, { accountId, chatId, messageId, reactionEmoji, idempotencyKey }) => {
    try {
      const key = idempotencyKey || idempotencyManager.generateKey('send-reaction', { accountId, chatId, messageId, reactionEmoji })
      return await idempotencyManager.execute(key, () =>
        accountManager.sendReaction(accountId, chatId, messageId, reactionEmoji)
      )
    } catch (err: any) {
      Logger.warn(`[IPC] sendReaction error:`, err)
      throw err
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

  // Memory Monitor IPC Handlers (MM-211)
  memoryMonitor.registerIpc()

  // Crash Recovery IPC Handlers (MM-205)
  ipcMain.handle('system:get-crash-reports', () => {
    return crashRecoveryManager.getCrashReports()
  })

  ipcMain.handle('system:purge-crash-reports', () => {
    return crashRecoveryManager.purgeCrashReports()
  })

  ipcMain.handle('telegram:save-draft', async (_event, { accountId, chatId, message, replyToMsgId }) => {
    try {
      return await accountManager.saveDraft(accountId, chatId, message, replyToMsgId)
    } catch (err: any) {
      Logger.error(`[IPC] saveDraft error:`, err)
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

  ipcMain.handle('telegram:send-paid-reaction', async (_event, { accountId, chatId, messageId, count, isPrivate }) => {
    try {
      return await accountManager.sendPaidReaction(accountId, chatId, messageId, count, isPrivate)
    } catch (err: any) {
      Logger.warn(`[IPC] sendPaidReaction error:`, err)
      return false
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

  ipcMain.handle('telegram:get-inline-bot-results', async (_event, { accountId, botUsername, query, offset, peerId }) => {
    try {
      return await accountManager.getInlineBotResults(accountId, botUsername, query, offset, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getInlineBotResults error:`, err)
      return null
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
    const bridgeScriptPath = path.resolve(__dirname, '../scripts/mcp-bridge.mjs').replace(/\\/g, '/')
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
