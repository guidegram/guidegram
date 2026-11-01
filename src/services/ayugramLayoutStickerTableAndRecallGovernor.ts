/**
 * Guidegram AyuGram Desktop Layout, Stickers, Monospace, Tables & Recall Governor
 * 
 * Hardens Guidegram against AyuGramDesktop issues:
 * - #484: Adaptive layout setting hidden/unreachable in Windows UI
 * - #481: Hide group sticker pack in chat suggestions and panel
 * - #471: Copy monospace text on single click with toast confirmation
 * - #456: Add original post date & time to forwarded message headers
 * - #439: Precision message timestamp formatting with optional seconds display
 * - #425: Markdown table parsing and responsive horizontal scroll rendering
 * - #412: Granular per-chat override rules for saving deleted messages (anti-recall)
 */

export interface BreakpointConfig {
  windowWidthPx: number;
  dpiScale: number;
  layoutMode: 'compact' | 'medium' | 'wide' | 'ultraWide';
  settingsContainerHeightPx: number;
}

export interface SettingsElementBounds {
  id: string;
  topPx: number;
  heightPx: number;
  isVisible: boolean;
  requiredScrollOffsetPx?: number;
}

export interface StickerItem {
  id: string;
  setId: string;
  isGroupSpecific: boolean;
  owningChatId?: string;
  emoji: string;
  thumbnailUrl: string;
}

export interface MonospaceBlock {
  blockId: string;
  rawText: string;
  language?: string;
}

export interface CopyEventResult {
  blockId: string;
  copiedText: string;
  toastMessage: string;
  consumedEvent: boolean;
}

export interface ForwardHeaderDisplay {
  senderName: string;
  originalDateFormatted: string;
  fullHeaderText: string;
  originalTimestamp: number;
}

export interface TableCell {
  text: string;
  alignment: 'left' | 'center' | 'right';
}

export interface ParsedMarkdownTable {
  headers: TableCell[];
  rows: TableCell[][];
  columnCount: number;
  hasHorizontalOverflow: boolean;
}

export type AntiRecallRule = 'save_all' | 'save_media_only' | 'respect_deletion' | 'default_global';

// -------------------------------------------------------------
// 1. DesktopAdaptiveLayoutGovernor (Resolves #484)
// -------------------------------------------------------------
export class DesktopAdaptiveLayoutGovernor {
  public computeBreakpoint(width: number, dpi: number = 1.0): BreakpointConfig {
    const effectiveWidth = width / dpi;
    let layoutMode: 'compact' | 'medium' | 'wide' | 'ultraWide';

    if (effectiveWidth < 680) {
      layoutMode = 'compact';
    } else if (effectiveWidth < 960) {
      layoutMode = 'medium';
    } else if (effectiveWidth < 1440) {
      layoutMode = 'wide';
    } else {
      layoutMode = 'ultraWide';
    }

    const baseHeight = 600;
    const settingsContainerHeightPx = Math.floor(baseHeight * dpi);

    return {
      windowWidthPx: width,
      dpiScale: dpi,
      layoutMode,
      settingsContainerHeightPx
    };
  }

  public ensureElementReachable(
    elementTop: number,
    elementHeight: number,
    viewportHeight: number,
    currentScrollY: number = 0
  ): SettingsElementBounds {
    const isVisible = elementTop >= currentScrollY && (elementTop + elementHeight) <= (currentScrollY + viewportHeight);
    let requiredScrollOffsetPx: number | undefined;

    if (!isVisible) {
      // Scroll to bring element centered into viewport
      requiredScrollOffsetPx = Math.max(0, elementTop - Math.floor(viewportHeight / 2));
    }

    return {
      id: 'adaptive_layout_switch',
      topPx: elementTop,
      heightPx: elementHeight,
      isVisible,
      requiredScrollOffsetPx
    };
  }
}

// -------------------------------------------------------------
// 2. GroupStickerSuppressorGovernor (Resolves #481)
// -------------------------------------------------------------
export class GroupStickerSuppressorGovernor {
  private hiddenGroupChats = new Set<string>();
  private globalGroupStickersSuppressed = false;

  public setChatGroupStickersHidden(chatId: string, hidden: boolean): void {
    if (hidden) {
      this.hiddenGroupChats.add(chatId);
    } else {
      this.hiddenGroupChats.delete(chatId);
    }
  }

  public setGlobalGroupStickersSuppressed(suppressed: boolean): void {
    this.globalGroupStickersSuppressed = suppressed;
  }

  public filterStickerSuggestions(stickers: StickerItem[], currentChatId: string): StickerItem[] {
    const isChatSuppressed = this.globalGroupStickersSuppressed || this.hiddenGroupChats.has(currentChatId);

    if (!isChatSuppressed) {
      return [...stickers];
    }

    return stickers.filter(s => {
      if (!s.isGroupSpecific) return true;
      // If it belongs to current suppressed group, hide it!
      return s.owningChatId !== currentChatId;
    });
  }
}

