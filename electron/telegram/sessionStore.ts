import fs from 'fs'
import path from 'path'
import { AppConfig, AccountInfo, ProxyConfig, CacheStats, MessageItem, MessageEntityItem, MessageEditRevision, DialogItem } from './types'
import { SecureStorage } from './secureStorage'
import { MediaCacheManager, QuotaEnforcementResult } from '../mediaCacheManager'

export class SessionStore {
  private dataDir: string
  private sessionsDir: string
  private auditLogsDir: string
  private cacheDir: string
  private configFilePath: string
  private config: AppConfig
  private safeBackupDir: string
  private backupConfigPath: string
  private backupSessionsDir: string
  private backupAuditLogsDir: string
  private auditCache: Map<string, Record<string, Record<number, MessageItem>>> = new Map()
  private saveAuditTimers: Map<string, NodeJS.Timeout> = new Map()
  private isSavingAudit: Map<string, boolean> = new Map()
  private pendingSaveAudit: Map<string, boolean> = new Map()
  private messageChatIndex: Map<string, Map<number, string>> = new Map()
  private recentMessagesCache: Map<string, Map<number, MessageItem>> = new Map()

  constructor(baseDataDir: string) {
    this.dataDir = baseDataDir
    this.sessionsDir = path.join(this.dataDir, 'sessions')
    this.auditLogsDir = path.join(this.dataDir, 'audit_logs')
    this.cacheDir = path.join(this.dataDir, 'cache')
    this.configFilePath = path.join(this.dataDir, 'config.json')

    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : path.join(process.env.HOME || '', '.config'))
    this.safeBackupDir = path.join(appData, 'Guidegram', 'safe_backup')
    this.backupConfigPath = path.join(this.safeBackupDir, 'config.json')
    this.backupSessionsDir = path.join(this.safeBackupDir, 'sessions')
    this.backupAuditLogsDir = path.join(this.safeBackupDir, 'audit_logs')

