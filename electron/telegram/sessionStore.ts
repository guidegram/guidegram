import fs from 'fs'
import path from 'path'
import { AppConfig, AccountInfo, ProxyConfig, CacheStats, MessageItem, MessageEntityItem, MessageEditRevision } from './types'

export class SessionStore {
  private dataDir: string
  private sessionsDir: string
  private auditLogsDir: string
  private configFilePath: string
  private config: AppConfig
  private safeBackupDir: string
  private backupConfigPath: string
  private backupSessionsDir: string
  private backupAuditLogsDir: string
  private auditCache: Map<string, Record<string, Record<number, MessageItem>>> = new Map()

  constructor(baseDataDir: string) {
    this.dataDir = baseDataDir
    this.sessionsDir = path.join(this.dataDir, 'sessions')
    this.auditLogsDir = path.join(this.dataDir, 'audit_logs')
    this.configFilePath = path.join(this.dataDir, 'config.json')

    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : path.join(process.env.HOME || '', '.config'))
    this.safeBackupDir = path.join(appData, 'Guidegram', 'safe_backup')
    this.backupConfigPath = path.join(this.safeBackupDir, 'config.json')
    this.backupSessionsDir = path.join(this.safeBackupDir, 'sessions')
    this.backupAuditLogsDir = path.join(this.safeBackupDir, 'audit_logs')

    this.ensureDirectories()
    this.config = this.loadConfig()
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
      },
      notificationsEnabled: true,
      soundEnabled: true,
      downloadsPath: path.join(this.dataDir, 'downloads'),
      alwaysAskDownloadPath: false,
      chatFontSize: 14,
      bubbleRadius: 16,
      bubblePadding: 10,
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
    const filePath = path.join(this.sessionsDir, `session_${accountId}.txt`)
    fs.writeFileSync(filePath, sessionString, 'utf-8')
    try {
      const backupFilePath = path.join(this.backupSessionsDir, `session_${accountId}.txt`)
      fs.writeFileSync(backupFilePath, sessionString, 'utf-8')
    } catch (err) {
      console.error('[SessionStore] Failed to mirror session to safe backup:', err)
    }
  }

  public getSessionString(accountId: string): string | null {
    const filePath = path.join(this.sessionsDir, `session_${accountId}.txt`)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim()
    }
    // Fallback: recover from mirrored safe backup if local file was deleted!
    try {
      const backupFilePath = path.join(this.backupSessionsDir, `session_${accountId}.txt`)
      if (fs.existsSync(backupFilePath)) {
        const str = fs.readFileSync(backupFilePath, 'utf-8').trim()
        fs.writeFileSync(filePath, str, 'utf-8')
        return str
      }
    } catch {
      // Safe fallback
    }
    return null
  }

  public removeSession(accountId: string): void {
    const filePath = path.join(this.sessionsDir, `session_${accountId}.txt`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    try {
      const backupFilePath = path.join(this.backupSessionsDir, `session_${accountId}.txt`)
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

  private loadAccountAudit(accountId: string): Record<string, Record<number, MessageItem>> {
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

    this.auditCache.set(accountId, data)
    return data
  }

  private saveAccountAudit(accountId: string, data: Record<string, Record<number, MessageItem>>): void {
    this.auditCache.set(accountId, data)
    const payload = JSON.stringify({ chats: data }, null, 2)
    try {
      if (!fs.existsSync(this.auditLogsDir)) {
        fs.mkdirSync(this.auditLogsDir, { recursive: true })
      }
      fs.writeFileSync(this.getAuditFilePath(accountId), payload, 'utf-8')

      // Dual-layer safe backup mirroring (Guidegram Data Shield)
      try {
        if (!fs.existsSync(this.backupAuditLogsDir)) {
          fs.mkdirSync(this.backupAuditLogsDir, { recursive: true })
        }
        fs.writeFileSync(this.getBackupAuditFilePath(accountId), payload, 'utf-8')
      } catch (backupErr) {
        console.error(`[SessionStore] Failed to mirror audit log to safe backup:`, backupErr)
      }
    } catch (err) {
      console.error(`[SessionStore] Failed to save audit log for account ${accountId}:`, err)
    }
  }

  public recordMessage(accountId: string, chatId: string, msg: MessageItem): void {
    if (!accountId || !chatId || !msg?.id) return
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

    // Prune unedited/non-deleted messages when chat exceeds 500 records
    const messageKeys = Object.keys(audit[chatId])
    if (messageKeys.length > 500) {
      const normalIds = messageKeys
        .map(Number)
        .filter((id) => {
          const item = audit[chatId][id]
          return !item.isDeletedLocally && (!item.editHistory || item.editHistory.length === 0)
        })
        .sort((a, b) => a - b)

      const excessCount = messageKeys.length - 500
      const toPrune = normalIds.slice(0, excessCount)
      for (const pruneId of toPrune) {
        delete audit[chatId][pruneId]
      }
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
    const audit = this.loadAccountAudit(accountId)

    let targetChatId = chatId
    if (!targetChatId) {
      targetChatId = this.findChatIdForMessageId(accountId, messageId) || ''
    }
    if (!targetChatId) return null

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
      const item: MessageItem = {
        id: messageId,
        chatId: targetChatId,
        accountId,
        text: newText,
        date: editDate,
        editDate,
        isOutgoing: false,
        entities,
        editHistory: [],
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

      const existing = audit[targetChatId][msgId]
      if (existing) {
        existing.isDeletedLocally = true
        existing.deletedAt = existing.deletedAt || now
        deletedItems.push(existing)
      } else {
        const placeholder: MessageItem = {
          id: msgId,
          chatId: targetChatId,
          accountId,
          text: '[Message deleted]',
          date: now,
          isOutgoing: false,
          isDeletedLocally: true,
          deletedAt: now,
        }
        audit[targetChatId][msgId] = placeholder
        deletedItems.push(placeholder)
      }
    }

    this.saveAccountAudit(accountId, audit)
    return deletedItems
  }

  public findChatIdForMessageId(accountId: string, messageId: number): string | null {
    if (!accountId || !messageId) return null
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
    return Object.values(msgs).sort((a, b) => a.date - b.date)
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
        map.set(id, { ...auditMsg })
      }
    }

    const result = Array.from(map.values())
    result.sort((a, b) => a.date - b.date)
    return result
  }
}
