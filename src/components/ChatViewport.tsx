import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Send,
  Forward,
  EyeOff,
  Paperclip,
  Check,
  CheckCheck,
  Hash,
  Copy,
  Bookmark,
  Trash2,
  ExternalLink,
  Info,
  X,
  Radio,
  Users,
  Bot,
  User,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FileText,
  Music,
  Download,
  Maximize2,
  ChevronRight,
  Search,
  Pin,
  Camera,
  Sparkles,
  CornerUpLeft,
  Quote,
  Reply,
  Shield,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Smile,
  Mic,
  Image,
  FileUp,
  Bold,
  Italic,
  Code as CodeIcon,
  Strikethrough,
  Link as LinkIcon,
  Eye,
  Calendar,
  BellOff,
  Clock,
  ChevronUp,
  Flame,
  Layers,
  Split,
  Wand2,
  BarChart2,
  Gift,
  Cake,
  Tv,
  Languages,
  Zap,
  AtSign,
  Phone,
  ChevronLeft,
  RefreshCw,
  History,
  Image as ImageIcon,
  Star,
  Lock,
  PhoneCall,
} from 'lucide-react'
import { DialogItem, MessageItem, ChatDetails, MessageEntityItem, WebPagePreview, CustomEmojiPayload, ForumTopicItem, ScheduledMessageItem, MessageReactionItem, StickerItem, ChannelBoostStatus, AutoDownloadConfig } from '../types/telegram'
import lottie from 'lottie-web'
import { Avatar } from './Avatar'
import { VideoPlayer } from './VideoPlayer'
import { GroupStatsModal } from './GroupStatsModal'
import { ForumTopicsBar } from './ForumTopicsBar'
import { ScheduledMessagesModal } from './ScheduledMessagesModal'
import { StickerPickerDrawer } from './StickerPickerDrawer'
import { SharedMediaDrawer } from './SharedMediaDrawer'
import { PollWidget } from './PollWidget'
import { CreatePollModal } from './CreatePollModal'
import { MiniAppModal } from './MiniAppModal'
import { AdminLogModal } from './AdminLogModal'
import { PaidReactionModal } from './PaidReactionModal'
import { SavedMessagesBar } from './SavedMessagesBar'
import { GroupCallBar } from './GroupCallBar'
import { GroupCallModal } from './GroupCallModal'
import { useI18n } from '../i18n'
import { copyTextToClipboard } from '../utils/clipboard'
import { isRTL, formatFileSize, formatDuration, formatNumber } from '../utils/textUtils'

interface ChatViewportProps {
  chat: DialogItem | null
  messages: MessageItem[]
  ghostMode: boolean
  // 64Gram Fork Power Preferences
  showChatId?: boolean
  showMessageId?: boolean
  showSeconds?: boolean
  showSenderAvatar?: boolean
  quickForwardToSaved?: boolean
  alwaysDeleteBoth?: boolean
  copyCallbackData?: boolean
  suppressLinkWarning?: boolean
  autoDownload?: AutoDownloadConfig
  chatFontSize?: number
  bubbleRadius?: number
  bubblePadding?: number
  onSendMessage: (
    text: string,
    replyToMsgId?: number,
    options?: { silent?: boolean; scheduleDate?: number }
  ) => void
  onSendMedia?: (
    filePath: string,
    options?: {
      caption?: string
      replyToMsgId?: number
      isVoice?: boolean
      duration?: number
      forceDocument?: boolean
      silent?: boolean
      scheduleDate?: number
    }
  ) => Promise<void> | void
  onOpenDirectForward: (message: MessageItem) => void
  onQuickForwardToSaved?: (message: MessageItem) => Promise<boolean> | void
  onDeleteMessage?: (message: MessageItem) => Promise<boolean> | void
  onToggleGhostMode: () => void
  onSelectUserOrChat?: (target: string) => void
  onMergeHistoricalMessages?: (newMessages: MessageItem[]) => void
  onUpdateUnreadCount?: (chatId: string, unreadCount: number) => void
}

interface StagedAttachment {
  path: string
  name: string
  size?: number
  type: 'media' | 'document' | 'audio'
}

function classifyDroppedFile(file: File): 'media' | 'document' | 'audio' {
  const mime = file.type?.toLowerCase() || ''
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)
  ) {
    return 'media'
  }
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac', 'wma'].includes(ext)
  ) {
    return 'audio'
  }
  return 'document'
}

function extractFirstUrl(text: string): string | null {
  if (!text) return null
  const mdMatch = text.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/)
  if (mdMatch) return mdMatch[1]

  const match = text.match(/https?:\/\/[^\s]+/)
  if (!match) return null

  let url = match[0]
  const punctMatch = url.match(/([.,!?;:)>\]]+)$/)
  if (punctMatch) {
    url = url.slice(0, -punctMatch[1].length)
  }
  return url
}

const rendererPreviewCache = new Map<string, WebPagePreview | null>()

