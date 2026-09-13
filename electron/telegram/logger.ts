import fs from 'fs'
import path from 'path'

export class Logger {
  private static logDir: string = ''
  private static logFile: string = ''
  private static errorFile: string = ''
  private static initialized: boolean = false

  public static initialize(baseDataDir: string) {
    try {
      this.logDir = path.join(baseDataDir, 'logs')
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
      this.logFile = path.join(this.logDir, 'guidegram.log')
      this.errorFile = path.join(this.logDir, 'error.log')
      this.initialized = true

      this.info('=====================================================')
      this.info(`[Logger] Guidegram Logger initialized at: ${new Date().toISOString()}`)
      this.info(`[Logger] Log Directory: ${this.logDir}`)
      this.info('=====================================================')
    } catch (err) {
      console.error('[Logger] Failed to initialize file logger:', err)
    }
  }

  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    let metaStr = ''
    if (meta) {
      if (meta instanceof Error) {
        metaStr = `\n${meta.stack || meta.message}`
      } else if (typeof meta === 'object') {
        try {
          metaStr = ` ${JSON.stringify(meta)}`
        } catch (_) {
          metaStr = ` [Object]`
        }
      } else {
        metaStr = ` ${meta}`
      }
    }
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`
  }

  private static safeConsole(fn: () => void) {
    try {
      fn()
    } catch (_) {
      // Safely ignore broken pipes (EPIPE) and closed standard streams in GUI mode
    }
  }

  public static info(message: string, meta?: any) {
    const line = this.formatMessage('INFO', message, meta)
    this.safeConsole(() => console.log(`[INFO] ${message}`, meta || ''))
    this.append(this.logFile, line)
  }

  public static warn(message: string, meta?: any) {
    const line = this.formatMessage('WARN', message, meta)
    this.safeConsole(() => console.warn(`[WARN] ${message}`, meta || ''))
    this.append(this.logFile, line)
  }

  public static error(message: string, error?: any) {
    const line = this.formatMessage('ERROR', message, error)
    this.safeConsole(() => console.error(`[ERROR] ${message}`, error || ''))
    this.append(this.logFile, line)
    this.append(this.errorFile, line)
  }

  public static debug(message: string, meta?: any) {
    const line = this.formatMessage('DEBUG', message, meta)
    this.safeConsole(() => console.debug(`[DEBUG] ${message}`, meta || ''))
    this.append(this.logFile, line)
  }

  private static writeQueue: Map<string, string[]> = new Map()
  private static isFlushing: boolean = false

  private static append(filePath: string, content: string) {
    if (!this.initialized || !filePath) return
    const queue = this.writeQueue.get(filePath) || []
    queue.push(content)
    this.writeQueue.set(filePath, queue)
    this.scheduleFlush()
  }

  private static scheduleFlush() {
    if (this.isFlushing) return
    this.isFlushing = true
    setImmediate(async () => {
      try {
        for (const [file, items] of this.writeQueue.entries()) {
          if (items.length === 0) continue
          const chunk = items.splice(0, items.length).join('')
          await fs.promises.appendFile(file, chunk, 'utf-8').catch(() => {})
        }
      } finally {
        this.isFlushing = false
        if (Array.from(this.writeQueue.values()).some((q) => q.length > 0)) {
          this.scheduleFlush()
        }
      }
    })
  }

  public static getRecentLogs(maxLines: number = 200): string {
    if (!this.initialized || !fs.existsSync(this.logFile)) {
      return 'No logs recorded yet.'
    }
    try {
      const content = fs.readFileSync(this.logFile, 'utf-8')
      const lines = content.trim().split('\n')
      return lines.slice(-maxLines).join('\n')
    } catch (err: any) {
      return `Failed to read log file: ${err?.message}`
    }
  }

  public static getLogPath(): string {
    return this.logFile
  }
}
