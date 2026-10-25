import { Logger } from './telegram/logger'

export interface SwrCacheEntry<T> {
  data: T
  createdAt: number
  freshTtlMs: number
  staleTtlMs: number
}

export interface SwrResult<T> {
  data: T
  isStale: boolean
  isFromCache: boolean
}

/**
 * SwrCacheManager (Layer 04 - MM-084: Stale-While-Revalidate Caching Engine)
 * Provides instant 0ms cached reads with background revalidation, thundering herd protection,
 * and deterministic surgical invalidation for dialogs, messages, and profiles.
 */
export class SwrCacheManager {
  private static instance: SwrCacheManager
  private cache = new Map<string, SwrCacheEntry<any>>()
  private inFlightRevalidations = new Map<string, Promise<any>>()

  private constructor() {}

  public static getInstance(): SwrCacheManager {
    if (!this.instance) {
      this.instance = new SwrCacheManager()
    }
    return this.instance
  }

  /**
   * Set cache entry with custom fresh and stale TTLs (defaults: 30s fresh, 5m stale).
   */
  public set<T>(
    key: string,
    data: T,
    freshTtlMs: number = 30_000,
    staleTtlMs: number = 300_000
  ): void {
    if (!key || typeof key !== 'string') return
    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      freshTtlMs,
      staleTtlMs,
    })
  }

  /**
   * Synchronous get without revalidation.
   */
  public get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    const age = now - entry.createdAt

    if (age > entry.staleTtlMs) {
      this.cache.delete(key)
      return null
    }

    const isStale = age > entry.freshTtlMs
    return { data: entry.data as T, isStale }
  }

  /**
   * Get cached data with Stale-While-Revalidate semantics:
   * 1. Fresh: returns cached data immediately.
   * 2. Stale: returns cached data immediately AND executes fetcher in background to update cache.
   * 3. Expired or Miss: waits for fetcher and sets cache.
   * Protects against thundering herd with in-flight Promise sharing.
   */
  public async getOrRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      freshTtlMs?: number
      staleTtlMs?: number
      onBackgroundUpdate?: (freshData: T) => void
    }
  ): Promise<SwrResult<T>> {
    const freshTtl = options?.freshTtlMs ?? 30_000
    const staleTtl = options?.staleTtlMs ?? 300_000

    const cached = this.get<T>(key)
    if (cached) {
      if (cached.isStale) {
        // Trigger background revalidation with thundering-herd dedup
        this.triggerBackgroundRevalidate(key, fetcher, freshTtl, staleTtl, options?.onBackgroundUpdate)
        return { data: cached.data, isStale: true, isFromCache: true }
      }
      return { data: cached.data, isStale: false, isFromCache: true }
    }

    // Cache miss: execute with in-flight dedup
    const freshData = await this.executeWithInFlightDedup(key, fetcher, freshTtl, staleTtl)
    return { data: freshData, isStale: false, isFromCache: false }
  }

  private triggerBackgroundRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    freshTtl: number,
    staleTtl: number,
    onBackgroundUpdate?: (freshData: T) => void
  ): void {
    if (this.inFlightRevalidations.has(key)) return

    const promise = (async () => {
      try {
        const fresh = await fetcher()
        this.set(key, fresh, freshTtl, staleTtl)
        if (onBackgroundUpdate) {
          try {
            onBackgroundUpdate(fresh)
          } catch (_) {}
        }
        return fresh
      } catch (err) {
        Logger.warn(`[SwrCache] Background revalidation failed for '${key}':`, err)
      } finally {
        this.inFlightRevalidations.delete(key)
      }
    })()

    this.inFlightRevalidations.set(key, promise)
  }

  private async executeWithInFlightDedup<T>(
    key: string,
    fetcher: () => Promise<T>,
    freshTtl: number,
    staleTtl: number
  ): Promise<T> {
    const existing = this.inFlightRevalidations.get(key)
    if (existing) {
      return existing
    }

    const promise = (async () => {
      try {
        const res = await fetcher()
        this.set(key, res, freshTtl, staleTtl)
        return res
      } finally {
        this.inFlightRevalidations.delete(key)
      }
    })()

    this.inFlightRevalidations.set(key, promise)
    return promise
  }

  /**
   * Surgical invalidation of a specific key.
   */
  public invalidate(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Invalidate all keys matching a prefix or regular expression (e.g. all keys for accountId).
   */
  public invalidatePrefix(prefix: string): number {
    let count = 0
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Clear all cached items and in-flight revalidations.
   */
  public clear(): void {
    this.cache.clear()
    this.inFlightRevalidations.clear()
  }

  /**
   * Returns cache size.
   */
  public size(): number {
    return this.cache.size
  }
}

export const swrCache = SwrCacheManager.getInstance()
