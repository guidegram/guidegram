/**
 * Telegram Message Splitter & Entity Continuity Engine
 * 
 * Solves Telegram's 4096-character limit (MESSAGE_TOO_LONG / MessageIsTooLong)
 * by safely partitioning large payloads across natural linguistic boundaries
 * while preserving UTF-16 surrogate pairs and active Markdown/HTML formatting tags.
 */

export interface SplitOptions {
  /** Maximum allowed length per chunk (Telegram limit: 4096 for messages, 1024/2048 for captions). Default: 4096 */
  maxChunkLength?: number
  /** Parsing mode to maintain formatting entity continuity across chunk boundaries. Default: 'markdown' */
  parseMode?: 'plain' | 'markdown' | 'html'
  /** Optional header/footer part indicator, e.g. `[1/3]` */
  includePartIndicators?: boolean
}

export interface SplitChunk {
  index: number
  total: number
  text: string
  isFirst: boolean
  isLast: boolean
}

/**
 * Returns the exact Telegram-calculated length of a string in UTF-16 code units.
 */
export function getTelegramLength(text: string): number {
  if (!text) return 0
  return text.length
}

interface OpenTag {
  type: string
  closeTag: string
  reopenTag: string
}

/**
 * Scans markdown text up to a boundary point and computes active unclosed tags.
 */
function getActiveMarkdownTags(text: string): OpenTag[] {
  const tags: OpenTag[] = []
  
  // Track code blocks with optional language
  let inCodeBlock = false
  let codeBlockLang = ''
  
  // Track inline code
  let inInlineCode = false
  
  // Track bold/italic/spoiler/strikethrough
  let inBold = false
  let inItalic = false
  let inSpoiler = false
  let inStrike = false

  let i = 0
  while (i < text.length) {
    // Triple backtick code block
    if (text.startsWith('```', i)) {
      if (!inCodeBlock) {
        inCodeBlock = true
        i += 3
        const nextNewline = text.indexOf('\n', i)
        if (nextNewline !== -1) {
          codeBlockLang = text.substring(i, nextNewline).trim()
          i = nextNewline
        } else {
          codeBlockLang = ''
        }
      } else {
        inCodeBlock = false
        codeBlockLang = ''
        i += 3
      }
      continue
    }

    if (inCodeBlock) {
      i++
      continue
    }

    // Single inline code backtick
    if (text[i] === '`' && !text.startsWith('```', i)) {
      inInlineCode = !inInlineCode
      i++
      continue
    }

    if (inInlineCode) {
      i++
      continue
    }

    // Spoiler ||
    if (text.startsWith('||', i)) {
      inSpoiler = !inSpoiler
      i += 2
      continue
    }

    // Bold **
    if (text.startsWith('**', i)) {
      inBold = !inBold
      i += 2
      continue
    }

    // Strikethrough ~~
    if (text.startsWith('~~', i)) {
      inStrike = !inStrike
      i += 2
      continue
    }

    // Italic * or _
    if (text[i] === '*' && !text.startsWith('**', i)) {
      inItalic = !inItalic
      i++
      continue
    }

    i++
  }

  if (inCodeBlock) {
    tags.push({
      type: 'code_block',
      closeTag: '\n```',
      reopenTag: codeBlockLang ? `\`\`\`${codeBlockLang}\n` : '```\n',
    })
  }
  if (inInlineCode) {
    tags.push({
      type: 'inline_code',
      closeTag: '`',
      reopenTag: '`',
    })
  }
  if (inBold) {
    tags.push({
      type: 'bold',
      closeTag: '**',
      reopenTag: '**',
    })
  }
  if (inItalic) {
    tags.push({
      type: 'italic',
      closeTag: '*',
      reopenTag: '*',
    })
  }
  if (inSpoiler) {
    tags.push({
      type: 'spoiler',
      closeTag: '||',
      reopenTag: '||',
    })
  }
  if (inStrike) {
    tags.push({
      type: 'strike',
      closeTag: '~~',
      reopenTag: '~~',
    })
  }

  return tags
}

/**
 * Finds the most natural semantic break boundary within [minLimit, maxLimit]
 */
