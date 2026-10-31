/**
 * Guidegram Screen-Reader ARIA & Keyboard Navigation Governor
 * 
 * Hardened against competitor issues:
 * - telegram-tt #545: File download controls not keyboard accessible
 * - telegram-tt #401: Impossible to scroll chat history via keyboard (PageUp, PageDown, Home, End)
 * - telegram-tt #383: Forward modal failing to auto-focus search input
 * - telegram-tt #106: Tab components missing standard ARIA tablist patterns and arrow navigation
 * - tweb #145: Screen-reader ARIA live region message announcements
 */

export interface KeyboardScrollAction {
  action: 'scroll_page_up' | 'scroll_page_down' | 'scroll_top' | 'scroll_bottom' | 'none';
  scrollOffsetPx: number;
  shouldPreventDefault: boolean;
}

export interface AccessibleFileControlProps {
  role: 'button';
  tabIndex: 0;
  ariaLabel: string;
  ariaBusy: boolean;
  onKeyDownAction: 'trigger_download' | 'none';
}

export interface TablistNavigationResult {
  nextActiveIndex: number;
  shouldPreventDefault: boolean;
}

export interface AriaLiveAnnouncement {
  text: string;
  politeness: 'polite' | 'assertive';
  timestamp: number;
}

export class ScreenReaderAriaAndKeyboardNavGovernor {
  private static readonly PAGE_SCROLL_AMOUNT_PX = 450;

  /**
   * Evaluates keyboard shortcut for scrolling the message viewport (telegram-tt #401).
   */
  public static evaluateChatKeyboardScroll(
    key: string,
    altKey: boolean,
    isInputFocused: boolean
  ): KeyboardScrollAction {
    // If user is typing in composer, require Alt modifier for PageUp/PageDown,
    // or allow PageUp/PageDown if Alt is pressed
    if (key === 'PageUp' && (!isInputFocused || altKey)) {
      return {
        action: 'scroll_page_up',
        scrollOffsetPx: -this.PAGE_SCROLL_AMOUNT_PX,
        shouldPreventDefault: true
      };
    }

    if (key === 'PageDown' && (!isInputFocused || altKey)) {
      return {
        action: 'scroll_page_down',
        scrollOffsetPx: this.PAGE_SCROLL_AMOUNT_PX,
        shouldPreventDefault: true
      };
    }

    if (key === 'Home' && altKey) {
      return {
        action: 'scroll_top',
        scrollOffsetPx: -Infinity,
        shouldPreventDefault: true
      };
    }

    if (key === 'End' && altKey) {
      return {
        action: 'scroll_bottom',
        scrollOffsetPx: Infinity,
        shouldPreventDefault: true
      };
    }

    return {
      action: 'none',
      scrollOffsetPx: 0,
      shouldPreventDefault: false
    };
  }

  /**
   * Generates accessible ARIA attributes and keyboard triggers for file downloads (telegram-tt #545).
   */
  public static buildAccessibleFileControl(
    fileName: string,
    fileSizeFormatted: string,
    isDownloading: boolean,
    keyEvent?: string
  ): AccessibleFileControlProps {
    const isTriggerKey = keyEvent === 'Enter' || keyEvent === ' ';

    return {
      role: 'button',
      tabIndex: 0,
      ariaLabel: isDownloading
        ? `Downloading ${fileName}, please wait`
        : `Download ${fileName}, size ${fileSizeFormatted}`,
      ariaBusy: isDownloading,
      onKeyDownAction: isTriggerKey ? 'trigger_download' : 'none'
    };
  }

  /**
   * Handles keyboard focus trap and cycle inside dialogs/modals (telegram-tt #383).
   */
  public static evaluateModalFocusTrap(
    key: string,
    shiftKey: boolean,
    focusableElementCount: number,
    currentIndex: number
  ): { nextIndex: number; shouldPreventDefault: boolean; shouldClose: boolean } {
    if (key === 'Escape') {
      return { nextIndex: currentIndex, shouldPreventDefault: true, shouldClose: true };
    }

    if (key === 'Tab' && focusableElementCount > 0) {
      if (shiftKey) {
        // Reverse focus
        const next = currentIndex <= 0 ? focusableElementCount - 1 : currentIndex - 1;
        return { nextIndex: next, shouldPreventDefault: true, shouldClose: false };
      } else {
        // Forward focus
        const next = currentIndex >= focusableElementCount - 1 ? 0 : currentIndex + 1;
        return { nextIndex: next, shouldPreventDefault: true, shouldClose: false };
      }
    }

    return { nextIndex: currentIndex, shouldPreventDefault: false, shouldClose: false };
  }

  /**
   * Implements WAI-ARIA tablist arrow navigation (telegram-tt #106).
   */
  public static navigateTablist(
    key: string,
    currentActiveIndex: number,
    tabCount: number
  ): TablistNavigationResult {
    if (tabCount <= 0) {
      return { nextActiveIndex: 0, shouldPreventDefault: false };
    }

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      const next = (currentActiveIndex + 1) % tabCount;
      return { nextActiveIndex: next, shouldPreventDefault: true };
    }

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      const prev = (currentActiveIndex - 1 + tabCount) % tabCount;
      return { nextActiveIndex: prev, shouldPreventDefault: true };
    }

    if (key === 'Home') {
      return { nextActiveIndex: 0, shouldPreventDefault: true };
    }

    if (key === 'End') {
      return { nextActiveIndex: tabCount - 1, shouldPreventDefault: true };
    }

    return { nextActiveIndex: currentActiveIndex, shouldPreventDefault: false };
  }

  /**
   * Formats clean ARIA live region announcement text for screen readers (tweb #145).
   */
  public static formatIncomingMessageAnnouncement(
    senderName: string,
    messageText: string,
    chatTitle?: string
  ): AriaLiveAnnouncement {
    const context = chatTitle ? `in ${chatTitle}` : '';
    const cleanMsg = messageText.slice(0, 150);
    const text = `New message from ${senderName} ${context}: ${cleanMsg}`;

    return {
      text: text.trim(),
      politeness: 'polite',
      timestamp: Date.now()
    };
  }
}
