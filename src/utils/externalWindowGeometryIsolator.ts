/**
 * External Window Geometry Isolator & Third-Section Resizing Guard
 * 
 * Prevents geometry bleed and uncoordinated window scaling across independent
 * windows in multi-window desktop Telegram architectures (addressing TDesktop #31545).
 * 
 * In architectures where external/separate chat windows share session controllers
 * with the primary window, toggling the right-side sticker, emoji, or profile info
 * panel must strictly expand the geometry of the originating external window and NEVER
 * mutate the parent or main window bounds.
 */

export type WindowType = 'main' | 'external_chat' | 'account' | 'mini_app' | 'notifications' | 'unknown';
export type ThirdSectionType = 'stickers' | 'emojis' | 'info' | 'search' | 'none';

export interface Rectangle {
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
}

export interface WindowGeometryRecord {
  windowId: string;
  type: WindowType;
  bounds: Rectangle;
  minBounds: { minWidth: number; minHeight: number };
  activeThirdSection: ThirdSectionType;
  savedWidthBeforeExpansion?: number;
  displayWorkArea?: DisplayWorkArea;
}

export interface ResizeComputationResult {
  targetWindowId: string;
  newBounds: Rectangle;
  affectedWindows: string[];
  bleedPrevented: boolean;
  clampedToWorkArea: boolean;
  action: 'expanded' | 'collapsed' | 'noop';
}

export interface ResizeEventValidation {
  allowed: boolean;
  reason?: string;
}

export class ExternalWindowGeometryIsolator {
  private windows = new Map<string, WindowGeometryRecord>();
  private mainWindowId: string | null = null;

  /**
   * Registers a window instance into the isolated geometry registry.
   */
  public registerWindow(
    windowId: string,
    type: WindowType,
    bounds: Rectangle,
    minBounds: { minWidth: number; minHeight: number } = { minWidth: 400, minHeight: 300 },
    displayWorkArea?: DisplayWorkArea
  ): WindowGeometryRecord {
    const record: WindowGeometryRecord = {
      windowId,
      type,
      bounds: { ...bounds },
      minBounds: { ...minBounds },
      activeThirdSection: 'none',
      displayWorkArea: displayWorkArea ? { ...displayWorkArea } : undefined,
    };

    this.windows.set(windowId, record);
    if (type === 'main') {
      this.mainWindowId = windowId;
    }

    return record;
  }

  /**
   * Unregisters a closed window.
   */
  public unregisterWindow(windowId: string): boolean {
    if (this.mainWindowId === windowId) {
      this.mainWindowId = null;
    }
    return this.windows.delete(windowId);
  }

  /**
   * Retrieves a registered window's geometry.
   */
  public getWindow(windowId: string): WindowGeometryRecord | undefined {
    return this.windows.get(windowId);
  }

  /**
   * Validates whether a resize event originating from a window should be permitted.
   * Prevents secondary windows from dispatching geometry alterations to other windows.
   */
  public validateResizeEvent(sourceWindowId: string, requestedTargetWindowId: string): ResizeEventValidation {
    if (!this.windows.has(sourceWindowId)) {
      return { allowed: false, reason: `Source window "${sourceWindowId}" is not registered in the geometry registry.` };
    }

    if (!this.windows.has(requestedTargetWindowId)) {
      return { allowed: false, reason: `Target window "${requestedTargetWindowId}" does not exist.` };
    }

    // A window is only allowed to resize itself.
    if (sourceWindowId !== requestedTargetWindowId) {
      return {
        allowed: false,
        reason: `Geometry Bleed Denied: Window "${sourceWindowId}" attempted to resize window "${requestedTargetWindowId}". Each window must manage its own geometry independently.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Computes the new bounds when toggling a third section (stickers/emojis/info panel)
   * in an isolated window without bleeding into other windows.
   */
  public computeThirdSectionToggle(
    targetWindowId: string,
    section: ThirdSectionType,
    panelWidth: number = 360
  ): ResizeComputationResult {
    const record = this.windows.get(targetWindowId);
    if (!record) {
      throw new Error(`Target window "${targetWindowId}" not found in geometry registry.`);
    }

    const currentBounds = { ...record.bounds };
    let clampedToWorkArea = false;
    let action: 'expanded' | 'collapsed' | 'noop' = 'noop';

    // If the section is already active or we are requesting 'none', collapse it
    if (section === 'none' || record.activeThirdSection === section) {
      if (record.activeThirdSection !== 'none') {
        action = 'collapsed';
        // Restore pre-expansion width if available
        if (record.savedWidthBeforeExpansion !== undefined) {
          currentBounds.width = Math.max(record.minBounds.minWidth, record.savedWidthBeforeExpansion);
        } else {
          currentBounds.width = Math.max(record.minBounds.minWidth, currentBounds.width - panelWidth);
        }
        record.activeThirdSection = 'none';
        record.savedWidthBeforeExpansion = undefined;
      }
    } else {
      // Expanding or switching third section
      if (record.activeThirdSection === 'none') {
        action = 'expanded';
        record.savedWidthBeforeExpansion = currentBounds.width;
        currentBounds.width += panelWidth;
      } else {
        // Already expanded, just switching section type
        action = 'noop';
      }
      record.activeThirdSection = section;
    }

    // Work area boundary enforcement
    if (record.displayWorkArea) {
      const maxWidth = record.displayWorkArea.width;
      if (currentBounds.width > maxWidth) {
        currentBounds.width = maxWidth;
        clampedToWorkArea = true;
      }

      // If right edge exceeds work area, shift left
      const rightEdge = currentBounds.x + currentBounds.width;
      const workAreaRight = record.displayWorkArea.x + record.displayWorkArea.width;
      if (rightEdge > workAreaRight) {
        currentBounds.x = Math.max(record.displayWorkArea.x, workAreaRight - currentBounds.width);
        clampedToWorkArea = true;
      }
    }

    record.bounds = { ...currentBounds };

    // Bleed prevention verification: Ensure main window was untouched if target is external
    const isTargetExternal = record.type !== 'main';
    const bleedPrevented = isTargetExternal && this.mainWindowId !== null;

    return {
      targetWindowId,
      newBounds: currentBounds,
      affectedWindows: [targetWindowId],
      bleedPrevented,
      clampedToWorkArea,
      action,
    };
  }

  /**
   * Resets all registered windows.
   */
  public reset(): void {
    this.windows.clear();
    this.mainWindowId = null;
  }
}

export const externalWindowGeometryIsolator = new ExternalWindowGeometryIsolator();
