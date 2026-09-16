import React, { useState, useMemo, useCallback } from 'react'
import {
  Bot,
  Play,
  RefreshCw,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Terminal,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { DialogItem, ChatDetails } from '../../types/telegram'
import { isRTL } from '../../utils/textUtils'
import { copyTextToClipboard } from '../../utils/clipboard'

export interface BotCommandItem {
  command: string
  description: string
}

export interface BotInfoData {
  userId?: string
  description?: string
  descriptionPhoto?: {
    id?: string
    accessHash?: string
    fileReference?: string
    url?: string
  }
  descriptionDocument?: {
    id?: string
    accessHash?: string
    fileReference?: string
    mimeType?: string
    url?: string
  }
  commands?: BotCommandItem[]
  menuButton?: {
    type?: 'default' | 'commands' | 'web_app'
    text?: string
    url?: string
  }
}

export interface BotIntroCardProps {
  chat: DialogItem
  chatDetails?: ChatDetails | null
  botInfo?: BotInfoData | null
  hasMessages?: boolean
  startParam?: string
  isLoading?: boolean
  onStartBot?: (startParam?: string) => Promise<void> | void
  onSelectCommand?: (command: string) => void
  onOpenUrl?: (url: string) => void
  className?: string
}

/**
 * Safely parses and renders Telegram markdown styling in bot descriptions:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code` inline monospace
 * - ```pre``` multi-line code block
 * - [text](url) hyperlinks
 * - ||spoiler|| interactive spoiler reveal
 * - • or - list items
 */
function FormattedDescription({
  text,
  onOpenUrl,
}: {
  text: string
  onOpenUrl?: (url: string) => void
}) {
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<number, boolean>>({})

  const toggleSpoiler = (index: number) => {
    setRevealedSpoilers((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const renderFormattedLines = useMemo(() => {
    if (!text) return null

    const lines = text.split('\n')
    let spoilerIndex = 0

    return lines.map((line, lineIdx) => {
      if (line.trim() === '') {
        return <div key={lineIdx} className="h-2" />
      }

      // Preformatted code block check
      if (line.startsWith('```')) {
        const codeContent = line.replace(/^```[a-zA-Z0-9_-]*\s*/, '').replace(/```$/, '')
        return (
          <pre
            key={lineIdx}
            className="my-1.5 p-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-accent-cyan overflow-x-auto select-text"
            dir="ltr"
          >
            <code>{codeContent}</code>
          </pre>
        )
      }

      // Line-level bullet list formatting
      const isBullet = /^[\s]*[•\-\*]\s+/.test(line)
      const cleanLine = isBullet ? line.replace(/^[\s]*[•\-\*]\s+/, '') : line

      // Tokenize inline markdown patterns: spoilers, links, code, bold, italic
      const inlineRegex =
        /(\|\|[\s\S]+?\|\|)|(\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(https?:\/\/[^\s]+)/g

      const elements: React.ReactNode[] = []
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = inlineRegex.exec(cleanLine)) !== null) {
        const matchStart = match.index
        const matchText = match[0]

        if (matchStart > lastIndex) {
          elements.push(cleanLine.slice(lastIndex, matchStart))
        }

        if (matchText.startsWith('||') && matchText.endsWith('||')) {
          const sIdx = spoilerIndex++
          const spoilerContent = matchText.slice(2, -2)
          const isRevealed = Boolean(revealedSpoilers[sIdx])

          elements.push(
            <span
              key={`sp-${lineIdx}-${matchStart}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleSpoiler(sIdx)
              }}
              title={isRevealed ? undefined : 'Click to reveal spoiler'}
              className={`inline cursor-pointer rounded px-1 transition-all duration-200 ${
                isRevealed
                  ? 'bg-white/10 text-gray-200'
                  : 'bg-white/20 text-transparent blur-[3px] select-none hover:bg-white/25'
              }`}
            >
              {spoilerContent}
            </span>
          )
        } else if (match[2] && match[3] && match[4]) {
          // [text](url)
          const linkLabel = match[3]
          const linkUrl = match[4]
          elements.push(
            <a
              key={`link-${lineIdx}-${matchStart}`}
              href={linkUrl}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onOpenUrl) onOpenUrl(linkUrl)
                else window.open(linkUrl, '_blank', 'noopener,noreferrer')
              }}
              className="text-primary-400 hover:text-primary-300 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer font-medium"
            >
              <span>{linkLabel}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          )
        } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
          // Inline `code`
          const codeText = matchText.slice(1, -1)
          elements.push(
            <code
              key={`code-${lineIdx}-${matchStart}`}
              className="px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-[11px] text-primary-300 select-text"
              dir="ltr"
            >
              {codeText}
            </code>
          )
        } else if (
          (matchText.startsWith('**') && matchText.endsWith('**')) ||
          (matchText.startsWith('__') && matchText.endsWith('__'))
        ) {
          // Bold
          const boldText = matchText.slice(2, -2)
          elements.push(
            <strong key={`b-${lineIdx}-${matchStart}`} className="font-bold text-gray-100">
              {boldText}
            </strong>
          )
        } else if (
          (matchText.startsWith('*') && matchText.endsWith('*')) ||
          (matchText.startsWith('_') && matchText.endsWith('_'))
        ) {
          // Italic
          const italicText = matchText.slice(1, -1)
          elements.push(
            <em key={`i-${lineIdx}-${matchStart}`} className="italic text-gray-200">
              {italicText}
            </em>
          )
        } else if (matchText.startsWith('http://') || matchText.startsWith('https://')) {
          // Raw URL
          elements.push(
            <a
              key={`rawurl-${lineIdx}-${matchStart}`}
              href={matchText}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onOpenUrl) onOpenUrl(matchText)
                else window.open(matchText, '_blank', 'noopener,noreferrer')
              }}
              className="text-primary-400 hover:text-primary-300 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span className="truncate max-w-[200px] inline-block align-bottom">{matchText}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
            </a>
          )
        }

        lastIndex = matchStart + matchText.length
      }

      if (lastIndex < cleanLine.length) {
        elements.push(cleanLine.slice(lastIndex))
      }

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-1 text-gray-300 leading-relaxed">
            <span className="text-primary-400 font-bold select-none">•</span>
            <div className="flex-1">{elements}</div>
          </div>
        )
      }

      return (
        <div key={lineIdx} className="text-gray-300 leading-relaxed my-0.5">
          {elements}
        </div>
      )
    })
  }, [text, revealedSpoilers, onOpenUrl])

  return <div className="text-xs select-text">{renderFormattedLines}</div>
}

/**
 * Rich Telegram Desktop & Android style intro card shown ONLY when conversation history is empty in a bot chat.
 * Displays:
 * - Description photo banner or looped animation/video description document
 * - Verified badge & official Bot pill
 * - Formatted bot description supporting markdown and interactive spoilers
 * - Bot commands preview pills
 * - Active "START BOT" button with responsive loading spinner, disabled state during execution, and error feedback
 */
export const BotIntroCard: React.FC<BotIntroCardProps> = ({
  chat,
  chatDetails,
  botInfo,
  hasMessages = false,
  startParam,
  isLoading = false,
  onStartBot,
  onSelectCommand,
  onOpenUrl,
  className = '',
}) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedUsername, setCopiedUsername] = useState(false)
  const [showAllCommands, setShowAllCommands] = useState(false)

  // Guard: ONLY render if conversation history is empty
  if (hasMessages) {
    return null
  }

  // Resolved description text from botInfo or chatDetails fallback
  const resolvedDescription = useMemo(() => {
    if (botInfo?.description && botInfo.description.trim().length > 0) {
      return botInfo.description
    }
    if (chatDetails?.about && chatDetails.about.trim().length > 0) {
      return chatDetails.about
    }
    return 'This bot offers interactive automated features, utilities, or services. Press Start below to begin your conversation.'
  }, [botInfo?.description, chatDetails?.about])

  // Resolved commands from botInfo or chatDetails
  const resolvedCommands = useMemo<BotCommandItem[]>(() => {
    if (botInfo?.commands && botInfo.commands.length > 0) {
      return botInfo.commands
    }
    if (chatDetails?.botInfo?.commands && chatDetails.botInfo.commands.length > 0) {
      return chatDetails.botInfo.commands
    }
    return []
  }, [botInfo?.commands, chatDetails?.botInfo?.commands])

  // Resolved description media: check video/document loop or photo banner
  const descriptionVideoUrl = useMemo(() => {
    const doc = botInfo?.descriptionDocument
    if (doc?.url) return doc.url
    return null
  }, [botInfo?.descriptionDocument])

  const descriptionPhotoUrl = useMemo(() => {
    const photo = botInfo?.descriptionPhoto
    if (photo?.url) return photo.url
    return null
  }, [botInfo?.descriptionPhoto])

  // Copy username helper
  const handleCopyUsername = async () => {
    const uname = chat.username || chatDetails?.username
    if (!uname) return
    const fullTag = uname.startsWith('@') ? uname : `@${uname}`
    const success = await copyTextToClipboard(fullTag)
    if (success) {
      setCopiedUsername(true)
      setTimeout(() => setCopiedUsername(false), 2000)
    }
  }

  // Active START BOT handler
  const handleStartBotClick = useCallback(async () => {
    if (isExecuting || isLoading) return
    setIsExecuting(true)
    setErrorMessage(null)

    try {
      if (onStartBot) {
        await onStartBot(startParam)
      } else if (
        typeof window !== 'undefined' &&
        window.guidegram &&
        typeof (window.guidegram as any).startBot === 'function'
      ) {
        // Native MTProto messages.startBot call
        const res = await (window.guidegram as any).startBot(chat.accountId, chat.id, startParam)
        if (res && res.success === false) {
          throw new Error(res.error || 'Failed to start bot')
        }
      } else if (
        typeof window !== 'undefined' &&
        window.guidegram &&
        typeof window.guidegram.sendMessage === 'function'
      ) {
        // Standard /start fallback
        const payload = startParam ? `/start ${startParam}` : '/start'
        await window.guidegram.sendMessage(chat.accountId, chat.id, payload)
      }
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred while starting the bot.'
      setErrorMessage(msg)
    } finally {
      setIsExecuting(false)
    }
  }, [chat.accountId, chat.id, isExecuting, isLoading, onStartBot, startParam])

  const username = chat.username || chatDetails?.username
  const isVerified = Boolean(chatDetails?.verified)
  const isRtlTitle = isRTL(chat.title)
  const displayedCommands = showAllCommands ? resolvedCommands : resolvedCommands.slice(0, 4)

  return (
    <div
      className={`w-full max-w-md mx-auto my-auto flex flex-col items-center p-0.5 animate-in fade-in zoom-in-95 duration-200 ${className}`}
    >
      <div className="w-full bg-dark-850/95 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
        {/* Banner Media or Glowing Header */}
        {descriptionVideoUrl ? (
          <div className="relative w-full h-48 bg-black/60 overflow-hidden flex items-center justify-center border-b border-white/10">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              src={descriptionVideoUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-850/90 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : descriptionPhotoUrl ? (
          <div className="relative w-full h-48 bg-dark-900 overflow-hidden flex items-center justify-center border-b border-white/10">
            <img
              src={descriptionPhotoUrl}
              alt={chat.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-850/90 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="relative w-full h-32 bg-gradient-to-br from-primary-950/40 via-dark-800 to-dark-850 flex items-center justify-center border-b border-white/5 overflow-hidden">
            {/* Radial background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500/20 via-transparent to-transparent pointer-events-none" />
            <div className="relative w-16 h-16 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-[0_0_24px_rgba(59,130,246,0.3)]">
              <Bot className="w-8 h-8" />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Title and Identity Badges */}
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h2
                dir={isRtlTitle ? 'rtl' : 'ltr'}
                className="font-bold text-lg text-gray-100 tracking-tight"
              >
                {chat.title}
              </h2>
              {isVerified && (
                <span title="Verified Bot" className="text-primary-400 shrink-0">
                  <ShieldCheck className="w-4 h-4 fill-primary-500/20" />
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 font-bold text-[10px] uppercase tracking-wider">
                Bot
              </span>
            </div>

            {/* Username pill with copy */}
            {username && (
              <button
                type="button"
                onClick={handleCopyUsername}
                title="Click to copy username"
                className="group flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-xs text-gray-400 hover:text-primary-300 transition-colors cursor-pointer border border-white/5"
              >
                <span className="font-mono">@{username}</span>
                {copiedUsername ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                )}
              </button>
            )}
          </div>

          {/* Description Block */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-dark-800/80 border border-white/5">
            <div className="flex items-center gap-1.5 text-primary-400 font-bold text-xs uppercase tracking-wider select-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>What can this bot do?</span>
            </div>
            <FormattedDescription text={resolvedDescription} onOpenUrl={onOpenUrl} />
          </div>

          {/* Commands Preview List */}
          {resolvedCommands.length > 0 && (
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-dark-800/60 border border-white/5">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none px-0.5">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-primary-400" />
                  Commands Preview
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {resolvedCommands.length} total
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {displayedCommands.map((cmd) => {
                  const formattedCmd = cmd.command.startsWith('/')
                    ? cmd.command
                    : `/${cmd.command}`
                  return (
                    <button
                      key={formattedCmd}
                      type="button"
                      onClick={() => onSelectCommand?.(formattedCmd)}
                      title={`Click to preview ${formattedCmd}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.03] hover:bg-primary-500/10 active:bg-primary-500/15 border border-white/5 hover:border-primary-500/30 transition-all text-left cursor-pointer group"
                    >
                      <span className="font-mono font-bold text-xs text-primary-400 group-hover:text-primary-300 shrink-0">
                        {formattedCmd}
                      </span>
                      <span className="text-[11px] text-gray-400 group-hover:text-gray-200 truncate text-right">
                        {cmd.description}
                      </span>
                    </button>
                  )
                })}
              </div>

              {resolvedCommands.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllCommands((prev) => !prev)}
                  className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-primary-400 hover:text-primary-300 transition-colors py-1 cursor-pointer"
                >
                  <span>{showAllCommands ? 'Show fewer commands' : `View all ${resolvedCommands.length} commands`}</span>
                  {showAllCommands ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error Feedback Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col gap-1">
                <span className="font-bold text-rose-300">Start Bot Failed</span>
                <span className="text-rose-200/90 leading-relaxed">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleStartBotClick}
                className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Active START BOT Action Button */}
          <button
            type="button"
            disabled={isExecuting || isLoading}
            onClick={handleStartBotClick}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg select-none ${
              isExecuting || isLoading
                ? 'bg-primary-700/60 text-white/80 cursor-wait'
                : 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-400 active:scale-[0.98] text-white cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.35)]'
            }`}
          >
            {isExecuting || isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Starting Bot...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>START BOT</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BotIntroCard
