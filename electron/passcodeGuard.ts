import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface PasscodeConfig {
  isEnabled: boolean
  saltHex: string
  hashHex: string
  iterations: number
  algorithm: 'sha512'
  autoLockMinutes: number
  updatedAt: number
}

export interface PasscodeStatus {
  isPasscodeSet: boolean
  isLocked: boolean
  autoLockMinutes: number
  failedAttempts: number
  isRateLimited: boolean
  rateLimitedUntilMs: number | null
}

/**
 * PasscodeGuard
 * Master Local Passcode Security & Key Derivation Engine (Layer 08 / MM-004).
 *
 * Implements PBKDF2-HMAC-SHA512 key derivation with 100,000 iterations, constant-time verification,
 * exponential brute-force backoff, zero-credential memory wiping, and activity-based auto-lock.
 */
export class PasscodeGuard {
  public static readonly ITERATIONS = 100_000
  public static readonly KEY_LENGTH = 64 // 512 bits
  public static readonly SALT_LENGTH = 32 // 256 bits
  public static readonly ALGORITHM = 'sha512'
  public static readonly MIN_PASSCODE_LEN = 4
  public static readonly MAX_PASSCODE_LEN = 64
  public static readonly MAX_FAILED_ATTEMPTS = 5

  private configFilePath: string | null = null
  private config: PasscodeConfig | null = null
  private sessionLocked: boolean = false
  private failedAttempts: number = 0
  private rateLimitedUntil: number = 0
  private lastActivityTimestamp: number = Date.now()
  private autoLockTimer: NodeJS.Timeout | null = null

  constructor(configDir?: string) {
    if (configDir) {
      this.init(configDir)
    }
  }

  /**
   * Initializes PasscodeGuard with the storage directory.
   */
  public init(configDir: string): void {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    this.configFilePath = path.join(configDir, 'passcode_vault.json')
    this.loadConfig()
    this.startAutoLockWatcher()
  }

  /**
   * Loads passcode vault configuration from disk.
   */
  private loadConfig(): void {
    if (!this.configFilePath || !fs.existsSync(this.configFilePath)) {
      this.config = null
      this.sessionLocked = false
      return
    }

    try {
      const data = fs.readFileSync(this.configFilePath, 'utf8')
      const parsed = JSON.parse(data)
      if (parsed.isEnabled && parsed.saltHex && parsed.hashHex) {
        this.config = parsed
        // If passcode is enabled, startup default state is locked
        this.sessionLocked = true
      } else {
        this.config = null
        this.sessionLocked = false
      }
    } catch {
      this.config = null
      this.sessionLocked = false
    }
  }

  /**
   * Persists passcode vault configuration to disk safely.
   */
  private saveConfig(): void {
    if (!this.configFilePath) return
    const tempPath = `${this.configFilePath}.tmp`
    if (this.config) {
      fs.writeFileSync(tempPath, JSON.stringify(this.config, null, 2), { mode: 0o600 })
      fs.renameSync(tempPath, this.configFilePath)
    } else if (fs.existsSync(this.configFilePath)) {
      fs.unlinkSync(this.configFilePath)
    }
  }

  /**
   * Checks whether a master passcode is configured.
   */
  public isPasscodeSet(): boolean {
    return Boolean(this.config?.isEnabled)
  }

  /**
   * Checks whether the current session is locked.
   */
  public isLocked(): boolean {
    if (!this.isPasscodeSet()) return false
    return this.sessionLocked
  }

  /**
   * Manually locks the session.
   */
  public lockSession(): void {
    if (this.isPasscodeSet()) {
      this.sessionLocked = true
    }
  }

