/**
 * Universal RichMessage & MTProto Layer 180+ Entity Parser
 * Handles conversion and segmentation of rich message blocks, page blocks,
 * message entities, and fallback markdown structures.
 */

import { MessageEntityItem, RichMessagePayload, RichBlock } from '../../electron/telegram/types'
import { isRTL } from './textUtils'

// --- MTProto Layer 180+ PageBlock Contract Definitions ---

export type PageBlockType =
  | 'header'
  | 'subheader'
  | 'paragraph'
  | 'list'
  | 'table'
  | 'photo'
  | 'video'
  | 'embed'
  | 'author_date'
  | 'blockquote'
  | 'pre'
  | 'details'
  | 'divider'
  | 'thinking'

export interface PageTableCell {
  text: string
  isHeader?: boolean
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  colspan?: number
  rowspan?: number
}

export interface PageTableRow {
  cells: PageTableCell[]
}

export interface PageListItem {
  text: string
  checked?: boolean
  checkbox?: boolean
  subBlocks?: ParsedPageBlock[]
}

export interface PageCaption {
  text: string
  credit?: string
}

export interface HeaderBlock {
  type: 'header' | 'subheader'
  text: string
  level?: number
}

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
  entities?: MessageEntityItem[]
}

export interface ListBlock {
  type: 'list'
  ordered?: boolean
  items: PageListItem[]
  reversed?: boolean
  start?: number
}

export interface TableBlock {
  type: 'table'
  title?: string
  bordered?: boolean
  striped?: boolean
  compact?: boolean
  rows: PageTableRow[]
}

export interface PhotoBlock {
  type: 'photo'
  url?: string
  photoId?: string
  caption?: string
  credit?: string
  webpageId?: string
  spoiler?: boolean
  width?: number
  height?: number
}

export interface VideoBlock {
  type: 'video'
  url?: string
  videoId?: string
  caption?: string
  credit?: string
  autoplay?: boolean
  loop?: boolean
  spoiler?: boolean
  width?: number
  height?: number
}

export interface EmbedBlock {
  type: 'embed'
  url?: string
  html?: string
  posterUrl?: string
  posterPhotoId?: string
  caption?: string
  credit?: string
  fullWidth?: boolean
  allowScrolling?: boolean
  width?: number
  height?: number
}

export interface AuthorDateBlock {
  type: 'author_date'
  author: string
  publishedDate?: number
  formattedDate?: string
}

export interface BlockquoteBlock {
  type: 'blockquote'
  text: string
  caption?: string
  collapsed?: boolean
}

export interface PreBlock {
  type: 'pre'
  text: string
  language?: string
}

export interface DetailsBlock {
  type: 'details'
  title: string
  open?: boolean
  blocks: ParsedPageBlock[]
}

export interface DividerBlock {
  type: 'divider'
}

export interface ThinkingBlock {
  type: 'thinking'
  text: string
  collapsed?: boolean
  durationSeconds?: number
}

export type ParsedPageBlock =
  | HeaderBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | PhotoBlock
  | VideoBlock
  | EmbedBlock
  | AuthorDateBlock
  | BlockquoteBlock
  | PreBlock
  | DetailsBlock
  | DividerBlock
  | ThinkingBlock

export interface ParsedRichMessage {
  rtl?: boolean
  blocks: ParsedPageBlock[]
  rawText?: string
}

// --- Entity Tree & Segmentation ---

export interface EntitySegment {
  text: string
  start: number
  end: number
  entities: MessageEntityItem[]
  isRtl: boolean
}

export interface BlockEntityWrapper {
  type: 'blockquote' | 'expandable_blockquote' | 'pre'
  offset: number
  length: number
  language?: string
  collapsed?: boolean
  content: EntitySegment[]
  rawText: string
}

// --- RichText Extraction Helper (Recursive MTProto RichText tree) ---

