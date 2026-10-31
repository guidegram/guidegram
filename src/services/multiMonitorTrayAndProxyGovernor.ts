/**
 * Multi-Monitor MediaViewer, System Tray Resilience & Proxy Governor
 *
 * Hardened against competitor issues:
 * - telegramdesktop/tdesktop #5126: MediaViewer shows on wrong monitor in multi-display setups
 * - telegramdesktop/tdesktop #80, #702: Missing or broken system tray icon on Linux KDE/GNOME
 * - kotatogram/kotatogram-desktop #170: Taskbar unread badge inconsistent with system tray icon
 * - kotatogram/kotatogram-desktop #160: Support starting minimized and hiding/showing tray icon via flags
 * - kotatogram/kotatogram-desktop #362: Auto-minimize window to tray when local passcode lock triggers
 * - kotatogram/kotatogram-desktop #227: Non-modal MediaViewer window allowing background chat control
 * - kotatogram/kotatogram-desktop #114: MTProxy connection failures (secret format, dd-padding, fake-TLS SNI)
 * - kotatogram/kotatogram-desktop #402: Upload speed optimization and chunk pipelining for small files
 */

export interface DisplayInfo {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  isPrimary: boolean;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type TrayBackend = 'status_notifier_item' | 'xembed' | 'win32_shell' | 'appindicator' | 'fallback_window';

export class MultiMonitorTrayAndProxyGovernor {
  private trayVisible: boolean = true;
  private startMinimized: boolean = false;
  private minimizeOnLock: boolean = true;
  private currentBadgeCount: number = 0;
  private taskbarBadge: string = '';
  private trayTooltip: string = 'Guidegram';
  private isWindowVisible: boolean = true;
  private isMediaViewerModal: boolean = false; // Always modeless (kotatogram #227)

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.trayVisible = true;
    this.startMinimized = false;
    this.minimizeOnLock = true;
    this.currentBadgeCount = 0;
    this.taskbarBadge = '';
    this.trayTooltip = 'Guidegram';
    this.isWindowVisible = true;
    this.isMediaViewerModal = false;
  }

  /**
   * Resolves target monitor display for MediaViewer (TDesktop #5126)
   * Finds the display that intersects the active window's center, or cursor point
   */
  public resolveTargetDisplay(
    displays: DisplayInfo[],
    activeWindowBounds?: WindowBounds,
    cursor?: Point
  ): DisplayInfo {
    if (!displays || displays.length === 0) {
      return {
        id: 0,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
        scaleFactor: 1,
        isPrimary: true
      };
    }

    if (displays.length === 1) return displays[0];

    // Priority 1: Display containing active window center
    if (activeWindowBounds) {
      const centerX = activeWindowBounds.x + activeWindowBounds.width / 2;
      const centerY = activeWindowBounds.y + activeWindowBounds.height / 2;
      const matched = displays.find(
        d =>
          centerX >= d.bounds.x &&
          centerX < d.bounds.x + d.bounds.width &&
          centerY >= d.bounds.y &&
          centerY < d.bounds.y + d.bounds.height
      );
      if (matched) return matched;
    }

    // Priority 2: Display containing cursor
    if (cursor) {
      const matched = displays.find(
        d =>
          cursor.x >= d.bounds.x &&
          cursor.x < d.bounds.x + d.bounds.width &&
          cursor.y >= d.bounds.y &&
          cursor.y < d.bounds.y + d.bounds.height
      );
      if (matched) return matched;
    }

    // Fallback: Primary display
    return displays.find(d => d.isPrimary) || displays[0];
  }

  /**
   * Synchronizes unread badges between Taskbar and System Tray (Kotatogram #170)
   */
  public syncBadgeCount(unreadCount: number): {
    badgeCount: number;
    taskbarBadge: string;
    trayTooltip: string;
  } {
    this.currentBadgeCount = Math.max(0, unreadCount);
    this.taskbarBadge = this.currentBadgeCount > 0 ? String(this.currentBadgeCount) : '';
    this.trayTooltip =
      this.currentBadgeCount > 0
        ? `Guidegram (${this.currentBadgeCount} unread message${this.currentBadgeCount > 1 ? 's' : ''})`
        : 'Guidegram';

    return {
      badgeCount: this.currentBadgeCount,
      taskbarBadge: this.taskbarBadge,
      trayTooltip: this.trayTooltip
    };
  }

