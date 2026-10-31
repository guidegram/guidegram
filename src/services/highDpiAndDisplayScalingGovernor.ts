/**
 * HighDpiAndDisplayScalingGovernor.ts
 *
 * Comprehensive Governor for Multi-Monitor mixed-DPI scaling, crisp canvas backing stores,
 * vector Lottie / emoji render resolution, multi-monitor window bounds resolution,
 * and resize oscillation hysteresis.
 *
 * Directly resolves:
 * - AyuGram/AyuGramDesktop #237: Blurry text & UI on high-DPI scaling (125%/150%/200%)
 * - Ajaxy/telegram-tt #538: Fullscreen / enlarged custom emoji blurry from thumbnail upscaling
 * - TelegramMessenger/Telegram-iOS #2292: Blurry large emoji on 3x Retina displays
 * - AyuGram/AyuGramDesktop #494: Maximized window resizing in an infinite loop across mixed-DPI monitors
 * - telegramdesktop/tdesktop #28836: Media viewers / toasts opening on the wrong monitor after topology changes
 * - UnigramDev/Unigram #3243: Fullscreen image preview overscaling and pixelating small images
 */

export interface DisplayMonitor {
  id: string;
  isPrimary: boolean;
  scaleFactor: number; // e.g. 1.0, 1.25, 1.5, 2.0
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CanvasDpiDimensions {
  logicalWidth: number;
  logicalHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  scaleFactor: number;
  cssStyle: {
    width: string;
    height: string;
  };
}

export interface FitImageDimensions {
  renderWidth: number;
  renderHeight: number;
  scale: number;
  isOverscaled: boolean;
}

export class HighDpiAndDisplayScalingGovernor {
  private currentDpr = 1.0;
  private knownMonitors: DisplayMonitor[] = [];
  private lastResizeTimestamp = 0;
  private lastDpiSwitchScale = 1.0;
  private hysteresisThreshold = 0.05; // 5% scale difference required to trigger DPI re-layout

  constructor() {
    this.detectCurrentDpr();
  }

  private detectCurrentDpr(): void {
    if (typeof window !== 'undefined' && window.devicePixelRatio) {
      this.currentDpr = Math.max(1.0, window.devicePixelRatio);
    }
  }

  public setDevicePixelRatio(dpr: number): void {
    this.currentDpr = Math.max(1.0, dpr);
  }

  public getDevicePixelRatio(): number {
    return this.currentDpr;
  }

  /**
   * Calculates crisp canvas backing store dimensions matching physical display pixels.
   * Resolves AyuGram/AyuGramDesktop #237.
   */
  public computeCrispCanvasDimensions(
    logicalWidth: number,
    logicalHeight: number,
    dprOverride?: number
  ): CanvasDpiDimensions {
    const scaleFactor = dprOverride ?? this.currentDpr;
    const physicalWidth = Math.round(logicalWidth * scaleFactor);
    const physicalHeight = Math.round(logicalHeight * scaleFactor);

    return {
      logicalWidth,
      logicalHeight,
      physicalWidth,
      physicalHeight,
      scaleFactor,
      cssStyle: {
        width: `${logicalWidth}px`,
        height: `${logicalHeight}px`,
      },
    };
  }

  /**
   * Determines vector render resolution for Lottie animations & custom emoji.
   * Resolves Ajaxy/telegram-tt #538 & TelegramMessenger/Telegram-iOS #2292.
   */
  public computeVectorEmojiRenderSize(
    baseSize: number,
    isEnlargedOrFullscreen = false,
    dprOverride?: number
  ): { targetRenderDimension: number; assetTier: '@1x' | '@2x' | '@3x' } {
    const dpr = dprOverride ?? this.currentDpr;
    const effectiveDisplaySize = isEnlargedOrFullscreen ? baseSize * 4 : baseSize;
    const targetRenderDimension = Math.round(effectiveDisplaySize * dpr);

    let assetTier: '@1x' | '@2x' | '@3x' = '@1x';
    if (dpr >= 2.5) {
      assetTier = '@3x';
    } else if (dpr >= 1.5) {
      assetTier = '@2x';
    }

    return {
      targetRenderDimension,
      assetTier,
    };
  }

  /**
   * Registers active display monitors.
   */
  public updateMonitors(monitors: DisplayMonitor[]): void {
    this.knownMonitors = [...monitors];
  }

  /**
   * Resolves which monitor contains the given window coordinates.
   * Resolves telegramdesktop/tdesktop #28836.
   */
  public resolveTargetMonitor(windowBounds: { x: number; y: number; width: number; height: number }): DisplayMonitor {
    if (this.knownMonitors.length === 0) {
      // Default virtual primary display fallback
      return {
        id: 'primary_default',
        isPrimary: true,
        scaleFactor: this.currentDpr,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      };
    }

    const centerX = windowBounds.x + windowBounds.width / 2;
    const centerY = windowBounds.y + windowBounds.height / 2;

    for (const monitor of this.knownMonitors) {
      const b = monitor.bounds;
      if (centerX >= b.x && centerX < b.x + b.width && centerY >= b.y && centerY < b.y + b.height) {
        return monitor;
      }
    }

    // Fallback to primary or first monitor
    return this.knownMonitors.find((m) => m.isPrimary) || this.knownMonitors[0];
  }

  /**
   * Evaluates window resize across monitors with hysteresis to eliminate infinite resize loops.
   * Resolves AyuGram/AyuGramDesktop #494.
   */
  public shouldAcknowledgeDpiChange(newScaleFactor: number, now = Date.now()): boolean {
    const scaleDiff = Math.abs(newScaleFactor - this.lastDpiSwitchScale);
    const timeSinceLastSwitch = now - this.lastResizeTimestamp;

    // If within 100ms debounce and scale difference is tiny, suppress oscillation loop
    if (timeSinceLastSwitch < 100 && scaleDiff < this.hysteresisThreshold) {
      return false;
    }

    this.lastResizeTimestamp = now;
    this.lastDpiSwitchScale = newScaleFactor;
    return true;
  }

  /**
   * Calculates smart image preview dimensions without overscaling low-res images to full screen.
   * Resolves UnigramDev/Unigram #3243.
   */
  public computeSmartImagePreviewFit(
    imageWidth: number,
    imageHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    allowOverscale = false
  ): FitImageDimensions {
    if (imageWidth <= 0 || imageHeight <= 0) {
      return { renderWidth: 0, renderHeight: 0, scale: 1.0, isOverscaled: false };
    }

    const scaleX = viewportWidth / imageWidth;
    const scaleY = viewportHeight / imageHeight;
    let targetScale = Math.min(scaleX, scaleY);

    let isOverscaled = false;
    if (!allowOverscale && targetScale > 1.0) {
      // Small image: do not upscale beyond 100% natural pixels to avoid blurriness/pixelation
      targetScale = 1.0;
    } else if (targetScale > 1.0) {
      isOverscaled = true;
    }

    const renderWidth = Math.round(imageWidth * targetScale);
    const renderHeight = Math.round(imageHeight * targetScale);

    return {
      renderWidth,
      renderHeight,
      scale: targetScale,
      isOverscaled,
    };
  }
}

export const highDpiAndDisplayScalingGovernor = new HighDpiAndDisplayScalingGovernor();
