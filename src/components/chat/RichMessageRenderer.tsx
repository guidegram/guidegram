/**
 * Universal MTProto Layer 180+ RichMessage & Message Entity Renderer
 * Provides complete entity parity across all chat contexts (bots, DMs, groups, channels)
 * and renders all MTProto PageBlocks (headers, paragraphs, lists, tables, photos, videos, embeds, author-date).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Eye,
  EyeOff,
  Sparkles,
  Code as CodeIcon,
  FileText,
  CheckSquare,
  Square,
  User,
  Clock,
  X,
  Layers,
} from 'lucide-react'
import lottie from 'lottie-web'
import {
  MessageEntityItem,
  RichMessagePayload,
  CustomEmojiPayload,
  MessageItem,
} from '../../../electron/telegram/types'
import { isRTL } from '../../utils/textUtils'
import { copyTextToClipboard } from '../../utils/clipboard'
import {
  parseRichMessage,
  buildEntitySegments,
  detectCodeLanguage,
  formatBankCardNumber,
  formatPublishDate,
  ParsedRichMessage,
  ParsedPageBlock,
  EntitySegment,
  HeaderBlock,
  ParagraphBlock,
  ListBlock,
  TableBlock,
  PhotoBlock,
  VideoBlock,
  EmbedBlock,
  AuthorDateBlock,
  BlockquoteBlock,
  PreBlock,
  DetailsBlock,
  ThinkingBlock,
} from '../../utils/richMessageParser'

// ============================================================================
// 1. Universal Entity Subcomponents
// ============================================================================

/**
 * Interactive Spoiler Span
 * Renders obfuscated text with animated particle/blur veil.
 * Clicking toggles the reveal state with smooth transitions.
 */
export const SpoilerSpan: React.FC<{
  children: React.ReactNode
  className?: string
  initialRevealed?: boolean
}> = ({ children, className = '', initialRevealed = false }) => {
  const [revealed, setRevealed] = useState(initialRevealed)

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        setRevealed((prev) => !prev)
      }}
      title={revealed ? 'Click to hide spoiler' : 'Click to reveal spoiler'}
      className={`relative inline-block rounded-md px-1.5 py-0.5 transition-all duration-300 cursor-pointer select-none ${
        revealed
          ? 'bg-white/10 text-inherit backdrop-blur-none'
          : 'bg-white/15 text-transparent blur-[5px] hover:blur-[3px] shadow-[inset_0_0_8px_rgba(255,255,255,0.2)]'
      } ${className}`}
    >
      <span className={revealed ? 'opacity-100' : 'opacity-0 select-none'}>
        {children}
      </span>
      {!revealed && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/50 text-[10px] font-mono tracking-widest uppercase overflow-hidden"
        >
          <span className="animate-pulse flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 inline-block opacity-70" />
            <span className="text-[9px] font-bold">SPOILER</span>
          </span>
        </span>
      )}
    </span>
  )
}

/**
 * Pre Code Block
 * Renders multi-line code with detected syntax badge and 1-click copy button.
 */