  /**
   * Handles local passcode lock event with tray minimization (Kotatogram #362)
   */
  public handleLockTriggered(minimizeToTray: boolean = this.minimizeOnLock): {
    locked: boolean;
    minimizedToTray: boolean;
  } {
    if (minimizeToTray && this.trayVisible) {
      this.isWindowVisible = false;
      return { locked: true, minimizedToTray: true };
    }
    return { locked: true, minimizedToTray: false };
  }

  /**
   * Parses CLI launch flags for tray/start state (Kotatogram #160)
   */
  public parseCliFlags(args: string[]): {
    startMinimized: boolean;
    hideTray: boolean;
  } {
    const startMin = args.includes('--minimized') || args.includes('-m');
    const hideTray = args.includes('--no-tray') || args.includes('--hide-tray');

    if (startMin) this.startMinimized = true;
    if (hideTray) this.trayVisible = false;

    return {
      startMinimized: this.startMinimized,
      hideTray: !this.trayVisible
    };
  }

  /**
   * Detects appropriate tray backend across Linux / Windows environments (TDesktop #80, #702)
   */
  public detectTrayBackend(platform: string, desktopEnv: string = ''): TrayBackend {
    if (platform === 'win32') return 'win32_shell';
    if (platform === 'darwin') return 'status_notifier_item';

    // Linux
    const de = desktopEnv.toLowerCase();
    if (de.includes('kde') || de.includes('plasma')) {
      return 'status_notifier_item';
    }
    if (de.includes('gnome') || de.includes('unity')) {
      return 'appindicator';
    }
    if (de.includes('xfce') || de.includes('lxde')) {
      return 'xembed';
    }

    return 'status_notifier_item';
  }

  /**
   * Configures MediaViewer window mode (Kotatogram #227)
   */
  public getMediaViewerWindowConfig(): { isModal: boolean; allowMainWindowInteraction: boolean } {
    return {
      isModal: this.isMediaViewerModal, // False: non-modal
      allowMainWindowInteraction: true
    };
  }

  /**
   * Validates and parses MTProxy secret formats (Kotatogram #114)
   * Formats:
   * 1. Standard 32 hex chars
   * 2. 'dd' + 32 hex chars (random padding)
   * 3. 'ee' + 32 hex chars + TLS domain hex (fake-TLS SNI)
   */
  public validateMtproxySecret(secret: string): {
    valid: boolean;
    type: 'standard' | 'dd_padded' | 'fake_tls' | 'invalid';
    cleanSecret: string;
    sniDomain?: string;
  } {
    const clean = secret.trim().toLowerCase();
    const hexRegex = /^[0-9a-f]+$/;

    if (!hexRegex.test(clean)) {
      return { valid: false, type: 'invalid', cleanSecret: '' };
    }

    if (clean.length === 32) {
      return { valid: true, type: 'standard', cleanSecret: clean };
    }

    if (clean.startsWith('dd') && clean.length === 34) {
      return { valid: true, type: 'dd_padded', cleanSecret: clean.substring(2) };
    }

    if (clean.startsWith('ee') && clean.length > 34) {
      // Fake-TLS: 'ee' + 32 hex key + hex domain
      const rawSecret = clean.substring(2, 34);
      const domainHex = clean.substring(34);
      let sniDomain = '';
      try {
        const bytes = domainHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
        sniDomain = String.fromCharCode(...bytes);
      } catch {
        sniDomain = '';
      }

      return {
        valid: true,
        type: 'fake_tls',
        cleanSecret: rawSecret,
        sniDomain: sniDomain || undefined
      };
    }

    return { valid: false, type: 'invalid', cleanSecret: '' };
  }

  /**
   * Calculates optimized upload pipeline parameters (Kotatogram #402)
   */
  public calculateUploadPipeline(fileSizeBytes: number): {
    chunkSize: number;
    concurrency: number;
    pipelineMode: 'pipelined' | 'sequential';
  } {
    // For small files (< 512KB), pipeline with high concurrency to minimize TCP round-trips
    if (fileSizeBytes < 512 * 1024) {
      return {
        chunkSize: 64 * 1024,
        concurrency: 4,
        pipelineMode: 'pipelined'
      };
    }

    // Medium files (< 10MB)
    if (fileSizeBytes < 10 * 1024 * 1024) {
      return {
        chunkSize: 256 * 1024,
        concurrency: 3,
        pipelineMode: 'pipelined'
      };
    }

    // Large files
    return {
      chunkSize: 512 * 1024,
      concurrency: 2,
      pipelineMode: 'sequential'
    };
  }
}

export const multiMonitorTrayAndProxyGovernor = new MultiMonitorTrayAndProxyGovernor();
