import fs from 'fs'
import path from 'path'
import { AppConfig, AccountInfo, ProxyConfig, CacheStats } from './types'

export class SessionStore {
  private dataDir: string
  private sessionsDir: string
  private configFilePath: string
  private config: AppConfig
  private safeBackupDir: string
  private backupConfigPath: string
  private backupSessionsDir: string

  constructor(baseDataDir: string) {
    this.dataDir = baseDataDir
    this.sessionsDir = path.join(this.dataDir, 'sessions')
    this.configFilePath = path.join(this.dataDir, 'config.json')

    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : path.join(process.env.HOME || '', '.config'))
    this.safeBackupDir = path.join(appData, 'Guidegram', 'safe_backup')
    this.backupConfigPath = path.join(this.safeBackupDir, 'config.json')
    this.backupSessionsDir = path.join(this.safeBackupDir, 'sessions')

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
    try {
      if (!fs.existsSync(this.safeBackupDir)) {
        fs.mkdirSync(this.safeBackupDir, { recursive: true })
      }
      if (!fs.existsSync(this.backupSessionsDir)) {
        fs.mkdirSync(this.backupSessionsDir, { recursive: true })
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
}