export const PreCodeBlock: React.FC<{
  code: string
  language?: string
  className?: string
}> = ({ code, language, className = '' }) => {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const detectedLang = useMemo(() => {
    return detectCodeLanguage(code, language).toUpperCase()
  }, [code, language])

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyTextToClipboard(code)
    if (ok) {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      className={`my-2 rounded-xl overflow-hidden border border-white/15 bg-black/70 shadow-lg text-xs font-mono select-text transition-all ${className}`}
      dir="ltr"
    >
      {/* Header bar with syntax badge and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.06] border-b border-white/10 select-none text-[11px]">
        <div className="flex items-center gap-1.5 text-accent-cyan font-bold tracking-wider">
          <CodeIcon className="w-3.5 h-3.5" />
          <span>{detectedLang}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'hover:bg-white/10 text-gray-300 hover:text-white border border-transparent'
          }`}
          title="Copy full code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code contents */}
      <pre className="p-3 overflow-x-auto text-accent-cyan leading-relaxed font-mono select-text">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Bank Card Pill
 * Formats credit/debit card numbers with 4-digit spacing and 1-click copy action.
 */
export const BankCardPill: React.FC<{
  rawCardNumber: string
  className?: string
}> = ({ rawCardNumber, className = '' }) => {
  const [copied, setCopied] = useState(false)
  const formatted = useMemo(() => formatBankCardNumber(rawCardNumber), [rawCardNumber])

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const digitsOnly = rawCardNumber.replace(/\D/g, '')
    const ok = await copyTextToClipboard(digitsOnly || rawCardNumber)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [rawCardNumber])

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy card number: ${formatted}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded-lg border font-mono text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 ${
        copied
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
          : 'bg-amber-950/30 border-amber-500/30 text-amber-200 hover:bg-amber-900/40 hover:border-amber-400/50 shadow-sm'
      } ${className}`}
      dir="ltr"
    >
      <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>{formatted}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400 shrink-0 ml-0.5" />
      ) : (
        <Copy className="w-3 h-3 text-amber-300/70 hover:text-amber-200 shrink-0 ml-0.5" />
      )}
    </span>
  )
}

/**
 * Collapsible / Expandable Blockquote
 * Elegant quote block with left accent bar and toggleable view for long texts.
 */
export const CollapsibleBlockquote: React.FC<{
  children: React.ReactNode
  caption?: string
  isRtl?: boolean
  initialCollapsed?: boolean
  className?: string
}> = ({ children, caption, isRtl = false, initialCollapsed = false, className = '' }) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed)

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`my-2 py-1.5 px-3 bg-accent-cyan/10 text-gray-200 relative group/quote transition-all ${
        isRtl
          ? 'border-r-[3px] border-accent-cyan rounded-r-xs rounded-l-xl text-right font-persian'
          : 'border-l-[3px] border-accent-cyan rounded-l-xs rounded-r-xl text-left font-latin'
      } ${collapsed ? 'max-h-24 overflow-hidden' : ''} ${className}`}
    >
      <div className="text-xs leading-relaxed break-words whitespace-pre-wrap select-text">
        {children}
      </div>

      {caption && (
        <div className="mt-1 text-[11px] text-accent-cyan/80 font-medium italic border-t border-accent-cyan/20 pt-0.5">
          — {caption}
        </div>
      )}

      {initialCollapsed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setCollapsed((prev) => !prev)
          }}
          className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-accent-cyan hover:text-cyan-300 cursor-pointer select-none transition-colors ${
            isRtl ? 'mr-auto' : 'ml-auto'
          }`}
        >
          <span>{collapsed ? 'Show more' : 'Show less'}</span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Animated Custom Emoji Renderer
 * Supports Lottie animations, WebM video, and static SVG/PNG icons.
 */
export const CustomEmojiRenderer: React.FC<{
  accountId?: string
  documentId: string
  fallback?: string
  className?: string
}> = ({
  accountId = '',
  documentId,
  fallback,
  className = 'inline-block w-[1.25em] h-[1.25em] align-[-0.2em] object-contain mx-0.5 select-none',
}) => {
  const [payload, setPayload] = useState<CustomEmojiPayload | null>(null)
  const [hasError, setHasError] = useState(false)
  const animContainerRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let active = true
    if (!documentId) return

    if (window.guidegram?.getCustomEmojiData) {
      window.guidegram
        .getCustomEmojiData(accountId, documentId)
        .then((res) => {
          if (active && res) setPayload(res)
        })
        .catch(() => {})
    } else if (window.guidegram?.getCustomEmojiUrl) {
      window.guidegram
        .getCustomEmojiUrl(accountId, documentId)
        .then((url) => {
          if (active && url) setPayload({ format: 'image', url })
        })
        .catch(() => {})
    }

    return () => {
      active = false
    }
  }, [accountId, documentId])

  useEffect(() => {
    if (payload?.format === 'lottie' && payload.data && animContainerRef.current) {
      const container = animContainerRef.current
      container.innerHTML = ''
      try {
        const anim = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: payload.data,
        })
        return () => {
          anim.destroy()
        }
      } catch (err) {
        console.warn('[CustomEmoji] Lottie render error:', err)
      }
    }
  }, [payload])

  if (payload?.format === 'lottie') {
    return (
      <span
        ref={animContainerRef}
        className={className}
        title={fallback || 'Custom Emoji'}
      />
    )
  }

  if (payload?.format === 'video' && payload.url && !hasError) {
    return (
      <video
        src={payload.url}
        autoPlay
        loop
        muted
        playsInline
        className={className}
        onError={() => setHasError(true)}
      />
    )
  }

  if (payload?.url && !hasError) {
    return (
      <img
        src={payload.url}
        alt={fallback || 'emoji'}
        className={className}
        loading="lazy"
        draggable={false}
        onError={() => setHasError(true)}
      />
    )
  }

  return fallback ? <span className="inline-block">{fallback}</span> : null
}

