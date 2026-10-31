/**
 * Guidegram Search Indexing, Global Query Cache & Autocomplete Governor
 * 
 * Hardened against competitor issues:
 * - telegram-tt #533: Search input interrupts Persian / CJK IME composition
 * - tdlib #1004 & tdesktop #7417: Search fails on non-Latin, Arabic/Persian diacritics & zero-width characters
 * - kotatogram #433: Direct ID lookup syntax (id:123456789)
 * - TDesktop-x64 #72: Global search flakiness, race conditions and un-cached repetitive queries
 * - tdesktop #627 & tweb #473: Emoji & reaction autocomplete search
 */

export interface ParsedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  isStructured: boolean;
  filterType?: 'id' | 'user' | 'media' | 'tag' | 'general';
  filterValue?: string;
}

export interface EmojiSuggestion {
  emoji: string;
  shortcode: string;
  category: string;
}

export interface CachedSearchResult<T> {
  query: string;
  timestamp: number;
  results: T[];
}

export class SearchIndexingAndQueryCacheGovernor {
  private static readonly CACHE_TTL_MS = 60000; // 60s
  private queryCache: Map<string, CachedSearchResult<any>> = new Map();

  private static readonly EMOJI_DICTIONARY: EmojiSuggestion[] = [
    { emoji: '😀', shortcode: ':smile:', category: 'smileys' },
    { emoji: '🔥', shortcode: ':fire:', category: 'symbols' },
    { emoji: '❤️', shortcode: ':heart:', category: 'symbols' },
    { emoji: '👍', shortcode: ':thumbsup:', category: 'gestures' },
    { emoji: '🚀', shortcode: ':rocket:', category: 'travel' },
    { emoji: '🎉', shortcode: ':tada:', category: 'activities' },
    { emoji: '👏', shortcode: ':clap:', category: 'gestures' },
    { emoji: '😂', shortcode: ':joy:', category: 'smileys' }
  ];

  /**
   * Evaluates if a search query dispatch should proceed or be deferred
   * due to active IME composition (Persian, CJK, etc.) (telegram-tt #533).
   */
  public static shouldDispatchSearch(isComposing: boolean, queryText: string): boolean {
    if (isComposing) {
      return false; // Suppress search during IME composition
    }
    return queryText.trim().length > 0;
  }

  /**
   * Sanitizes and normalizes query text:
   * - Strips zero-width characters (\u200C, \u200B)
   * - Unifies Arabic/Persian Kaf and Yeh (ك->ک, ي->ی)
   * - Strips diacritics (Tashkeel)
   * - Normalizes Unicode NFKC (tdlib #1004, tdesktop #7417).
   */
  public static normalizeSearchText(text: string): string {
    if (!text) return '';

    return text
      .normalize('NFKC')
      // Arabic Kaf to Persian Kaf
      .replace(/[\u0643]/g, '\u06a9')
      // Arabic Yeh to Persian Yeh
      .replace(/[\u0649\u064a]/g, '\u06cc')
      // Strip Arabic diacritics (Tashkeel: Fatha, Damma, Kasra, Sukun, Tanwin, Shadda)
      .replace(/[\u064b-\u0652\u0670]/g, '')
      // Strip zero-width non-joiner & zero-width spaces
      .replace(/[\u200b-\u200f\ufeff]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Parses query looking for structured prefix directives (kotatogram #433):
   * - 'id:123456789' or '#12345' -> direct ID search
   * - 'from:@username' -> user search
   * - 'type:photo|video' -> media search
   */
  public static parseSearchDirectives(raw: string): ParsedSearchQuery {
    const trimmed = raw.trim();
    const normalized = this.normalizeSearchText(trimmed);

    // Direct ID search: id:12345 or #12345
    const idMatch = trimmed.match(/^(?:id:|#)(\d+)$/i);
    if (idMatch) {
      return {
        rawQuery: trimmed,
        normalizedQuery: idMatch[1],
        isStructured: true,
        filterType: 'id',
        filterValue: idMatch[1]
      };
    }

    // from:username
    const fromMatch = trimmed.match(/^from:([a-zA-Z0-9_@]+)$/i);
    if (fromMatch) {
      return {
        rawQuery: trimmed,
        normalizedQuery: fromMatch[1].replace(/^@/, '').toLowerCase(),
        isStructured: true,
        filterType: 'user',
        filterValue: fromMatch[1].replace(/^@/, '')
      };
    }

    return {
      rawQuery: trimmed,
      normalizedQuery: normalized,
      isStructured: false,
      filterType: 'general'
    };
  }

  /**
   * Matches emoji shortcodes for autocomplete suggestions (tdesktop #627, tweb #473).
   */
  public static autocompleteEmoji(queryToken: string): EmojiSuggestion[] {
    if (!queryToken.startsWith(':') || queryToken.length < 2) {
      return [];
    }

    const cleanToken = queryToken.toLowerCase();
    return this.EMOJI_DICTIONARY.filter(item => item.shortcode.startsWith(cleanToken));
  }

  /**
   * Queries or updates the LRU query cache (TDesktop-x64 #72).
   */
  public getCachedResults<T>(normalizedQuery: string, now: number = Date.now()): T[] | null {
    const cached = this.queryCache.get(normalizedQuery);
    if (!cached) return null;

    if ((now - cached.timestamp) > SearchIndexingAndQueryCacheGovernor.CACHE_TTL_MS) {
      this.queryCache.delete(normalizedQuery);
      return null;
    }

    return cached.results;
  }

  public setCachedResults<T>(normalizedQuery: string, results: T[], now: number = Date.now()): void {
    if (this.queryCache.size >= 100) {
      // Evict oldest entry
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(normalizedQuery, {
      query: normalizedQuery,
      timestamp: now,
      results
    });
  }
}