// -------------------------------------------------------------
// 3. MonospaceClickToCopyGovernor (Resolves #471)
// -------------------------------------------------------------
export class MonospaceClickToCopyGovernor {
  public attachClickToCopy(codeBlock: MonospaceBlock): CopyEventResult {
    const cleanedText = codeBlock.rawText.trim();
    return {
      blockId: codeBlock.blockId,
      copiedText: cleanedText,
      toastMessage: 'Copied code snippet to clipboard',
      consumedEvent: true
    };
  }
}

// -------------------------------------------------------------
// 4. ForwardedMessageDateGovernor (Resolves #456)
// -------------------------------------------------------------
export class ForwardedMessageDateGovernor {
  public formatForwardHeader(params: {
    senderName: string;
    originalDateTimestamp: number;
    includeOriginalDate?: boolean;
  }): ForwardHeaderDisplay {
    const includeDate = params.includeOriginalDate ?? true;
    const date = new Date(params.originalDateTimestamp * 1000);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const dateFormatted = `${year}-${month}-${day} ${hours}:${minutes} UTC`;

    let fullHeaderText = `Forwarded from ${params.senderName}`;
    if (includeDate) {
      fullHeaderText += ` • ${dateFormatted}`;
    }

    return {
      senderName: params.senderName,
      originalDateFormatted: dateFormatted,
      fullHeaderText,
      originalTimestamp: params.originalDateTimestamp
    };
  }
}

// -------------------------------------------------------------
// 5. TimestampGranularityGovernor (Resolves #439)
// -------------------------------------------------------------
export class TimestampGranularityGovernor {
  public formatMessageTimestamp(timestampMs: number, showSeconds: boolean = false): string {
    const d = new Date(timestampMs);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');

    if (showSeconds) {
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }

    return `${hh}:${mm}`;
  }
}

// -------------------------------------------------------------
// 6. MarkdownTableRendererGovernor (Resolves #425)
// -------------------------------------------------------------
export class MarkdownTableRendererGovernor {
  public parseMarkdownTable(rawText: string): ParsedMarkdownTable | null {
    const lines = rawText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) return null; // Needs header, separator, and at least 1 data row

    const parseRow = (line: string): string[] => {
      // Split by '|' and trim outer empty elements if wrapped with '|'
      const parts = line.split('|').map(p => p.trim());
      if (parts[0] === '') parts.shift();
      if (parts[parts.length - 1] === '') parts.pop();
      return parts;
    };

    const headerParts = parseRow(lines[0]);
    const separatorParts = parseRow(lines[1]);

    if (headerParts.length === 0 || headerParts.length !== separatorParts.length) {
      return null;
    }

    // Check if separator is valid e.g. '---', ':---:', '---:'
    const isSeparatorValid = separatorParts.every(s => /^:?-+:?$/.test(s));
    if (!isSeparatorValid) {
      return null;
    }

    const alignments: ('left' | 'center' | 'right')[] = separatorParts.map(s => {
      const starts = s.startsWith(':');
      const ends = s.endsWith(':');
      if (starts && ends) return 'center';
      if (ends) return 'right';
      return 'left';
    });

    const headers: TableCell[] = headerParts.map((text, i) => ({
      text,
      alignment: alignments[i]
    }));

    const rows: TableCell[][] = [];
    for (let i = 2; i < lines.length; i++) {
      const rowParts = parseRow(lines[i]);
      if (rowParts.length !== headers.length) continue;
      rows.push(rowParts.map((text, idx) => ({
        text,
        alignment: alignments[idx]
      })));
    }

    return {
      headers,
      rows,
      columnCount: headers.length,
      hasHorizontalOverflow: headers.length > 4
    };
  }
}

// -------------------------------------------------------------
// 7. PerChatAntiRecallGovernor (Resolves #412)
// -------------------------------------------------------------
export class PerChatAntiRecallGovernor {
  private chatRules = new Map<string, AntiRecallRule>();

  public setPerChatRecallRule(chatId: string, rule: AntiRecallRule): void {
    this.chatRules.set(chatId, rule);
  }

  public getPerChatRecallRule(chatId: string): AntiRecallRule {
    return this.chatRules.get(chatId) ?? 'default_global';
  }

  public shouldRetainDeletedMessage(chatId: string, isMedia: boolean, globalSaveEnabled: boolean): boolean {
    const rule = this.getPerChatRecallRule(chatId);

    switch (rule) {
      case 'save_all':
        return true;
      case 'respect_deletion':
        return false;
      case 'save_media_only':
        return isMedia;
      case 'default_global':
      default:
        return globalSaveEnabled;
    }
  }
}