// ============================================================================
// 2. FormattedTextRenderer Component
// ============================================================================

export interface FormattedTextProps {
  text: string
  entities?: MessageEntityItem[]
  accountId?: string
  isRtl?: boolean
  searchQuery?: string
  onSafeOpenUrl?: (url: string) => void
  onSelectUserOrChat?: (target: string) => void
  className?: string
}

/**
 * Universal Formatted Text Renderer
 * Applies complete entity hierarchy with full parity across all message formats.
 */
export const FormattedTextRenderer: React.FC<FormattedTextProps> = ({
  text,
  entities,
  accountId = '',
  isRtl,
  searchQuery = '',
  onSafeOpenUrl,
  onSelectUserOrChat,
  className = '',
}) => {
  if (!text) return null
  const textIsRtl = isRtl ?? isRTL(text)

  // Highlight active search query
  const highlightText = (val: string, keyPrefix: string): React.ReactNode => {
    if (!searchQuery.trim() || !val) return val
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    const parts = val.split(regex)
    if (parts.length <= 1) return val

    return parts.map((part, pIdx) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark
          key={`${keyPrefix}-hl-${pIdx}`}
          className="bg-amber-400/40 text-amber-100 rounded px-0.5 font-bold shadow-sm"
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // Handle URL opening safely
  const handleOpenUrl = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSafeOpenUrl) {
      onSafeOpenUrl(url)
    } else if (window.guidegram?.openExternal) {
      window.guidegram.openExternal(url)
    }
  }

  // Render a range of inline segments
  const renderSegments = (segments: EntitySegment[], keyPrefix: string): React.ReactNode[] => {
    return segments.map((seg, idx) => {
      const segKey = `${keyPrefix}-${seg.start}-${seg.end}-${idx}`
      let node: React.ReactNode = highlightText(seg.text, segKey)

      // 1. Custom Emoji
      const customEmojiEnt = seg.entities.find((e) => e.type === 'custom_emoji' && e.documentId)
      if (customEmojiEnt) {
        return (
          <CustomEmojiRenderer
            key={segKey}
            accountId={accountId}
            documentId={customEmojiEnt.documentId!}
            fallback={seg.text}
          />
        )
      }

      // 2. Bank Card Number
      const cardEnt = seg.entities.find((e) => e.type === 'bank_card')
      if (cardEnt) {
        return <BankCardPill key={segKey} rawCardNumber={seg.text} />
      }

      // 3. Inline Styling entities wrap node
      for (const ent of seg.entities) {
        const wrapKey = `${segKey}-${ent.type}`

        switch (ent.type) {
          case 'bold':
            node = <strong key={wrapKey} className="font-bold text-white">{node}</strong>
            break
          case 'italic':
            node = <em key={wrapKey} className="italic text-gray-200">{node}</em>
            break
          case 'underline':
            node = <u key={wrapKey} className="underline text-gray-200">{node}</u>
            break
          case 'strike':
            node = <del key={wrapKey} className="line-through text-gray-400">{node}</del>
            break
          case 'spoiler':
            node = <SpoilerSpan key={wrapKey}>{node}</SpoilerSpan>
            break
          case 'code':
            node = (
              <code
                key={wrapKey}
                className="px-1.5 py-0.5 rounded-md bg-black/40 text-accent-cyan font-mono text-[11px] border border-white/10"
                dir="ltr"
              >
                {node}
              </code>
            )
            break
          case 'text_url':
          case 'url': {
            const url = ent.url || seg.text
            node = (
              <a
                key={wrapKey}
                href={url}
                onClick={(e) => handleOpenUrl(url, e)}
                className="text-accent-cyan underline hover:text-cyan-300 font-medium cursor-pointer inline-flex items-center gap-0.5"
                title={`Open ${url}`}
              >
                <span>{node}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            )
            break
          }
          case 'hashtag':
            node = (
              <span
                key={wrapKey}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onSelectUserOrChat) onSelectUserOrChat(seg.text)
                }}
                className="text-accent-cyan font-semibold hover:underline cursor-pointer"
                title={`Filter by hashtag ${seg.text}`}
              >
                {node}
              </span>
            )
            break
          case 'mention': {
            const username = seg.text.replace(/^@/, '')
            node = (
              <button
                key={wrapKey}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onSelectUserOrChat) onSelectUserOrChat(username)
                  else if (window.guidegram?.openExternal) {
                    window.guidegram.openExternal(`https://t.me/${username}`)
                  }
                }}
                className="text-accent-cyan font-semibold hover:underline inline cursor-pointer text-left"
                title={`View profile @${username}`}
              >
                {node}
              </button>
            )
            break
          }
        }
      }

      return <React.Fragment key={segKey}>{node}</React.Fragment>
    })
  }

  // Parse block-level entities (pre, blockquote) vs regular flow
  const blockEntities = (entities || [])
    .filter(
      (e) =>
        typeof e.offset === 'number' &&
        typeof e.length === 'number' &&
        (e.type === 'blockquote' || e.type === 'expandable_blockquote' || e.type === 'pre')
    )
    .sort((a, b) => a.offset - b.offset)

  const inlineEntities = (entities || []).filter(
    (e) => e.type !== 'blockquote' && e.type !== 'expandable_blockquote' && e.type !== 'pre'
  )

  const topElements: React.ReactNode[] = []
  let cursor = 0

  for (let i = 0; i < blockEntities.length; i++) {
    const bEnt = blockEntities[i]
    const bStart = Math.max(0, Math.min(text.length, bEnt.offset))
    const bEnd = Math.max(0, Math.min(text.length, bEnt.offset + bEnt.length))
    if (bStart < cursor) continue

    // Normal text before this block
    if (bStart > cursor) {
      const preSegments = buildEntitySegments(text, inlineEntities, cursor, bStart)
      topElements.push(
        <React.Fragment key={`norm-${cursor}-${bStart}`}>
          {renderSegments(preSegments, `norm-${cursor}`)}
        </React.Fragment>
      )
    }

    if (bEnd > bStart) {
      if (bEnt.type === 'pre') {
        const codeText = text.slice(bStart, bEnd)
        topElements.push(
          <PreCodeBlock
            key={`pre-${bStart}-${bEnd}`}
            code={codeText}
            language={bEnt.language}
          />
        )
      } else if (bEnt.type === 'blockquote' || bEnt.type === 'expandable_blockquote') {
        const bqSegments = buildEntitySegments(text, inlineEntities, bStart, bEnd)
        const isExpandable = bEnt.type === 'expandable_blockquote' || bEnt.length > 250
        topElements.push(
          <CollapsibleBlockquote
            key={`bq-${bStart}-${bEnd}`}
            isRtl={textIsRtl}
            initialCollapsed={isExpandable}
          >
            {renderSegments(bqSegments, `bq-${bStart}`)}
          </CollapsibleBlockquote>
        )
      }
    }

    cursor = bEnd
  }

  // Trailing text
  if (cursor < text.length) {
    const postSegments = buildEntitySegments(text, inlineEntities, cursor, text.length)
    topElements.push(
      <React.Fragment key={`norm-${cursor}-${text.length}`}>
        {renderSegments(postSegments, `norm-${cursor}`)}
      </React.Fragment>
    )
  }

  return (
    <div
      dir={textIsRtl ? 'rtl' : 'ltr'}
      className={`whitespace-pre-wrap leading-relaxed break-words select-text ${
        textIsRtl ? 'text-right font-persian' : 'text-left font-latin'
      } ${className}`}
    >
      {topElements}
    </div>
  )
}

