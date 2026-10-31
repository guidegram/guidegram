/**
 * Guidegram Scroll Momentum, Overscroll Physics & Gesture Governor
 * 
 * Hardened against competitor issues:
 * - tdesktop #25986: Mouse scroll crashes app due to NaN / unconstrained trackpad wheel deltas
 * - kotatogram #254: Erratic touchpad acceleration and slow scroll speed
 * - tdesktop #3399: Emoji & sticker drawer backdrop tap and swipe-down gesture dismissal
 * - Telegram-iOS #2313: Tapping commands / action buttons dropping transition into new chat
 * - kotatogram #266: Chat drag-to-folder drop target hit detection and hover dwell switching
 */

export interface NormalizedWheelDelta {
  pixelDeltaX: number;
  pixelDeltaY: number;
  isClamped: boolean;
}

export interface DrawerSwipeResult {
  shouldDismiss: boolean;
  displacementY: number;
  opacityMultiplier: number;
}

export interface FolderDropTarget {
  folderId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ScrollMomentumAndGestureGovernor {
  private static readonly MAX_WHEEL_DELTA_PX = 400; // Max pixels per single wheel event
  private static readonly LINE_HEIGHT_PX = 20; // 1 wheel line = 20px
  private static readonly PAGE_HEIGHT_PX = 600; // 1 wheel page = 600px
  private static readonly SWIPE_DISMISS_THRESHOLD_PX = 100;

  /**
   * Normalizes raw mouse wheel and trackpad events across Windows, macOS and Linux,
   * converting line/page modes to pixels and clamping extreme spikes (tdesktop #25986, kotatogram #254).
   */
  public static normalizeWheelDelta(
    deltaX: number,
    deltaY: number,
    deltaMode: number // 0 = Pixel, 1 = Line, 2 = Page
  ): NormalizedWheelDelta {
    // Guard against NaN or Infinity
    const rawX = Number.isFinite(deltaX) ? deltaX : 0;
    const rawY = Number.isFinite(deltaY) ? deltaY : 0;

    let multiplier = 1;
    if (deltaMode === 1) {
      multiplier = this.LINE_HEIGHT_PX;
    } else if (deltaMode === 2) {
      multiplier = this.PAGE_HEIGHT_PX;
    }

    const calculatedX = rawX * multiplier;
    const calculatedY = rawY * multiplier;

    const clampedX = Math.max(-this.MAX_WHEEL_DELTA_PX, Math.min(this.MAX_WHEEL_DELTA_PX, calculatedX));
    const clampedY = Math.max(-this.MAX_WHEEL_DELTA_PX, Math.min(this.MAX_WHEEL_DELTA_PX, calculatedY));

    return {
      pixelDeltaX: clampedX,
      pixelDeltaY: clampedY,
      isClamped: clampedX !== calculatedX || clampedY !== calculatedY
    };
  }

  /**
   * Calculates rubber-band overscroll resistance for kinetic scrolling.
   */
  public static calculateRubberBandOffset(overscrollDistancePx: number, maxResistance: number = 120): number {
    if (overscrollDistancePx === 0) return 0;
    const sign = Math.sign(overscrollDistancePx);
    const abs = Math.abs(overscrollDistancePx);
    // Asymptotic logarithmic falloff
    const damped = maxResistance * (1 - Math.exp(-abs / maxResistance));
    return Math.round(sign * damped);
  }

  /**
   * Evaluates swipe-to-dismiss gesture on mobile and desktop media/emoji drawers (tdesktop #3399).
   */
  public static evaluateDrawerSwipeGesture(
    startY: number,
    currentY: number,
    velocity: number = 0
  ): DrawerSwipeResult {
    const deltaY = currentY - startY;

    // Only downward swipes can dismiss top/bottom drawers
    if (deltaY <= 0) {
      return {
        shouldDismiss: false,
        displacementY: 0,
        opacityMultiplier: 1.0
      };
    }

    const shouldDismiss = deltaY >= this.SWIPE_DISMISS_THRESHOLD_PX || (deltaY > 40 && velocity > 0.8);
    const opacityMultiplier = Math.max(0, 1 - (deltaY / (this.SWIPE_DISMISS_THRESHOLD_PX * 2)));

    return {
      shouldDismiss,
      displacementY: deltaY,
      opacityMultiplier: Math.round(opacityMultiplier * 100) / 100
    };
  }

  /**
   * Evaluates pointer collision with folder tabs during drag-and-drop (kotatogram #266).
   */
  public static resolveFolderDropTarget(
    pointerX: number,
    pointerY: number,
    folders: FolderDropTarget[]
  ): string | null {
    for (const folder of folders) {
      if (
        pointerX >= folder.x &&
        pointerX <= folder.x + folder.width &&
        pointerY >= folder.y &&
        pointerY <= folder.y + folder.height
      ) {
        return folder.folderId;
      }
    }
    return null;
  }

  /**
   * Verifies seamless transition payload from a bot action or command bubble into chat view (Telegram-iOS #2313).
   */
  public static buildBotActionChatTransition(
    botUsername: string,
    command: string,
    activeChatId?: string
  ): { targetChat: string; initialComposerText: string; shouldSwitchChat: boolean } {
    const cleanBot = botUsername.replace(/^@/, '');
    const cleanCmd = command.startsWith('/') ? command : `/${command}`;
    const targetChat = `@${cleanBot}`;

    return {
      targetChat,
      initialComposerText: cleanCmd,
      shouldSwitchChat: activeChatId !== targetChat
    };
  }
}
