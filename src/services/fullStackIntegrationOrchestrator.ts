/**
 * Guidegram Full-Stack Integration & Orchestrator Service
 *
 * Hardened against competitor issues:
 * - tdesktop #1302: MiniApp window.Telegram.WebApp.expand() fails to expand to full height.
 * - tdesktop #410: Accessible spoiler reveal & "Reveal All Spoilers" global toggle.
 * - tdesktop #943 & #2206: Adaptive high-res 2560px photo size selection for high-DPI displays.
 * - tdesktop #1117: User perpetually shown as online / idle presence heartbeat manager.
 */

export interface MiniAppViewportState {
  isExpanded: boolean;
  height: number;
  width: number;
  isStateStable: boolean;
}

export class MiniAppViewportExpandManager {
  private isExpanded: boolean = false;
  private currentHeight: number = 600;
  private currentWidth: number = 400;

  public expand(screenHeight: number, screenWidth: number): MiniAppViewportState {
    this.isExpanded = true;
    this.currentHeight = screenHeight;
    this.currentWidth = screenWidth;

    return {
      isExpanded: true,
      height: screenHeight,
      width: screenWidth,
      isStateStable: true,
    };
  }

  public collapse(collapsedHeight: number = 600): MiniAppViewportState {
    this.isExpanded = false;
    this.currentHeight = collapsedHeight;

    return {
      isExpanded: false,
      height: collapsedHeight,
      width: this.currentWidth,
      isStateStable: true,
    };
  }

  public getState(): MiniAppViewportState {
    return {
      isExpanded: this.isExpanded,
      height: this.currentHeight,
      width: this.currentWidth,
      isStateStable: true,
    };
  }
}

export class SpoilerAccessibilityAndRevealGuard {
  private globalRevealAll: boolean = false;
  private revealedSpoilerIds: Set<string> = new Set();

  public setGlobalRevealAll(revealAll: boolean): void {
    this.globalRevealAll = revealAll;
  }

  public getGlobalRevealAll(): boolean {
    return this.globalRevealAll;
  }

  public revealSpoiler(spoilerId: string): void {
    this.revealedSpoilerIds.add(spoilerId);
  }

  public isSpoilerRevealed(spoilerId: string): boolean {
    if (this.globalRevealAll) {
      return true; // Global accessibility override (#410)
    }
    return this.revealedSpoilerIds.has(spoilerId);
  }

  public clear(): void {
    this.revealedSpoilerIds.clear();
  }
}

export type PhotoResolutionType = 'thumb_320' | 'standard_800' | 'large_1280' | 'ultra_2560';

export interface PhotoVariant {
  type: PhotoResolutionType;
  width: number;
  height: number;
  url: string;
}

export class AdaptiveHighResImageSelector {
  /**
   * Selects optimal photo size up to 2560px for high-DPI displays (#943, #2206)
   */
  public static selectOptimalVariant(
    containerWidth: number,
    dpr: number = 1.0,
    variants: PhotoVariant[]
  ): PhotoVariant | null {
    if (!variants || variants.length === 0) return null;

    const requiredPhysicalWidth = containerWidth * Math.max(1.0, dpr);

    // Sort ascending by width
    const sorted = [...variants].sort((a, b) => a.width - b.width);

    // Find smallest variant that meets or exceeds required physical width
    for (const variant of sorted) {
      if (variant.width >= requiredPhysicalWidth) {
        return variant;
      }
    }

    // If all are smaller, return largest available
    return sorted[sorted.length - 1];
  }
}

export class UserPresenceHeartbeatManager {
  private isOnline: boolean = false;
  private lastActivityTimestamp: number = 0;
  private idleTimeoutMs: number = 5 * 60 * 1000; // 5 minutes

  public recordActivity(timestamp: number = Date.now()): void {
    this.lastActivityTimestamp = timestamp;
    this.isOnline = true;
  }

  public evaluatePresence(now: number = Date.now()): {
    isOnline: boolean;
    status: 'active' | 'idle' | 'offline';
  } {
    if (this.lastActivityTimestamp === 0) {
      return { isOnline: false, status: 'offline' };
    }

    const elapsed = now - this.lastActivityTimestamp;
    if (elapsed > this.idleTimeoutMs) {
      this.isOnline = false; // Disconnect presence heartbeat to prevent #1117 perpetual online bug
      return { isOnline: false, status: 'idle' };
    }

    return { isOnline: true, status: 'active' };
  }

  public disconnect(): void {
    this.isOnline = false;
    this.lastActivityTimestamp = 0;
  }
}
