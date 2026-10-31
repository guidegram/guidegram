/**
 * Guidegram Tablet & Multi-Screen Ergonomics Service
 *
 * Hardened against competitor issues:
 * - tdesktop #3274: Input field hidden under onscreen keyboard on tablet in landscape orientation.
 * - tdesktop #24218: Image viewer cutting off on second monitor with different orientation.
 * - tdesktop #320: Window shrinking after exiting landscape video player.
 * - tdesktop #1058: Optimized responsive margins and dual-pane layout for tablet mode.
 */

export interface ScreenGeometry {
  width: number;
  height: number;
  isLandscape: boolean;
  scaleFactor: number;
}

export class LandscapeKeyboardScrollInviewGuard {
  /**
   * Calculates required scroll adjustment to bring input field into view in landscape mode (#3274)
   */
  public static calculateInputScrollOffset(
    inputTop: number,
    inputHeight: number,
    viewportHeight: number,
    keyboardHeight: number
  ): { needsScroll: boolean; targetScrollTop: number } {
    const visibleHeight = viewportHeight - keyboardHeight;
    const inputBottom = inputTop + inputHeight;

    if (inputBottom <= visibleHeight) {
      return { needsScroll: false, targetScrollTop: 0 };
    }

    // Center input within remaining visible viewport area
    const idealTop = Math.max(0, (visibleHeight - inputHeight) / 2);
    const targetScrollTop = Math.max(0, inputTop - idealTop);

    return {
      needsScroll: true,
      targetScrollTop: Math.round(targetScrollTop),
    };
  }
}

export interface ViewerBounds {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
}

export class MultiMonitorOrientationGuard {
  /**
   * Computes proper aspect-fit bounds matching the specific target monitor geometry (#24218)
   */
  public static computeViewerBounds(
    imageWidth: number,
    imageHeight: number,
    screen: ScreenGeometry
  ): ViewerBounds {
    const maxWidth = screen.width * 0.95;
    const maxHeight = screen.height * 0.95;

    const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1.0);
    const renderedWidth = Math.round(imageWidth * scale);
    const renderedHeight = Math.round(imageHeight * scale);

    const offsetX = Math.round((screen.width - renderedWidth) / 2);
    const offsetY = Math.round((screen.height - renderedHeight) / 2);

    return {
      renderedWidth,
      renderedHeight,
      offsetX,
      offsetY,
    };
  }
}

export interface WindowDimensions {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export class LandscapeVideoReturnRestorationGuard {
  private savedBounds: WindowDimensions | null = null;

  public onEnterVideo(currentBounds: WindowDimensions): void {
    this.savedBounds = { ...currentBounds };
  }

  public onExitVideo(currentBounds: WindowDimensions): WindowDimensions {
    if (!this.savedBounds) {
      return currentBounds;
    }

    const restored: WindowDimensions = {
      width: Math.max(currentBounds.width, this.savedBounds.width),
      height: Math.max(currentBounds.height, this.savedBounds.height),
      x: this.savedBounds.x,
      y: this.savedBounds.y,
    };

    this.savedBounds = null;
    return restored;
  }
}

export type LayoutMode = 'single_pane' | 'tablet_dual_pane' | 'desktop_triple_pane';

export class TabletDualPaneLayoutManager {
  public static readonly TABLET_BREAKPOINT = 768;
  public static readonly DESKTOP_BREAKPOINT = 1200;

  public static resolveLayoutMode(windowWidth: number): {
    mode: LayoutMode;
    chatListWidth: number;
    showRightSidebar: boolean;
  } {
    if (windowWidth < this.TABLET_BREAKPOINT) {
      return {
        mode: 'single_pane',
        chatListWidth: windowWidth,
        showRightSidebar: false,
      };
    }

    if (windowWidth < this.DESKTOP_BREAKPOINT) {
      return {
        mode: 'tablet_dual_pane',
        chatListWidth: 320,
        showRightSidebar: false,
      };
    }

    return {
      mode: 'desktop_triple_pane',
      chatListWidth: 360,
      showRightSidebar: true,
    };
  }
}
