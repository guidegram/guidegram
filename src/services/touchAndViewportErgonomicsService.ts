/**
 * Guidegram Mobile & Touch Ergonomics Service
 *
 * Hardened against competitor issues:
 * - tdesktop #1570: Telegram becomes unresponsive to touch gestures & scrolling.
 * - tdesktop #1410: MiniApp, virtual keyboard overlaps the content and shifts window improperly.
 * - tdesktop #4358: Inline window controls & minimum touch hit targets (44x44px).
 * - tdesktop #1710: Accidental full-screen mode triggers from touch gestures.
 */

export interface TouchVelocity {
  vx: number;
  vy: number;
  isKinetic: boolean;
}

export interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export class TouchGestureAndKineticScrollGuard {
  private startPoint: TouchPoint | null = null;
  private lastPoint: TouchPoint | null = null;
  private minSwipeDistance: number = 10;
  private velocityThreshold: number = 0.3; // px/ms

  public onTouchStart(x: number, y: number, time: number = Date.now()): void {
    this.startPoint = { x, y, time };
    this.lastPoint = { x, y, time };
  }

  public onTouchMove(x: number, y: number, time: number = Date.now()): {
    deltaX: number;
    deltaY: number;
    isScrolling: boolean;
  } {
    if (!this.startPoint || !this.lastPoint) {
      this.onTouchStart(x, y, time);
      return { deltaX: 0, deltaY: 0, isScrolling: false };
    }

    const deltaX = x - this.lastPoint.x;
    const deltaY = y - this.lastPoint.y;
    const totalDist = Math.hypot(x - this.startPoint.x, y - this.startPoint.y);

    this.lastPoint = { x, y, time };

    return {
      deltaX,
      deltaY,
      isScrolling: totalDist >= this.minSwipeDistance,
    };
  }

  public onTouchEnd(x: number, y: number, time: number = Date.now()): TouchVelocity {
    if (!this.lastPoint || !this.startPoint) {
      return { vx: 0, vy: 0, isKinetic: false };
    }

    const dt = Math.max(1, time - this.lastPoint.time);
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;

    const vx = dx / dt;
    const vy = dy / dt;
    const speed = Math.hypot(vx, vy);

    this.startPoint = null;
    this.lastPoint = null;

    return {
      vx,
      vy,
      isKinetic: speed >= this.velocityThreshold,
    };
  }
}

export interface ViewportInsetInfo {
  windowHeight: number;
  visualHeight: number;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  offsetTop: number;
}

export class VirtualKeyboardAndViewportManager {
  private currentInset: ViewportInsetInfo = {
    windowHeight: 800,
    visualHeight: 800,
    keyboardHeight: 0,
    isKeyboardVisible: false,
    offsetTop: 0,
  };

  /**
   * Recalculates insets from window and visualViewport metrics
   */
  public updateViewport(
    windowHeight: number,
    visualHeight: number,
    offsetTop: number = 0
  ): ViewportInsetInfo {
    const rawDiff = windowHeight - visualHeight;
    // If visualViewport is significantly smaller (> 150px), soft keyboard is active
    const isKeyboardVisible = rawDiff > 150;
    const keyboardHeight = isKeyboardVisible ? Math.max(0, rawDiff) : 0;

    this.currentInset = {
      windowHeight,
      visualHeight,
      keyboardHeight,
      isKeyboardVisible,
      offsetTop,
    };

    return { ...this.currentInset };
  }

  public getInset(): ViewportInsetInfo {
    return { ...this.currentInset };
  }

  /**
   * Calculates bottom padding needed for chat composer or MiniApp container
   */
  public computeContainerBottomOffset(basePadding: number = 0): number {
    return this.currentInset.isKeyboardVisible
      ? this.currentInset.keyboardHeight + basePadding
      : basePadding;
  }
}

export interface HitBox {
  width: number;
  height: number;
  expandedPaddingX: number;
  expandedPaddingY: number;
  effectiveWidth: number;
  effectiveHeight: number;
  meetsWcagStandard: boolean;
}

export class TouchTargetAndHitSlopExpander {
  public static readonly MIN_TARGET_SIZE = 44; // WCAG 2.5.5 minimum 44px

  /**
   * Computes hit slop padding to expand undersized touch targets to minimum 44x44px
   */
  public static calculateHitSlop(width: number, height: number): HitBox {
    const paddingX = Math.max(0, (this.MIN_TARGET_SIZE - width) / 2);
    const paddingY = Math.max(0, (this.MIN_TARGET_SIZE - height) / 2);

    const effectiveWidth = width + (paddingX * 2);
    const effectiveHeight = height + (paddingY * 2);

    return {
      width,
      height,
      expandedPaddingX: Math.round(paddingX),
      expandedPaddingY: Math.round(paddingY),
      effectiveWidth: Math.round(effectiveWidth),
      effectiveHeight: Math.round(effectiveHeight),
      meetsWcagStandard: effectiveWidth >= this.MIN_TARGET_SIZE && effectiveHeight >= this.MIN_TARGET_SIZE,
    };
  }

  /**
   * Tests if a tap at (tapX, tapY) hits an element with hit slop applied
   */
  public static isWithinTargetWithHitSlop(
    tapX: number,
    tapY: number,
    elemLeft: number,
    elemTop: number,
    elemWidth: number,
    elemHeight: number
  ): boolean {
    const hitBox = this.calculateHitSlop(elemWidth, elemHeight);
    const left = elemLeft - hitBox.expandedPaddingX;
    const right = elemLeft + elemWidth + hitBox.expandedPaddingX;
    const top = elemTop - hitBox.expandedPaddingY;
    const bottom = elemTop + elemHeight + hitBox.expandedPaddingY;

    return tapX >= left && tapX <= right && tapY >= top && tapY <= bottom;
  }
}

export class WindowFullscreenGuard {
  private isFullscreen: boolean = false;
  private lastToggleTime: number = 0;
  private debounceThresholdMs: number = 600;

  public canToggleFullscreen(now: number = Date.now()): boolean {
    if (now - this.lastToggleTime < this.debounceThresholdMs) {
      return false; // Prevent accidental rapid double-tap fullscreen switches
    }
    return true;
  }

  public setFullscreenState(state: boolean, now: number = Date.now()): boolean {
    if (!this.canToggleFullscreen(now)) {
      return false;
    }
    this.isFullscreen = state;
    this.lastToggleTime = now;
    return true;
  }

  public getState(): boolean {
    return this.isFullscreen;
  }
}
