/**
 * Guidegram Screen-Reader Attachments, Font Weight & Media Shortcuts Governor
 * 
 * Hardened against:
 * - Ajaxy/telegram-tt #89 & #128: Screen-reader friendliness for attachment menus & file pickers
 * - morethanwords/tweb #110 & tdesktop #31497: font-weight 500/600 broken on Chinese/Persian fonts
 * - morethanwords/tweb #210: Smart autofocus on chat transition without breaking modal focus
 * - morethanwords/tweb #111: Media viewer zoom shortcuts (+, -, 0) broken with Alt/Meta
 * - TDesktop-x64 #71 & morethanwords/tweb #747: Conflict-free global search shortcuts
 */

export interface AttachmentOption {
  type: 'photo' | 'video' | 'file' | 'audio' | 'poll';
  label: string;
  ariaDescription: string;
  keyboardShortcut?: string;
}

export interface ZoomShortcutResult {
  isZoomAction: boolean;
  action: 'zoom_in' | 'zoom_out' | 'reset_zoom' | 'none';
  newZoomLevel: number;
}

export class ScreenReaderAttachmentsAndTypographyGovernor {
  /**
   * Generates accessible attachment menu items with rich ARIA labels for screen readers (Ajaxy/telegram-tt #89, #128).
   */
  public static getAccessibleAttachmentOptions(): AttachmentOption[] {
    return [
      {
        type: 'photo',
        label: 'Photo or Video',
        ariaDescription: 'Send photos or videos with compression and gallery grouping',
        keyboardShortcut: 'Alt+P'
      },
      {
        type: 'file',
        label: 'Document',
        ariaDescription: 'Send any file as an uncompressed raw document',
        keyboardShortcut: 'Alt+D'
      },
      {
        type: 'audio',
        label: 'Audio File',
        ariaDescription: 'Send music or audio track with embedded ID3 metadata',
        keyboardShortcut: 'Alt+A'
      },
      {
        type: 'poll',
        label: 'Poll',
        ariaDescription: 'Create an interactive multiple-choice voting poll',
        keyboardShortcut: 'Alt+V'
      }
    ];
  }

  /**
   * Resolves safe CSS font-weight value, preventing distorted faux-bold on CJK / Arabic / Persian
   * fonts that do not ship medium (500) or semibold (600) weights (morethanwords/tweb #110, tdesktop #31497).
   */
  public static resolveSafeFontWeight(
    requestedWeight: number,
    fontFamily: string,
    isCjkOrArabic: boolean
  ): number {
    // If font is CJK or custom Persian without explicit medium weight, snap 500 to 400 or 700
    if (isCjkOrArabic) {
      if (requestedWeight === 500) {
        return 400; // Normal weight is significantly cleaner than synthetic bolding
      }
      if (requestedWeight === 600) {
        return 700; // Snap to true Bold font file
      }
    }

    return requestedWeight;
  }

  /**
   * Evaluates whether the chat message input should receive autofocus,
   * guaranteeing focus is NOT stolen if a modal, dialog, or search drawer is active (morethanwords/tweb #210).
   */
  public static evaluateChatAutofocus(
    hasActiveModal: boolean,
    hasActiveContextMenu: boolean,
    isTouchDevice: boolean
  ): { shouldAutofocus: boolean; reason: string } {
    if (hasActiveModal) {
      return { shouldAutofocus: false, reason: 'Modal dialog is active' };
    }

    if (hasActiveContextMenu) {
      return { shouldAutofocus: false, reason: 'Context menu is open' };
    }

    // On touch mobile devices, autofocus triggers virtual keyboard popup which obscures the screen
    if (isTouchDevice) {
      return { shouldAutofocus: false, reason: 'Touch device: prevent unwanted software keyboard popup' };
    }

    return { shouldAutofocus: true, reason: 'Safe desktop chat autofocus' };
  }

  /**
   * Handles media viewer zoom shortcuts (+, -, 0) reliably across OS platforms (morethanwords/tweb #111).
   */
  public static handleMediaZoom(
    key: string,
    ctrlOrMeta: boolean,
    currentZoom: number = 1.0,
    zoomStep: number = 0.25
  ): ZoomShortcutResult {
    if (!ctrlOrMeta) {
      return { isZoomAction: false, action: 'none', newZoomLevel: currentZoom };
    }

    if (key === '+' || key === '=' || key === 'Add') {
      const newZoom = Math.min(4.0, Math.round((currentZoom + zoomStep) * 100) / 100);
      return { isZoomAction: true, action: 'zoom_in', newZoomLevel: newZoom };
    }

    if (key === '-' || key === '_' || key === 'Subtract') {
      const newZoom = Math.max(0.25, Math.round((currentZoom - zoomStep) * 100) / 100);
      return { isZoomAction: true, action: 'zoom_out', newZoomLevel: newZoom };
    }

    if (key === '0' || key === 'Numpad0') {
      return { isZoomAction: true, action: 'reset_zoom', newZoomLevel: 1.0 };
    }

    return { isZoomAction: false, action: 'none', newZoomLevel: currentZoom };
  }

  /**
   * Resolves global search shortcut without conflicting with browser tab commands (TDesktop-x64 #71, morethanwords/tweb #747).
   */
  public static isSearchShortcut(
    event: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }
  ): boolean {
    const ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);

    // Ctrl+K (universal modern standard search shortcut)
    if (ctrlOrMeta && !event.shiftKey && event.key.toLowerCase() === 'k') {
      return true;
    }

    // F3 function key
    if (event.key === 'F3') {
      return true;
    }

    // Ctrl+F in chat search
    if (ctrlOrMeta && !event.shiftKey && event.key.toLowerCase() === 'f') {
      return true;
    }

    return false;
  }
}
