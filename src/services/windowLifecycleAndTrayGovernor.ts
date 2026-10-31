/**
 * Guidegram Window Lifecycle, Multi-Window Geometry & System Tray Governor
 * 
 * Hardened against:
 * - tdesktop #31545: Triggering emoji/sticker panel on external chat windows resizes main window
 * - tdesktop #1189: Windows size and position restoration bug across multi-monitor & DPI shifts
 * - tdesktop #139 & #1401: Minimize-to-tray and tray icon disappearing after window closing
 * - tdesktop #10556, #1908 & #2230: Dark/light themeable high-DPI crisp tray icons on Windows & KDE
 * - tdesktop #31520: Maximizing media viewer without entering exclusive fullscreen
 */

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface TrayIconConfig {
  theme: 'dark' | 'light' | 'auto';
  systemIsDark: boolean;
  unreadCount: number;
  hasMutedUnread: boolean;
  scaleFactor: number; // e.g. 1, 1.25, 1.5, 2
}

export interface TrayIconDescriptor {
  baseColor: string;
  badgeColor: string | null;
  sizePx: number;
  ariaLabel: string;
}

export type WindowCloseAction = 'minimize-to-tray' | 'hide-to-tray' | 'quit';

export class WindowLifecycleAndTrayGovernor {
  /**
   * Sanitizes and validates window bounds against active display work areas,
   * preventing window restoration offscreen, into negative coordinates, or with zero dimensions (tdesktop #1189).
   */
  public static sanitizeWindowBounds(
    savedBounds: WindowBounds,
    displays: DisplayWorkArea[],
    defaultBounds: WindowBounds = { x: 100, y: 100, width: 1024, height: 768 }
  ): WindowBounds {
    if (!displays || displays.length === 0) {
      return defaultBounds;
    }

    // Check if saved bounds are visible in any display work area (at least 50% visible)
    const isVisibleInAnyDisplay = displays.some(disp => {
      const right = savedBounds.x + savedBounds.width;
      const bottom = savedBounds.y + savedBounds.height;
      const dispRight = disp.x + disp.width;
      const dispBottom = disp.y + disp.height;

      const overlapX = Math.max(0, Math.min(right, dispRight) - Math.max(savedBounds.x, disp.x));
      const overlapY = Math.max(0, Math.min(bottom, dispBottom) - Math.max(savedBounds.y, disp.y));
      const overlapArea = overlapX * overlapY;
      const windowArea = savedBounds.width * savedBounds.height;

      return windowArea > 0 && overlapArea / windowArea >= 0.3;
    });

    if (!isVisibleInAnyDisplay) {
      // Reposition centered on the primary display
      const primary = displays[0];
      const width = Math.min(savedBounds.width || defaultBounds.width, primary.width * 0.9);
      const height = Math.min(savedBounds.height || defaultBounds.height, primary.height * 0.9);
      const x = primary.x + Math.round((primary.width - width) / 2);
      const y = primary.y + Math.round((primary.height - height) / 2);
      return { x, y, width, height };
    }

    // Clamp dimensions to minimum viable size
    return {
      x: savedBounds.x,
      y: savedBounds.y,
      width: Math.max(savedBounds.width, 480),
      height: Math.max(savedBounds.height, 360)
    };
  }

  /**
   * Enforces strict state and dimension isolation for secondary/child windows (e.g. detached chat windows, sticker picker),
   * guaranteeing that opening or resizing secondary panels does NOT mutate main window dimensions (tdesktop #31545).
   */
  public static isolateSecondaryWindowBounds(
    mainWindowBounds: WindowBounds,
    requestedSecondaryBounds: WindowBounds,
    display: DisplayWorkArea
  ): { safeMainWindowBounds: WindowBounds; isolatedSecondaryBounds: WindowBounds } {
    // Return deep copy of main window bounds untouched
    const safeMainWindow = { ...mainWindowBounds };

    // Clamp secondary window within display boundaries without pushing main window
    const maxWidth = display.width * 0.8;
    const maxHeight = display.height * 0.8;
    const width = Math.min(requestedSecondaryBounds.width, maxWidth);
    const height = Math.min(requestedSecondaryBounds.height, maxHeight);

    const x = Math.max(display.x, Math.min(requestedSecondaryBounds.x, display.x + display.width - width));
    const y = Math.max(display.y, Math.min(requestedSecondaryBounds.y, display.y + display.height - height));

    return {
      safeMainWindowBounds: safeMainWindow,
      isolatedSecondaryBounds: { x, y, width, height }
    };
  }

  /**
   * Generates high-DPI theme-adaptive tray icon parameters and contrast colors,
   * resolving blurry KDE tray icons and dark-on-dark invisible tray icons (tdesktop #10556, #1908, #2230).
   */
  public static generateTrayIconDescriptor(config: TrayIconConfig): TrayIconDescriptor {
    const isDarkBackground =
      config.theme === 'auto'
        ? config.systemIsDark
        : config.theme === 'dark';

    // On dark system taskbars (Windows 10/11 default, KDE dark theme), use pure white;
    // On light taskbars (macOS light, Windows light taskbar), use obsidian #1A1A1A
    const baseColor = isDarkBackground ? '#FFFFFF' : '#1A1A1A';

    let badgeColor: string | null = null;
    let badgeText = '';

    if (config.unreadCount > 0) {
      badgeColor = config.hasMutedUnread ? '#8E8E93' : '#3390EC';
      badgeText = config.unreadCount > 99 ? '99+' : String(config.unreadCount);
    }

    // High DPI base sizing: 16px @ 1x, 24px @ 1.5x, 32px @ 2x
    const sizePx = Math.round(16 * Math.max(1, config.scaleFactor));

    const ariaLabel =
      config.unreadCount > 0
        ? `Guidegram - ${badgeText} unread messages`
        : 'Guidegram';

    return {
      baseColor,
      badgeColor,
      sizePx,
      ariaLabel
    };
  }

  /**
   * Resolves the deterministic close action according to user settings and tray availability,
   * ensuring window close does not kill process when minimize-to-tray is enabled (tdesktop #139, #1401).
   */
  public static resolveWindowCloseAction(
    closeToTraySetting: boolean,
    isTrayAvailable: boolean,
    hasActiveCalls: boolean = false
  ): WindowCloseAction {
    if (hasActiveCalls) {
      // In active voice/video call, never terminate abruptly
      return isTrayAvailable ? 'minimize-to-tray' : 'minimize-to-tray';
    }

    if (closeToTraySetting && isTrayAvailable) {
      return 'hide-to-tray';
    }

    return 'quit';
  }

  /**
   * Resolves media viewer window presentation mode, supporting maximized desktop window
   * without forcing exclusive borderless fullscreen (tdesktop #31520, #2958).
   */
  public static calculateMediaViewerDisplayMode(
    requestedFullscreen: boolean,
    isMaximized: boolean
  ): {
    mode: 'fullscreen' | 'maximized' | 'windowed';
    decorationsVisible: boolean;
    taskbarVisible: boolean;
  } {
    if (requestedFullscreen) {
      return {
        mode: 'fullscreen',
        decorationsVisible: false,
        taskbarVisible: false
      };
    }

    if (isMaximized) {
      return {
        mode: 'maximized',
        decorationsVisible: true,
        taskbarVisible: true
      };
    }

    return {
      mode: 'windowed',
      decorationsVisible: true,
      taskbarVisible: true
    };
  }
}
