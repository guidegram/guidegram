/**
 * Guidegram Mobile & Touch Ergonomics, Hit Slop and Viewport Governor
 * 
 * Hardened against competitor issues:
 * - Telegram-iOS #1474: Webpage/Mini-App slides under mobile keyboard after entering text
 * - Telegram-iOS #2324: A tap on one spoiler reveals every spoiler in the message instead of only the tapped one
 * - Telegram-iOS #2323: Table caption overlap obscuring bottom links and hijacking touch target hit slop
 * - Unigram #563: Image zoom keyboard shortcuts (Ctrl++, -, 0) and touch pinch clamping
 * - kotatogram #370 & Unigram #2746: Drag & drop gesture slop threshold and forward parameter preservation
 */

export interface ViewportKeyboardInset {
  keyboardHeight: number;
  visualViewportHeight: number;
  contentOffsetCompensation: number;
  isKeyboardVisible: boolean;
}

export interface SpoilerState {
  messageId: number;
  revealedSpoilerIds: Set<string>;
}

export interface TouchTargetRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isClickable: boolean;
}

export interface DragDropForwardPayload {
  messageIds: number[];
  isGenuineDrag: boolean;
  dropAuthor: boolean;
  dropCaption: boolean;
}

export class MobileTouchErgonomicsAndSlopGovernor {
  private static readonly DRAG_SLOP_THRESHOLD_PX = 8;
  private static readonly MIN_TOUCH_TARGET_SIZE_PX = 44; // WCAG 2.5.5 AAA touch target size
  private static readonly MIN_ZOOM_SCALE = 1.0;
  private static readonly MAX_ZOOM_SCALE = 5.0;

  /**
   * Calculates viewport and keyboard inset compensation to prevent
   * inputs from sliding under mobile soft keyboards (Telegram-iOS #1474).
   */
  public static calculateKeyboardInset(
    windowHeight: number,
    visualViewportHeight: number,
    activeElementBottomPx: number
  ): ViewportKeyboardInset {
    const keyboardHeight = Math.max(0, windowHeight - visualViewportHeight);
    const isKeyboardVisible = keyboardHeight > 100; // Ignore small sub-100px browser chrome shifts

    let contentOffsetCompensation = 0;
    if (isKeyboardVisible && activeElementBottomPx > visualViewportHeight) {
      // Offset required so active input sits comfortably 16px above the top of keyboard
      contentOffsetCompensation = (activeElementBottomPx - visualViewportHeight) + 16;
    }

    return {
      keyboardHeight,
      visualViewportHeight,
      contentOffsetCompensation,
      isKeyboardVisible
    };
  }

  /**
   * Manages isolated spoiler tap revelation so tapping one spoiler
   * does not unintentionally reveal all spoilers in the message (Telegram-iOS #2324).
   */
  public static toggleSpoilerTap(
    currentRevealedSet: Set<string>,
    tappedSpoilerId: string,
    revealAll: boolean = false,
    allSpoilerIds: string[] = []
  ): Set<string> {
    const updated = new Set<string>(currentRevealedSet);

    if (revealAll) {
      for (const id of allSpoilerIds) {
        updated.add(id);
      }
      return updated;
    }

    if (updated.has(tappedSpoilerId)) {
      updated.delete(tappedSpoilerId);
    } else {
      updated.add(tappedSpoilerId);
    }

    return updated;
  }

  /**
   * Resolves touch collision and expands undersized touch targets to meet 44x44px hit slop
   * while ensuring table captions don't swallow taps on underlying links (Telegram-iOS #2323).
   */
  public static resolveHitTargetAtPoint(
    pointX: number,
    pointY: number,
    targets: TouchTargetRect[]
  ): string | null {
    // Priority order: explicit clickable elements (e.g. links/buttons) first, then structural captions
    const sortedTargets = [...targets].sort((a, b) => (b.isClickable ? 1 : 0) - (a.isClickable ? 1 : 0));

    for (const target of sortedTargets) {
      // Compute effective hit rect with minimum 44px expansion if target is smaller
      const effectiveW = Math.max(target.width, this.MIN_TOUCH_TARGET_SIZE_PX);
      const effectiveH = Math.max(target.height, this.MIN_TOUCH_TARGET_SIZE_PX);
      const shiftX = (effectiveW - target.width) / 2;
      const shiftY = (effectiveH - target.height) / 2;

      const minX = target.x - shiftX;
      const maxX = target.x + target.width + shiftX;
      const minY = target.y - shiftY;
      const maxY = target.y + target.height + shiftY;

      if (pointX >= minX && pointX <= maxX && pointY >= minY && pointY <= maxY) {
        return target.id;
      }
    }

    return null;
  }

  /**
   * Calculates zoom scaling from keyboard shortcuts (+, -, 0) or pinch gestures
   * with strict boundary clamping between 1.0x and 5.0x (Unigram #563).
   */
  public static applyZoomTransform(
    currentScale: number,
    action: 'zoom_in' | 'zoom_out' | 'reset' | 'pinch',
    pinchScaleFactor?: number
  ): number {
    let nextScale = currentScale;

    switch (action) {
      case 'zoom_in':
        nextScale = currentScale * 1.25;
        break;
      case 'zoom_out':
        nextScale = currentScale / 1.25;
        break;
      case 'reset':
        return this.MIN_ZOOM_SCALE;
      case 'pinch':
        if (pinchScaleFactor && pinchScaleFactor > 0) {
          nextScale = currentScale * pinchScaleFactor;
        }
        break;
    }

    return Math.min(this.MAX_ZOOM_SCALE, Math.max(this.MIN_ZOOM_SCALE, Math.round(nextScale * 100) / 100));
  }

  /**
   * Distinguishes click selection from intentional drag-and-drop based on
   * slop distance and packages forward settings (kotatogram #370, Unigram #2746).
   */
  public static evaluateDragSlopAndPayload(
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
    messageIds: number[],
    dropAuthor: boolean = true,
    dropCaption: boolean = false
  ): DragDropForwardPayload {
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const distance = Math.hypot(deltaX, deltaY);

    const isGenuineDrag = distance >= this.DRAG_SLOP_THRESHOLD_PX;

    return {
      messageIds: isGenuineDrag ? messageIds : [],
      isGenuineDrag,
      dropAuthor,
      dropCaption
    };
  }
}
