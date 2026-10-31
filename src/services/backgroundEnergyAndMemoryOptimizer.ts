/**
 * Guidegram Background Energy & Memory Optimizer Service
 *
 * Hardened against competitor issues:
 * - tdesktop #29: Abnormal CPU usage & extreme lag after hours in background.
 * - tdesktop #16062: Headless background execution & idle resource shedding.
 * - tdesktop #3253: Window always-on-top state corruption & compositor priority locks.
 * - tdesktop #28037: In-app notification banner memory leaks & DOM hoarding.
 */

export type PowerState = 'foreground' | 'background_idle' | 'low_battery';

export class IdleBackgroundSleepCoordinator {
  private currentState: PowerState = 'foreground';
  private backgroundTimers: Set<any> = new Set();
  private isAnimationsPaused: boolean = false;
  private pingIntervalSec: number = 30;

  public onWindowVisibilityChange(isVisible: boolean, isMinimized: boolean): PowerState {
    if (!isVisible || isMinimized) {
      this.currentState = 'background_idle';
      this.isAnimationsPaused = true;
      this.pingIntervalSec = 120; // Relax ping interval to conserve CPU/socket (#16062)
    } else {
      this.currentState = 'foreground';
      this.isAnimationsPaused = false;
      this.pingIntervalSec = 30;
    }
    return this.currentState;
  }

  public getPingIntervalSec(): number {
    return this.pingIntervalSec;
  }

  public areAnimationsPaused(): boolean {
    return this.isAnimationsPaused;
  }

  public getCurrentState(): PowerState {
    return this.currentState;
  }

  public clear(): void {
    this.backgroundTimers.forEach(t => clearTimeout(t));
    this.backgroundTimers.clear();
    this.currentState = 'foreground';
    this.isAnimationsPaused = false;
  }
}

export interface InAppToast {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  durationMs: number;
}

export class NotificationBannerDomRecycler {
  private activeToasts: InAppToast[] = [];
  private maxVisibleToasts: number = 3;

  constructor(maxVisibleToasts: number = 3) {
    this.maxVisibleToasts = maxVisibleToasts;
  }

  /**
   * Enqueues toast banner, recycling oldest if max limit exceeded (#28037)
   */
  public enqueueToast(title: string, body: string, durationMs: number = 4000): InAppToast {
    const toast: InAppToast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      body,
      createdAt: Date.now(),
      durationMs,
    };

    this.activeToasts.push(toast);

    // Evict oldest if exceeding capacity
    while (this.activeToasts.length > this.maxVisibleToasts) {
      this.activeToasts.shift();
    }

    return toast;
  }

  public getActiveToasts(): InAppToast[] {
    return [...this.activeToasts];
  }

  public dismissToast(toastId: string): boolean {
    const initialLen = this.activeToasts.length;
    this.activeToasts = this.activeToasts.filter(t => t.id !== toastId);
    return this.activeToasts.length < initialLen;
  }

  public purgeExpired(now: number = Date.now()): number {
    const initialLen = this.activeToasts.length;
    this.activeToasts = this.activeToasts.filter(t => now - t.createdAt < t.durationMs);
    return initialLen - this.activeToasts.length;
  }
}

export class WindowZOrderAndCompositionGuard {
  private isAlwaysOnTop: boolean = false;
  private isLocked: boolean = false;

  public setAlwaysOnTop(enable: boolean, isUserAction: boolean = true): boolean {
    if (!isUserAction && this.isLocked) {
      return false; // Prevent rogue background state overrides (#3253)
    }

    this.isAlwaysOnTop = enable;
    return true;
  }

  public getAlwaysOnTop(): boolean {
    return this.isAlwaysOnTop;
  }

  public lockUserPreference(): void {
    this.isLocked = true;
  }

  public unlockUserPreference(): void {
    this.isLocked = false;
  }
}

export class BatteryDrainAndWakeLockGuard {
  private isBatterySavingActive: boolean = false;
  private batteryThreshold: number = 0.2; // 20%

  public evaluateBatteryStatus(level: number, isCharging: boolean): {
    isLowPowerMode: boolean;
    recommendedMaxFps: number;
  } {
    if (!isCharging && level <= this.batteryThreshold) {
      this.isBatterySavingActive = true;
      return {
        isLowPowerMode: true,
        recommendedMaxFps: 30, // throttle framerate to save battery
      };
    }

    this.isBatterySavingActive = false;
    return {
      isLowPowerMode: false,
      recommendedMaxFps: 60,
    };
  }

  public isSavingPower(): boolean {
    return this.isBatterySavingActive;
  }
}
