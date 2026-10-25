import fs from 'fs'
import path from 'path'
import { Readable } from 'node:stream'

// Resilient logger fallback
let Logger: any = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loggerModule = require('./telegram/logger')
  if (loggerModule?.Logger) Logger = loggerModule.Logger
} catch {
  // ESM test runner fallback
}

export interface RangeBounds {
  start: number
  end: number
  chunkSize: number
}

export interface RangeParseResult {
  hasRange: boolean
  isSatisfiable: boolean
  bounds?: RangeBounds
  reason?: string
}

export interface MediaStreamTelemetry {
  totalRequests: number
  rangeRequests: number
  fullRequests: number
  unsatisfiableRanges: number
}

/**
 * MediaStreamValidator (Layer 08 / Layer 11 / RFC 9110)
 * High-Assurance HTTP Range Request Parser & Media Stream Delivery Engine.
 *
 * Implements strict RFC 9110 range parsing, suffix range support (`bytes=-500`),
 * range overflow protection (416 Range Not Satisfiable), safe stream backpressure,
 * and comprehensive MIME type resolution for Telegram media formats.
 */
export class MediaStreamValidator {
  private static totalRequests: number = 0
  private static rangeRequests: number = 0
  private static fullRequests: number = 0
  private static unsatisfiableRanges: number = 0

  private static readonly MIME_MAP: Record<string, string> = {
    // Video
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    // Audio
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg; codecs=opus',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    // Images & Stickers
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.tgs': 'application/x-tgsticker',
    // Documents & App data
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain; charset=utf-8',
    '.zip': 'application/zip',
  }

  /**
   * Resolves appropriate Content-Type header from file extension.
   */
  public static getMimeType(filePath: string): string {
    if (!filePath) return 'application/octet-stream'
    const ext = path.extname(filePath).toLowerCase()
    return this.MIME_MAP[ext] || 'application/octet-stream'
  }

  /**
   * Parses and validates HTTP Range header per RFC 9110 Section 14.1.2.
   */
  public static parseRangeHeader(
    rangeHeader: string | null | undefined,
    totalSize: number
  ): RangeParseResult {
    this.totalRequests++

    if (!rangeHeader || typeof rangeHeader !== 'string') {
      this.fullRequests++
      return { hasRange: false, isSatisfiable: true }
    }

    const trimmed = rangeHeader.trim()
    if (!trimmed.startsWith('bytes=')) {
      this.fullRequests++
      return { hasRange: false, isSatisfiable: true }
    }

    this.rangeRequests++

    // Empty or zero-size files
    if (totalSize <= 0) {
      this.unsatisfiableRanges++
      return { hasRange: true, isSatisfiable: false, reason: 'File is empty' }
    }

    const byteRangeSet = trimmed.slice(6).trim()
    // Multi-range (e.g. bytes=0-10, 20-30) - serve first range for safety
    const firstRange = byteRangeSet.split(',')[0].trim()
    const parts = firstRange.split('-')

    if (parts.length !== 2) {
      this.unsatisfiableRanges++
      return { hasRange: true, isSatisfiable: false, reason: 'Malformed range format' }
    }

    const startRaw = parts[0].trim()
    const endRaw = parts[1].trim()

    let start: number
    let end: number

    if (startRaw === '' && endRaw !== '') {
      // Suffix byte range: bytes=-500 (last 500 bytes)
      const suffixLen = parseInt(endRaw, 10)
      if (isNaN(suffixLen) || suffixLen < 0) {
        this.unsatisfiableRanges++
        return { hasRange: true, isSatisfiable: false, reason: 'Invalid suffix length' }
      }
      start = Math.max(0, totalSize - suffixLen)
      end = totalSize - 1
    } else if (startRaw !== '' && endRaw === '') {
      // Prefix range: bytes=500- (from offset 500 to end)
      start = parseInt(startRaw, 10)
      if (isNaN(start) || start < 0) {
        this.unsatisfiableRanges++
        return { hasRange: true, isSatisfiable: false, reason: 'Invalid start offset' }
      }
      end = totalSize - 1
    } else if (startRaw !== '' && endRaw !== '') {
      // Closed range: bytes=500-999
      start = parseInt(startRaw, 10)
      end = parseInt(endRaw, 10)
      if (isNaN(start) || isNaN(end) || start < 0 || end < 0) {
        this.unsatisfiableRanges++
        return { hasRange: true, isSatisfiable: false, reason: 'Non-numeric range offsets' }
      }
    } else {
      this.unsatisfiableRanges++
      return { hasRange: true, isSatisfiable: false, reason: 'Empty range specifier' }
    }

    // Boundary sanity check (RFC 9110)
    if (start >= totalSize || start > end) {
      this.unsatisfiableRanges++
      return {
        hasRange: true,
        isSatisfiable: false,
        reason: `Range out of bounds: start=${start}, end=${end}, totalSize=${totalSize}`,
      }
    }

    const boundedEnd = Math.min(end, totalSize - 1)
    const chunkSize = boundedEnd - start + 1

    return {
      hasRange: true,
      isSatisfiable: true,
      bounds: {
        start,
        end: boundedEnd,
        chunkSize,
      },
    }
  }

  /**
   * Generates a streaming Response (200, 206, or 416) for a given media file.
   */
  public static async createMediaResponse(
    filePath: string,
    rangeHeader: string | null | undefined
  ): Promise<Response> {
    const stats = await fs.promises.stat(filePath)
    const totalSize = stats.size
    const contentType = this.getMimeType(filePath)

    const parseResult = this.parseRangeHeader(rangeHeader, totalSize)

    // Case 1: Range Not Satisfiable (416)
    if (parseResult.hasRange && !parseResult.isSatisfiable) {
      Logger.warn(`[MediaStreamValidator] Unsatisfiable range request: ${parseResult.reason}`)
      return new Response('Requested Range Not Satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${totalSize}`,
          'Accept-Ranges': 'bytes',
        },
      })
    }

    // Case 2: Partial Content (206)
    if (parseResult.hasRange && parseResult.bounds) {
      const { start, end, chunkSize } = parseResult.bounds
      const nodeStream = fs.createReadStream(filePath, { start, end })
      const webStream = (Readable as any).toWeb ? (Readable as any).toWeb(nodeStream) : (nodeStream as any)

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    // Case 3: Full Content (200)
    const fullStream = fs.createReadStream(filePath)
    const fullWebStream = (Readable as any).toWeb ? (Readable as any).toWeb(fullStream) : (fullStream as any)

    return new Response(fullWebStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  /**
   * Returns diagnostic stream telemetry.
   */
  public static getTelemetry(): MediaStreamTelemetry {
    return {
      totalRequests: this.totalRequests,
      rangeRequests: this.rangeRequests,
      fullRequests: this.fullRequests,
      unsatisfiableRanges: this.unsatisfiableRanges,
    }
  }

  /**
   * Resets telemetry metrics (for test isolation).
   */
  public static resetTelemetry(): void {
    this.totalRequests = 0
    this.rangeRequests = 0
    this.fullRequests = 0
    this.unsatisfiableRanges = 0
  }
}
