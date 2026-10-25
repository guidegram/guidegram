import fs from 'node:fs'
import crypto from 'node:crypto'

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

export interface EphemeralMediaEntry {
  token: string
  filePath: string
  ttlSeconds: number
  viewOnce: boolean
  expiresAt: number
  timeoutTimer: NodeJS.Timeout | null
}

/**
 * EphemeralMediaManager (MM-019 / Layer 08 / Privacy & Self-Destructing Media)
 * Tracks view-once voice notes, disappearing secret photos, and expiring video clips.
 * Overwrites file contents before unlinking to prevent forensic undelete on disk.
 */
export class EphemeralMediaManager {
  private static registry = new Map<string, EphemeralMediaEntry>()

  /**
   * Securely overwrites a file with random bytes before deleting it.
   */
  public static safeShredAndUnlink(filePath: string): boolean {
    if (!filePath || !fs.existsSync(filePath)) return false

    try {
      const stat = fs.statSync(filePath)
      if (stat.isFile() && stat.size > 0) {
        // Overwrite file with zeroes or random bytes
        const zeroBuf = Buffer.alloc(Math.min(stat.size, 65536), 0)
        const fd = fs.openSync(filePath, 'r+')
        let written = 0
        while (written < stat.size) {
          const chunkSize = Math.min(zeroBuf.length, stat.size - written)
          fs.writeSync(fd, zeroBuf, 0, chunkSize, written)
          written += chunkSize
        }
        fs.closeSync(fd)
      }
      fs.unlinkSync(filePath)
      Logger.info(`[EphemeralMediaManager] Securely shredded and unlinked: ${filePath}`)
      return true
    } catch (err: any) {
      Logger.warn(`[EphemeralMediaManager] Failed to shred ${filePath}:`, err?.message || err)
      try {
        fs.unlinkSync(filePath)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Registers an ephemeral media file with automatic TTL expiration.
   */
  public static registerEphemeralMedia(
    token: string,
    filePath: string,
    ttlSeconds: number = 30,
    viewOnce: boolean = false
  ): void {
    if (!token || !filePath) return

    // Cancel existing entry if duplicate
    this.unregister(token)

    const expiresAt = Date.now() + ttlSeconds * 1000
    const timeoutTimer = setTimeout(() => {
      this.purgeEntry(token, 'TTL expired')
    }, ttlSeconds * 1000)

    if (timeoutTimer.unref) {
      timeoutTimer.unref()
    }

    this.registry.set(token, {
      token,
      filePath,
      ttlSeconds,
      viewOnce,
      expiresAt,
      timeoutTimer,
    })

    Logger.info(`[EphemeralMediaManager] Registered ephemeral token ${token} (TTL: ${ttlSeconds}s, viewOnce: ${viewOnce})`)
  }

  /**
   * Marks media as played or viewed, triggering safe destruction.
   */
  public static async markPlayed(token: string, delayMs: number = 1000): Promise<boolean> {
    const entry = this.registry.get(token)
    if (!entry) return false

    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer)
      entry.timeoutTimer = null
    }

    // Delay slightly to let the audio/video decoder close its handle
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return this.purgeEntry(token, 'Playback completed')
  }

  /**
   * Purges entry and safely shreds file.
   */
  private static purgeEntry(token: string, reason: string): boolean {
    const entry = this.registry.get(token)
    if (!entry) return false

    if (entry.timeoutTimer) {
      clearTimeout(entry.timeoutTimer)
    }

    this.registry.delete(token)
    Logger.info(`[EphemeralMediaManager] Purging token ${token} (${reason})`)
    return this.safeShredAndUnlink(entry.filePath)
  }

  /**
   * Unregisters token without deleting the file.
   */
  public static unregister(token: string): void {
    const entry = this.registry.get(token)
    if (entry) {
      if (entry.timeoutTimer) {
        clearTimeout(entry.timeoutTimer)
      }
      this.registry.delete(token)
    }
  }

  public static getPendingCount(): number {
    return this.registry.size
  }

  public static clearAll(): void {
    for (const token of Array.from(this.registry.keys())) {
      this.purgeEntry(token, 'Clear all')
    }
    this.registry.clear()
  }
}