export function parseRichText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(parseRichText).join('')

  const type = node._ || node.type || ''

  switch (type) {
    case 'textPlain':
    case 'plain':
      return node.text || ''
    case 'textBold':
    case 'bold':
    case 'textItalic':
    case 'italic':
    case 'textUnderline':
    case 'underline':
    case 'textStrike':
    case 'strike':
    case 'textFixed':
    case 'fixed':
    case 'textSubscript':
    case 'textSuperscript':
    case 'textMarked':
    case 'textSpoiler':
    case 'spoiler':
      return parseRichText(node.text)
    case 'textUrl':
    case 'url':
      return parseRichText(node.text) || node.url || ''
    case 'textEmail':
      return parseRichText(node.text) || node.email || ''
    case 'textPhone':
      return parseRichText(node.text) || node.phone || ''
    case 'textConcat':
    case 'concat':
      return Array.isArray(node.texts) ? node.texts.map(parseRichText).join('') : ''
    case 'textCustomEmoji':
    case 'custom_emoji':
      return node.alt || '✨'
    case 'textAnchor':
      return parseRichText(node.text)
    case 'textEmpty':
      return ''
    default:
      if (node.text) return parseRichText(node.text)
      return ''
  }
}

// --- Bank Card Number Formatting & Detection ---

/**
 * Standardizes raw card number into 4-digit grouped format (e.g. "4532 1234 5678 9010")
 */
export function formatBankCardNumber(cardNumber: string): string {
  if (!cardNumber) return ''
  const digits = cardNumber.replace(/\D/g, '')
  if (!digits) return cardNumber
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

/**
 * Auto-detects 13 to 19 digit bank card patterns in text if no explicit entity is sent
 */
export function detectBankCardEntities(text: string): MessageEntityItem[] {
  if (!text) return []
  const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g
  const entities: MessageEntityItem[] = []
  let match: RegExpExecArray | null

  while ((match = cardRegex.exec(text)) !== null) {
    const raw = match[0]
    const digitsOnly = raw.replace(/\D/g, '')
    // Luhn validation check to avoid false positives on random phone numbers / IDs
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19 && isValidLuhn(digitsOnly)) {
      entities.push({
        type: 'bank_card',
        offset: match.index,
        length: raw.length,
      })
    }
  }

  return entities
}

