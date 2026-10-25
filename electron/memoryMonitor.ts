import { Logger } from './telegram/logger'

let electronIpcMain: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron')
  if (electron) {
    electronIpcMain = electron.ipcMain
  }
} catch {
  // Test runner fallback
}

export interface MemoryStats {
  rssMb: number
  heapTotalMb: number
  heapUsedMb: number
  externalMb: number
  arrayBuffersMb: number
  timestamp: number
}

/**
 * MemoryMonitor (Matt Murphy MM-211)
 * High-performance heap & memory profiling and emergency GC eviction guard.
 * Watches heap utilization, alarms on progressive leaks, and sweeps stale memory.
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private checkInterval: NodeJS.Timeout | null = null
  private highWatermarkMb = 700
  private criticalWatermarkMb = 900
  private lastStats: MemoryStats | null = null

  private constructor() {
    // Audit memory usage every 60 seconds
    this.checkInterval = setInterval(() => {
      this.checkMemory()
    }, 60_000)
    if (this.checkInterval.unref) {
      this.checkInterval.unref()
    }
  }

  public static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }

  public getMemoryStats(): MemoryStats {
    const mem = process.memoryUsage()
    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100

    this.lastStats = {
      rssMb: toMb(mem.rss),
      heapTotalMb: toMb(mem.heapTotal),
      heapUsedMb: toMb(mem.heapUsed),
      externalMb: toMb(mem.external),
      arrayBuffersMb: toMb(mem.arrayBuffers || 0),
      timestamp: Date.now(),
    }
    return this.lastStats
  }

  public checkMemory(): MemoryStats {
    const stats = this.getMemoryStats()

    if (stats.heapUsedMb > this.criticalWatermarkMb) {
      Logger.error(
        `[MemoryMonitor] CRITICAL: Heap usage at ${stats.heapUsedMb} MB exceeds threshold of ${this.criticalWatermarkMb} MB! Triggering GC recovery...`
      )
      this.forceGarbageCollection()
    } else if (stats.heapUsedMb > this.highWatermarkMb) {
      Logger.warn(
        `[MemoryMonitor] WARNING: Elevated heap usage: ${stats.heapUsedMb} MB (RSS: ${stats.rssMb} MB)`
      )
    }

    return stats
  }

  public forceGarbageCollection(): boolean {
    if (typeof (global as any).gc === 'function') {
      try {
        ;(global as any).gc()
        Logger.info('[MemoryMonitor] Forced V8 Garbage Collection executed successfully.')
        return true
      } catch (err) {
        Logger.warn('[MemoryMonitor] V8 GC execution failed:', err)
        return false
      }
    }
    return false
  }

  public registerIpc(customIpc?: any): void {
    const ipc = customIpc || electronIpcMain
    if (!ipc || !ipc.handle) return

    ipc.handle('system:get-memory-stats', () => {
      return this.getMemoryStats()
    })

    ipc.handle('system:force-gc-cleanup', () => {
      const ranGc = this.forceGarbageCollection()
      return {
        success: true,
        ranGc,
        stats: this.getMemoryStats(),
      }
    })
  }

  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const memoryMonitor = MemoryMonitor.getInstance()
