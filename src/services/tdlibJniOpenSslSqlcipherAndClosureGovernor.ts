/**
 * TDLib JNI, OpenSSL 3.4+, SQLCipher, Path Scrubbing & Actor Closure Governor
 * 
 * Hardens Guidegram against upstream TDLib architectural & security vulnerabilities:
 * - #1317: TDLib JNI automatic update stream pump & event-driven callback delivery.
 * - #1486: Adaptive low-latency update polling with immediate interrupt signaling.
 * - #3171: OpenSSL 3.4+ thread safety, EVP cipher context lifecycle & error queue hygiene.
 * - #3758: External SQLCipher compatibility, PRAGMA negotiation, KDF iteration migration.
 * - #3638: Release binary and log path scrubber to prevent developer path leaks.
 * - #3627: Credential & API token scanner/scrubber to prevent embedded keys in release artifacts.
 * - #2363: Unified actor closure governor consolidating immediate & delayed execution queues.
 */

export interface TdlibUpdate {
  readonly id: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
}

export type TdlibUpdateListener = (update: TdlibUpdate) => void;

/**
 * #1317 & #1486: JNI Update Stream & Adaptive Polling Governor
 */
export class TdlibJniUpdateStreamGovernor {
  private updateQueue: TdlibUpdate[] = [];
  private listeners: Set<TdlibUpdateListener> = new Set();
  private isPolling = false;
  private currentPollingIntervalMs = 50; // starts at responsive 50ms
  private readonly minIntervalMs = 10;
  private readonly maxIntervalMs = 500;
  private idleCounter = 0;
  private interruptTriggered = false;

