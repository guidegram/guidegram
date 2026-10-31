/**
 * Guidegram Mobile Touch & Swipe Actions Guard Service
 *
 * Hardened against competitor issues:
 * - tdesktop #31449: Disabling accidental "pull to next unread channel" gesture.
 * - tdesktop #276 & #2662: Swipe/touchpad to reply with automated composer focus.
 * - tdesktop #147: Excluding archived/muted chats from unread tray badge counter.
 * - tdesktop #7: Context menu positioning and boundary clipping guard.
 */

export interface SwipeReplyState {
  isTriggered: boolean;
  offsetX: number;
  targetMessageId?: number | string;
  focusComposer: boolean;
}

export class SwipeToReplyAndFocusManager {
  private replyThresholdPx: number = 60;
  private currentOffsetX: number = 0;
  private activeMessageId: number | string | null = null;

  public onSwipeMove(deltaX: number, messageId: number | string): SwipeReplyState {
    // Only allow left-to-right swipe for reply (or right-to-left for RTL)
    const effectiveDelta = Math.max(0, deltaX);
    this.currentOffsetX = Math.min(100, effectiveDelta);
    this.activeMessageId = messageId;

    const isTriggered = this.currentOffsetX >= this.replyThresholdPx;

    return {
      isTriggered,
      offsetX: this.currentOffsetX,
      targetMessageId: messageId,
      focusComposer: isTriggered, // Auto-focus input when triggered (#276)
    };
  }

  public onSwipeEnd(): { shouldReply: boolean; messageId: number | string | null } {
    const shouldReply = this.currentOffsetX >= this.replyThresholdPx;
    const msgId = this.activeMessageId;

    this.currentOffsetX = 0;
    this.activeMessageId = null;

    return {
      shouldReply,
      messageId: shouldReply ? msgId : null,
    };
  }
}

export class PullToNextChannelGestureGuard {
  private isPullToNextChannelEnabled: boolean = false; // Default disabled to prevent #31449
  private overscrollThresholdPx: number = 120;
  private currentOverscrollY: number = 0;

  constructor(enablePullToNext: boolean = false) {
    this.isPullToNextChannelEnabled = enablePullToNext;
  }

  public setPullToNextChannelEnabled(enabled: boolean): void {
    this.isPullToNextChannelEnabled = enabled;
  }

  public getPullToNextChannelEnabled(): boolean {
    return this.isPullToNextChannelEnabled;
  }

  public onBottomOverscroll(deltaY: number): {
    canTriggerNextChannel: boolean;
    overscrollProgress: number;
  } {
    if (!this.isPullToNextChannelEnabled) {
      return { canTriggerNextChannel: false, overscrollProgress: 0 };
    }

    this.currentOverscrollY = Math.max(0, this.currentOverscrollY + deltaY);
    const progress = Math.min(1.0, this.currentOverscrollY / this.overscrollThresholdPx);
    const canTrigger = this.currentOverscrollY >= this.overscrollThresholdPx;

    return {
      canTriggerNextChannel: canTrigger,
      overscrollProgress: progress,
    };
  }

  public reset(): void {
    this.currentOverscrollY = 0;
  }
}

export interface UnreadCounts {
  activeUnread: number;
  archivedUnread: number;
  totalUnread: number;
  badgeCount: number;
}

export class ArchivedUnreadBadgeCalculator {
  private includeArchivedInBadge: boolean = false; // Option to exclude archived chats (#147)

  constructor(includeArchived: boolean = false) {
    this.includeArchivedInBadge = includeArchived;
  }

  public setIncludeArchived(include: boolean): void {
    this.includeArchivedInBadge = include;
  }

  public calculateBadge(chats: Array<{ isArchived: boolean; isMuted: boolean; unreadCount: number }>): UnreadCounts {
    let activeUnread = 0;
    let archivedUnread = 0;

    for (const chat of chats) {
      if (chat.isArchived || chat.isMuted) {
        archivedUnread += chat.unreadCount;
      } else {
        activeUnread += chat.unreadCount;
      }
    }

    const badgeCount = this.includeArchivedInBadge ? activeUnread + archivedUnread : activeUnread;

    return {
      activeUnread,
      archivedUnread,
      totalUnread: activeUnread + archivedUnread,
      badgeCount,
    };
  }
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  flippedX: boolean;
  flippedY: boolean;
}

export class SafeContextMenuPositioner {
  /**
   * Calculates safe context menu coordinates within viewport (#7)
   */
  public static calculatePosition(
    clickX: number,
    clickY: number,
    menuWidth: number,
    menuHeight: number,
    viewportWidth: number,
    viewportHeight: number
  ): ContextMenuPosition {
    let x = clickX;
    let y = clickY;
    let flippedX = false;
    let flippedY = false;

    // Boundary check right edge
    if (clickX + menuWidth > viewportWidth) {
      x = Math.max(0, clickX - menuWidth);
      flippedX = true;
    }

    // Boundary check bottom edge
    if (clickY + menuHeight > viewportHeight) {
      y = Math.max(0, clickY - menuHeight);
      flippedY = true;
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      flippedX,
      flippedY,
    };
  }
}
