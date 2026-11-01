/**
 * Web Client Deep Linking, Emoji Picker, Topic Focus, Editor Mode, Pin Matrix, Time Preference & Username Management Governor
 *
 * Hardens Guidegram web & desktop clients against:
 * 1. Ajaxy/telegram-tt#88 - Accessing messages within conversations (deep links & scroll anchor targeting)
 * 2. Ajaxy/telegram-tt#80 - Emoji menu bug (popover viewport boundary clamping & outside click dismissing)
 * 3. Ajaxy/telegram-tt#531 - Darken/dim other chat icons when in a group with topics (topic focus mode)
 * 4. Ajaxy/telegram-tt#526 - Rich text editor opt-out request (plain raw markdown vs WYSIWYG toggle)
 * 5. Ajaxy/telegram-tt#524 - Pin message option missing (permission matrix & silent pin configuration)
 * 6. Ajaxy/telegram-tt#506 - 12-hour and 24-hour time preference is not inferred from OS (Intl detection & formatter)
 * 7. Ajaxy/telegram-tt#503 - Username is not cleared or deleted (empty string clearance & format validation)
 */

export interface DeepLinkInfo {
  valid: boolean;
  chatId: string | number | null;
  messageId: number | null;
  isPrivateChat: boolean;
  rawUrl: string;
}

export interface ScrollTargetResult {
  inMemory: boolean;
  scrollOffset: number;
  shouldHighlight: boolean;
  needsHistoricalFetch: boolean;
  targetMessageId: number;
}

export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

export interface PopoverPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  isClamped: boolean;
}

export interface ChatVisualState {
  chatId: string | number;
  opacity: number;
  filter: string;
  isFocused: boolean;
}

export type EditorMode = 'wysiwyg' | 'raw_markdown';

export interface PinEvaluationResult {
  canPin: boolean;
  reason: string;
  silentNotificationSupported: boolean;
}

export interface UsernameValidationResult {
  isValid: boolean;
  action: 'clear' | 'set' | 'invalid';
  sanitizedUsername: string | null;
  error?: string;
}

export class WebMessageDeepLinkEmojiEditorAndPinGovernor {
  // =========================================================================
  // 1. Message Deep Linking & Scroll Anchor (Ajaxy/telegram-tt#88)
  // =========================================================================

  public parseMessageDeepLink(url: string): DeepLinkInfo {
    const cleanUrl = url.trim();

    // 1. Web link: https://t.me/c/123456789/42 (Private/supergroup)
    const privateGroupMatch = cleanUrl.match(/t\.me\/c\/(\d+)\/(\d+)/i);
    if (privateGroupMatch) {
      return {
        valid: true,
        chatId: `-100${privateGroupMatch[1]}`,
        messageId: parseInt(privateGroupMatch[2], 10),
        isPrivateChat: true,
        rawUrl: cleanUrl,
      };
    }

    // 2. Web public link: https://t.me/public_channel/42
    const publicChannelMatch = cleanUrl.match(/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/i);
    if (publicChannelMatch) {
      return {
        valid: true,
        chatId: publicChannelMatch[1],
        messageId: parseInt(publicChannelMatch[2], 10),
        isPrivateChat: false,
        rawUrl: cleanUrl,
      };
    }

    // 3. Custom scheme: tg://resolve?domain=test&post=42
    const tgResolveMatch = cleanUrl.match(/tg:\/\/resolve\?domain=([a-zA-Z0-9_]+)&post=(\d+)/i);
    if (tgResolveMatch) {
      return {
        valid: true,
        chatId: tgResolveMatch[1],
        messageId: parseInt(tgResolveMatch[2], 10),
        isPrivateChat: false,
        rawUrl: cleanUrl,
      };
    }

    return {
      valid: false,
      chatId: null,
      messageId: null,
      isPrivateChat: false,
      rawUrl: cleanUrl,
    };
  }

  public calculateScrollTarget(
    targetMessageId: number,
    renderedMessageIds: number[],
    itemHeight: number = 60
  ): ScrollTargetResult {
    const index = renderedMessageIds.indexOf(targetMessageId);
    if (index !== -1) {
      return {
        inMemory: true,
        scrollOffset: index * itemHeight,
        shouldHighlight: true,
        needsHistoricalFetch: false,
        targetMessageId,
      };
    }

    return {
      inMemory: false,
      scrollOffset: 0,
      shouldHighlight: true,
      needsHistoricalFetch: true,
      targetMessageId,
    };
  }

  // =========================================================================
  // 2. Emoji Menu Popover Boundary Clamping (Ajaxy/telegram-tt#80)
  // =========================================================================

  public calculateEmojiPopoverPosition(
    buttonRect: Rect,
    popoverDimensions: { width: number; height: number },
    viewport: { width: number; height: number },
    padding: number = 8
  ): PopoverPosition {
    let placement: 'top' | 'bottom' = 'top';
    let isClamped = false;

    // Check if enough room above button
    let y = buttonRect.top - popoverDimensions.height - padding;
    if (y < padding) {
      // Flip to bottom
      y = buttonRect.bottom + padding;
      placement = 'bottom';
      if (y + popoverDimensions.height > viewport.height - padding) {
        // Clamp inside viewport
        y = Math.max(padding, viewport.height - popoverDimensions.height - padding);
        isClamped = true;
      }
    }

    // Horizontal alignment centered to button, then clamped
    let x = buttonRect.left + buttonRect.width / 2 - popoverDimensions.width / 2;
    if (x < padding) {
      x = padding;
      isClamped = true;
    } else if (x + popoverDimensions.width > viewport.width - padding) {
      x = viewport.width - popoverDimensions.width - padding;
      isClamped = true;
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      placement,
      isClamped,
    };
  }

