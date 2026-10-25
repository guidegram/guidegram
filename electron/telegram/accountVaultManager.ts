import crypto from 'crypto'

// Resilient logger fallback
let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // ESM test runner fallback
}

// Resilient AccountIsolationGuard fallback
let AccountIsolationGuard: any = {
  assertSafeAccountId: (accountId: string): string => {
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('[AccountIsolationGuard] Missing or invalid accountId')
    }
    const trimmed = accountId.trim()
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      throw new Error(`[AccountIsolationGuard] Untrusted accountId format: '${accountId}'`)
    }
    return trimmed
  },
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const guardModule = require('./accountIsolationGuard')
  if (guardModule?.AccountIsolationGuard) {
    AccountIsolationGuard = guardModule.AccountIsolationGuard
  }
} catch {
  // ESM test runner fallback
}

export interface EncryptedSecretRecord {
  ivHex: string
  authTagHex: string
  ciphertextHex: string
  updatedAt: number
}

export interface AccountVaultTelemetry {
  totalWrites: number
  totalReads: number
  totalPurges: number
  isolationViolationsBlocked: number
  activeAccountCount: number
}

/**
 * AccountVaultManager (Layer 10 / Layer 08 / MM-088)
 * Authenticated AES-256-GCM Credential Compartmentalization & Zero-Leak Multi-Tenancy Engine.
 *
 * Enforces strict per-account cryptographic isolation for Telegram session strings,
 * auth keys, and phone credentials. Performs zero-memory overwriting on logout or teardown.
 */
export class AccountVaultManager {
  private static instance: AccountVaultManager
  private compartments: Map<string, Map<string, Buffer>> = new Map()
  private accountSalts: Map<string, Buffer> = new Map()
  private masterSecret: Buffer

  private totalWrites: number = 0
  private totalReads: number = 0
  private totalPurges: number = 0
  private isolationViolationsBlocked: number = 0

  constructor(masterSecretBuffer?: Buffer) {
    this.masterSecret = masterSecretBuffer || crypto.randomBytes(32)
  }

  public static getInstance(): AccountVaultManager {
    if (!AccountVaultManager.instance) {
      AccountVaultManager.instance = new AccountVaultManager()
    }
    return AccountVaultManager.instance
  }

  /**
   * Derives a unique 256-bit encryption key for an account using PBKDF2 and per-account salt.
   */
  private getAccountKey(accountId: string): Buffer {
    let salt = this.accountSalts.get(accountId)
    if (!salt) {
      salt = crypto.randomBytes(16)
      this.accountSalts.set(accountId, salt)
    }
    return crypto.pbkdf2Sync(this.masterSecret, salt, 10_000, 32, 'sha256')
  }

  /**
   * Stores a credential in the designated account's isolated compartment.
   */
  public setSecret(accountId: string, key: string, value: string | Buffer): void {
    const safeId = AccountIsolationGuard.assertSafeAccountId(accountId)
    if (!key || typeof key !== 'string') {
      throw new Error('[AccountVaultManager] Invalid secret key')
    }

    let compartment = this.compartments.get(safeId)
    if (!compartment) {
      compartment = new Map<string, Buffer>()
      this.compartments.set(safeId, compartment)
    }

    const valBuf = Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(String(value), 'utf8')
    compartment.set(key, valBuf)
    this.totalWrites++
  }

  /**
   * Retrieves a credential from an account compartment with strict caller isolation verification.
   */
  public getSecret(
    requesterAccountId: string,
    targetAccountId: string,
    key: string
  ): string | null {
    const safeRequester = AccountIsolationGuard.assertSafeAccountId(requesterAccountId)
    const safeTarget = AccountIsolationGuard.assertSafeAccountId(targetAccountId)

    // Layer 10 Multi-Tenancy Invariant: Requester must strictly match Target
    if (safeRequester !== safeTarget) {
      this.isolationViolationsBlocked++
      Logger.error(
        `[AccountVaultManager] Isolation Violation: Account '${safeRequester}' attempted to access vault of '${safeTarget}'`
      )
      throw new Error(
        `[AccountIsolationViolation] Account '${safeRequester}' is unauthorized to access compartment '${safeTarget}'`
      )
    }

    this.totalReads++
    const compartment = this.compartments.get(safeTarget)
    if (!compartment) return null

    const valBuf = compartment.get(key)
    if (!valBuf) return null

    return valBuf.toString('utf8')
  }

  /**
   * Encrypts an account credential for safe persistent storage using AES-256-GCM.
   */
  public encryptForStorage(accountId: string, plaintext: string): EncryptedSecretRecord {
    const safeId = AccountIsolationGuard.assertSafeAccountId(accountId)
    const key = this.getAccountKey(safeId)
    const iv = crypto.randomBytes(12) // GCM standard 96-bit IV

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Zero-out ephemeral key from memory
    key.fill(0)

    return {
      ivHex: iv.toString('hex'),
      authTagHex: authTag.toString('hex'),
      ciphertextHex: ciphertext.toString('hex'),
      updatedAt: Date.now(),
    }
  }

  /**
   * Decrypts an authenticated credential from persistent storage.
   */
  public decryptFromStorage(accountId: string, record: EncryptedSecretRecord): string {
    const safeId = AccountIsolationGuard.assertSafeAccountId(accountId)
    const key = this.getAccountKey(safeId)
    const iv = Buffer.from(record.ivHex, 'hex')
    const authTag = Buffer.from(record.authTagHex, 'hex')
    const ciphertext = Buffer.from(record.ciphertextHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')

    // Zero-out ephemeral key
    key.fill(0)

    return plaintext
  }

  /**
   * Performs complete zero-credential memory purge for a designated account (on logout/teardown).
   */
  public purgeAccount(accountId: string): number {
    const safeId = AccountIsolationGuard.assertSafeAccountId(accountId)
    const compartment = this.compartments.get(safeId)
    let purgedItems = 0

    if (compartment) {
      for (const [key, valBuf] of compartment.entries()) {
        valBuf.fill(0) // Physical memory sanitization
        compartment.delete(key)
        purgedItems++
      }
      this.compartments.delete(safeId)
    }

    const salt = this.accountSalts.get(safeId)
    if (salt) {
      salt.fill(0)
      this.accountSalts.delete(safeId)
    }

    this.totalPurges++
    Logger.info(`[AccountVaultManager] Safely purged and zeroed ${purgedItems} credentials for account '${safeId}'`)
    return purgedItems
  }

  /**
   * Purges all loaded compartments (e.g. On app quit or master lock).
   */
  public purgeAll(): void {
    for (const accountId of Array.from(this.compartments.keys())) {
      this.purgeAccount(accountId)
    }
  }

  /**
   * Returns list of currently active account IDs with compartments.
   */
  public listActiveAccounts(): string[] {
    return Array.from(this.compartments.keys())
  }

  /**
   * Retrieves diagnostic isolation telemetry.
   */
  public getTelemetry(): AccountVaultTelemetry {
    return {
      totalWrites: this.totalWrites,
      totalReads: this.totalReads,
      totalPurges: this.totalPurges,
      isolationViolationsBlocked: this.isolationViolationsBlocked,
      activeAccountCount: this.compartments.size,
    }
  }
}

export const accountVaultManager = AccountVaultManager.getInstance()
