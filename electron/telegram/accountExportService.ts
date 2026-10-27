import crypto from 'node:crypto'
import { SessionStore } from './sessionStore'
import { AccountInfo, ProxyConfig } from './types'
import { Logger } from './logger'

export interface ExportedAccountPayload {
  id: string
  phone?: string
  firstName?: string
  lastName?: string
  username?: string
  sessionString: string
  isBot?: boolean
  proxy?: ProxyConfig
}

export interface PreparedExportResult {
  sessionToken: string
  pin: string
  expiresAt: number
  accountCount: number
  chunks: string[]
  totalChunks: number
}

interface ActiveExportSession {
  sessionToken: string
  pin: string
  key: Buffer
  encryptedPayload: string
  chunks: string[]
  expiresAt: number
}

/**
 * AccountExportService (Juliet Edition)
 * Provides military-grade, zero-trust cryptographic bundling for seamless
 * air-gapped / animated QR and local transfer of all Telegram accounts from
 * Guidegram Desktop to Guidegram Mobile.
 */
export class AccountExportService {
  private activeSession: ActiveExportSession | null = null
  private cleanTimer: NodeJS.Timeout | null = null

  constructor(private sessionStore: SessionStore) {}

  /**
   * Generates a 6-digit secure pairing PIN, bundles the selected accounts
   * with their session strings, encrypts with AES-256-GCM, and splits
   * into QR-friendly visual animation chunks.
   */
  public prepareExport(selectedAccountIds?: string[]): PreparedExportResult {
    const config = this.sessionStore.getConfig()
    const allAccounts: AccountInfo[] = config.accounts || []

    const targetAccounts = selectedAccountIds && selectedAccountIds.length > 0
      ? allAccounts.filter(a => selectedAccountIds.includes(a.id))
      : allAccounts

    if (targetAccounts.length === 0) {
      throw new Error('No accounts selected or available for export.')
    }

    // 1. Gather session strings securely from SessionStore
    const payloadAccounts: ExportedAccountPayload[] = []
    for (const acc of targetAccounts) {
      const sessionString = this.sessionStore.getSessionString(acc.id)
      if (sessionString) {
        payloadAccounts.push({
          id: acc.id,
          phone: acc.phone,
          firstName: acc.firstName,
          lastName: acc.lastName,
          username: acc.username,
          isBot: acc.isBot,
          proxy: acc.proxyConfig,
          sessionString,
        })
      }
    }

    if (payloadAccounts.length === 0) {
      throw new Error('None of the selected accounts contain valid active sessions.')
    }

    // 2. Generate cryptographically strong 6-digit PIN and session token
    const pin = Math.floor(100000 + crypto.randomInt(900000)).toString()
    const sessionToken = crypto.randomBytes(16).toString('hex')
    const salt = crypto.randomBytes(16)

    // 3. Derive 256-bit encryption key using PBKDF2 (10,000 iterations)
    const key = crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256')

    // 4. Encrypt full payload with AES-256-GCM
    const rawJson = JSON.stringify({
      version: 1,
      createdAt: Date.now(),
      accounts: payloadAccounts,
    })

    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    let encrypted = cipher.update(rawJson, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    const tag = cipher.getAuthTag()

    // Full packet: SALT(16) + IV(12) + TAG(16) + CIPHERTEXT
    const wirePacket = JSON.stringify({
      s: salt.toString('base64'),
      i: iv.toString('base64'),
      t: tag.toString('base64'),
      c: encrypted,
    })

    // 5. Chunk the wire packet into QR-digestible frames (~280 bytes each)
    const chunkSize = 280
    const totalChunks = Math.ceil(wirePacket.length / chunkSize)
    const chunks: string[] = []

    for (let i = 0; i < totalChunks; i++) {
      const part = wirePacket.slice(i * chunkSize, (i + 1) * chunkSize)
      // Format: GG1:<index>/<total>:<part> (e.g., GG1:1/4:eyJz...)
      chunks.push(`GG1:${i + 1}/${totalChunks}:${part}`)
    }

    // 6. TTL: 90 seconds auto-expire
    const expiresAt = Date.now() + 90 * 1000
    if (this.cleanTimer) {
      clearTimeout(this.cleanTimer)
    }

    this.activeSession = {
      sessionToken,
      pin,
      key,
      encryptedPayload: wirePacket,
      chunks,
      expiresAt,
    }

    this.cleanTimer = setTimeout(() => {
      this.cancelExport()
    }, 90 * 1000)

    Logger.info(`[AccountExportService] Export package prepared: ${payloadAccounts.length} accounts, ${totalChunks} chunks, expires in 90s`)

    return {
      sessionToken,
      pin,
      expiresAt,
      accountCount: payloadAccounts.length,
      chunks,
      totalChunks,
    }
  }

  /**
   * Immediately clears active export session from memory.
   */
  public cancelExport(): void {
    if (this.cleanTimer) {
      clearTimeout(this.cleanTimer)
      this.cleanTimer = null
    }
    this.activeSession = null
    Logger.info('[AccountExportService] Active export session cleared.')
  }

  /**
   * Decrypts an exported packet using the 6-digit PIN.
   */
  public static decryptPayload(wirePacketStr: string, pin: string): ExportedAccountPayload[] {
    try {
      const parsed = JSON.parse(wirePacketStr)
      const salt = Buffer.from(parsed.s, 'base64')
      const iv = Buffer.from(parsed.i, 'base64')
      const tag = Buffer.from(parsed.t, 'base64')
      const ciphertext = parsed.c

      const key = crypto.pbkdf2Sync(pin.trim(), salt, 10000, 32, 'sha256')
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)

      let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      const result = JSON.parse(decrypted)
      return result.accounts || []
    } catch (err: any) {
      throw new Error(`Failed to decrypt account payload: invalid PIN or corrupted data (${err.message})`)
    }
  }
}