function isValidLuhn(digits: string): boolean {
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10)
    if (alternate) {
      n *= 2
      if (n > 9) n = (n % 10) + 1
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

// --- Format Publish Date ---

export function formatPublishDate(timestamp?: number): string {
  if (!timestamp) return ''
  try {
    const ms = timestamp > 1e11 ? timestamp : timestamp * 1000
    const d = new Date(ms)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(timestamp)
  }
}

// --- Code Language Inference ---

export function detectCodeLanguage(code: string, hintedLang?: string): string {
  if (hintedLang && hintedLang.trim()) {
    return hintedLang.trim().toLowerCase()
  }
  if (!code) return 'code'

  const trimmed = code.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {}
  }
  if (/^<(!DOCTYPE|html|xml|svg|div|span|p)/i.test(trimmed)) return 'html'
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(trimmed)) return 'sql'
  if (/\b(def|class|import\s+[\w.]+|from\s+[\w.]+\s+import)\b/.test(trimmed)) return 'python'
  if (/\b(function|const|let|var|import\s+.*\s+from|export\s+(default\s+)?(function|class|const))\b/.test(trimmed)) {
    return 'javascript'
  }
  if (/\b(interface|type\s+\w+\s*=|enum|as\s+const)\b/.test(trimmed)) return 'typescript'
  if (/\b(fn\s+main|let\s+mut|impl|pub\s+fn)\b/.test(trimmed)) return 'rust'
  if (/\b(package\s+main|func\s+\w+\()/i.test(trimmed)) return 'go'
  if (/^(\$|#|\b(sudo|curl|npm|pnpm|git|docker)\b)/.test(trimmed)) return 'bash'

  return 'code'
}

// --- PageBlock Normalizer ---

export function parsePageBlock(raw: any): ParsedPageBlock | null {
  if (!raw) return null

  // Support both MTProto TL constructors (e.g. pageBlockHeader#bfd064ec) and JSON/camelCase structures
  const constructor = raw._ || raw.type || ''

  switch (constructor) {
    case 'pageBlockHeader':
    case 'header':
      return {
        type: 'header',
        text: parseRichText(raw.text),
        level: raw.level || 1,
      }

    case 'pageBlockSubheader':
    case 'subheader':
      return {
        type: 'subheader',
        text: parseRichText(raw.text),
        level: raw.level || 2,
      }

    case 'pageBlockParagraph':
    case 'paragraph':
      return {
        type: 'paragraph',
        text: parseRichText(raw.text),
        entities: raw.entities,
      }

    case 'pageBlockList':
    case 'pageBlockOrderedList':
    case 'list': {
      const isOrdered = constructor === 'pageBlockOrderedList' || Boolean(raw.ordered)
      const rawItems = Array.isArray(raw.items) ? raw.items : []
      const items: PageListItem[] = rawItems.map((it: any) => {
        if (typeof it === 'string') {
          return { text: it }
        }
        if (it._ === 'pageListItemText' || it.text) {
          return {
            text: parseRichText(it.text),
            checked: Boolean(it.checked),
            checkbox: Boolean(it.checkbox),
          }
        }
        if (it._ === 'pageListItemBlocks' && Array.isArray(it.blocks)) {
          const subBlocks = it.blocks.map(parsePageBlock).filter(Boolean) as ParsedPageBlock[]
          return {
            text: parseRichText(it.text) || '',
            checked: Boolean(it.checked),
            checkbox: Boolean(it.checkbox),
            subBlocks,
          }
        }
        return { text: parseRichText(it) }
      })

      return {
        type: 'list',
        ordered: isOrdered,
        items,
        reversed: Boolean(raw.reversed),
        start: raw.start,
      }
    }

    case 'pageBlockTable':
    case 'table': {
      const rawRows = Array.isArray(raw.rows) ? raw.rows : []
      const rows: PageTableRow[] = rawRows.map((r: any) => {
        const rawCells = Array.isArray(r.cells) ? r.cells : Array.isArray(r) ? r : []
        const cells: PageTableCell[] = rawCells.map((c: any) => {
          if (typeof c === 'string') return { text: c }
          return {
            text: parseRichText(c.text ?? c),
            isHeader: Boolean(c.header || c.isHeader),
            align: c.align_center ? 'center' : c.align_right ? 'right' : c.align || 'left',
            valign: c.valign_middle ? 'middle' : c.valign_bottom ? 'bottom' : c.valign || 'top',
            colspan: c.colspan,
            rowspan: c.rowspan,
          }
        })
        return { cells }
      })

      return {
        type: 'table',
        title: raw.title ? parseRichText(raw.title) : undefined,
        bordered: raw.bordered !== false,
        striped: Boolean(raw.striped),
        compact: Boolean(raw.compact),
        rows,
      }
    }

    case 'pageBlockPhoto':
    case 'photo':
      return {
        type: 'photo',
        url: raw.url,
        photoId: raw.photo_id ? String(raw.photo_id) : raw.photoId ? String(raw.photoId) : undefined,
        caption: raw.caption ? parseRichText(raw.caption.text || raw.caption) : undefined,
        credit: raw.caption?.credit ? parseRichText(raw.caption.credit) : undefined,
        webpageId: raw.webpage_id ? String(raw.webpage_id) : undefined,
        spoiler: Boolean(raw.spoiler),
        width: raw.w || raw.width,
        height: raw.h || raw.height,
      }

    case 'pageBlockVideo':
    case 'video':
      return {
        type: 'video',
        url: raw.url,
        videoId: raw.video_id ? String(raw.video_id) : raw.videoId ? String(raw.videoId) : undefined,
        caption: raw.caption ? parseRichText(raw.caption.text || raw.caption) : undefined,
        credit: raw.caption?.credit ? parseRichText(raw.caption.credit) : undefined,
        autoplay: Boolean(raw.autoplay),
        loop: Boolean(raw.loop),
        spoiler: Boolean(raw.spoiler),
        width: raw.w || raw.width,
        height: raw.h || raw.height,
      }

    case 'pageBlockEmbed':
    case 'pageBlockEmbedPost':
    case 'embed':
      return {
        type: 'embed',
        url: raw.url,
        html: raw.html,
        posterUrl: raw.poster_url || raw.posterUrl,
        posterPhotoId: raw.poster_photo_id ? String(raw.poster_photo_id) : undefined,
        caption: raw.caption ? parseRichText(raw.caption.text || raw.caption) : undefined,
        credit: raw.caption?.credit ? parseRichText(raw.caption.credit) : undefined,
        fullWidth: Boolean(raw.full_width || raw.fullWidth),
        allowScrolling: Boolean(raw.allow_scrolling || raw.allowScrolling),
        width: raw.w || raw.width || 640,
        height: raw.h || raw.height || 360,
      }

    case 'pageBlockAuthorDate':
    case 'author_date':
      return {
        type: 'author_date',
        author: parseRichText(raw.author),
        publishedDate: raw.published_date || raw.publishedDate,
        formattedDate: formatPublishDate(raw.published_date || raw.publishedDate),
      }

    case 'pageBlockBlockquote':
    case 'blockquote':
      return {
        type: 'blockquote',
        text: parseRichText(raw.text),
        caption: raw.caption ? parseRichText(raw.caption) : undefined,
        collapsed: Boolean(raw.collapsed),
      }

    case 'pageBlockPreformatted':
    case 'pre':
      return {
        type: 'pre',
        text: parseRichText(raw.text),
        language: raw.language || 'code',
      }

    case 'pageBlockDetails':
    case 'details': {
      const nestedRaw = Array.isArray(raw.blocks) ? raw.blocks : []
      const blocks = nestedRaw.map(parsePageBlock).filter(Boolean) as ParsedPageBlock[]
      return {
        type: 'details',
        title: parseRichText(raw.title),
        open: Boolean(raw.open),
        blocks,
      }
    }

    case 'pageBlockDivider':
    case 'divider':
      return { type: 'divider' }

    case 'pageBlockThinking':
    case 'thinking':
      return {
        type: 'thinking',
        text: parseRichText(raw.text),
        collapsed: raw.collapsed !== false,
        durationSeconds: raw.duration_seconds || raw.durationSeconds,
      }

    default:
      if (raw.text) {
        return {
          type: 'paragraph',
          text: parseRichText(raw.text),
        }
      }
      return null
  }
}

// --- Universal RichMessage Parser Entry Point ---

export function parseRichMessage(input: any): ParsedRichMessage {
  if (!input) return { blocks: [] }

  // 1. If string is passed, try parsing as JSON or markdown
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return parseRichMessage(parsed)
      } catch {}
    }
    // Fallback: parse as single paragraph or split markdown
    const isMsgRtl = isRTL(trimmed)
    return {
      rtl: isMsgRtl,
      rawText: trimmed,
      blocks: [{ type: 'paragraph', text: trimmed }],
    }
  }

  // 2. Extract blocks array
  const rawBlocks = Array.isArray(input.blocks)
    ? input.blocks
    : Array.isArray(input)
    ? input
    : []

  const parsedBlocks = rawBlocks.map(parsePageBlock).filter(Boolean) as ParsedPageBlock[]

  // Determine global RTL direction
  let rtl = input.rtl
  if (rtl === undefined && parsedBlocks.length > 0) {
    const firstTextBlock = parsedBlocks.find(
      (b) => b.type === 'paragraph' || b.type === 'header' || b.type === 'subheader'
    ) as HeaderBlock | ParagraphBlock | undefined
    if (firstTextBlock && firstTextBlock.text) {
      rtl = isRTL(firstTextBlock.text)
    }
  }

  return {
    rtl: Boolean(rtl),
    blocks: parsedBlocks,
    rawText: input.rawText || (parsedBlocks[0] && 'text' in parsedBlocks[0] ? parsedBlocks[0].text : undefined),
  }
}

