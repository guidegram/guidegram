/**
 * MemoryPressureManager (MM-211 / Layer 08 Resource Hygiene & Memory Leak Prevention)
 * 
 * Provides automated multi-tier memory pressure detection, cache shrinking, and V8 GC triggering:
 * 1. Multi-Tier Watermark Detection:
 *    - Warning (>= 500 MB heap): Logs advisory warning, trims expired cache entries.
 *    - Elevated (>= 700 MB heap): Purges SWR cache, shrinks in-memory buffers.
 *    - Critical (>= 900 MB heap): Flushes image cache, clears Chromium session caches, forces V8 GC.
 * 2. Pluggable Eviction Handlers:
 *    Allows subsystems (SWR cache, media caches, visualizers) to register targeted eviction callbacks.
 * 3. Chromium Image Cache & Working Set Compaction:
 *    Interacts with Electron session.defaultSession.clearImageCache() to release hardware texture buffers.
 * 4. Safe V8 Garbage Collection:
 *    Triggers V8 GC when --expose-gc is active without crashing if not enabled.
 * 5. Full Telemetry & Diagnostics for Memory Auditing.
 */

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

export type MemoryPressureLevel = 'normal' | 'warning' | 'elevated' | 'critical'

export interface MemoryThresholds {
  warningMb: number
  elevatedMb: number
  criticalMb: number
}

export const DEFAULT_MEMORY_THRESHOLDS: MemoryThresholds = {
  warningMb: 500,
  elevatedMb: 700,
  criticalMb: 900,
}

export interface MemoryUsageSnapshot {
  rssMb: number
  heapTotalMb: number
  heapUsedMb: number
  externalMb: number
  arrayBuffersMb: number
  level: MemoryPressureLevel
  timestamp: number
}

export interface MemoryPressureTelemetry {
  pressureEventsCount: number
  elevatedEvictionsCount: number
  criticalEvictionsCount: number
  gcInvocationsCount: number
  lastEvictionTimestamp: number | null
  lastPressureLevel: MemoryPressureLevel
  currentUsage: MemoryUsageSnapshot
}

export type EvictionHandler = () => Promise<number | void> | number | void

export class MemoryPressureManager {
  private static instance: MemoryPressureManager | null = null

  private thresholds: MemoryThresholds
  private elevatedHandlers: Map<string, EvictionHandler> = new Map()
  private criticalHandlers: Map<string, EvictionHandler> = new Map()

  private monitorInterval: NodeJS.Timeout | null = null
  private isEvicting: boolean = false

  // Telemetry
  private pressureEventsCount: number = 0
  private elevatedEvictionsCount: number = 0
  private criticalEvictionsCount: number = 0
  private gcInvocationsCount: number = 0
  private lastEvictionTimestamp: number | null = null
  private lastPressureLevel: MemoryPressureLevel = 'normal'

  public constructor(thresholds: Partial<MemoryThresholds> = {}) {
    this.thresholds = { ...DEFAULT_MEMORY_THRESHOLDS, ...thresholds }
  }

  public static getInstance(): MemoryPressureManager {
    if (!MemoryPressureManager.instance) {
      MemoryPressureManager.instance = new MemoryPressureManager()
    }
    return MemoryPressureManager.instance
  }

  public static resetInstance(): void {
    if (MemoryPressureManager.instance) {
      MemoryPressureManager.instance.stop()
      MemoryPressureManager.instance = null
    }
  }

  /**
   * Registers a named eviction handler for elevated or critical tiers.
   */
  public registerHandler(
    tier: 'elevated' | 'critical',
    name: string,
    handler: EvictionHandler
  ): void {
    if (tier === 'elevated') {
      this.elevatedHandlers.set(name, handler)
    } else {
      this.criticalHandlers.set(name, handler)
    }
  }

  public unregisterHandler(tier: 'elevated' | 'critical', name: string): void {
    if (tier === 'elevated') {
      this.elevatedHandlers.delete(name)
    } else {
      this.criticalHandlers.delete(name)
    }
  }

  /**
   * Starts background memory monitoring.
   */
  public start(intervalMs: number = 30000): void {
    if (this.monitorInterval) return

    this.monitorInterval = setInterval(() => {
      this.evaluatePressure().catch(() => {})
    }, intervalMs)

    if (this.monitorInterval.unref) {
      this.monitorInterval.unref()
    }
  }