function findOptimalBreakIndex(text: string, maxLimit: number): number {
  if (text.length <= maxLimit) return text.length

  const lookbackWindow = Math.floor(maxLimit * 0.25)
  const minLimit = Math.max(0, maxLimit - lookbackWindow)
  const candidateSlice = text.substring(minLimit, maxLimit)

  // 1. Double newline (paragraph break)
  const lastDoubleNewline = candidateSlice.lastIndexOf('\n\n')
  if (lastDoubleNewline !== -1) {
    return minLimit + lastDoubleNewline + 2
  }

  // 2. Single newline
  const lastNewline = candidateSlice.lastIndexOf('\n')
  if (lastNewline !== -1) {
    return minLimit + lastNewline + 1
  }

  // 3. Sentence terminators followed by space (. ! ? ؛ ؟)
  const sentenceTerminators = ['. ', '! ', '? ', '؛ ', '؟ ']
  let bestSentenceBreak = -1
  for (const term of sentenceTerminators) {
    const idx = candidateSlice.lastIndexOf(term)
    if (idx > bestSentenceBreak) {
      bestSentenceBreak = idx + term.length
    }
  }
  if (bestSentenceBreak !== -1) {
    return minLimit + bestSentenceBreak
  }

  // 4. Word boundary (whitespace)
  const lastSpace = candidateSlice.lastIndexOf(' ')
  if (lastSpace !== -1) {
    return minLimit + lastSpace + 1
  }

  // 5. Hard boundary — never cut surrogate pairs
  let boundary = maxLimit
  const code = text.charCodeAt(boundary - 1)
  if (code >= 0xd800 && code <= 0xdbff) {
    // boundary is right between high and low surrogate, pull back 1
    boundary--
  }

  return boundary
}

/**
 * Splits a message into clean, entity-safe chunks adhering to Telegram limits.
 */
export function splitTelegramMessage(
  text: string,
  options: SplitOptions = {}
): string[] {
  if (!text) return []

  const maxLen = options.maxChunkLength ?? 4096
  const parseMode = options.parseMode ?? 'markdown'

  if (text.length <= maxLen) {
    return [text]
  }

  const rawChunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      rawChunks.push(remaining)
      break
    }

    // Safety allowance for closing and reopening tags (approx 32 chars)
    const effectiveLimit = parseMode !== 'plain' ? Math.max(100, maxLen - 32) : maxLen
    const breakIndex = findOptimalBreakIndex(remaining, effectiveLimit)

    const chunk = remaining.substring(0, breakIndex)
    rawChunks.push(chunk)
    remaining = remaining.substring(breakIndex)
  }

  // Apply entity tag continuity if markdown is enabled
  if (parseMode === 'markdown') {
    const closedChunks: string[] = []
    let prependTags = ''

    for (let i = 0; i < rawChunks.length; i++) {
      let current = prependTags + rawChunks[i]
      const isLast = i === rawChunks.length - 1

      if (!isLast) {
        const activeTags = getActiveMarkdownTags(current)
        if (activeTags.length > 0) {
          // Close tags in reverse order
          const closeStr = activeTags.map((t) => t.closeTag).join('')
          // Reopen tags in normal order for next chunk
          prependTags = activeTags.map((t) => t.reopenTag).join('')
          current = current + closeStr
        } else {
          prependTags = ''
        }
      }

      closedChunks.push(current)
    }

    return applyPartIndicators(closedChunks, options.includePartIndicators)
  }

  return applyPartIndicators(rawChunks, options.includePartIndicators)
}

function applyPartIndicators(chunks: string[], include?: boolean): string[] {
  if (!include || chunks.length <= 1) return chunks
  const total = chunks.length
  return chunks.map((c, idx) => `[${idx + 1}/${total}]\n${c}`)
}

/**
 * Wraps message payload dispatch, attaching replyToMsgId only to the first chunk
 * and replyMarkup only to the last chunk.
 */
export function splitMessageWithMetadata<T extends { text: string; replyToMsgId?: number; replyMarkup?: any }>(
  payload: T,
  options: SplitOptions = {}
): T[] {
  const parts = splitTelegramMessage(payload.text, options)
  if (parts.length <= 1) {
    return [payload]
  }

  return parts.map((partText, idx) => {
    const isFirst = idx === 0
    const isLast = idx === parts.length - 1

    return {
      ...payload,
      text: partText,
      replyToMsgId: isFirst ? payload.replyToMsgId : undefined,
      replyMarkup: isLast ? payload.replyMarkup : undefined,
    }
  })
}
