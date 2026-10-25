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

export interface IpcRedactionTelemetry {
  totalPayloadsProcessed: number
  sensitiveKeysStripped: number
  secretPatternsRedacted: number
  circularRefsResolved: number
  prototypePollutionBlocked: number
  nonSerializableTypesStripped: number
  errorsSanitized: number
  redactionsByChannel: Record<string, number>
}

export interface IpcRedactionOptions {
  channel?: string
  maskPhoneNumbers?: boolean
  preserveBigIntAsString?: boolean
  stripErrors?: boolean
}

/**
 * IpcPayloadRedactor (Layer 02 / Layer 08 / MM-004)
 * Strict Zero-Secret IPC Return Value Deep Redaction & Type Stripping Engine.
 *
 * Ensures no sensitive credentials (bot tokens, session strings, hex keys, passwords,
 * auth keys, cookies) or non-serializable / prototype-polluting payloads ever escape
 * the Electron Main process into Renderer or WebContents.
 */
export class IpcPayloadRedactor {
  // Blacklisted property names that must never cross IPC boundaries
  private static readonly SENSITIVE_KEYS: Set<string> = new Set([
    'sessionstring',
    'session_string',
    'session',
    'authkey',
    'auth_key',
    'apihash',
    'api_hash',
    'token',
    'bottoken',
    'bot_token',
    'password',
    'passcode',
    'currentpasscode',
    'newpasscode',
    'secret',
    'privatekey',
    'private_key',
    'apikey',
    'api_key',
    'masterpasscode',
    'master_passcode',
    'salt',
    'encryptionkey',
    'encryption_key',
    'cookie',
    'credential',
    'pin',
  ])

  // Prototype pollution keys strictly forbidden
  private static readonly DANGEROUS_PROTO_KEYS: Set<string> = new Set([
    '__proto__',
    'constructor',
    'prototype',
  ])

  // Regular expression heuristics for credentials and tokens
  public static readonly PATTERNS = {
    botToken: /\b\d{8,12}:[A-Za-z0-9_-]{30,45}\b/g,
    hexKey: /\b[0-9a-fA-F]{64,512}\b/g,
    sessionString: /\b[1-4]\/[A-Za-z0-9+/=_-]{40,}\b/g,
    jwt: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    authHeader: /(?:Bearer|Token)\s+[A-Za-z0-9._~+/-]{15,}/gi,
    phone: /\+?\b\d{10,15}\b/g,
    userPath: /([A-Za-z]:\\Users\\[^\\]+|(?:\/Users\/|\/home\/)[^\/]+)/gi,
  }

  // Telemetry metrics
  private static totalPayloadsProcessed: number = 0
  private static sensitiveKeysStripped: number = 0
  private static secretPatternsRedacted: number = 0
  private static circularRefsResolved: number = 0
  private static prototypePollutionBlocked: number = 0
  private static nonSerializableTypesStripped: number = 0
  private static errorsSanitized: number = 0
  private static redactionsByChannel: Record<string, number> = {}

  /**
   * Deeply sanitizes and redacts any payload before transmission across IPC.
   */
  public static deepRedact<T = any>(
    value: T,
    options: IpcRedactionOptions = {}
  ): T {
    this.totalPayloadsProcessed++
    const seen = new WeakSet<object>()
    return this.traverse(value, seen, options, 0)
  }

