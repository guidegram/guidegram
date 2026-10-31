import { timingSafeEqual } from 'node:crypto';

/**
 * Guidegram Security Sandbox, XSS Sanitization & Strict Webview Isolation Governor
 * 
 * Hardened against competitor issues:
 * - AyuGram #259: Lottie / sticker JSON deserialization vulnerability and prototype pollution
 * - TDesktop-x64 #220: Unsafe webview execution and missing iframe sandbox constraints
 * - tweb #16: 2FA / password verification timing side-channel vulnerabilities
 * - TDesktop-x64 #206: Account limit bounds enforcement and graceful overflow handling
 */

export interface LottieValidationResult {
  isValid: boolean;
  sanitizedJson?: string;
  error?: string;
}

export interface WebviewSandboxConfig {
  sandboxAttribute: string;
  contentSecurityPolicy: string;
  allowCamera: boolean;
  allowMicrophone: boolean;
}

export class SecuritySandboxAndWebviewIsolationGovernor {
  private static readonly MAX_LOTTIE_LAYERS = 500;
  private static readonly MAX_LOTTIE_FRAMES = 1800;
  private static readonly MAX_ACCOUNT_SLOTS = 16;

  /**
   * Sanitizes animated sticker JSON to prevent prototype pollution and DoS crashes (AyuGram #259).
   */
  public static validateAndSanitizeLottieJson(rawJson: string): LottieValidationResult {
    if (!rawJson || rawJson.trim() === '') {
      return { isValid: false, error: 'Empty JSON payload' };
    }

    // Check for prototype pollution tokens before parsing
    if (/"(?:__proto__|constructor|prototype)"\s*:/i.test(rawJson)) {
      return { isValid: false, error: 'Prototype pollution detected in Lottie payload.' };
    }

    try {
      const parsed = JSON.parse(rawJson);

      // Verify layer bounds
      if (Array.isArray(parsed.layers) && parsed.layers.length > this.MAX_LOTTIE_LAYERS) {
        return { isValid: false, error: `Excessive layer count (${parsed.layers.length} > ${this.MAX_LOTTIE_LAYERS})` };
      }

      // Verify frame bounds (op - ip)
      const inFrame = Number(parsed.ip) || 0;
      const outFrame = Number(parsed.op) || 0;
      if (outFrame - inFrame > this.MAX_LOTTIE_FRAMES) {
        return { isValid: false, error: `Excessive frame duration (${outFrame - inFrame} > ${this.MAX_LOTTIE_FRAMES})` };
      }

      return {
        isValid: true,
        sanitizedJson: JSON.stringify(parsed)
      };
    } catch (e: any) {
      return { isValid: false, error: `JSON parse error: ${e.message}` };
    }
  }

  /**
   * Generates strict sandbox flags and CSP headers for embedded Webviews and Mini-Apps (TDesktop-x64 #220).
   */
  public static generateWebviewSandboxConfig(nonce: string, requiresMediaAccess: boolean = false): WebviewSandboxConfig {
    const sandboxFlags = [
      'allow-scripts',
      'allow-same-origin',
      'allow-forms'
      // Strictly omitting allow-top-navigation, allow-modals, allow-popups-to-escape-sandbox
    ];

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'none'"
    ].join('; ');

    return {
      sandboxAttribute: sandboxFlags.join(' '),
      contentSecurityPolicy: csp,
      allowCamera: requiresMediaAccess,
      allowMicrophone: requiresMediaAccess
    };
  }

  /**
   * Constant-time string comparison to prevent timing attacks on token and passcode checks (tweb #16).
   */
  public static constantTimeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Neutralizes stored XSS payloads in rich HTML/SVG content.
   */
  public static sanitizeHtmlString(rawHtml: string): string {
    if (!rawHtml) return '';

    return rawHtml
      // Strip script, style, iframe, object, embed tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      // Strip inline event handlers: onclick, onerror, onload, etc.
      .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      // Strip javascript: URLs
      .replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, 'href="#"');
  }

  /**
   * Enforces account slot upper limit with clear bounds handling (TDesktop-x64 #206).
   */
  public static checkAccountSlotAvailability(currentAccountCount: number): { canAdd: boolean; maxSlots: number; error?: string } {
    if (currentAccountCount >= this.MAX_ACCOUNT_SLOTS) {
      return {
        canAdd: false,
        maxSlots: this.MAX_ACCOUNT_SLOTS,
        error: `Maximum account limit reached (${currentAccountCount}/${this.MAX_ACCOUNT_SLOTS}).`
      };
    }

    return {
      canAdd: true,
      maxSlots: this.MAX_ACCOUNT_SLOTS
    };
  }
}
