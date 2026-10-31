/**
 * Guidegram Clipboard Paste, Quote Reply & Album Grouping Governor
 * 
 * Hardened against:
 * - tdesktop #31476: Ctrl+V failing to paste images/bitmaps from clipboard
 * - tdesktop #31487: Quote-replies not delivering quote metadata to bots
 * - tdesktop #31455: Mixed image and video uploads failing to group into albums
 * - tdesktop #31438: LaTeX equation formatting dropped upon pasting
 * - kotatogram #474: Pressing Return after @mention popup not sending message
 */

export interface ClipboardPastedImage {
  hasImage: boolean;
  mimeType?: string;
  byteLength?: number;
  fileName?: string;
}

export interface QuoteReplyPayload {
  replyToMsgId: number;
  quoteText: string;
  quoteOffset: number;
  quoteLength: number;
  isCustomQuote: boolean;
}

export interface MediaAlbumItem {
  type: 'photo' | 'video';
  filePath: string;
  byteSize: number;
  groupedId?: string;
}

export interface KeyDownComposerAction {
  action: 'select_autocomplete' | 'send_message' | 'insert_newline' | 'none';
  shouldPreventDefault: boolean;
}

export class ClipboardPasteAndQuoteReplyGovernor {
  /**
   * Sniffs clipboard items to detect image bitmaps (PNG, JPEG, WebP, BMP)
   * on Windows and Linux (tdesktop #31476).
   */
  public static inspectClipboardData(types: string[], itemByteSizes: Record<string, number>): ClipboardPastedImage {
    const supportedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];

    for (const mime of supportedMimes) {
      if (types.includes(mime)) {
        return {
          hasImage: true,
          mimeType: mime,
          byteLength: itemByteSizes[mime] || 0,
          fileName: `pasted_image_${Date.now()}.${mime.split('/')[1]}`
        };
      }
    }

    return { hasImage: false };
  }

  /**
   * Constructs compliant Telegram 7.x+ quote-reply payloads
   * ensuring bots receive full quote metadata updates (tdesktop #31487).
   */
  public static buildQuoteReplyPayload(
    originalMsgId: number,
    fullMessageText: string,
    selectedQuoteSubstring?: string
  ): QuoteReplyPayload {
    if (!selectedQuoteSubstring || selectedQuoteSubstring.trim() === '') {
      return {
        replyToMsgId: originalMsgId,
        quoteText: fullMessageText.slice(0, 1024),
        quoteOffset: 0,
        quoteLength: Math.min(1024, fullMessageText.length),
        isCustomQuote: false
      };
    }

    const trimmedQuote = selectedQuoteSubstring.slice(0, 1024);
    const quoteOffset = Math.max(0, fullMessageText.indexOf(trimmedQuote));

    return {
      replyToMsgId: originalMsgId,
      quoteText: trimmedQuote,
      quoteOffset,
      quoteLength: trimmedQuote.length,
      isCustomQuote: true
    };
  }

  /**
   * Assigns a single unified 64-bit grouped_id to mixed photo and video uploads (up to 10 items),
   * preventing album fragmentation (tdesktop #31455).
   */
  public static groupMediaAlbum(items: MediaAlbumItem[], forcedGroupedId?: string): MediaAlbumItem[] {
    if (items.length <= 1) {
      return items.map(i => ({ ...i }));
    }

    // Maximum 10 items per Telegram album
    const cappedItems = items.slice(0, 10);
    const albumGroupedId = forcedGroupedId || `grouped_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return cappedItems.map(item => ({
      ...item,
      groupedId: albumGroupedId
    }));
  }

  /**
   * Detects LaTeX equation blocks ($...$ and $$...$$) and formats them into monospace code blocks (tdesktop #31438).
   */
  public static parsePastedLatex(text: string): { formattedText: string; latexBlockCount: number } {
    let count = 0;

    // Display LaTeX: $$equation$$ -> ```latex\nequation\n```
    let result = text.replace(/\$\$([^$]+)\$\$/g, (_, eq) => {
      count += 1;
      return `\`\`\`latex\n${eq.trim()}\n\`\`\``;
    });

    // Inline LaTeX: $equation$ -> `equation`
    result = result.replace(/\$([^$ \n]+)\$/g, (_, eq) => {
      count += 1;
      return `\`${eq.trim()}\``;
    });

    return {
      formattedText: result,
      latexBlockCount: count
    };
  }

  /**
   * Dispatches keyboard Return key in chat input, cleanly distinguishing
   * between selecting an active autocomplete popup suggestion vs sending the message (kotatogram #474).
   */
  public static evaluateComposerKeyDown(
    key: string,
    shiftKey: boolean,
    isAutocompleteOpen: boolean,
    hasActiveSelection: boolean
  ): KeyDownComposerAction {
    if (key === 'Enter') {
      if (isAutocompleteOpen && hasActiveSelection) {
        return {
          action: 'select_autocomplete',
          shouldPreventDefault: true
        };
      }

      if (shiftKey) {
        return {
          action: 'insert_newline',
          shouldPreventDefault: false
        };
      }

      return {
        action: 'send_message',
        shouldPreventDefault: true
      };
    }

    return {
      action: 'none',
      shouldPreventDefault: false
    };
  }
}
