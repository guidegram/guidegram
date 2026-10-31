/**
 * Guidegram E2E Behavioral Regression Guard Service
 *
 * Hardened against competitor issues:
 * - tdesktop #31495: Copying selected messages clears the selection prematurely.
 * - tdesktop #835: Messages announced multiple times in notification loops.
 * - tdesktop #364: Crash on index assertion failure in text utilities.
 * - tdesktop #2009: Edge swipe gestures breaking vertical chat scrolling.
 */

export interface SelectedMessageState {
  chatId: string | number;
  selectedIds: Set<number | string>;
  isCopying: boolean;
}

export class MessageSelectionPreservationGuard {
  private activeState: SelectedMessageState = {
    chatId: '',
    selectedIds: new Set(),
    isCopying: false,
  };

  public setSelection(chatId: string | number, messageIds: Array<number | string>): void {
    this.activeState = {
      chatId,
      selectedIds: new Set(messageIds),
      isCopying: false,
    };
  }

  public getSelectedIds(): Array<number | string> {
    return Array.from(this.activeState.selectedIds);
  }

  /**
   * On copy to clipboard, preserve selection (#31495)
   */
  public onCopyToClipboard(clipboardWriter: (text: string) => void, formattedText: string): {
    success: boolean;
    selectionPreserved: boolean;
  } {
    if (this.activeState.selectedIds.size === 0) {
      return { success: false, selectionPreserved: false };
    }

    this.activeState.isCopying = true;
    clipboardWriter(formattedText);
    this.activeState.isCopying = false;

    // Selection MUST remain preserved after copy
    return {
      success: true,
      selectionPreserved: this.activeState.selectedIds.size > 0,
    };
  }

  public clearSelection(reason: 'escape' | 'cancel_btn' | 'switch_chat'): void {
    this.activeState.selectedIds.clear();
    this.activeState.isCopying = false;
  }
}

export class NotificationDeduplicationEngine {
  private seenNotifications: Map<string, number> = new Map();
  private ttlMs: number;
  private maxRingBufferSize: number;

  constructor(ttlMs: number = 60000, maxRingBufferSize: number = 200) {
    this.ttlMs = ttlMs;
    this.maxRingBufferSize = maxRingBufferSize;
  }

  private getKey(peerId: string | number, msgId: string | number): string {
    return `${peerId}:${msgId}`;
  }

  /**
   * Checks if notification was already announced recently (#835)
   */
  public shouldAnnounceNotification(peerId: string | number, msgId: string | number): boolean {
    const key = this.getKey(peerId, msgId);
    const now = Date.now();
    const lastSeen = this.seenNotifications.get(key);

    if (lastSeen && now - lastSeen < this.ttlMs) {
      return false; // Deduplicate
    }

    if (this.seenNotifications.size >= this.maxRingBufferSize) {
      // Evict oldest
      const oldestKey = this.seenNotifications.keys().next().value;
      if (oldestKey) this.seenNotifications.delete(oldestKey);
    }

    this.seenNotifications.set(key, now);
    return true;
  }

  public clear(): void {
    this.seenNotifications.clear();
  }
}

export class TextUtilitiesAssertionGuard {
  /**
   * Safe substring extractor preventing crash assertion in tdesktop #364
   */
  public static safeSlice(text: string | null | undefined, start: number, end?: number): string {
    if (typeof text !== 'string') return '';
    const len = text.length;
    if (len === 0) return '';

    const safeStart = Math.max(0, Math.min(start, len));
    const safeEnd = end === undefined ? len : Math.max(safeStart, Math.min(end, len));

    return text.substring(safeStart, safeEnd);
  }

  /**
   * Safe character at index lookup with default fallback
   */
  public static safeCharAt(text: string | null | undefined, index: number, fallback: string = ''): string {
    if (typeof text !== 'string') return fallback;
    if (index < 0 || index >= text.length) return fallback;
    return text.charAt(index);
  }
}

export class EdgeSwipeGestureDisambiguator {
  private edgeThresholdPx: number = 24; // 24px edge zone

  public isEdgeSwipe(startX: number, screenWidth: number): boolean {
    return startX <= this.edgeThresholdPx || startX >= screenWidth - this.edgeThresholdPx;
  }

  public shouldAllowChatScroll(startX: number, deltaX: number, deltaY: number, screenWidth: number): boolean {
    const isEdge = this.isEdgeSwipe(startX, screenWidth);
    const isMainlyVertical = Math.abs(deltaY) > Math.abs(deltaX);

    // If gesture starts from inner area or is predominantly vertical, allow scroll (#2009)
    if (!isEdge || isMainlyVertical) {
      return true;
    }

    return false; // Intercept edge gesture for drawer/camera
  }
}
