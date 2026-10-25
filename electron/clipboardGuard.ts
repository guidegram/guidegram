let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // Fallback for ESM test runner
}

export interface ClipboardWriteOptions {
  isSensitive?: boolean
  ttlMs?: number
}

/**
 * ClipboardGuard (Layer 08 / Anti-Data Exfiltration)
 * Automatically zeroes out sensitive tokens, 2FA passwords, auth keys,
 * and bot tokens from OS clipboard after a configurable TTL (default 30 seconds).
 * Prevents clipboard scraping by background desktop utilities.
 */
export class ClipboardGuard {
  private static activeTimer: NodeJS.Timeout | null = null
  private static sensitiveTextHash: string | null = null
  private static expiresAt = 0

  // Heuristic patterns for sensitive credentials
  private static readonly BOT_TOKEN_REGEX = /\b\d{8,11}:[A-Za-z0-9_-]{35}\b/
  private static readonly HEX_SECRET_REGEX = /\b[0-9a-fA-F]{64,512}\b/
  private static readonly BIP39_SEED_REGEX = /\b([a-z]{3,10}\s+){11,23}[a-z]{3,10}\b/i

  /**
   * Evaluates if text matches known high-risk Telegram or crypto secret formats.
   */
  public static isSensitiveSecret(text: string): boolean {
    if (!text || typeof text !== 'string') return false
    const trimmed = text.trim()
    return (
      this.BOT_TOKEN_REGEX.test(trimmed) ||
      this.HEX_SECRET_REGEX.test(trimmed) ||
      this.BIP39_SEED_REGEX.test(trimmed)
    )
  }

  /**
   * Writes text to the OS clipboard, with optional or automatic TTL auto-wipe for sensitive credentials.
   */
  public static writeText(
    text: string,
    options: ClipboardWriteOptions = {},
    customClipboard?: any
  ): boolean {
    if (typeof text !== 'string') return false

    // Resolve Electron clipboard
    let clip = customClipboard
    if (!clip) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const electron = require('electron')
        clip = electron.clipboard
      } catch {
        // Headless test runner fallback
      }
    }

    if (!clip || typeof clip.writeText !== 'function') {
      return false
    }

    try {
      clip.writeText(text)
    } catch (err) {
      Logger.warn('[ClipboardGuard] Failed to write text to clipboard:', err)
      return false
    }

    const isSensitive = options.isSensitive ?? this.isSensitiveSecret(text)
    const ttlMs = options.ttlMs ?? 30000

    this.cancelPendingClear()

    if (isSensitive && ttlMs > 0) {
      this.sensitiveTextHash = text
      this.expiresAt = Date.now() + ttlMs

      Logger.info(`[ClipboardGuard] Sensitive text copied. Auto-clearing in ${ttlMs / 1000}s.`)

      this.activeTimer = setTimeout(() => {
        try {
          if (clip && typeof clip.readText === 'function') {
            const currentContent = clip.readText()
            // Only clear if user has not copied something else
            if (currentContent === this.sensitiveTextHash) {
              clip.clear()
              Logger.info('[ClipboardGuard] Sensitive clipboard token auto-cleared successfully.')
            }
          }
        } catch (err) {
          Logger.warn('[ClipboardGuard] Error during clipboard auto-clear:', err)
        } finally {
          this.sensitiveTextHash = null
          this.activeTimer = null
          this.expiresAt = 0
        }
      }, ttlMs)
    }

    return true
  }

  /**
   * Cancels any pending clipboard auto-clear timer.
   */
  public static cancelPendingClear(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer)
      this.activeTimer = null
    }
    this.sensitiveTextHash = null
    this.expiresAt = 0
  }

  /**
   * Returns remaining TTL in milliseconds, or 0 if no active timer.
   */
  public static getRemainingTtlMs(): number {
    if (!this.activeTimer || this.expiresAt <= 0) return 0
    return Math.max(0, this.expiresAt - Date.now())
  }
}
