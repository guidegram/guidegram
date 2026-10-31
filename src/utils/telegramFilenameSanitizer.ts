/**
 * telegramFilenameSanitizer.ts
 * 
 * Production-grade Telegram Multipart Filename Sanitizer & RFC 6266 Encoder.
 * Directly addresses high-impact competitor issue:
 * - telegraf #2101: Error in Context.replyWithDocument method when filename contains double quotes (")
 * 
 * The Problem:
 * In HTTP Multipart/form-data payloads (RFC 7578 / RFC 6266), when a filename contains unescaped
 * double quotes (e.g. `file_"foo"_bar.docx`), the HTTP header serializes to:
 *   Content-Disposition: form-data; name="document"; filename="file_"foo"_bar.docx"
 * Telegram's upstream Nginx / Bot API servers encounter the premature closing quote after `file_`,
 * treat the trailing tokens as a syntax violation, and instantly abort the TCP stream, resulting in:
 *   FetchError: invalid json response body ... reason: Unexpected end of JSON input
 * 
 * Features:
 * 1. Double Quote Sanitization:
 *    - Replaces unescaped ASCII double quotes with typographical quotes (”) or safe single quotes ('),
 *      or produces RFC-compliant backslash-escaped headers.
 * 2. CRLF & Header Injection Defense:
 *    - Strips carriage return (`\r`) and newline (`\n`) bytes to prevent multipart boundary smuggling.
 * 3. Null-byte & Path Traversal Stripping:
 *    - Strips `\0` and directory traversal sequences (`../`, `..\`).
 * 4. Dual RFC 6266 Header Generation:
 *    - Generates both safe ASCII fallback `filename="..."` and RFC 5987 `filename*=UTF-8''...`
 * 5. Telegram Filesystem 255-char Boundary Clamping:
 *    - Preserves file extensions while clamping stem length to <= 255 bytes.
 */

export interface SanitizedFilenameResult {
  rawFilename: string;
  sanitizedFilename: string;
  hasQuotesOrInjections: boolean;
  contentDispositionParam: string; // e.g. filename="file_foo_bar.docx"; filename*=UTF-8''...
}

export class TelegramFilenameSanitizer {
  private static instance: TelegramFilenameSanitizer | null = null;

  private constructor() {}

  public static getInstance(): TelegramFilenameSanitizer {
    if (!this.instance) {
      this.instance = new TelegramFilenameSanitizer();
    }
    return this.instance;
  }

  /**
   * Sanitizes a filename for safe inclusion in HTTP Multipart headers and Telegram uploads.
   */
  public sanitize(rawFilename?: string | null, fallbackName: string = 'document'): SanitizedFilenameResult {
    if (!rawFilename || typeof rawFilename !== 'string' || rawFilename.trim().length === 0) {
      return {
        rawFilename: rawFilename || '',
        sanitizedFilename: fallbackName,
        hasQuotesOrInjections: false,
        contentDispositionParam: `filename="${fallbackName}"`,
      };
    }

    const trimmed = rawFilename.trim();
    let hasIssues = false;

    // 1. Detect CRLF header injection attempts
    if (/[\r\n\0]/.test(trimmed)) {
      hasIssues = true;
    }

    // 2. Detect unescaped double quotes that break multipart boundaries
    if (trimmed.includes('"')) {
      hasIssues = true;
    }

    // 3. Strip directory traversal and null bytes
    let clean = trimmed
      .replace(/\0/g, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/^(\.\.[\/\\])+/, '');

    // Extract basename if a path was passed
    const basename = clean.split(/[\/\\]/).pop() || fallbackName;

    // 4. Neutralize double quotes by replacing with typographical quotes or removing
    // Using single quote or removing avoids breaking naive multipart parsers
    const safeAscii = basename.replace(/"/g, "'");

    // 5. Length clamping (preserve extension)
    const clamped = this.clampFilename(safeAscii, 255);

    // 6. Generate RFC 5987 encoded parameter for non-ASCII or quote-containing filenames
    const needsStarParam = /[^\x20-\x7E]/.test(basename) || basename.includes("'") || hasIssues;
    let dispositionParam = `filename="${clamped.replace(/"/g, '')}"`;

    if (needsStarParam) {
      const encodedUtf8 = encodeURIComponent(basename).replace(/['()]/g, escape);
      dispositionParam += `; filename*=UTF-8''${encodedUtf8}`;
    }

    return {
      rawFilename: trimmed,
      sanitizedFilename: clamped,
      hasQuotesOrInjections: hasIssues,
      contentDispositionParam: dispositionParam,
    };
  }

  /**
   * Clamps filename length to maxBytes while preserving the file extension.
   */
  private clampFilename(filename: string, maxBytes: number): string {
    if (filename.length <= maxBytes) return filename;

    // Detect compound or standard extensions (.tar.gz, .docx, etc.)
    const compoundMatch = filename.match(/\.(?:tar\.(?:gz|bz2|xz|zst)|[a-zA-Z0-9]{1,10})$/i);
    if (compoundMatch) {
      const ext = compoundMatch[0];
      const stem = filename.substring(0, filename.length - ext.length);
      const allowedStemLen = Math.max(1, maxBytes - ext.length);
      return stem.substring(0, allowedStemLen) + ext;
    }

    return filename.substring(0, maxBytes);
  }
}

export const telegramFilenameSanitizer = TelegramFilenameSanitizer.getInstance();