// --- Entity Tree Builder with UTF-16 Code Units ---

/**
 * Splits text into non-overlapping segments covering all entity boundaries.
 * Accurately aligns with Telegram MTProto UTF-16 offset & length specification.
 */
export function buildEntitySegments(
  text: string,
  entities?: MessageEntityItem[],
  startRange = 0,
  endRange?: number
): EntitySegment[] {
  if (!text) return []
  const textLen = text.length
  const effectiveEnd = typeof endRange === 'number' ? Math.min(textLen, endRange) : textLen
  const effectiveStart = Math.max(0, Math.min(effectiveEnd, startRange))

  if (effectiveStart >= effectiveEnd) return []

  const allEntities = entities ? [...entities] : []

  // Ensure bank cards are represented if present in plain text
  const cardEntities = detectBankCardEntities(text)
  for (const ce of cardEntities) {
    // Only add if not overlapping with an existing entity
    const overlaps = allEntities.some(
      (e) => Math.max(e.offset, ce.offset) < Math.min(e.offset + e.length, ce.offset + ce.length)
    )
    if (!overlaps) {
      allEntities.push(ce)
    }
  }

  // Filter valid entities within target range
  const relevantEntities = allEntities.filter(
    (e) =>
      typeof e.offset === 'number' &&
      typeof e.length === 'number' &&
      e.length > 0 &&
      e.offset < effectiveEnd &&
      e.offset + e.length > effectiveStart
  )

  // Collect split points
  const points = new Set<number>([effectiveStart, effectiveEnd])
  for (const ent of relevantEntities) {
    const eStart = Math.max(effectiveStart, Math.min(effectiveEnd, ent.offset))
    const eEnd = Math.max(effectiveStart, Math.min(effectiveEnd, ent.offset + ent.length))
    if (eStart > effectiveStart && eStart < effectiveEnd) points.add(eStart)
    if (eEnd > effectiveStart && eEnd < effectiveEnd) points.add(eEnd)
  }

  const sortedPoints = Array.from(points).sort((a, b) => a - b)
  const segments: EntitySegment[] = []

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const pStart = sortedPoints[i]
    const pEnd = sortedPoints[i + 1]
    if (pStart >= pEnd) continue

    const subText = text.slice(pStart, pEnd)
    const activeEnts = relevantEntities.filter(
      (e) => e.offset <= pStart && e.offset + e.length >= pEnd
    )

    segments.push({
      text: subText,
      start: pStart,
      end: pEnd,
      entities: activeEnts,
      isRtl: isRTL(subText),
    })
  }

  return segments
}

