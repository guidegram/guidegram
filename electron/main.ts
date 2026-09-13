import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, protocol, net, dialog, session, clipboard } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { SessionStore } from './telegram/sessionStore'
import { AccountManager } from './telegram/accountManager'
import { ProxyManager } from './telegram/proxyManager'
import { Logger } from './telegram/logger'
import { UpdateManager } from './telegram/updateManager'
import type { WebPagePreview } from './telegram/types'

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

// Enforce Single Instance Application Lock: prevent duplicate instances/windows
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
  process.exit(0)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure 100% Portable User Data Directory
const isDev = !app.isPackaged
const portableDataDir = isDev
  ? path.resolve(__dirname, '../data')
  : path.join(path.dirname(app.getPath('exe')), 'data')

app.setPath('userData', portableDataDir)

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

process.on('uncaughtException', (err) => {
  Logger.error('[Process] Uncaught Exception in Main process:', err)
})

process.on('unhandledRejection', (reason) => {
  Logger.error('[Process] Unhandled Rejection in Main process:', reason)
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let sessionStore: SessionStore
let accountManager: AccountManager
let updateManager: UpdateManager

// Focus primary window when user clicks pinned taskbar icon or second instance launches
app.on('second-instance', () => {
  Logger.info('[App] Second instance launch detected. Focusing primary window.')
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
})

const FALLBACK_ICON_DATA_URL =
  'data:image/png;base64,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'

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
  const iconPath = getAppIconPath()
  if (iconPath && fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) return img
  }
  return nativeImage.createFromDataURL(FALLBACK_ICON_DATA_URL)
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
  const iconPath = getTrayIconPath()
  if (iconPath && fs.existsSync(iconPath)) {
    let img = nativeImage.createFromPath(iconPath)
    if (!img.isEmpty()) {
      if (process.platform === 'win32') {
        img = img.resize({ width: 16, height: 16 })
      }
      return img
    }
  }
  // Safe infallible embedded fallback
  const fallback = nativeImage.createFromDataURL(FALLBACK_ICON_DATA_URL)
  return fallback.resize({ width: 16, height: 16 })
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
        if (tray) {
          tray.destroy()
          tray = null
        }
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (!mainWindow) {
      createWindow()
      return
    }
    if (mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
        mainWindow.focus()
      } else {
        mainWindow.focus()
      }
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  Logger.info('[Window] Creating main application window...')

  const appIcon = getAppIcon()
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false, // Prevents blank/black flash during startup
    backgroundColor: '#08090C',
    title: 'Guidegram',
    frame: false, // Frameless window with custom titlebar
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Window lifecycle events
  mainWindow.once('ready-to-show', () => {
    Logger.info('[Window] Window is ready to show. Displaying now.')
    mainWindow?.show()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    Logger.info('[Renderer] Main HTML content loaded successfully.')

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
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    Logger.error(`[Renderer] Failed to load URL: ${validatedURL}, Code: ${errorCode}, Description: ${errorDescription}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    Logger.error('[Renderer] Renderer process gone / crashed:', details)
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

  mainWindow.on('closed', () => {
    Logger.info('[Window] Main window closed.')
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  Logger.info('[App] Electron app is ready. Initializing SessionStore & AccountManager...')

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

      if (!fs.existsSync(decodedPath)) {
        Logger.warn(`[Protocol] File not found: "${decodedPath}" from request "${request.url}"`)
        return new Response('Media file not found', { status: 404 })
      }

      // Forward request to net.fetch with file:// URL to preserve Range headers for video streaming
      try {
        return await net.fetch(pathToFileURL(decodedPath).toString(), {
          headers: request.headers,
        })
      } catch (fetchErr) {
        // Fallback to direct reading with explicit Content-Type
        const ext = path.extname(decodedPath).toLowerCase()
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif',
          '.mp4': 'video/mp4',
          '.ogg': 'audio/ogg',
          '.mp3': 'audio/mpeg',
          '.pdf': 'application/pdf',
        }
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        const fileBuf = await fs.promises.readFile(decodedPath)
        return new Response(fileBuf, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': fileBuf.length.toString(),
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
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

  setupIpcHandlers()
  createTray()
  createWindow()

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
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
    // Hide to system tray instead of leaving on taskbar
    mainWindow?.hide()
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
      mainWindow?.hide()
      return { action: 'minimize' }
    } else if (cfg.closeAction === 'quit') {
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
      mainWindow?.hide()
    } else {
      mainWindow?.close()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
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
    return updateManager.checkForUpdates(activeProxy)
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

  // Telegram Accounts
  ipcMain.handle('telegram:get-accounts', async () => {
    Logger.info('[IPC] telegram:get-accounts')
    return accountManager.getAccounts()
  })

  ipcMain.handle('telegram:reconnect-account', async (_event, { accountId }: { accountId: string }) => {
    Logger.info(`[IPC] telegram:reconnect-account for ${accountId}`)
    try {
      return await accountManager.reconnectAccount(accountId)
    } catch (err: any) {
      Logger.error(`[IPC] reconnectAccount failed for ${accountId}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:start-phone-auth', async (_event, { phone, proxy }) => {
    Logger.info(`[IPC] telegram:start-phone-auth for ${phone}`)
    try {
      return await accountManager.startPhoneAuth(phone, proxy)
    } catch (err: any) {
      Logger.error(`[IPC] startPhoneAuth failed for ${phone}:`, err)
      throw err
    }
  })

  ipcMain.handle('telegram:complete-phone-auth', async (_event, { phone, code, password }) => {
    Logger.info(`[IPC] telegram:complete-phone-auth for ${phone}`)
    try {
      return await accountManager.completePhoneAuth(phone, code, password)
    } catch (err: any) {
      Logger.error(`[IPC] completePhoneAuth failed for ${phone}:`, err)
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

  ipcMain.handle('telegram:send-message', async (_event, { accountId, chatId, text, replyToMsgId, options }) => {
    try {
      return await accountManager.sendMessage(accountId, chatId, text, replyToMsgId, options)
    } catch (err: any) {
      Logger.error(`[IPC] sendMessage failed:`, err)
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
    const ext = path.extname(filename || '')
    const base = path.basename(filename || 'temp', ext).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const safeName = `${base}_${uniqueSuffix}${ext || (filename?.includes('voice') ? '.ogg' : '.bin')}`
    const targetPath = path.join(tempDir, safeName)
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any)
    await fs.promises.writeFile(targetPath, nodeBuf)
    return targetPath
  })

  ipcMain.handle('temp:save-file', async (_event, params: { buffer: ArrayBuffer | Uint8Array; filename: string }) => {
    const tempDir = app.getPath('temp')
    const ext = path.extname(params.filename || '')
    const base = path.basename(params.filename || 'temp', ext).replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const safeName = `${base}_${uniqueSuffix}${ext || '.bin'}`
    const targetPath = path.join(tempDir, safeName)
    const nodeBuf = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer as any)
    await fs.promises.writeFile(targetPath, nodeBuf)
    return targetPath
  })

  ipcMain.handle(
    'telegram:forward-messages',
    async (_event, { accountId, toChatId, toChatIds, fromChatId, messageIds, options }) => {
      try {
        const target = toChatIds || toChatId
        return await accountManager.forwardMessages(accountId, target, fromChatId, messageIds, options)
      } catch (err: any) {
        Logger.error(`[IPC] forwardMessages failed:`, err)
        throw err
      }
    }
  )

  ipcMain.handle('telegram:mark-as-read', async (_event, { accountId, chatId }) => {
    return accountManager.markAsRead(accountId, chatId)
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

  ipcMain.handle('telegram:get-profile-photo', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getProfilePhoto(accountId, peerId)
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

  ipcMain.handle('proxy:get-harvest-status', async () => {
    return ProxyManager.getHarvestStatus()
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

  ipcMain.handle('telegram:send-reaction', async (_event, { accountId, chatId, messageId, reactionEmoji }) => {
    try {
      return await accountManager.sendReaction(accountId, chatId, messageId, reactionEmoji)
    } catch (err: any) {
      Logger.warn(`[IPC] sendReaction error:`, err)
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
  ipcMain.handle('telegram:get-peer-stories', async (_event, { accountId, peerId }) => {
    try {
      return await accountManager.getPeerStories(accountId, peerId)
    } catch (err: any) {
      Logger.warn(`[IPC] getPeerStories error:`, err)
      return null
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
      if (!sourceDataPath || !fs.existsSync(sourceDataPath)) {
        return { success: false, error: 'Source directory does not exist' }
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

  ipcMain.handle('system:copy-to-clipboard', async (_event, { text }: { text: string }) => {
    try {
      if (typeof text === 'string') {
        clipboard.writeText(text)
        return true
      }
      return false
    } catch (err: any) {
      Logger.warn('[IPC] copy-to-clipboard error:', err)
      return false
    }
  })

  ipcMain.handle('system:log-renderer-error', async (_event, { message, stack }) => {
    Logger.error(`[Renderer Crash/Error] ${message}`, stack)
  })
}