// ============================================================================
// 3. PageBlock Subcomponents
// ============================================================================

export const PageBlockHeaderView: React.FC<{
  block: HeaderBlock
  isRtl?: boolean
}> = ({ block, isRtl }) => {
  const isH1 = block.type === 'header' || block.level === 1
  return isH1 ? (
    <h3
      dir={isRtl ? 'rtl' : 'ltr'}
      className="my-2.5 text-base font-bold text-white tracking-wide border-b border-white/10 pb-1.5"
    >
      {block.text}
    </h3>
  ) : (
    <h4
      dir={isRtl ? 'rtl' : 'ltr'}
      className="my-2 text-xs font-bold text-accent-cyan tracking-wide"
    >
      {block.text}
    </h4>
  )
}

export const PageBlockParagraphView: React.FC<{
  block: ParagraphBlock
  accountId?: string
  isRtl?: boolean
  onSafeOpenUrl?: (url: string) => void
}> = ({ block, accountId, isRtl, onSafeOpenUrl }) => {
  return (
    <div className="my-1 text-xs text-gray-200">
      <FormattedTextRenderer
        text={block.text}
        entities={block.entities}
        accountId={accountId}
        isRtl={isRtl}
        onSafeOpenUrl={onSafeOpenUrl}
      />
    </div>
  )
}

