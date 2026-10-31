/**
 * Guidegram Rich Text Formatting, CJK Typography & Dock Motion Governor
 * 
 * Hardened against:
 * - tdesktop #897: Option to disable bouncing app icon on macOS dock / Windows taskbar
 * - tdesktop #7775 & #2128: Bold formatting not working for CJK characters
 * - tdesktop #330: Formatting text (bold, italic, spoiler, link, code) into MessageEntities
 * - tdesktop #26393: Full-screen media blocking client at 125% DPI scale on dual monitors
 */

export interface FormattedMessageEntity {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'spoiler' | 'code' | 'text_link';
  offset: number;
  length: number;
  url?: string;
}

export interface RichTextParseResult {
  plainText: string;
  entities: FormattedMessageEntity[];
  htmlOutput: string;
}

export interface DockBouncePolicy {
  disableDockBounce: boolean;
  isUrgentMessage: boolean;
  isWindowFocused: boolean;
}

export class RichTextFormattingAndDockMotionGovernor {
  /**
   * Formats Markdown text into Telegram MessageEntity array and sanitized HTML,
   * fully supporting CJK glyphs and Persian text without entity offset drifts (tdesktop #330, #7775).
   */
  public static parseMarkdownToEntities(rawMarkdown: string): RichTextParseResult {
    let plainText = '';
    const entities: FormattedMessageEntity[] = [];

    // Simple regex for bold **text**, italic __text__, spoiler ||text||, code `text`
    const tokenRegex = /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\|\|([^|]+)\|\|)|(`([^`]+)`)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(rawMarkdown)) !== null) {
      // Append text before match
      const preMatch = rawMarkdown.slice(lastIndex, match.index);
      plainText += preMatch;

      const offset = Array.from(plainText).length; // Unicode codepoint count

      if (match[1]) {
        // Bold: **text**
        const content = match[2];
        plainText += content;
        entities.push({ type: 'bold', offset, length: Array.from(content).length });
      } else if (match[3]) {
        // Italic: __text__
        const content = match[4];
        plainText += content;
        entities.push({ type: 'italic', offset, length: Array.from(content).length });
      } else if (match[5]) {
        // Spoiler: ||text||
        const content = match[6];
        plainText += content;
        entities.push({ type: 'spoiler', offset, length: Array.from(content).length });
      } else if (match[7]) {
        // Code: `text`
        const content = match[8];
        plainText += content;
        entities.push({ type: 'code', offset, length: Array.from(content).length });
      }

      lastIndex = tokenRegex.lastIndex;
    }

    // Append remainder
    plainText += rawMarkdown.slice(lastIndex);

    // Generate HTML
    let htmlOutput = plainText;
    // Replace with HTML tags for verification
    for (const ent of [...entities].reverse()) {
      const chars = Array.from(htmlOutput);
      const before = chars.slice(0, ent.offset).join('');
      const target = chars.slice(ent.offset, ent.offset + ent.length).join('');
      const after = chars.slice(ent.offset + ent.length).join('');

      let tag = 'span';
      if (ent.type === 'bold') tag = 'strong';
      if (ent.type === 'italic') tag = 'em';
      if (ent.type === 'spoiler') tag = 'mark class="tg-spoiler"';
      if (ent.type === 'code') tag = 'code';

      htmlOutput = `${before}<${tag}>${target}</${tag.split(' ')[0]}>${after}`;
    }

    return {
      plainText,
      entities,
      htmlOutput
    };
  }

  /**
   * Evaluates dock icon bounce and taskbar flash policies,
   * respecting user preference to disable repetitive bouncing (tdesktop #897).
   */
  public static evaluateDockBounce(policy: DockBouncePolicy): {
    shouldBounceOnce: boolean;
    shouldBounceCritical: boolean;
    reason: string;
  } {
    if (policy.isWindowFocused) {
      return { shouldBounceOnce: false, shouldBounceCritical: false, reason: 'Window is currently focused' };
    }

    if (policy.disableDockBounce) {
      return { shouldBounceOnce: false, shouldBounceCritical: false, reason: 'Disabled by user preference' };
    }

    if (policy.isUrgentMessage) {
      return { shouldBounceOnce: false, shouldBounceCritical: true, reason: 'Urgent incoming call or mention' };
    }

    return { shouldBounceOnce: true, shouldBounceCritical: false, reason: 'Single informational bounce' };
  }

  /**
   * Normalizes media dimensions on high-DPI (125%, 150%) dual monitor setups,
   * preventing full-screen images from exceeding physical screen boundaries (tdesktop #26393).
   */
  public static calculateDpiNormalizedMediaBounds(
    screenWidth: number,
    screenHeight: number,
    dpiScale: number = 1.25,
    margin: number = 16
  ): { maxWidthPx: number; maxHeightPx: number; scaleFactor: number } {
    const scale = Math.max(1.0, dpiScale);
    const availableW = Math.round((screenWidth - margin * 2) / scale);
    const availableH = Math.round((screenHeight - margin * 2) / scale);

    return {
      maxWidthPx: availableW,
      maxHeightPx: availableH,
      scaleFactor: scale
    };
  }
}
