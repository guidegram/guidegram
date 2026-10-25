import fs from 'node:fs'
import path from 'node:path'
import type { BrowserWindow, RenderProcessGoneDetails } from 'electron'
import { Logger } from './telegram/logger'

let electronApp: any = null
let electronDialog: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron')
  if (electron) {
    electronApp = electron.app
    electronDialog = electron.dialog
  }
} catch {
  // Headless test runner fallback
}

export interface CrashReport {
  id: string
  timestamp: number
  processType: 'main' | 'renderer'
  reason?: string
  exitCode?: number
  error: {
    name?: string
    message?: string
    stack?: string
  }
  system: {
    platform: string
    arch: string
    electronVersion: string
    nodeVersion: string
    memoryUsage: NodeJS.MemoryUsage
  }
}

/**
 * CrashRecoveryManager (Matt Murphy MM-205)
 * Process Exception Hygiene, Persistent Crash Dumps, and Graceful Renderer Crash Recovery.
 */
export class CrashRecoveryManager {
  private static instance: CrashRecoveryManager
  private crashDumpsDir: string
  private rendererReloadAttempts = 0
  private lastRendererCrashTime = 0

  private constructor() {
    const userData = electronApp?.getPath ? electronApp.getPath('userData') : process.cwd()
    this.crashDumpsDir = path.join(userData, 'crash_dumps')
    this.ensureDirectory()
  }

  public static getInstance(): CrashRecoveryManager {
    if (!CrashRecoveryManager.instance) {
      CrashRecoveryManager.instance = new CrashRecoveryManager()
    }
    return CrashRecoveryManager.instance
  }

  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.crashDumpsDir)) {
        fs.mkdirSync(this.crashDumpsDir, { recursive: true })
      }
    } catch (e) {
      // Fallback
    }
  }

  /**
   * Writes a persistent structured crash report to disk synchronously.
   */
  public recordCrash(
    processType: 'main' | 'renderer',
    errorOrReason: any,
    details?: { exitCode?: number; reason?: string }
  ): string {
    const now = Date.now()
    const crashId = `crash_${now}_${Math.random().toString(36).slice(2, 7)}`
    const filePath = path.join(this.crashDumpsDir, `${crashId}.json`)

    const errObj =
      errorOrReason instanceof Error
        ? {
            name: errorOrReason.name,
            message: errorOrReason.message,
            stack: errorOrReason.stack,
          }
        : typeof errorOrReason === 'object'
        ? errorOrReason
        : { message: String(errorOrReason) }

    const report: CrashReport = {
      id: crashId,
      timestamp: now,
      processType,
      reason: details?.reason,
      exitCode: details?.exitCode,
      error: errObj,
      system: {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron || 'unknown',
        nodeVersion: process.versions.node,
        memoryUsage: process.memoryUsage(),
      },
    }

    try {
      this.ensureDirectory()
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8')
      Logger.error(`[CrashRecovery] Crash report written to: ${filePath}`)
      this.rotateOldReports(20)
    } catch (writeErr) {
      Logger.error('[CrashRecovery] Failed to write crash dump:', writeErr)
    }

    return filePath
  }

  /**
   * Handles renderer process crashes with automatic reload or graceful recovery dialog.
   */
  public handleRendererCrash(win: BrowserWindow | null, details: Electron.RenderProcessGoneDetails): void {
    this.recordCrash('renderer', details, { reason: details.reason, exitCode: details.exitCode })

    if (details.reason === 'clean-exit') return

    const now = Date.now()
    // Reset reload counter if last crash was more than 60s ago
    if (now - this.lastRendererCrashTime > 60_000) {
      this.rendererReloadAttempts = 0
    }
    this.lastRendererCrashTime = now
    this.rendererReloadAttempts++

    if (this.rendererReloadAttempts <= 2 && win && !win.isDestroyed()) {
      Logger.warn(
        `[CrashRecovery] Renderer crashed (${details.reason}). Attempting auto-reload ${this.rendererReloadAttempts}/2 in 1s...`
      )
      setTimeout(() => {
        try {
          if (win && !win.isDestroyed()) {
            win.webContents.reload()
          }
        } catch (e) {
          Logger.error('[CrashRecovery] Failed to reload window:', e)
        }
      }, 1000)
    } else if (win && !win.isDestroyed()) {
      Logger.error('[CrashRecovery] Repeated renderer crashes. Prompting recovery dialog.')
      if (electronDialog && electronDialog.showMessageBox) {
        electronDialog
          .showMessageBox(win, {
            type: 'error',
            title: 'Guidegram - Unexpected Renderer Crash',
            message: 'The window encountered repeated rendering errors and stopped responding.',
            detail: `Reason: ${details.reason} (Code: ${details.exitCode})\nWould you like to reload Guidegram now?`,
            buttons: ['Reload Application', 'Quit'],
            defaultId: 0,
          })
          .then(({ response }: any) => {
            if (response === 0) {
              this.rendererReloadAttempts = 0
              win.webContents.reload()
            } else if (electronApp) {
              electronApp.quit()
            }
          })
          .catch(() => {
            win.webContents.reload()
          })
      } else {
        win.webContents.reload()
      }
    }
  }

  /**
   * Cleans up older reports keeping only the latest N files.
   */
  private rotateOldReports(keepCount = 20): void {
    try {
      const files = fs.readdirSync(this.crashDumpsDir).filter((f) => f.endsWith('.json'))
      if (files.length <= keepCount) return

      files.sort((a, b) => {
        const timeA = fs.statSync(path.join(this.crashDumpsDir, a)).mtimeMs
        const timeB = fs.statSync(path.join(this.crashDumpsDir, b)).mtimeMs
        return timeA - timeB
      })

      const toRemove = files.slice(0, files.length - keepCount)
      for (const file of toRemove) {
        fs.unlinkSync(path.join(this.crashDumpsDir, file))
      }
    } catch {
      // Ignore rotation errors
    }
  }

  public getCrashReports(): CrashReport[] {
    try {
      this.ensureDirectory()
      const files = fs.readdirSync(this.crashDumpsDir).filter((f) => f.endsWith('.json'))
      const reports: CrashReport[] = []
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.crashDumpsDir, file), 'utf-8')
          reports.push(JSON.parse(raw))
        } catch {}
      }
      return reports.sort((a, b) => b.timestamp - a.timestamp)
    } catch {
      return []
    }
  }

  public purgeCrashReports(): number {
    try {
      this.ensureDirectory()
      const files = fs.readdirSync(this.crashDumpsDir).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.crashDumpsDir, file))
        } catch {}
      }
      return files.length
    } catch {
      return 0
    }
  }
}

export const crashRecoveryManager = CrashRecoveryManager.getInstance()