  /**
   * Internal recursive traversal with cycle detection and depth limiting.
   */
  private static traverse(
    val: any,
    seen: WeakSet<object>,
    options: IpcRedactionOptions,
    depth: number
  ): any {
    // 1. Primitive handling
    if (val === null || val === undefined) {
      return val
    }

    const type = typeof val

    if (type === 'string') {
      return this.redactString(val, options)
    }

    if (type === 'number' || type === 'boolean') {
      return val
    }

    if (type === 'bigint') {
      // BigInt does not natively serialize over standard IPC without throwing
      if (options.preserveBigIntAsString !== false) {
        return val.toString()
      }
      return val <= Number.MAX_SAFE_INTEGER && val >= Number.MIN_SAFE_INTEGER
        ? Number(val)
        : val.toString()
    }

    if (type === 'function' || type === 'symbol') {
      this.nonSerializableTypesStripped++
      return undefined
    }

    // 2. Guard against extreme recursion
    if (depth > 64) {
      Logger.warn('[IpcPayloadRedactor] Traversal reached max depth (64), truncating')
      return '[TRUNCATED_DEPTH]'
    }

    // 3. Object / Reference handling
    if (typeof val === 'object') {
      // Circular reference detection
      if (seen.has(val)) {
        this.circularRefsResolved++
        return '[Circular]'
      }
      seen.add(val)

      // Handle Error instances
      if (val instanceof Error) {
        return this.sanitizeError(val, options)
      }

      // Handle Date instances
      if (val instanceof Date) {
        return new Date(val.getTime())
      }

      // Handle Buffer / Uint8Array (leave binary buffers intact or mark size)
      if (Buffer.isBuffer(val)) {
        return val
      }

      // Handle Array
      if (Array.isArray(val)) {
        const sanitizedArray: any[] = []
        for (let i = 0; i < val.length; i++) {
          const item = val[i]
          if (typeof item === 'function' || typeof item === 'symbol') {
            this.nonSerializableTypesStripped++
            continue
          }
          sanitizedArray.push(this.traverse(item, seen, options, depth + 1))
        }
        return sanitizedArray
      }

      // Handle Map / Set conversion to safe JSON equivalents
      if (val instanceof Map) {
        const safeObj: Record<string, any> = {}
        for (const [k, v] of val.entries()) {
          const strKey = String(k)
          if (this.isSensitiveKey(strKey)) {
            this.recordKeyStrip(options.channel, strKey)
            continue
          }
          safeObj[strKey] = this.traverse(v, seen, options, depth + 1)
        }
        return safeObj
      }

      if (val instanceof Set) {
        const safeArr: any[] = []
        for (const item of val) {
          if (typeof item === 'function' || typeof item === 'symbol') {
            this.nonSerializableTypesStripped++
            continue
          }
          safeArr.push(this.traverse(item, seen, options, depth + 1))
        }
        return safeArr
      }

      // Handle plain object & general instances
      const sanitizedObj: Record<string, any> = Object.create(null)

      // Get own enumerable keys + symbols
      const keys = Object.keys(val)

      for (const key of keys) {
        // Prototype pollution check
        if (this.DANGEROUS_PROTO_KEYS.has(key)) {
          this.prototypePollutionBlocked++
          Logger.warn(`[IpcPayloadRedactor] Prototype pollution key dropped: '${key}'`)
          continue
        }

        // Sensitive key name blacklist
        if (this.isSensitiveKey(key)) {
          this.recordKeyStrip(options.channel, key)
          continue
        }

        const childVal = val[key]

        // Strip non-serializable function/symbol
        if (typeof childVal === 'function' || typeof childVal === 'symbol') {
          this.nonSerializableTypesStripped++
          continue
        }

        const cleanedVal = this.traverse(childVal, seen, options, depth + 1)
        if (cleanedVal !== undefined) {
          sanitizedObj[key] = cleanedVal
        }
      }

      return sanitizedObj
    }

    return val
  }

  /**
   * Scans and redacts sensitive patterns from a string value.
   */
  public static redactString(str: string, options: IpcRedactionOptions = {}): string {
    if (!str || typeof str !== 'string') return str

    let sanitized = str
    let modified = false

    // 1. Bot Tokens
    if (this.PATTERNS.botToken.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.botToken, () => {
        this.recordPatternRedact(options.channel)
        return '[REDACTED_BOT_TOKEN]'
      })
      modified = true
    }

