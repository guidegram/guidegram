// Resilient logger fallback
let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}

// Resilient origin validator
let isInternalOrigin = (urlStr: string): boolean => {
  if (!urlStr) return false
  try {
    const parsed = new URL(urlStr)
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.protocol === 'guidegram:' ||
      parsed.protocol === 'guidegram-media:' ||
      parsed.protocol === 'file:'
    )
  } catch {
    return false
  }
}

// Resilient rate limiter fallback
let rateLimiterInstance: any = {
  consume: (_channel: string) => true,
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // ESM test runner fallback
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const guardrails = require('./securityGuardrails')
  if (guardrails?.SecurityGuardrails?.isInternalAppOrigin) {
    isInternalOrigin = guardrails.SecurityGuardrails.isInternalAppOrigin
  }
} catch {
  // ESM test runner fallback
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rl = require('./rateLimiter')
  if (rl?.globalIpcRateLimiter) {
    rateLimiterInstance = rl.globalIpcRateLimiter
  }
} catch {
  // ESM test runner fallback
}

export interface IpcSenderValidationResult {
  valid: boolean
  reason?: string
  senderUrl?: string
}

export interface IpcSecurityTelemetry {
  totalChecked: number
  totalAllowed: number
  totalBlocked: number
  violationsByChannel: Record<string, number>
}

/**
 * IpcSecurityFilter (Layer 02 / Layer 08 / MM-015)
 * Strict IPC Sender Frame Verification & Privilege Boundary Guard.
 *
 * Verifies that every IPC call originates from a legitimate, privileged top-level frame
 * (file:// or localhost dev server). Prevents subframe privilege escalation,
 * malicious WebView injection, and rogue third-party frame IPC spoofing.
 */
export class IpcSecurityFilter {
  private static totalChecked: number = 0
  private static totalAllowed: number = 0
  private static totalBlocked: number = 0
  private static violationsByChannel: Record<string, number> = {}

  /**
   * Validates whether an incoming IPC event was dispatched by a trusted frame.
   */
  public static validateSender(
    event: any,
    options: { channel?: string; allowSubFrames?: boolean } = {}
  ): IpcSenderValidationResult {
    this.totalChecked++

    if (!event) {
      this.recordViolation(options.channel || 'unknown', 'Missing IPC event context')
      return { valid: false, reason: 'Missing IPC event context' }
    }

    // In Electron, event.senderFrame represents the WebFrameMain that dispatched the message
    const frame = event.senderFrame
    let url: string = ''

    if (frame) {
      url = frame.url || ''

      // MM-015: Enforce top-level frame privilege boundary unless subframes are explicitly authorized
      if (frame.parent && !options.allowSubFrames) {
        const reason = `Subframe IPC execution denied (parent frame exists): ${url}`
        this.recordViolation(options.channel || 'unknown', reason, url)
        return { valid: false, reason, senderUrl: url }
      }
    } else if (event.sender && event.sender.getURL) {
      url = event.sender.getURL() || ''
    }

    if (!url) {
      // In headless test environments or synthetic calls, verify if sender is mocked
      if (process.env.NODE_ENV === 'test' && event._isTestSender) {
        this.totalAllowed++
        return { valid: true, senderUrl: 'test://trusted' }
      }
      const reason = 'Unable to determine IPC sender frame URL'
      this.recordViolation(options.channel || 'unknown', reason)
      return { valid: false, reason }
    }

    const isInternal = isInternalOrigin(url)
    if (!isInternal) {
      const reason = `Untrusted frame origin rejected: ${url}`
      this.recordViolation(options.channel || 'unknown', reason, url)
      return { valid: false, reason, senderUrl: url }
    }

    this.totalAllowed++
    return { valid: true, senderUrl: url }
  }

  /**
   * Wraps an IPC handler with strict sender-frame verification and rate limiting.
   */
  public static wrapHandler(
    channel: string,
    handler: (event: any, ...args: any[]) => Promise<any> | any,
    options: { allowSubFrames?: boolean; tier?: string } = {}
  ): (event: any, ...args: any[]) => Promise<any> {
    return async (event: any, ...args: any[]) => {
      // 1. Strict Sender Frame Verification
      const validation = this.validateSender(event, { channel, allowSubFrames: options.allowSubFrames })
      if (!validation.valid) {
        Logger.error(`[IpcSecurityFilter] Security violation on channel '${channel}': ${validation.reason}`)
        throw new Error(`[SecurityViolation] Access denied on channel '${channel}': ${validation.reason}`)
      }

      // 2. Token Bucket Rate Limiting (MM-052)
      const allowed = rateLimiterInstance.consume(channel)
      if (!allowed) {
        Logger.warn(`[IpcSecurityFilter] Rate limit exceeded on channel '${channel}'`)
        throw new Error(`[RateLimitExceeded] Too many requests on channel '${channel}'`)
      }

      // 3. Execute genuine handler
      return await handler(event, ...args)
    }
  }

  /**
   * Helper to register a secured IPC handler on ipcMain.
   */
  public static registerSecure(
    ipcMain: any,
    channel: string,
    handler: (event: any, ...args: any[]) => Promise<any> | any,
    options: { allowSubFrames?: boolean; tier?: string } = {}
  ): void {
    if (!ipcMain || typeof ipcMain.handle !== 'function') return
    ipcMain.handle(channel, this.wrapHandler(channel, handler, options))
  }

  /**
   * Returns security violation telemetry for reporting and audits.
   */
  public static getTelemetry(): IpcSecurityTelemetry {
    return {
      totalChecked: this.totalChecked,
      totalAllowed: this.totalAllowed,
      totalBlocked: this.totalBlocked,
      violationsByChannel: { ...this.violationsByChannel },
    }
  }

  /**
   * Resets telemetry metrics (for test isolation).
   */
  public static resetTelemetry(): void {
    this.totalChecked = 0
    this.totalAllowed = 0
    this.totalBlocked = 0
    this.violationsByChannel = {}
  }

  private static recordViolation(channel: string, reason: string, url?: string): void {
    this.totalBlocked++
    this.violationsByChannel[channel] = (this.violationsByChannel[channel] || 0) + 1
    Logger.warn(`[IpcSecurityFilter] Blocked IPC violation [${channel}]: ${reason}${url ? ` (Origin: ${url})` : ''}`)
  }
}
