import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  ExternalLink,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Type,
  Sun,
  Moon,
  Coffee,
  Share2,
  Check,
  ChevronLeft,
} from 'lucide-react'
import { InstantViewArticle, InstantViewBlock, InstantViewRichText } from '../types/telegram'

export interface InstantViewModalProps {
  isOpen: boolean
  article: InstantViewArticle | null
  isLoading?: boolean
  onClose: () => void
  onOpenExternal?: (url: string) => void
}

type ReaderTheme = 'dark' | 'light' | 'sepia' | 'oled'
type ReaderFont = 'sans' | 'serif'

export const InstantViewModal: React.FC<InstantViewModalProps> = ({
  isOpen,
  article,
  isLoading = false,
  onClose,
  onOpenExternal,
}) => {
  const [fontSize, setFontSize] = useState<number>(17)
  const [fontFamily, setFontFamily] = useState<ReaderFont>('sans')
  const [theme, setTheme] = useState<ReaderTheme>('dark')
  const [scrollProgress, setScrollProgress] = useState<number>(0)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Track reading scroll progress
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const totalHeight = el.scrollHeight - el.clientHeight
    if (totalHeight > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (el.scrollTop / totalHeight) * 100)))
    }
  }

  if (!isOpen) return null

  const handleShare = () => {
    if (article?.url) {
      navigator.clipboard.writeText(article.url).catch(() => {})
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  const getSafeHostname = (url?: string, fallback?: string): string => {
    if (!url) return fallback || 'Article'
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
    } catch {
      return fallback || url
    }
  }

  const handleOpenUrl = () => {
    if (article?.url) {
      const targetUrl = article.url.startsWith('http') ? article.url : `https://${article.url}`
      if (onOpenExternal) {
        onOpenExternal(targetUrl)
      } else if (window.guidegram?.openExternal) {
        window.guidegram.openExternal(targetUrl)
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer')
      }
    }
  }

  // Theme style classes
  const themeClasses: Record<ReaderTheme, { bg: string; text: string; header: string; card: string; border: string }> = {
    dark: {
      bg: 'bg-[#18191c]',
      text: 'text-gray-200',
      header: 'bg-[#212328]/95 border-white/10 text-gray-100',
      card: 'bg-white/5 border-white/10',
      border: 'border-white/10',
    },
    oled: {
      bg: 'bg-black',
      text: 'text-gray-100',
      header: 'bg-black/95 border-white/15 text-white',
      card: 'bg-zinc-900/60 border-zinc-800',
      border: 'border-zinc-800',
    },
    sepia: {
      bg: 'bg-[#f4ecd8]',
      text: 'text-[#5b4636]',
      header: 'bg-[#eae0c8]/95 border-[#d6c7a7] text-[#433226]',
      card: 'bg-[#ebe1cb] border-[#d6c7a7]',
      border: 'border-[#d6c7a7]',
    },
    light: {
      bg: 'bg-[#fbfbfb]',
      text: 'text-gray-800',
      header: 'bg-white/95 border-gray-200 text-gray-900',
      card: 'bg-gray-100/70 border-gray-200',
      border: 'border-gray-200',
    },
  }

  const currentTheme = themeClasses[theme]
  const isRtl = article?.rtl || false

  // Render RichText tokens
  const renderRichTokens = (tokens?: InstantViewRichText[]): React.ReactNode => {
    if (!tokens || tokens.length === 0) return null

    return tokens.map((token, i) => {
      switch (token.type) {
        case 'bold':
          return <strong key={i} className="font-bold">{token.text}</strong>
        case 'italic':
          return <em key={i} className="italic">{token.text}</em>
        case 'underline':
          return <u key={i} className="underline">{token.text}</u>
        case 'strike':
          return <s key={i} className="line-through opacity-75">{token.text}</s>
        case 'code':
          return (
            <code key={i} className="px-1.5 py-0.5 rounded text-[0.88em] bg-black/20 dark:bg-white/10 font-mono">
              {token.text}
            </code>
          )
        case 'url':
        case 'email':
          return (
            <a
              key={i}
              href={token.url || token.text}
              onClick={(e) => {
                e.preventDefault()
                if (token.url) {
                  if (onOpenExternal) onOpenExternal(token.url)
                  else window.guidegram?.openExternal?.(token.url)
                }
              }}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              {token.text}
            </a>
          )
        default:
          return <span key={i}>{token.text}</span>
      }
    })
  }

  // Render Page Block
  const renderBlock = (block: InstantViewBlock, index: number) => {
    switch (block.type) {
      case 'title':
        return (
          <h1
            key={index}
            className="text-2xl md:text-3xl font-extrabold tracking-tight leading-snug mb-3"
            style={{ fontSize: `${fontSize * 1.55}px` }}
          >
            {block.richText ? renderRichTokens(block.richText) : block.text}
          </h1>
        )

      case 'subtitle':
        return (
          <h2
            key={index}
            className="text-lg md:text-xl font-medium opacity-80 mb-4 leading-normal"
            style={{ fontSize: `${fontSize * 1.15}px` }}
          >
            {block.richText ? renderRichTokens(block.richText) : block.text}
          </h2>
        )

      case 'header':
        return (
          <h3
            key={index}
            className="text-xl md:text-2xl font-bold mt-6 mb-3 leading-snug"
            style={{ fontSize: `${fontSize * 1.3}px` }}
          >
            {block.richText ? renderRichTokens(block.richText) : block.text}
          </h3>
        )

      case 'subheader':
        return (
          <h4
            key={index}
            className="text-lg md:text-xl font-semibold mt-4 mb-2 leading-snug"
            style={{ fontSize: `${fontSize * 1.1}px` }}
          >
            {block.richText ? renderRichTokens(block.richText) : block.text}
          </h4>
        )

      case 'author_date':
        return (
          <div key={index} className="flex items-center gap-3 text-xs opacity-70 mb-6 pb-4 border-b border-current/15">
            {block.author && <span className="font-semibold">{block.author}</span>}
            {block.date ? (
              <span>{new Date(block.date * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            ) : null}
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              <BookOpen className="w-3.5 h-3.5" /> Instant View
            </span>
          </div>
        )

      case 'paragraph':
        return (
          <p
            key={index}
            className="mb-4 leading-relaxed font-normal"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.68 }}
          >
            {block.richText ? renderRichTokens(block.richText) : block.text}
          </p>
        )

      case 'blockquote':
      case 'pullquote':
        return (
          <blockquote
            key={index}
            className={`my-5 py-2.5 px-4 border-l-4 border-cyan-400 rounded-r-lg ${currentTheme.card} italic`}
            style={{ fontSize: `${fontSize * 1.05}px` }}
          >
            <p className="mb-1">{block.richText ? renderRichTokens(block.richText) : block.text}</p>
            {block.caption && (
              <cite className="block text-xs not-italic font-medium opacity-70 mt-1">
                — {block.caption}
              </cite>
            )}
          </blockquote>
        )

      case 'preformatted':
        return (
          <pre
            key={index}
            className="my-5 p-4 rounded-xl font-mono text-xs md:text-sm overflow-x-auto bg-black/40 border border-white/10 text-gray-200"
          >
            <code>{block.text}</code>
          </pre>
        )

      case 'list': {
        const ListTag = block.ordered ? 'ol' : 'ul'
        return (
          <ListTag
            key={index}
            className={`my-4 space-y-1.5 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {(block.items || []).map((item, itemIdx) => (
              <li key={itemIdx} className="leading-relaxed">
                {Array.isArray(item) ? renderRichTokens(item) : String(item)}
              </li>
            ))}
          </ListTag>
        )
      }

      case 'photo':
        return (
          <figure key={index} className="my-6 text-center">
            {block.url ? (
              <div className="rounded-2xl overflow-hidden border border-current/15 max-h-[500px] inline-block shadow-md">
                <img
                  src={block.url}
                  alt={block.caption || 'Article image'}
                  className="max-h-[500px] w-auto object-contain mx-auto"
                  loading="lazy"
                />
              </div>
            ) : null}
            {block.caption && (
              <figcaption className="text-xs opacity-75 mt-2 max-w-lg mx-auto">
                {block.caption}
              </figcaption>
            )}
          </figure>
        )

      case 'divider':
        return <hr key={index} className="my-8 border-t border-current/15" />

      case 'table':
        return (
          <div key={index} className="my-6 overflow-x-auto">
            <table className="w-full text-left border-collapse border border-current/20 text-sm">
              <tbody>
                {(block.rows || []).map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 ? 'font-bold bg-current/10' : ''}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 border border-current/20">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-3xl h-[92vh] max-h-[900px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.text} transition-colors duration-200`}
        style={{ fontFamily: fontFamily === 'serif' ? 'Georgia, Cambria, serif' : 'Inter, system-ui, sans-serif' }}
      >
        {/* Scroll Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-current/10 z-20">
          <div
            className="h-full bg-cyan-400 transition-all duration-100 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Reader Top Bar */}
        <header
          className={`flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-md sticky top-0 z-10 ${currentTheme.header}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors"
              title="Close reader (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400 block truncate">
                {article?.siteName || 'Instant View'}
              </span>
            </div>
          </div>

          {/* Reader Controls */}
          <div className="flex items-center gap-1.5">
            {/* Font family toggle */}
            <button
              onClick={() => setFontFamily((prev) => (prev === 'sans' ? 'serif' : 'sans'))}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors text-xs font-bold px-2"
              title="Toggle Serif / Sans-Serif font"
            >
              {fontFamily === 'sans' ? 'Serif' : 'Sans'}
            </button>

            {/* Font size down */}
            <button
              onClick={() => setFontSize((s) => Math.max(13, s - 1))}
              disabled={fontSize <= 13}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors disabled:opacity-40"
              title="Decrease font size"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Font size up */}
            <button
              onClick={() => setFontSize((s) => Math.min(26, s + 1))}
              disabled={fontSize >= 26}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors disabled:opacity-40"
              title="Increase font size"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Theme Picker */}
            <div className="flex items-center gap-1 pl-1 border-l border-current/15">
              <button
                onClick={() => setTheme('dark')}
                className={`w-6 h-6 rounded-full border ${theme === 'dark' ? 'ring-2 ring-cyan-400' : ''} bg-[#18191c]`}
                title="Dark theme"
              />
              <button
                onClick={() => setTheme('oled')}
                className={`w-6 h-6 rounded-full border ${theme === 'oled' ? 'ring-2 ring-cyan-400' : ''} bg-black`}
                title="OLED Pure Black"
              />
              <button
                onClick={() => setTheme('sepia')}
                className={`w-6 h-6 rounded-full border ${theme === 'sepia' ? 'ring-2 ring-cyan-400' : ''} bg-[#f4ecd8]`}
                title="Sepia warm paper"
              />
              <button
                onClick={() => setTheme('light')}
                className={`w-6 h-6 rounded-full border ${theme === 'light' ? 'ring-2 ring-cyan-400' : ''} bg-white`}
                title="Light theme"
              />
            </div>

            {/* Share / Copy Link */}
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors ml-1"
              title="Copy URL"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Open Original */}
            <button
              onClick={handleOpenUrl}
              className="p-1.5 rounded-lg hover:bg-current/10 transition-colors"
              title="Open original website"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Reader Body */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="flex-1 overflow-y-auto px-6 md:px-14 py-8 custom-scrollbar scroll-smooth"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm opacity-70">Rendering Instant View article...</p>
            </div>
          ) : article ? (
            <article className="max-w-2xl mx-auto">
              {/* If no blocks were returned, show basic fallback */}
              {article.blocks && article.blocks.length > 0 ? (
                article.blocks.map((block, idx) => renderBlock(block, idx))
              ) : (
                <div>
                  <h1 className="text-2xl font-bold mb-4">{article.title || 'Instant View'}</h1>
                  <p className="leading-relaxed opacity-90">{article.description}</p>
                </div>
              )}

              {/* End of article footer banner */}
              <div className="mt-12 pt-6 border-t border-current/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs opacity-75">
                <span>Published on {article.siteName || getSafeHostname(article.url)}</span>
                <button
                  onClick={handleOpenUrl}
                  className="flex items-center gap-1.5 text-cyan-400 hover:underline font-semibold"
                >
                  Read original version <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ) : (
            <div className="text-center py-16 opacity-60">
              <p>Unable to load Instant View for this page.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
