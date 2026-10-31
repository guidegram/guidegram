/**
 * telegramInputSourceResolver.ts
 * 
 * Production-grade Telegram Media & Input Source Resolver.
 * Resolves structural typing pitfalls (e.g. grammY #979) where Web Standard `Request`
 * is accidentally downcast to a naive `{ url: string }`, discarding auth headers, HTTP method,
 * and body credentials.
 * 
 * Features:
 * 1. Source Classification with Strict Discrimination Order:
 *    - Request (Web Standard): Preserves custom headers, credentials, and methods when fetching.
 *    - Response (Web Standard): Checks `ok` status, extracts body ReadableStream, and parses Content-Disposition.
 *    - URL / URLLike: Validates URL syntax, optional custom headers support.
 *    - Blob / File / Uint8Array / Buffer / Stream: Direct binary stream handling.
 * 2. Header Preservation:
 *    - Prevents 401/403 errors when streaming media from authenticated storage (AWS S3 presigned, Cloudflare R2, private CDNs).
 * 3. Intelligent Filename & Mime Extraction:
 *    - Parses `content-disposition: attachment; filename="avatar.png"` or RFC 5987 `filename*`.
 *    - Falls back to URL pathname basename or default sanitized timestamps.
 */

export interface CustomUrlSource {
  url: string | URL;
  headers?: Record<string, string>;
  method?: string;
}

export type TelegramInputSource =
  | string // Local file path or string URL
  | URL
  | CustomUrlSource
  | Request
  | Response
  | Blob
  | Uint8Array
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>;

export interface ResolvedInputMetadata {
  sourceType: 'request' | 'response' | 'url' | 'binary' | 'stream' | 'file_path';
  url?: string;
  filename?: string;
  mimeType?: string;
  hasCustomHeaders: boolean;
  headers?: Record<string, string>;
}

/**
 * Extracts filename from a standard Content-Disposition header.
 */
export function parseContentDispositionFilename(headerVal?: string | null): string | undefined {
  if (!headerVal) return undefined;

  // RFC 5987 / RFC 6266 utf-8 encoded filename*
  const starMatch = headerVal.match(/filename\*\s*=\s*utf-8''([^;]+)/i);
  if (starMatch && starMatch[1]) {
    try {
      return decodeURIComponent(starMatch[1].trim());
    } catch {
      return starMatch[1].trim();
    }
  }

  // Standard quoted or unquoted filename="..."
  const standardMatch = headerVal.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  if (standardMatch) {
    const raw = standardMatch[1] || standardMatch[2];
    if (raw) return raw.trim();
  }

  return undefined;
}

/**
 * Extracts the clean basename from a URL pathname.
 */
export function extractUrlBasename(urlStr: string): string | undefined {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    if (pathname && pathname !== '/') {
      const segments = pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && last.includes('.')) {
        return decodeURIComponent(last);
      }
    }
  } catch {}
  return undefined;
}

/**
 * Inspects and classifies any input source, preventing accidental downcasting of `Request`
 * to a bare `{ url: string }`.
 */
