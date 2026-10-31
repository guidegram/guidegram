/**
 * Guidegram Media Viewer Window State & Snap Manager
 * 
 * Hardened against tdesktop #31520 (commit b2b8784 regression):
 * Allows maximizing the media viewer within the desktop workArea (keeping the OS taskbar visible)
 * without forcibly coercing the window into kiosk fullscreen mode.
 * 
 * Invariants:
 * 1. Maximized state respects display workArea (bounds.y + bounds.height <= workArea.height).
 * 2. Background clicks outside the active media bounding box trigger dismiss in both Normal & Maximized states.
 * 3. Fullscreen mode is explicitly distinct and opt-in (F11 / Double click / dedicated button).
 */

export type MediaViewerDisplayMode = 'normal' | 'maximized' | 'fullscreen';

export interface DisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class MediaViewerWindowManager {
  private mode: MediaViewerDisplayMode = 'normal';
  private normalGeometry: WindowGeometry = { x: 100, y: 100, width: 960, height: 600 };
  private workArea: DisplayWorkArea = { x: 0, y: 0, width: 1920, height: 1040 }; // 40px taskbar
  private displayBounds: DisplayWorkArea = { x: 0, y: 0, width: 1920, height: 1080 };
  private activeMediaBox: MediaBoundingBox | null = null;
  private isAeroSnapMaximizeEnabled: boolean = true;

  constructor(workArea?: DisplayWorkArea, displayBounds?: DisplayWorkArea) {
    if (workArea) this.workArea = workArea;
    if (displayBounds) this.displayBounds = displayBounds;
  }

  public setAeroSnapMaximizePolicy(allowMaximizeWithoutFullscreen: boolean): void {
    this.isAeroSnapMaximizeEnabled = allowMaximizeWithoutFullscreen;
  }

  public setActiveMediaBox(box: MediaBoundingBox): void {
    this.activeMediaBox = box;
  }

  public getDisplayMode(): MediaViewerDisplayMode {
    return this.mode;
  }

  /**
   * Handles user or OS system maximize request (e.g. Aero Snap to top edge / Win+Up / Maximize button).
   * Prevents unconditional coercion to Fullscreen when allowMaximizeWithoutFullscreen is true.
   */
  public handleMaximizeRequest(): WindowGeometry {
    if (!this.isAeroSnapMaximizeEnabled) {
      // Coerce to fullscreen if user prefers legacy behavior
      this.mode = 'fullscreen';
      return { ...this.displayBounds };
    }

    if (this.mode === 'maximized') {
      // Toggle back to normal
      this.mode = 'normal';
      return { ...this.normalGeometry };
    }

    // Enter WorkArea Maximized mode (taskbar remains visible)
    this.mode = 'maximized';
    return {
      x: this.workArea.x,
      y: this.workArea.y,
      width: this.workArea.width,
      height: this.workArea.height
    };
  }

  /**
   * Explicitly enters or exits true Fullscreen kiosk mode (e.g. F11).
   */
  public toggleFullscreen(): WindowGeometry {
    if (this.mode === 'fullscreen') {
      this.mode = 'normal';
      return { ...this.normalGeometry };
    }

    this.mode = 'fullscreen';
    return {
      x: this.displayBounds.x,
      y: this.displayBounds.y,
      width: this.displayBounds.width,
      height: this.displayBounds.height
    };
  }

  /**
   * Restores down to normal floating window.
   */
  public restoreDown(): WindowGeometry {
    this.mode = 'normal';
    return { ...this.normalGeometry };
  }

  /**
   * Hit-tests mouse clicks on the viewer.
   * Clicking outside the media box on the backdrop triggers dismiss,
   * regardless of whether the viewer is Normal or Maximized.
   */
  public shouldDismissOnBackgroundClick(clickX: number, clickY: number): boolean {
    if (!this.activeMediaBox) {
      return true;
    }

    const { x, y, width, height } = this.activeMediaBox;
    const isInsideMedia = 
      clickX >= x && 
      clickX <= x + width && 
      clickY >= y && 
      clickY <= y + height;

    return !isInsideMedia;
  }

  /**
   * Calculates current window geometry according to state.
   */
  public getCurrentGeometry(): WindowGeometry {
    switch (this.mode) {
      case 'maximized':
        return { ...this.workArea };
      case 'fullscreen':
        return { ...this.displayBounds };
      case 'normal':
      default:
        return { ...this.normalGeometry };
    }
  }
}
