import type { BrowserWindow } from 'electron'

// Resilient logger fallback
let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // ESM test runner fallback
}

export type ProtectionReason =
  | 'user_preference'
  | 'secret_chat'
  | 'view_once_media'
  | 'passcode_lock'
  | string

export interface ProtectionStatus {
  isProtected: boolean
  activeReasons: string[]
  platformSupported: boolean
}

/**
 * PrivacyProtectionGuard (Layer 08 / Privacy & Anti-Surveillance)
 * Manages OS-level window content protection (`win.setContentProtection`) to prevent
 * screen scrapers, OBS recordings, Discord/Zoom screen sharing, and PrintScreen snapshots
 * from capturing sensitive secret chats, ephemeral media, or locked session states.
 */
export class PrivacyProtectionGuard {
  private targetWindow: BrowserWindow | any = null
  private activeReasons: Set<string> = new Set()
  private isSupported: boolean = process.platform === 'win32' || process.platform === 'darwin'

  constructor(targetWindow?: BrowserWindow | any) {
    if (targetWindow) {
      this.attachWindow(targetWindow)
    }
  }

  /**
   * Attaches the primary BrowserWindow instance to govern.
   */
  public attachWindow(win: BrowserWindow | any): void {
    this.targetWindow = win
    this.syncProtection()
  }

  /**
   * Sets or clears a content protection requirement for a specific reason.
   */
  public setProtection(reason: ProtectionReason, enable: boolean): boolean {
    if (!reason || typeof reason !== 'string') {
      return false
    }

    if (enable) {
      this.activeReasons.add(reason)
    } else {
      this.activeReasons.delete(reason)
    }

    return this.syncProtection()
  }

  /**
   * Clears all temporary protection reasons (e.g. on navigation or window close).
   * Keeps 'user_preference' intact if configured.
   */
  public clearTemporaryReasons(): void {
    const hasUserPref = this.activeReasons.has('user_preference')
    this.activeReasons.clear()
    if (hasUserPref) {
      this.activeReasons.add('user_preference')
    }
    this.syncProtection()
  }

  /**
   * Checks whether content protection is currently active.
   */
  public isProtected(): boolean {
    return this.activeReasons.size > 0
  }

  /**
   * Retrieves full diagnostic protection status.
   */
  public getStatus(): ProtectionStatus {
    return {
      isProtected: this.isProtected(),
      activeReasons: Array.from(this.activeReasons),
      platformSupported: this.isSupported,
    }
  }

  /**
   * Synchronizes window display affinity state with active protection reasons.
   */
  private syncProtection(): boolean {
    if (!this.targetWindow) {
      return false
    }

    const shouldProtect = this.activeReasons.size > 0

    try {
      if (typeof this.targetWindow.setContentProtection === 'function') {
        this.targetWindow.setContentProtection(shouldProtect)
        Logger.info(
          `[PrivacyProtectionGuard] Window content protection ${shouldProtect ? 'ENABLED' : 'DISABLED'} (Active reasons: [${Array.from(this.activeReasons).join(', ')}])`
        )
        return true
      }
      return false
    } catch (err: any) {
      Logger.warn('[PrivacyProtectionGuard] Failed to apply setContentProtection:', err?.message || err)
      return false
    }
  }
}

export const privacyProtectionGuard = new PrivacyProtectionGuard()