  /**
   * Unlocks the session using the supplied passcode.
   */
  public unlock(passcode: string): { success: boolean; error?: string; remainingAttempts?: number; lockedUntil?: number } {
    if (!this.isPasscodeSet()) {
      this.sessionLocked = false
      return { success: true }
    }

    const now = Date.now()
    if (this.rateLimitedUntil > now) {
      const remainingSec = Math.ceil((this.rateLimitedUntil - now) / 1000)
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${remainingSec} seconds.`,
        lockedUntil: this.rateLimitedUntil,
      }
    }

    const valid = this.verifyPasscode(passcode)
    if (valid) {
      this.sessionLocked = false
      this.failedAttempts = 0
      this.rateLimitedUntil = 0
      this.recordActivity()
      return { success: true }
    }

    this.failedAttempts++
    if (this.failedAttempts >= PasscodeGuard.MAX_FAILED_ATTEMPTS) {
      // Exponential backoff: 5 attempts = 30s, 6+ attempts = 60s * (attempts - 4)
      const lockDurationMs = this.failedAttempts === PasscodeGuard.MAX_FAILED_ATTEMPTS ? 30_000 : (this.failedAttempts - 4) * 60_000
      this.rateLimitedUntil = now + lockDurationMs
      return {
        success: false,
        error: `Invalid passcode. Locked for ${lockDurationMs / 1000} seconds.`,
        remainingAttempts: 0,
        lockedUntil: this.rateLimitedUntil,
      }
    }

    return {
      success: false,
      error: 'Invalid passcode.',
      remainingAttempts: PasscodeGuard.MAX_FAILED_ATTEMPTS - this.failedAttempts,
    }
  }

  /**
   * Sets or updates the master passcode.
   */
  public setPasscode(
    newPasscode: string,
    currentPasscode?: string
  ): { success: boolean; error?: string } {
    if (!newPasscode || typeof newPasscode !== 'string') {
      return { success: false, error: 'Passcode must be a non-empty string' }
    }

    if (
      newPasscode.length < PasscodeGuard.MIN_PASSCODE_LEN ||
      newPasscode.length > PasscodeGuard.MAX_PASSCODE_LEN
    ) {
      return {
        success: false,
        error: `Passcode length must be between ${PasscodeGuard.MIN_PASSCODE_LEN} and ${PasscodeGuard.MAX_PASSCODE_LEN} characters`,
      }
    }

    if (this.isPasscodeSet()) {
      if (!currentPasscode || !this.verifyPasscode(currentPasscode)) {
        return { success: false, error: 'Current passcode is incorrect' }
      }
    }

    const salt = crypto.randomBytes(PasscodeGuard.SALT_LENGTH)
    const hash = crypto.pbkdf2Sync(
      newPasscode,
      salt,
      PasscodeGuard.ITERATIONS,
      PasscodeGuard.KEY_LENGTH,
      PasscodeGuard.ALGORITHM
    )

    const prevAutoLock = this.config?.autoLockMinutes ?? 5

    this.config = {
      isEnabled: true,
      saltHex: salt.toString('hex'),
      hashHex: hash.toString('hex'),
      iterations: PasscodeGuard.ITERATIONS,
      algorithm: PasscodeGuard.ALGORITHM,
      autoLockMinutes: prevAutoLock,
      updatedAt: Date.now(),
    }

    // Wipe memory buffer
    hash.fill(0)

    this.sessionLocked = false
    this.failedAttempts = 0
    this.rateLimitedUntil = 0
    this.saveConfig()
    this.recordActivity()

    return { success: true }
  }

  /**
   * Removes the master passcode after verifying the current passcode.
   */
  public removePasscode(currentPasscode: string): { success: boolean; error?: string } {
    if (!this.isPasscodeSet()) {
      return { success: true }
    }

    if (!currentPasscode || !this.verifyPasscode(currentPasscode)) {
      return { success: false, error: 'Current passcode is incorrect' }
    }

    this.config = null
    this.sessionLocked = false
    this.failedAttempts = 0
    this.rateLimitedUntil = 0
    this.saveConfig()

    return { success: true }
  }

  /**
   * Sets the auto-lock inactivity delay in minutes (0 disables auto-lock).
   */
  public setAutoLockMinutes(minutes: number): { success: boolean; error?: string } {
    if (!this.config) {
      return { success: false, error: 'Cannot set auto-lock delay when passcode is not enabled' }
    }
    const safeMin = Math.max(0, Math.min(1440, Math.floor(minutes)))
    this.config.autoLockMinutes = safeMin
    this.saveConfig()
    return { success: true }
  }

  /**
   * Records user activity (typing, clicking, IPC calls) to defer auto-lock.
   */
  public recordActivity(): void {
    this.lastActivityTimestamp = Date.now()
  }

  /**
   * Retrieves comprehensive lock status for UI telemetry.
   */
  public getStatus(): PasscodeStatus {
    const now = Date.now()
    const isRateLimited = this.rateLimitedUntil > now
    return {
      isPasscodeSet: this.isPasscodeSet(),
      isLocked: this.isLocked(),
      autoLockMinutes: this.config?.autoLockMinutes ?? 0,
      failedAttempts: this.failedAttempts,
      isRateLimited,
      rateLimitedUntilMs: isRateLimited ? this.rateLimitedUntil : null,
    }
  }

  /**
   * Performs constant-time passcode verification against stored PBKDF2 hash.
   */
  private verifyPasscode(inputPasscode: string): boolean {
    if (!this.config || !this.config.saltHex || !this.config.hashHex) {
      return false
    }

    try {
      const salt = Buffer.from(this.config.saltHex, 'hex')
      const expectedHash = Buffer.from(this.config.hashHex, 'hex')

      const computedHash = crypto.pbkdf2Sync(
        inputPasscode,
        salt,
        this.config.iterations || PasscodeGuard.ITERATIONS,
        expectedHash.length,
        this.config.algorithm || PasscodeGuard.ALGORITHM
      )

      const match = crypto.timingSafeEqual(computedHash, expectedHash)
      computedHash.fill(0) // Wipe memory buffer
      return match
    } catch {
      return false
    }
  }

  /**
   * Starts periodic inactivity checker for auto-lock.
   */
  private startAutoLockWatcher(): void {
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer)
    }

    this.autoLockTimer = setInterval(() => {
      if (!this.isPasscodeSet() || this.sessionLocked) return

      const autoLockMinutes = this.config?.autoLockMinutes ?? 5
      if (autoLockMinutes <= 0) return

      const elapsedMs = Date.now() - this.lastActivityTimestamp
      if (elapsedMs >= autoLockMinutes * 60_000) {
        this.lockSession()
      }
    }, 10_000)

    if (this.autoLockTimer.unref) {
      this.autoLockTimer.unref()
    }
  }

  /**
   * Stops auto-lock timer for clean application shutdown.
   */
  public teardown(): void {
    if (this.autoLockTimer) {
      clearInterval(this.autoLockTimer)
      this.autoLockTimer = null
    }
  }
}

export const passcodeGuard = new PasscodeGuard()
