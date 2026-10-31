/**
 * Rich Text Composer, Multiline Blockquotes & Clipboard Formatting Governor
 *
 * Hardened against competitor issues:
 * - telegramdesktop/tdesktop #2847: Support rich formatting (bold, italic, spoiler, quote, link) in composer UI
 * - morethanwords/tweb #453: Multiline pasted text formatted as quotation creates single cohesive blockquote
 * - morethanwords/tweb #82: Clear all formatting button from selected text
 * - morethanwords/tweb #367: Dead-key and compose-key character composition handling
 * - Ajaxy/telegram-tt #482: HTML formatting lost when pasting from external websites
 * - Ajaxy/telegram-tt #367: Undo / redo doesn't work after pasting text
 * - Ajaxy/telegram-tt #363: Crash when pressing erase/backspace on empty input field (0 chars bounds guard)
 * - kotatogram/kotatogram-desktop #325: Inline markdown links [text](url) syntax parsing and validation
 */

export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'pre'
  | 'spoiler'
  | 'quote'
  | 'link';

export interface SelectionRange {
  start: number;
  end: number;
}

export interface ComposerState {
  text: string;
  selection: SelectionRange;
}

export class RichTextComposerAndClipboardGovernor {
  private history: ComposerState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 100;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Pushes current state into undo history stack (Ajaxy #367)
   */
  public pushState(text: string, selection: SelectionRange = { start: text.length, end: text.length }): void {
    // Truncate redo stack if new change occurs
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push({ text, selection: { ...selection } });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  public undo(): ComposerState | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return { ...this.history[this.historyIndex] };
    }
    return null;
  }

  public redo(): ComposerState | null {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return { ...this.history[this.historyIndex] };
    }
    return null;
  }

  /**
   * Applies formatting tags to selected text range (TDesktop #2847, Kotatogram #325, morethanwords #453)
   */
  public applyFormatting(
    text: string,
    range: SelectionRange,
    format: FormatType,
    url?: string
  ): { text: string; newRange: SelectionRange } {
    const start = Math.min(range.start, range.end);
    const end = Math.max(range.start, range.end);
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let formattedSelected = selected;
    let prefix = '';
    let suffix = '';

    switch (format) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        break;
      case 'italic':
        prefix = '__';
        suffix = '__';
        break;
      case 'strikethrough':
        prefix = '~~';
        suffix = '~~';
        break;
      case 'underline':
        prefix = '<u>';
        suffix = '</u>';
        break;
      case 'code':
        prefix = '`';
        suffix = '`';
        break;
      case 'pre':
        prefix = '```\n';
        suffix = '\n```';
        break;
      case 'spoiler':
        prefix = '||';
        suffix = '||';
        break;
      case 'link': {
        const cleanUrl = (url || 'https://').trim();
        prefix = '[';
        suffix = `](${cleanUrl})`;
        break;
      }
      case 'quote': {
        // Cohesive multiline quotation support (morethanwords #453)
        // If multiline, prefix every line with '> ' rather than separating
        const lines = selected.split('\n');
        formattedSelected = lines.map(line => (line.startsWith('> ') ? line : `> ${line}`)).join('\n');
        prefix = '';
        suffix = '';
        break;
      }
    }

    const newText = before + prefix + formattedSelected + suffix + after;
    const newStart = start + prefix.length;
    const newEnd = newStart + formattedSelected.length;

    this.pushState(newText, { start: newStart, end: newEnd });
    return { text: newText, newRange: { start: newStart, end: newEnd } };
  }

  /**
   * Strips all markdown/HTML formatting from selected range (morethanwords #82)
   */
  public clearFormatting(text: string, range: SelectionRange): { text: string; newRange: SelectionRange } {
    const start = Math.min(range.start, range.end);
    const end = Math.max(range.start, range.end);
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    // Strip formatting tags: **, __, ~~, ||, `, ```, [text](url), <u>, </u>, >
    let stripped = selected
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/\|\|([^|]+)\|\|/g, '$1')
      .replace(/```([^`]+)```/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<\/?u>/g, '')
      .replace(/^>\s?/gm, '');

    const newText = before + stripped + after;
    const newRange = { start, end: start + stripped.length };
    this.pushState(newText, newRange);
    return { text: newText, newRange };
  }

  /**
   * Converts pasted clipboard HTML to clean Telegram markdown (Ajaxy #482)
   */
  public parseHtmlToMarkdown(html: string): string {
    if (!html || typeof html !== 'string') return '';

    let res = html;

    // Remove scripts and styles
    res = res.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    res = res.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Convert blockquotes (morethanwords #453)
    res = res.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, content) => {
      const inner = content.trim().replace(/<br\s*\/?>/gi, '\n');
      const lines = inner.split('\n');
      return '\n' + lines.map((l: string) => `> ${l.trim()}`).join('\n') + '\n';
    });

    // Code blocks
    res = res.replace(/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```');
    res = res.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```');
    res = res.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

    // Bold / Strong
    res = res.replace(/<(b|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');

    // Italic / Em
    res = res.replace(/<(i|em)\b[^>]*>([\s\S]*?)<\/\1>/gi, '__$2__');

    // Strikethrough / Del
    res = res.replace(/<(s|del|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');

    // Underline
    res = res.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, '<u>$1</u>');

    // Links (Kotatogram #325)
    res = res.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

    // Line breaks and paragraphs
    res = res.replace(/<br\s*\/?>/gi, '\n');
    res = res.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

    // Strip remaining tags
    res = res.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    res = res
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    return res.trim();
  }

  /**
   * Safe backspace / erase handling with zero-length bounds guard (Ajaxy #363)
   */
  public handleBackspace(
    text: string,
    cursorPos: number
  ): { text: string; newCursorPos: number; changed: boolean } {
    // 0-character bounds protection
    if (!text || text.length === 0 || cursorPos <= 0) {
      return { text: text || '', newCursorPos: 0, changed: false };
    }

    const before = text.substring(0, cursorPos - 1);
    const after = text.substring(cursorPos);
    const newText = before + after;
    const newPos = Math.max(0, cursorPos - 1);

    this.pushState(newText, { start: newPos, end: newPos });
    return { text: newText, newCursorPos: newPos, changed: true };
  }

  /**
   * Normalizes decomposed accents / dead-keys into precomposed NFC (morethanwords #367)
   */
  public normalizeCompositionText(input: string): string {
    if (!input) return '';
    return input.normalize('NFC');
  }
}

export const richTextComposerAndClipboardGovernor = new RichTextComposerAndClipboardGovernor();
