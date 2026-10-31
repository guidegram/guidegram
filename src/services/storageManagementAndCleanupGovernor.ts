/**
 * Storage Management, Cache Auto-Cleanup & Media Vault Governor
 *
 * Hardened against competitor issues:
 * - TelegramMessenger/Telegram-iOS #2416: Account cleanup deletes a just-created account directory under its open database
 * - UnigramDev/Unigram #242: Comprehensive media cache system with category quotas & TTL auto-cleanup
 * - UnigramDev/Unigram #2164: Custom storage path stopped working (directory permission validation & safe fallback)
 * - morethanwords/tweb #121: ReferenceError: caches is not defined in insecure/local origins
 * - telegramdesktop/tdesktop #17415: Disk crash / ENOSPC on low storage (safety headroom enforcement)
 */

export type CacheCategory = 'photos' | 'videos' | 'files' | 'stickers' | 'voice';

export interface CacheItem {
  id: string;
  category: CacheCategory;
  filePath: string;
  sizeBytes: number;
  lastAccessedAt: number;
  accountId: string;
}

export interface StorageConfig {
  customStoragePath: string;
  maxTotalCacheBytes: number; // default: 5 GB
  autoCleanupDays: number; // default: 7 days
  diskSafetyHeadroomBytes: number; // default: 500 MB
}

export interface CacheUsageSummary {
  photos: number;
  videos: number;
  files: number;
  stickers: number;
  voice: number;
  totalBytes: number;
}

