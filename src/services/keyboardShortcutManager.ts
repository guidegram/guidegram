/**
 * Guidegram Master Hardening - Phase 156
 * Desktop Keyboard Shortcut Matrix & Accessible Focus Trapping Protocol
 * 
 * Production-grade desktop keyboard shortcut dispatcher and WAI-ARIA focus trapper.
 * Implements Telegram desktop shortcuts, input isolation, modal focus cycles, and
 * high-visibility accessible focus indicators.
 */

export interface ShortcutDefinition {
  id: string;
  key: string; // e.g. 'k', 'Escape', 'ArrowUp', '1'
  ctrlOrCmd?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  allowInInputs?: boolean;
  action: (e: KeyboardEvent) => void;
}

export class KeyboardShortcutManager {
  private static instance: KeyboardShortcutManager;
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private trappedContainer: HTMLElement | null = null;
  private previousActiveElement: HTMLElement | null = null;

  private constructor() {}

  public static getInstance(): KeyboardShortcutManager {
    if (!KeyboardShortcutManager.instance) {
      KeyboardShortcutManager.instance = new KeyboardShortcutManager();
    }
    return KeyboardShortcutManager.instance;
  }

  /**
   * Registers a keyboard shortcut definition.
   */
  public registerShortcut(shortcut: ShortcutDefinition): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  /**
   * Unregisters a shortcut.
   */
  public unregisterShortcut(id: string): boolean {
    return this.shortcuts.delete(id);
  }

  /**
   * Core keyboard event evaluator.
   */
  public handleKeyDown(e: KeyboardEvent): boolean {
    const isInput = this.isInputElement(e.target as HTMLElement | null);

    for (const s of this.shortcuts.values()) {
      if (isInput && !s.allowInInputs) continue;

      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = !!s.ctrlOrCmd === (e.ctrlKey || e.metaKey);
      const altMatch = !!s.alt === e.altKey;
      const shiftMatch = !!s.shift === e.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        e.preventDefault();
        s.action(e);
        return true;
      }
    }

    // Handle Tab key focus trapping when modal is active
    if (e.key === 'Tab' && this.trappedContainer) {
      this.handleFocusTrapCycle(e);
      return true;
    }

    return false;
  }

  private isInputElement(el: HTMLElement | null): boolean {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }

  /**
   * Traps keyboard focus within an active modal container.
   */
  public trapFocusInElement(container: HTMLElement): void {
    this.previousActiveElement = document.activeElement as HTMLElement | null;
    this.trappedContainer = container;

    // Focus first focusable child
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  /**
   * Releases focus trap and restores focus to previous trigger element.
   */
  public releaseFocusTrap(): void {
    this.trappedContainer = null;
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  private handleFocusTrapCycle(e: KeyboardEvent): void {
    if (!this.trappedContainer) return;
    const focusable = this.getFocusableElements(this.trappedContainer);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      el => !el.hasAttribute('disabled') && el.offsetParent !== null
    );
  }

  /**
   * Returns list of registered shortcut definitions.
   */
  public getRegisteredShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Registers Vim navigation chords for rapid chat scrolling (resolves tdesktop #16300).
   * Maps Alt+k / Alt+j (line scroll), Alt+u / Alt+d (half-page scroll), and Alt+g / Alt+G (top/bottom jump).
   * Marked allowInInputs: true so power users can scroll viewport while keeping composer focus.
   */
  public registerVimNavigation(callbacks: {
    scrollDelta: (pixels: number) => void;
    jumpToTop?: () => void;
    jumpToBottom?: () => void;
  }): void {
    this.registerShortcut({
      id: 'vim_scroll_up',
      key: 'k',
      alt: true,
      allowInInputs: true,
      description: 'Vim navigation: scroll chat up (slow)',
      action: () => callbacks.scrollDelta(-120),
    });
    this.registerShortcut({
      id: 'vim_scroll_down',
      key: 'j',
      alt: true,
      allowInInputs: true,
      description: 'Vim navigation: scroll chat down (slow)',
      action: () => callbacks.scrollDelta(120),
    });
    this.registerShortcut({
      id: 'vim_half_page_up',
      key: 'u',
      alt: true,
      allowInInputs: true,
      description: 'Vim navigation: scroll half-screen up (fast)',
      action: () => callbacks.scrollDelta(-400),
    });
    this.registerShortcut({
      id: 'vim_half_page_down',
      key: 'd',
      alt: true,
      allowInInputs: true,
      description: 'Vim navigation: scroll half-screen down (fast)',
      action: () => callbacks.scrollDelta(400),
    });
    if (callbacks.jumpToTop) {
      this.registerShortcut({
        id: 'vim_jump_top',
        key: 'g',
        alt: true,
        allowInInputs: true,
        description: 'Vim navigation: jump to first message in chat history',
        action: () => callbacks.jumpToTop!(),
      });
    }
    if (callbacks.jumpToBottom) {
      this.registerShortcut({
        id: 'vim_jump_bottom',
        key: 'g',
        alt: true,
        shift: true,
        allowInInputs: true,
        description: 'Vim navigation: jump to latest message in chat history',
        action: () => callbacks.jumpToBottom!(),
      });
    }
  }

  /**
   * Cleans all shortcuts and active traps.
   */
  public clear(): void {
    this.shortcuts.clear();
    this.trappedContainer = null;
    this.previousActiveElement = null;
  }
}