    // 2. MTProto Session Strings
    if (this.PATTERNS.sessionString.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.sessionString, () => {
        this.recordPatternRedact(options.channel)
        return '[REDACTED_SESSION_STRING]'
      })
      modified = true
    }

    // 3. Hex Keys (64+ hex characters)
    if (this.PATTERNS.hexKey.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.hexKey, () => {
        this.recordPatternRedact(options.channel)
        return '[REDACTED_HEX_KEY]'
      })
      modified = true
    }

    // 4. JWT Tokens
    if (this.PATTERNS.jwt.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.jwt, () => {
        this.recordPatternRedact(options.channel)
        return '[REDACTED_JWT]'
      })
      modified = true
    }

    // 5. Auth Headers
    if (this.PATTERNS.authHeader.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.authHeader, (match) => {
        this.recordPatternRedact(options.channel)
        const prefix = match.split(' ')[0]
        return `${prefix} [REDACTED_AUTH_TOKEN]`
      })
      modified = true
    }

    // 6. Optional phone number masking
    if (options.maskPhoneNumbers && this.PATTERNS.phone.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.phone, () => {
        this.recordPatternRedact(options.channel)
        return '[REDACTED_PHONE]'
      })
      modified = true
    }

    // 7. Strip internal OS user paths from messages
    if (this.PATTERNS.userPath.test(sanitized)) {
      sanitized = sanitized.replace(this.PATTERNS.userPath, '[LOCAL_USER_PATH]')
      modified = true
    }

    return modified ? sanitized : str
  }

  /**
   * Sanitizes error objects to prevent leaking internal stack traces or secrets.
   */
  public static sanitizeError(
    err: any,
    options: IpcRedactionOptions = {}
  ): Record<string, any> {
    this.errorsSanitized++

    if (!err) {
      return { error: true, message: 'Unknown error' }
    }

    const message = typeof err.message === 'string'
      ? this.redactString(err.message, options)
      : 'Internal error occurred'

    let stack = typeof err.stack === 'string'
      ? this.redactString(err.stack, options)
      : undefined

    // In production or when stripErrors is on, shorten stack to avoid exposing main architecture
    if (options.stripErrors || process.env.NODE_ENV === 'production') {
      stack = undefined
    }

    return {
      error: true,
      name: err.name || 'Error',
      message,
      code: err.code || undefined,
      stack,
      sanitized: true,
    }
  }

  /**
   * Safely dispatches an event via WebContents.send with deep argument redaction.
   */
  public static safeSend(
    webContents: any,
    channel: string,
    ...args: any[]
  ): void {
    if (!webContents || typeof webContents.send !== 'function') return
    try {
      const sanitizedArgs = args.map((arg) =>
        this.deepRedact(arg, { channel })
      )
      webContents.send(channel, ...sanitizedArgs)
    } catch (err) {
      Logger.error(`[IpcPayloadRedactor] Failed to safeSend on '${channel}':`, err)
    }
  }

  /**
   * Helper to check if a property key matches any blacklisted sensitive terms.
   */
  private static isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase().replace(/[-_]/g, '')
    return this.SENSITIVE_KEYS.has(normalized)
  }

  private static recordKeyStrip(channel?: string, key?: string): void {
    this.sensitiveKeysStripped++
    const ch = channel || 'unspecified'
    this.redactionsByChannel[ch] = (this.redactionsByChannel[ch] || 0) + 1
    Logger.warn(`[IpcPayloadRedactor] Stripped sensitive key '${key}' on channel '${ch}'`)
  }

  private static recordPatternRedact(channel?: string): void {
    this.secretPatternsRedacted++
    const ch = channel || 'unspecified'
    this.redactionsByChannel[ch] = (this.redactionsByChannel[ch] || 0) + 1
  }

  /**
   * Returns telemetry metrics for audits and dashboard.
   */
  public static getTelemetry(): IpcRedactionTelemetry {
    return {
      totalPayloadsProcessed: this.totalPayloadsProcessed,
      sensitiveKeysStripped: this.sensitiveKeysStripped,
      secretPatternsRedacted: this.secretPatternsRedacted,
      circularRefsResolved: this.circularRefsResolved,
      prototypePollutionBlocked: this.prototypePollutionBlocked,
      nonSerializableTypesStripped: this.nonSerializableTypesStripped,
      errorsSanitized: this.errorsSanitized,
      redactionsByChannel: { ...this.redactionsByChannel },
    }
  }

  /**
   * Resets telemetry metrics (for test isolation).
   */
  public static resetTelemetry(): void {
    this.totalPayloadsProcessed = 0
    this.sensitiveKeysStripped = 0
    this.secretPatternsRedacted = 0
    this.circularRefsResolved = 0
    this.prototypePollutionBlocked = 0
    this.nonSerializableTypesStripped = 0
    this.errorsSanitized = 0
    this.redactionsByChannel = {}
  }
}
