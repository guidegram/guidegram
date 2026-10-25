import fs from 'node:fs'
import path from 'node:path'

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

export interface CachedFileItem {
  filePath: string
  size: number
  lastAccessed: number
}

export interface QuotaEnforcementResult {
  evictedFiles: number
  freedBytes: number
  remainingBytes: number
  totalFiles: number
}

export interface MediaCacheReport {
  totalBytes: number
  formattedSize: string
  filesCount: number
  oldestFileAgeDays: number
  quotaUtilizationPercent: number
}

/**
 * MediaCacheManager (MM-084 / Layer 08 / Safe Storage Hygiene)
 * Enforces maximum disk quotas on Telegram media and temp caches.
 * Uses Least Recently Used (LRU) eviction sorted by atime/mtime to safely
 * prune disk consumption down to 80% of quota ceiling without UI pauses.
 */
export class MediaCacheManager {
  public static readonly DEFAULT_MAX_QUOTA_BYTES = 1024 * 1024 * 1024 // 1 GB default

  /**
   * Recursively scans directory for cache files with sizes and access timestamps.
   */
  public static scanCacheFiles(dirPath: string): CachedFileItem[] {
    const items: CachedFileItem[] = []
    if (!dirPath || !fs.existsSync(dirPath)) return items

    const traverse = (currentDir: string) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name)
          if (entry.isDirectory()) {
            // Never purge sessions or internal critical folders
            if (entry.name !== 'sessions' && entry.name !== 'audit_logs') {
              traverse(fullPath)
            }
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath)
              items.push({
                filePath: fullPath,
                size: stat.size,
                lastAccessed: Math.max(stat.atimeMs || 0, stat.mtimeMs || 0),
              })
            } catch {
              // File might be locked or unlinked
            }
          }
        }
      } catch {
        // Directory read error
      }
    }

    traverse(dirPath)
    return items
  }

  /**
   * Enforces disk quota using LRU eviction.
   * If totalBytes > maxBytes, removes oldest files until under 80% of maxBytes.
   */
  public static enforceQuota(
    cacheDir: string,
    maxBytes: number = this.DEFAULT_MAX_QUOTA_BYTES
  ): QuotaEnforcementResult {
    const files = this.scanCacheFiles(cacheDir)
    let totalBytes = files.reduce((acc, f) => acc + f.size, 0)
    let evictedCount = 0
    let freedBytes = 0

    if (totalBytes <= maxBytes) {
      return {
        evictedFiles: 0,
        freedBytes: 0,
        remainingBytes: totalBytes,
        totalFiles: files.length,
      }
    }

    // Sort ascending by lastAccessed (oldest first = LRU)
    files.sort((a, b) => a.lastAccessed - b.lastAccessed)

    // Target 80% ceiling to avoid frequent eviction cycles
    const targetCeiling = Math.floor(maxBytes * 0.8)

    for (const file of files) {
      if (totalBytes <= targetCeiling) break

      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath)
          evictedCount++
          freedBytes += file.size
          totalBytes -= file.size
        }
      } catch (err: any) {
        Logger.warn(`[MediaCacheManager] Failed to evict file ${file.filePath}:`, err?.message || err)
      }
    }

    Logger.info(`[MediaCacheManager] LRU Quota enforced: evicted ${evictedCount} files, freed ${(freedBytes / (1024 * 1024)).toFixed(1)} MB`)

    return {
      evictedFiles: evictedCount,
      freedBytes,
      remainingBytes: totalBytes,
      totalFiles: files.length - evictedCount,
    }
  }

  /**
   * Evicts files older than a given number of days.
   */
  public static evictExpired(cacheDir: string, maxAgeDays: number = 30): { evictedFiles: number; freedBytes: number } {
    const files = this.scanCacheFiles(cacheDir)
    const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    let evictedFiles = 0
    let freedBytes = 0

    for (const file of files) {
      if (file.lastAccessed < cutoffTime) {
        try {
          if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath)
            evictedFiles++
            freedBytes += file.size
          }
        } catch {
          // Ignore
        }
      }
    }

    return { evictedFiles, freedBytes }
  }

  /**
   * Generates a telemetry report of the media cache.
   */
  public static getReport(cacheDir: string, maxBytes: number = this.DEFAULT_MAX_QUOTA_BYTES): MediaCacheReport {
    const files = this.scanCacheFiles(cacheDir)
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0)
    const now = Date.now()

    let oldestAgeMs = 0
    for (const f of files) {
      const age = now - f.lastAccessed
      if (age > oldestAgeMs) oldestAgeMs = age
    }

    const formattedSize =
      totalBytes < 1024 * 1024
        ? `${(totalBytes / 1024).toFixed(1)} KB`
        : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`

    const utilization = maxBytes > 0 ? Math.min(100, (totalBytes / maxBytes) * 100) : 0

    return {
      totalBytes,
      formattedSize,
      filesCount: files.length,
      oldestFileAgeDays: Math.floor(oldestAgeMs / (24 * 60 * 60 * 1000)),
      quotaUtilizationPercent: Math.round(utilization),
    }
  }
}