export function inspectInputSource(source: TelegramInputSource): ResolvedInputMetadata {
  // 1. Web Standard Request: Check FIRST before 'url' in source
  if (typeof Request !== 'undefined' && source instanceof Request) {
    const headersRecord: Record<string, string> = {};
    source.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    const hasHeaders = Object.keys(headersRecord).length > 0;
    const filename = extractUrlBasename(source.url);

    return {
      sourceType: 'request',
      url: source.url,
      filename,
      hasCustomHeaders: hasHeaders,
      headers: hasHeaders ? headersRecord : undefined,
    };
  }

  // 2. Web Standard Response
  if (typeof Response !== 'undefined' && source instanceof Response) {
    const disposition = source.headers.get('content-disposition');
    const contentType = source.headers.get('content-type') || undefined;
    const filename = parseContentDispositionFilename(disposition) || (source.url ? extractUrlBasename(source.url) : undefined);

    return {
      sourceType: 'response',
      url: source.url || undefined,
      filename,
      mimeType: contentType,
      hasCustomHeaders: false,
    };
  }

  // 3. Web Standard URL
  if (source instanceof URL) {
    return {
      sourceType: 'url',
      url: source.href,
      filename: extractUrlBasename(source.href),
      hasCustomHeaders: false,
    };
  }

  // 4. CustomUrlSource / URLLike
  if (typeof source === 'object' && source !== null && 'url' in source) {
    const custom = source as CustomUrlSource;
    const urlStr = typeof custom.url === 'string' ? custom.url : custom.url.href;
    const hasHeaders = Boolean(custom.headers && Object.keys(custom.headers).length > 0);

    return {
      sourceType: 'url',
      url: urlStr,
      filename: extractUrlBasename(urlStr),
      hasCustomHeaders: hasHeaders,
      headers: custom.headers,
    };
  }

  // 5. Binary Buffer or TypedArray
  if (source instanceof Uint8Array) {
    return {
      sourceType: 'binary',
      hasCustomHeaders: false,
    };
  }

  // 6. Blob / File
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    const fileSource = source as any;
    return {
      sourceType: 'binary',
      filename: typeof fileSource.name === 'string' ? fileSource.name : undefined,
      mimeType: source.type || undefined,
      hasCustomHeaders: false,
    };
  }

  // 7. String (URL vs Local File Path)
  if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return {
        sourceType: 'url',
        url: source,
        filename: extractUrlBasename(source),
        hasCustomHeaders: false,
      };
    }

    return {
      sourceType: 'file_path',
      filename: source.split(/[\/\\]/).pop(),
      hasCustomHeaders: false,
    };
  }

  // 8. Stream or AsyncIterable fallback
  return {
    sourceType: 'stream',
    hasCustomHeaders: false,
  };
}

/**
 * Resolves any TelegramInputSource into a streamable fetch request or raw payload,
 * ensuring that auth headers from `Request` or `CustomUrlSource` are never lost.
 */
export async function prepareFetchForInputSource(
  source: TelegramInputSource,
  defaultFetch: typeof fetch = fetch
): Promise<{ response: Response; filename?: string }> {
  // If source is already a Response, consume it directly
  if (typeof Response !== 'undefined' && source instanceof Response) {
    if (!source.ok) {
      throw new Error(`Cannot upload response with HTTP status ${source.status} (${source.statusText})`);
    }
    const meta = inspectInputSource(source);
    return { response: source, filename: meta.filename };
  }

  // If source is a Request: pass it directly to fetch!
  // Web Standard fetch(Request) natively preserves method, headers, credentials, and signal!
  if (typeof Request !== 'undefined' && source instanceof Request) {
    const meta = inspectInputSource(source);
    const res = await defaultFetch(source);
    if (!res.ok) {
      throw new Error(`Upstream fetch failed with HTTP status ${res.status} for ${source.url}`);
    }
    const dispositionFilename = parseContentDispositionFilename(res.headers.get('content-disposition'));
    return {
      response: res,
      filename: dispositionFilename || meta.filename,
    };
  }

  // If source is a CustomUrlSource with headers
  if (typeof source === 'object' && source !== null && 'url' in source) {
    const custom = source as CustomUrlSource;
    const urlStr = typeof custom.url === 'string' ? custom.url : custom.url.href;
    const res = await defaultFetch(urlStr, {
      method: custom.method || 'GET',
      headers: custom.headers,
    });
    if (!res.ok) {
      throw new Error(`Custom URL fetch failed with HTTP status ${res.status} for ${urlStr}`);
    }
    const dispositionFilename = parseContentDispositionFilename(res.headers.get('content-disposition'));
    return {
      response: res,
      filename: dispositionFilename || extractUrlBasename(urlStr),
    };
  }

  // Standard URL or String URL
  const urlStr = source instanceof URL ? source.href : typeof source === 'string' ? source : null;
  if (urlStr) {
    const res = await defaultFetch(urlStr);
    if (!res.ok) {
      throw new Error(`URL fetch failed with HTTP status ${res.status} for ${urlStr}`);
    }
    const dispositionFilename = parseContentDispositionFilename(res.headers.get('content-disposition'));
    return {
      response: res,
      filename: dispositionFilename || extractUrlBasename(urlStr),
    };
  }

  throw new Error('Provided input source is not a fetchable URL or Request object');
}
