/**
 * Guidegram Touch Ergonomics, Precision Touchpad & Gesture Governor
 * 
 * Hardened against:
 * - tdesktop #30992: Erratic touchpad scrolling and precision touchpad acceleration jumps
 * - Ajaxy/telegram-tt #446: Emoji reaction popover overflowing viewport bounds
 * - morethanwords/tweb #406: Background body scroll chaining when modals/sheets are opened
 * - Ajaxy/telegram-tt #236: Infinite loading state in mobile view pull-to-refresh
 * - morethanwords/tweb #281: Small touch target miss clicks on reaction & icon buttons
 * - tdesktop #31421: Stale unread reaction badge stuck on non-existent messages
 */

export interface PrecisionWheelEvent {
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  deltaMode: number; // 0 = pixel, 1 = line, 2 = page
}

export interface NormalizedTouchpadResult {
  isPinchToZoom: boolean;
  zoomFactorDelta: number;
  normalizedDeltaX: number;
  normalizedDeltaY: number;
}

export interface PopoverPlacement {
  x: number;
  y: number;
  arrowOffsetPx: number;
  isFlippedAbove: boolean;
}

export interface PullToRefreshState {
  currentPullY: number;
  thresholdPx: number;
  isTriggered: boolean;
  progress: number; // 0.0 to 1.0
  isTimedOut: boolean;
}

export class TouchErgonomicsAndGestureGovernor {
  private static activeScrollLocks = 0;

  /**
   * Normalizes precision touchpad gestures, cleanly isolating pinch-to-zoom
   * from two-finger scrolling and clamping velocity spikes (tdesktop #30992).
   */
  public static normalizeTouchpadWheel(event: PrecisionWheelEvent): NormalizedTouchpadResult {
    let factor = 1;
    if (event.deltaMode === 1) factor = 20; // line mode
    if (event.deltaMode === 2) factor = 600; // page mode

    const rawDx = event.deltaX * factor;
    const rawDy = event.deltaY * factor;

    // Trackpad pinch-to-zoom is transmitted as WheelEvent with ctrlKey = true
    if (event.ctrlKey) {
      // Zoom factor calculation: clamp delta between -100 and +100
      const clampedDelta = Math.max(-100, Math.min(100, rawDy));
      const zoomFactorDelta = -clampedDelta * 0.01;
      return {
        isPinchToZoom: true,
        zoomFactorDelta,
        normalizedDeltaX: 0,
        normalizedDeltaY: 0
      };
    }

    // Two-finger scroll: damp extreme spikes from rogue touchpad drivers
    const maxInstantDelta = 250;
    const normalizedDeltaX = Math.sign(rawDx) * Math.min(Math.abs(rawDx), maxInstantDelta);
    const normalizedDeltaY = Math.sign(rawDy) * Math.min(Math.abs(rawDy), maxInstantDelta);

    return {
      isPinchToZoom: false,
      zoomFactorDelta: 0,
      normalizedDeltaX,
      normalizedDeltaY
    };
  }

  /**
   * Calculates popover position ensuring it stays within viewport boundaries,
   * adjusting arrow offsets to point precisely to the trigger origin (Ajaxy/telegram-tt #446).
   */
  public static calculateReactionPopoverPlacement(
    triggerRect: { left: number; top: number; width: number; height: number },
    popoverWidth: number,
    popoverHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    margin: number = 8
  ): PopoverPlacement {
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    let targetX = triggerCenterX - popoverWidth / 2;

    // Clamp horizontally within screen
    if (targetX < margin) {
      targetX = margin;
    } else if (targetX + popoverWidth > viewportWidth - margin) {
      targetX = viewportWidth - popoverWidth - margin;
    }

    // Determine vertical placement: above trigger if enough space, else below
    const spaceAbove = triggerRect.top;
    let targetY: number;
    let isFlippedAbove = false;

    if (spaceAbove >= popoverHeight + margin) {
      targetY = triggerRect.top - popoverHeight - 6;
      isFlippedAbove = true;
    } else {
      targetY = triggerRect.top + triggerRect.height + 6;
      isFlippedAbove = false;
    }

    // Calculate arrow offset relative to popover left edge
    const arrowOffsetPx = Math.max(12, Math.min(triggerCenterX - targetX, popoverWidth - 12));

    return {
      x: Math.round(targetX),
      y: Math.round(targetY),
      arrowOffsetPx: Math.round(arrowOffsetPx),
      isFlippedAbove
    };
  }

  /**
   * Manages global body scroll locks during modal or bottom-sheet presentation,
   * preventing background document scrolling without causing scrollbar layout jumping (morethanwords/tweb #406).
   */
  public static acquireScrollLock(): { shouldLockBody: boolean; lockCount: number } {
    this.activeScrollLocks += 1;
    return {
      shouldLockBody: this.activeScrollLocks === 1,
      lockCount: this.activeScrollLocks
    };
  }

  public static releaseScrollLock(): { shouldUnlockBody: boolean; lockCount: number } {
    this.activeScrollLocks = Math.max(0, this.activeScrollLocks - 1);
    return {
      shouldUnlockBody: this.activeScrollLocks === 0,
      lockCount: this.activeScrollLocks
    };
  }

  /**
   * Pull-to-refresh state machine with progressive resistance and safety timeout,
   * preventing infinite spinning loops (Ajaxy/telegram-tt #236).
   */
  public static updatePullToRefresh(
    pullDistanceY: number,
    thresholdPx: number = 72,
    elapsedMsSinceTrigger: number = 0,
    timeoutMs: number = 8000
  ): PullToRefreshState {
    if (elapsedMsSinceTrigger > timeoutMs) {
      return {
        currentPullY: 0,
        thresholdPx,
        isTriggered: false,
        progress: 0,
        isTimedOut: true
      };
    }

    // Apply progressive logarithmic resistance
    const effectivePull = pullDistanceY > 0 ? Math.pow(pullDistanceY, 0.85) * 2.2 : 0;
    const progress = Math.min(1.0, effectivePull / thresholdPx);
    const isTriggered = effectivePull >= thresholdPx;

    return {
      currentPullY: Math.round(effectivePull),
      thresholdPx,
      isTriggered,
      progress,
      isTimedOut: false
    };
  }

  /**
   * Computes expanded touch hit slop bounding box enforcing WCAG 44x44px minimum target,
   * preventing misclicks on compact reaction and action buttons (morethanwords/tweb #281).
   */
  public static computeAccessibleHitBounds(
    elementRect: { x: number; y: number; width: number; height: number },
    minTargetSize: number = 44
  ): { x: number; y: number; width: number; height: number; paddingHorizontal: number; paddingVertical: number } {
    const padX = Math.max(0, (minTargetSize - elementRect.width) / 2);
    const padY = Math.max(0, (minTargetSize - elementRect.height) / 2);

    return {
      x: elementRect.x - padX,
      y: elementRect.y - padY,
      width: elementRect.width + padX * 2,
      height: elementRect.height + padY * 2,
      paddingHorizontal: Math.round(padX),
      paddingVertical: Math.round(padY)
    };
  }

  /**
   * Reconciles unread reaction pointers against known local message IDs,
   * purging references to deleted or missing messages to prevent persistent ghost badges (tdesktop #31421).
   */
  public static reconcileUnreadReactionPointers(
    unreadReactionMsgIds: number[],
    existingMessageIds: Set<number>
  ): { validMsgIds: number[]; purgedCount: number } {
    const valid = unreadReactionMsgIds.filter(id => existingMessageIds.has(id));
    return {
      validMsgIds: valid,
      purgedCount: unreadReactionMsgIds.length - valid.length
    };
  }
}
