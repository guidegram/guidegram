import crypto from 'node:crypto'
import os from 'node:os'
import { Logger } from './logger'

// Optional dynamic import for electron safeStorage
let electronSafeStorage: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron')
  if (electron && electron.safeStorage) {
    electronSafeStorage = electron.safeStorage
  }
} catch {
  // Headless / non-electron environment fallback
}

/**
 * SecureStorage (Matt Murphy MM-088)
 * Provides authenticated encryption at rest for MTProto session strings and credentials.
 * Utilizes OS DPAPI/Keychain (Electron safeStorage) with transparent AES-256-GCM machine fallback,
 * while maintaining backward compatibility with unencrypted legacy sessions.
 */
export class SecureStorage {
  private static fallbackKey: Buffer | null = null

  private static getFallbackKey(): Buffer {
    if (!this.fallbackKey) {
      // Derive a deterministic 256-bit machine key from hardware/user identity
      const machineSeed = `${os.hostname()}:${os.platform()}:${os.userInfo().username}:guidegram-secure-salt`
      this.fallbackKey = crypto.createHash('sha256').update(machineSeed).digest()
    }
    return this.fallbackKey
  }

  /**
   * Sanitizes account ID to strictly enforce Row-Level Security (RLS) sandbox
   * and block path traversal attempts (e.g., ../../../etc).
   */
  public static sanitizeAccountId(accountId: string): string {
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Invalid accountId: must be a non-empty string')
    }
    if (accountId.includes('..') || accountId.includes('/') || accountId.includes('\\')) {
      throw new Error(`Invalid accountId: '${accountId}' violates isolation bounds`)
    }
    const clean = accountId.replace(/[^a-zA-Z0-9_\-]/g, '')
    if (!clean) {
      throw new Error(`Invalid accountId: '${accountId}' violates isolation bounds`)
    }
    return clean
  }

  /**
   * Encrypts plaintext session string using OS keychain or AES-256-GCM.
   */
  public static encrypt(plaintext: string): string {
    if (!plaintext) return ''

    // 1. Prefer OS-level secure storage (DPAPI on Windows, Keychain on macOS)
    if (electronSafeStorage && electronSafeStorage.isEncryptionAvailable()) {
      try {
        const encryptedBuffer = electronSafeStorage.encryptString(plaintext)
        return `ENC:SAFE:${encryptedBuffer.toString('base64')}`
      } catch (err) {
        Logger.warn('[SecureStorage] OS safeStorage failed, falling back to AES-256-GCM:', err)
      }
    }

    // 2. Machine-scoped AES-256-GCM fallback
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getFallbackKey(), iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `ENC:GCM:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('base64')}`
  }

  /**
   * Decrypts session string, supporting ENC:SAFE, ENC:GCM, and legacy plaintext.
   */
  public static decrypt(payload: string): string {
    if (!payload) return ''

    // Case 1: OS SafeStorage
    if (payload.startsWith('ENC:SAFE:')) {
      const b64 = payload.slice('ENC:SAFE:'.length)
      const buffer = Buffer.from(b64, 'base64')
      if (electronSafeStorage && electronSafeStorage.isEncryptionAvailable()) {
        try {
          return electronSafeStorage.decryptString(buffer)
        } catch (err) {
          Logger.error('[SecureStorage] Failed to decrypt with OS safeStorage:', err)
          throw new Error('OS Decryption failed for session payload')
        }
      }
      throw new Error('OS SafeStorage encryption available status mismatch')
    }

    // Case 2: AES-256-GCM
    if (payload.startsWith('ENC:GCM:')) {
      const parts = payload.slice('ENC:GCM:'.length).split(':')
      if (parts.length !== 3) {
        throw new Error('Malformed ENC:GCM payload format')
      }
      const [ivHex, tagHex, dataB64] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const tag = Buffer.from(tagHex, 'hex')
      const ciphertext = Buffer.from(dataB64, 'base64')

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.getFallbackKey(), iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    }

    // Case 3: Legacy unencrypted plaintext session (Backward compatibility)
    return payload
  }
}