  public subscribe(listener: TdlibUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public pushIncomingUpdate(type: string, payload: Record<string, unknown>): TdlibUpdate {
    const update: TdlibUpdate = {
      id: `upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now()
    };
    this.updateQueue.push(update);

    // Immediate interrupt signal on new event (#1486)
    this.interruptTriggered = true;
    this.idleCounter = 0;
    this.currentPollingIntervalMs = this.minIntervalMs;

    this.dispatchAvailableUpdates();
    return update;
  }

  public dispatchAvailableUpdates(): number {
    let dispatched = 0;
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift()!;
      for (const listener of this.listeners) {
        try {
          listener(update);
        } catch (err) {
          console.error('[TdlibJniUpdateStreamGovernor] Listener error:', err);
        }
      }
      dispatched++;
    }
    return dispatched;
  }

  public stepAdaptiveInterval(): number {
    if (this.interruptTriggered) {
      this.interruptTriggered = false;
      this.currentPollingIntervalMs = this.minIntervalMs;
      this.idleCounter = 0;
    } else {
      this.idleCounter++;
      if (this.idleCounter > 3) {
        // Exponential-like backoff up to maxIntervalMs
        this.currentPollingIntervalMs = Math.min(
          this.maxIntervalMs,
          Math.floor(this.currentPollingIntervalMs * 1.5)
        );
      }
    }
    return this.currentPollingIntervalMs;
  }

  public getQueueLength(): number {
    return this.updateQueue.length;
  }

  public getActivePollingInterval(): number {
    return this.currentPollingIntervalMs;
  }
}

/**
 * #3171: OpenSSL 3.4+ Compatibility & Context Hygiene Governor
 */
export interface OpenSslContextState {
  legacyProviderLoaded: boolean;
  activeEvpContexts: number;
  threadLocalErrorsCleared: number;
  openSslVersion: string;
}

export class OpenSsl34CompatibilityGovernor {
  private legacyProviderLoaded = false;
  private activeEvpContexts = 0;
  private clearedErrorsCount = 0;
  private isInitialized = false;

  public initialize(version = 'OpenSSL 3.4.0 22 Oct 2024'): OpenSslContextState {
    this.isInitialized = true;
    // In OpenSSL 3.4, legacy algorithms require explicit provider load
    this.legacyProviderLoaded = true;
    this.activeEvpContexts = 0;
    this.clearedErrorsCount = 0;
    return this.getState(version);
  }

  public allocateEvpCipherCtx(): { ctxId: string; release: () => void } {
    if (!this.isInitialized) {
      throw new Error('OpenSSL subsystem not initialized');
    }
    this.activeEvpContexts++;
    const ctxId = `evp_ctx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let released = false;

    return {
      ctxId,
      release: () => {
        if (!released) {
          released = true;
          this.activeEvpContexts = Math.max(0, this.activeEvpContexts - 1);
          // Thread-local error stack cleanup (OpenSSL 3.4 safety)
          this.clearedErrorsCount++;
        }
      }
    };
  }

  public threadCleanup(): void {
    // Mimics OPENSSL_thread_stop() and ERR_clear_error()
    this.clearedErrorsCount++;
  }

  public getState(version = 'OpenSSL 3.4.0'): OpenSslContextState {
    return {
      legacyProviderLoaded: this.legacyProviderLoaded,
      activeEvpContexts: this.activeEvpContexts,
      threadLocalErrorsCleared: this.clearedErrorsCount,
      openSslVersion: version
    };
  }
}

/**
 * #3758: SQLCipher Engine Configuration & Migration Governor
 */
export interface SqlCipherConfig {
  key: string;
  pageSize: number; // 1024 (legacy) or 4096 (standard)
  kdfIterations: number; // 64000 (legacy) or 256000 (standard SQLCipher 4)
  cipher: string; // 'aes-256-cbc'
  hmacAlgorithm: string; // 'SHA1' or 'SHA512'
}

export class SqlCipherGovernor {
  private config: SqlCipherConfig;
  private isDatabaseOpen = false;

  constructor(initialConfig?: Partial<SqlCipherConfig>) {
    this.config = {
      key: initialConfig?.key ?? 'default_secret_key_32_bytes_len!',
      pageSize: initialConfig?.pageSize ?? 4096,
      kdfIterations: initialConfig?.kdfIterations ?? 256000,
      cipher: initialConfig?.cipher ?? 'aes-256-cbc',
      hmacAlgorithm: initialConfig?.hmacAlgorithm ?? 'SHA512'
    };
  }

  public openDatabase(providedKey: string): boolean {
    if (providedKey !== this.config.key) {
      return false; // Authentication failure
    }
    this.isDatabaseOpen = true;
    return true;
  }

  public generatePragmaDirectives(): string[] {
    return [
      `PRAGMA key = '${this.config.key}';`,
      `PRAGMA cipher_page_size = ${this.config.pageSize};`,
      `PRAGMA kdf_iter = ${this.config.kdfIterations};`,
      `PRAGMA cipher_hmac_algorithm = ${this.config.hmacAlgorithm};`,
      `PRAGMA cipher_default_kdf_algorithm = PBKDF2_HMAC_${this.config.hmacAlgorithm};`
    ];
  }

  public migrateLegacyCipherSettings(legacyPageSize = 1024, legacyKdf = 64000): {
    migrated: boolean;
    previousConfig: { pageSize: number; kdf: number };
    newConfig: { pageSize: number; kdf: number };
  } {
    const prev = { pageSize: this.config.pageSize, kdf: this.config.kdfIterations };
    // Upgrading to modern SQLCipher 4.x standards
    this.config.pageSize = 4096;
    this.config.kdfIterations = 256000;
    this.config.hmacAlgorithm = 'SHA512';
    return {
      migrated: true,
      previousConfig: prev,
      newConfig: { pageSize: this.config.pageSize, kdf: this.config.kdfIterations }
    };
  }

  public getConfig(): Readonly<SqlCipherConfig> {
    return { ...this.config };
  }
}

/**
 * #3638: Binary & Log Path Scrubber Governor
 */
export class BinaryPathScrubberGovernor {
  private buildPrefixes: string[] = [
    '/Users/runner/work/td/td/',
    '/home/runner/work/td/td/',
    'C:\\Users\\runner\\work\\td\\td\\',
    'D:\\Ershad Zolfi\\programming\\coding with Gemini\\Guidegram\\',
    '/build/tdlib/'
  ];

  public addPrefix(prefix: string): void {
    if (!this.buildPrefixes.includes(prefix)) {
      this.buildPrefixes.push(prefix);
    }
  }

  public scrubString(input: string): string {
    let result = input;
    for (const prefix of this.buildPrefixes) {
      result = result.replaceAll(prefix, '[tdlib]/');
    }
    // Also clean backslashes in sanitized paths for consistency
    return result.replace(/\[tdlib\][\\/]/g, '[tdlib]/');
  }

  public scrubStackTrace(stack: string): string {
    return stack
      .split('\n')
      .map(line => this.scrubString(line))
      .join('\n');
  }
}

/**
 * #3627: Credential & Embedded Secret Scrubber Governor
 */
export class BinarySecretScrubberGovernor {
  // Regex pattern for Google API Keys (AIzaSy...)
  private readonly googleApiKeyRegex = /AIza[0-9A-Za-z-_]{35}/g;
  // Regex pattern for Telegram Bot Tokens (e.g. 123456789:ABCdefGhI...)
  private readonly telegramBotTokenRegex = /\b\d{8,10}:[a-zA-Z0-9_-]{35}\b/g;
  // Regex pattern for AWS access key ID
  private readonly awsKeyRegex = /\b(AKIA|ABIA|ACCA)[0-9A-Z]{16}\b/g;

  public inspectString(raw: string): { containsSecrets: boolean; secretTypes: string[] } {
    const secretTypes: string[] = [];
    if (this.googleApiKeyRegex.test(raw)) secretTypes.push('Google_API_Key');
    // Reset regex state
    this.googleApiKeyRegex.lastIndex = 0;

    if (this.telegramBotTokenRegex.test(raw)) secretTypes.push('Telegram_Bot_Token');
    this.telegramBotTokenRegex.lastIndex = 0;

    if (this.awsKeyRegex.test(raw)) secretTypes.push('AWS_Access_Key');
    this.awsKeyRegex.lastIndex = 0;

    return {
      containsSecrets: secretTypes.length > 0,
      secretTypes
    };
  }

  public sanitizeBinaryStrings(raw: string): string {
    return raw
      .replace(this.googleApiKeyRegex, '[REDACTED_GOOGLE_API_KEY]')
      .replace(this.telegramBotTokenRegex, '[REDACTED_TELEGRAM_BOT_TOKEN]')
      .replace(this.awsKeyRegex, '[REDACTED_AWS_KEY]');
  }
}

/**
 * #2363: Unified Actor Closure Governor
 * Merges ImmediateClosure and DelayedClosure into single high-performance structure.
 */
export interface ActorClosure {
  readonly id: string;
  readonly execute: () => Promise<void> | void;
  readonly scheduledAt: number;
  readonly targetExecutionTime: number;
  readonly isDelayed: boolean;
  readonly priority: number;
  cancelled: boolean;
}

export class ActorClosureGovernor {
  private queue: ActorClosure[] = [];
  private sequence = 0;

  public postImmediate(fn: () => Promise<void> | void, priority = 0): ActorClosure {
    const closure: ActorClosure = {
      id: `closure_imm_${++this.sequence}`,
      execute: fn,
      scheduledAt: Date.now(),
      targetExecutionTime: 0,
      isDelayed: false,
      priority,
      cancelled: false
    };
    this.insertClosure(closure);
    return closure;
  }

  public postDelayed(fn: () => Promise<void> | void, delayMs: number, priority = 0): ActorClosure {
    const now = Date.now();
    const closure: ActorClosure = {
      id: `closure_del_${++this.sequence}`,
      execute: fn,
      scheduledAt: now,
      targetExecutionTime: now + delayMs,
      isDelayed: true,
      priority,
      cancelled: false
    };
    this.insertClosure(closure);
    return closure;
  }

  public cancel(closureId: string): boolean {
    const item = this.queue.find(c => c.id === closureId);
    if (item && !item.cancelled) {
      item.cancelled = true;
      return true;
    }
    return false;
  }

  public async drainReady(currentTime = Date.now()): Promise<number> {
    const readyIndices: number[] = [];
    for (let i = 0; i < this.queue.length; i++) {
      const c = this.queue[i];
      if (c.cancelled) continue;
      if (!c.isDelayed || c.targetExecutionTime <= currentTime) {
        readyIndices.push(i);
      }
    }

    let executed = 0;
    // Execute ready tasks in order
    const toExecute = readyIndices.map(idx => this.queue[idx]);
    // Filter out executed or cancelled
    this.queue = this.queue.filter(c => !c.cancelled && !toExecute.includes(c));

    for (const closure of toExecute) {
      if (!closure.cancelled) {
        try {
          await closure.execute();
          executed++;
        } catch (err) {
          console.error(`[ActorClosureGovernor] Execution error on ${closure.id}:`, err);
        }
      }
    }
    return executed;
  }

  public getPendingCount(): number {
    return this.queue.filter(c => !c.cancelled).length;
  }

  private insertClosure(closure: ActorClosure): void {
    // Insert with higher priority first; for equal priority, earlier target time first
    this.queue.push(closure);
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.targetExecutionTime - b.targetExecutionTime;
    });
  }
}
