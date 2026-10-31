/**
 * Guidegram Accessibility & Screen-Reader Hardening Service
 *
 * Hardened against competitor issues:
 * - tdesktop #1060: Comprehensive keyboard navigation & shortcuts.
 * - tdesktop #8179: Account switching keyboard shortcuts (Ctrl+1..9).
 * - tdesktop #1026: Unwanted window focus stealing on notifications.
 * - tdesktop #267 & #693: VoiceOver, NVDA, JAWS screen reader ARIA-live announcements.
 * - tdesktop #268: Full keyboard accessibility & focus trap in modal dialogs.
 */

export type AriaLiveMode = 'polite' | 'assertive';

export interface AnnouncementItem {
  id: string;
  message: string;
  mode: AriaLiveMode;
  timestamp: number;
}

export class ScreenReaderAnnouncementCoordinator {
  private announcements: AnnouncementItem[] = [];
  private lastAnnouncementText: string = '';
  private lastAnnouncementTime: number = 0;
  private debounceThresholdMs: number = 500;

  /**
   * Announces an incoming chat message politely to screen readers (#267, #693)
   */
  public announceIncomingMessage(senderName: string, text: string, isGroup: boolean = false, groupTitle?: string): boolean {
    const context = isGroup && groupTitle ? ` in ${groupTitle}` : '';
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    const formatted = `New message from ${senderName}${context}: ${cleanText || 'media attachment'}`;
    return this.announce(formatted, 'polite');
  }

  /**
   * Announces a system alert or error assertively
   */
  public announceAlert(message: string): boolean {
    return this.announce(message, 'assertive');
  }

  public announce(message: string, mode: AriaLiveMode = 'polite'): boolean {
    const now = Date.now();
    const trimmed = message.trim();
    if (!trimmed) return false;

    // Deduplicate identical rapid announcements to avoid screen reader stutter
    if (trimmed === this.lastAnnouncementText && now - this.lastAnnouncementTime < this.debounceThresholdMs) {
      return false;
    }

    const item: AnnouncementItem = {
      id: `announce_${now}_${Math.random().toString(36).substring(2, 6)}`,
      message: trimmed,
      mode,
      timestamp: now,
    };

    this.announcements.push(item);
    this.lastAnnouncementText = trimmed;
    this.lastAnnouncementTime = now;
    return true;
  }

  public getLatestAnnouncement(): AnnouncementItem | null {
    if (this.announcements.length === 0) return null;
    return this.announcements[this.announcements.length - 1];
  }

  public clear(): void {
    this.announcements = [];
    this.lastAnnouncementText = '';
    this.lastAnnouncementTime = 0;
  }
}

export type ShortcutHandler = (event?: any) => void;

export class KeyboardShortcutsAndAccountSwitcher {
  private shortcuts: Map<string, ShortcutHandler> = new Map();
  private accountSwitchCallback?: (accountIndex: number) => void;
  private maxAccounts: number = 5;

  constructor(maxAccounts: number = 5) {
    this.maxAccounts = maxAccounts;
    this.registerDefaultShortcuts();
  }

  public onAccountSwitch(cb: (accountIndex: number) => void): void {
    this.accountSwitchCallback = cb;
  }

  public registerShortcut(combo: string, handler: ShortcutHandler): void {
    this.shortcuts.set(combo.toLowerCase(), handler);
  }

  private registerDefaultShortcuts(): void {
    // Ctrl+1 through Ctrl+5 for fast account switching (#8179)
    for (let i = 1; i <= this.maxAccounts; i++) {
      this.registerShortcut(`ctrl+${i}`, () => {
        if (this.accountSwitchCallback) {
          this.accountSwitchCallback(i - 1);
        }
      });
    }
  }

  /**
   * Handles keydown event, parsing modifiers and key combinations (#1060)
   */
  public handleKeyDown(keyEvent: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    targetTagName?: string;
  }): boolean {
    const isInputFocused =
      keyEvent.targetTagName === 'INPUT' ||
      keyEvent.targetTagName === 'TEXTAREA' ||
      keyEvent.targetTagName === 'CONTENTEDITABLE';

    const hasModifier = Boolean(keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey);

    // If typing in input without modifiers, do not intercept regular keys
    if (isInputFocused && !hasModifier) {
      return false;
    }

    const parts: string[] = [];
    if (keyEvent.ctrlKey || keyEvent.metaKey) parts.push('ctrl');
    if (keyEvent.altKey) parts.push('alt');
    if (keyEvent.shiftKey) parts.push('shift');
    parts.push(keyEvent.key.toLowerCase());

    const combo = parts.join('+');
    const handler = this.shortcuts.get(combo);

    if (handler) {
      handler(keyEvent);
      return true;
    }

    return false;
  }
}

export class DialogFocusTrapManager {
  private activeDialogId: string | null = null;
  private focusableElements: string[] = [];
  private currentFocusIndex: number = 0;
  private previousActiveElement: string | null = null;

  public openDialog(dialogId: string, focusableElementIds: string[], triggerElementId?: string): void {
    this.activeDialogId = dialogId;
    this.focusableElements = focusableElementIds;
    this.currentFocusIndex = 0;
    this.previousActiveElement = triggerElementId || null;
  }

  public closeDialog(): { restoreFocusToId: string | null } {
    const restoreTo = this.previousActiveElement;
    this.activeDialogId = null;
    this.focusableElements = [];
    this.currentFocusIndex = 0;
    this.previousActiveElement = null;
    return { restoreFocusToId: restoreTo };
  }

  public isDialogOpen(): boolean {
    return this.activeDialogId !== null;
  }

  public handleTab(shiftKey: boolean = false): string | null {
    if (!this.isDialogOpen() || this.focusableElements.length === 0) {
      return null;
    }

    if (shiftKey) {
      // Shift+Tab: move backwards
      this.currentFocusIndex =
        (this.currentFocusIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
    } else {
      // Tab: move forwards
      this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    }

    return this.focusableElements[this.currentFocusIndex];
  }

  public getCurrentFocusedId(): string | null {
    if (!this.isDialogOpen() || this.focusableElements.length === 0) return null;
    return this.focusableElements[this.currentFocusIndex];
  }
}

export class FocusStealingPreventionGuard {
  private isWindowForeground: boolean = true;
  private allowFocusSteal: boolean = false;

  public setForegroundState(isForeground: boolean): void {
    this.isWindowForeground = isForeground;
  }

  public onBackgroundNotificationClick(): { shouldFocusWindow: boolean; showFlashNotice: boolean } {
    // Prevent disruptive focus stealing when user is typing in another app (#1026)
    if (!this.isWindowForeground && !this.allowFocusSteal) {
      return {
        shouldFocusWindow: false,
        showFlashNotice: true, // flash tray / taskbar instead of abruptly stealing active window focus
      };
    }
    return {
      shouldFocusWindow: true,
      showFlashNotice: false,
    };
  }

  public setAllowFocusSteal(allow: boolean): void {
    this.allowFocusSteal = allow;
  }
}