interface LinkPreviewCardProps {
  url: string
  existingPreview?: WebPagePreview
  onSafeOpen: (url: string) => void
}

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url, existingPreview, onSafeOpen }) => {
  const [preview, setPreview] = useState<WebPagePreview | null>(
    existingPreview || rendererPreviewCache.get(url) || null
  )
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    if (preview && (preview.image || preview.photoUrl || preview.description || preview.title)) return
    if (rendererPreviewCache.has(url)) {
      setPreview(rendererPreviewCache.get(url) || null)
      return
    }

    let isMounted = true
    if (window.guidegram?.getLinkPreview) {
      window.guidegram
        .getLinkPreview(url)
        .then((res) => {
          if (!isMounted) return
          rendererPreviewCache.set(url, res)
          if (res) setPreview(res)
        })
        .catch(() => {
          if (isMounted) rendererPreviewCache.set(url, null)
        })
    }
    return () => {
      isMounted = false
    }
  }, [url])

  if (!preview || (!preview.title && !preview.description && !preview.image && !preview.photoUrl)) {
    return null
  }

  const displayImg = !imageFailed ? (preview.image || preview.photoUrl) : undefined
  let siteName = preview.siteName || preview.domain
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./i, '')
    } catch {
      siteName = url
    }
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onSafeOpen(preview.url || url)
      }}
      dir={isRTL(preview.title || preview.description) ? 'rtl' : 'ltr'}
      className="mt-2.5 p-3 rounded-2xl bg-black/35 hover:bg-black/50 border-l-[3px] border-accent-cyan/90 border-t border-r border-b border-white/5 transition-all duration-150 cursor-pointer text-left group max-w-lg shadow-sm backdrop-blur-sm"
      title={`Open ${preview.url || url}`}
    >
      {/* Site Badge */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-cyan tracking-wider uppercase mb-1">
        {preview.favicon ? (
          <img
            src={preview.favicon}
            alt=""
            className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain"
            onError={(e) => {
              ;(e.currentTarget as HTMLElement).style.display = 'none'
            }}
          />
        ) : (
          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
        )}
        <span className="truncate max-w-[200px]">{siteName}</span>
      </div>

      {/* Title */}
      {preview.title && (
        <h4 className="text-xs md:text-sm font-bold text-gray-100 group-hover:text-cyan-200 transition-colors line-clamp-2 leading-snug mb-1">
          {preview.title}
        </h4>
      )}

      {/* Description */}
      {preview.description && (
        <p className="text-[11px] text-gray-300 line-clamp-3 leading-relaxed mb-2">
          {preview.description}
        </p>
      )}

      {/* Cover Image */}
      {displayImg && (
        <div className="rounded-xl overflow-hidden mt-2 border border-white/10 max-h-56 bg-dark-900/60">
          <img
            src={displayImg}
            alt={preview.title || 'Link preview'}
            className="w-full max-h-56 object-cover group-hover:scale-[1.01] transition-transform duration-200"
            onError={() => setImageFailed(true)}
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

interface ComposerLinkPreviewBarProps {
  url: string
  onDismiss: () => void
  onSafeOpen: (url: string) => void
}

const ComposerLinkPreviewBar: React.FC<ComposerLinkPreviewBarProps> = ({ url, onDismiss, onSafeOpen }) => {
  const [preview, setPreview] = useState<WebPagePreview | null>(rendererPreviewCache.get(url) || null)
  const [loading, setLoading] = useState(!rendererPreviewCache.has(url))

  useEffect(() => {
    if (rendererPreviewCache.has(url)) {
      setPreview(rendererPreviewCache.get(url) || null)
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    if (window.guidegram?.getLinkPreview) {
      window.guidegram
        .getLinkPreview(url)
        .then((res) => {
          if (!isMounted) return
          rendererPreviewCache.set(url, res)
          setPreview(res)
          setLoading(false)
        })
        .catch(() => {
          if (isMounted) {
            rendererPreviewCache.set(url, null)
            setLoading(false)
          }
        })
    } else {
      setLoading(false)
    }
    return () => {
      isMounted = false
    }
  }, [url])

  if (!loading && (!preview || (!preview.title && !preview.description && !preview.image && !preview.photoUrl))) {
    return null
  }

  let domain = preview?.siteName || preview?.domain
  if (!domain) {
    try {
      domain = new URL(url).hostname.replace(/^www\./i, '')
    } catch {
      domain = url
    }
  }

  const thumb = preview?.image || preview?.photoUrl

  return (
    <div className="px-4 py-2 bg-dark-850/95 border-b border-white/5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-1 duration-150 backdrop-blur-md">
      <div
        onClick={() => onSafeOpen(url)}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="w-9 h-9 rounded-xl object-cover shrink-0 border border-white/10"
            onError={(e) => {
              ;(e.currentTarget as HTMLElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 border border-accent-cyan/20">
            <ExternalLink className="w-4 h-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-cyan uppercase tracking-wider">
            <span>Link Preview</span>
            <span className="text-gray-500">•</span>
            <span className="truncate font-semibold text-gray-400 lowercase">{domain}</span>
          </div>
          <div className="text-xs text-gray-200 group-hover:text-cyan-200 transition-colors font-medium truncate">
            {loading ? 'Generating preview...' : preview?.title || url}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
        title="Remove link preview"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export const CustomEmojiView: React.FC<{
  accountId: string
  documentId: string
  fallback?: string
  className?: string
}> = ({ accountId, documentId, fallback, className = "inline-block w-[1.25em] h-[1.25em] align-[-0.2em] object-contain mx-0.5 select-none" }) => {
  const [payload, setPayload] = useState<CustomEmojiPayload | null>(null)
  const animContainerRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let active = true
    if (!documentId || !accountId) return

    if (window.guidegram?.getCustomEmojiData) {
      window.guidegram
        .getCustomEmojiData(accountId, documentId)
        .then((res) => {
          if (active && res) {
            setPayload(res)
          }
        })
        .catch(() => {})
    } else if (window.guidegram?.getCustomEmojiUrl) {
      window.guidegram
        .getCustomEmojiUrl(accountId, documentId)
        .then((url) => {
          if (active && url) {
            setPayload({ format: 'image', url })
          }
        })
        .catch(() => {})
    }

    return () => {
      active = false
    }
  }, [accountId, documentId])

  // Mount animated Lottie instance when payload is lottie
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
        console.warn('Lottie render error:', err)
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

  if (payload?.format === 'video' && payload.url) {
    return (
      <video
        src={payload.url}
        autoPlay
        loop
        muted
        playsInline
        className={className}
      />
    )
  }

  if (payload?.url) {
    return (
      <img
        src={payload.url}
        alt={fallback || 'emoji'}
        className={className}
        loading="lazy"
        draggable={false}
      />
    )
  }

  return <span className="inline-block">{fallback || '⭐'}</span>
}

export const TelegramBlockquote: React.FC<{
  children: React.ReactNode
  isRtl: boolean
  isExpandable?: boolean
}> = ({ children, isRtl, isExpandable }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`my-2 p-3 rounded-xl bg-accent-cyan/10 border-l-[3.5px] border-accent-cyan rounded-l-xs rounded-r-xl pl-3.5 pr-3 text-gray-200 relative group/quote transition-all ${
        isRtl ? 'text-right font-persian' : 'text-left font-latin'
      } ${collapsed ? 'max-h-24 overflow-hidden' : ''}`}
    >
      <div className={`flex items-center gap-1.5 mb-1 text-accent-cyan select-none ${isRtl ? 'justify-start' : 'justify-start'}`}>
        <span className="text-base font-serif font-black leading-none opacity-90">”</span>
      </div>

      <div className="text-xs leading-relaxed break-words whitespace-pre-wrap select-text">
        {children}
      </div>

      {isExpandable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setCollapsed(!collapsed)
          }}
          className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-accent-cyan hover:text-cyan-300 cursor-pointer select-none ${
            isRtl ? 'mr-auto' : 'ml-auto'
          }`}
        >
          <span>{collapsed ? 'Show more' : 'Show less'}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

export const TELEGRAM_PEER_COLORS = [
  'text-[#e17076]', // 0: red / coral
  'text-[#faa774]', // 1: orange / gold
  'text-[#a695e7]', // 2: violet / purple
  'text-[#7bc862]', // 3: green
  'text-[#6ec9cb]', // 4: cyan
  'text-[#65aadd]', // 5: blue
  'text-[#ee7aae]', // 6: pink
]

export function getTelegramPeerColorClass(peerId?: string, colorIndex?: number): string {
  if (colorIndex !== undefined && colorIndex >= 0 && colorIndex < TELEGRAM_PEER_COLORS.length) {
    return TELEGRAM_PEER_COLORS[colorIndex]
  }
  if (!peerId) return 'text-accent-cyan'
  let num = 0
  for (let i = 0; i < peerId.length; i++) {
    num = (num * 31 + peerId.charCodeAt(i)) >>> 0
  }
  return TELEGRAM_PEER_COLORS[num % TELEGRAM_PEER_COLORS.length]
}

export const TELEGRAM_PEER_BORDER_COLORS = [
  'border-[#e17076]', // 0: red / coral
  'border-[#faa774]', // 1: orange / gold
  'border-[#a695e7]', // 2: violet / purple
  'border-[#7bc862]', // 3: green
  'border-[#6ec9cb]', // 4: cyan
  'border-[#65aadd]', // 5: blue
  'border-[#ee7aae]', // 6: pink
]

export function getTelegramPeerBorderClass(peerId?: string, colorIndex?: number): string {
  if (colorIndex !== undefined && colorIndex >= 0 && colorIndex < TELEGRAM_PEER_BORDER_COLORS.length) {
    return TELEGRAM_PEER_BORDER_COLORS[colorIndex]
  }
  if (!peerId) return 'border-accent-cyan'
  let num = 0
  for (let i = 0; i < peerId.length; i++) {
    num = (num * 31 + peerId.charCodeAt(i)) >>> 0
  }
  return TELEGRAM_PEER_BORDER_COLORS[num % TELEGRAM_PEER_BORDER_COLORS.length]
}

export const ChatViewport: React.FC<ChatViewportProps> = ({
  chat,
  messages,
  ghostMode,
  showChatId = true,
  showMessageId = true,
  showSeconds = true,
  showSenderAvatar = true,
  quickForwardToSaved = true,
  alwaysDeleteBoth = true,
  copyCallbackData = true,
  suppressLinkWarning = false,
  autoDownload,
  chatFontSize = 14,
  bubbleRadius = 16,
  bubblePadding = 10,
  onSendMessage,
  onSendMedia,
  onOpenDirectForward,
  onQuickForwardToSaved,
  onDeleteMessage,
  onToggleGhostMode,
  onSelectUserOrChat,
  onMergeHistoricalMessages,
  onUpdateUnreadCount,
}) => {
  const [inputText, setInputText] = useState('')
  const [copiedChatId, setCopiedChatId] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [hoveredMessage, setHoveredMessage] = useState<MessageItem | null>(null)
  const { t } = useI18n()
  const [toast, setToast] = useState<string | null>(null)
  const [viewingEditHistoryMsg, setViewingEditHistoryMsg] = useState<MessageItem | null>(null)

  // Media cache in component state (cacheKey -> dataUrl or guidegram-media url)
  const [downloadedMedia, setDownloadedMedia] = useState<Record<string, string>>({})
  const [loadingMediaIds, setLoadingMediaIds] = useState<Record<string, boolean>>({})

  // Fullscreen image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Channel / User Info Drawer
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const failedMediaKeysRef = useRef<Set<string>>(new Set())

  // Dedicated User Profile Drawer (for clicking sender avatar or member)
  const [userProfilePeerId, setUserProfilePeerId] = useState<string | null>(null)
  const [userProfileDetails, setUserProfileDetails] = useState<ChatDetails | null>(null)
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(false)

  // Sync isMuted state whenever selected chat changes or updates
  useEffect(() => {
    setIsMuted(!!chat?.isMuted || !!chatDetails?.isMuted)
  }, [chat?.id, chat?.isMuted, chatDetails?.isMuted])

  // Cloud Drafts Sync: populate draft when opening chat
  useEffect(() => {
    if (chat?.draft?.text) {
      setInputText(chat.draft.text)
    } else {
      setInputText('')
    }
  }, [chat?.id, chat?.accountId])

  // Forum Topics (MTProto channels.getForumTopics)
  const [forumTopics, setForumTopics] = useState<ForumTopicItem[]>([])
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null)

  // Infinite Scroll & Message History Pagination
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const isLoadingOlderRef = useRef(false)
  const hasMoreOlderRef = useRef(true)

  // Scheduled Messages Modal (MTProto messages.getScheduledHistory)
  const [isScheduledListOpen, setIsScheduledListOpen] = useState(false)

  // Optimistic Message Reactions (MTProto messages.sendReaction)
  const [reactionOverrides, setReactionOverrides] = useState<Record<number, MessageReactionItem[]>>({})
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<number | null>(null)
  const [showAllReactions, setShowAllReactions] = useState(false)

  // Allowed reactions list respecting channel/group settings
  const allowedReactions = useMemo(() => {
    if (chatDetails?.availableReactions !== undefined) {
      if (chatDetails.availableReactions.length === 0) return []
      const list = [...chatDetails.availableReactions]
      if (chatDetails.canReactWithStars !== false && !list.includes('⭐')) {
        list.push('⭐')
      }
      return list
    }
    return ['👍', '❤️', '🔥', '🎉', '👏', '😂', '😮', '😢', '😍', '🤔', '🤝', '⚡', '⭐']
  }, [chatDetails?.availableReactions, chatDetails?.canReactWithStars])

  useEffect(() => {
    const handleCloseReactionMenu = () => {
      setActiveReactionPickerMsgId(null)
      setShowAllReactions(false)
    }
    window.addEventListener('click', handleCloseReactionMenu)
    return () => window.removeEventListener('click', handleCloseReactionMenu)
  }, [])

  // MTProto Native Stickers Drawer
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false)

  // MTProto Channel Boost Status (premium.getBoostsStatus)
  const [boostStatus, setBoostStatus] = useState<ChannelBoostStatus | null>(null)

  // Fetch Channel Boost Status
  useEffect(() => {
    setBoostStatus(null)
    if (!chat?.accountId || !chat?.id || (!chat.isChannel && !chatDetails?.isChannel)) return

    window.guidegram?.getChannelBoostStatus?.(chat.accountId, chat.id)
      .then((status) => {
        if (status) setBoostStatus(status)
      })
      .catch(() => {})
  }, [chat?.accountId, chat?.id, chat?.isChannel, chatDetails?.isChannel, isInfoOpen])

  // MTProto Native Message Translation (messages.translateText)
  const [translations, setTranslations] = useState<Record<number, string>>({})
  const [translatingIds, setTranslatingIds] = useState<Record<number, boolean>>({})

  // Fetch Forum Topics when a forum/group chat is opened
  useEffect(() => {
    setActiveTopicId(null)
    setForumTopics([])
    setReactionOverrides({})
    if (!chat?.accountId || !chat?.id) return

    if (chat.isGroup || chat.isForum) {
      window.guidegram?.getForumTopics?.(chat.accountId, chat.id)
        .then((topics) => {
          if (topics && topics.length > 0) {
            setForumTopics(topics)
          }
        })
        .catch(() => {})
    }
  }, [chat?.accountId, chat?.id, chat?.isGroup, chat?.isForum])

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isSharedMediaOpen, setIsSharedMediaOpen] = useState(false)
  const [isBotMenuOpen, setIsBotMenuOpen] = useState(false)
  const [callingBotBtnId, setCallingBotBtnId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<
    Record<number, { progress: number; bytesReceived: number; totalBytes: number }>
  >({})

  // In-chat search state (Ctrl+F)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSenderFilter, setSearchSenderFilter] = useState<{
    id?: string
    name?: string
  } | null>(null)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null)
  const [playingVoiceMsg, setPlayingVoiceMsg] = useState<MessageItem | null>(null)
  const [voicePlaybackSpeed, setVoicePlaybackSpeed] = useState<number>(1)
  const [voiceCurrentTime, setVoiceCurrentTime] = useState<number>(0)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reply bar state
  const [replyMessage, setReplyMessage] = useState<MessageItem | null>(null)

  // Debounced cloud draft synchronization
  const draftDebounceRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!chat) return
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current)

    draftDebounceRef.current = setTimeout(() => {
      if (window.guidegram?.saveDraft) {
        window.guidegram.saveDraft(
          chat.accountId,
          chat.id,
          inputText,
          replyMessage?.id
        ).catch(() => {})
      }
    }, 800)

    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current)
    }
  }, [inputText, chat?.id, chat?.accountId, replyMessage?.id])

  // Attachment popover menu & staging state
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false)
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false)
  const [isAdminLogOpen, setIsAdminLogOpen] = useState(false)
  const [paidReactionModalState, setPaidReactionModalState] = useState<{
    isOpen: boolean
    messageId: number | null
  }>({ isOpen: false, messageId: null })
  // Saved Messages 2.0 filter states
  const [savedSourceFilter, setSavedSourceFilter] = useState<string | null>(null)
  const [savedTagFilter, setSavedTagFilter] = useState<string | null>(null)
  const [savedSearchQuery, setSavedSearchQuery] = useState('')
  const [savedMediaFilter, setSavedMediaFilter] = useState<'all' | 'media' | 'files' | 'links' | 'voice'>('all')
  // Group Voice & Video Call states
  const [isGroupCallModalOpen, setIsGroupCallModalOpen] = useState(false)
  const [isCallJoined, setIsCallJoined] = useState(false)
  const [isCallMuted, setIsCallMuted] = useState(false)
  const [activeMiniApp, setActiveMiniApp] = useState<{
    url: string
    title: string
    botName?: string
    botUsername?: string
  } | null>(null)
  const [isLaunchingMiniApp, setIsLaunchingMiniApp] = useState(false)

  const handleLaunchMiniApp = async (appUrl?: string, appTitle?: string) => {
    if (!chat) return
    setIsLaunchingMiniApp(true)
    try {
      if (window.guidegram?.requestWebView) {
        const res = await window.guidegram.requestWebView(
          chat.accountId,
          chat.id,
          chat.id,
          appUrl,
          undefined,
          !appUrl
        )
        if (res && res.url) {
          setActiveMiniApp({
            url: res.url,
            title: appTitle || chat.title || 'Telegram Mini App',
            botName: chat.title,
            botUsername: chat.username,
          })
          return
        }
      }
      if (appUrl) {
        setActiveMiniApp({
          url: appUrl,
          title: appTitle || chat.title || 'Telegram Mini App',
          botName: chat.title,
          botUsername: chat.username,
        })
      } else {
        showToast(t('miniapp.loading') || 'Could not launch Mini App')
      }
    } catch (err: any) {
      console.warn('[MiniApp] Launch failed:', err)
      showToast(err?.message || 'Failed to launch Mini App')
    } finally {
      setIsLaunchingMiniApp(false)
    }
  }
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([])
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean
    percent: number
    fileName?: string
  }>({ isUploading: false, percent: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // Voice message recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([30, 45, 60, 40, 70, 55, 80, 50, 40, 60, 45, 30])
  const [isUploadingVoice, setIsUploadingVoice] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const analyserIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Floating "Scroll to Bottom" state
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [unreadScrollCount, setUnreadScrollCount] = useState(0)
  const isScrollingRef = useRef(false)
  const previousChatIdRef = useRef<string | null>(null)

  // Multi-line input ref
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Group mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<{ query: string; startPos: number } | null>(null)

  const mentionCandidates = useMemo(() => {
    if (!mentionQuery || (!chat?.isGroup && !chatDetails?.isGroup)) return []
    const q = mentionQuery.query.toLowerCase()
    const map = new Map<string, { id: string; name: string; username?: string; avatarUrl?: string }>()

    if (chatDetails?.participants) {
      for (const p of chatDetails.participants) {
        if (p.name || p.username) {
          map.set(p.id, { id: p.id, name: p.name, username: p.username, avatarUrl: p.avatarUrl })
        }
      }
    }

    for (const m of messages) {
      if (m.senderId && (m.senderName || m.senderUsername)) {
        if (!map.has(m.senderId)) {
          map.set(m.senderId, { id: m.senderId, name: m.senderName || 'User', username: m.senderUsername })
        } else if (m.senderUsername && !map.get(m.senderId)!.username) {
          map.get(m.senderId)!.username = m.senderUsername
        }
      }
    }

    const all = Array.from(map.values())
    if (!q) return all.slice(0, 6)
    return all
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.username && c.username.toLowerCase().includes(q))
      )
      .slice(0, 6)
  }, [mentionQuery, chat, chatDetails, messages])

  const handleInsertMention = (candidate: { id: string; name: string; username?: string }) => {
    if (!mentionQuery) return
    const tagText = candidate.username ? `@${candidate.username} ` : `@${candidate.name} `
    const before = inputText.slice(0, mentionQuery.startPos)
    const after = inputText.slice(mentionQuery.startPos + mentionQuery.query.length + 1)
    const newText = before + tagText + after
    setInputText(newText)
    setMentionQuery(null)
    setTimeout(() => {
      textareaRef.current?.focus()
      const newPos = before.length + tagText.length
      textareaRef.current?.setSelectionRange(newPos, newPos)
    }, 20)
  }

  // Floating Contextual Text Formatting Toolbar State (Telegram Desktop v7.0+)
  const [formatBar, setFormatBar] = useState<{
    visible: boolean
    start: number
    end: number
    selectedText: string
  }>({ visible: false, start: 0, end: 0, selectedText: '' })

  // Drag and Drop Overlay State (Telegram Desktop v7.2.6 & v6.8.4)
  const dragDepthRef = useRef(0)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [dismissedComposerUrl, setDismissedComposerUrl] = useState<string | null>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer?.types?.includes('Files')) {
      dragDepthRef.current += 1
      if (dragDepthRef.current === 1) {
        setIsDraggingOver(true)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDraggingOver(false)
    }
  }

  const handleDrop = async (e: React.DragEvent, forceType?: 'media' | 'document') => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setIsDraggingOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    const newAttachments: StagedAttachment[] = []
    for (const file of droppedFiles) {
      let filePath = ''
      if (window.guidegram?.getPathForFile) {
        try {
          filePath = window.guidegram.getPathForFile(file)
        } catch {}
      }
      if (!filePath && (file as any).path) {
        filePath = (file as any).path
      }

      // Fallback for virtual / in-memory files
      if (!filePath && window.guidegram?.saveTempFile) {
        try {
          const buf = await file.arrayBuffer()
          filePath = await window.guidegram.saveTempFile({
            buffer: buf,
            filename: file.name,
          })
        } catch {}
      }

      newAttachments.push({
        path: filePath || file.name,
        name: file.name,
        size: file.size,
        type: forceType || classifyDroppedFile(file),
      })
    }

    if (newAttachments.length > 0) {
      setStagedAttachments((prev) => [...prev, ...newAttachments])
      showToast(`Added ${newAttachments.length} file(s) to send tray`)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  // In-Chat Search match navigation index (Telegram Desktop v7.1.3)
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)

  // Pinned Messages Multi-Cycle & Drawer State (Telegram Desktop v6.7.8)
  const [activePinnedIdx, setActivePinnedIdx] = useState(0)
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false)
  const [pinnedSearchQuery, setPinnedSearchQuery] = useState('')

  // AI Text Tools dropdown state
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false)

  // Send Options Popover & Scheduled Message Modal (Telegram Desktop v7.0.4 & v6.8.5)
  const [isSendMenuOpen, setIsSendMenuOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [customScheduleTime, setCustomScheduleTime] = useState<string>('')

  // Contextual Text Formatter (Bold, Italic, Code, Strike, Spoiler, Quote)
  const applyTextFormat = (wrapper: string | ((text: string) => string)) => {
    const textarea = textareaRef.current
    if (!textarea || formatBar.start === formatBar.end) return
    const text = inputText
    const before = text.slice(0, formatBar.start)
    const selected = text.slice(formatBar.start, formatBar.end)
    const after = text.slice(formatBar.end)

    let formatted = ''
    if (typeof wrapper === 'function') {
      formatted = wrapper(selected)
    } else if (wrapper === '`' || wrapper === '```') {
      formatted = `${wrapper}${selected}${wrapper}`
    } else {
      formatted = `${wrapper}${selected}${wrapper}`
    }

    const newText = `${before}${formatted}${after}`
    setInputText(newText)
    setFormatBar({ visible: false, start: 0, end: 0, selectedText: '' })
    setTimeout(() => {
      textarea.focus()
      const newCursor = before.length + formatted.length
      textarea.setSelectionRange(newCursor, newCursor)
    }, 50)
  }

  const handleTextareaSelect = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start !== end && end - start > 0) {
      const selected = textarea.value.slice(start, end)
      setFormatBar({
        visible: true,
        start,
        end,
        selectedText: selected,
      })
    } else {
      if (formatBar.visible) {
        setFormatBar({ visible: false, start: 0, end: 0, selectedText: '' })
      }
    }
  }

  // Auto-expanding textarea height adjustment (Feature 16)
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const minHeight = 24
    const maxHeight = 160
    const targetHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)
    el.style.height = `${targetHeight}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputText, adjustTextareaHeight])

  const lastMarkedReadIdRef = useRef<number>(0)
  const markAsReadTimerRef = useRef<any>(null)

  useEffect(() => {
    lastMarkedReadIdRef.current = chat?.readInboxMaxId || 0
  }, [chat?.id])

  const firstUnreadMessageId = useMemo(() => {
    if (!chat || !chat.unreadCount || chat.unreadCount <= 0 || messages.length === 0) return null
    if (chat.readInboxMaxId && chat.readInboxMaxId > 0) {
      const found = messages.find((m) => m.id > chat.readInboxMaxId! && !m.isOutgoing)
      if (found) return found.id
    }
    const incoming = messages.filter((m) => !m.isOutgoing)
    const target = incoming[Math.max(0, incoming.length - chat.unreadCount)]
    return target?.id || null
  }, [chat?.id, chat?.unreadCount, chat?.readInboxMaxId, messages])

  // Throttled scroll listener detecting > 300px from bottom (Feature 19) & Infinite scroll to top
  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return
    isScrollingRef.current = true
    requestAnimationFrame(() => {
      const el = messagesContainerRef.current
      if (el) {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        const isScrolledUp = distanceFromBottom > 300
        setShowScrollBottom(isScrolledUp)
        if (distanceFromBottom <= 50) {
          setUnreadScrollCount(0)
        }

        // Dynamic Read Tracking: As user scrolls, detect the highest visible message and mark read progressively
        const containerBottom = el.scrollTop + el.clientHeight
        const msgNodes = el.querySelectorAll('[id^="msg-"]')
        let maxVisibleId = 0
        msgNodes.forEach((node) => {
          const htmlEl = node as HTMLElement
          if (htmlEl.offsetTop + htmlEl.offsetHeight <= containerBottom + 60) {
            const rawId = parseInt(htmlEl.id.replace('msg-', ''), 10)
            if (!isNaN(rawId) && rawId > maxVisibleId) {
              maxVisibleId = rawId
            }
          }
        })

        if (maxVisibleId > lastMarkedReadIdRef.current) {
          lastMarkedReadIdRef.current = maxVisibleId
          if (!ghostMode && chat && window.guidegram?.markAsRead) {
            if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current)
            markAsReadTimerRef.current = setTimeout(() => {
              window.guidegram.markAsRead(chat.accountId, chat.id, maxVisibleId)
            }, 300)
          }

          const remainingUnread = messages.filter((m) => !m.isOutgoing && m.id > maxVisibleId).length
          if (chat && onUpdateUnreadCount) {
            onUpdateUnreadCount(chat.id, remainingUnread)
          }
        }

        // Infinite Scroll: Fetch older messages when near top (< 120px)
        if (
          el.scrollTop < 120 &&
          !isLoadingOlderRef.current &&
          hasMoreOlderRef.current &&
          messages.length > 0 &&
          chat &&
          window.guidegram?.getMessages
        ) {
          const oldestMsg = messages[0]
          if (oldestMsg && oldestMsg.id > 1) {
            isLoadingOlderRef.current = true
            setIsLoadingOlder(true)
            const prevScrollHeight = el.scrollHeight
            const prevScrollTop = el.scrollTop

            window.guidegram
              .getMessages(chat.accountId, chat.id, 50, oldestMsg.id)
              .then((olderChunk) => {
                if (!olderChunk || olderChunk.length === 0) {
                  hasMoreOlderRef.current = false
                } else {
                  if (onMergeHistoricalMessages) {
                    onMergeHistoricalMessages(olderChunk)
                  }
                  requestAnimationFrame(() => {
                    if (messagesContainerRef.current) {
                      const newScrollHeight = messagesContainerRef.current.scrollHeight
                      messagesContainerRef.current.scrollTop =
                        newScrollHeight - prevScrollHeight + prevScrollTop
                    }
                  })
                }
              })
              .catch((err) => {
                console.warn('[ChatViewport] Failed to fetch older messages:', err)
              })
              .finally(() => {
                isLoadingOlderRef.current = false
                setIsLoadingOlder(false)
              })
          }
        }
      }
      isScrollingRef.current = false
    })
  }, [messages, chat, onMergeHistoricalMessages, ghostMode, onUpdateUnreadCount])

  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBottom(false)
    setUnreadScrollCount(0)
    if (!ghostMode && chat && window.guidegram?.markAsRead && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      lastMarkedReadIdRef.current = lastMsg.id
      window.guidegram.markAsRead(chat.accountId, chat.id, lastMsg.id)
      onUpdateUnreadCount?.(chat.id, 0)
    }
  }

  // Handle new incoming/outgoing messages and chat switching (Feature 19)
  useEffect(() => {
    // 1. Detect Chat Switch
    if (chat?.id !== previousChatIdRef.current) {
      previousChatIdRef.current = chat?.id || null
      hasMoreOlderRef.current = true
      isLoadingOlderRef.current = false
      setIsLoadingOlder(false)
      setShowScrollBottom(false)
      setUnreadScrollCount(0)
      setReplyMessage(null)
      setStagedAttachments([])
      setDismissedComposerUrl(null)

      setTimeout(() => {
        // If chat has unread messages, find the first unread message and scroll directly to it!
        const unreadCount = chat?.unreadCount || 0
        if (unreadCount > 0 && messages.length > 0) {
          const incoming = messages.filter((m) => !m.isOutgoing)
          const firstUnread = chat?.readInboxMaxId
            ? messages.find((m) => m.id > chat.readInboxMaxId! && !m.isOutgoing)
            : incoming[Math.max(0, incoming.length - unreadCount)]

          if (firstUnread) {
            const el = document.getElementById(`msg-${firstUnread.id}`)
            if (el) {
              el.scrollIntoView({ behavior: 'auto', block: 'start' })
              setShowScrollBottom(true)
              return
            }
          }
        }

        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      }, 60)
      return
    }

    // 2. Outgoing Message by Current User
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.isOutgoing) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShowScrollBottom(false)
      setUnreadScrollCount(0)
      return
    }

    // 3. Incoming Message: Check scroll position
    const el = messagesContainerRef.current
    if (!el) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom <= 300) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShowScrollBottom(false)
      setUnreadScrollCount(0)
    } else {
      setUnreadScrollCount((prev) => prev + 1)
      setShowScrollBottom(true)
    }
  }, [chat?.id, messages])

  // Listen for real-time Telegram upload progress events
  useEffect(() => {
    if (!window.guidegram?.on) return
    const cleanup = window.guidegram.on('telegram:upload-progress', (data: any) => {
      if (data && (!chat || data.chatId === chat.id)) {
        setUploadProgress({
          isUploading: data.progress < 100,
          percent: data.progress,
          fileName: data.filePath ? data.filePath.split(/[\\/]/).pop() : undefined,
        })
        if (data.progress >= 100) {
          setTimeout(() => {
            setUploadProgress({ isUploading: false, percent: 0 })
          }, 600)
        }
      }
    })
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [chat?.id])

  // Track active media download progress from backend
  useEffect(() => {
    if (!window.guidegram?.on) return
    const unsub = window.guidegram.on('telegram:download-progress', (payload: any) => {
      if (!payload || !payload.messageId) return
      if (payload.progress === -1 || payload.progress >= 100) {
        setDownloadProgress((prev) => {
          const next = { ...prev }
          delete next[payload.messageId]
          return next
        })
      } else {
        setDownloadProgress((prev) => ({
          ...prev,
          [payload.messageId]: {
            progress: payload.progress,
            bytesReceived: payload.bytesReceived,
            totalBytes: payload.totalBytes,
          },
        }))
      }
    })
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  // Active video message playing in-app
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null)

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    message: MessageItem
    selectedText?: string
  } | null>(null)

  // Close context menu & send menu on global click or Escape
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) setContextMenu(null)
      if (isSendMenuOpen) setIsSendMenuOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null)
        if (isSendMenuOpen) setIsSendMenuOpen(false)
        if (isScheduleModalOpen) setIsScheduleModalOpen(false)
      }
    }
    window.addEventListener('click', handleGlobalClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu, isSendMenuOpen, isScheduleModalOpen])

  // Reset drawer state & auto-fetch chat details for header banner & mute button
  useEffect(() => {
    setIsInfoOpen(false)
    setChatDetails(null)
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchSenderFilter(null)
    setMemberSearchQuery('')
    setPendingExternalUrl(null)
    setReplyMessage(null)
    setStagedAttachments([])
    setIsAttachMenuOpen(false)
    setSavedSourceFilter(null)
    setSavedTagFilter(null)
    setSavedSearchQuery('')
    setSavedMediaFilter('all')
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }
    setPlayingVoiceId(null)

    if (chat && window.guidegram?.getChatDetails) {
      window.guidegram.getChatDetails(chat.accountId, chat.id).then((details) => {
        if (details) setChatDetails(details)
      }).catch(() => {})
    }
  }, [chat?.id])

  // Ctrl+F hotkey listener for in-chat search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen])

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isSearchOpen])

  // Filter messages based on search sender filter and search query (64Gram)
  const filteredMessages = React.useMemo(() => {
    let result = messages

    // 1. Filter by specific user if sender filter is active
    if (searchSenderFilter) {
      result = result.filter((m) => {
        if (searchSenderFilter.id && m.senderId) {
          return m.senderId === searchSenderFilter.id
        }
        if (searchSenderFilter.name && m.senderName) {
          return m.senderName.toLowerCase() === searchSenderFilter.name.toLowerCase()
        }
        return false
      })
    }

    // 2. Filter by text query if present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (q.startsWith('from:')) {
        const fromTarget = q.slice(5).trim()
        if (fromTarget) {
          result = result.filter(
            (m) =>
              (m.senderName && m.senderName.toLowerCase().includes(fromTarget)) ||
              (m.senderId && m.senderId.includes(fromTarget))
          )
        }
      } else {
        result = result.filter(
          (m) =>
            (m.text && m.text.toLowerCase().includes(q)) ||
            (m.senderName && m.senderName.toLowerCase().includes(q)) ||
            (m.mediaFileName && m.mediaFileName.toLowerCase().includes(q))
        )
      }
    }

    // 3. Filter by active Forum Topic
    if (activeTopicId !== null) {
      result = result.filter(
        (m) =>
          m.id === activeTopicId ||
          m.replyToMsgId === activeTopicId ||
          (m.replyTo && m.replyTo.replyToMsgId === activeTopicId)
      )
    }

    // 4. Saved Messages 2.0 Filters (Source Chat, Reaction Tags, Search Query, Media Type)
    if (chat?.isSavedMessages) {
      if (savedSourceFilter) {
        result = result.filter(
          (m) => m.forwardInfo?.fromId === savedSourceFilter
        )
      }
      if (savedTagFilter) {
        result = result.filter(
          (m) => m.reactions && m.reactions.some((r) => r.emoji === savedTagFilter)
        )
      }
      if (savedSearchQuery.trim()) {
        const sq = savedSearchQuery.toLowerCase()
        result = result.filter(
          (m) =>
            (m.text && m.text.toLowerCase().includes(sq)) ||
            (m.mediaFileName && m.mediaFileName.toLowerCase().includes(sq)) ||
            (m.forwardInfo?.fromTitle && m.forwardInfo.fromTitle.toLowerCase().includes(sq))
        )
      }
      if (savedMediaFilter !== 'all') {
        result = result.filter((m) => {
          if (savedMediaFilter === 'media') return m.mediaType === 'photo' || m.mediaType === 'video'
          if (savedMediaFilter === 'files') return m.mediaType === 'document'
          if (savedMediaFilter === 'links') return Boolean(m.webPage || m.text?.includes('http'))
          if (savedMediaFilter === 'voice') return m.mediaType === 'voice' || Boolean(m.isVoice)
          return true
        })
      }
    }

    return result
  }, [
    messages,
    searchQuery,
    searchSenderFilter,
    activeTopicId,
    chat?.isSavedMessages,
    savedSourceFilter,
    savedTagFilter,
    savedSearchQuery,
    savedMediaFilter,
  ])

  useEffect(() => {
    setSearchMatchIndex(0)
  }, [searchQuery, searchSenderFilter])

  const handleNextSearchMatch = () => {
    if (filteredMessages.length === 0) return
    const nextIdx = (searchMatchIndex + 1) % filteredMessages.length
    setSearchMatchIndex(nextIdx)
    const targetMsg = filteredMessages[nextIdx]
    if (targetMsg) {
      handleScrollToReply(targetMsg.id)
    }
  }

  const handlePrevSearchMatch = () => {
    if (filteredMessages.length === 0) return
    const prevIdx = (searchMatchIndex - 1 + filteredMessages.length) % filteredMessages.length
    setSearchMatchIndex(prevIdx)
    const targetMsg = filteredMessages[prevIdx]
    if (targetMsg) {
      handleScrollToReply(targetMsg.id)
    }
  }

  const handleSearchFromUser = (senderId?: string, senderName?: string) => {
    setSearchSenderFilter({ id: senderId, name: senderName })
    setIsSearchOpen(true)
    showToast(`Filtering messages from ${senderName || 'user'}`)
  }

  const getSenderAdminTitle = (msg: MessageItem): string | undefined => {
    if (msg.senderRank) return msg.senderRank
    if (!chatDetails?.participants || !msg.senderId) return undefined
    const p = chatDetails.participants.find((part) => part.id === msg.senderId)
    if (!p) return undefined
    if (p.customTitle) return p.customTitle
    if (p.role === 'creator') return 'Owner'
    if (p.role === 'admin') return 'Admin'
    return undefined
  }

  const getSenderRole = (msg: MessageItem): 'creator' | 'admin' | 'member' | undefined => {
    if (!chatDetails?.participants || !msg.senderId) return undefined
    const p = chatDetails.participants.find((part) => part.id === msg.senderId)
    return p?.role
  }

  // Safe external link opener respecting suppressLinkWarning (64Gram)
  const handleSafeOpenUrl = (url: string) => {
    if (suppressLinkWarning || url.startsWith('tg://') || url.includes('t.me/')) {
      window.guidegram?.openExternal?.(url)
    } else {
      setPendingExternalUrl(url)
    }
  }

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(msg)
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 2200)
  }

  // Load chat details when drawer opens
  const handleOpenInfo = async () => {
    if (!chat) return
    setIsInfoOpen(true)
    setIsLoadingDetails(true)
    try {
      if (window.guidegram?.getChatDetails) {
        const details = await window.guidegram.getChatDetails(chat.accountId, chat.id)
        setChatDetails(details)
      }
    } catch (err) {
      console.warn('Failed to fetch chat details:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Open dedicated User Profile Drawer for a user
  const handleOpenUserProfile = (peerId?: string, fallbackTitle?: string) => {
    if (!peerId || !chat) return
    setUserProfilePeerId(peerId)
    setUserProfileDetails({
      id: peerId,
      title: fallbackTitle || 'User',
      isChannel: false,
      isGroup: false,
      isUser: true,
      isBot: false,
    })
    setIsLoadingUserProfile(true)
    if (window.guidegram?.getChatDetails) {
      window.guidegram
        .getChatDetails(chat.accountId, peerId)
        .then((details) => {
          if (details) setUserProfileDetails(details)
          setIsLoadingUserProfile(false)
        })
        .catch(() => {
          setIsLoadingUserProfile(false)
        })
    } else {
      setIsLoadingUserProfile(false)
    }
  }

  // Toggle notifications (Mute / Unmute)
  const handleToggleNotifications = async () => {
    if (!chat || !window.guidegram?.toggleChatNotifications) return
    const nextMuted = !isMuted
    const ok = await window.guidegram.toggleChatNotifications(chat.accountId, chat.id, nextMuted)
    if (ok) {
      setIsMuted(nextMuted)
      if (chat) {
        chat.isMuted = nextMuted
      }
      showToast(nextMuted ? 'Notifications muted' : 'Notifications unmuted')
    }
  }

  // Check whether current user can delete a message
  const canDeleteMessage = useCallback(
    (msg: MessageItem) => {
      // Outgoing message (sent by me) -> always allow delete
      if (msg.isOutgoing) return true
      // In 1-on-1 private chat (not channel, not group) -> allow delete
      if (!chat?.isChannel && !chat?.isGroup) return true
      // In supergroup/group/channel -> only allow if user is creator or has canDeleteMessages right
      if (chatDetails?.isCreator || chatDetails?.canDeleteMessages) return true
      return false
    },
    [chat, chatDetails]
  )

  // Lazy download media (photo thumbnail or full media)
  const requestMediaDownload = useCallback(
    async (msg: MessageItem, thumb = true) => {
      const cacheKey = thumb ? `${msg.id}_thumb` : `${msg.id}`
      if (
        downloadedMedia[cacheKey] ||
        loadingMediaIds[cacheKey] ||
        failedMediaKeysRef.current.has(cacheKey) ||
        !window.guidegram?.downloadMedia
      ) {
        return downloadedMedia[cacheKey] || null
      }

      setLoadingMediaIds((prev) => ({ ...prev, [cacheKey]: true }))
      try {
        const dataUrl = await window.guidegram.downloadMedia(
          msg.accountId,
          msg.chatId,
          msg.id,
          thumb
        )
        if (dataUrl) {
          setDownloadedMedia((prev) => ({ ...prev, [cacheKey]: dataUrl }))
          return dataUrl
        } else {
          failedMediaKeysRef.current.add(cacheKey)
        }
      } catch (err) {
        failedMediaKeysRef.current.add(cacheKey)
        console.warn(`Failed to download media for ${msg.id}:`, err)
      } finally {
        setLoadingMediaIds((prev) => {
          const next = { ...prev }
          delete next[cacheKey]
          return next
        })
      }
      return null
    },
    [downloadedMedia, loadingMediaIds]
  )

  // Cancel in-flight download of media
  const handleCancelDownload = async (msg: MessageItem) => {
    try {
      await window.guidegram?.cancelDownloadMedia?.(msg.accountId, msg.chatId, msg.id)
      setDownloadProgress((prev) => {
        const next = { ...prev }
        delete next[msg.id]
        return next
      })
      showToast(t('chat.download_cancelled'))
    } catch (e) {
      console.error(e)
    }
  }

  // Save media to file via native dialog
  const handleSaveMedia = async (msg: MessageItem) => {
    try {
      showToast(t('chat.preparing_save'))
      const res = await window.guidegram?.saveMediaToFile?.(
        msg.accountId,
        msg.chatId,
        msg.id,
        msg.mediaFileName
      )
      if (res?.success) {
        showToast(t('chat.file_saved'))
      } else if (res?.canceled) {
        // user canceled dialog
      } else {
        showToast(t('chat.file_save_error'))
      }
    } catch (err: any) {
      showToast(t('chat.file_download_error', { error: err?.message || 'unknown' }))
    }
  }

  // Audio Playback Controller
  const handlePlayVoice = async (msg: MessageItem) => {
    // If clicking on already playing voice, toggle pause/play
    if (playingVoiceId === msg.id && audioPlayerRef.current) {
      if (audioPlayerRef.current.paused) {
        audioPlayerRef.current.play().catch(() => {})
      } else {
        audioPlayerRef.current.pause()
        setPlayingVoiceId(null)
      }
      return
    }

    // Stop current playing audio if any
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }

    let audioSrc = downloadedMedia[msg.id] || msg.mediaUrl
    if (!audioSrc && window.guidegram?.downloadMedia) {
      setLoadingMediaIds((prev) => ({ ...prev, [msg.id]: true }))
      try {
        const dl = await window.guidegram.downloadMedia(msg.accountId, msg.chatId, msg.id, false)
        if (dl) {
          audioSrc = dl
          setDownloadedMedia((prev) => ({ ...prev, [msg.id]: dl }))
        }
      } catch (err) {
        console.warn('Failed to load voice audio:', err)
      } finally {
        setLoadingMediaIds((prev) => {
          const next = { ...prev }
          delete next[msg.id]
          return next
        })
      }
    }

    if (!audioSrc) {
      showToast('Could not load voice audio')
      return
    }

    const audio = new Audio(audioSrc)
    audio.playbackRate = voicePlaybackSpeed
    audio.ontimeupdate = () => {
      setVoiceCurrentTime(audio.currentTime)
    }
    audio.onended = () => {
      setPlayingVoiceId(null)
      setPlayingVoiceMsg(null)
      setVoiceCurrentTime(0)
    }
    audio.onerror = () => {
      setPlayingVoiceId(null)
      setPlayingVoiceMsg(null)
      showToast('Error playing audio format')
    }

    audioPlayerRef.current = audio
    setPlayingVoiceId(msg.id)
    setPlayingVoiceMsg(msg)
    setVoiceCurrentTime(0)
    audio.play().catch(() => {
      setPlayingVoiceId(null)
      setPlayingVoiceMsg(null)
    })
  }

  const handleStopVoice = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }
    setPlayingVoiceId(null)
    setPlayingVoiceMsg(null)
    setVoiceCurrentTime(0)
  }

  const handleSeekVoice = (seekSeconds: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = seekSeconds
      setVoiceCurrentTime(seekSeconds)
    }
  }

  const handleToggleVoiceSpeed = (e: React.MouseEvent) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2]
    const nextIdx = (speeds.indexOf(voicePlaybackSpeed) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setVoicePlaybackSpeed(nextSpeed)
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = nextSpeed
    }
  }

  // 64Gram Keyboard Shortcuts: Alt+F and Alt+C
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxUrl) {
          setLightboxUrl(null)
          return
        }
        if (isInfoOpen) {
          setIsInfoOpen(false)
          return
        }
        if (isAttachMenuOpen) {
          setIsAttachMenuOpen(false)
          return
        }
        if (replyMessage) {
          setReplyMessage(null)
          return
        }
        setSelectedMessage(null)
        return
      }

      const activeEl = document.activeElement
      const isInputFocused =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')

      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        const target =
          selectedMessage ||
          hoveredMessage ||
          (messages.length > 0 ? messages[messages.length - 1] : null)
        if (!target) return
        e.preventDefault()
        onOpenDirectForward(target)
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (isInputFocused && window.getSelection()?.toString()) return

        const target =
          selectedMessage ||
          hoveredMessage ||
          (messages.length > 0 ? messages[messages.length - 1] : null)
        if (!target) return
        e.preventDefault()

        if (!target.text || !target.text.trim()) {
          showToast(`Message #${target.id} has no text to copy`)
          return
        }

        navigator.clipboard
          .writeText(target.text)
          .then(() => {
            showToast(`Copied text of message #${target.id}`)
          })
          .catch(() => {
            showToast('Failed to copy to clipboard')
          })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMessage, hoveredMessage, messages, onOpenDirectForward, lightboxUrl, isInfoOpen, replyMessage, isAttachMenuOpen])

  // Attachment picking handlers (Feature 17)
  const handlePickAttachment = async (category: 'media' | 'document' | 'audio') => {
    setIsAttachMenuOpen(false)
    try {
      if (window.guidegram?.openFileDialog) {
        const res = await window.guidegram.openFileDialog({ type: category, allowMultiple: true })
        if (!res.canceled && res.filePaths.length > 0) {
          const newItems: StagedAttachment[] = res.filePaths.map((p) => ({
            path: p,
            name: p.split(/[\\/]/).pop() || 'file',
            type: category,
          }))
          setStagedAttachments((prev) => [...prev, ...newItems])
          setTimeout(() => textareaRef.current?.focus(), 50)
        }
      } else {
        if (category === 'media') imageInputRef.current?.click()
        else if (category === 'audio') audioInputRef.current?.click()
        else fileInputRef.current?.click()
      }
    } catch (err: any) {
      showToast(`File picker failed: ${err.message}`)
    }
  }

  const handleRemoveStagedAttachment = (index: number) => {
    setStagedAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Voice message recording handlers (Feature 18)
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      let mimeType = 'audio/webm;codecs=opus'
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      }

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      recordingChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data)
        }
      }

      // Live Web Audio visualizer
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        audioContextRef.current = audioCtx

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyserIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray)
          const sampled = Array.from(dataArray.slice(0, 16)).map((v) => Math.max(15, Math.round((v / 255) * 100)))
          setRecordingWaveform(sampled)
        }, 70)
      } catch (_) {}

      recorder.start(100)
      setIsRecordingVoice(true)
      setRecordingDuration(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      console.error('Microphone access error:', err)
      showToast('Microphone access denied or audio device not found')
    }
  }

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (analyserIntervalRef.current) {
      clearInterval(analyserIntervalRef.current)
      analyserIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    recordingChunksRef.current = []
    setIsRecordingVoice(false)
    setRecordingDuration(0)
    showToast('Recording cancelled')
  }

  const handleStopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    if (recordingDuration < 1) {
      showToast('Voice message too short')
      handleCancelRecording()
      return
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (analyserIntervalRef.current) {
      clearInterval(analyserIntervalRef.current)
      analyserIntervalRef.current = null
    }
    setIsUploadingVoice(true)

    const recorder = mediaRecorderRef.current
    const duration = recordingDuration

    recorder.onstop = async () => {
      try {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType })
        const buffer = await blob.arrayBuffer()
        const tempPath = await window.guidegram.saveTempFile({
          buffer,
          filename: `voice_${Date.now()}.ogg`,
        })

        if (onSendMedia) {
          await onSendMedia(tempPath, {
            isVoice: true,
            duration,
            replyToMsgId: replyMessage?.id,
          })
        } else if (chat?.accountId && chat?.id && window.guidegram?.sendMedia) {
          await window.guidegram.sendMedia(chat.accountId, chat.id, tempPath, {
            isVoice: true,
            duration,
            replyToMsgId: replyMessage?.id,
          })
        }
        setReplyMessage(null)
        showToast('Voice message sent')
      } catch (err) {
        console.error('Failed to send voice message:', err)
        showToast('Failed to send voice message')
      } finally {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop())
          mediaStreamRef.current = null
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {})
          audioContextRef.current = null
        }
        setIsUploadingVoice(false)
        setIsRecordingVoice(false)
        setRecordingDuration(0)
        recordingChunksRef.current = []
      }
    }

    recorder.stop()
  }

  // Cleanup voice recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  const handleSend = async (
    e?: React.FormEvent,
    options?: { silent?: boolean; scheduleDate?: number }
  ) => {
    if (e) e.preventDefault()
    if (isRecordingVoice) return
    setIsSendMenuOpen(false)

    // Handle sending staged attachments (Feature 17)
    if (stagedAttachments.length > 0) {
      const itemsToSend = [...stagedAttachments]
      const caption = inputText.trim()
      const replyId = replyMessage?.id

      setStagedAttachments([])
      setInputText('')
      setReplyMessage(null)
      if (chat && window.guidegram?.saveDraft) {
        window.guidegram.saveDraft(chat.accountId, chat.id, '').catch(() => {})
      }

      setUploadProgress({
        isUploading: true,
        percent: 5,
        fileName: itemsToSend[0].name,
      })

      try {
        for (let i = 0; i < itemsToSend.length; i++) {
          const item = itemsToSend[i]
          const fileCaption = i === 0 ? caption : undefined
          setUploadProgress({
            isUploading: true,
            percent: Math.round((i / itemsToSend.length) * 100),
            fileName: itemsToSend.length > 1 ? `[${i + 1}/${itemsToSend.length}] ${item.name}` : item.name,
          })
          if (onSendMedia) {
            await onSendMedia(item.path, {
              caption: fileCaption,
              replyToMsgId: replyId,
              forceDocument: item.type === 'document',
              silent: options?.silent,
              scheduleDate: options?.scheduleDate,
            })
          } else if (chat?.accountId && chat?.id && window.guidegram?.sendMedia) {
            await window.guidegram.sendMedia(chat.accountId, chat.id, item.path, {
              caption: fileCaption,
              replyToMsgId: replyId,
              forceDocument: item.type === 'document',
              silent: options?.silent,
              scheduleDate: options?.scheduleDate,
            })
          }
        }
        if (options?.silent) showToast('Attachment sent without sound')
        else if (options?.scheduleDate) showToast('Attachment scheduled')
      } catch (err: any) {
        console.error('Failed to send attachments:', err)
        showToast(`Failed to send attachment: ${err.message || err}`)
      } finally {
        setUploadProgress({ isUploading: false, percent: 0 })
      }
      return
    }

    // Handle standard text message (Feature 15 & 16)
    if (!inputText.trim()) return
    const targetReplyId = replyMessage?.id ?? (activeTopicId !== null ? activeTopicId : undefined)
    onSendMessage(inputText.trim(), targetReplyId, options)
    if (options?.silent) {
      showToast('Message sent without sound')
    } else if (options?.scheduleDate) {
      showToast(`Message scheduled for ${new Date(options.scheduleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    }
    setInputText('')
    setReplyMessage(null)
    setDismissedComposerUrl(null)
    if (chat && window.guidegram?.saveDraft) {
      window.guidegram.saveDraft(chat.accountId, chat.id, '').catch(() => {})
    }
  }

  // MTProto Native Send Sticker
  const handleSendSticker = async (sticker: StickerItem) => {
    if (!chat?.accountId || !chat?.id) return
    try {
      const targetReplyId = replyMessage?.id ?? (activeTopicId !== null ? activeTopicId : undefined)
      await window.guidegram?.sendSticker?.(
        chat.accountId,
        chat.id,
        sticker.id,
        sticker.accessHash,
        sticker.fileReferenceHex,
        targetReplyId
      )
      setIsStickerDrawerOpen(false)
      setReplyMessage(null)
      showToast('Sticker sent!')
    } catch (err: any) {
      console.error('Failed to send sticker:', err)
      showToast(`Failed to send sticker: ${err.message || err}`)
    }
  }

  // Message Reactions Toggle (MTProto messages.sendReaction)
  const handleToggleReaction = async (msg: MessageItem, emoji: string) => {
    if (!chat?.accountId || !chat?.id) return
    const currentRx = reactionOverrides[msg.id] ?? msg.reactions ?? []
    const existingReaction = currentRx.find((r) => r.emoji === emoji)
    const isAlreadyChosen = !!existingReaction?.chosen
    const emojiToSend = isAlreadyChosen ? '' : emoji

    // Optimistic local state update
    const nextRx = [...currentRx]
    const foundIdx = nextRx.findIndex((r) => r.emoji === emoji)
    if (isAlreadyChosen) {
      if (foundIdx >= 0) {
        if (nextRx[foundIdx].count <= 1) {
          nextRx.splice(foundIdx, 1)
        } else {
          nextRx[foundIdx] = {
            ...nextRx[foundIdx],
            count: nextRx[foundIdx].count - 1,
            chosen: false,
          }
        }
      }
    } else {
      if (foundIdx >= 0) {
        nextRx[foundIdx] = {
          ...nextRx[foundIdx],
          count: nextRx[foundIdx].count + 1,
          chosen: true,
        }
      } else {
        nextRx.push({ emoji, count: 1, chosen: true })
      }
    }
    setReactionOverrides((prev) => ({ ...prev, [msg.id]: nextRx }))

    try {
      if (window.guidegram?.sendReaction) {
        await window.guidegram.sendReaction(chat.accountId, chat.id, msg.id, emojiToSend)
      }
    } catch (err) {
      console.warn('Failed to send reaction:', err)
      showToast('Failed to send reaction')
    }
  }

  // MTProto Native Message Translation (messages.translateText)
  const handleTranslateMessage = async (msgId: number) => {
    if (translations[msgId]) {
      setTranslations((prev) => {
        const next = { ...prev }
        delete next[msgId]
        return next
      })
      return
    }
    if (!chat?.accountId || !chat?.id) return
    setTranslatingIds((prev) => ({ ...prev, [msgId]: true }))
    try {
      if (window.guidegram?.translateMessage) {
        const res = await window.guidegram.translateMessage(chat.accountId, chat.id, msgId, 'fa')
        if (res?.text) {
          setTranslations((prev) => ({ ...prev, [msgId]: res.text }))
          showToast('Message translated (Persian)')
        } else {
          showToast('No translation returned')
        }
      }
    } catch (err: any) {
      showToast('Translation error: ' + (err?.message || 'Failed'))
    } finally {
      setTranslatingIds((prev) => ({ ...prev, [msgId]: false }))
    }
  }

  // Handle Send as .txt File (Telegram Desktop v6.7.8)
  const handleSendAsFile = async () => {
    if (!inputText.trim()) return
    const textToSend = inputText
    const replyId = replyMessage?.id
    try {
      showToast('Creating text document...')
      const encoder = new TextEncoder()
      const buf = encoder.encode(textToSend)
      const filename = `message_${Date.now()}.txt`
      let tempPath = ''
      if (window.guidegram?.saveTempFile) {
        tempPath = await window.guidegram.saveTempFile({
          buffer: buf.buffer,
          filename,
        })
      }
      if (tempPath) {
        if (onSendMedia) {
          await onSendMedia(tempPath, {
            caption: 'Sent as text file',
            replyToMsgId: replyId,
            forceDocument: true,
          })
        } else if (chat?.accountId && chat?.id && window.guidegram?.sendMedia) {
          await window.guidegram.sendMedia(chat.accountId, chat.id, tempPath, {
            caption: 'Sent as text file',
            replyToMsgId: replyId,
            forceDocument: true,
          })
        }
        setInputText('')
        setReplyMessage(null)
        showToast('Text sent as file')
      } else {
        showToast('Failed to create temporary file')
      }
    } catch (err: any) {
      console.error('Failed to send text as file:', err)
      showToast(`Error sending as file: ${err.message || err}`)
    }
  }

  // Handle Split into Multiple Messages (Telegram Desktop v6.7.8)
  const handleSendSplit = async () => {
    if (!inputText.trim()) return
    const text = inputText
    const maxLen = 4000
    const chunks: string[] = []
    let i = 0
    while (i < text.length) {
      chunks.push(text.slice(i, i + maxLen))
      i += maxLen
    }
    setInputText('')
    const replyId = replyMessage?.id
    setReplyMessage(null)

    showToast(`Sending ${chunks.length} message parts...`)
    for (let c = 0; c < chunks.length; c++) {
      await onSendMessage(chunks[c], c === 0 ? replyId : undefined)
    }
  }

  // AI Text Transformations (Telegram Desktop v6.7 & v7.0.9)
  const handleAiTransform = (mode: 'professional' | 'grammar' | 'summarize' | 'emojify' | 'translate') => {
    setIsAiMenuOpen(false)
    if (!inputText.trim()) return
    const original = inputText.trim()

    let result = original
    switch (mode) {
      case 'professional':
        result = original
          .replace(/gonna/gi, 'going to')
          .replace(/wanna/gi, 'want to')
          .replace(/hey|hi|yo/gi, 'Hello')
          .replace(/thx|thanks/gi, 'Thank you')
          .replace(/plz|pls/gi, 'Please')
          .replace(/asap/gi, 'as soon as possible')
        if (!result.endsWith('.')) result += '.'
        showToast('Converted to professional tone')
        break
      case 'grammar':
        result = original
          .replace(/\s+/g, ' ')
          .replace(/\s([.,!?;:])/g, '$1')
          .replace(/([.,!?;:])(?=[^\s])/g, '$1 ')
          .replace(/(^\w|\.\s+\w)/g, (letter) => letter.toUpperCase())
        showToast('Grammar & punctuation polished')
        break
      case 'summarize':
        const sentences = original.split(/[.!?]+/).filter((s) => s.trim().length > 0)
        if (sentences.length > 2) {
          result = `Summary: ${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`
        } else {
          result = `Summary: ${original}`
        }
        showToast('Summarized text')
        break
      case 'emojify':
        result = original
          .replace(/\b(hello|hi)\b/gi, '$1 👋')
          .replace(/\b(great|awesome|good|perfect)\b/gi, '$1 ✨')
          .replace(/\b(yes|ok|done|sure)\b/gi, '$1 ✅')
          .replace(/\b(love|like)\b/gi, '$1 ❤️')
          .replace(/\b(fast|quick|speed)\b/gi, '$1 ⚡')
          .replace(/\b(important|note)\b/gi, '$1 📌')
          .replace(/\b(call|phone)\b/gi, '$1 📞')
          .replace(/\b(idea|thinking)\b/gi, '$1 💡')
        showToast('Emojis added')
        break
      case 'translate':
        showToast('Translation suggestion added')
        result = `[Translated]\n${original}`
        break
    }
    setInputText(result)
  }

  const handleCopyChatId = async () => {
    if (!chat) return
    await copyTextToClipboard(chat.id)
    setCopiedChatId(true)
    showToast(`Copied Chat ID: ${chat.id}`)
    setTimeout(() => setCopiedChatId(false), 2000)
  }

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false,
    })
  }

  // Scroll to replied message and highlight it, fetching historical context if not loaded
  const handleScrollToReply = async (replyId: number) => {
    const el = document.getElementById(`msg-${replyId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('reply-highlight')
      setTimeout(() => el.classList.remove('reply-highlight'), 1800)
      return
    }

    if (chat && window.guidegram?.getMessages) {
      showToast(`Loading original message #${replyId}...`)
      try {
        const chunk = await window.guidegram.getMessages(chat.accountId, chat.id, 50, replyId, -25)
        if (chunk && chunk.length > 0) {
          if (onMergeHistoricalMessages) {
            onMergeHistoricalMessages(chunk)
          }
          setTimeout(() => {
            const targetEl = document.getElementById(`msg-${replyId}`)
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
              targetEl.classList.add('reply-highlight')
              setTimeout(() => targetEl.classList.remove('reply-highlight'), 1800)
            } else {
              showToast(`Original message #${replyId} not in loaded history`)
            }
          }, 250)
          return
        }
      } catch (err) {
        console.warn('Failed to load message context:', err)
      }
    }

    showToast(`Original message #${replyId} not in loaded history`)
  }

  /**
   * Rich text renderer supporting:
   * 1. Telegram DC Entities (bold, italic, code, pre, text_url, etc.)
   * 2. Raw Markdown syntax (**bold**, __italic__, `code`, ```code blocks```, [links](url))
   * 3. Clickable URLs, tg:// deep links, t.me links, @mentions
   * 4. BiDi / RTL text direction
   */
  const renderFormattedText = (text: string, entities?: MessageEntityItem[], msgAccountId?: string) => {
    if (!text) return null
    const effectiveAccountId = msgAccountId || chat?.accountId || ''

    // Helper to highlight active search query in plain text
    const highlightQuery = (val: string, keyBase: string): React.ReactNode => {
      if (!searchQuery.trim() || !val) return val
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escaped})`, 'gi')
      const segments = val.split(regex)
      if (segments.length <= 1) return val
      return segments.map((seg, sIdx) =>
        seg.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark
            key={`${keyBase}-hl-${sIdx}`}
            className="bg-amber-400/40 text-amber-100 rounded px-0.5 font-bold shadow-sm"
          >
            {seg}
          </mark>
        ) : (
          seg
        )
      )
    }

    // Helper to render inline entities inside a sub-range [startRange, endRange]
    const renderInlineRange = (
      startRange: number,
      endRange: number,
      inlineEnts: MessageEntityItem[],
      keyPrefix: string
    ): React.ReactNode[] => {
      const points = new Set<number>([startRange, endRange])
      for (const ent of inlineEnts) {
        if (typeof ent.offset === 'number' && typeof ent.length === 'number') {
          const eStart = Math.max(startRange, Math.min(endRange, ent.offset))
          const eEnd = Math.max(startRange, Math.min(endRange, ent.offset + ent.length))
          if (eStart < endRange && eStart > startRange) points.add(eStart)
          if (eEnd < endRange && eEnd > startRange) points.add(eEnd)
        }
      }

      const sortedPoints = Array.from(points).sort((a, b) => a - b)
      const segments: React.ReactNode[] = []

      for (let i = 0; i < sortedPoints.length - 1; i++) {
        const start = sortedPoints[i]
        const end = sortedPoints[i + 1]
        if (start >= end) continue

        const subText = text.slice(start, end)
        const activeEnts = inlineEnts.filter(
          (e) => e.offset <= start && e.offset + e.length >= end
        )

        let node: React.ReactNode = highlightQuery(subText, `${keyPrefix}-${start}-${end}`)

        const customEmojiEnt = activeEnts.find((e) => e.type === 'custom_emoji' && e.documentId)
        if (customEmojiEnt) {
          node = (
            <CustomEmojiView
              key={`ce-${start}`}
              accountId={effectiveAccountId}
              documentId={customEmojiEnt.documentId!}
              fallback={subText}
            />
          )
        } else {
          for (const ent of activeEnts) {
            const key = `${keyPrefix}-${ent.type}-${start}`
            if (ent.type === 'bold') {
              node = <strong key={key} className="font-bold text-white">{node}</strong>
            } else if (ent.type === 'italic') {
              node = <em key={key} className="italic text-gray-200">{node}</em>
            } else if (ent.type === 'underline') {
              node = <u key={key} className="underline text-gray-200">{node}</u>
            } else if (ent.type === 'strike') {
              node = <span key={key} className="line-through text-gray-400">{node}</span>
            } else if (ent.type === 'spoiler') {
              node = (
                <span
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.currentTarget.classList.toggle('blur-[4px]')
                    e.currentTarget.classList.toggle('bg-white/15')
                  }}
                  title="Click to reveal spoiler"
                  className="rounded px-1 bg-white/15 blur-[4px] hover:blur-[2px] transition-all cursor-pointer select-none active:blur-none"
                >
                  {node}
                </span>
              )
            } else if (ent.type === 'code') {
              node = (
                <code
                  key={key}
                  className="px-1.5 py-0.5 rounded-md bg-black/40 text-accent-cyan font-mono text-[11px] border border-white/10"
                  dir="ltr"
                >
                  {node}
                </code>
              )
            } else if (ent.type === 'text_url' || ent.type === 'url') {
              const url = ent.url || subText
              node = (
                <a
                  key={key}
                  href={url}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSafeOpenUrl(url)
                  }}
                  className="text-accent-cyan underline hover:text-cyan-300 font-medium cursor-pointer"
                  title={`Open ${url}`}
                >
                  {node}
                </a>
              )
            } else if (ent.type === 'hashtag') {
              node = (
                <span
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onSelectUserOrChat) onSelectUserOrChat(subText)
                  }}
                  className="text-accent-cyan font-semibold hover:underline cursor-pointer"
                  title={`Hashtag: ${subText}`}
                >
                  {node}
                </span>
              )
            } else if (ent.type === 'mention') {
              const username = subText.replace(/^@/, '')
              node = (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onSelectUserOrChat) onSelectUserOrChat(username)
                    else window.guidegram?.openExternal?.(`https://t.me/${username}`)
                  }}
                  className="text-accent-cyan font-semibold hover:underline inline cursor-pointer"
                  title={`Open @${username}`}
                >
                  {node}
                </button>
              )
            }
          }
        }

        segments.push(<React.Fragment key={`seg-${start}-${end}`}>{node}</React.Fragment>)
      }
      return segments
    }

    // 1. If official Telegram entities are present, build rich element tree with unified block containers
    if (entities && entities.length > 0) {
      const textIsRtl = isRTL(text)

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

      const topBlocks: React.ReactNode[] = []
      let cursor = 0

      for (let bIdx = 0; bIdx < blockEntities.length; bIdx++) {
        const bEnt = blockEntities[bIdx]
        const bStart = Math.max(0, Math.min(text.length, bEnt.offset))
        const bEnd = Math.max(0, Math.min(text.length, bEnt.offset + bEnt.length))
        if (bStart < cursor) continue

        if (bStart > cursor) {
          topBlocks.push(
            <React.Fragment key={`top-norm-${cursor}-${bStart}`}>
              {renderInlineRange(cursor, bStart, inlineEntities, `norm-${cursor}`)}
            </React.Fragment>
          )
        }

        if (bEnd > bStart) {
          if (bEnt.type === 'blockquote' || bEnt.type === 'expandable_blockquote') {
            const blockContent = renderInlineRange(bStart, bEnd, inlineEntities, `bq-${bStart}`)
            const isExpandable = bEnt.type === 'expandable_blockquote' || bEnt.length > 280
            topBlocks.push(
              <TelegramBlockquote
                key={`top-bq-${bStart}-${bEnd}`}
                isRtl={textIsRtl}
                isExpandable={isExpandable}
              >
                {blockContent}
              </TelegramBlockquote>
            )
          } else if (bEnt.type === 'pre') {
            const preContent = text.slice(bStart, bEnd)
            topBlocks.push(
              <pre
                key={`top-pre-${bStart}-${bEnd}`}
                className="my-1.5 p-3 rounded-xl bg-black/50 text-accent-cyan font-mono text-xs overflow-x-auto border border-white/10 select-text"
                dir="ltr"
              >
                <code>{preContent}</code>
              </pre>
            )
          }
        }

        cursor = bEnd
      }

      if (cursor < text.length) {
        topBlocks.push(
          <React.Fragment key={`top-norm-${cursor}-${text.length}`}>
            {renderInlineRange(cursor, text.length, inlineEntities, `norm-${cursor}`)}
          </React.Fragment>
        )
      }

      return (
        <div
          dir={textIsRtl ? 'rtl' : 'ltr'}
          className={`whitespace-pre-wrap leading-relaxed break-words select-text ${
            textIsRtl ? 'text-right font-persian' : 'text-left font-latin'
          }`}
        >
          {topBlocks}
        </div>
      )
    }

    // 2. Fallback: Parse markdown tokens if no entities provided
    const tokenRegex =
      /(```[\s\S]*?```|`[^`\n]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\|\|[^|]+\|\||\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+|tg:\/\/[^\s]+|\bt\.me\/[a-zA-Z0-9_]+(?:\/[0-9]+)?|@[a-zA-Z0-9_]{3,32}|#[a-zA-Z0-9_\u0600-\u06FF]+)/g

    const renderInlineTokens = (str: string, keyPrefix: string) => {
      const parts = str.split(tokenRegex)

      return parts.map((part, index) => {
        if (!part) return null
        const partKey = `${keyPrefix}-${index}`

        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).replace(/^\n/, '')
          return (
            <pre
              key={partKey}
              className="my-1.5 p-3 rounded-xl bg-black/50 text-accent-cyan font-mono text-xs overflow-x-auto border border-white/10 select-text"
              dir="ltr"
            >
              <code>{content}</code>
            </pre>
          )
        }

        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={partKey}
              className="px-1.5 py-0.5 rounded-md bg-black/40 text-accent-cyan font-mono text-[11px] border border-white/10"
              dir="ltr"
            >
              {part.slice(1, -1)}
            </code>
          )
        }

        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={partKey} className="font-bold text-white">
              {highlightQuery(part.slice(2, -2), partKey)}
            </strong>
          )
        }

        if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
          return (
            <em key={partKey} className="italic text-gray-200">
              {highlightQuery(part.slice(2, -2), partKey)}
            </em>
          )
        }

        if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
          return (
            <span key={partKey} className="line-through text-gray-400">
              {highlightQuery(part.slice(2, -2), partKey)}
            </span>
          )
        }

        if (part.startsWith('||') && part.endsWith('||') && part.length > 4) {
          return (
            <span
              key={partKey}
              onClick={(e) => {
                e.stopPropagation()
                e.currentTarget.classList.toggle('bg-white/15')
                e.currentTarget.classList.toggle('blur-[4px]')
              }}
              title="Click to reveal spoiler"
              className="rounded px-1 bg-white/15 blur-[4px] hover:blur-[2px] transition-all cursor-pointer select-none active:blur-none"
            >
              {part.slice(2, -2)}
            </span>
          )
        }

        const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
        if (mdLinkMatch) {
          const [, title, url] = mdLinkMatch
          return (
            <a
              key={partKey}
              href={url}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSafeOpenUrl(url)
              }}
              className="text-accent-cyan underline hover:text-cyan-300 transition-colors font-medium cursor-pointer"
              title={`Open ${url}`}
            >
              {title}
            </a>
          )
        }

        if (part.startsWith('#')) {
          return (
            <span
              key={partKey}
              onClick={(e) => {
                e.stopPropagation()
                if (onSelectUserOrChat) onSelectUserOrChat(part)
              }}
              className="text-accent-cyan font-semibold hover:underline cursor-pointer"
              title={`Hashtag: ${part}`}
            >
              {part}
            </span>
          )
        }

        let cleanPart = part
        let trailingPunct = ''
        if (
          cleanPart.startsWith('http://') ||
          cleanPart.startsWith('https://') ||
          cleanPart.startsWith('tg://')
        ) {
          const match = cleanPart.match(/([.,!?;:)>\]]+)$/)
          if (match) {
            trailingPunct = match[1]
            cleanPart = cleanPart.slice(0, -trailingPunct.length)
          }
        }

        if (cleanPart.startsWith('tg://')) {
          return (
            <React.Fragment key={partKey}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  window.guidegram?.openExternal?.(cleanPart)
                }}
                className="text-primary-300 font-mono hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-white/5 px-1 rounded"
                title={`Telegram Deep Link: ${cleanPart}`}
              >
                {cleanPart}
              </button>
              {trailingPunct}
            </React.Fragment>
          )
        }

        const tMeMatch = cleanPart.match(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{3,32})(?:\/([0-9]+))?$/)
        if (tMeMatch) {
          const username = tMeMatch[1]
          const targetMsgId = tMeMatch[2]
          return (
            <React.Fragment key={partKey}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onSelectUserOrChat) {
                    onSelectUserOrChat(username)
                  } else {
                    window.guidegram?.openExternal?.(cleanPart.startsWith('http') ? cleanPart : `https://${cleanPart}`)
                  }
                }}
                className="text-accent-cyan underline hover:text-cyan-300 transition-colors font-medium inline cursor-pointer"
                title={`Open @${username}${targetMsgId ? ` message #${targetMsgId}` : ''}`}
              >
                {cleanPart}
              </button>
              {trailingPunct}
            </React.Fragment>
          )
        }

        if (cleanPart.startsWith('http://') || cleanPart.startsWith('https://')) {
          return (
            <React.Fragment key={partKey}>
              <a
                href={cleanPart}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSafeOpenUrl(cleanPart)
                }}
                className="text-accent-cyan underline hover:text-cyan-300 transition-colors break-all inline cursor-pointer"
                title={`Open ${cleanPart}`}
              >
                {cleanPart}
              </a>
              {trailingPunct}
            </React.Fragment>
          )
        }

        if (cleanPart.startsWith('@')) {
          const username = cleanPart.slice(1)
          return (
            <button
              key={partKey}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onSelectUserOrChat) {
                  onSelectUserOrChat(username)
                } else {
                  window.guidegram?.openExternal?.(`https://t.me/${username}`)
                }
              }}
              className="text-accent-cyan font-semibold hover:underline inline cursor-pointer"
              title={`Open @${username}`}
            >
              {cleanPart}
            </button>
          )
        }

        return <span key={partKey}>{highlightQuery(part, partKey)}</span>
      })
    }

    const lines = text.split('\n')
    const groupedParagraphs: { isQuote: boolean; lines: string[] }[] = []
    let currentGroup: { isQuote: boolean; lines: string[] } | null = null

    for (const line of lines) {
      const isQuoteLine = line.trimStart().startsWith('>')
      if (!currentGroup || currentGroup.isQuote !== isQuoteLine) {
        currentGroup = { isQuote: isQuoteLine, lines: [line] }
        groupedParagraphs.push(currentGroup)
      } else {
        currentGroup.lines.push(line)
      }
    }

    return (
      <div className="space-y-1">
        {groupedParagraphs.map((grp, gIdx) => {
          if (grp.isQuote) {
            const quoteContent = grp.lines.map((l) => l.replace(/^\s*>\s?/, '')).join('\n')
            const quoteIsRtl = isRTL(quoteContent)
            return (
              <TelegramBlockquote key={`gq-${gIdx}`} isRtl={quoteIsRtl}>
                {renderInlineTokens(quoteContent, `q-${gIdx}`)}
              </TelegramBlockquote>
            )
          }

          return grp.lines.map((para, pIdx) => {
            if (!para) return <div key={`p-${gIdx}-${pIdx}`} className="h-2" />
            const paraIsRtl = isRTL(para)
            return (
              <div
                key={`p-${gIdx}-${pIdx}`}
                dir={paraIsRtl ? 'rtl' : 'ltr'}
                className={`leading-relaxed break-words ${
                  paraIsRtl ? 'text-right font-persian' : 'text-left font-latin'
                }`}
              >
                {renderInlineTokens(para, `p-${gIdx}-${pIdx}`)}
              </div>
            )
          })
        })}
      </div>
    )
  }

  // Render media cards (Photo, Video, Document, Voice, Web Preview)
  const renderMediaCard = (msg: MessageItem) => {
    const mediaUrl = downloadedMedia[msg.id] || msg.mediaUrl

    // 1. Photo Card
    // 1. Sticker (Transparent, bubbleless image)
    if (msg.isSticker || msg.mediaType === 'sticker') {
      return (
        <div className="my-1 max-w-[200px] max-h-[200px] flex items-center justify-center">
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt="Telegram Sticker"
              className="w-44 h-44 object-contain transition-transform duration-150 hover:scale-105 select-none"
            />
          ) : (
            <div
              onClick={() => requestMediaDownload(msg, false)}
              className="relative w-36 h-36 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden group"
            >
              {msg.strippedThumb && (
                <img
                  src={msg.strippedThumb}
                  alt="Sticker preview"
                  className="absolute inset-0 w-full h-full object-contain filter blur-[6px] opacity-60 scale-95"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                {loadingMediaIds[msg.id] ? (
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6 text-primary-400 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[10px] font-medium text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  {loadingMediaIds[msg.id] ? 'Loading sticker...' : 'Load sticker'}
                </span>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 2. Poll or Quiz Card
    if (msg.mediaType === 'poll' || msg.poll) {
      return (
        <div className="my-1">
          <PollWidget
            message={msg}
            accountId={chat?.accountId || msg.accountId}
            chatId={chat?.id || msg.chatId}
            onVoteSuccess={() => {
              if (chat) {
                window.guidegram?.getMessages(chat.accountId, chat.id, 20).then((msgs) => {
                  if (msgs && onMergeHistoricalMessages) {
                    onMergeHistoricalMessages(msgs)
                  }
                }).catch(() => {})
              }
            }}
          />
        </div>
      )
    }

    // 2.5 Paid Media Card (Telegram Stars)
    if (msg.mediaType === 'paid_media') {
      const stars = msg.paidMediaStars || 1
      const count = msg.paidMediaCount || 1
      return (
        <div className="my-1.5 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-dark-800 to-amber-600/10 border border-amber-500/30 max-w-sm select-none shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-glow">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t('paid_media.title')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    {count} {t('paid_media.items')}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">{t('paid_media.locked')}</div>
              </div>
            </div>
            <Lock className="w-4 h-4 text-amber-400/80" />
          </div>

          <button
            type="button"
            onClick={() => setPaidReactionModalState({ isOpen: true, messageId: msg.id })}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{t('paid_media.unlock_for')} {stars} ⭐️</span>
          </button>
        </div>
      )
    }

    if (msg.mediaType === 'photo') {
      const isChannel = !!chat?.isChannel
      const isGroup = !!chat?.isGroup
      const isPrivate = !isChannel && !isGroup

      // Check auto-download policy
      const shouldAutoDownloadPhoto = (() => {
        const cfg = autoDownload || {
          enabled: true,
          photosInPrivate: true,
          photosInGroups: true,
          photosInChannels: false,
        }
        if (cfg.enabled === false) return false
        if (isChannel) return !!cfg.photosInChannels
        if (isGroup) return !!cfg.photosInGroups
        if (isPrivate) return !!cfg.photosInPrivate
        return false
      })()

      // Trigger lazy download ONLY if permitted by auto-download policy
      if (!mediaUrl && shouldAutoDownloadPhoto) {
        requestMediaDownload(msg, false)
      }

      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-900/50">
          {mediaUrl ? (
            <div className="relative group cursor-pointer" onClick={() => setLightboxUrl(mediaUrl)}>
              <img
                src={mediaUrl}
                alt="Telegram Photo"
                className="w-full max-h-80 object-cover rounded-2xl transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                <span className="p-2 bg-dark-900/80 rounded-xl text-white shadow-md">
                  <Maximize2 className="w-4 h-4" />
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => requestMediaDownload(msg, false)}
              className="relative w-72 h-48 bg-dark-850 flex flex-col items-center justify-center text-gray-400 cursor-pointer overflow-hidden group"
            >
              {msg.strippedThumb ? (
                <img
                  src={msg.strippedThumb}
                  alt="Thumbnail preview"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLElement).style.display = 'none'
                  }}
                  className="absolute inset-0 w-full h-full object-cover filter blur-[10px] scale-110"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/45 transition-colors flex flex-col items-center justify-center gap-2">
                {loadingMediaIds[msg.id] ? (
                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <Download className="w-5 h-5" />
                  </div>
                )}
                {msg.mediaFileSize ? (
                  <span className="text-[10px] font-medium text-white/90 bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    {formatFileSize(msg.mediaFileSize)}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-white/90">
                    {loadingMediaIds[msg.id] ? 'Loading image...' : 'Click to load image'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    // 2. Video Card
    if (msg.mediaType === 'video') {
      const fullVideoUrl =
        downloadedMedia[`${msg.id}`] ||
        (msg.mediaFilePath ? `guidegram-media://local/${encodeURIComponent(msg.mediaFilePath)}` : null)
      const thumbUrl = downloadedMedia[`${msg.id}_thumb`] || msg.mediaUrl || msg.strippedThumb
      const isThisVideoPlaying = activeVideoId === msg.id

      // If active video is playing and we have the video URL
      if (isThisVideoPlaying && fullVideoUrl) {
        return (
          <div className="mb-2 w-full max-w-md">
            <VideoPlayer
              src={fullVideoUrl}
              poster={thumbUrl}
              fileName={msg.mediaFileName}
              duration={msg.mediaDuration}
              onClose={() => setActiveVideoId(null)}
              onShowToast={showToast}
              onDownload={() => handleSaveMedia(msg)}
            />
          </div>
        )
      }

      const isLoadingVideo = loadingMediaIds[`${msg.id}`]
      const currentDl = downloadProgress[msg.id]
      const isDownloading = currentDl && currentDl.progress >= 0 && currentDl.progress < 100

      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-850/90 shadow-md group/video">
          {/* Poster or Thumbnail with Circular Play Button or Download Progress */}
          <div
            onClick={async () => {
              if (isDownloading) return
              if (fullVideoUrl) {
                setActiveVideoId(msg.id)
              } else {
                showToast(t('chat.buffering_video'))
                const videoDataUrl = await requestMediaDownload(msg, false)
                if (videoDataUrl) {
                  setActiveVideoId(msg.id)
                } else {
                  showToast(t('chat.video_stream_error'))
                }
              }
            }}
            className="relative w-full h-48 bg-dark-900 cursor-pointer overflow-hidden flex items-center justify-center"
          >
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt=""
                onError={(e) => {
                  ;(e.currentTarget as HTMLElement).style.display = 'none'
                }}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover/video:scale-105 ${
                  thumbUrl === msg.strippedThumb ? 'filter blur-[8px] scale-110' : ''
                }`}
              />
            ) : (
              <div className="absolute inset-0 bg-linear-to-br from-primary-900/40 via-dark-850 to-dark-900 flex items-center justify-center">
                <Play className="w-12 h-12 text-white/20" />
              </div>
            )}

            {/* Dark Overlay with Blur on Hover */}
            <div className="absolute inset-0 bg-black/35 group-hover/video:bg-black/20 transition-colors" />

            {/* Play Button or Download Progress Overlay */}
            {isDownloading ? (
              <div
                className="relative z-10 flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs font-mono font-bold text-primary-300">
                    {Math.round(currentDl.progress)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCancelDownload(msg)}
                    title={t('chat.stop_download')}
                    className="p-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-200 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-28 bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-500 h-full transition-all duration-150"
                    style={{ width: `${currentDl.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-300 font-mono">
                  {formatFileSize(currentDl.bytesReceived)} / {formatFileSize(currentDl.totalBytes || msg.mediaFileSize || 0)}
                </span>
              </div>
            ) : (
              <div className="relative z-10 w-14 h-14 rounded-full bg-primary-600/90 hover:bg-primary-500 text-white flex items-center justify-center shadow-glow group-hover/video:scale-110 active:scale-95 transition-all">
                {isLoadingVideo ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </div>
            )}

            {/* Duration Badge Bottom Right */}
            {msg.mediaDuration && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono font-medium text-white flex items-center gap-1">
                <span>{formatDuration(msg.mediaDuration)}</span>
              </div>
            )}

            {/* File Size Badge Bottom Left */}
            {msg.mediaFileSize && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono font-medium text-gray-300">
                {formatFileSize(msg.mediaFileSize)}
              </div>
            )}
          </div>

          {/* Video Footer info & Download Button */}
          <div className="p-2.5 flex items-center justify-between gap-2 border-t border-white/5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-200 truncate">
                {msg.mediaFileName || 'Video'}
              </div>
              <div className="text-[10px] text-gray-400">
                {isDownloading
                  ? t('chat.downloading_progress', { progress: Math.round(currentDl.progress) })
                  : t('chat.online_playback')}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isDownloading ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelDownload(msg)
                  }}
                  title={t('chat.stop_download')}
                  className="px-2 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('chat.stop_download')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSaveMedia(msg)
                  }}
                  title={t('chat.download_video')}
                  className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-primary-400" />
                  <span className="hidden sm:inline">{t('chat.download_video')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    // 3. Document / File Card
    if (msg.mediaType === 'document') {
      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-850/80 p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-200 truncate">
                {msg.mediaFileName || 'Attached File'}
              </div>
              <div className="text-[10px] text-gray-400">
                {formatFileSize(msg.mediaFileSize)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => requestMediaDownload(msg, false)}
              title="Download File"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )
    }

    // 4. Voice / Audio Card with Waveform & Speed Switcher
    if (msg.isVoice || msg.mediaType === 'voice') {
      const isPlaying = playingVoiceId === msg.id
      const isLoading = loadingMediaIds[msg.id]
      const duration = msg.mediaDuration || 0
      const currentPos = isPlaying ? voiceCurrentTime : 0
      const progressRatio = duration > 0 ? Math.min(1, currentPos / duration) : 0

      // Normalize waveform bars (up to 32 bars)
      const rawWaveform = msg.voiceWaveform || [40, 70, 30, 90, 60, 45, 80, 55, 35, 65, 85, 40, 60, 30, 80, 50]
      const bars = rawWaveform.slice(0, 36)

      return (
        <div className="mb-2 rounded-2xl overflow-hidden max-w-sm border border-white/10 bg-dark-850/90 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Play / Pause button */}
            <button
              type="button"
              onClick={() => handlePlayVoice(msg)}
              className="w-10 h-10 rounded-xl bg-accent-emerald/25 hover:bg-accent-emerald text-accent-emerald hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
              title={isPlaying ? 'Pause' : 'Play Voice Message'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Waveform and scrubber */}
            <div className="flex-1 min-w-0">
              {/* Interactive waveform with seeking */}
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
                  const seekRatio = rect.width > 0 ? clickX / rect.width : 0
                  const newTime = seekRatio * duration
                  if (isPlaying && audioPlayerRef.current) {
                    audioPlayerRef.current.currentTime = newTime
                    setVoiceCurrentTime(newTime)
                  } else {
                    handlePlayVoice(msg).then(() => {
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.currentTime = newTime
                        setVoiceCurrentTime(newTime)
                      }
                    })
                  }
                }}
                title={t('voice.seek') || 'Click to seek'}
                className="flex items-center gap-0.5 h-6 cursor-pointer py-1 group/waveform"
              >
                {bars.map((val, i) => {
                  const barProgress = i / bars.length
                  const isPassed = barProgress <= progressRatio
                  const maxVal = Math.max(...bars, 31)
                  const heightPercent = Math.max(18, Math.min(100, Math.round((val / maxVal) * 100)))
                  return (
                    <div
                      key={i}
                      style={{ height: `${heightPercent}%` }}
                      className={`w-1 rounded-full transition-all group-hover/waveform:scale-y-105 ${
                        isPassed ? 'bg-accent-emerald' : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                <span>
                  {isPlaying
                    ? `${formatDuration(Math.round(voiceCurrentTime))} / ${formatDuration(duration)}`
                    : `Voice • ${formatDuration(duration)}`}
                </span>

                {/* 1x / 1.5x / 2x Speed Controller */}
                <button
                  type="button"
                  onClick={handleToggleVoiceSpeed}
                  title="Toggle playback speed"
                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-mono text-[9px] transition-colors cursor-pointer"
                >
                  {voicePlaybackSpeed}x
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  if (!chat) {
    return (
      <div className="flex-1 min-w-0 bg-dark-900 flex flex-col items-center justify-center text-gray-500 gap-3 select-none">
        <div className="w-16 h-16 rounded-3xl bg-dark-800/80 border border-white/5 flex items-center justify-center text-gray-400 shadow-glow">
          <Forward className="w-8 h-8" />
        </div>
        <div className="text-sm font-semibold text-gray-300">Select a conversation to start chatting</div>
        <div className="text-xs text-gray-600">
          Guidegram • Multi-Account • Fast Direct Forward (Alt+F)
        </div>
      </div>
    )
  }

  const isChannel = chat.isChannel
  const isGroup = chat.isGroup
  const isBot = chat.isBot

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
      className="relative flex-1 min-w-0 bg-dark-900 flex flex-col h-full overflow-hidden titlebar-no-drag"
    >
      {/* Feature 20: Agency-Grade Drag & Drop Overlay with Dual Zones */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-dark-950/80 backdrop-blur-xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex-1 border-2 border-dashed border-accent-cyan/60 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-[0_0_60px_rgba(6,182,212,0.15)] pointer-events-none">
            {/* Center Pulse Icon */}
            <div className="w-20 h-20 rounded-3xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)] ring-1 ring-accent-cyan/30">
              <FileUp className="w-10 h-10 animate-bounce" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Drop files to send to <span className="text-accent-cyan">{chat.title}</span>
            </h3>
            <p className="text-xs text-gray-400 text-center max-w-sm mb-6">
              Images, videos, and documents will be added to attachments with automatic media detection.
            </p>

            {/* Dual Target Drop Zones (Telegram Desktop Parity) */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg pointer-events-auto">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => handleDrop(e, 'media')}
                className="p-4 rounded-2xl bg-dark-850/80 hover:bg-accent-cyan/10 border border-white/10 hover:border-accent-cyan/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <Image className="w-6 h-6 text-primary-400 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Quick Media</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Photos & Videos with preview</span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => handleDrop(e, 'document')}
                className="p-4 rounded-2xl bg-dark-850/80 hover:bg-accent-emerald/10 border border-white/10 hover:border-accent-emerald/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <FileText className="w-6 h-6 text-accent-emerald group-hover:scale-110 transition-transform mb-2" />
                <span className="text-xs font-semibold text-gray-200 group-hover:text-white">Without Compression</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Original documents & files</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2.5 rounded-2xl bg-dark-800/95 border border-primary-500/30 text-xs font-semibold text-white shadow-glow flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
          <Check className="w-4 h-4 text-accent-emerald shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Chat Header with Generous Spacing & Clickable Channel Info */}
      <div className="h-16 shrink-0 bg-dark-850/90 border-b border-white/5 px-4 flex items-center justify-between backdrop-blur-md z-20 shadow-sm">
        {/* Clickable Header Profile Button */}
        <div
          onClick={handleOpenInfo}
          title="Click to view channel/chat details"
          className="flex items-center gap-3 hover:bg-white/5 p-1.5 -ml-1.5 rounded-2xl transition-colors cursor-pointer group max-w-lg"
        >
          <Avatar
            accountId={chat.accountId}
            peerId={chat.id}
            title={chat.title}
            initials={chat.avatarInitials}
            avatarUrl={chat.avatarUrl}
            size="md"
            className="ring-2 ring-transparent group-hover:ring-primary-500/50 transition-all"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                dir={isRTL(chat.title) ? 'rtl' : 'ltr'}
                className="text-xs font-bold text-gray-100 group-hover:text-primary-300 transition-colors truncate"
              >
                {chat.title}
              </span>
              {(chatDetails?.customEmojiStatusId || chat.customEmojiStatusId) && (
                <CustomEmojiView
                  accountId={chat.accountId}
                  documentId={chatDetails?.customEmojiStatusId || chat.customEmojiStatusId!}
                  fallback="⭐"
                  className="inline-block w-4 h-4 align-middle shrink-0"
                />
              )}
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            <div className="text-[11px] text-gray-400 truncate">
              {isChannel
                ? 'Broadcast Channel'
                : isGroup
                ? 'Group Chat'
                : isBot
                ? 'Bot'
                : 'Online'}
            </div>
          </div>
        </div>

        {/* Quick Action Tools */}
        <div className="flex items-center gap-2">
          {/* Chat ID Badge with 1-Click Copy */}
          {showChatId && (
            <button
              onClick={handleCopyChatId}
              title="Click to copy numeric Chat ID"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-primary-400" />
              <span>ID: {chat.id}</span>
              {copiedChatId ? (
                <Check className="w-3 h-3 text-accent-emerald" />
              ) : (
                <Copy className="w-3 h-3 text-gray-500" />
              )}
            </button>
          )}

          {/* Ghost Mode Quick Toggle */}
          <button
            onClick={onToggleGhostMode}
            title={ghostMode ? 'Ghost Mode Active (No read receipt sent)' : 'Ghost Mode Off'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              ghostMode
                ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
                : 'bg-dark-800 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ghost: {ghostMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Bot Mini App Trigger */}
          {chat.isBot && (
            <button
              onClick={() => handleLaunchMiniApp()}
              disabled={isLaunchingMiniApp}
              title={t('miniapp.launch')}
              className="px-2.5 py-1.5 rounded-xl bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs active:scale-95"
            >
              <Bot className={`w-4 h-4 text-primary-400 ${isLaunchingMiniApp ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('miniapp.launch')}</span>
            </button>
          )}

          {/* Voice Chat / Live Stream Trigger */}
          {(chat.isGroup || chat.isChannel) && (
            <button
              type="button"
              onClick={() => setIsGroupCallModalOpen(true)}
              title={chatDetails?.isBroadcast ? t('group_call.live_stream') : t('group_call.title')}
              className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                chatDetails?.hasGroupCall || isCallJoined
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow'
                  : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-emerald-400 border border-white/10'
              }`}
            >
              <Radio className={`w-4 h-4 ${chatDetails?.hasGroupCall || isCallJoined ? 'text-emerald-400 animate-pulse' : ''}`} />
            </button>
          )}

          {/* In-Chat Search Toggle (Ctrl+F) */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search in Chat (Ctrl+F)"
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              isSearchOpen
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                : 'bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Scheduled Messages Modal Trigger */}
          {(!chat.isChannel || chat.isGroup || chatDetails?.isGroup || chat.isSavedMessages || chat.canSendMessages || chatDetails?.canSendMessages || chatDetails?.isCreator) && (
            <button
              onClick={() => setIsScheduledListOpen(true)}
              title={t('chat.scheduled_messages')}
              className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-accent-violet border border-white/10 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-accent-violet" />
            </button>
          )}

          {/* Group Statistics Modal Trigger */}
          {chat.isGroup && (
            <button
              onClick={() => setIsStatsModalOpen(true)}
              title={t('chat.group_stats')}
              className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-accent-cyan border border-white/10 transition-colors cursor-pointer"
            >
              <BarChart2 className="w-4 h-4 text-accent-cyan" />
            </button>
          )}

          {/* Shared Media Gallery Button */}
          <button
            onClick={() => setIsSharedMediaOpen(true)}
            title={t('shared_media.title')}
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-primary-400 border border-white/10 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-primary-400" />
          </button>

          {/* Chat Info Drawer Button */}
          <button
            onClick={handleOpenInfo}
            title="Channel / Chat Info"
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating In-Chat Search Bar (Ctrl+F) */}
      {isSearchOpen && (
        <div className="shrink-0 px-4 py-2 bg-dark-800/95 border-b border-white/10 flex items-center gap-2 z-20 shadow-md animate-in slide-in-from-top duration-150 backdrop-blur-md">
          <Search className="w-4 h-4 text-primary-400 shrink-0" />
          {searchSenderFilter && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 text-xs font-semibold shrink-0">
              <User className="w-3 h-3" />
              <span>From: {searchSenderFilter.name || searchSenderFilter.id}</span>
              <button
                type="button"
                onClick={() => setSearchSenderFilter(null)}
                className="p-0.5 hover:bg-accent-cyan/20 rounded-md transition-colors cursor-pointer"
                title="Clear sender filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <input
            ref={searchInputRef}
            type="text"
            dir={isRTL(searchQuery) ? 'rtl' : 'ltr'}
            placeholder={
              searchSenderFilter
                ? "Search in this user's messages..."
                : "Search messages in this conversation... (Esc to close)"
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (e.shiftKey) {
                  handlePrevSearchMatch()
                } else {
                  handleNextSearchMatch()
                }
              } else if (e.key === 'Escape') {
                setIsSearchOpen(false)
                setSearchQuery('')
              }
            }}
            className="flex-1 bg-dark-750 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
          {searchQuery && (
            <div className="flex items-center gap-1 text-[11px] text-gray-300 font-mono shrink-0 bg-dark-750 px-2 py-0.5 rounded-lg border border-white/5">
              <span>
                {filteredMessages.length > 0 ? `${searchMatchIndex + 1} of ${filteredMessages.length}` : '0 of 0'}
              </span>
              <button
                type="button"
                onClick={handlePrevSearchMatch}
                disabled={filteredMessages.length === 0}
                title="Previous match (Shift+Enter)"
                className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextSearchMatch}
                disabled={filteredMessages.length === 0}
                title="Next match (Enter)"
                className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false)
              setSearchQuery('')
            }}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            title="Close Search (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Telegram Floating Voice & Audio Player Banner */}
      {playingVoiceId !== null && playingVoiceMsg && (
        <div className="shrink-0 px-4 py-2.5 bg-dark-850/98 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-3 z-20 select-none shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => handlePlayVoice(playingVoiceMsg)}
              className="w-8 h-8 rounded-full bg-accent-emerald text-white flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={audioPlayerRef.current && !audioPlayerRef.current.paused ? 'Pause' : 'Play'}
            >
              {audioPlayerRef.current && !audioPlayerRef.current.paused ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Info & Scrubber */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-center gap-1.5 truncate">
                  <Mic className="w-3 h-3 text-accent-emerald shrink-0" />
                  <span className="font-semibold text-white truncate">
                    {playingVoiceMsg.senderName || t('voice.voice_message') || 'Voice Message'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                  <span>{formatDuration(Math.round(voiceCurrentTime))}</span>
                  <span className="mx-1">/</span>
                  <span>{formatDuration(playingVoiceMsg.mediaDuration || 0)}</span>
                </div>
              </div>

              {/* Mini Scrubber Bar */}
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
                  const ratio = rect.width > 0 ? clickX / rect.width : 0
                  const newTime = ratio * (playingVoiceMsg.mediaDuration || 0)
                  handleSeekVoice(newTime)
                }}
                className="relative w-full h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer overflow-hidden transition-all group/bar"
              >
                <div
                  style={{
                    width: `${
                      playingVoiceMsg.mediaDuration && playingVoiceMsg.mediaDuration > 0
                        ? Math.min(100, (voiceCurrentTime / playingVoiceMsg.mediaDuration) * 100)
                        : 0
                    }%`,
                  }}
                  className="h-full bg-accent-emerald rounded-full transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Playback speed toggle */}
            <button
              type="button"
              onClick={handleToggleVoiceSpeed}
              title={t('voice.speed') || 'Playback speed'}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-mono text-[10px] font-bold transition-colors cursor-pointer"
            >
              {voicePlaybackSpeed}x
            </button>

            {/* Jump to Message */}
            <button
              type="button"
              onClick={() => handleScrollToReply(playingVoiceMsg.id)}
              title="Jump to message"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>

            {/* Stop & Close */}
            <button
              type="button"
              onClick={handleStopVoice}
              title="Stop playback"
              className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Pinned Messages Multi-Cycle Banner (Telegram Desktop v6.7.8) */}
      {(() => {
        const pinnedList = chatDetails?.pinnedMessages && chatDetails.pinnedMessages.length > 0
          ? chatDetails.pinnedMessages
          : chatDetails?.pinnedMessage
          ? [chatDetails.pinnedMessage]
          : []

        if (pinnedList.length === 0) return null

        const currentPinned = pinnedList[activePinnedIdx % pinnedList.length] || pinnedList[0]
        const totalPinned = pinnedList.length

        return (
          <div
            className="shrink-0 px-4 py-2 bg-dark-850/95 border-b border-white/5 flex items-center justify-between gap-3 z-10 select-none hover:bg-dark-800 transition-colors"
          >
            <div
              onClick={() => {
                handleScrollToReply(currentPinned.id)
                if (totalPinned > 1) {
                  setActivePinnedIdx((prev) => (prev + 1) % totalPinned)
                }
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0">
                <Pin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-accent-cyan flex items-center gap-2">
                  <span>Pinned Message</span>
                  {totalPinned > 1 && (
                    <span className="text-[10px] font-medium text-gray-400 bg-white/5 px-1.5 py-0.2 rounded-md">
                      {(activePinnedIdx % totalPinned) + 1} of {totalPinned}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 truncate max-w-xl">
                  {currentPinned.text || `Message #${currentPinned.id} (Click to cycle & jump)`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {totalPinned > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPinnedDrawerOpen(true)
                  }}
                  className="px-2 py-1 text-[10px] font-semibold text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-accent-cyan/20"
                  title="View all pinned messages"
                >
                  <Layers className="w-3 h-3" />
                  <span>All ({totalPinned})</span>
                </button>
              )}
              <ChevronRight
                onClick={() => {
                  handleScrollToReply(currentPinned.id)
                  if (totalPinned > 1) {
                    setActivePinnedIdx((prev) => (prev + 1) % totalPinned)
                  }
                }}
                className="w-3.5 h-3.5 text-gray-500 hover:text-white cursor-pointer"
              />
            </div>
          </div>
        )
      })()}

      {/* Forum Topics Bar for Supergroups */}
      {forumTopics.length > 0 && (
        <ForumTopicsBar
          topics={forumTopics}
          activeTopicId={activeTopicId}
          onSelectTopic={(topicId) => setActiveTopicId(topicId)}
        />
      )}

      {/* Saved Messages 2.0 Dual-Pane Filter & Tags Bar */}
      {chat?.isSavedMessages && (
        <SavedMessagesBar
          accountId={chat.accountId}
          messages={messages}
          selectedSourceId={savedSourceFilter}
          onSelectSource={setSavedSourceFilter}
          selectedTag={savedTagFilter}
          onSelectTag={setSavedTagFilter}
          searchQuery={savedSearchQuery}
          onSearchChange={setSavedSearchQuery}
          mediaFilter={savedMediaFilter}
          onMediaFilterChange={setSavedMediaFilter}
          totalCount={messages.length}
          filteredCount={filteredMessages.length}
        />
      )}

      {/* Telegram Group Voice & Video Call Active Banner */}
      {(chatDetails?.hasGroupCall || isCallJoined) && (
        <GroupCallBar
          chatTitle={chat.title}
          isBroadcast={chatDetails?.isBroadcast}
          participantsCount={chatDetails?.groupCallParticipantsCount || 1}
          isJoined={isCallJoined}
          isMuted={isCallMuted}
          onJoin={() => {
            setIsCallJoined(true)
            setIsGroupCallModalOpen(true)
          }}
          onOpen={() => setIsGroupCallModalOpen(true)}
          onLeave={() => setIsCallJoined(false)}
          onToggleMute={() => setIsCallMuted(!isCallMuted)}
        />
      )}

      {/* 2. Messages Feed Outer Relative Wrapper */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMessage(null)
          }}
        >
        {isLoadingOlder && (
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-accent-cyan font-medium animate-in fade-in duration-150">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-cyan" />
            <span>{t('chat.loading_prev')}</span>
          </div>
        )}
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 gap-3">
            {(chat.isBot || chatDetails?.isBot) && !searchQuery ? (
              <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-dark-850/80 border border-white/10 shadow-xl max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-glow">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="font-bold text-base text-gray-100">{chat.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  {chatDetails?.about || t('app.bot_welcome')}
                </div>
                <button
                  type="button"
                  onClick={() => onSendMessage('/start')}
                  className="mt-2 px-6 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-500 active:scale-95 text-white font-bold text-xs transition-all shadow-glow flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t('app.start_bot')}</span>
                </button>
              </div>
            ) : (
              <div>
                {searchQuery ? `No messages found matching "${searchQuery}"` : 'No messages in this chat yet.'}
              </div>
            )}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isSelected = selectedMessage?.id === msg.id
            const isFirstUnread = msg.id === firstUnreadMessageId

            return (
              <React.Fragment key={msg.id}>
                {isFirstUnread && (
                  <div className="flex items-center justify-center my-3 select-none sticky top-2 z-20">
                    <div className="px-4 py-1 rounded-full bg-primary-600/30 text-primary-300 border border-primary-500/40 text-xs font-semibold shadow-md backdrop-blur-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                      <span>{t('chat.unread_separator')}</span>
                    </div>
                  </div>
                )}
                <div
                  id={`msg-${msg.id}`}
                onMouseEnter={() => setHoveredMessage(msg)}
                onMouseLeave={() => setHoveredMessage(null)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const selection = window.getSelection()?.toString()
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    message: msg,
                    selectedText: selection && selection.trim() ? selection.trim() : undefined,
                  })
                }}
                onClick={async (e) => {
                  // 64Gram Feature: Quick forward when pressed ctrl
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onQuickForwardToSaved) {
                      const ok = await onQuickForwardToSaved(msg)
                      if (ok !== false) {
                        showToast(`Forwarded message #${msg.id} to Saved Messages!`)
                      } else {
                        showToast('Failed to forward to Saved Messages')
                      }
                    }
                    return
                  }
                  setSelectedMessage(isSelected ? null : msg)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setReplyMessage(msg)
                  setTimeout(() => textareaRef.current?.focus(), 50)
                }}
                className={`flex flex-col group transition-all select-text ${
                  msg.isOutgoing ? 'items-end' : 'items-start'
                }`}
              >
                <div className="relative max-w-[80%] md:max-w-[70%] flex items-end gap-1.5">
                  {/* Outgoing Message Action Bar */}
                  {msg.isOutgoing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity self-center bg-dark-850/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-md relative">
                      {/* Reaction Picker Button */}
                      {allowedReactions.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveReactionPickerMsgId((prev) => (prev === msg.id ? null : msg.id))
                              setShowAllReactions(false)
                            }}
                            title="Add reaction"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              activeReactionPickerMsgId === msg.id
                                ? 'text-amber-400 bg-dark-750'
                                : 'text-gray-400 hover:text-amber-400 hover:bg-dark-750'
                            }`}
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          {activeReactionPickerMsgId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-full mb-2 right-0 z-50 p-2 rounded-2xl bg-dark-850/98 backdrop-blur-xl border border-white/15 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                                {allowedReactions.slice(0, showAllReactions ? 36 : 6).map((emoji: string) => {
                                  const isChosen = (reactionOverrides[msg.id] ?? msg.reactions ?? []).some(
                                    (r) => r.emoji === emoji && r.chosen
                                  )
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => {
                                        handleToggleReaction(msg, emoji)
                                        setActiveReactionPickerMsgId(null)
                                      }}
                                      className={`hover:scale-130 active:scale-95 transition-all text-sm cursor-pointer p-1 rounded-xl ${
                                        isChosen ? 'bg-primary-500/30 ring-1 ring-primary-400' : 'hover:bg-white/10'
                                      }`}
                                      title={`${isChosen ? 'Remove' : 'React with'} ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  )
                                })}
                                {allowedReactions.length > 6 && !showAllReactions && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllReactions(true)}
                                    className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                                    title="Show all reactions"
                                  >
                                    +{allowedReactions.length - 6}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reply Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplyMessage(msg)
                          setTimeout(() => textareaRef.current?.focus(), 50)
                        }}
                        title="Reply to message"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {quickForwardToSaved && onQuickForwardToSaved && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const ok = await onQuickForwardToSaved(msg)
                            if (ok !== false) {
                              showToast('Forwarded to Saved Messages!')
                            } else {
                              showToast('Failed to forward to Saved Messages')
                            }
                          }}
                          title="Quick Forward to Saved Messages (Ctrl+Click on message)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDirectForward(msg)
                        }}
                        title="Direct Forward without Quote (Alt+F)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!msg.text || !msg.text.trim()) {
                            showToast(`Message #${msg.id} has no text to copy`)
                            return
                          }
                          const ok = await copyTextToClipboard(msg.text)
                          if (ok) {
                            showToast(`Copied message #${msg.id} text`)
                          } else {
                            showToast('Failed to copy text')
                          }
                        }}
                        title="Copy Text (Alt+C)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Translate Button (MTProto messages.translateText) */}
                      {msg.text && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTranslateMessage(msg.id)
                          }}
                          disabled={translatingIds[msg.id]}
                          title="Translate to Persian (Alt+T)"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            translations[msg.id]
                              ? 'text-accent-cyan bg-accent-cyan/15'
                              : 'text-gray-400 hover:text-accent-cyan hover:bg-dark-750'
                          }`}
                        >
                          <Languages className={`w-3.5 h-3.5 ${translatingIds[msg.id] ? 'animate-spin text-accent-cyan' : ''}`} />
                        </button>
                      )}

                      {onDeleteMessage && canDeleteMessage(msg) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const confirmMsg = alwaysDeleteBoth
                              ? `Delete message #${msg.id} for both sides?`
                              : `Delete message #${msg.id}?`
                            if (window.confirm(confirmMsg)) {
                              const ok = await onDeleteMessage(msg)
                              if (ok !== false) {
                                showToast(`Deleted message #${msg.id}`)
                              } else {
                                showToast('Failed to delete message')
                              }
                            }
                          }}
                          title={alwaysDeleteBoth ? 'Delete for everyone' : 'Delete message'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Group Sender Avatar */}
                  {!msg.isOutgoing && showSenderAvatar && chat.isGroup && (
                    <Avatar
                      accountId={msg.accountId || chat.accountId}
                      peerId={msg.senderId}
                      avatarUrl={msg.senderAvatarUrl}
                      title={msg.senderName || 'Sender'}
                      initials={(msg.senderName || 'U').substring(0, 2).toUpperCase()}
                      size="sm"
                      className="shrink-0 self-end mb-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (msg.senderId) {
                          handleOpenUserProfile(msg.senderId, msg.senderName)
                        }
                      }}
                    />
                  )}

                  <div className="flex flex-col min-w-0 max-w-full">
                    {/* Message Bubble (Stickers render transparently without bubble frame) */}
                    <div
                      className={`transition-all ${
                      msg.isSticker || msg.mediaType === 'sticker'
                        ? 'bg-transparent p-0'
                        : `text-xs shadow-sm ${
                            msg.isOutgoing
                              ? 'bg-primary-600 text-white rounded-br-sm'
                              : 'bg-dark-800 text-gray-200 border border-white/5 rounded-bl-sm'
                          } ${msg.isDeletedLocally ? 'ring-1 ring-rose-500/50 border-rose-500/30' : ''}`
                    } ${isSelected ? 'ring-2 ring-primary-400' : ''}`}
                      style={{
                        fontSize: msg.isSticker || msg.mediaType === 'sticker' ? undefined : `${chatFontSize}px`,
                        borderRadius: msg.isSticker || msg.mediaType === 'sticker' ? undefined : `${bubbleRadius}px`,
                        padding: msg.isSticker || msg.mediaType === 'sticker' ? undefined : `${bubblePadding}px ${Math.round(bubblePadding * 1.4)}px`,
                      }}
                    >
                    {/* Group Sender Name with 64Gram Admin Badges */}
                    {!msg.isOutgoing && chat.isGroup && msg.senderName && (
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            if (msg.senderId) {
                              handleOpenUserProfile(msg.senderId, msg.senderName)
                            } else {
                              handleSearchFromUser(msg.senderId, msg.senderName)
                            }
                          }}
                          title={`Click to view profile of ${msg.senderName}`}
                          className={`text-[11px] font-bold hover:underline cursor-pointer ${getTelegramPeerColorClass(
                            msg.senderId,
                            msg.senderColor
                          )}`}
                        >
                          {msg.senderName}
                        </span>
                        {msg.senderUsername && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              if (msg.senderId) {
                                handleOpenUserProfile(msg.senderId, msg.senderName)
                              }
                            }}
                            className="text-[10px] text-gray-400/90 font-mono hover:underline cursor-pointer"
                            title={`@${msg.senderUsername}`}
                          >
                            @{msg.senderUsername}
                          </span>
                        )}
                        {msg.senderEmojiStatusId && (
                          <CustomEmojiView
                            accountId={msg.accountId}
                            documentId={msg.senderEmojiStatusId}
                            fallback="⭐"
                            className="inline-block w-3.5 h-3.5 align-middle select-none shrink-0"
                          />
                        )}
                        {getSenderAdminTitle(msg) && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 select-none ${
                              getSenderRole(msg) === 'creator'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                            }`}
                          >
                            <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                            <span>{getSenderAdminTitle(msg)}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Forwarded Header */}
                    {msg.isForwarded && (
                      <div className="text-[10px] text-primary-200/90 font-medium mb-1.5 flex items-center gap-1">
                        <Forward className="w-3 h-3 inline" />
                        <span>Forwarded from {msg.forwardFromName || 'unknown'}</span>
                      </div>
                    )}

                    {/* Reply Quote Banner */}
                    {msg.replyToMsgId && (() => {
                      const repliedMsg = messages.find((m) => m.id === msg.replyToMsgId)
                      const rName = msg.replyTo?.senderName || repliedMsg?.senderName || 'Reply'
                      const rSenderId = msg.replyTo?.senderId || repliedMsg?.senderId
                      const rText = msg.replyTo?.text || repliedMsg?.text
                      const rMediaType = msg.replyTo?.mediaType || repliedMsg?.mediaType
                      const rIsVoice = msg.replyTo?.isVoice || repliedMsg?.isVoice || rMediaType === 'voice'
                      const rIsSticker = msg.replyTo?.isSticker || repliedMsg?.isSticker || rMediaType === 'sticker'
                      const rThumb =
                        msg.replyTo?.strippedThumb ||
                        repliedMsg?.strippedThumb ||
                        msg.replyTo?.mediaThumbnailUrl ||
                        (repliedMsg ? downloadedMedia[`${repliedMsg.id}_thumb`] || downloadedMedia[repliedMsg.id] || repliedMsg.mediaUrl : undefined)

                      const hasMediaThumb = Boolean(rThumb || rMediaType === 'photo' || rMediaType === 'video' || rIsSticker)
                      const peerColorClass = getTelegramPeerColorClass(rSenderId)
                      const peerBorderClass = getTelegramPeerBorderClass(rSenderId)

                      return (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleScrollToReply(msg.replyToMsgId!)
                          }}
                          dir={isRTL(rText || '') ? 'rtl' : 'ltr'}
                          className={`mb-2 p-1.5 px-2.5 rounded-xl bg-black/25 hover:bg-black/35 border-l-2 ${peerBorderClass} cursor-pointer transition-colors flex items-center gap-2.5 text-left`}
                        >
                          {/* Mini thumbnail if media exists */}
                          {hasMediaThumb && (
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                              {rThumb ? (
                                <img
                                  src={rThumb}
                                  alt=""
                                  onError={(e) => {
                                    ;(e.currentTarget as HTMLElement).style.display = 'none'
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className={`text-[10px] font-bold ${peerColorClass} flex items-center gap-1 truncate`}>
                              <CornerUpLeft className="w-2.5 h-2.5 shrink-0" />
                              <span>{rName}</span>
                            </div>
                            <div className="text-[11px] text-gray-300 truncate max-w-md font-normal">
                              {rText ? (
                                rText
                              ) : rIsVoice ? (
                                <span className="inline-flex items-center gap-1 text-accent-cyan font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan inline-block"></span>
                                  <span>Voice message</span>
                                </span>
                              ) : rMediaType === 'photo' ? (
                                <span className="text-gray-300">Photo</span>
                              ) : rMediaType === 'video' ? (
                                <span className="text-gray-300">Video</span>
                              ) : rIsSticker ? (
                                <span className="text-gray-300">Sticker</span>
                              ) : rMediaType === 'document' ? (
                                <span className="text-gray-300">Document</span>
                              ) : (
                                <span className="text-gray-400">Message</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Media Card (Photo, Video, Document, etc.) */}
                    {renderMediaCard(msg)}

                    {/* Formatted Message Body with Markdown & Entities & RTL */}
                    {msg.text && renderFormattedText(msg.text, msg.entities, msg.accountId)}

                    {/* Feature 22: Rich Web Link Preview Card */}
                    {(() => {
                      const url = msg.webPage?.url || (msg.text ? extractFirstUrl(msg.text) : null)
                      if (!url) return null
                      return (
                        <LinkPreviewCard
                          url={url}
                          existingPreview={msg.webPage}
                          onSafeOpen={handleSafeOpenUrl}
                        />
                      )
                    })()}

                    {/* MTProto Live Translation Banner */}
                    {translations[msg.id] && (
                      <div className="mt-2 pt-2 border-t border-white/10 bg-dark-900/60 rounded-xl p-3 border border-accent-cyan/25 flex flex-col gap-1.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-accent-cyan">
                          <div className="flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5" />
                            <span>{t('chat.live_translation')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setTranslations((prev) => {
                                const next = { ...prev }
                                delete next[msg.id]
                                return next
                              })
                            }}
                            className="text-gray-400 hover:text-white p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div
                          dir="rtl"
                          className="text-gray-100 text-xs leading-relaxed select-text font-sans whitespace-pre-wrap"
                        >
                          {translations[msg.id]}
                        </div>
                      </div>
                    )}


                    {/* Telegram Reactions Pills (❤️ 12, 🔥 5) */}
                    {(() => {
                      const effectiveRx = reactionOverrides[msg.id] ?? msg.reactions ?? []
                      if (effectiveRx.length === 0) return null
                      return (
                        <div className="flex items-center gap-1 flex-wrap mt-2 pt-1">
                          {effectiveRx.map((rx, rIdx) => (
                            <button
                              key={rIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (rx.isPaid || rx.emoji === '⭐️') {
                                  setPaidReactionModalState({ isOpen: true, messageId: msg.id })
                                } else {
                                  handleToggleReaction(msg, rx.emoji)
                                }
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all hover:scale-105 active:scale-95 select-none cursor-pointer ${
                                rx.isPaid || rx.emoji === '⭐️'
                                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-glow'
                                  : rx.chosen
                                  ? 'bg-primary-500/25 border-primary-400 text-primary-200'
                                  : 'bg-black/30 border-white/10 text-gray-200 hover:bg-black/40'
                              }`}
                              title={`${rx.chosen ? 'Remove reaction' : 'React with'} ${rx.emoji}`}
                            >
                              <span>{rx.emoji}</span>
                              <span className="text-[10px] opacity-80">{rx.count}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()}

                    {/* Message Footer: ID + Seconds Timestamp + Status */}
                    <div
                      className={`text-[10px] flex items-center justify-end gap-1.5 mt-1.5 ${
                        msg.isOutgoing ? 'text-primary-200' : 'text-gray-500'
                      }`}
                    >
                      {showMessageId && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await copyTextToClipboard(msg.id.toString())
                            showToast(`Copied Message ID #${msg.id}`)
                          }}
                          title="Click to copy Message ID"
                          className="opacity-60 hover:opacity-100 px-1 py-0.2 rounded bg-black/20 hover:bg-black/40 font-mono transition-opacity flex items-center gap-0.5 cursor-pointer"
                        >
                          <Hash className="w-2.5 h-2.5" />
                          <span>{msg.id}</span>
                        </button>
                      )}

                      {/* Ephemeral / Self-Destruct Timer Badge (TDesktop v7.1) */}
                      {msg.ttlSeconds && (
                        <span
                          title={`Self-destruct timer: ${msg.ttlSeconds}s`}
                          className="flex items-center gap-0.5 text-amber-300 font-mono bg-amber-500/20 px-1 py-0.2 rounded"
                        >
                          <Flame className="w-2.5 h-2.5" />
                          <span>{msg.ttlSeconds}s</span>
                        </span>
                      )}

                      {/* Silent Message Icon (TDesktop v6.8.5) */}
                      {msg.isSilent && (
                        <span title="Sent without sound" className="opacity-75">
                          <BellOff className="w-2.5 h-2.5" />
                        </span>
                      )}

                      {/* 64Gram Local Anti-Delete Badge */}
                      {msg.isDeletedLocally && (
                        <span
                          title={`This message was deleted on Telegram, but preserved locally (${
                            msg.deletedAt ? formatMessageTime(msg.deletedAt) : 'deleted'
                          })`}
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-300 bg-rose-500/25 border border-rose-500/40 px-1.5 py-0.2 rounded select-none animate-in fade-in"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>[Deleted]</span>
                        </span>
                      )}

                      {/* 64Gram Edit History Tracker Pill */}
                      {msg.editHistory && msg.editHistory.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingEditHistoryMsg(msg)
                          }}
                          title="Click to view previous versions"
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-accent-cyan bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 px-1.5 py-0.2 rounded select-none cursor-pointer transition-colors"
                        >
                          <History className="w-2.5 h-2.5" />
                          <span>[Edited]</span>
                        </button>
                      ) : msg.editDate ? (
                        <span className="text-[10px] opacity-75 select-none">
                          edited
                        </span>
                      ) : null}

                      <span>{formatMessageTime(msg.date)}</span>
                      {msg.isOutgoing && <CheckCheck className="w-3 h-3 inline" />}
                    </div>
                  </div>

                  {/* Bot Inline Keyboard Buttons - Rendered SEPARATELY below message bubble */}
                    {msg.replyMarkup &&
                      msg.replyMarkup.rows &&
                      msg.replyMarkup.rows.length > 0 && (
                        <div className="mt-1.5 w-full space-y-1.5">
                          {msg.replyMarkup.rows.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1.5 flex-wrap w-full">
                              {row.map((btn, bIdx) => {
                                const btnIsRtl = isRTL(btn.text)
                                const btnId = `${msg.id}_${rIdx}_${bIdx}`
                                const isCalling = callingBotBtnId === btnId

                                return (
                                  <button
                                    key={bIdx}
                                    dir={btnIsRtl ? 'rtl' : 'ltr'}
                                    type="button"
                                    disabled={isCalling}
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      if (btn.url) {
                                        if (btn.webAppUrl || (btn as any).isMiniApp || btn.url.includes('#tgWebAppData') || btn.url.includes('tgWebApp')) {
                                          handleLaunchMiniApp(btn.webAppUrl || btn.url, btn.text)
                                          return
                                        }
                                        handleSafeOpenUrl(btn.url)
                                        return
                                      }
                                      if (btn.data) {
                                        setCallingBotBtnId(btnId)
                                        try {
                                          const res = await window.guidegram?.sendBotCallbackQuery?.(
                                            msg.accountId,
                                            msg.chatId,
                                            msg.id,
                                            btn.data,
                                            rIdx,
                                            bIdx
                                          )
                                          if (res?.alert && res.message) {
                                            alert(res.message)
                                          } else if (res?.message) {
                                            showToast(res.message)
                                          } else if (res?.url) {
                                            handleSafeOpenUrl(res.url)
                                          }
                                        } catch (cbErr: any) {
                                          showToast(t('bot.callback_error', { error: cbErr?.message || 'Unknown' }))
                                        } finally {
                                          setCallingBotBtnId(null)
                                        }
                                      }
                                    }}
                                    onContextMenu={async (e) => {
                                      if (btn.data && copyCallbackData) {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        await copyTextToClipboard(btn.data)
                                        showToast(`Copied callback data: "${btn.data}"`)
                                      }
                                    }}
                                    title={
                                      btn.data
                                        ? `Callback: ${btn.data} (Click to execute)`
                                        : btn.url
                                        ? `Open ${btn.url}`
                                        : undefined
                                    }
                                    className="flex-1 min-w-[80px] px-3 py-2 rounded-xl bg-dark-800/90 hover:bg-dark-750 active:scale-98 text-gray-100 hover:text-white text-xs font-medium transition-all border border-white/10 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-sm"
                                  >
                                    {isCalling ? (
                                      <div className="w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin shrink-0" />
                                    ) : null}
                                    <span className="truncate">{btn.text}</span>
                                    {btn.url && (
                                      <ExternalLink className="w-3 h-3 text-gray-300 shrink-0" />
                                    )}
                                    {btn.data && copyCallbackData && (
                                      <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded text-accent-cyan font-mono shrink-0">
                                        DATA
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Incoming Message Action Bar */}
                  {!msg.isOutgoing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity self-center bg-dark-850/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-md relative">
                      {/* Reaction Picker Button */}
                      {allowedReactions.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveReactionPickerMsgId((prev) => (prev === msg.id ? null : msg.id))
                              setShowAllReactions(false)
                            }}
                            title="Add reaction"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              activeReactionPickerMsgId === msg.id
                                ? 'text-amber-400 bg-dark-750'
                                : 'text-gray-400 hover:text-amber-400 hover:bg-dark-750'
                            }`}
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          {activeReactionPickerMsgId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-full mb-2 left-0 z-50 p-2 rounded-2xl bg-dark-850/98 backdrop-blur-xl border border-white/15 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                                {allowedReactions.slice(0, showAllReactions ? 36 : 6).map((emoji: string) => {
                                  const isChosen = (reactionOverrides[msg.id] ?? msg.reactions ?? []).some(
                                    (r) => r.emoji === emoji && r.chosen
                                  )
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => {
                                        handleToggleReaction(msg, emoji)
                                        setActiveReactionPickerMsgId(null)
                                      }}
                                      className={`hover:scale-130 active:scale-95 transition-all text-sm cursor-pointer p-1 rounded-xl ${
                                        isChosen ? 'bg-primary-500/30 ring-1 ring-primary-400' : 'hover:bg-white/10'
                                      }`}
                                      title={`${isChosen ? 'Remove' : 'React with'} ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  )
                                })}
                                {allowedReactions.length > 6 && !showAllReactions && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllReactions(true)}
                                    className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                                    title="Show all reactions"
                                  >
                                    +{allowedReactions.length - 6}
                                  </button>
                                )}
                                {/* Star / Paid Reaction button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveReactionPickerMsgId(null)
                                    setPaidReactionModalState({ isOpen: true, messageId: msg.id })
                                  }}
                                  className="p-1 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all hover:scale-125 cursor-pointer flex items-center justify-center shadow-xs"
                                  title={t('stars.send_star_reaction')}
                                >
                                  ⭐️
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reply Button (Feature 15) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplyMessage(msg)
                          setTimeout(() => textareaRef.current?.focus(), 50)
                        }}
                        title="Reply to message"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {quickForwardToSaved && onQuickForwardToSaved && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const ok = await onQuickForwardToSaved(msg)
                            if (ok !== false) {
                              showToast('Forwarded to Saved Messages!')
                            } else {
                              showToast('Failed to forward to Saved Messages')
                            }
                          }}
                          title="Quick Forward to Saved Messages (Ctrl+Click on message)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDirectForward(msg)
                        }}
                        title="Direct Forward without Quote (Alt+F)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!msg.text || !msg.text.trim()) {
                            showToast(`Message #${msg.id} has no text to copy`)
                            return
                          }
                          const ok = await copyTextToClipboard(msg.text)
                          if (ok) {
                            showToast(`Copied message #${msg.id} text`)
                          } else {
                            showToast('Failed to copy text')
                          }
                        }}
                        title="Copy Text (Alt+C)"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Translate Button (MTProto messages.translateText) */}
                      {msg.text && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTranslateMessage(msg.id)
                          }}
                          disabled={translatingIds[msg.id]}
                          title="Translate to Persian (Alt+T)"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            translations[msg.id]
                              ? 'text-accent-cyan bg-accent-cyan/15'
                              : 'text-gray-400 hover:text-accent-cyan hover:bg-dark-750'
                          }`}
                        >
                          <Languages className={`w-3.5 h-3.5 ${translatingIds[msg.id] ? 'animate-spin text-accent-cyan' : ''}`} />
                        </button>
                      )}

                      {onDeleteMessage && canDeleteMessage(msg) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const confirmMsg = alwaysDeleteBoth
                              ? `Delete message #${msg.id} for both sides?`
                              : `Delete message #${msg.id}?`
                            if (window.confirm(confirmMsg)) {
                              const ok = await onDeleteMessage(msg)
                              if (ok !== false) {
                                showToast(`Deleted message #${msg.id}`)
                              } else {
                                showToast('Failed to delete message')
                              }
                            }
                          }}
                          title={alwaysDeleteBoth ? 'Delete for everyone' : 'Delete message'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-dark-750 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          )
        })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button (↓) with Unread Count (Pinned to Outer Wrapper) */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={handleScrollToBottom}
          className="absolute bottom-4 right-5 z-30 w-11 h-11 rounded-full bg-dark-800/95 hover:bg-dark-750 text-gray-200 hover:text-white border border-white/10 shadow-2xl backdrop-blur-md transition-all flex items-center justify-center group cursor-pointer animate-in fade-in zoom-in-90 duration-150 active:scale-95"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform text-gray-300 group-hover:text-white" />
          {unreadScrollCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center shadow-glow border-2 border-dark-900">
              {unreadScrollCount > 99 ? '99+' : unreadScrollCount}
            </span>
          )}
        </button>
      )}
    </div>

      {/* 3. Input Box OR Broadcast Channel Bottom Action Bar */}
      <div className="shrink-0 bg-dark-850/90 border-t border-white/5 backdrop-blur-md relative">
        {/* Docked Reply Bar above Input (Feature 15) */}
        {replyMessage && (
          <div className="px-4 py-2 bg-dark-800/90 border-b border-white/10 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Vertical Accent Line */}
              <div className="w-1 self-stretch bg-primary-500 rounded-full shrink-0" />

              {/* Mini Thumbnail or Media Icon */}
              {(() => {
                const thumbUrl =
                  downloadedMedia[`${replyMessage.id}_thumb`] ||
                  downloadedMedia[replyMessage.id] ||
                  replyMessage.mediaUrl ||
                  replyMessage.strippedThumb
                if (
                  replyMessage.mediaType === 'photo' ||
                  replyMessage.mediaType === 'video' ||
                  replyMessage.mediaType === 'sticker' ||
                  thumbUrl
                ) {
                  return (
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          onError={(e) => {
                            ;(e.currentTarget as HTMLElement).style.display = 'none'
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  )
                }
                if (replyMessage.isVoice || replyMessage.mediaType === 'voice') {
                  return (
                    <div className="w-9 h-9 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/20 shrink-0 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                  )
                }
                if (replyMessage.mediaType === 'document') {
                  return (
                    <div className="w-9 h-9 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20 shrink-0 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  )
                }
                return null
              })()}

              {/* Author & Text Snippet */}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-primary-400 truncate flex items-center gap-1.5">
                  <Reply className="w-3 h-3 shrink-0" />
                  <span>Reply to {replyMessage.senderName || (replyMessage.isOutgoing ? 'You' : 'User')}</span>
                </div>
                <div
                  dir={isRTL(replyMessage.text) ? 'rtl' : 'ltr'}
                  className="text-xs text-gray-300 truncate font-normal leading-normal"
                >
                  {replyMessage.text ? (
                    replyMessage.text
                  ) : replyMessage.mediaType === 'photo' ? (
                    'Photo'
                  ) : replyMessage.mediaType === 'video' ? (
                    'Video'
                  ) : replyMessage.isVoice || replyMessage.mediaType === 'voice' ? (
                    `Voice message${replyMessage.mediaDuration ? ` (${formatDuration(replyMessage.mediaDuration)})` : ''}`
                  ) : replyMessage.mediaFileName ? (
                    replyMessage.mediaFileName
                  ) : (
                    'Media message'
                  )}
                </div>
              </div>
            </div>

            {/* Cancel Dismiss Button */}
            <button
              type="button"
              onClick={() => setReplyMessage(null)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Cancel reply (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Feature 22: Docked Interactive Composer Link Preview Bar */}
        {(() => {
          const detectedUrl = extractFirstUrl(inputText)
          if (!detectedUrl || detectedUrl === dismissedComposerUrl) return null
          return (
            <ComposerLinkPreviewBar
              url={detectedUrl}
              onDismiss={() => setDismissedComposerUrl(detectedUrl)}
              onSafeOpen={handleSafeOpenUrl}
            />
          )
        })()}

        {/* Suggest Sending Large Texts as Files (Telegram Desktop v6.7.8) */}
        {inputText.length > 4096 && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-200 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-amber-300">Message is very large ({inputText.length} / 4096 chars)</span>
                <p className="text-[10px] text-amber-200/80">Telegram limits individual text messages to 4096 characters.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSendAsFile}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-amber-500/30"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Send as .txt File</span>
              </button>
              <button
                type="button"
                onClick={handleSendSplit}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-white/10"
              >
                <Split className="w-3.5 h-3.5" />
                <span>Split ({Math.ceil(inputText.length / 4000)} parts)</span>
              </button>
            </div>
          </div>
        )}

        {/* Attachment Staging Tray (Feature 17) */}
        {stagedAttachments.length > 0 && (
          <div className="px-4 py-2 bg-dark-800/90 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
            {stagedAttachments.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-dark-750 border border-white/10 text-xs text-gray-200 shrink-0 group animate-in fade-in"
              >
                {item.type === 'media' ? (
                  <Image className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                ) : item.type === 'audio' ? (
                  <Music className="w-3.5 h-3.5 text-accent-violet shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                )}
                <span className="max-w-[140px] truncate font-medium">{item.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStagedAttachment(idx)}
                  className="p-0.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Progress Bar (Feature 17) */}
        {uploadProgress.isUploading && (
          <div className="px-4 py-2 bg-primary-950/40 border-b border-primary-500/20 flex items-center gap-3 animate-in fade-in">
            <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-gray-300 font-medium mb-1">
                <span>Uploading {uploadProgress.fileName || 'file'}...</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary-500 h-full transition-all duration-150 rounded-full shadow-glow"
                  style={{ width: `${Math.min(100, Math.max(5, uploadProgress.percent))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Hidden File / Image / Audio Native Pickers (Fallback) */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) {
              const newItems: StagedAttachment[] = Array.from(files).map((f) => ({
                path: (f as any).path || f.name,
                name: f.name,
                size: f.size,
                type: 'document',
              }))
              setStagedAttachments((prev) => [...prev, ...newItems])
            }
            setIsAttachMenuOpen(false)
          }}
        />
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*,video/*"
          className="hidden"
          multiple
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) {
              const newItems: StagedAttachment[] = Array.from(files).map((f) => ({
                path: (f as any).path || f.name,
                name: f.name,
                size: f.size,
                type: 'media',
              }))
              setStagedAttachments((prev) => [...prev, ...newItems])
            }
            setIsAttachMenuOpen(false)
          }}
        />
        <input
          type="file"
          ref={audioInputRef}
          accept="audio/*"
          className="hidden"
          multiple
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) {
              const newItems: StagedAttachment[] = Array.from(files).map((f) => ({
                path: (f as any).path || f.name,
                name: f.name,
                size: f.size,
                type: 'audio',
              }))
              setStagedAttachments((prev) => [...prev, ...newItems])
            }
            setIsAttachMenuOpen(false)
          }}
        />

        {chatDetails?.canSendMessages === false || (isChannel && !chatDetails?.canSendMessages) ? (
          <div className="p-3 flex items-center justify-center">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-full max-w-sm py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                isMuted
                  ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-glow'
                  : 'bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/10'
              }`}
            >
              {isMuted ? (
                <>
                  <Volume2 className="w-4 h-4 text-white" />
                  <span>UNMUTE CHANNEL</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-gray-400" />
                  <span>MUTE CHANNEL</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-3 relative">
            {/* Attachment Popover Menu (Feature 17) */}
            {isAttachMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full left-4 mb-2 w-52 bg-dark-800/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-40 text-xs select-none"
              >
                <button
                  type="button"
                  onClick={() => handlePickAttachment('media')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0 group-hover:bg-primary-500/25 transition-colors">
                    <Image className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-100">Photos & Videos</span>
                    <span className="text-[10px] text-gray-400">JPG, PNG, GIF, MP4</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePickAttachment('document')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 group-hover:bg-accent-cyan/25 transition-colors">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-100">Files & Documents</span>
                    <span className="text-[10px] text-gray-400">Any file up to 2GB</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePickAttachment('audio')}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-accent-violet/15 text-accent-violet flex items-center justify-center shrink-0 group-hover:bg-accent-violet/25 transition-colors">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-100">Audio</span>
                    <span className="text-[10px] text-gray-400">MP3, M4A, FLAC, WAV</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false)
                    setIsCreatePollOpen(true)
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-100">{t('poll.title') || 'Poll & Quiz'}</span>
                    <span className="text-[10px] text-gray-400">Ask questions or run a quiz</span>
                  </div>
                </button>
              </div>
            )}

            {isRecordingVoice ? (
              <div className="flex items-center gap-3 w-full bg-dark-800/95 border border-red-500/30 rounded-2xl px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
                {/* Pulsing red recording indicator & duration */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-red-400 tracking-wider">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>

                {/* Live audio level equalizer bars */}
                <div className="flex-1 flex items-center gap-1 h-6 px-3 overflow-hidden justify-center">
                  {recordingWaveform.map((lvl, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(15, Math.min(100, lvl))}%` }}
                      className="w-1 bg-red-400/80 rounded-full transition-all duration-75"
                    />
                  ))}
                </div>

                {/* Cancel button */}
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  disabled={isUploadingVoice}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Cancel recording"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleStopAndSendRecording}
                  disabled={isUploadingVoice}
                  className="p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all shadow-glow flex items-center justify-center cursor-pointer shrink-0"
                  title="Send voice message"
                >
                  {isUploadingVoice ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex items-end gap-2">
                {/* Bot Menu & Command Switcher */}
                {(chat.isBot || chatDetails?.isBot) &&
                  Boolean(
                    (chatDetails?.botInfo?.commands && chatDetails.botInfo.commands.length > 0) ||
                    chatDetails?.botInfo?.menuButton
                  ) && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (chatDetails?.botInfo?.menuButton?.url) {
                            handleSafeOpenUrl(chatDetails.botInfo.menuButton.url)
                          } else {
                            setIsBotMenuOpen((prev) => !prev)
                          }
                        }}
                        className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          isBotMenuOpen
                            ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40 shadow-glow'
                            : 'bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-white/5'
                        }`}
                        title={chatDetails?.botInfo?.menuButton?.text || t('chat.bot_commands')}
                      >
                        <Bot className="w-4 h-4 text-primary-400" />
                        <span className="font-bold text-xs">
                          {chatDetails?.botInfo?.menuButton?.text || t('chat.bot_menu')}
                        </span>
                      </button>

                      {isBotMenuOpen &&
                        chatDetails?.botInfo?.commands &&
                        chatDetails.botInfo.commands.length > 0 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-full left-0 mb-2 w-64 max-h-72 overflow-y-auto bg-dark-800/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs select-none"
                          >
                            <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
                              <span>{t('chat.bot_commands')}</span>
                              {chatDetails?.username && (
                                <span className="text-primary-400 font-mono">@{chatDetails.username}</span>
                              )}
                            </div>
                            {chatDetails.botInfo.commands
                              .map((c) => ({
                                cmd: c.command.startsWith('/') ? c.command : `/${c.command}`,
                                label: c.description,
                              }))
                              .map((item) => (
                                <button
                                  key={item.cmd}
                                  type="button"
                                  onClick={() => {
                                    setIsBotMenuOpen(false)
                                    onSendMessage(item.cmd)
                                  }}
                                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-gray-200 hover:text-white transition-colors cursor-pointer text-left"
                                >
                                  <span className="font-mono font-bold text-primary-400 shrink-0">{item.cmd}</span>
                                  <span className="text-[10px] text-gray-400 truncate text-right">{item.label}</span>
                                </button>
                              ))}
                          </div>
                        )}
                    </div>
                  )}

                {/* Paperclip Button with Attachment Popover Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAttachMenuOpen((prev) => !prev)}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                    isAttachMenuOpen
                      ? 'text-primary-400 bg-dark-750'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-800'
                  }`}
                  title="Attach Photo, Video or Document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Sticker Picker Drawer Toggle Button (Telegram Desktop v7.0) */}
                <button
                  type="button"
                  onClick={() => setIsStickerDrawerOpen((prev) => !prev)}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                    isStickerDrawerOpen
                      ? 'text-accent-violet bg-dark-750'
                      : 'text-gray-400 hover:text-accent-violet hover:bg-dark-800'
                  }`}
                  title="Stickers & Animated Packs"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* AI Text Tools Button (Telegram Desktop v6.7 & v7.0.9) */}
                <div className="relative shrink-0">
                  {isAiMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-0 mb-2 w-52 bg-dark-800/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50 text-xs select-none"
                    >
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary-400" />
                        <span>AI Assistant</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAiTransform('professional')}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                        <span>Make Professional</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiTransform('grammar')}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                        <span>Fix Grammar & Punctuation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiTransform('summarize')}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Summarize Text</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiTransform('emojify')}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <Smile className="w-3.5 h-3.5 text-accent-violet shrink-0" />
                        <span>Add Expressive Emojis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiTransform('translate')}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Translate Hint</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAiMenuOpen((prev) => !prev)}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                      isAiMenuOpen
                        ? 'text-primary-400 bg-dark-750'
                        : 'text-gray-400 hover:text-primary-400 hover:bg-dark-800'
                    }`}
                    title="AI Text Transformations (Tone, Grammar, Emojis)"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>

                {/* Multi-line Auto-expanding Textarea with Telegram Desktop Shortcuts */}
                <div className="flex-1 bg-dark-800 border border-white/5 focus-within:border-primary-500/50 rounded-2xl px-3.5 py-2 transition-colors flex items-center relative">
                  {/* Floating Contextual Formatting Toolbar (Telegram Desktop v7.0+) */}
                  {formatBar.visible && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-0 mb-2 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md px-2 py-1 flex items-center gap-1 z-40 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => applyTextFormat('**')}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('__')}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('`')}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-accent-cyan hover:bg-white/10 transition-colors"
                        title="Monospace Code"
                      >
                        <CodeIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('~~')}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('||')}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-amber-300 hover:bg-white/10 transition-colors"
                        title="Spoiler"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat((s) => `> ${s}\n`)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-primary-400 hover:bg-white/10 transition-colors"
                        title="Quote"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = window.prompt('Enter link URL (https://...):')
                          if (url && url.trim()) {
                            applyTextFormat((s) => `[${s}](${url.trim()})`)
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-accent-cyan hover:bg-white/10 transition-colors"
                        title="Insert Link"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-white/10 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => setFormatBar({ visible: false, start: 0, end: 0, selectedText: '' })}
                        className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
                        title="Close"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Group Mention Autocomplete Popup */}
                  {mentionCandidates.length > 0 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-0 mb-2 w-64 max-h-56 overflow-y-auto bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
                        <span>Tag Member</span>
                        <span className="text-accent-cyan font-mono">@{mentionQuery?.query}</span>
                      </div>
                      {mentionCandidates.map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => handleInsertMention(cand)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-gray-200 hover:text-white transition-colors cursor-pointer text-left w-full"
                        >
                          <Avatar
                            accountId={chat?.accountId}
                            peerId={cand.id}
                            title={cand.name}
                            avatarUrl={cand.avatarUrl}
                            size="xs"
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1 flex flex-col">
                            <span className="font-semibold text-xs text-white truncate">{cand.name}</span>
                            {cand.username && (
                              <span className="text-[10px] text-accent-cyan font-mono truncate">@{cand.username}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    dir={isRTL(inputText) ? 'rtl' : 'ltr'}
                    placeholder="Write a message... (Enter to send, Shift+Enter for newline, Alt+F to forward)"
                    value={inputText}
                    rows={1}
                    style={{ maxHeight: '160px' }}
                    onChange={(e) => {
                      const val = e.target.value
                      setInputText(val)
                      const cursorPos = e.target.selectionEnd || val.length
                      const textBefore = val.slice(0, cursorPos)
                      const match = textBefore.match(/@([a-zA-Z0-9_\u0600-\u06FF]*)$/)
                      if (match && (chat?.isGroup || chatDetails?.isGroup)) {
                        setMentionQuery({ query: match[1], startPos: cursorPos - match[0].length })
                      } else {
                        setMentionQuery(null)
                      }
                    }}
                    onSelect={handleTextareaSelect}
                    onKeyUp={handleTextareaSelect}
                    onMouseUp={handleTextareaSelect}
                    onKeyDown={(e) => {
                      // Keyboard shortcuts for formatting (Ctrl+B, Ctrl+I, Ctrl+K)
                      if (e.ctrlKey || e.metaKey) {
                        if (e.key === 'b' || e.key === 'B') {
                          e.preventDefault()
                          applyTextFormat('**')
                          return
                        }
                        if (e.key === 'i' || e.key === 'I') {
                          e.preventDefault()
                          applyTextFormat('__')
                          return
                        }
                        if (e.key === 'u' || e.key === 'U') {
                          e.preventDefault()
                          applyTextFormat('__')
                          return
                        }
                      }

                      if (e.key === 'Escape' && replyMessage) {
                        e.preventDefault()
                        setReplyMessage(null)
                        return
                      }

                      if (e.key === 'Enter' && !e.shiftKey) {
                        if ((e.nativeEvent as any).isComposing) return
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    className="w-full bg-transparent text-xs text-gray-100 placeholder-gray-500 resize-none focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Send or Voice Record Trigger */}
                {/* Send or Voice Record Trigger */}
                {inputText.trim() || stagedAttachments.length > 0 ? (
                  <div className="relative flex items-center shrink-0">
                    {/* Send Options Popover (Send Without Sound, Schedule Message) */}
                    {isSendMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full right-0 mb-2 w-56 bg-dark-800/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50 text-xs select-none"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsSendMenuOpen(false)
                            handleSend(undefined, { silent: true })
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 group-hover:bg-accent-cyan/25 transition-colors">
                            <BellOff className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-100">Send Without Sound</span>
                            <span className="text-[10px] text-gray-400">Silent notification</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsSendMenuOpen(false)
                            setIsScheduleModalOpen(true)
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-accent-violet/15 text-accent-violet flex items-center justify-center shrink-0 group-hover:bg-accent-violet/25 transition-colors">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-100">Schedule Message...</span>
                            <span className="text-[10px] text-gray-400">Send at specific time</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsSendMenuOpen(false)
                            setIsScheduledListOpen(true)
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0 group-hover:bg-primary-500/25 transition-colors">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-100">Scheduled Queue...</span>
                            <span className="text-[10px] text-gray-400">View & manage pending</span>
                          </div>
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setIsSendMenuOpen((prev) => !prev)
                      }}
                      className="p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-l-2xl transition-all shadow-glow flex items-center justify-center cursor-pointer"
                      title="Send message (Enter) • Right click for Send Without Sound / Schedule"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsSendMenuOpen((prev) => !prev)
                      }}
                      className="p-2.5 bg-primary-700 hover:bg-primary-600 text-primary-200 hover:text-white rounded-r-2xl border-l border-white/10 transition-colors cursor-pointer flex items-center justify-center"
                      title="More send options (Silent / Schedule)"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-dark-800 rounded-2xl transition-colors cursor-pointer shrink-0"
                    title="Record Voice Message"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* Schedule Message Modal (Telegram Desktop v7.0.4 & v6.8.5) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-dark-850 border border-white/10 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent-violet/20 text-accent-violet flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Schedule Message</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Select when you would like this message to be sent automatically:
            </p>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const targetTime = Date.now() + 30 * 60 * 1000
                  setIsScheduleModalOpen(false)
                  handleSend(undefined, { scheduleDate: targetTime })
                }}
                className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-accent-violet/40 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-gray-200 group-hover:text-accent-violet">In 30 minutes</div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetTime = Date.now() + 2 * 60 * 60 * 1000
                  setIsScheduleModalOpen(false)
                  handleSend(undefined, { scheduleDate: targetTime })
                }}
                className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-accent-violet/40 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-gray-200 group-hover:text-accent-violet">In 2 hours</div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  tomorrow.setHours(9, 0, 0, 0)
                  setIsScheduleModalOpen(false)
                  handleSend(undefined, { scheduleDate: tomorrow.getTime() })
                }}
                className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-accent-violet/40 text-left transition-all cursor-pointer group col-span-2"
              >
                <div className="text-xs font-semibold text-gray-200 group-hover:text-accent-violet">Tomorrow at 09:00 AM</div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {new Date(Date.now() + 86400000).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • 09:00
                </div>
              </button>
            </div>

            {/* Custom Date & Time Input */}
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              <label className="text-[11px] font-medium text-gray-300">Or choose custom date & time:</label>
              <input
                type="datetime-local"
                value={customScheduleTime}
                onChange={(e) => setCustomScheduleTime(e.target.value)}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                className="w-full bg-dark-750 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-violet/50 font-mono"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customScheduleTime}
                onClick={() => {
                  if (!customScheduleTime) return
                  const time = new Date(customScheduleTime).getTime()
                  if (isNaN(time) || time <= Date.now()) {
                    showToast('Please select a future time')
                    return
                  }
                  setIsScheduleModalOpen(false)
                  handleSend(undefined, { scheduleDate: time })
                }}
                className="px-4 py-2 rounded-xl bg-accent-violet hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-glow transition-all cursor-pointer"
              >
                Schedule Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Channel / User Info Drawer */}
      {isInfoOpen && (
        <div className="absolute inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 md:w-96 h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none"
          >
            {/* Drawer Header */}
            <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="text-sm font-bold text-gray-100">
                {isChannel ? 'Channel Info' : isGroup ? 'Group Info' : 'User Info'}
              </div>
              <button
                onClick={() => setIsInfoOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Avatar & Title Hero */}
              <div className="flex flex-col items-center text-center">
                <Avatar
                  accountId={chat.accountId}
                  peerId={chat.id}
                  title={chatDetails?.title || chat.title}
                  initials={chat.avatarInitials}
                  avatarUrl={chatDetails?.avatarUrl || chat.avatarUrl}
                  size="xl"
                  className="mb-3 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={async () => {
                    const currentPhoto = chatDetails?.avatarUrl || chat.avatarUrl
                    if (currentPhoto) {
                      setLightboxUrl(currentPhoto)
                    } else if (window.guidegram?.getProfilePhoto) {
                      try {
                        showToast('Loading full profile photo...')
                        const big = await window.guidegram.getProfilePhoto(chat.accountId, chat.id, true)
                        if (big) setLightboxUrl(big)
                        else showToast('No profile photo available')
                      } catch {
                        showToast('Could not load profile photo')
                      }
                    }
                  }}
                />

                <div className="flex items-center justify-center gap-1.5 mb-1 px-2">
                  <h3
                    dir={isRTL(chatDetails?.title || chat.title) ? 'rtl' : 'ltr'}
                    className="text-base font-bold text-white"
                  >
                    {chatDetails?.title || chat.title}
                  </h3>
                  {chatDetails?.customEmojiStatusId && (
                    <CustomEmojiView
                      accountId={chat.accountId}
                      documentId={chatDetails.customEmojiStatusId}
                      fallback="⭐"
                      className="inline-block w-5 h-5 align-middle select-none shrink-0"
                    />
                  )}
                </div>

                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  {isChannel ? (
                    <span className="flex items-center gap-1 text-primary-400">
                      <Radio className="w-3 h-3" />
                      <span>Broadcast Channel</span>
                    </span>
                  ) : isGroup ? (
                    <span className="flex items-center gap-1 text-accent-cyan">
                      <Users className="w-3 h-3" />
                      <span>Group Chat</span>
                    </span>
                  ) : isBot ? (
                    <span className="flex items-center gap-1 text-accent-violet">
                      <Bot className="w-3 h-3" />
                      <span>Bot</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-300">
                      <User className="w-3 h-3" />
                      <span>Personal Contact</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Personal Channel Card (Telegram Premium Feature) */}
              {chatDetails?.personalChannelId && (
                <div
                  onClick={() => {
                    window.guidegram?.openExternal?.(`https://t.me/c/${chatDetails.personalChannelId}`)
                  }}
                  className="p-3.5 rounded-2xl bg-primary-600/10 hover:bg-primary-600/20 border border-primary-500/20 cursor-pointer transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center">
                      <Tv className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-bold text-primary-400 tracking-wider">
                        Personal Channel
                      </div>
                      <div className="text-xs font-semibold text-white group-hover:text-primary-300 transition-colors">
                        {chatDetails.personalChannelTitle || `Channel #${chatDetails.personalChannelId}`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" />
                </div>
              )}

              {/* Star Gifts & Birthday (Telegram Premium) */}
              {(chatDetails?.stargiftsCount != null && chatDetails.stargiftsCount > 0 || chatDetails?.birthday) && (
                <div className="grid grid-cols-2 gap-2">
                  {chatDetails?.stargiftsCount != null && chatDetails.stargiftsCount > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-[9px] uppercase font-bold text-amber-400">Gifts</div>
                        <div className="text-xs font-bold text-white truncate">
                          {chatDetails.stargiftsCount} Gifts
                        </div>
                      </div>
                    </div>
                  )}

                  {chatDetails?.birthday && (
                    <div className="p-3 rounded-2xl bg-accent-violet/10 border border-accent-violet/20 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-accent-violet/20 text-accent-violet flex items-center justify-center shrink-0">
                        <Cake className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-[9px] uppercase font-bold text-accent-violet">Birthday</div>
                        <div className="text-xs font-bold text-white truncate">
                          {chatDetails.birthday}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Members / Subscribers Count */}
              {chatDetails?.membersCount != null && (
                <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Users className="w-4 h-4 text-primary-400" />
                    <span>{isChannel ? 'Subscribers' : 'Members'}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-100">
                    {formatNumber(chatDetails.membersCount)}
                  </span>
                </div>
              )}

              {/* Channel Boost Status Card (MTProto premium.getBoostsStatus & Telegram Desktop v5.0+) */}
              {boostStatus && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-dark-850 to-dark-800 border border-amber-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 fill-current" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Level {boostStatus.level}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                            {boostStatus.boosts} boosts
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">Channel Level & Boosts</p>
                      </div>
                    </div>
                    {boostStatus.boostUrl && (
                      <button
                        type="button"
                        onClick={() => window.guidegram?.openExternal?.(boostStatus.boostUrl!)}
                        className="text-[10px] text-accent-cyan hover:underline cursor-pointer"
                      >
                        Boost Link
                      </button>
                    )}
                  </div>

                  {/* Level Progress Bar */}
                  {boostStatus.nextLevelBoosts ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Progress to Level {boostStatus.level + 1}</span>
                        <span className="font-mono text-gray-300">
                          {boostStatus.boosts} / {boostStatus.nextLevelBoosts}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-primary-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.round((boostStatus.boosts / boostStatus.nextLevelBoosts) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Username Card */}
              {chatDetails?.username && (
                <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Username
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        window.guidegram?.openExternal?.(`https://t.me/${chatDetails.username}`)
                      }}
                      className="text-xs font-semibold text-accent-cyan hover:underline cursor-pointer"
                    >
                      @{chatDetails.username}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await copyTextToClipboard(`@${chatDetails.username}`)
                        showToast(`Copied @${chatDetails.username}`)
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                      title="Copy username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bio / Description Card */}
              {chatDetails?.about && (
                <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    About / Description
                  </div>
                  <div
                    dir={isRTL(chatDetails.about) ? 'rtl' : 'ltr'}
                    className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap select-text"
                  >
                    {renderFormattedText(chatDetails.about)}
                  </div>
                </div>
              )}

              {/* Chat ID / User ID Card */}
              <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Hash className="w-4 h-4 text-primary-400" />
                  <span>{chat.isUser ? 'Numeric User ID' : 'Numeric Chat ID'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-gray-200">{chat.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyChatId}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-dark-750 transition-colors cursor-pointer"
                    title={chat.isUser ? 'Copy User ID' : 'Copy numeric ID'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Group Statistics Action Card */}
              {chat.isGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInfoOpen(false)
                    setIsStatsModalOpen(true)
                  }}
                  className="w-full p-3.5 rounded-2xl bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/30 text-accent-cyan font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
                      <BarChart2 className="w-4 h-4 text-accent-cyan" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white">{t('stats.title')}</span>
                      <span className="text-[10px] text-gray-400">{t('stats.overview')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-accent-cyan" />
                </button>
              )}

              {/* Channel & Supergroup Admin Log / Recent Actions Card */}
              {(chat.isGroup || chat.isChannel) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInfoOpen(false)
                    setIsAdminLogOpen(true)
                  }}
                  className="w-full p-3.5 rounded-2xl bg-accent-amber/15 hover:bg-accent-amber/25 border border-accent-amber/30 text-accent-amber font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-amber/20 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-accent-amber" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white">{t('admin_log.title')}</span>
                      <span className="text-[10px] text-gray-400">{t('admin_log.subtitle')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-accent-amber" />
                </button>
              )}

              {/* 64Gram Power Feature: Chat Permissions Matrix */}
              {(chat.isGroup || chat.isChannel) && (
                <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Chat Permissions</span>
                    <span className="text-[9px] text-gray-500 font-mono">Permissions Matrix</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'sendMessages', label: 'Send Messages' },
                      { key: 'sendMedia', label: 'Send Media' },
                      { key: 'sendStickers', label: 'Stickers & GIFs' },
                      { key: 'sendPolls', label: 'Send Polls' },
                      { key: 'embedLinks', label: 'Embed Links' },
                      { key: 'inviteUsers', label: 'Add Members' },
                      { key: 'pinMessages', label: 'Pin Messages' },
                      { key: 'changeInfo', label: 'Change Info' },
                    ].map((perm) => {
                      const allowed = chatDetails?.permissionsMatrix
                        ? chatDetails.permissionsMatrix[perm.key as keyof typeof chatDetails.permissionsMatrix] !== false
                        : chatDetails?.canSendMessages !== false

                      return (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-dark-800/80 border border-white/5"
                        >
                          <span className="text-[11px] text-gray-300 truncate">{perm.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                              allowed
                                ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30'
                                : 'bg-accent-rose/15 text-accent-rose border-accent-rose/30'
                            }`}
                          >
                            {allowed ? 'Allowed' : 'Restricted'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 64Gram Power Feature: Bot Privacy Mode & Commands */}
              {(chat.isBot || chatDetails?.isBot) && (
                <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-accent-violet" />
                    <span>Bot Privacy & Commands</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-dark-800/90 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-semibold">Privacy Mode</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          chatDetails?.botInfo?.privacyMode !== false
                            ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {chatDetails?.botInfo?.privacyMode !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {chatDetails?.botInfo?.privacyMode !== false
                        ? 'Bot only sees messages starting with /, replies, and mentions.'
                        : 'Bot has direct access to all messages in groups.'}
                    </p>
                  </div>
                  {chatDetails?.botInfo?.commands && chatDetails.botInfo.commands.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-gray-400">Available Commands</div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {chatDetails.botInfo.commands.map((cmd) => (
                          <div
                            key={cmd.command}
                            onClick={() => {
                              setInputText(`/${cmd.command} `)
                              setIsInfoOpen(false)
                            }}
                            className="p-1.5 rounded-lg bg-dark-800/80 hover:bg-dark-750 flex items-center justify-between cursor-pointer transition-colors"
                            title={`Click to use /${cmd.command}`}
                          >
                            <span className="font-mono text-xs font-bold text-accent-cyan">
                              /{cmd.command}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[160px]">
                              {cmd.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 64Gram Power Feature: Group Members List with Admin Badges & 1-Click Copy User ID Pills */}
              {chat.isGroup && (
                <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary-400" />
                      <span>Members & Administrators</span>
                    </span>
                    {chatDetails?.participants && (
                      <span className="font-mono text-gray-400">{chatDetails.participants.length}</span>
                    )}
                  </div>

                  {/* Local member search input */}
                  {chatDetails?.participants && chatDetails.participants.length > 5 && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full bg-dark-800 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                  )}

                  {/* Participants Scroll List */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {chatDetails?.participants && chatDetails.participants.length > 0 ? (
                      chatDetails.participants
                        .filter((p) => {
                          if (!memberSearchQuery.trim()) return true
                          const q = memberSearchQuery.toLowerCase()
                          return (
                            (p.name || '').toLowerCase().includes(q) ||
                            (p.username && p.username.toLowerCase().includes(q)) ||
                            (p.id || '').includes(q)
                          )
                        })
                        .map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleOpenUserProfile(p.id, p.name)}
                            className="p-2 rounded-xl bg-dark-800/80 hover:bg-dark-750 flex items-center justify-between gap-2 border border-white/5 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar
                                accountId={chat.accountId}
                                peerId={p.id}
                                title={p.name}
                                avatarUrl={p.avatarUrl}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-gray-100 truncate">
                                    {p.name}
                                  </span>
                                  {p.role === 'creator' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      {p.customTitle || 'Owner'}
                                    </span>
                                  ) : p.role === 'admin' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                                      {p.customTitle || 'Admin'}
                                    </span>
                                  ) : p.customTitle ? (
                                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-accent-violet/15 text-accent-violet border border-accent-violet/30">
                                      {p.customTitle}
                                    </span>
                                  ) : null}
                                </div>
                                {p.username && (
                                  <div className="text-[10px] text-gray-400 truncate">@{p.username}</div>
                                )}
                              </div>
                            </div>

                            {/* Right side: 1-Click Copy User ID Pill + Search button */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await copyTextToClipboard(p.id)
                                  showToast(`Copied User ID: ${p.id}`)
                                }}
                                title={`Copy User ID (${p.id})`}
                                className="px-1.5 py-0.5 rounded-lg bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white font-mono text-[10px] flex items-center gap-1 border border-white/5 transition-colors cursor-pointer"
                              >
                                <Hash className="w-2.5 h-2.5 text-accent-cyan" />
                                <span>{p.id}</span>
                                <Copy className="w-2.5 h-2.5 opacity-60" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsInfoOpen(false)
                                  handleSearchFromUser(p.id, p.name)
                                }}
                                title={`Search messages from ${p.name}`}
                                className="p-1 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-3 text-xs text-gray-500">
                        {chatDetails ? 'No members visible' : 'Loading participants...'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notifications Toggle */}
              <div className="p-3 rounded-2xl bg-dark-850/90 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-accent-rose" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-accent-emerald" />
                  )}
                  <span>Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-accent-rose/20 text-accent-rose border border-accent-rose/30'
                      : 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                  }`}
                >
                  {isMuted ? 'Muted' : 'Enabled'}
                </button>
              </div>

              {/* External Navigation CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = chatDetails?.username
                      ? `https://t.me/${chatDetails.username}`
                      : `tg://resolve?domain=${chat.id}`
                    window.guidegram?.openExternal?.(target)
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-glow flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Telegram Official</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4.5 Dedicated User Profile Drawer */}
      {userProfilePeerId && (
        <div className="absolute inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 md:w-96 h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 select-none"
          >
            {/* Drawer Header */}
            <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserProfilePeerId(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-gray-100">User Profile</span>
              </div>
              <button
                type="button"
                onClick={() => setUserProfilePeerId(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Avatar & Title Hero */}
              <div className="flex flex-col items-center text-center">
                <Avatar
                  accountId={chat.accountId}
                  peerId={userProfilePeerId}
                  title={userProfileDetails?.title || 'User'}
                  avatarUrl={userProfileDetails?.avatarUrl}
                  size="xl"
                  className="mb-3 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={async () => {
                    if (userProfileDetails?.avatarUrl) {
                      setLightboxUrl(userProfileDetails.avatarUrl)
                    } else if (window.guidegram?.getProfilePhoto && userProfilePeerId) {
                      try {
                        showToast('Loading full profile photo...')
                        const big = await window.guidegram.getProfilePhoto(chat.accountId, userProfilePeerId, true)
                        if (big) setLightboxUrl(big)
                        else showToast('No profile photo available')
                      } catch {
                        showToast('Could not load profile photo')
                      }
                    }
                  }}
                />

                <div className="flex items-center justify-center gap-1.5 mb-1 px-2">
                  <h3
                    dir={isRTL(userProfileDetails?.title || '') ? 'rtl' : 'ltr'}
                    className="text-base font-bold text-white"
                  >
                    {userProfileDetails?.title || 'User'}
                  </h3>
                  {userProfileDetails?.customEmojiStatusId && (
                    <CustomEmojiView
                      accountId={chat.accountId}
                      documentId={userProfileDetails.customEmojiStatusId}
                      fallback="⭐"
                      className="inline-block w-5 h-5 align-middle select-none shrink-0"
                    />
                  )}
                  {userProfileDetails?.verified && (
                    <span className="text-primary-400 text-xs" title="Verified">✓</span>
                  )}
                </div>

                <div className="text-xs text-gray-400 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-accent-cyan" />
                  <span>Personal Profile</span>
                </div>
              </div>

              {/* Action Buttons: Send Message, Search, Mention */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = userProfileDetails?.username || userProfilePeerId
                    setUserProfilePeerId(null)
                    if (onSelectUserOrChat) {
                      onSelectUserOrChat(target)
                    }
                  }}
                  className="p-2.5 rounded-xl bg-primary-600/20 hover:bg-primary-600/35 border border-primary-500/30 text-primary-300 hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[10px]">Message</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserProfilePeerId(null)
                    handleSearchFromUser(userProfilePeerId, userProfileDetails?.title)
                  }}
                  className="p-2.5 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/30 border border-accent-cyan/30 text-accent-cyan hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span className="text-[10px]">Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const mention = userProfileDetails?.username
                      ? `@${userProfileDetails.username} `
                      : `${userProfileDetails?.title || 'User'} `
                    setInputText((prev) => prev + mention)
                    setUserProfilePeerId(null)
                    textareaRef.current?.focus()
                  }}
                  className="p-2.5 rounded-xl bg-accent-violet/15 hover:bg-accent-violet/30 border border-accent-violet/30 text-accent-violet hover:text-white flex flex-col items-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                >
                  <AtSign className="w-4 h-4" />
                  <span className="text-[10px]">Mention</span>
                </button>
              </div>

              {/* Bio / About */}
              {userProfileDetails?.about && (
                <div className="p-3.5 rounded-2xl bg-dark-850/90 border border-white/5 space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bio</div>
                  <p
                    dir={isRTL(userProfileDetails.about) ? 'rtl' : 'ltr'}
                    className="text-xs text-gray-200 whitespace-pre-wrap select-text leading-relaxed"
                  >
                    {userProfileDetails.about}
                  </p>
                </div>
              )}

              {/* User ID & Username & Phone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-accent-cyan shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">User ID</span>
                      <span className="font-mono text-xs text-gray-200">{userProfilePeerId}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await copyTextToClipboard(userProfilePeerId)
                      showToast(`Copied User ID: ${userProfilePeerId}`)
                    }}
                    title="Copy User ID"
                    className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {userProfileDetails?.username && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                    <div className="flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-accent-cyan shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Username</span>
                        <span className="text-xs text-gray-200">@{userProfileDetails.username}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await copyTextToClipboard(`@${userProfileDetails.username}`)
                        showToast(`Copied @${userProfileDetails.username}`)
                      }}
                      title="Copy Username"
                      className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {userProfileDetails?.phone && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-850/90 border border-white/5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-accent-emerald shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Phone</span>
                        <span className="text-xs text-gray-200">{userProfileDetails.phone}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await copyTextToClipboard(userProfileDetails.phone!)
                        showToast(`Copied Phone Number`)
                      }}
                      title="Copy Phone"
                      className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Personal Channel Card */}
              {userProfileDetails?.personalChannelId && (
                <div
                  onClick={() => {
                    if (onSelectUserOrChat) {
                      setUserProfilePeerId(null)
                      onSelectUserOrChat(userProfileDetails.personalChannelId!)
                    }
                  }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-primary-950/40 via-dark-850/90 to-dark-850 border border-primary-500/20 hover:border-primary-500/40 transition-all cursor-pointer space-y-1 group"
                >
                  <div className="text-[10px] font-bold text-primary-400 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      <span>Personal Channel</span>
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="text-xs font-semibold text-white truncate">
                    {userProfileDetails.personalChannelTitle || `Channel #${userProfileDetails.personalChannelId}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150 select-none"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const a = document.createElement('a')
                a.href = lightboxUrl
                a.download = `photo_${Date.now()}.jpg`
                a.click()
              }}
              title="Download photo"
              className="p-2.5 rounded-xl bg-dark-800/80 hover:bg-dark-750 text-white transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              title="Close (Esc)"
              className="p-2.5 rounded-xl bg-dark-800/80 hover:bg-dark-750 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <img
            src={lightboxUrl}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* 6. Telegram Desktop Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 340),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 bg-dark-850/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none text-xs"
        >
          {/* Reply to message */}
          <button
            type="button"
            onClick={() => {
              setReplyMessage(contextMenu.message)
              setContextMenu(null)
              setTimeout(() => textareaRef.current?.focus(), 50)
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-primary-300 hover:text-white hover:bg-primary-600/30 transition-colors text-left cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5 shrink-0 text-primary-400" />
            <span>Reply</span>
          </button>

          {/* Quote Selection into Input (if text selected) */}
          {contextMenu.selectedText && (
            <button
              type="button"
              onClick={() => {
                const quoteText = `> ${contextMenu.selectedText}\n`
                setInputText((prev) => (prev ? `${prev}\n${quoteText}` : quoteText))
                setContextMenu(null)
                showToast('Quoted selected text')
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-primary-300 hover:text-white hover:bg-primary-600/30 transition-colors text-left cursor-pointer"
            >
              <Quote className="w-3.5 h-3.5 shrink-0 text-primary-400" />
              <span>Quote Selection</span>
            </button>
          )}

          {/* Copy Selected Text */}
          {contextMenu.selectedText && (
            <button
              type="button"
              onClick={async () => {
                await copyTextToClipboard(contextMenu.selectedText!)
                setContextMenu(null)
                showToast('Copied selected text')
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>Copy Selected Text</span>
            </button>
          )}

          {/* Copy Entire Message Text */}
          {contextMenu.message.text && (
            <button
              type="button"
              onClick={async () => {
                await copyTextToClipboard(contextMenu.message.text || '')
                setContextMenu(null)
                showToast(`Copied message #${contextMenu.message.id} text`)
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span>Copy Message Text</span>
            </button>
          )}

          {/* Copy Link to Message */}
          <button
            type="button"
            onClick={async () => {
              const link = chat.username
                ? `https://t.me/${chat.username}/${contextMenu.message.id}`
                : `https://t.me/c/${chat.id.replace(/^-100/, '')}/${contextMenu.message.id}`
              await copyTextToClipboard(link)
              setContextMenu(null)
              showToast('Copied link to message')
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>Copy Message Link</span>
          </button>

          {/* 64Gram Copy Message ID */}
          <button
            type="button"
            onClick={async () => {
              await copyTextToClipboard(contextMenu.message.id.toString())
              setContextMenu(null)
              showToast(`Copied Message ID #${contextMenu.message.id}`)
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <Hash className="w-3.5 h-3.5 shrink-0 text-primary-400" />
            <span>Copy Message ID (#{contextMenu.message.id})</span>
          </button>

          {/* 64Gram Copy User ID */}
          {contextMenu.message.senderId && (
            <button
              type="button"
              onClick={async () => {
                await copyTextToClipboard(contextMenu.message.senderId!)
                setContextMenu(null)
                showToast(`Copied User ID: ${contextMenu.message.senderId}`)
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <User className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
              <span>Copy User ID ({contextMenu.message.senderId})</span>
            </button>
          )}

          {/* View User Profile in Group */}
          {chat.isGroup && contextMenu.message.senderId && (
            <button
              type="button"
              onClick={() => {
                const sid = contextMenu.message.senderId!
                const sname = contextMenu.message.senderName
                setContextMenu(null)
                handleOpenUserProfile(sid, sname)
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <User className="w-3.5 h-3.5 shrink-0 text-primary-400" />
              <span>View profile of {contextMenu.message.senderName || 'user'}</span>
            </button>
          )}

          {/* 64Gram Search Messages from this User (in group chats) */}
          {chat.isGroup && (contextMenu.message.senderId || contextMenu.message.senderName) && (
            <button
              type="button"
              onClick={() => {
                const senderId = contextMenu.message.senderId
                const senderName = contextMenu.message.senderName
                setContextMenu(null)
                handleSearchFromUser(senderId, senderName)
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-accent-cyan hover:text-white hover:bg-accent-cyan/15 transition-colors text-left cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
              <span>Search messages from {contextMenu.message.senderName || 'this user'}</span>
            </button>
          )}

          {/* Direct Forward without quote (Alt+F) */}
          <button
            type="button"
            onClick={() => {
              const msg = contextMenu.message
              setContextMenu(null)
              onOpenDirectForward(msg)
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
          >
            <Forward className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>Forward (Alt+F)</span>
          </button>

          {/* Quick Forward to Saved Messages */}
          {quickForwardToSaved && onQuickForwardToSaved && (
            <button
              type="button"
              onClick={async () => {
                const msg = contextMenu.message
                setContextMenu(null)
                const ok = await onQuickForwardToSaved(msg)
                if (ok !== false) {
                  showToast('Saved to Saved Messages!')
                } else {
                  showToast('Failed to save message')
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0 text-accent-cyan" />
              <span>Save to Saved Messages</span>
            </button>
          )}

          <div className="h-px bg-white/5 my-1" />

          {/* Delete Message (Permission Checked) */}
          {onDeleteMessage && canDeleteMessage(contextMenu.message) && (
            <button
              type="button"
              onClick={async () => {
                const msg = contextMenu.message
                setContextMenu(null)
                const confirmMsg = alwaysDeleteBoth
                  ? `Delete message #${msg.id} for both sides?`
                  : `Delete message #${msg.id}?`
                if (window.confirm(confirmMsg)) {
                  const ok = await onDeleteMessage(msg)
                  if (ok !== false) {
                    showToast(`Deleted message #${msg.id}`)
                  } else {
                    showToast('Failed to delete message')
                  }
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-accent-rose hover:bg-accent-rose/15 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{alwaysDeleteBoth ? 'Delete for Everyone' : 'Delete Message'}</span>
            </button>
          )}
        </div>
      )}

      {/* 64Gram External Link Security Modal */}
      {pendingExternalUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-white/10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Open External Link?</h3>
                <p className="text-[11px] text-gray-400">Telegram Desktop security check</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-dark-800 border border-white/5 font-mono text-xs text-accent-cyan break-all max-h-24 overflow-y-auto">
              {pendingExternalUrl}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPendingExternalUrl(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = pendingExternalUrl
                  setPendingExternalUrl(null)
                  window.guidegram?.openExternal?.(url)
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-glow cursor-pointer"
              >
                Open Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Messages Search Drawer Modal (Telegram Desktop v6.7.8) */}
      {isPinnedDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-dark-850 border border-white/10 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[80vh]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center">
                  <Pin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pinned Messages</h3>
                  <p className="text-[10px] text-gray-400">
                    {chatDetails?.pinnedMessages?.length || 0} pinned in {chat?.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinnedDrawerOpen(false)
                  setPinnedSearchQuery('')
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input for Pinned Messages */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800 border border-white/5 focus-within:border-accent-cyan/50 transition-colors">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search in pinned messages..."
                value={pinnedSearchQuery}
                onChange={(e) => setPinnedSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              {pinnedSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPinnedSearchQuery('')}
                  className="p-0.5 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Pinned Messages List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const list = chatDetails?.pinnedMessages || (chatDetails?.pinnedMessage ? [chatDetails.pinnedMessage] : [])
                const filtered = pinnedSearchQuery.trim()
                  ? list.filter((p) => (p.text || '').toLowerCase().includes(pinnedSearchQuery.toLowerCase()))
                  : list

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-gray-500">
                      {pinnedSearchQuery ? 'No matching pinned messages' : 'No pinned messages found'}
                    </div>
                  )
                }

                return filtered.map((pm, idx) => (
                  <div
                    key={pm.id}
                    onClick={() => {
                      setIsPinnedDrawerOpen(false)
                      handleScrollToReply(pm.id)
                    }}
                    className="p-3 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-white/5 hover:border-accent-cyan/30 transition-all cursor-pointer group flex flex-col gap-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-accent-cyan">
                        #{pm.id} {pm.date ? `• ${new Date(pm.date).toLocaleDateString()}` : ''}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-accent-cyan transition-colors" />
                    </div>
                    <p className="text-xs text-gray-200 line-clamp-3 leading-relaxed break-words">
                      {pm.text || `Message #${pm.id}`}
                    </p>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 7. Group Advanced Analytics & Statistics Modal */}
      {chat.isGroup && (
        <GroupStatsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          chat={chat}
          chatDetails={chatDetails}
          messages={messages}
        />
      )}

      {/* 8. Scheduled Messages Modal */}
      {isScheduledListOpen && chat && (
        <ScheduledMessagesModal
          isOpen={isScheduledListOpen}
          onClose={() => setIsScheduledListOpen(false)}
          accountId={chat.accountId}
          chatId={chat.id}
          chatTitle={chat.title}
        />
      )}

      {/* Shared Media Gallery Drawer */}
      {isSharedMediaOpen && chat && (
        <SharedMediaDrawer
          isOpen={isSharedMediaOpen}
          onClose={() => setIsSharedMediaOpen(false)}
          chat={chat}
        />
      )}

      {/* 9. MTProto Native Stickers Drawer (Telegram Desktop v7.0) */}
      {isStickerDrawerOpen && chat && (
        <StickerPickerDrawer
          isOpen={isStickerDrawerOpen}
          onClose={() => setIsStickerDrawerOpen(false)}
          accountId={chat.accountId}
          chatId={chat.id}
          onSelectSticker={handleSendSticker}
        />
      )}

      {/* 10. 64Gram Local Edit History Tracker Modal */}
      {viewingEditHistoryMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setViewingEditHistoryMsg(null)}
        >
          <div
            className="w-full max-w-lg bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-dark-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Message Edit History</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-black/30 border border-white/10 text-accent-cyan">
                      #{viewingEditHistoryMsg.id}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Chronological revision timeline ({(viewingEditHistoryMsg.editHistory?.length || 0) + 1} versions)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEditHistoryMsg(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Revision Timeline List */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {viewingEditHistoryMsg.editHistory &&
                viewingEditHistoryMsg.editHistory.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-dark-800/60 border border-white/5 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] text-gray-400 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/5 font-semibold text-gray-300">
                          {idx === 0 ? 'Original Version' : `Revision #${idx + 1}`}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {formatMessageTime(rev.date)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyTextToClipboard(rev.text)
                          showToast('Copied revision text to clipboard')
                        }}
                        className="hover:text-accent-cyan transition-colors p-1"
                        title="Copy this revision"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-gray-200 leading-relaxed font-sans select-text">
                      {rev.text || <span className="italic opacity-50">[Empty text]</span>}
                    </div>
                  </div>
                ))}

              {/* Current Version Card */}
              <div className="p-3.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 space-y-2 relative">
                <div className="flex items-center justify-between text-[11px] text-accent-cyan border-b border-accent-cyan/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-accent-cyan/20 font-bold text-accent-cyan">
                      Current Version
                    </span>
                    <span className="font-mono text-[10px] text-gray-300">
                      {formatMessageTime(viewingEditHistoryMsg.editDate || viewingEditHistoryMsg.date)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await copyTextToClipboard(viewingEditHistoryMsg.text)
                      showToast('Copied current text to clipboard')
                    }}
                    className="hover:text-accent-cyan transition-colors p-1"
                    title="Copy current version"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="whitespace-pre-wrap break-words text-white leading-relaxed font-sans select-text font-medium">
                  {viewingEditHistoryMsg.text || (
                    <span className="italic opacity-50">[Empty text]</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-dark-800/80 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingEditHistoryMsg(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Create Poll & Quiz Modal */}
      {isCreatePollOpen && chat && (
        <CreatePollModal
          isOpen={isCreatePollOpen}
          accountId={chat.accountId}
          chatId={chat.id}
          onClose={() => setIsCreatePollOpen(false)}
          onSuccess={() => {
            setIsCreatePollOpen(false)
            if (chat) {
              window.guidegram?.getMessages(chat.accountId, chat.id, 30).then((msgs) => {
                if (msgs && onMergeHistoricalMessages) {
                  onMergeHistoricalMessages(msgs)
                }
              }).catch(() => {})
            }
          }}
        />
      )}

      {/* 10. Telegram Mini App (TWA) Modal */}
      {activeMiniApp && (
        <MiniAppModal
          isOpen={!!activeMiniApp}
          url={activeMiniApp.url}
          title={activeMiniApp.title}
          botName={activeMiniApp.botName}
          botUsername={activeMiniApp.botUsername}
          onClose={() => setActiveMiniApp(null)}
          onOpenInNewWindow={() => {
            if (window.guidegram?.openMiniApp) {
              window.guidegram.openMiniApp(activeMiniApp.url, activeMiniApp.title)
              setActiveMiniApp(null)
            }
          }}
        />
      )}

      {/* 11. Admin Log / Recent Actions Modal */}
      {isAdminLogOpen && chat && (
        <AdminLogModal
          isOpen={isAdminLogOpen}
          accountId={chat.accountId}
          chatId={chat.id}
          chatTitle={chat.title}
          onClose={() => setIsAdminLogOpen(false)}
        />
      )}

      {/* 12. Telegram Stars Paid Reaction Modal */}
      {paidReactionModalState.isOpen && paidReactionModalState.messageId && chat && (
        <PaidReactionModal
          isOpen={paidReactionModalState.isOpen}
          accountId={chat.accountId}
          chatId={chat.id}
          messageId={paidReactionModalState.messageId}
          onClose={() => setPaidReactionModalState({ isOpen: false, messageId: null })}
          onSuccess={() => {
            showToast(t('stars.reaction_sent_success'))
            if (chat) {
              window.guidegram?.getMessages(chat.accountId, chat.id, 30).then((msgs) => {
                if (msgs && onMergeHistoricalMessages) {
                  onMergeHistoricalMessages(msgs)
                }
              }).catch(() => {})
            }
          }}
        />
      )}

      {/* 13. Telegram Group Voice & Video Call Modal */}
      {isGroupCallModalOpen && chat && (
        <GroupCallModal
          isOpen={isGroupCallModalOpen}
          accountId={chat.accountId}
          chatId={chat.id}
          chatTitle={chat.title}
          isBroadcast={chatDetails?.isBroadcast}
          initialCallId={chatDetails?.groupCallId}
          initialAccessHash={chatDetails?.groupCallAccessHash}
          onClose={() => setIsGroupCallModalOpen(false)}
          onLeaveCall={() => setIsCallJoined(false)}
        />
      )}
    </div>
  )
}
