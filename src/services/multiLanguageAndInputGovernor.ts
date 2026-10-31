/**
 * MultiLanguageAndInputGovernor.ts
 *
 * Comprehensive Governor for IME composition state tracking, BiDi isolate insertion,
 * combining diacritics preservation, CJK/Latin typographic spacing (pangu),
 * multi-script font stack fallbacks, and dynamic i18n language pack cache invalidation.
 *
 * Directly resolves:
 * - telegramdesktop/tdesktop #2013: Japanese/CJK IME premature enter / IBus composition drops
 * - telegramdesktop/tdesktop #6362: Combining diacritics / harakat / accents being stripped
 * - telegramdesktop/tdesktop #9922: Bad mixing of RTL & LTR words (Persian & English layout inversion)
 * - UnigramDev/Unigram #1841: Messed up CJK & Persian font fallback stack
 * - TDesktop-x64/tdesktop #246: CJK / Latin typographic pangu spacing
 * - morethanwords/tweb #743: Language pack cache not refreshing after remote server update
 */

export interface ImeCompositionState {
  isComposing: boolean;
  compositionText: string;
  lastKeyCode?: string;
}

export interface BidiSegment {
  text: string;
  isRtl: boolean;
}

export interface LanguagePackVersion {
  langCode: string;
  version: number;
  hash: string;
  strings: Record<string, string>;
}

export class MultiLanguageAndInputGovernor {
  private isComposing = false;
  private currentCompositionText = '';
  private languagePackVersions = new Map<string, LanguagePackVersion>();

  /**
   * Tracks IME composition events (Japanese, Chinese, Korean, Vietnamese).
   * Resolves telegramdesktop/tdesktop #2013: prevents sending message on 'Enter' while IME is composing.
   */
  public handleCompositionStart(): void {
    this.isComposing = true;
    this.currentCompositionText = '';
  }

  public handleCompositionUpdate(data: string): void {
    this.isComposing = true;
    this.currentCompositionText = data;
  }

  public handleCompositionEnd(): void {
    this.isComposing = false;
    this.currentCompositionText = '';
  }

  public shouldSuppressMessageSendOnEnter(event: { key: string; isComposing?: boolean }): boolean {
    if (event.key !== 'Enter') return false;
    // If either native event.isComposing is true OR internal governor state is composing
    return Boolean(this.isComposing || event.isComposing);
  }

  /**
   * Normalizes Unicode string to NFC while strictly preserving combining diacritics
   * (e.g. Persian/Arabic Harakat, Tanwin, Tashkeel, European combining accents).
   * Resolves telegramdesktop/tdesktop #6362.
   */
  public normalizePreservingDiacritics(text: string): string {
    if (!text) return '';
    // Use Canonical Decomposition followed by Canonical Composition (NFC)
    // Ensures accents are properly attached to base glyphs without stripping
    return text.normalize('NFC');
  }

  /**
   * Detects whether a string or segment is predominantly RTL (Persian, Arabic, Hebrew).
   */
  public isRtlText(text: string): boolean {
    const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
    return rtlRegex.test(text);
  }

  /**
   * Applies Unicode Directional Formatting (BiDi Isolates) around embedded LTR/RTL words.
   * Wraps foreign directional segments with:
   * - Left-to-Right Isolate (\u2066) ... Pop Directional Isolate (\u2069)
   * - Right-to-Left Isolate (\u2067) ... Pop Directional Isolate (\u2069)
   * Resolves telegramdesktop/tdesktop #9922 (mixed Persian & English line punctuation jumps).
   */
  public formatBidiText(text: string, baseDirection: 'rtl' | 'ltr' = 'rtl'): string {
    if (!text) return '';

    if (baseDirection === 'rtl') {
      // In RTL context: wrap pure LTR alphanumeric / URL tokens in LRI (\u2066) ... PDI (\u2069)
      const ltrTokenRegex = /(?:@)?[a-zA-Z0-9_\-\.\:\/]+(?:@[a-zA-Z0-9_\-\.]+)?/g;
      return text.replace(ltrTokenRegex, (match) => {
        // If match contains any Latin letters, isolate it
        if (/[a-zA-Z]/.test(match)) {
          return `\u2066${match}\u2069`;
        }
        return match;
      });
    } else {
      // In LTR context: wrap RTL tokens in RLI (\u2067) ... PDI (\u2069)
      const rtlTokenRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;
      return text.replace(rtlTokenRegex, (match) => `\u2067${match}\u2069`);
    }
  }

  /**
   * Automatically adds typographic spacing between full-width CJK ideographs
   * and half-width Latin letters or numbers (Pangu spacing).
   * Resolves TDesktop-x64/tdesktop #246.
   */
  public applyPanguSpacing(text: string): string {
    if (!text) return '';

    // CJK range: \u2E80-\u2EFF, \u2F00-\u2FDF, \u3040-\u309F, \u30A0-\u30FF, \u4E00-\u9FFF
    const cjkPattern = '[\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]';

    // CJK followed by Latin/Number -> insert space
    const cjkLatin = new RegExp(`(${cjkPattern})([a-zA-Z0-9])`, 'g');
    let spaced = text.replace(cjkLatin, '$1 $2');

    // Latin/Number followed by CJK -> insert space
    const latinCjk = new RegExp(`([a-zA-Z0-9])(${cjkPattern})`, 'g');
    spaced = spaced.replace(latinCjk, '$1 $2');

    return spaced;
  }

  /**
   * Generates a bulletproof multi-script font fallback stack.
   * Resolves UnigramDev/Unigram #1841.
   */
  public getMultiScriptFontStack(preferredFamily = 'Vazirmatn'): string {
    return [
      `"${preferredFamily}"`,
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Noto Sans"',
      '"Noto Sans Arabic"',
      '"Noto Sans CJK SC"',
      '"Noto Sans CJK JP"',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      'sans-serif',
    ].join(', ');
  }

  /**
   * Updates language pack cache and detects whether cache invalidation is required.
   * Resolves morethanwords/tweb #743.
   */
  public updateLanguagePack(
    langCode: string,
    newVersion: number,
    newHash: string,
    strings: Record<string, string>
  ): { invalidated: boolean; currentVersion: number } {
    const existing = this.languagePackVersions.get(langCode);

    if (!existing || existing.version < newVersion || existing.hash !== newHash) {
      this.languagePackVersions.set(langCode, {
        langCode,
        version: newVersion,
        hash: newHash,
        strings,
      });
      return { invalidated: true, currentVersion: newVersion };
    }

    return { invalidated: false, currentVersion: existing.version };
  }

  public getLanguageString(langCode: string, key: string, fallback = ''): string {
    const pack = this.languagePackVersions.get(langCode);
    return pack?.strings[key] ?? fallback;
  }
}

export const multiLanguageAndInputGovernor = new MultiLanguageAndInputGovernor();