// --- Partition Block vs Inline Entities ---

export function partitionEntities(
  text: string,
  entities?: MessageEntityItem[]
): {
  blockWrappers: Array<{
    type: 'blockquote' | 'expandable_blockquote' | 'pre'
    offset: number
    length: number
    language?: string
    collapsed?: boolean
    content: EntitySegment[]
    rawText: string
  }>
  inlineEntities: MessageEntityItem[]
} {
  if (!entities || entities.length === 0) {
    return { blockWrappers: [], inlineEntities: [] }
  }

  const blockEntities = entities
    .filter(
      (e) =>
        typeof e.offset === 'number' &&
        typeof e.length === 'number' &&
        (e.type === 'blockquote' || e.type === 'expandable_blockquote' || e.type === 'pre')
    )
    .sort((a, b) => a.offset - b.offset)

  const inlineEntities = entities.filter(
    (e) => e.type !== 'blockquote' && e.type !== 'expandable_blockquote' && e.type !== 'pre'
  )

  const blockWrappers = blockEntities.map((bEnt) => {
    const bStart = Math.max(0, Math.min(text.length, bEnt.offset))
    const bEnd = Math.max(0, Math.min(text.length, bEnt.offset + bEnt.length))
    const raw = text.slice(bStart, bEnd)
    const segments = buildEntitySegments(text, inlineEntities, bStart, bEnd)

    return {
      type: bEnt.type as 'blockquote' | 'expandable_blockquote' | 'pre',
      offset: bStart,
      length: bEnd - bStart,
      language: bEnt.language,
      collapsed: (bEnt as any).collapsed || bEnt.type === 'expandable_blockquote',
      content: segments,
      rawText: raw,
    }
  })

  return { blockWrappers, inlineEntities }
}