  public shouldDismissEmojiMenu(
    clickCoords: { x: number; y: number },
    popoverRect: Rect,
    buttonRect: Rect
  ): boolean {
    const isInside = (coords: { x: number; y: number }, rect: Rect) =>
      coords.x >= rect.left &&
      coords.x <= rect.right &&
      coords.y >= rect.top &&
      coords.y <= rect.bottom;

    // If click is outside both popover and toggle button, dismiss
    return !isInside(clickCoords, popoverRect) && !isInside(clickCoords, buttonRect);
  }

  // =========================================================================
  // 3. Topic Focus Mode & Chat Dimming (Ajaxy/telegram-tt#531)
  // =========================================================================

  public getChatListVisualState(
    allChatIds: (string | number)[],
    activeChatId: string | number | null,
    activeTopicId: number | null,
    isForum: boolean
  ): ChatVisualState[] {
    const inTopicMode = isForum && activeTopicId !== null;

    return allChatIds.map((chatId) => {
      const isFocused = chatId === activeChatId;

      if (!inTopicMode) {
        return {
          chatId,
          opacity: 1.0,
          filter: 'none',
          isFocused,
        };
      }

      // In topic mode: dim other chats to emphasize topic discussion
      if (isFocused) {
        return {
          chatId,
          opacity: 1.0,
          filter: 'none',
          isFocused: true,
        };
      }

      return {
        chatId,
        opacity: 0.42,
        filter: 'grayscale(25%)',
        isFocused: false,
      };
    });
  }

  // =========================================================================
  // 4. Raw Markdown vs WYSIWYG Editor Mode (Ajaxy/telegram-tt#526)
  // =========================================================================

  public resolvePastedContent(
    pastedHtml: string,
    pastedPlainText: string,
    mode: EditorMode
  ): string {
    if (mode === 'raw_markdown') {
      // In raw markdown mode, ignore rich HTML markup and insert exact plaintext
      return pastedPlainText;
    }

    // In WYSIWYG mode, convert standard HTML bold/italic/code tags into structured content
    let cleaned = pastedHtml
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<i>(.*?)<\/i>/gi, '_$1_')
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`');

    // Strip remaining HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    return cleaned.trim() || pastedPlainText;
  }

  // =========================================================================
  // 5. Pin Message Permission Matrix (Ajaxy/telegram-tt#524)
  // =========================================================================

  public evaluatePinPermission(
    userRole: 'owner' | 'admin' | 'member',
    chatType: 'channel' | 'supergroup' | 'group' | 'direct',
    adminPermissions?: { canPinMessages?: boolean }
  ): PinEvaluationResult {
    if (chatType === 'direct') {
      return { canPin: true, reason: 'Allowed in direct messages', silentNotificationSupported: true };
    }

    if (userRole === 'owner') {
      return { canPin: true, reason: 'Owner has full pin privileges', silentNotificationSupported: true };
    }

    if (userRole === 'admin') {
      const allowed = adminPermissions?.canPinMessages !== false;
      return {
        canPin: allowed,
        reason: allowed ? 'Admin has pin messages permission' : 'Admin lacks pin messages privilege',
        silentNotificationSupported: true,
      };
    }

    // Member
    if (chatType === 'group') {
      return { canPin: true, reason: 'Basic groups allow member pinning by default', silentNotificationSupported: false };
    }

    return {
      canPin: false,
      reason: 'Regular members cannot pin messages in channels or supergroups',
      silentNotificationSupported: false,
    };
  }

  // =========================================================================
  // 6. 12-Hour vs 24-Hour Time Preference (Ajaxy/telegram-tt#506)
  // =========================================================================

  public resolveTimeFormat(
    userPreference: '12h' | '24h' | 'auto',
    sampleDate: Date = new Date(2026, 0, 1, 15, 30) // 3:30 PM
  ): '12h' | '24h' {
    if (userPreference !== 'auto') {
      return userPreference;
    }

    try {
      const formatted = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(sampleDate);
      return formatted.includes('PM') || formatted.includes('AM') || formatted.includes('م') || formatted.includes('ق')
        ? '12h'
        : '24h';
    } catch {
      return '24h';
    }
  }

  public formatTime(date: Date, format: '12h' | '24h'): string {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (format === '24h') {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }

  // =========================================================================
  // 7. Username Clearance & Format Validation (Ajaxy/telegram-tt#503)
  // =========================================================================

  public validateAndCleanUsername(rawUsername: string | null | undefined): UsernameValidationResult {
    if (rawUsername === null || rawUsername === undefined || rawUsername.trim() === '') {
      return {
        isValid: true,
        action: 'clear',
        sanitizedUsername: null,
      };
    }

    const cleaned = rawUsername.trim().replace(/^@/, '');

    if (cleaned.length < 5) {
      return {
        isValid: false,
        action: 'invalid',
        sanitizedUsername: cleaned,
        error: 'Username must be at least 5 characters long',
      };
    }

    if (cleaned.length > 32) {
      return {
        isValid: false,
        action: 'invalid',
        sanitizedUsername: cleaned,
        error: 'Username cannot exceed 32 characters',
      };
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(cleaned)) {
      return {
        isValid: false,
        action: 'invalid',
        sanitizedUsername: cleaned,
        error: 'Username must start with a letter and contain only letters, numbers, and underscores',
      };
    }

    if (/__/.test(cleaned)) {
      return {
        isValid: false,
        action: 'invalid',
        sanitizedUsername: cleaned,
        error: 'Username cannot contain consecutive underscores',
      };
    }

    return {
      isValid: true,
      action: 'set',
      sanitizedUsername: cleaned,
    };
  }
}
