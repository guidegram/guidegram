/**
 * Guidegram International Typography, Font Fallback & Action Message Guard
 * 
 * Hardened against:
 * - tdesktop #1041 & #1360: Composite accent dead-keys (è, é, à, ú) not appearing or stripped
 * - tdesktop #5172, #4072, #25825 & #7823: Broken Arabic/Thai font fallbacks and bold font regressions
 * - tdesktop #1165: Missing Telegram "/me <action>" message formatting
 * - tdesktop #1864: Inability to mute notifications specifically for pinned messages in groups
 */

export interface FontCascadeConfig {
  primaryPersianFont?: string;
  primaryLatinFont?: string;
  osPlatform: 'windows' | 'linux' | 'macos' | 'android' | 'ios';
}

export interface ActionMessageParseResult {
  isActionMessage: boolean;
  senderName: string;
  actionText: string;
  formattedDisplay: string;
}

export interface PinnedNotificationPolicy {
  isGroupMuted: boolean;
  mutePinnedMessagesOnly: boolean;
  isMentioned: boolean;
}

export class InternationalTypographyAndTextLayoutGuard {
  /**
   * Normalizes composite dead-key characters and decomposed vowel accents into canonical precomposed Unicode (NFC),
   * ensuring letters with accents (é, è, à, ç, û, etc.) render properly without dropping (tdesktop #1041, #1360).
   */
  public static normalizeCompositeAccents(input: string): string {
    if (!input) return '';

    // Step 1: Normalize to NFC precomposed form
    let normalized = input.normalize('NFC');

    // Step 2: Resolve common dead-key accent pairs if left uncombined
    const deadKeyMap: Array<[RegExp, string]> = [
      [/´e/g, 'é'], [/`e/g, 'è'], [/^e/g, 'ê'],
      [/`a/g, 'à'], [/´a/g, 'á'], [/^a/g, 'â'],
      [/´u/g, 'ú'], [/`u/g, 'ù'], [/^u/g, 'û'],
      [/´o/g, 'ó'], [/`o/g, 'ò'], [/^o/g, 'ô'],
      [/´i/g, 'í'], [/`i/g, 'ì'], [/^i/g, 'î']
    ];

    for (const [pattern, replacement] of deadKeyMap) {
      normalized = normalized.replace(pattern, replacement);
    }

    return normalized;
  }

  /**
   * Constructs an optimal multi-script font fallback stack prioritizing Persian/Arabic (Vazirmatn),
   * Thai (Noto Sans Thai / Leelawadee UI), and modern Latin sans-serif (tdesktop #5172, #25825, #7823).
   */
  public static getOptimalFontFamilyCascade(config: FontCascadeConfig): string {
    const fonts: string[] = [];

    // Persian / Arabic primary
    fonts.push(config.primaryPersianFont || 'Vazirmatn');

    // OS-specific high-quality Arabic/Thai fallbacks
    switch (config.osPlatform) {
      case 'windows':
        fonts.push('Segoe UI', 'Segoe UI Historic', 'Leelawadee UI', 'Tahoma');
        break;
      case 'macos':
      case 'ios':
        fonts.push('-apple-system', 'BlinkMacSystemFont', 'Geeza Pro', 'Thonburi');
        break;
      case 'linux':
        fonts.push('Noto Sans Arabic', 'Noto Sans Thai', 'DejaVu Sans', 'Ubuntu');
        break;
      default:
        fonts.push('Roboto', 'Noto Sans');
        break;
    }

    // Latin fallback
    fonts.push(config.primaryLatinFont || 'Inter');
    fonts.push('sans-serif');

    return fonts.map(f => (f.includes(' ') ? `"${f}"` : f)).join(', ');
  }

  /**
   * Parses Telegram IRC-style "/me <action>" messages into structured 3rd-person action descriptions (tdesktop #1165).
   */
  public static parseActionMessage(rawText: string, senderName: string): ActionMessageParseResult {
    const trimmed = rawText.trim();
    if (trimmed.startsWith('/me ')) {
      const actionText = trimmed.slice(4).trim();
      return {
        isActionMessage: true,
        senderName,
        actionText,
        formattedDisplay: `* ${senderName} ${actionText}`
      };
    }

    return {
      isActionMessage: false,
      senderName,
      actionText: '',
      formattedDisplay: rawText
    };
  }

  /**
   * Evaluates whether a pinned message notification should trigger sound/banner
   * based on specific granular pinned message mute preferences (tdesktop #1864).
   */
  public static shouldNotifyForPinnedMessage(policy: PinnedNotificationPolicy): boolean {
    // If group is globally muted, pinned messages should never notify unless user is explicitly mentioned
    if (policy.isGroupMuted) {
      return policy.isMentioned;
    }

    // If user specifically enabled "Mute Pinned Messages", suppress notification unless mentioned
    if (policy.mutePinnedMessagesOnly) {
      return policy.isMentioned;
    }

    return true;
  }
}