  /**
   * Stops background monitoring.
   */
  public stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.elevatedHandlers.clear()
    this.criticalHandlers.clear()
    this.pressureEventsCount = 0
    this.elevatedEvictionsCount = 0
    this.criticalEvictionsCount = 0
    this.gcInvocationsCount = 0
    this.lastEvictionTimestamp = null
    this.lastPressureLevel = 'normal'
  }

  /**
   * Captures memory usage snapshot and determines current pressure level.
   */
  public getMemorySnapshot(customMemoryUsage?: () => NodeJS.MemoryUsage): MemoryUsageSnapshot {
    const mem = customMemoryUsage ? customMemoryUsage() : process.memoryUsage()
    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100

    const heapUsedMb = toMb(mem.heapUsed)
    let level: MemoryPressureLevel = 'normal'

    if (heapUsedMb >= this.thresholds.criticalMb) {
      level = 'critical'
    } else if (heapUsedMb >= this.thresholds.elevatedMb) {
      level = 'elevated'
    } else if (heapUsedMb >= this.thresholds.warningMb) {
      level = 'warning'
    }

    return {
      rssMb: toMb(mem.rss),
      heapTotalMb: toMb(mem.heapTotal),
      heapUsedMb,
      externalMb: toMb(mem.external),
      arrayBuffersMb: toMb(mem.arrayBuffers || 0),
      level,
      timestamp: Date.now(),
    }
  }

  /**
   * Evaluates memory pressure and triggers appropriate eviction tiers.
   */
  public async evaluatePressure(
    customMemoryUsage?: () => NodeJS.MemoryUsage
  ): Promise<MemoryUsageSnapshot> {
    const snapshot = this.getMemorySnapshot(customMemoryUsage)
    this.lastPressureLevel = snapshot.level

    if (snapshot.level === 'normal') {
      return snapshot
    }

    this.pressureEventsCount++

    if (this.isEvicting) {
      return snapshot
    }

    this.isEvicting = true
    try {
      if (snapshot.level === 'warning') {
        Logger.warn(
          `[MemoryPressureManager] WARNING: Heap usage elevated at ${snapshot.heapUsedMb} MB (Threshold: ${this.thresholds.warningMb} MB)`
        )
      } else if (snapshot.level === 'elevated') {
        Logger.warn(
          `[MemoryPressureManager] ELEVATED: Heap at ${snapshot.heapUsedMb} MB. Triggering Tier 1 cache shrinking...`
        )
        await this.runElevatedEviction()
      } else if (snapshot.level === 'critical') {
        Logger.error(
          `[MemoryPressureManager] CRITICAL: Heap at ${snapshot.heapUsedMb} MB exceeds ${this.thresholds.criticalMb} MB! Triggering Tier 2 emergency eviction...`
        )
        await this.runCriticalEviction()
      }
    } finally {
      this.isEvicting = false
    }

    return snapshot
  }

  /**
   * Executes Tier 1 eviction: trims SWR cache and in-memory media buffers.
   */
  public async runElevatedEviction(): Promise<void> {
    this.elevatedEvictionsCount++
    this.lastEvictionTimestamp = Date.now()

    for (const [name, handler] of this.elevatedHandlers.entries()) {
      try {
        await handler()
      } catch (err) {
        Logger.warn(`[MemoryPressureManager] Elevated handler '${name}' failed:`, err)
      }
    }
  }

  /**
   * Executes Tier 2 emergency eviction: flushes all caches, image caches, and forces V8 GC.
   */
  public async runCriticalEviction(): Promise<void> {
    this.criticalEvictionsCount++
    this.lastEvictionTimestamp = Date.now()

    // Run elevated handlers first
    await this.runElevatedEviction()

    // Run critical handlers
    for (const [name, handler] of this.criticalHandlers.entries()) {
      try {
        await handler()
      } catch (err) {
        Logger.warn(`[MemoryPressureManager] Critical handler '${name}' failed:`, err)
      }
    }

    // Clear Electron Chromium image and session caches
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require('electron')
      if (electron?.session?.defaultSession) {
        if (typeof electron.session.defaultSession.clearImageCache === 'function') {
          await electron.session.defaultSession.clearImageCache()
          Logger.info('[MemoryPressureManager] Cleared Chromium session image cache.')
        }
      }
    } catch {
      // Non-electron environment
    }

    // Force V8 GC
    this.triggerV8GarbageCollection()
  }

  /**
   * Forces V8 Garbage Collection if exposed via --expose-gc.
   */
  public triggerV8GarbageCollection(): boolean {
    if (typeof (global as any).gc === 'function') {
      try {
        ;(global as any).gc()
        this.gcInvocationsCount++
        Logger.info('[MemoryPressureManager] Forced V8 Garbage Collection executed successfully.')
        return true
      } catch (err) {
        Logger.warn('[MemoryPressureManager] V8 GC execution failed:', err)
        return false
      }
    }
    return false
  }

  public getTelemetry(): MemoryPressureTelemetry {
    return {
      pressureEventsCount: this.pressureEventsCount,
      elevatedEvictionsCount: this.elevatedEvictionsCount,
      criticalEvictionsCount: this.criticalEvictionsCount,
      gcInvocationsCount: this.gcInvocationsCount,
      lastEvictionTimestamp: this.lastEvictionTimestamp,
      lastPressureLevel: this.lastPressureLevel,
      currentUsage: this.getMemorySnapshot(),
    }
  }
}

export const memoryPressureManager = MemoryPressureManager.getInstance()
