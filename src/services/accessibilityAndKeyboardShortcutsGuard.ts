/**
 * Guidegram Accessibility, Screen-Reader & Layout-Independent Keyboard Guard
 * 
 * Hardened against:
 * - tdesktop #4977: Ctrl+Shift hotkeys not working with non-English/Persian/Cyrillic keymaps
 * - tdesktop #2541: Lost chat focus after closing window/modal/media viewer
 * - tdesktop #31440: Media Viewer losing Esc and arrow key controls after window state changes
 * - tdesktop #476: Screen-reader friendliness (ARIA-live, descriptive media labels)
 * - tdesktop #218: Virtual keyboard input occlusion & viewport alignment
 */

export interface NormalizedShortcut {
  ctrlOrMeta: boolean;
  alt: boolean;
  shift: boolean;
  canonicalKey: string; // e.g. 'k', 'f', 'enter', 'escape'
  signature: string; // e.g. 'ctrl+k', 'ctrl+shift+m'
}

export interface FocusTrapState {
  trapId: string;
  triggerElementId: string | null;
  containerElementId: string;
  active: boolean;
}

export interface AccessibleMessageContext {
  senderName: string;
  timestampStr: string;
  text?: string;
  mediaType?: 'photo' | 'video' | 'voice' | 'file';
  durationSeconds?: number;
  isOut: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'read';
  unreadCount?: number;
}

export class AccessibilityAndKeyboardShortcutsGuard {
  private static focusHistoryStack: Array<{ trapId: string; triggerElementId: string | null }> = [];

  /**
   * Normalizes keyboard events using physical hardware `code` rather than localized `key`.
   * This guarantees hotkeys (Ctrl+K, Ctrl+F, Ctrl+Shift+M, etc.) work identically on Persian, Arabic,
   * Russian, French AZERTY, German QWERTZ, or English keyboards (tdesktop #4977).
   */
  public static normalizeShortcut(event: {
    code?: string;
    key?: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    platform?: string;
  }): NormalizedShortcut {
    const isMac = (event.platform || '').toLowerCase().includes('mac');
    const ctrlOrMeta = isMac ? Boolean(event.metaKey || event.ctrlKey) : Boolean(event.ctrlKey);
    const alt = Boolean(event.altKey);
    const shift = Boolean(event.shiftKey);

    // Derive canonical key name using physical code first
    let canonicalKey = '';
    const code = event.code || '';

    if (code.startsWith('Key')) {
      canonicalKey = code.slice(3).toLowerCase();
    } else if (code.startsWith('Digit')) {
      canonicalKey = code.slice(5);
    } else if (code === 'Escape') {
      canonicalKey = 'escape';
    } else if (code === 'Enter' || code === 'NumpadEnter') {
      canonicalKey = 'enter';
    } else if (code === 'Space') {
      canonicalKey = 'space';
    } else if (code.startsWith('Arrow')) {
      canonicalKey = code.toLowerCase();
    } else if (event.key) {
      // Fallback to key if code is missing
      canonicalKey = event.key.toLowerCase();
    }

    const parts: string[] = [];
    if (ctrlOrMeta) parts.push(isMac ? 'meta' : 'ctrl');
    if (alt) parts.push('alt');
    if (shift) parts.push('shift');
    if (canonicalKey) parts.push(canonicalKey);

    return {
      ctrlOrMeta,
      alt,
      shift,
      canonicalKey,
      signature: parts.join('+')
    };
  }

  /**
   * Registers a new focus trap layer when a modal, popup or media viewer opens,
   * preserving the origin element for focus restoration upon exit (tdesktop #2541).
   */
  public static pushFocusTrap(trapId: string, triggerElementId: string | null): FocusTrapState {
    this.focusHistoryStack.push({ trapId, triggerElementId });
    return {
      trapId,
      triggerElementId,
      containerElementId: `modal-container-${trapId}`,
      active: true
    };
  }

  /**
   * Pops the topmost focus trap and calculates the exact element ID that should regain focus,
   * falling back to default fallback element (e.g. main chat input) if trigger was destroyed.
   */
  public static popFocusTrap(
    trapId: string,
    defaultFallbackElementId: string = 'main-chat-input'
  ): { targetElementIdToFocus: string; wasTriggerPreserved: boolean } {
    let preservedTriggerId: string | null = null;

    // Pop from stack
    const index = this.focusHistoryStack.findIndex(item => item.trapId === trapId);
    if (index !== -1) {
      const item = this.focusHistoryStack.splice(index, 1)[0];
      preservedTriggerId = item.triggerElementId;
    } else if (this.focusHistoryStack.length > 0) {
      const item = this.focusHistoryStack.pop();
      preservedTriggerId = item ? item.triggerElementId : null;
    }

    if (preservedTriggerId) {
      return {
        targetElementIdToFocus: preservedTriggerId,
        wasTriggerPreserved: true
      };
    }

    return {
      targetElementIdToFocus: defaultFallbackElementId,
      wasTriggerPreserved: false
    };
  }

  /**
   * Delegates Media Viewer keyboard actions deterministically regardless of window resize,
   * minimize, maximize or restore state (tdesktop #31440).
   */
  public static handleMediaViewerNavigationKey(
    key: string,
    state: { isPlaying?: boolean; isFullscreen?: boolean; isMuted?: boolean }
  ): {
    action: 'next' | 'prev' | 'close' | 'togglePlay' | 'toggleFullscreen' | 'toggleMute' | 'none';
  } {
    const k = key.toLowerCase();
    switch (k) {
      case 'arrowright':
      case 'keyd':
        return { action: 'next' };
      case 'arrowleft':
      case 'keya':
        return { action: 'prev' };
      case 'escape':
        return { action: 'close' };
      case ' ':
      case 'space':
      case 'keyk':
        return { action: 'togglePlay' };
      case 'keyf':
        return { action: 'toggleFullscreen' };
      case 'keym':
        return { action: 'toggleMute' };
      default:
        return { action: 'none' };
    }
  }

  /**
   * Generates highly descriptive ARIA labels for screen readers (NVDA, JAWS, VoiceOver)
   * covering voice messages, media items, delivery state and timestamps (tdesktop #476).
   */
  public static formatMessageAriaLabel(context: AccessibleMessageContext): string {
    const sender = context.isOut ? 'You' : context.senderName;
    const parts: string[] = [`Message from ${sender}`];

    if (context.mediaType) {
      if (context.mediaType === 'voice') {
        const mins = Math.floor((context.durationSeconds || 0) / 60);
        const secs = (context.durationSeconds || 0) % 60;
        parts.push(`Voice message, duration ${mins} minutes ${secs} seconds`);
      } else {
        parts.push(`${context.mediaType} attachment`);
      }
    }

    if (context.text) {
      parts.push(`content: "${context.text}"`);
    }

    parts.push(`at ${context.timestampStr}`);

    if (context.isOut && context.deliveryStatus) {
      parts.push(`status: ${context.deliveryStatus}`);
    }

    return parts.join(', ');
  }

  /**
   * Calculates required scroll adjustment when virtual touch keyboard appears,
   * ensuring input is never covered by the on-screen keyboard (tdesktop #218).
   */
  public static calculateVirtualKeyboardScrollOffset(
    inputRectBottom: number,
    visualViewportHeight: number,
    keyboardHeightEstimate: number = 280,
    safeMargin: number = 16
  ): number {
    const visibleBottom = visualViewportHeight - keyboardHeightEstimate;
    if (inputRectBottom + safeMargin > visibleBottom) {
      return (inputRectBottom + safeMargin) - visibleBottom;
    }
    return 0; // Already in visible view
  }
}
