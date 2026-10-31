/**
 * CodeSyntaxAndNotificationSilencer (Phase 6: Horizon 1 - Syntax Highlighting & Notification Hygiene)
 * 
 * Directly resolves high-impact competitor issues:
 * - tdesktop #250 (742 reactions): Automatically Syntax-Highlight received Code blocks
 * - tdesktop #964 (312 reactions): Option to ignore 'Contact joined Telegram' notifications
 * - tdesktop #27772 (115 reactions): Support Quotes using Telegram Markdown syntax
 */

export interface TokenizedCodeSnippet {
  language: string;
  highlightedHtml: string;
  rawText: string;
}

export interface NotificationHygieneTelemetry {
  codeBlocksHighlighted: number;
  contactJoinedSilenced: number;
  quotesParsed: number;
}

export class CodeSyntaxAndNotificationSilencer {
  private static instance: CodeSyntaxAndNotificationSilencer | null = null;

  private silenceContactJoined: boolean = true; // Enabled by default to silence annoying notifications

  // Telemetry
  private highlightedCount: number = 0;
  private silencedCount: number = 0;
  private quotesCount: number = 0;

  // Keyword sets for zero-dependency syntax highlighter
  private static readonly KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'import', 'export', 'from',
    'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
    'class', 'extends', 'interface', 'type', 'async', 'await', 'try', 'catch',
    'def', 'print', 'self', 'class', 'elif', 'lambda', 'with', 'as',
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'GROUP', 'BY',
    'pub', 'fn', 'struct', 'impl', 'mut', 'match', 'enum',
  ]);

  private constructor() {}

  public static getInstance(): CodeSyntaxAndNotificationSilencer {
    if (!this.instance) {
      this.instance = new CodeSyntaxAndNotificationSilencer();
    }
    return this.instance;
  }

  /**
   * Fast, linear O(N) zero-dependency syntax highlighter (resolves #250).
   * Safe against ReDoS and memory spikes.
   */
  public highlightCode(rawCode: string, suggestedLang: string = 'text'): TokenizedCodeSnippet {
    this.highlightedCount++;
    if (!rawCode || typeof rawCode !== 'string') {
      return { language: suggestedLang, highlightedHtml: '', rawText: '' };
    }

    // Escape raw HTML entities
    const escaped = rawCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Single-pass tokenizer to guarantee zero cross-tag mutation
    const tokenRegex = /(\/\/[^\n]*|#[^\n]*)|(&quot;.*?&quot;|&#39;.*?&#39;|"[^"\n]*"|'[^'\n]*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*\b)/g;
    const highlighted = escaped.replace(tokenRegex, (match, comment, str, num, word) => {
      if (comment) return `<span class="syntax-comment">${comment}</span>`;
      if (str) return `<span class="syntax-string">${str}</span>`;
      if (num) return `<span class="syntax-number">${num}</span>`;
      if (word && CodeSyntaxAndNotificationSilencer.KEYWORDS.has(word)) {
        return `<span class="syntax-keyword">${word}</span>`;
      }
      return match;
    });

    return {
      language: suggestedLang,
      highlightedHtml: `<pre class="guidegram-code-block" data-lang="${suggestedLang}"><code>${highlighted}</code></pre>`,
      rawText: rawCode,
    };
  }

  /**
   * Filters out annoying "Contact joined Telegram" service notifications (resolves #964).
   */
  public shouldSilenceNotification(message: { text?: string; actionType?: string }): boolean {
    if (!this.silenceContactJoined) return false;

    // Check service message action
    if (message.actionType === 'contact_registered') {
      this.silencedCount++;
      return true;
    }

    // Check localized text patterns
    const t = (message.text || '').toLowerCase().trim();
    if (
      t.includes('joined telegram') ||
      t.includes('به تلگرام پیوست') ||
      t.includes('به تلگرام پیوست!') ||
      t.includes('присоединился к telegram') ||
      t.includes('joined guidegram')
    ) {
      this.silencedCount++;
      return true;
    }

    return false;
  }

  public setSilenceContactJoined(enabled: boolean): void {
    this.silenceContactJoined = enabled;
  }

  public getSilenceContactJoined(): boolean {
    return this.silenceContactJoined;
  }

  /**
   * Parses standard Telegram Markdown blockquotes (resolves #27772).
   */
  public parseMarkdownQuotes(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') return '';
    this.quotesCount++;

    const lines = markdown.split('\n');
    const result: string[] = [];
    let inQuote = false;
    let quoteLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('&gt;') || line.startsWith('>')) {
        inQuote = true;
        quoteLines.push(line.replace(/^(&gt;|>)\s?/, ''));
      } else {
        if (inQuote) {
          result.push(`<blockquote class="guidegram-quote">${quoteLines.join('<br/>')}</blockquote>`);
          quoteLines = [];
          inQuote = false;
        }
        result.push(line);
      }
    }

    if (inQuote) {
      result.push(`<blockquote class="guidegram-quote">${quoteLines.join('<br/>')}</blockquote>`);
    }

    return result.join('\n');
  }

  public getTelemetry(): NotificationHygieneTelemetry {
    return {
      codeBlocksHighlighted: this.highlightedCount,
      contactJoinedSilenced: this.silencedCount,
      quotesParsed: this.quotesCount,
    };
  }
}

export const codeSyntaxAndNotificationSilencer = CodeSyntaxAndNotificationSilencer.getInstance();
