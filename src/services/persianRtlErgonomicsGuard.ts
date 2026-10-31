/**
 * PersianRtlErgonomicsGuard (Phase 4: Persian Typography, BiDi & RTL Ergonomics)
 * 
 * Directly resolves competitor issues:
 * - Historical Telegram Desktop BiDi punctuation inversion (periods/question marks jumping to opposite side)
 * - tdesktop #90: Allow user to choose font and font size
 * - tdesktop #2060: Allow resizing message block / chat bubble width
 * - Mixed Persian/English text misalignment and Arabic-Persian character search mismatch
 */

export interface RtlErgonomicsTelemetry {
  textsDirectionChecked: number;
  bidiAnchorsApplied: number;
  persianNormalizedCount: number;
}

export class PersianRtlErgonomicsGuard {
  private static instance: PersianRtlErgonomicsGuard | null = null;

  // Unicode range for Arabic, Persian, Kurdish, Hebrew
  private static readonly RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
  
  // Terminal punctuation characters prone to BiDi jumping
  private static readonly TERMINAL_PUNCTUATION_REGEX = /([.!?؟:;،؛)\]}\-–—])$/;

  // Unicode direction markers
  public static readonly RLM = '\u200F'; // Right-to-Left Mark
  public static readonly LRM = '\u200E'; // Left-to-Right Mark
  public static readonly ZWNJ = '\u200C'; // Zero-Width Non-Joiner

  // Telemetry
  private checkedCount: number = 0;
  private bidiAnchoredCount: number = 0;
  private normalizedCount: number = 0;

  private constructor() {}

  public static getInstance(): PersianRtlErgonomicsGuard {
    if (!this.instance) {
      this.instance = new PersianRtlErgonomicsGuard();
    }
    return this.instance;
  }

  /**
   * Fast and robust determination of whether text should be displayed in RTL mode.
   * Examines initial characters (skipping neutral whitespace/symbols).
   */
  public detectDirection(text: string): 'rtl' | 'ltr' {
    this.checkedCount++;
    if (!text || typeof text !== 'string') return 'ltr';

    const trimmed = text.trim();
    if (!trimmed) return 'ltr';

    // Scan first 100 characters to determine primary paragraph script
    const sample = trimmed.substring(0, 100);
    let rtlChars = 0;
    let ltrChars = 0;

    for (const ch of sample) {
      if (PersianRtlErgonomicsGuard.RTL_REGEX.test(ch)) {
        rtlChars++;
      } else if (/[a-zA-Z]/.test(ch)) {
        ltrChars++;
      }
    }

    if (rtlChars > 0 && rtlChars >= ltrChars) {
      return 'rtl';
    }
    return ltrChars > rtlChars ? 'ltr' : (PersianRtlErgonomicsGuard.RTL_REGEX.test(sample) ? 'rtl' : 'ltr');
  }

  /**
   * Anchors trailing punctuation with directional mark (RLM) to prevent punctuation inversion.
   * Fixes classic bug where 'سلام خوبی؟' or 'تست.' renders punctuation at the far left.
   */
  public anchorBidiPunctuation(text: string): string {
    if (!text || typeof text !== 'string') return '';

    const dir = this.detectDirection(text);
    if (dir === 'rtl') {
      // If trailing character is punctuation, append RLM so browser bidi layout anchors it to the right
      if (PersianRtlErgonomicsGuard.TERMINAL_PUNCTUATION_REGEX.test(text.trimEnd())) {
        this.bidiAnchoredCount++;
        return `${text}${PersianRtlErgonomicsGuard.RLM}`;
      }
    }
    return text;
  }

  /**
   * Normalizes Arabic 'ي' and 'ك' to Persian 'ی' and 'ک' and cleans invalid control characters.
   */
  public normalizePersianTypography(text: string): string {
    if (!text || typeof text !== 'string') return '';
    this.normalizedCount++;

    return text
      .replace(/\u064A/g, '\u06CC') // Arabic Yeh -> Persian Yeh
      .replace(/\u0643/g, '\u06A9') // Arabic Kaf -> Persian Kaf
      .replace(/\u06C0/g, '\u0647\u200C\u06CC') // Heh with Yeh above -> Heh + ZWNJ + Yeh
      .replace(/\u0649/g, '\u06CC') // Alef Maksura -> Persian Yeh
      .replace(/[\u200B\uFEFF]/g, '') // Strip zero-width space and byte-order mark
      .replace(/[\u0660-\u0669]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 144)); // Arabic digits (0660) -> Persian digits (06F0)
  }

  /**
   * Calculates ergonomic chat bubble dimensions and typography scales (resolves #90, #2060).
   */
  public computeErgonomicBubbleStyle(fontScale: number = 1.0, maxBubbleWidthPercent: number = 70): {
    fontSize: string;
    lineHeight: string;
    maxWidth: string;
    direction: 'rtl' | 'ltr';
    fontFamily: string;
  } {
    const clampedScale = Math.min(1.5, Math.max(0.8, fontScale));
    const clampedWidth = Math.min(95, Math.max(40, maxBubbleWidthPercent));

    return {
      fontSize: `${Math.round(14 * clampedScale)}px`,
      lineHeight: `${Math.round(20 * clampedScale)}px`,
      maxWidth: `${clampedWidth}%`,
      direction: 'rtl',
      fontFamily: 'Vazirmatn, IRANSans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };
  }

  public getTelemetry(): RtlErgonomicsTelemetry {
    return {
      textsDirectionChecked: this.checkedCount,
      bidiAnchorsApplied: this.bidiAnchoredCount,
      persianNormalizedCount: this.normalizedCount,
    };
  }
}

export const persianRtlErgonomicsGuard = PersianRtlErgonomicsGuard.getInstance();
