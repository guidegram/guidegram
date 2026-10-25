import { InstantViewArticle, InstantViewBlock, InstantViewRichText } from './types'
import { Logger } from './logger'

/**
 * Instant View (IV) Article Renderer & DOM Sanitizer Service
 * Implements Telegram MTProto Instant View Protocol & Safe Sandboxed Reader DOM Sanitization
 */

// Helper to sanitize arbitrary HTML into safe markup
export function sanitizeArticleHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return ''

  return dirtyHtml
    // 1. Remove dangerous executable tags and blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    // 2. Strip inline javascript / data handlers
    .replace(/\s+on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'href="#"')
    .replace(/src\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, 'src=""')
    .replace(/src\s*=\s*(['"])\s*data:text\/html[^'"]*\1/gi, 'src=""')
    // 3. Ensure links have safe attributes
    .replace(/<a\s+(?![^>]*\btarget=)([^>]*?)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>')
    .trim()
}

/**
 * Parse MTProto RichText object into plain string
 */
export function parseRichText(richText: any): string {
  if (!richText) return ''
  if (typeof richText === 'string') return richText

  const type = richText._ || richText.className

  switch (type) {
    case 'richTextPlain':
      return richText.text || ''

    case 'richTextBold':
    case 'richTextItalic':
    case 'richTextUnderline':
    case 'richTextStrike':
    case 'richTextFixed':
    case 'richTextSubscript':
    case 'richTextSuperscript':
    case 'richTextMark':
    case 'richTextPhone':
    case 'richTextAnchor':
      return parseRichText(richText.text)

    case 'richTextUrl':
    case 'richTextEmail':
      return parseRichText(richText.text)

    case 'richTextConcat':
      if (Array.isArray(richText.texts)) {
        return richText.texts.map((t: any) => parseRichText(t)).join('')
      }
      return ''

    default:
      if (richText.text) return parseRichText(richText.text)
      return ''
  }
}

/**
 * Extract structured rich text tokens from MTProto RichText
 */
export function extractRichTextTokens(richText: any): InstantViewRichText[] {
  if (!richText) return []
  if (typeof richText === 'string') {
    return [{ text: richText, type: 'plain' }]
  }

  const type = richText._ || richText.className

  switch (type) {
    case 'richTextPlain':
      return [{ text: richText.text || '', type: 'plain' }]

    case 'richTextBold':
      return [{ text: parseRichText(richText.text), type: 'bold' }]

    case 'richTextItalic':
      return [{ text: parseRichText(richText.text), type: 'italic' }]

    case 'richTextUnderline':
      return [{ text: parseRichText(richText.text), type: 'underline' }]

    case 'richTextStrike':
      return [{ text: parseRichText(richText.text), type: 'strike' }]

    case 'richTextFixed':
      return [{ text: parseRichText(richText.text), type: 'code' }]

    case 'richTextUrl':
      return [{
        text: parseRichText(richText.text),
        type: 'url',
        url: richText.url,
      }]

    case 'richTextEmail':
      return [{
        text: parseRichText(richText.text),
        type: 'email',
        url: `mailto:${richText.email || parseRichText(richText.text)}`,
      }]

    case 'richTextConcat':
      if (Array.isArray(richText.texts)) {
        const tokens: InstantViewRichText[] = []
        for (const t of richText.texts) {
          tokens.push(...extractRichTextTokens(t))
        }
        return tokens
      }
      return []

    default:
      const fallback = parseRichText(richText)
      return fallback ? [{ text: fallback, type: 'plain' }] : []
  }
}

/**
 * Convert MTProto Page object to InstantViewArticle
 */
export function parseMtprotoPageToArticle(url: string, webpage: any): InstantViewArticle | null {
  if (!webpage) return null

  const cachedPage = webpage.cached_page || webpage.cachedPage
  if (!cachedPage) return null

  const blocks: InstantViewBlock[] = []
  const pageBlocks = cachedPage.blocks || []

  for (const block of pageBlocks) {
    const bType = block._ || block.className

    switch (bType) {
      case 'pageBlockTitle':
        blocks.push({
          type: 'title',
          text: parseRichText(block.text),
          richText: extractRichTextTokens(block.text),
        })
        break

      case 'pageBlockSubtitle':
        blocks.push({
          type: 'subtitle',
          text: parseRichText(block.text),
          richText: extractRichTextTokens(block.text),
        })
        break

      case 'pageBlockHeader':
        blocks.push({
          type: 'header',
          text: parseRichText(block.text),
          richText: extractRichTextTokens(block.text),
        })
        break

      case 'pageBlockSubheader':
        blocks.push({
          type: 'subheader',
          text: parseRichText(block.text),
          richText: extractRichTextTokens(block.text),
        })
        break

      case 'pageBlockParagraph':
        blocks.push({
          type: 'paragraph',
          text: parseRichText(block.text),
          richText: extractRichTextTokens(block.text),
        })
        break

      case 'pageBlockPreformatted':
        blocks.push({
          type: 'preformatted',
          text: parseRichText(block.text),
          language: block.language,
        })
        break

      case 'pageBlockBlockquote':
        blocks.push({
          type: 'blockquote',
          text: parseRichText(block.text),
          caption: block.caption ? parseRichText(block.caption) : undefined,
        })
        break

      case 'pageBlockPullquote':
        blocks.push({
          type: 'pullquote',
          text: parseRichText(block.text),
          caption: block.caption ? parseRichText(block.caption) : undefined,
        })
        break

      case 'pageBlockDivider':
        blocks.push({ type: 'divider' })
        break

      case 'pageBlockAuthorDate':
        blocks.push({
          type: 'author_date',
          author: parseRichText(block.author),
          date: block.date,
        })
        break

      case 'pageBlockList':
      case 'pageBlockOrderedList': {
        const isOrdered = bType === 'pageBlockOrderedList'
        const items: (string | InstantViewRichText[])[] = []
        if (Array.isArray(block.items)) {
          for (const it of block.items) {
            const rich = it.text ? extractRichTextTokens(it.text) : (typeof it === 'string' ? [{ text: it, type: 'plain' as const }] : [])
            items.push(rich.length > 0 ? rich : parseRichText(it))
          }
        }
        blocks.push({
          type: 'list',
          ordered: isOrdered,
          items,
        })
        break
      }

      case 'pageBlockPhoto':
        blocks.push({
          type: 'photo',
          caption: block.caption ? parseRichText(block.caption.text) : undefined,
          url: block.url || (webpage.photo ? webpage.photo.url : undefined),
        })
        break

      case 'pageBlockCover':
        if (block.cover) {
          const coverType = block.cover._ || block.cover.className
          if (coverType === 'pageBlockPhoto') {
            blocks.push({
              type: 'photo',
              caption: block.cover.caption ? parseRichText(block.cover.caption.text) : undefined,
              url: block.cover.url || (webpage.photo ? webpage.photo.url : undefined),
            })
          }
        }
        break

      case 'pageBlockTable': {
        const rows: string[][] = []
        if (Array.isArray(block.rows)) {
          for (const r of block.rows) {
            const cells: string[] = []
            if (Array.isArray(r.cells)) {
              for (const c of r.cells) {
                cells.push(parseRichText(c.text || c))
              }
            }
            rows.push(cells)
          }
        }
        blocks.push({
          type: 'table',
          rows,
        })
        break
      }

      default:
        if (block.text) {
          blocks.push({
            type: 'paragraph',
            text: parseRichText(block.text),
          })
        }
        break
    }
  }

  // Determine RTL flag: bit 1 of flags or text script detection
  const isRtl = Boolean(cachedPage.flags & 2) || (blocks.some(b => /[\u0600-\u06FF\u0590-\u05FF]/.test(b.text || '')))

  return {
    url: webpage.url || url,
    webpageId: webpage.id ? String(webpage.id) : undefined,
    siteName: webpage.site_name || webpage.siteName,
    title: webpage.title || (blocks.find(b => b.type === 'title')?.text),
    description: webpage.description,
    author: webpage.author || (blocks.find(b => b.type === 'author_date')?.author),
    publishDate: blocks.find(b => b.type === 'author_date')?.date,
    views: cachedPage.views,
    rtl: isRtl,
    blocks,
  }
}

/**
 * Fallback Reader Mode generator: converts any website preview / HTML into safe structured InstantViewArticle
 */
export function buildReaderFallbackArticle(url: string, htmlContent?: string, meta?: {
  title?: string
  siteName?: string
  description?: string
  author?: string
  image?: string
}): InstantViewArticle {
  const blocks: InstantViewBlock[] = []

  const title = meta?.title || 'Article View'
  blocks.push({ type: 'title', text: title })

  if (meta?.author) {
    blocks.push({ type: 'author_date', author: meta.author, date: Math.floor(Date.now() / 1000) })
  }

  if (meta?.image) {
    blocks.push({ type: 'photo', url: meta.image, caption: meta.title })
  }

  if (htmlContent) {
    const sanitized = sanitizeArticleHtml(htmlContent)
    // Extract simple paragraphs from HTML
    const paragraphRegex = /<(?:p|h[1-6]|li|blockquote)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li|blockquote)>/gi
    let match: RegExpExecArray | null
    let count = 0

    while ((match = paragraphRegex.exec(sanitized)) !== null && count < 60) {
      const rawText = match[1].replace(/<[^>]+>/g, '').trim()
      if (rawText.length > 10) {
        blocks.push({
          type: 'paragraph',
          text: rawText,
        })
        count++
      }
    }

    if (blocks.length <= 3 && meta?.description) {
      blocks.push({ type: 'paragraph', text: meta.description })
    }
  } else if (meta?.description) {
    blocks.push({ type: 'paragraph', text: meta.description })
  }

  const isRtl = /[\u0600-\u06FF\u0590-\u05FF]/.test(title + (meta?.description || ''))

  return {
    url,
    siteName: meta?.siteName || (new URL(url).hostname.replace(/^www\./i, '')),
    title,
    description: meta?.description,
    author: meta?.author,
    rtl: isRtl,
    blocks,
    rawHtmlSanitized: htmlContent ? sanitizeArticleHtml(htmlContent) : undefined,
  }
}
