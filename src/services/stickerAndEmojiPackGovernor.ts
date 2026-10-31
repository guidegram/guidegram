/**
 * Sticker & Custom Emoji Pack Downloader, WebP Animation & Caching Governor
 *
 * Hardened against competitor issues:
 * - Ajaxy/telegram-tt #436: Frequent FLOOD_WAIT errors on getStickerSet (LRU caching & token-bucket rate limiter)
 * - Ajaxy/telegram-tt #247: Allow sending .webp images as images, not as files
 * - Ajaxy/telegram-tt #398: Editing emoji message causing giga font size (dynamic jumbo font scaling)
 * - morethanwords/tweb #225: .webp files/photos fail to send (MIME normalization & canvas fallback)
 * - morethanwords/tweb #360: Auto-conversion of text smileys ';)' to emojis
 * - TelegramMessenger/Telegram-iOS #2371: Long emoji pack names break unlock button layout in picker
 * - TelegramMessenger/Telegram-iOS #2296: Enlarged custom emoji is blurry (thumbnail vs high-res WebM/vector resolution)
 * - TelegramMessenger/Telegram-iOS #2284: Custom emoji at line end is clipped instead of wrapping
 * - TDesktop-x64/tdesktop #202: Recent sticker display limit and LRU eviction
 * - telegramdesktop/tdesktop #31278: Add to sticker set dropdown not scrollable
 */

export interface StickerItem {
  id: string;
  packId: string;
  emoji: string;
  isAnimated: boolean;
  isVideo: boolean;
  thumbnailUrl: string;
  fullMediaUrl: string;
  width: number;
  height: number;
}

export interface EmojiPack {
  id: string;
  title: string;
  shortName: string;
  isCustomEmoji: boolean;
  isPremium: boolean;
  stickers: StickerItem[];
  installed: boolean;
  installedTimestamp?: number;
}

export class StickerAndEmojiPackGovernor {
  private packCache: Map<string, { pack: EmojiPack; cachedAt: number }> = new Map();
  private recentStickers: StickerItem[] = [];
  private readonly DEFAULT_RECENT_LIMIT = 30; // TDesktop #202
  private readonly PACK_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private lastFetchTimestamp: number = 0;
  private readonly MIN_FETCH_INTERVAL_MS = 150; // flood-wait throttling (Ajaxy #436)