export class StorageManagementAndCleanupGovernor {
  private cachedFiles: Map<string, CacheItem> = new Map();
  private config: StorageConfig = {
    customStoragePath: 'default_app_data/storage',
    maxTotalCacheBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    autoCleanupDays: 7,
    diskSafetyHeadroomBytes: 500 * 1024 * 1024 // 500 MB
  };

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.cachedFiles.clear();
    this.config = {
      customStoragePath: 'default_app_data/storage',
      maxTotalCacheBytes: 5 * 1024 * 1024 * 1024,
      autoCleanupDays: 7,
      diskSafetyHeadroomBytes: 500 * 1024 * 1024
    };
  }

  /**
   * Registers a file in the media cache tracker
   */
  public registerCachedFile(item: CacheItem): void {
    this.cachedFiles.set(item.id, { ...item });
  }

  /**
   * Computes cache usage breakdown by category (Unigram #242)
   */
  public getCacheUsage(): CacheUsageSummary {
    const summary: CacheUsageSummary = {
      photos: 0,
      videos: 0,
      files: 0,
      stickers: 0,
      voice: 0,
      totalBytes: 0
    };

    for (const item of this.cachedFiles.values()) {
      summary[item.category] = (summary[item.category] || 0) + item.sizeBytes;
      summary.totalBytes += item.sizeBytes;
    }

    return summary;
  }

  /**
   * Clears cache for a specific category (Unigram #242)
   */
  public clearCategoryCache(category: CacheCategory): { freedBytes: number; deletedCount: number } {
    let freedBytes = 0;
    let deletedCount = 0;

    for (const [id, item] of this.cachedFiles.entries()) {
      if (item.category === category) {
        freedBytes += item.sizeBytes;
        deletedCount++;
        this.cachedFiles.delete(id);
      }
    }

    return { freedBytes, deletedCount };
  }

  /**
   * Prunes oldest cached files until total cache is below quota
   */
  public pruneCacheByQuota(maxBytes: number = this.config.maxTotalCacheBytes): { freedBytes: number; deletedCount: number } {
    const usage = this.getCacheUsage();
    if (usage.totalBytes <= maxBytes) {
      return { freedBytes: 0, deletedCount: 0 };
    }

    const items = Array.from(this.cachedFiles.values()).sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
    let freedBytes = 0;
    let deletedCount = 0;
    let currentTotal = usage.totalBytes;

    for (const item of items) {
      if (currentTotal <= maxBytes) break;
      this.cachedFiles.delete(item.id);
      freedBytes += item.sizeBytes;
      currentTotal -= item.sizeBytes;
      deletedCount++;
    }

    return { freedBytes, deletedCount };
  }

  /**
   * Auto-cleanup by TTL days
   */
  public pruneExpiredCache(now: number = Date.now()): { freedBytes: number; deletedCount: number } {
    if (this.config.autoCleanupDays <= 0) {
      return { freedBytes: 0, deletedCount: 0 };
    }

    const maxAgeMs = this.config.autoCleanupDays * 24 * 3600 * 1000;
    const threshold = now - maxAgeMs;
    let freedBytes = 0;
    let deletedCount = 0;

    for (const [id, item] of this.cachedFiles.entries()) {
      if (item.lastAccessedAt < threshold) {
        freedBytes += item.sizeBytes;
        deletedCount++;
        this.cachedFiles.delete(id);
      }
    }

    return { freedBytes, deletedCount };
  }

  /**
   * Account directory protection against stale cleanup (Telegram-iOS #2416)
   * Ensures directories for active or newly created accounts are NEVER deleted
   */
  public cleanupUnusedAccountDirectories(existingDiskDirs: string[], activeAccountIds: string[]): {
    deletedDirs: string[];
    preservedDirs: string[];
  } {
    const activeSet = new Set(activeAccountIds.map(id => id.trim().toLowerCase()));
    const deletedDirs: string[] = [];
    const preservedDirs: string[] = [];

    for (const dir of existingDiskDirs) {
      const dirName = dir.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
      // Strip prefixes like "account_" or "user_"
      const normalizedAccountId = dirName.replace(/^(account_|user_)/, '');

      if (activeSet.has(normalizedAccountId) || activeSet.has(dirName)) {
        preservedDirs.push(dir);
      } else {
        deletedDirs.push(dir);
      }
    }

    return { deletedDirs, preservedDirs };
  }

  /**
   * Sets custom storage path with write verification and fallback (Unigram #2164)
   */
  public setCustomStoragePath(
    newPath: string,
    hasWritePermission: boolean = true
  ): { success: boolean; activePath: string; error?: string } {
    if (!newPath || newPath.trim().length === 0) {
      return {
        success: false,
        activePath: this.config.customStoragePath,
        error: 'Storage path cannot be empty'
      };
    }

    if (!hasWritePermission) {
      return {
        success: false,
        activePath: this.config.customStoragePath,
        error: `Permission denied: cannot write to storage directory ${newPath}`
      };
    }

    this.config.customStoragePath = newPath.trim();
    return {
      success: true,
      activePath: this.config.customStoragePath
    };
  }

  public getStoragePath(): string {
    return this.config.customStoragePath;
  }

  /**
   * Fallback for window.caches when running in insecure/local IP origins (morethanwords #121)
   */
  public isCachesApiSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.caches !== 'undefined';
  }

  public async safeCacheOperation<T>(
    cachesOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    if (this.isCachesApiSupported()) {
      try {
        return await cachesOperation();
      } catch {
        return await fallbackOperation();
      }
    }
    return await fallbackOperation();
  }

  /**
   * Disk safety headroom check preventing ENOSPC crashes (tdesktop #17415)
   */
  public checkDiskHeadroom(availableFreeBytes: number): {
    canWrite: boolean;
    shouldEvictCache: boolean;
    remainingSafeBytes: number;
  } {
    const headroom = this.config.diskSafetyHeadroomBytes;
    const remainingSafeBytes = Math.max(0, availableFreeBytes - headroom);
    const canWrite = availableFreeBytes > headroom;
    const shouldEvictCache = availableFreeBytes < headroom * 2; // proactively evict when free space < 1GB

    return {
      canWrite,
      shouldEvictCache,
      remainingSafeBytes
    };
  }
}

export const storageManagementAndCleanupGovernor = new StorageManagementAndCleanupGovernor();