    this.ensureDirectories()
    this.config = this.loadConfig()
    this.sanitizeAllExistingAuditFiles()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
    if (!fs.existsSync(this.auditLogsDir)) {
      fs.mkdirSync(this.auditLogsDir, { recursive: true })
    }
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
    try {
      if (!fs.existsSync(this.safeBackupDir)) {
        fs.mkdirSync(this.safeBackupDir, { recursive: true })
      }
      if (!fs.existsSync(this.backupSessionsDir)) {
        fs.mkdirSync(this.backupSessionsDir, { recursive: true })
      }
      if (!fs.existsSync(this.backupAuditLogsDir)) {
        fs.mkdirSync(this.backupAuditLogsDir, { recursive: true })
      }
    } catch {
      // Safe fallback if restricted
    }
  }

  private loadConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      apiId: 2040, // Standard Telegram Desktop public test ID fallback or user-defined
      apiHash: 'b18441a1ff607e10a989891a5462e627',
      ghostMode: false,
      theme: 'dark',
      accounts: [],
      proxies: [],
      closeAction: 'ask',
      rememberCloseAction: false,
      showChatId: true,
      showMessageId: true,
      showSeconds: true,
      showSenderAvatar: true,
      quickForwardToSaved: true,
      alwaysDeleteBoth: true,
      keepDeletedMessagesLocally: true,
      markAllReadEnabled: true,
      copyCallbackData: true,
      disableAnimations: false,
      suppressLinkWarning: false,
      antiFingerprinting: true,
      autoDownload: {
        enabled: true,
        photosInPrivate: true,
        photosInGroups: true,
        photosInChannels: false, // OFF by default in channels to avoid flooding downloads!
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
        networkProfiles: {
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
        },
      },
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
      downloadsPath: path.join(this.dataDir, 'downloads'),
      alwaysAskDownloadPath: false,
      chatFontSize: 14,
      bubbleRadius: 16,
      bubblePadding: 10,
      activityTrackerEnabled: true,
      profileChangeAuditorEnabled: true,
      activityRetentionPeriod: '30d',
      ignoredUserTrackingIds: [],
      profileAuditInteractionRange: '180d',
      profileAuditScanOnOnline: true,
      mcp: {
        enabled: true,
        port: 39527,
        allowedChatIds: [],
        defaultDownloadDir: path.join(this.dataDir, 'downloads'),
        autoStartWithApp: true,
      },
      autoConnectOnVpnDrop: true,
    }

    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        const loaded = {
          ...defaultConfig,
          ...parsed,
          autoDownload: {
            ...defaultConfig.autoDownload!,
            ...(parsed.autoDownload || {}),
            networkProfiles: {
              ...defaultConfig.autoDownload!.networkProfiles!,
              ...(parsed.autoDownload?.networkProfiles || {}),
              cellular: {
                ...defaultConfig.autoDownload!.networkProfiles!.cellular,
                ...(parsed.autoDownload?.networkProfiles?.cellular || {}),
              },
              wifi: {
                ...defaultConfig.autoDownload!.networkProfiles!.wifi,
                ...(parsed.autoDownload?.networkProfiles?.wifi || {}),
              },
              roaming: {
                ...defaultConfig.autoDownload!.networkProfiles!.roaming,
                ...(parsed.autoDownload?.networkProfiles?.roaming || {}),
              },
            },
          },
          mcp: {
            ...defaultConfig.mcp!,
            ...(parsed.mcp || {}),
          },
        }

        // If local config has no accounts, but safe backup has accounts, auto-restore!
        if ((!loaded.accounts || loaded.accounts.length === 0) && fs.existsSync(this.backupConfigPath)) {
          try {
            const backupRaw = fs.readFileSync(this.backupConfigPath, 'utf-8')
            const backupParsed = JSON.parse(backupRaw)
            if (backupParsed.accounts && backupParsed.accounts.length > 0) {
              console.log(`[SessionStore] 🛡️ Guidegram Data Shield: Auto-restoring ${backupParsed.accounts.length} account(s) from system safe backup!`)
              this.restoreFromSafeBackup(backupParsed)
              return { ...loaded, ...backupParsed }
            }
          } catch (e) {
            console.error('[SessionStore] Failed to read safe backup:', e)
          }
        }

        return loaded
      } else if (fs.existsSync(this.backupConfigPath)) {
        // Local config is missing completely, restore from safe backup!
        try {
          const backupRaw = fs.readFileSync(this.backupConfigPath, 'utf-8')
          const backupParsed = JSON.parse(backupRaw)
          console.log(`[SessionStore] 🛡️ Guidegram Data Shield: Missing local config! Restoring from system safe backup...`)
          this.restoreFromSafeBackup(backupParsed)
          return { ...defaultConfig, ...backupParsed }
        } catch (e) {
          console.error('[SessionStore] Failed to restore from safe backup:', e)
        }
      }
    } catch (err) {
      console.error('[SessionStore] Failed to parse config.json, resetting to default:', err)
    }

    this.saveConfig(defaultConfig)
    return defaultConfig
  }

  private restoreFromSafeBackup(backupConfig: AppConfig): void {
    try {
      this.config = backupConfig
      fs.writeFileSync(this.configFilePath, JSON.stringify(backupConfig, null, 2), 'utf-8')
      if (fs.existsSync(this.backupSessionsDir)) {
        const sessionFiles = fs.readdirSync(this.backupSessionsDir)
        for (const file of sessionFiles) {
          if (file.startsWith('session_') && file.endsWith('.txt')) {
            const src = path.join(this.backupSessionsDir, file)
            const dest = path.join(this.sessionsDir, file)
            fs.copyFileSync(src, dest)
          }
        }
      }
    } catch (err) {
      console.error('[SessionStore] Error during safe backup restoration:', err)
    }
  }

  public saveConfig(config?: AppConfig): void {
    if (config) {
      this.config = config
    }
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf-8')
      // Dual-layer mirroring: mirror config with accounts to safe backup
      if (this.config.accounts && this.config.accounts.length > 0) {
        fs.writeFileSync(this.backupConfigPath, JSON.stringify(this.config, null, 2), 'utf-8')
      }
    } catch (err) {
      console.error('[SessionStore] Failed to save config:', err)
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config }
  }

  public updateConfig(partial: Partial<AppConfig>): AppConfig {
    this.config = { ...this.config, ...partial }
    this.saveConfig()
    return this.config
  }

  public saveSessionString(accountId: string, sessionString: string): void {
    const safeId = SecureStorage.sanitizeAccountId(accountId)
    const encrypted = SecureStorage.encrypt(sessionString)
    const filePath = path.join(this.sessionsDir, `session_${safeId}.txt`)
    fs.writeFileSync(filePath, encrypted, 'utf-8')
    try {
      const backupFilePath = path.join(this.backupSessionsDir, `session_${safeId}.txt`)
      fs.writeFileSync(backupFilePath, encrypted, 'utf-8')
    } catch (err) {
      console.error('[SessionStore] Failed to mirror session to safe backup:', err)
    }
  }

  public getSessionString(accountId: string): string | null {
    const safeId = SecureStorage.sanitizeAccountId(accountId)
    const filePath = path.join(this.sessionsDir, `session_${safeId}.txt`)
    let raw: string | null = null

    if (fs.existsSync(filePath)) {
      raw = fs.readFileSync(filePath, 'utf-8').trim()
    } else {
      // Fallback: recover from mirrored safe backup if local file was deleted!
      try {
        const backupFilePath = path.join(this.backupSessionsDir, `session_${safeId}.txt`)
        if (fs.existsSync(backupFilePath)) {
          raw = fs.readFileSync(backupFilePath, 'utf-8').trim()
          fs.writeFileSync(filePath, raw, 'utf-8')
        }
      } catch {
        // Safe fallback
      }
    }

    if (!raw) return null

    try {
      const decrypted = SecureStorage.decrypt(raw)
      // Transparent in-place migration if file was unencrypted legacy plaintext
      if (!raw.startsWith('ENC:')) {
        this.saveSessionString(safeId, decrypted)
      }
      return decrypted
    } catch (err) {
      console.error(`[SessionStore] Failed to decrypt session for ${safeId}:`, err)
      return null
    }
  }

  public removeSession(accountId: string): void {
    const safeId = SecureStorage.sanitizeAccountId(accountId)
    const filePath = path.join(this.sessionsDir, `session_${safeId}.txt`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    try {
      const backupFilePath = path.join(this.backupSessionsDir, `session_${safeId}.txt`)
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath)
      }
    } catch {
      // Safe fallback
    }
    this.config.accounts = this.config.accounts.filter(a => a.id !== accountId)
    this.saveConfig()
  }

  public getDataDirectory(): string {
    return this.dataDir
  }

  public getCacheStats(): CacheStats {
    let totalBytes = 0
    let filesCount = 0

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name !== 'sessions') {
              scanDir(fullPath)
            }
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath)
              totalBytes += stat.size
              filesCount++
            } catch {}
          }
        }
      } catch {}
    }

    scanDir(path.join(this.dataDir, 'media'))
    scanDir(path.join(this.dataDir, 'temp'))

    const formattedSize =
      totalBytes < 1024 * 1024
        ? `${(totalBytes / 1024).toFixed(1)} KB`
        : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`

    return {
      totalBytes,
      formattedSize,
      filesCount,
    }
  }

  public enforceMediaQuota(maxBytes?: number): QuotaEnforcementResult {
    const mediaDir = path.join(this.dataDir, 'media')
    return MediaCacheManager.enforceQuota(mediaDir, maxBytes)
  }

  public clearCache(): { clearedBytes: number; clearedFiles: number } {
    let clearedBytes = 0
    let clearedFiles = 0

    const cleanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name !== 'sessions') {
              cleanDir(fullPath)
              try {
                fs.rmdirSync(fullPath)
              } catch {}
            }
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath)
              clearedBytes += stat.size
              fs.unlinkSync(fullPath)
              clearedFiles++
            } catch {}
          }
        }
      } catch {}
    }

    cleanDir(path.join(this.dataDir, 'media'))
    cleanDir(path.join(this.dataDir, 'temp'))

    return { clearedBytes, clearedFiles }
  }

  // ==========================================
  // 64Gram Local Anti-Delete & Edit History Audit Log
  // ==========================================

  public getAuditFilePath(accountId: string): string {
    return path.join(this.auditLogsDir, `audit_${accountId}.json`)
  }

  public getBackupAuditFilePath(accountId: string): string {
    return path.join(this.backupAuditLogsDir, `audit_${accountId}.json`)
  }

  public sanitizeAuditData(data: Record<string, Record<number, MessageItem>>): { data: Record<string, Record<number, MessageItem>>; wasPruned: boolean } {
    let wasPruned = false
    const cleanChats: Record<string, Record<number, MessageItem>> = {}

    for (const [cId, msgs] of Object.entries(data || {})) {
      if (!msgs || typeof msgs !== 'object') {
        wasPruned = true
        continue
      }
      const keepMsgs: Record<number, MessageItem> = {}
      for (const [mIdStr, m] of Object.entries(msgs)) {
        if (!m || typeof m !== 'object') {
          wasPruned = true
          continue
        }
        const mId = Number(mIdStr)
        const isDeleted = Boolean(m.isDeletedLocally)
        const isEdited = Boolean(m.editHistory && m.editHistory.length > 0)

        if (isDeleted || isEdited) {
          let item = m
          // Strip bloated base64 data URLs in avatars that inflate audit logs to tens of MBs
          if (item.senderAvatarUrl && item.senderAvatarUrl.startsWith('data:')) {
            item = { ...item }
            delete item.senderAvatarUrl
            wasPruned = true
          }
          keepMsgs[mId] = item
        } else {
          // Normal, unedited and non-deleted message found in audit logs - PRUNE IT!
          wasPruned = true
        }
      }
      if (Object.keys(keepMsgs).length > 0) {
        cleanChats[cId] = keepMsgs
      } else {
        // Chat had only normal messages - entirely drop this empty chat
        wasPruned = true
      }
    }

    return { data: cleanChats, wasPruned }
  }

  public sanitizeAllExistingAuditFiles(): void {
    const sanitizeDirectory = (dirPath: string) => {
      if (!fs.existsSync(dirPath)) return
      try {
        const files = fs.readdirSync(dirPath)
        for (const file of files) {
          if (!file.startsWith('audit_') || !file.endsWith('.json')) continue
          const fullPath = path.join(dirPath, file)
          try {
            const raw = fs.readFileSync(fullPath, 'utf-8')
            const parsed = JSON.parse(raw)
            const chats = parsed.chats || parsed || {}
            const { data: cleanChats, wasPruned } = this.sanitizeAuditData(chats)
            if (wasPruned) {
              const payload = JSON.stringify({ chats: cleanChats })
              fs.writeFileSync(fullPath, payload, 'utf-8')
            }
          } catch (e) {
            console.error(`[SessionStore] Failed to sanitize ${fullPath}:`, e)
          }
        }
      } catch (err) {
        console.error(`[SessionStore] Failed reading directory for sanitation ${dirPath}:`, err)
      }
    }

    sanitizeDirectory(this.auditLogsDir)
    sanitizeDirectory(this.backupAuditLogsDir)
  }

  public loadAccountAudit(accountId: string): Record<string, Record<number, MessageItem>> {
    if (this.auditCache.has(accountId)) {
      return this.auditCache.get(accountId)!
    }
    const filePath = this.getAuditFilePath(accountId)
    const backupFilePath = this.getBackupAuditFilePath(accountId)
    let data: Record<string, Record<number, MessageItem>> = {}

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        data = parsed.chats || parsed || {}
      } catch (err) {
        console.error(`[SessionStore] Failed to parse audit log for account ${accountId}:`, err)
      }
    } else if (fs.existsSync(backupFilePath)) {
      try {
        const raw = fs.readFileSync(backupFilePath, 'utf-8')
        const parsed = JSON.parse(raw)
        data = parsed.chats || parsed || {}
        if (!fs.existsSync(this.auditLogsDir)) {
          fs.mkdirSync(this.auditLogsDir, { recursive: true })
        }
        fs.writeFileSync(filePath, JSON.stringify({ chats: data }, null, 2), 'utf-8')
      } catch (err) {
        console.error(`[SessionStore] Failed to restore backup audit log for account ${accountId}:`, err)
      }
    }

    const { data: cleanData, wasPruned } = this.sanitizeAuditData(data)
    if (wasPruned) {
      data = cleanData
      this.auditCache.set(accountId, data)
      this.flushSaveAccountAuditSync(accountId)
    } else {
      this.auditCache.set(accountId, data)
    }

    return data
  }

  private saveAccountAudit(accountId: string, data: Record<string, Record<number, MessageItem>>, immediate: boolean = false): void {
    this.auditCache.set(accountId, data)
    if (immediate) {
      this.flushSaveAccountAuditSync(accountId)
    } else {
      this.scheduleSaveAccountAudit(accountId)
    }
  }

  public scheduleSaveAccountAudit(accountId: string, delayMs: number = 800): void {
    const existing = this.saveAuditTimers.get(accountId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      this.saveAuditTimers.delete(accountId)
      this.flushSaveAccountAudit(accountId).catch((err) => {
        console.error(`[SessionStore] Async save audit log error for account ${accountId}:`, err)
      })
    }, delayMs)
    this.saveAuditTimers.set(accountId, timer)
  }

  public async flushSaveAccountAudit(accountId: string): Promise<void> {
    const data = this.auditCache.get(accountId)
    if (!data) return

    if (this.isSavingAudit.get(accountId)) {
      this.pendingSaveAudit.set(accountId, true)
      return
    }

    this.isSavingAudit.set(accountId, true)
    try {
      // Use compact JSON to avoid 80% CPU serialization overhead on large audit logs
      const payload = JSON.stringify({ chats: data })
      const filePath = this.getAuditFilePath(accountId)
      const backupFilePath = this.getBackupAuditFilePath(accountId)

      if (!fs.existsSync(this.auditLogsDir)) {
        await fs.promises.mkdir(this.auditLogsDir, { recursive: true })
      }
      await fs.promises.writeFile(filePath, payload, 'utf-8')

      // Dual-layer safe backup mirroring (Guidegram Data Shield)
      try {
        if (!fs.existsSync(this.backupAuditLogsDir)) {
          await fs.promises.mkdir(this.backupAuditLogsDir, { recursive: true })
        }
        await fs.promises.writeFile(backupFilePath, payload, 'utf-8')
      } catch (backupErr) {
        console.error(`[SessionStore] Failed to mirror audit log to safe backup:`, backupErr)
      }
    } catch (err) {
      console.error(`[SessionStore] Failed to save audit log for account ${accountId}:`, err)
    } finally {
      this.isSavingAudit.set(accountId, false)
      if (this.pendingSaveAudit.get(accountId)) {
        this.pendingSaveAudit.delete(accountId)
        this.flushSaveAccountAudit(accountId).catch(() => {})
      }
    }
  }

  public flushSaveAccountAuditSync(accountId: string): void {
    const timer = this.saveAuditTimers.get(accountId)
    if (timer) {
      clearTimeout(timer)
      this.saveAuditTimers.delete(accountId)
    }
    const data = this.auditCache.get(accountId)
    if (!data) return

    try {
      const payload = JSON.stringify({ chats: data })
      const filePath = this.getAuditFilePath(accountId)
      const backupFilePath = this.getBackupAuditFilePath(accountId)

      if (!fs.existsSync(this.auditLogsDir)) {
        fs.mkdirSync(this.auditLogsDir, { recursive: true })
      }
      fs.writeFileSync(filePath, payload, 'utf-8')

      try {
        if (!fs.existsSync(this.backupAuditLogsDir)) {
          fs.mkdirSync(this.backupAuditLogsDir, { recursive: true })
        }
        fs.writeFileSync(backupFilePath, payload, 'utf-8')
      } catch (backupErr) {
        console.error(`[SessionStore] Failed to mirror audit log to safe backup:`, backupErr)
      }
    } catch (err) {
      console.error(`[SessionStore] Failed to sync save audit log for account ${accountId}:`, err)
    }
  }

  public flushAllAuditsSync(): void {
    for (const [accountId, timer] of this.saveAuditTimers.entries()) {
      clearTimeout(timer)
      this.flushSaveAccountAuditSync(accountId)
    }
    this.saveAuditTimers.clear()
  }

  public indexMessageChat(accountId: string, chatId: string, messageId: number): void {
    if (!accountId || !chatId || !messageId) return
    let accMap = this.messageChatIndex.get(accountId)
    if (!accMap) {
      accMap = new Map()
      this.messageChatIndex.set(accountId, accMap)
    }
    accMap.set(messageId, chatId)
    if (accMap.size > 10000) {
      const keys = Array.from(accMap.keys()).slice(0, 2000)
      for (const k of keys) accMap.delete(k)
    }
  }

  public storeRecentMessage(accountId: string, chatId: string, msg: MessageItem): void {
    if (!accountId || !chatId || !msg?.id) return
    let accMap = this.recentMessagesCache.get(accountId)
    if (!accMap) {
      accMap = new Map()
      this.recentMessagesCache.set(accountId, accMap)
    }
    // Store lightweight version without giant base64 payloads to keep memory usage minimal
    const clone = { ...msg }
    if (clone.senderAvatarUrl && clone.senderAvatarUrl.startsWith('data:')) {
      delete clone.senderAvatarUrl
    }
    accMap.set(msg.id, clone)
    if (accMap.size > 3000) {
      const keys = Array.from(accMap.keys()).slice(0, 1000)
      for (const k of keys) accMap.delete(k)
    }
  }

  public getRecentMessage(accountId: string, messageId: number): MessageItem | null {
    if (!accountId || !messageId) return null
    const accMap = this.recentMessagesCache.get(accountId)
    return accMap?.get(messageId) || null
  }

  public recordMessages(accountId: string, chatId: string, msgs: MessageItem[]): void {
    if (!accountId || !chatId || !Array.isArray(msgs) || msgs.length === 0) return

    for (const msg of msgs) {
      if (msg?.id) {
        this.indexMessageChat(accountId, chatId, msg.id)
        this.storeRecentMessage(accountId, chatId, msg)
      }
    }

    // CRITICAL: Normal unedited and non-deleted messages must NEVER be persisted to audit logs!
    const auditableMsgs = msgs.filter((m) => m?.id && (m.isDeletedLocally || (m.editHistory && m.editHistory.length > 0)))
    if (auditableMsgs.length === 0) return

    const audit = this.loadAccountAudit(accountId)
    if (!audit[chatId]) {
      audit[chatId] = {}
    }

    for (const msg of auditableMsgs) {
      const existing = audit[chatId][msg.id]
      if (existing) {
        audit[chatId][msg.id] = {
          ...existing,
          ...msg,
          isDeletedLocally: existing.isDeletedLocally || msg.isDeletedLocally,
          deletedAt: existing.deletedAt || msg.deletedAt,
          editDate: msg.editDate || existing.editDate,
          editHistory:
            existing.editHistory && existing.editHistory.length > 0
              ? existing.editHistory
              : msg.editHistory,
        }
      } else {
        audit[chatId][msg.id] = { ...msg }
      }
    }

    this.saveAccountAudit(accountId, audit)
  }

  public recordMessage(accountId: string, chatId: string, msg: MessageItem): void {
    if (!accountId || !chatId || !msg?.id) return

    this.indexMessageChat(accountId, chatId, msg.id)
    this.storeRecentMessage(accountId, chatId, msg)

    // CRITICAL: Normal unedited and non-deleted messages must NEVER be persisted to audit logs!
    if (!msg.isDeletedLocally && (!msg.editHistory || msg.editHistory.length === 0)) {
      return
    }

    const audit = this.loadAccountAudit(accountId)
    if (!audit[chatId]) {
      audit[chatId] = {}
    }

    const existing = audit[chatId][msg.id]
    if (existing) {
      audit[chatId][msg.id] = {
        ...existing,
        ...msg,
        isDeletedLocally: existing.isDeletedLocally || msg.isDeletedLocally,
        deletedAt: existing.deletedAt || msg.deletedAt,
        editDate: msg.editDate || existing.editDate,
        editHistory:
          existing.editHistory && existing.editHistory.length > 0
            ? existing.editHistory
            : msg.editHistory,
      }
    } else {
      audit[chatId][msg.id] = { ...msg }
    }

    this.saveAccountAudit(accountId, audit)
  }

  public recordMessageEdit(
    accountId: string,
    chatId: string,
    messageId: number,
    newText: string,
    editDate: number,
    entities?: MessageEntityItem[]
  ): MessageItem | null {
    if (!accountId || !messageId) return null
    let targetChatId = chatId
    if (!targetChatId) {
      targetChatId = this.findChatIdForMessageId(accountId, messageId) || ''
    }
    if (!targetChatId) return null

    this.indexMessageChat(accountId, targetChatId, messageId)

    const audit = this.loadAccountAudit(accountId)
    if (!audit[targetChatId]) {
      audit[targetChatId] = {}
    }

    const existing = audit[targetChatId][messageId]
    if (existing) {
      const priorHistory = existing.editHistory ? [...existing.editHistory] : []
      const priorText = existing.text
      if (priorText && priorText !== newText && !priorHistory.some((h) => h.text === priorText)) {
        priorHistory.push({
          text: priorText,
          date: existing.editDate || existing.date || Math.floor(Date.now() / 1000),
          entities: existing.entities,
          mediaType: existing.mediaType,
          mediaThumbnailUrl: existing.mediaThumbnailUrl,
          strippedThumb: existing.strippedThumb,
        })
      }

      existing.text = newText
      existing.editDate = editDate
      if (entities) existing.entities = entities
      existing.editHistory = priorHistory
      this.saveAccountAudit(accountId, audit)
      return existing
    } else {
      // Message was not previously in audit log. Capture original text from recent in-memory cache
      const recent = this.getRecentMessage(accountId, messageId)
      const priorHistory: MessageEditRevision[] = []
      if (recent?.text && recent.text !== newText) {
        priorHistory.push({
          text: recent.text,
          date: recent.editDate || recent.date || Math.floor(Date.now() / 1000),
          entities: recent.entities,
          mediaType: recent.mediaType,
          mediaThumbnailUrl: recent.mediaThumbnailUrl,
          strippedThumb: recent.strippedThumb,
        })
      }

      const item: MessageItem = {
        ...(recent || {}),
        id: messageId,
        chatId: targetChatId,
        accountId,
        text: newText,
        date: recent?.date || editDate,
        editDate,
        isOutgoing: recent?.isOutgoing ?? false,
        entities,
        editHistory: priorHistory,
      }
      audit[targetChatId][messageId] = item
      this.saveAccountAudit(accountId, audit)
      return item
    }
  }

  public recordMessageDelete(accountId: string, chatId: string, messageIds: number[]): MessageItem[] {
    if (!accountId || !messageIds || messageIds.length === 0) return []
    const audit = this.loadAccountAudit(accountId)
    const deletedItems: MessageItem[] = []
    const now = Math.floor(Date.now() / 1000)

    for (const msgId of messageIds) {
      let targetChatId = chatId
      if (!targetChatId) {
        targetChatId = this.findChatIdForMessageId(accountId, msgId) || ''
      }
      if (!targetChatId) continue

      if (!audit[targetChatId]) {
        audit[targetChatId] = {}
      }

      let existing = audit[targetChatId][msgId]
      if (existing) {
        existing.isDeletedLocally = true
        existing.deletedAt = existing.deletedAt || now
      } else {
        const recent = this.getRecentMessage(accountId, msgId)
        if (recent) {
          existing = {
            ...recent,
            isDeletedLocally: true,
            deletedAt: now,
          }
        } else {
          existing = {
            id: msgId,
            chatId: targetChatId,
            accountId,
            text: '[Message deleted]',
            date: now,
            isOutgoing: false,
            isDeletedLocally: true,
            deletedAt: now,
          }
        }
        audit[targetChatId][msgId] = existing
      }
      deletedItems.push(existing)
    }

    this.saveAccountAudit(accountId, audit)
    return deletedItems
  }

  public findChatIdForMessageId(accountId: string, messageId: number): string | null {
    if (!accountId || !messageId) return null
    const indexed = this.messageChatIndex.get(accountId)?.get(messageId)
    if (indexed) return indexed

    const audit = this.loadAccountAudit(accountId)
    for (const [cId, msgs] of Object.entries(audit)) {
      if (msgs[messageId]) return cId
    }
    return null
  }

  public getAuditLog(accountId: string, chatId: string): MessageItem[] {
    if (!accountId || !chatId) return []
    const audit = this.loadAccountAudit(accountId)
    const msgs = audit[chatId] || {}
    return Object.values(msgs).sort((a, b) => (a.date - b.date) || (a.id - b.id))
  }

  public mergeAuditLogIntoMessages(
    accountId: string,
    chatId: string,
    liveMessages: MessageItem[],
    keepDeleted = true
  ): MessageItem[] {
    if (!accountId || !chatId) return liveMessages
    const audit = this.loadAccountAudit(accountId)
    const auditMsgs = audit[chatId] || {}

    const map = new Map<number, MessageItem>()
    for (const live of liveMessages) {
      map.set(live.id, { ...live })
    }

    for (const [idStr, auditMsg] of Object.entries(auditMsgs)) {
      const id = Number(idStr)
      const live = map.get(id)
      if (live) {
        if (auditMsg.editHistory && auditMsg.editHistory.length > 0) {
          live.editHistory = auditMsg.editHistory
        }
        if (auditMsg.editDate) {
          live.editDate = auditMsg.editDate
        }
        if (auditMsg.isDeletedLocally) {
          live.isDeletedLocally = true
          live.deletedAt = auditMsg.deletedAt
        }
      } else if (keepDeleted && auditMsg.isDeletedLocally) {
        // Prevent injecting ghost placeholders that have no real message content or media
        const isGhost = (!auditMsg.text || auditMsg.text === '[Message deleted]') && !auditMsg.mediaType
        if (!isGhost) {
          map.set(id, { ...auditMsg })
        }
      }
    }

    const result = Array.from(map.values())
    result.sort((a, b) => (a.date - b.date) || (a.id - b.id))
    return result
  }

  /**
   * Save dialog list cache to disk for instant zero-latency startup (< 10ms read)
   */
  public saveDialogsCache(accountId: string, dialogs: DialogItem[]): void {
    if (!accountId || !Array.isArray(dialogs) || dialogs.length === 0) return
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true })
      }
      const filePath = path.join(this.cacheDir, `dialogs_${accountId}.json`)
      // Save up to 1000 most recent dialogs for deep instant offline scroll
      const dataToSave = dialogs.slice(0, 1000)
      fs.writeFileSync(filePath, JSON.stringify(dataToSave), 'utf-8')
    } catch (err) {
      console.error(`[SessionStore] Failed to save dialogs cache for ${accountId}:`, err)
    }
  }

  /**
   * Load cached dialogs from disk for instant UI display
   */
  public loadDialogsCache(accountId: string): DialogItem[] {
    if (!accountId) return []
    try {
      const filePath = path.join(this.cacheDir, `dialogs_${accountId}.json`)
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const avatarsDir = path.join(this.dataDir, 'avatars')
          return parsed.map((d: DialogItem) => {
            if (!d.avatarUrl || d.avatarUrl.length < 2000) {
              const cleanId = String(d.id).replace(/^-100/, '').replace(/^-/, '')
              const candidates = [
                path.join(avatarsDir, `avatar_${accountId}_${d.id}.jpg`),
                path.join(avatarsDir, `avatar_${accountId}_-100${cleanId}.jpg`),
                path.join(avatarsDir, `avatar_${accountId}_${cleanId}.jpg`),
              ]
              for (const p of candidates) {
                if (fs.existsSync(p)) {
                  try {
                    const stat = fs.statSync(p)
                    if (stat.size > 500) {
                      const data = fs.readFileSync(p)
                      d.avatarUrl = `data:image/jpeg;base64,${data.toString('base64')}`
                      break
                    }
                  } catch (_) {}
                }
              }
            }
            return d
          })
        }
      }
    } catch (err) {
      console.error(`[SessionStore] Failed to load dialogs cache for ${accountId}:`, err)
    }
    return []
  }

  /**
   * Prune stale cache files older than maxAgeDays to free memory and disk (Phase 18-19)
   */
  public pruneExpiredCache(maxAgeDays = 14): { removedFiles: number; freedBytes: number } {
    let removedFiles = 0
    let freedBytes = 0
    try {
      if (!fs.existsSync(this.cacheDir)) return { removedFiles, freedBytes }
      const now = Date.now()
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
      const entries = fs.readdirSync(this.cacheDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(this.cacheDir, entry.name)
          const stat = fs.statSync(fullPath)
          if (now - stat.mtimeMs > maxAgeMs) {
            freedBytes += stat.size
            fs.unlinkSync(fullPath)
            removedFiles++
          }
        }
      }
    } catch (err) {
      console.error('[SessionStore] pruneExpiredCache error:', err)
    }
    return { removedFiles, freedBytes }
  }

  /**
   * Load persistent peer access hashes across restarts
   */
  public loadPeerHashes(): Record<string, string> {
    try {
      const filePath = path.join(this.dataDir, 'peer_hashes.json')
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          return parsed
        }
      }
    } catch {}
    return {}
  }

  /**
   * Persist peer access hashes to disk
   */
  public savePeerHashes(hashes: Record<string, string>): void {
    try {
      const filePath = path.join(this.dataDir, 'peer_hashes.json')
      fs.writeFileSync(filePath, JSON.stringify(hashes, null, 2), 'utf-8')
    } catch (err) {
      console.error('[SessionStore] savePeerHashes error:', err)
    }
  }
}