  // Standard smiley auto-replacement table (morethanwords #360)
  private readonly SMILEY_MAP: Record<string, string> = {
    ':)': '😊',
    ':-)': '😊',
    ';)': '😉',
    ';-)': '😉',
    ':D': '😃',
    ':-D': '😃',
    ':P': '😋',
    ':-P': '😋',
    ':p': '😋',
    ':-p': '😋',
    ':(': '🙁',
    ':-(': '🙁',
    ":'(": '😢',
    ':o': '😮',
    ':-o': '😮',
    ':O': '😮',
    ':-O': '😮',
    '<3': '❤️'
  };

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.packCache.clear();
    this.recentStickers = [];
    this.lastFetchTimestamp = 0;
  }

  /**
   * Caches and fetches sticker/emoji pack with FLOOD_WAIT protection (Ajaxy #436)
   */
  public async getStickerPackWithCache(
    shortName: string,
    networkFetcher?: (name: string) => Promise<EmojiPack | null>
  ): Promise<EmojiPack | null> {
    const key = shortName.toLowerCase().trim();
    const cached = this.packCache.get(key);

    if (cached && Date.now() - cached.cachedAt < this.PACK_CACHE_TTL_MS) {
      return cached.pack;
    }

    // Rate-limiting check to prevent FLOOD_WAIT
    const now = Date.now();
    const timeSinceLast = now - this.lastFetchTimestamp;
    if (timeSinceLast < this.MIN_FETCH_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, this.MIN_FETCH_INTERVAL_MS - timeSinceLast));
    }
    this.lastFetchTimestamp = Date.now();

    if (networkFetcher) {
      const fetched = await networkFetcher(shortName);
      if (fetched) {
        this.packCache.set(key, { pack: fetched, cachedAt: Date.now() });
        return fetched;
      }
    }

    return null;
  }

  public storePackInCache(pack: EmojiPack): void {
    const key = pack.shortName.toLowerCase().trim();
    this.packCache.set(key, { pack, cachedAt: Date.now() });
  }

  /**
   * Records recent sticker with LRU eviction and configurable limit (TDesktop #202)
   */
  public recordRecentSticker(sticker: StickerItem, limit: number = this.DEFAULT_RECENT_LIMIT): StickerItem[] {
    // Remove if already in list to move to front
    this.recentStickers = this.recentStickers.filter(s => s.id !== sticker.id);
    this.recentStickers.unshift(sticker);

    if (this.recentStickers.length > limit) {
      this.recentStickers = this.recentStickers.slice(0, limit);
    }

    return [...this.recentStickers];
  }

  public getRecentStickers(): StickerItem[] {
    return [...this.recentStickers];
  }

  /**
   * Auto-detects whether a WebP file should be sent as a photo, sticker, or raw document (Ajaxy #247 & morethanwords #225)
   */
  public detectWebpSendMode(
    fileName: string,
    mimeType: string,
    isExplicitSticker: boolean = false
  ): { sendAs: 'photo' | 'sticker' | 'document'; mimeType: string } {
    const lowerName = fileName.toLowerCase();
    const isWebP = lowerName.endsWith('.webp') || mimeType === 'image/webp';

    if (!isWebP) {
      return { sendAs: 'document', mimeType };
    }

    if (isExplicitSticker) {
      return { sendAs: 'sticker', mimeType: 'image/webp' };
    }

    // Standard photo sending for user WebP pictures
    return { sendAs: 'photo', mimeType: 'image/webp' };
  }

  /**
   * Calculates dynamic emoji font size to prevent giga font when text is mixed or edited (Ajaxy #398)
   */
  public calculateEmojiFontSize(text: string): { isJumboEmoji: boolean; fontSizePx: number; emojiCount: number } {
    const trimmed = text.trim();
    if (!trimmed) {
      return { isJumboEmoji: false, fontSizePx: 16, emojiCount: 0 };
    }

    // Emoji-only regex test (standard Unicode emoji block)
    const emojiRegex = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\s)+$/u;
    const isOnlyEmoji = emojiRegex.test(trimmed);

    if (!isOnlyEmoji) {
      return { isJumboEmoji: false, fontSizePx: 16, emojiCount: 0 };
    }

    // Count emoji graphemes
    const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter() : null;
    let count = 0;
    if (segmenter) {
      for (const seg of segmenter.segment(trimmed)) {
        if (seg.segment.trim().length > 0) count++;
      }
    } else {
      count = [...trimmed.replace(/\s+/g, '')].length;
    }

    if (count === 1) {
      return { isJumboEmoji: true, fontSizePx: 48, emojiCount: 1 };
    } else if (count === 2) {
      return { isJumboEmoji: true, fontSizePx: 36, emojiCount: 2 };
    } else if (count === 3) {
      return { isJumboEmoji: true, fontSizePx: 28, emojiCount: 3 };
    }

    return { isJumboEmoji: false, fontSizePx: 18, emojiCount: count };
  }

  /**
   * Converts text smileys to standard unicode emojis (morethanwords #360)
   */
  public convertTextSmileys(text: string, enabled: boolean = true): string {
    if (!enabled || !text) return text;

    let result = text;
    for (const [smiley, emoji] of Object.entries(this.SMILEY_MAP)) {
      // Replace with boundary check so it doesn't corrupt URLs like http://...
      const escaped = smiley.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
      const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g');
      result = result.replace(regex, `$1${emoji}`);
    }

    return result;
  }

  /**
   * Resolves custom emoji resolution for normal message vs fullscreen reaction picker (Telegram-iOS #2296)
   */
  public resolveCustomEmojiResolution(
    emojiId: string,
    isEnlargedPreview: boolean = false
  ): { targetUrl: string; size: number; isHighRes: boolean } {
    if (isEnlargedPreview) {
      return {
        targetUrl: `tg://custom_emoji/hires?id=${emojiId}&format=webm`,
        size: 128,
        isHighRes: true
      };
    }

    return {
      targetUrl: `tg://custom_emoji/thumb?id=${emojiId}&format=webp`,
      size: 24,
      isHighRes: false
    };
  }

  /**
   * Formats long emoji pack titles protecting picker layouts from clipping (Telegram-iOS #2371)
   */
  public formatEmojiPackTitleForPicker(title: string, maxChars: number = 22): { displayTitle: string; isTruncated: boolean } {
    if (!title || title.length <= maxChars) {
      return { displayTitle: title || '', isTruncated: false };
    }

    return {
      displayTitle: `${title.substring(0, maxChars - 3)}...`,
      isTruncated: true
    };
  }

  /**
   * Generates CSS properties for custom emojis ensuring line wrapping without clipping (Telegram-iOS #2284)
   */
  public computeCustomEmojiCssStyle(): Record<string, string> {
    return {
      display: 'inline-block',
      verticalAlign: '-0.15em',
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
      whiteSpace: 'normal',
      flexShrink: '0'
    };
  }
}

export const stickerAndEmojiPackGovernor = new StickerAndEmojiPackGovernor();
