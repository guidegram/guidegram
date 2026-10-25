import fs from 'fs'
import path from 'path'

// Resilient logger fallback
let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // ESM test runner fallback
}

export interface RedactionStats {
  botTokens: number
  hexKeys: number
  sessionStrings: number
  phoneNumbers: number
  authHeaders: number
  passcodes: number
}

/**
 * CrashMemoryScrubber (Layer 08 / MM-205 / MM-004)
 * Zero-Credential Crash Dump & Memory Exception Scrubber.
 *
 * Sanitizes crash reports, error stacks, minidump metadata, and exception messages
 * before writing to persistent disk storage. Eliminates credential leakage of bot tokens,
 * 64/256-hex auth keys, phone numbers, session strings, and passwords.
 */
export class CrashMemoryScrubber {
  // Regex heuristics for sensitive Telegram & application credentials
  public static readonly PATTERNS = {
    botToken: /\b\d{8,12}:[A-Za-z0-9_-]{30,45}\b/g,
    hexKey: /\b[0-9a-fA-F]{64,512}\b/g,
    sessionString: /\b[1-4]\/[A-Za-z0-9+/=_-]{40,}\b/g,
    authHeader: /(?:Bearer|Token)\s+[A-Za-z0-9._~+/-]{15,}/gi,
    passcodeField: /(["']?(?:passcode|password|secret|apiKey)["']?\s*[:=]\s*["']?)([^"',\s}]+)(["']?)/gi,
    phone: /\+?\b\d{10,15}\b/g,
  }

  /**
   * Redacts all sensitive credential patterns from a given string.
   */
  public static redactText(text: string): { sanitized: string; stats: RedactionStats } {
    if (!text || typeof text !== 'string') {
      return {
        sanitized: '',
        stats: { botTokens: 0, hexKeys: 0, sessionStrings: 0, phoneNumbers: 0, authHeaders: 0, passcodes: 0 },
      }
    }

    const stats: RedactionStats = {
      botTokens: 0,
      hexKeys: 0,
      sessionStrings: 0,
      phoneNumbers: 0,
      authHeaders: 0,
      passcodes: 0,
    }

    let sanitized = text

    // 1. Bot Tokens
    sanitized = sanitized.replace(new RegExp(this.PATTERNS.botToken.source, 'g'), () => {
      stats.botTokens++
      return '[REDACTED_BOT_TOKEN]'
    })

    // 2. MTProto Session Strings
    sanitized = sanitized.replace(new RegExp(this.PATTERNS.sessionString.source, 'g'), () => {
      stats.sessionStrings++
      return '[REDACTED_SESSION_STRING]'
    })

    // 3. Hex Keys (Auth keys, DH exponents, HMAC keys)
    sanitized = sanitized.replace(new RegExp(this.PATTERNS.hexKey.source, 'g'), () => {
      stats.hexKeys++
      return '[REDACTED_HEX_KEY]'
    })

    // 4. Authorization Headers
    sanitized = sanitized.replace(new RegExp(this.PATTERNS.authHeader.source, 'gi'), (match) => {
      stats.authHeaders++
      const prefix = match.split(' ')[0]
      return `${prefix} [REDACTED_AUTH_TOKEN]`
    })

    // 5. Explicit Passcode / Secret Fields
    sanitized = sanitized.replace(new RegExp(this.PATTERNS.passcodeField.source, 'gi'), (_match, prefix, _val, suffix) => {
      stats.passcodes++
      return `${prefix}[REDACTED_SECRET]${suffix}`
    })

    // 6. Phone Numbers
    sanitized = sanitized.replace(new RegExp(this.PATTERNS.phone.source, 'g'), () => {
      stats.phoneNumbers++
      return '[REDACTED_PHONE]'
    })

    return { sanitized, stats }
  }

  /**
   * Deeply traverses and redacts an object or error report.
   */
  public static redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj

    if (typeof obj === 'string') {
      return this.redactText(obj).sanitized as unknown as T
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {}
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'string') {
          result[key] = this.redactText(val).sanitized
        } else if (typeof val === 'object' && val !== null) {
          result[key] = this.redactObject(val)
        } else {
          result[key] = val
        }
      }
      return result as T
    }

    return obj
  }

  /**
   * Scans a directory of existing crash dumps and applies retroactive redaction.
   */
  public static cleanseDirectory(dirPath: string): { filesCleaned: number; totalRedactions: number } {
    let filesCleaned = 0
    let totalRedactions = 0

    if (!dirPath || !fs.existsSync(dirPath)) {
      return { filesCleaned, totalRedactions }
    }

    try {
      const files = fs.readdirSync(dirPath)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const fullPath = path.join(dirPath, file)
        try {
          const content = fs.readFileSync(fullPath, 'utf8')
          const { sanitized, stats } = this.redactText(content)
          const redactionsInFile =
            stats.botTokens + stats.hexKeys + stats.sessionStrings + stats.phoneNumbers + stats.authHeaders + stats.passcodes

          if (redactionsInFile > 0) {
            fs.writeFileSync(fullPath, sanitized, 'utf8')
            filesCleaned++
            totalRedactions += redactionsInFile
            Logger.info(`[CrashMemoryScrubber] Retroactively redacted ${redactionsInFile} secrets from: ${file}`)
          }
        } catch (fileErr) {
          Logger.warn(`[CrashMemoryScrubber] Failed to cleanse file ${file}:`, fileErr)
        }
      }
    } catch (dirErr) {
      Logger.warn(`[CrashMemoryScrubber] Failed to read directory ${dirPath}:`, dirErr)
    }

    return { filesCleaned, totalRedactions }
  }
}
