/**
 * telegramErrorTracer.ts
 * 
 * Asynchronous Call-Site Stack Tracer & Telegram Error Enricher.
 * Directly addresses high-impact competitor issue:
 * - telegraf/telegraf #2058: Improve error tracing in TelegramError for debugging purposes
 * 
 * The Problem:
 * In asynchronous Node.js and TypeScript architectures, HTTP/RPC requests resolve inside the
 * event loop microtask queue long after the calling function's stack has unwound.
 * When Telegram returns an API error (e.g. 400 BUTTON_USER_PRIVACY_RESTRICTED or 403 BOT_BLOCKED),
 * creating `new TelegramError()` in the network response callback produces a useless stack trace:
 *   TelegramError: 400: Bad Request
 *       at new TelegramError (node_modules/telegraf/lib/core/network/error.js:6:9)
 *       at /node_modules/telegraf/lib/core/network/client.js:315:19
 * Developers cannot correlate the error with the application code where `ctx.reply()` or
 * `sendMessage()` was originally invoked.
 * 
 * Features:
 * 1. Synchronous Call-Site Capturing:
 *    - Captures caller stack trace at the exact moment the API method is invoked.
 * 2. Zero-Cost Lazy Stack Stitching:
 *    - Uses a lazy V8 stack getter (`Object.defineProperty`) so string concatenation and regex
 *      filtering ONLY occur if the error stack is accessed or logged.
 * 3. Library Noise Suppression:
 *    - Filters internal framework/networking frames (telegraf/node_modules/fetch/client.js)
 *      to keep the developer's application code front and center.
 * 4. Context & Payload Redaction:
 *    - Automatically redacts sensitive fields (`bot_token`, `password`, `phone_number`)
 *      while preserving method and chat context for debugging.
 */

export interface TraceContext {
  method: string;
  parameters?: Record<string, unknown>;
  timestamp: number;
}

export class EnrichedTelegramError extends Error {
  public readonly code: number;
  public readonly description: string;
  public readonly method?: string;
  public readonly parameters?: Record<string, unknown>;
  public readonly isEnriched = true;

  constructor(
    code: number,
    description: string,
    captureError?: Error,
    context?: TraceContext
  ) {
    const message = `Telegram API Error [${code}]: ${description}${context?.method ? ` (during ${context.method})` : ''}`;
    super(message);
    this.name = 'EnrichedTelegramError';
    this.code = code;
    this.description = description;
    this.method = context?.method;
    this.parameters = context?.parameters ? this.redactSensitive(context.parameters) : undefined;

    if (captureError) {
      this.attachLazyStitchedStack(captureError);
    }
  }

  private attachLazyStitchedStack(captureError: Error): void {
    const rawNetworkStack = this.stack || '';
    let cachedStack: string | null = null;

    Object.defineProperty(this, 'stack', {
      configurable: true,
      enumerable: false,
      get: () => {
        if (cachedStack !== null) {
          return cachedStack;
        }
        cachedStack = this.stitchStacks(rawNetworkStack, captureError.stack || '');
        return cachedStack;
      },
      set: (val: string) => {
        cachedStack = val;
      },
    });
  }

  private stitchStacks(networkStack: string, callerStack: string): string {
    const header = `${this.name}: ${this.message}`;

    // Extract first frame of network stack (error constructor)
    const networkLines = networkStack.split('\n').slice(1);
    const cleanNetworkLines = networkLines.filter(
      (line) => !line.includes('node_modules') && !line.includes('telegramErrorTracer')
    );

    // Extract caller lines (skipping our capture frame)
    const callerLines = callerStack.split('\n').slice(1);
    const cleanCallerLines = callerLines.filter(
      (line) => !line.includes('telegramErrorTracer') && !line.includes('attachLazyStitchedStack')
    );

    const merged = [
      header,
      ...cleanNetworkLines,
      '    --- [Async Telegram API Boundary] ---',
      ...cleanCallerLines,
    ];

    return merged.join('\n');
  }

  private redactSensitive(params: Record<string, unknown>): Record<string, unknown> {
    const SENSITIVE_KEYS = ['token', 'bot_token', 'password', 'secret', 'phone_number', 'auth_key'];
    const redacted: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(params)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        redacted[key] = this.redactSensitive(val as Record<string, unknown>);
      } else {
        redacted[key] = val;
      }
    }

    return redacted;
  }
}

export class TelegramErrorTracer {
  private static instance: TelegramErrorTracer | null = null;

  private constructor() {}

  public static getInstance(): TelegramErrorTracer {
    if (!this.instance) {
      this.instance = new TelegramErrorTracer();
    }
    return this.instance;
  }

  /**
   * Captures the current synchronous call site before launching an async API call.
   */
  public captureCallSite(): Error {
    const capture = new Error();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(capture, this.captureCallSite);
    }
    return capture;
  }

  /**
   * Wraps an async Telegram API call with automatic stack-stitching on failure.
   */
  public async traceApiCall<T>(
    method: string,
    params: Record<string, unknown> | undefined,
    apiAction: () => Promise<T>
  ): Promise<T> {
    const capture = this.captureCallSite();
    const context: TraceContext = {
      method,
      parameters: params,
      timestamp: Date.now(),
    };

    try {
      return await apiAction();
    } catch (err: any) {
      const code = err?.code || err?.response?.error_code || 400;
      const desc = err?.description || err?.message || 'Unknown API rejection';
      throw new EnrichedTelegramError(code, desc, capture, context);
    }
  }
}

export const telegramErrorTracer = TelegramErrorTracer.getInstance();