export const PageBlockListView: React.FC<{
  block: ListBlock
  isRtl?: boolean
}> = ({ block, isRtl }) => {
  if (block.ordered) {
    return (
      <ol
        dir={isRtl ? 'rtl' : 'ltr'}
        start={block.start || 1}
        reversed={block.reversed}
        className="list-decimal my-2 px-4 space-y-1 text-xs text-gray-200"
      >
        {block.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {item.text}
          </li>
        ))}
      </ol>
    )
  }

  // Checklist or unordered
  const hasCheckboxes = block.items.some((it) => it.checkbox)

  return (
    <ul
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`my-2 space-y-1.5 text-xs text-gray-200 ${
        hasCheckboxes ? 'px-1 list-none' : 'px-4 list-disc'
      }`}
    >
      {block.items.map((item, idx) => (
        <li key={idx} className="leading-relaxed flex items-start gap-2">
          {item.checkbox ? (
            item.checked ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            )
          ) : null}
          <span className={item.checked ? 'line-through text-gray-400' : ''}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

export const PageBlockTableView: React.FC<{
  block: TableBlock
  isRtl?: boolean
}> = ({ block, isRtl }) => {
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-dark-900/60 shadow-md backdrop-blur-sm"
    >
      {block.title && (
        <div className="px-3 py-2 text-xs font-bold text-emerald-300 border-b border-white/10 bg-emerald-950/20 flex items-center justify-between">
          <span>{block.title}</span>
        </div>
      )}
      <table
        className={`w-full text-xs text-left border-collapse ${
          block.compact ? 'text-[11px]' : 'text-xs'
        }`}
      >
        <tbody>
          {block.rows.map((row, rIdx) => {
            const isFirst = rIdx === 0
            const rowIsHeader = isFirst && row.cells.some((c) => c.isHeader)

            return (
              <tr
                key={rIdx}
                className={`border-b border-white/5 last:border-0 ${
                  rowIsHeader
                    ? 'bg-emerald-950/30'
                    : block.striped && rIdx % 2 === 1
                    ? 'bg-white/[0.02]'
                    : 'bg-transparent'
                }`}
              >
                {row.cells.map((cell, cIdx) => {
                  const Tag = cell.isHeader || rowIsHeader ? 'th' : 'td'
                  const alignClass =
                    cell.align === 'center'
                      ? 'text-center'
                      : cell.align === 'right'
                      ? 'text-right'
                      : isRtl
                      ? 'text-right'
                      : 'text-left'

                  const valignClass =
                    cell.valign === 'middle'
                      ? 'align-middle'
                      : cell.valign === 'bottom'
                      ? 'align-bottom'
                      : 'align-top'

                  return (
                    <Tag
                      key={cIdx}
                      colSpan={cell.colspan || 1}
                      rowSpan={cell.rowspan || 1}
                      className={`px-3 py-2 leading-relaxed ${
                        cell.isHeader || rowIsHeader
                          ? 'font-bold text-emerald-300'
                          : 'text-gray-200'
                      } ${alignClass} ${valignClass} border-r border-white/5 last:border-r-0`}
                    >
                      {cell.text}
                    </Tag>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const PageBlockPhotoView: React.FC<{
  block: PhotoBlock
  onSafeOpenUrl?: (url: string) => void
}> = ({ block, onSafeOpenUrl }) => {
  const [spoilerRevealed, setSpoilerRevealed] = useState(!block.spoiler)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const photoSrc = block.url || (block.photoId ? `telegram-photo://${block.photoId}` : '')

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-dark-900/50 shadow-md">
      <div className="relative group overflow-hidden flex items-center justify-center bg-black/40 min-h-[140px]">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={block.caption || 'Photo'}
            loading="lazy"
            className={`w-full max-h-[420px] object-contain transition-all duration-300 cursor-pointer ${
              !spoilerRevealed
                ? 'blur-[16px] scale-105 pointer-events-none'
                : 'blur-none scale-100'
            }`}
            onClick={() => spoilerRevealed && setLightboxOpen(true)}
          />
        ) : (
          <div className="p-8 text-center text-xs text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <span>Photo block (ID: {block.photoId})</span>
          </div>
        )}

        {/* Spoiler overlay button */}
        {!spoilerRevealed && (
          <button
            type="button"
            onClick={() => setSpoilerRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white font-bold text-xs cursor-pointer select-none backdrop-blur-sm"
          >
            <Eye className="w-6 h-6 animate-pulse text-accent-cyan" />
            <span>Click to reveal photo</span>
          </button>
        )}
      </div>

      {/* Caption & Credit */}
      {(block.caption || block.credit) && (
        <div className="p-2.5 bg-dark-850/80 border-t border-white/5 text-xs text-gray-300 flex items-center justify-between">
          <span>{block.caption}</span>
          {block.credit && (
            <span className="text-[11px] text-gray-400 italic">© {block.credit}</span>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && photoSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={photoSrc}
            alt={block.caption || 'Enlarged photo'}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

export const PageBlockVideoView: React.FC<{
  block: VideoBlock
}> = ({ block }) => {
  const [spoilerRevealed, setSpoilerRevealed] = useState(!block.spoiler)
  const [isPlaying, setIsPlaying] = useState(Boolean(block.autoplay))
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const videoSrc = block.url || (block.videoId ? `telegram-video://${block.videoId}` : '')

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-dark-900/50 shadow-md">
      <div className="relative group overflow-hidden flex items-center justify-center bg-black/50 min-h-[160px]">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay={block.autoplay}
            loop={block.loop}
            muted={isMuted}
            playsInline
            className={`w-full max-h-[420px] object-contain transition-all duration-300 ${
              !spoilerRevealed ? 'blur-[16px] pointer-events-none' : 'blur-none'
            }`}
            onClick={togglePlay}
          />
        ) : (
          <div className="p-8 text-center text-xs text-gray-400">
            <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <span>Video block (ID: {block.videoId})</span>
          </div>
        )}

        {/* Video controls */}
        {spoilerRevealed && videoSrc && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={togglePlay}
              className="text-white hover:text-accent-cyan cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:text-accent-cyan cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Spoiler veil */}
        {!spoilerRevealed && (
          <button
            type="button"
            onClick={() => setSpoilerRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white font-bold text-xs cursor-pointer select-none backdrop-blur-sm"
          >
            <Eye className="w-6 h-6 animate-pulse text-accent-cyan" />
            <span>Click to reveal video</span>
          </button>
        )}
      </div>

      {(block.caption || block.credit) && (
        <div className="p-2.5 bg-dark-850/80 border-t border-white/5 text-xs text-gray-300 flex items-center justify-between">
          <span>{block.caption}</span>
          {block.credit && (
            <span className="text-[11px] text-gray-400 italic">© {block.credit}</span>
          )}
        </div>
      )}
    </div>
  )
}

export const PageBlockEmbedView: React.FC<{
  block: EmbedBlock
  onSafeOpenUrl?: (url: string) => void
}> = ({ block, onSafeOpenUrl }) => {
  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-dark-900/60 shadow-md">
      {block.url ? (
        <div className="p-3 flex items-center justify-between bg-dark-850/80 border-b border-white/5">
          <div className="truncate text-xs font-semibold text-accent-cyan flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{block.url}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (block.url) {
                if (onSafeOpenUrl) onSafeOpenUrl(block.url)
                else if (window.guidegram?.openExternal) window.guidegram.openExternal(block.url)
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-primary-600/30 hover:bg-primary-600/50 text-primary-300 text-[11px] font-bold transition-all cursor-pointer shrink-0"
          >
            Open Link
          </button>
        </div>
      ) : null}

      {/* Embed preview container */}
      <div className="relative aspect-video bg-black/40 flex items-center justify-center">
        {block.posterUrl ? (
          <img
            src={block.posterUrl}
            alt={block.caption || 'Embed Poster'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-xs text-gray-400 p-4">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-accent-cyan" />
            <span>Interactive Embed Content</span>
          </div>
        )}
      </div>

      {(block.caption || block.credit) && (
        <div className="p-2.5 bg-dark-850/80 border-t border-white/5 text-xs text-gray-300 flex items-center justify-between">
          <span>{block.caption}</span>
          {block.credit && (
            <span className="text-[11px] text-gray-400 italic">© {block.credit}</span>
          )}
        </div>
      )}
    </div>
  )
}

export const PageBlockAuthorDateView: React.FC<{
  block: AuthorDateBlock
  isRtl?: boolean
}> = ({ block, isRtl }) => {
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="my-2 py-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-gray-400"
    >
      <div className="flex items-center gap-1.5 text-gray-200 font-semibold">
        <User className="w-3.5 h-3.5 text-accent-cyan" />
        <span>{block.author}</span>
      </div>
      {block.formattedDate && (
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="w-3 h-3 text-gray-500" />
          <span>{block.formattedDate}</span>
        </div>
      )}
    </div>
  )
}

export const PageBlockDetailsView: React.FC<{
  block: DetailsBlock
  accountId?: string
  isRtl?: boolean
  onSafeOpenUrl?: (url: string) => void
}> = ({ block, accountId, isRtl, onSafeOpenUrl }) => {
  return (
    <details
      open={block.open}
      className="my-2 rounded-xl border border-white/10 bg-dark-900/40 p-2.5 group transition-all"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <summary className="cursor-pointer text-xs font-semibold text-accent-cyan flex items-center justify-between select-none">
        <span>{block.title}</span>
        <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="mt-2 pt-2 border-t border-white/10 space-y-2 text-xs text-gray-200">
        {block.blocks.map((sub, idx) => (
          <PageBlockRenderer
            key={idx}
            block={sub}
            accountId={accountId}
            isRtl={isRtl}
            onSafeOpenUrl={onSafeOpenUrl}
          />
        ))}
      </div>
    </details>
  )
}

export const PageBlockThinkingView: React.FC<{
  block: ThinkingBlock
  isRtl?: boolean
}> = ({ block, isRtl }) => {
  const [open, setOpen] = useState(!block.collapsed)

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="my-2 rounded-xl border border-purple-500/20 bg-purple-950/20 p-2.5 transition-all text-xs"
    >
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer font-semibold text-purple-300 flex items-center justify-between select-none"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>Thought Process</span>
          {block.durationSeconds ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-900/40 text-purple-300 font-mono">
              {block.durationSeconds}s
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-purple-500/20 text-gray-300 leading-relaxed font-mono text-[11px] whitespace-pre-wrap select-text">
          {block.text}
        </div>
      )}
    </div>
  )
}

/**
 * Dispatcher for any PageBlock
 */
export const PageBlockRenderer: React.FC<{
  block: ParsedPageBlock
  accountId?: string
  isRtl?: boolean
  onSafeOpenUrl?: (url: string) => void
}> = ({ block, accountId, isRtl, onSafeOpenUrl }) => {
  switch (block.type) {
    case 'header':
    case 'subheader':
      return <PageBlockHeaderView block={block} isRtl={isRtl} />
    case 'paragraph':
      return (
        <PageBlockParagraphView
          block={block}
          accountId={accountId}
          isRtl={isRtl}
          onSafeOpenUrl={onSafeOpenUrl}
        />
      )
    case 'list':
      return <PageBlockListView block={block} isRtl={isRtl} />
    case 'table':
      return <PageBlockTableView block={block} isRtl={isRtl} />
    case 'photo':
      return <PageBlockPhotoView block={block} onSafeOpenUrl={onSafeOpenUrl} />
    case 'video':
      return <PageBlockVideoView block={block} />
    case 'embed':
      return <PageBlockEmbedView block={block} onSafeOpenUrl={onSafeOpenUrl} />
    case 'author_date':
      return <PageBlockAuthorDateView block={block} isRtl={isRtl} />
    case 'blockquote':
      return (
        <CollapsibleBlockquote
          caption={block.caption}
          isRtl={isRtl}
          initialCollapsed={block.collapsed}
        >
          {block.text}
        </CollapsibleBlockquote>
      )
    case 'pre':
      return <PreCodeBlock code={block.text} language={block.language} />
    case 'details':
      return (
        <PageBlockDetailsView
          block={block}
          accountId={accountId}
          isRtl={isRtl}
          onSafeOpenUrl={onSafeOpenUrl}
        />
      )
    case 'divider':
      return <hr className="my-2 border-white/10" />
    case 'thinking':
      return <PageBlockThinkingView block={block} isRtl={isRtl} />
    default:
      return null
  }
}

// ============================================================================
// 4. Main RichMessageRenderer Component
// ============================================================================

export interface RichMessageRendererProps {
  message?: MessageItem
  rich?: RichMessagePayload | ParsedRichMessage
  text?: string
  entities?: MessageEntityItem[]
  accountId?: string
  isRtl?: boolean
  searchQuery?: string
  onSafeOpenUrl?: (url: string) => void
  onSelectUserOrChat?: (target: string) => void
  className?: string
}

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({
  message,
  rich,
  text,
  entities,
  accountId,
  isRtl,
  searchQuery = '',
  onSafeOpenUrl,
  onSelectUserOrChat,
  className = '',
}) => {
  const effectiveAccountId = accountId || message?.accountId || ''
  const effectiveEntities = entities || message?.entities
  const effectiveText = text ?? message?.text ?? ''

  // Parse rich message payload
  const parsedRich = useMemo(() => {
    const targetRich = rich || message?.richMessage
    if (!targetRich) return null
    return parseRichMessage(targetRich)
  }, [rich, message?.richMessage])

  const globalRtl = isRtl ?? parsedRich?.rtl ?? (effectiveText ? isRTL(effectiveText) : false)

  // 1. If rich message with blocks is present, render blocks container
  if (parsedRich && parsedRich.blocks && parsedRich.blocks.length > 0) {
    return (
      <div className={`w-full my-1.5 space-y-2 ${className}`}>
        {parsedRich.blocks.map((block, idx) => (
          <PageBlockRenderer
            key={idx}
            block={block}
            accountId={effectiveAccountId}
            isRtl={globalRtl}
            onSafeOpenUrl={onSafeOpenUrl}
          />
        ))}
      </div>
    )
  }

  // 2. Otherwise render standard formatted message text with complete entity parity
  if (effectiveText) {
    return (
      <FormattedTextRenderer
        text={effectiveText}
        entities={effectiveEntities}
        accountId={effectiveAccountId}
        isRtl={globalRtl}
        searchQuery={searchQuery}
        onSafeOpenUrl={onSafeOpenUrl}
        onSelectUserOrChat={onSelectUserOrChat}
        className={className}
      />
    )
  }

  return null
}

export default RichMessageRenderer
