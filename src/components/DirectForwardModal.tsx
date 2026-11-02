import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Send,
  Bookmark,
  Search,
  Megaphone,
  Users,
  Bot,
  User,
  Quote,
  EyeOff,
  VolumeX,
  Volume2,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { DialogItem, MessageItem, ContactItem } from '../types/telegram'
import { useI18n } from '../i18n'
import { isRTL } from '../utils/textUtils'

export interface DirectForwardPayload {
  toChatIds: string[]
  withoutQuote: boolean
  dropMediaCaptions: boolean
  newCaption?: string
  silent: boolean
}

export interface DirectForwardModalProps {
  isOpen: boolean
  message: MessageItem | null
  messages?: MessageItem[]
  dialogs: DialogItem[]
  accountId?: string
  onClose: () => void
  onForward: (
    payloadOrTargetChatIds: DirectForwardPayload | string[],
    withoutQuote?: boolean,
    silent?: boolean,
    extraOptions?: { dropMediaCaptions?: boolean; newCaption?: string }
  ) => Promise<void> | void
}

/**
 * Normalizes Persian and Arabic text for consistent, high-recall search matching.
 */
export const normalizeSearchText = (text?: string): string => {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics / tanween
    .replace(/[يى]/g, 'ی') // Arabic Yeh to Persian Ye
    .replace(/[ك]/g, 'ک') // Arabic Kaf to Persian Ke
    .replace(/[آأإ]/g, 'ا') // Alef variations to plain Alef
    .replace(/[ؤ]/g, 'و') // Waw with hamza
    .replace(/[ئ]/g, 'ی') // Yeh with hamza
    .replace(/[\u200c\u200b\u00ad]/g, '') // Zero-width non-joiner & soft hyphens
    .replace(/[ـ]/g, '') // Tatweel
    .trim()
}

/**
 * Flexible search regex matching Persian/Arabic variations.
 */
export const buildFlexibleSearchRegex = (q: string): RegExp | null => {
  const trimmed = q.trim()
  if (!trimmed) return null

  let pattern = ''
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]
    if (char === 'ی' || char === 'ي' || char === 'ى' || char === 'ئ') {
      pattern += '[یيىئ]'
    } else if (char === 'ک' || char === 'ك') {
      pattern += '[کك]'
    } else if (char === 'ا' || char === 'آ' || char === 'أ' || char === 'إ') {
      pattern += '[اآأإ]'
    } else if (char === 'ه' || char === 'ة') {
      pattern += '[هة]'
    } else if (char === 'و' || char === 'ؤ') {
      pattern += '[وؤ]'
    } else if (/[\s\u200c\u200b\u00ad]/.test(char)) {
      pattern += '[\\s\\u200c\\u200b\\u00ad]*'
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  try {
    return new RegExp(pattern, 'i')
  } catch {
    return null
  }
}

type ForwardTabCategory = 'all' | 'users' | 'groups' | 'channels'

export const DirectForwardModal: React.FC<DirectForwardModalProps> = ({
  isOpen,
  message,
  messages,
  dialogs,
  accountId,
  onClose,
  onForward,
}) => {
  const { t, isRTL: isRTLContext, formatNumber } = useI18n()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])
  // Telegram Official Standard: Forward WITH quote is default (withoutQuote = false)
  const [withoutQuote, setWithoutQuote] = useState(false)
  const [dropMediaCaptions, setDropMediaCaptions] = useState(false)
  const [newCaption, setNewCaption] = useState('')
  const [silent, setSilent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<ForwardTabCategory>('all')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [contacts, setContacts] = useState<DialogItem[]>([])
  const [serverPeers, setServerPeers] = useState<DialogItem[]>([])
  const [isSearchingServer, setIsSearchingServer] = useState(false)

  const effectiveAccountId = accountId || dialogs[0]?.accountId

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 80)
    }
  }, [isOpen])

  // Reset state when opened with a new message
  useEffect(() => {
    if (isOpen && message) {
      setSelectedChatIds([])
      setSearch('')
      setActiveTab('all')
      setServerPeers([])
      setLoading(false)
      // Telegram Standard: Default WITH quote (preserve author, custom emojis, channel badges)
      setWithoutQuote(false)
      setDropMediaCaptions(false)
      setSilent(false)
      setShowAdvancedOptions(false)
      setNewCaption('')
    }
  }, [isOpen, message])

  // Load account contacts to enrich the forward list if they are not in recent dialogs
  useEffect(() => {
    if (isOpen && effectiveAccountId && window.guidegram?.getContacts) {
      window.guidegram
        .getContacts(effectiveAccountId)
        .then((cts: ContactItem[]) => {
          if (Array.isArray(cts)) {
            const mappedContacts: DialogItem[] = cts.map((c) => ({
              id: c.id,
              accountId: effectiveAccountId,
              title: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || c.phone || 'Contact',
              unreadCount: 0,
              isUser: true,
              isGroup: false,
              isChannel: false,
              isBot: false,
              isPinned: false,
              username: c.username,
              avatarUrl: c.avatarUrl,
              isContact: true,
            }))
            setContacts(mappedContacts)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, effectiveAccountId])

  // Live MTProto server search for peers not cached in local dialogs
  useEffect(() => {
    const q = search.trim().replace(/^@/, '')
    if (!q || q.length < 2 || !effectiveAccountId || !window.guidegram?.searchPublicPeers) {
      setServerPeers([])
      setIsSearchingServer(false)
      return
    }

    let cancelled = false
    setIsSearchingServer(true)
    const timer = setTimeout(() => {
      window.guidegram
        ?.searchPublicPeers(effectiveAccountId, q)
        .then((peers: DialogItem[]) => {
          if (!cancelled && Array.isArray(peers)) {
            setServerPeers(peers)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsSearchingServer(false)
        })
    }, 220)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, effectiveAccountId])

  // Primary destinations: Keep recent dialogs in their natural Telegram order!
  // Dialogs already sorted by pinned first, then last interaction date descending.
  const allDestinations = useMemo(() => {
    const mergedMap = new Map<string, DialogItem>()
    // 1. Prioritize user's active dialogs in their exact recent order
    for (const d of dialogs) {
      if (d.id) mergedMap.set(d.id, d)
    }
    // 2. Add contacts not present in recent dialogs
    for (const c of contacts) {
      if (c.id && !mergedMap.has(c.id)) {
        mergedMap.set(c.id, c)
      }
    }
    // 3. Add live server search peers
    for (const s of serverPeers) {
      if (s.id && !mergedMap.has(s.id)) {
        mergedMap.set(s.id, s)
      }
    }
    return Array.from(mergedMap.values())
  }, [dialogs, contacts, serverPeers])

  // Filter according to Telegram rules:
  // 1. Saved Messages handled separately as the dedicated top row
  // 2. Channels: ONLY channels where user is admin, owner (creator) or has send permissions
  // 3. Groups & PVs included
  // 4. Exclude ads/promoted channels
  const validDestinations = useMemo(() => {
    return allDestinations.filter((d) => {
      if (d.isSponsored || d.isSponsorChannel) return false
      if (d.id === 'me' || d.isSavedMessages) return false

      const isBroadcast = Boolean(d.isBroadcast ?? (d.isChannel && !d.isGroup))
      if (isBroadcast) {
        const isChannelAdminOrOwner = Boolean(d.isCreator || d.isAdmin || d.canSendMessages)
        if (!isChannelAdminOrOwner) {
          return false
        }
      }
      return true
    })
  }, [allDestinations])

  // High-recall Persian / Arabic / English matching
  const matchesSearch = (d: DialogItem, query: string): boolean => {
    const clean = query.trim().toLowerCase().replace(/^@/, '')
    if (!clean) return true
    const norm = normalizeSearchText(clean)

    const normTitle = normalizeSearchText(d.title || '')
    const normUser = normalizeSearchText((d.username || '').replace(/^@/, ''))
    const rawTitle = (d.title || '').toLowerCase()
    const rawUser = (d.username || '').toLowerCase().replace(/^@/, '')

    if (norm && (normTitle.includes(norm) || normUser.includes(norm))) return true
    if (rawTitle.includes(clean) || rawUser.includes(clean)) return true
    if (d.id && d.id.includes(clean)) return true

    const regex = buildFlexibleSearchRegex(clean)
    if (regex && (regex.test(d.title || '') || regex.test(d.username || ''))) {
      return true
    }

    return false
  }

  const isSavedMessagesMatch = (query: string): boolean => {
    const clean = query.trim().toLowerCase()
    if (!clean) return true
    const norm = normalizeSearchText(clean)
    const terms = [
      'saved',
      'save',
      'saved messages',
      'messages',
      'me',
      'ذخیره',
      'ذخیره شده',
      'پیام های ذخیره',
      'پیام های ذخیره شده',
      'پیامهای ذخیره شده',
      'پیامهای ذخیره‌شده',
      'پیام ذخیره',
      'سیو',
      'سیود',
    ]
    return terms.some((t) => {
      const normT = normalizeSearchText(t)
      return normT.includes(norm) || norm.includes(normT) || t.includes(clean)
    })
  }

  // Filter based on active tab category and search query
  const filtered = useMemo(() => {
    return validDestinations.filter((d) => {
      // Tab Category Filtering
      const isBroadcast = Boolean(d.isBroadcast ?? (d.isChannel && !d.isGroup))
      const isGroup = Boolean(d.isGroup || (d.isChannel && !isBroadcast))
      const isUser = Boolean(d.isUser && !d.isBot)

      if (activeTab === 'users' && !isUser) return false
      if (activeTab === 'groups' && !isGroup) return false
      if (activeTab === 'channels' && !isBroadcast) return false

      // Search Query Filtering
      if (search.trim()) {
        return matchesSearch(d, search)
      }
      return true
    })
  }, [validDestinations, activeTab, search])

  const showSavedMessages = isSavedMessagesMatch(search) && (activeTab === 'all' || activeTab === 'users')

  if (!isOpen || !message) return null

  const handleToggleChat = (chatId: string) => {
    setSelectedChatIds((prev) => {
      if (prev.includes(chatId)) {
        return prev.filter((id) => id !== chatId)
      } else {
        return [...prev, chatId]
      }
    })
  }

  const handleRemoveRecipient = (chatId: string) => {
    setSelectedChatIds((prev) => prev.filter((id) => id !== chatId))
  }

  const handleForward = async () => {
    if (selectedChatIds.length === 0 || loading) return
    setLoading(true)
    try {
      const trimmedCaption = newCaption.trim()
      const payload: DirectForwardPayload = {
        toChatIds: selectedChatIds,
        withoutQuote,
        dropMediaCaptions,
        newCaption: trimmedCaption.length > 0 ? trimmedCaption : undefined,
        silent,
      }

      if (onForward.length <= 1) {
        await onForward(payload)
      } else {
        await onForward(selectedChatIds, withoutQuote, silent, {
          dropMediaCaptions,
          newCaption: trimmedCaption.length > 0 ? trimmedCaption : undefined,
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to forward messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const getChatTitle = (chatId: string): string => {
    if (chatId === 'me') return t('forward.saved_messages') || 'Saved Messages'
    const found = allDestinations.find((d) => d.id === chatId)
    return found?.title || `Chat ${chatId}`
  }

  // Derive source author/chat name for preview
  const originalSenderName =
    message.forwardFromName ||
    message.senderName ||
    message.chatTitle ||
    (message.isOutgoing ? (t('chat.you') || 'You') : (t('common.sender') || 'Original Author'))

  const messageCount = messages && messages.length > 1 ? messages.length : 1
  const hasMultipleMessages = messageCount > 1

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="glass-modal w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[82vh] max-h-[680px] border border-white/10 bg-dark-900/95"
      >
        {/* Header - Clean Telegram Style */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-dark-850/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/30">
              <Send className="w-4 h-4 rtl:-scale-x-100" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-100 truncate">
                {hasMultipleMessages
                  ? t('forward.messages_count', { count: formatNumber(messageCount) }) || `Forward ${messageCount} Messages`
                  : t('forward.title') || 'Forward'}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {hasMultipleMessages
                  ? `${messageCount} messages selected`
                  : t('forward.from', { name: originalSenderName }) || `From: ${originalSenderName}`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Fast Category Chips */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-white/5 bg-dark-850/40">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('forward.search_placeholder') || 'Search chats and contacts...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-800/90 border border-white/10 rounded-xl pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all font-sans"
            />
            <div className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-2.5 rtl:pr-0 rtl:pl-2.5 flex items-center gap-1.5">
              {isSearchingServer && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              )}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-white cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeTab === 'all'
                  ? 'bg-primary-600 text-white font-semibold shadow-sm'
                  : 'bg-dark-800 text-gray-400 hover:text-gray-200 hover:bg-dark-750'
              }`}
            >
              {t('forward.all') || 'All'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeTab === 'users'
                  ? 'bg-primary-600 text-white font-semibold shadow-sm'
                  : 'bg-dark-800 text-gray-400 hover:text-gray-200 hover:bg-dark-750'
              }`}
            >
              {t('forward.chats') || 'Chats'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeTab === 'groups'
                  ? 'bg-primary-600 text-white font-semibold shadow-sm'
                  : 'bg-dark-800 text-gray-400 hover:text-gray-200 hover:bg-dark-750'
              }`}
            >
              {t('forward.groups') || 'Groups'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('channels')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                activeTab === 'channels'
                  ? 'bg-primary-600 text-white font-semibold shadow-sm'
                  : 'bg-dark-800 text-gray-400 hover:text-gray-200 hover:bg-dark-750'
              }`}
            >
              {t('forward.channels') || 'Channels'}
            </button>
          </div>

          {/* Selected Recipients Pills Strip */}
          <AnimatePresence>
            {selectedChatIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1"
              >
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {selectedChatIds.map((chatId) => (
                    <span
                      key={chatId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary-600/25 border border-primary-500/40 text-primary-200 shrink-0 font-medium"
                    >
                      <span className="truncate max-w-[110px]">{getChatTitle(chatId)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(chatId)}
                        className="hover:text-white rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedChatIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedChatIds([])}
                      className="text-[10px] text-gray-400 hover:text-accent-rose transition-colors cursor-pointer shrink-0 px-1"
                    >
                      {t('common.clear') || 'Clear'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Body: Full-Height Scrollable Destination List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 divide-y divide-white/[0.04]">
          {/* Section: Saved Messages (Telegram Top Item) */}
          {showSavedMessages && (
            <div className="pb-1">
              <div
                onClick={() => handleToggleChat('me')}
                className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                  selectedChatIds.includes('me')
                    ? 'bg-primary-600/20 border-primary-500/50 text-white shadow-sm'
                    : 'bg-dark-850/40 hover:bg-dark-800/80 border-transparent text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 border border-accent-cyan/25 shadow-sm">
                    <Bookmark className="w-4 h-4 fill-accent-cyan/20" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-100 text-xs">
                      {t('forward.saved_messages') || 'Saved Messages'}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {t('saved_messages.title') || 'Personal cloud storage'}
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                    selectedChatIds.includes('me')
                      ? 'bg-primary-600 border-primary-500 text-white shadow-sm'
                      : 'border-white/20 bg-dark-900/60'
                  }`}
                >
                  {selectedChatIds.includes('me') && (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Recent Dialogs & Contacts */}
          <div className="pt-1 space-y-0.5">
            {filtered.map((d) => {
              const isSelected = selectedChatIds.includes(d.id)
              const orderIndex = selectedChatIds.indexOf(d.id)
              const isBroadcast = Boolean(d.isBroadcast ?? (d.isChannel && !d.isGroup))
              const isGroup = Boolean(d.isGroup || (d.isChannel && !isBroadcast))
              const isBot = Boolean(d.isBot)
              const isOwner = Boolean(d.isCreator)

              return (
                <div
                  key={d.id}
                  onClick={() => handleToggleChat(d.id)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs border ${
                    isSelected
                      ? 'bg-primary-600/20 border-primary-500/40 text-white shadow-sm'
                      : 'bg-transparent hover:bg-dark-800/70 border-transparent text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-dark-800 text-gray-300 flex items-center justify-center font-bold text-xs shrink-0 border border-white/5 overflow-hidden">
                      {d.avatarUrl ? (
                        <img src={d.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-300">
                          {d.avatarInitials || d.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-gray-100 text-xs">
                          {d.title}
                        </span>

                        {isBroadcast && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 flex items-center gap-0.5 shrink-0">
                            <Megaphone className="w-2.5 h-2.5" />
                            <span>{isOwner ? (t('chat.owner') || 'Owner') : (t('chat.admin') || 'Admin')}</span>
                          </span>
                        )}
                        {isGroup && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary-500/15 text-primary-300 border border-primary-500/30 flex items-center gap-0.5 shrink-0">
                            <Users className="w-2.5 h-2.5" />
                            <span>{t('chat.group') || 'Group'}</span>
                          </span>
                        )}
                        {isBot && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-amber/15 text-accent-amber border border-accent-amber/30 flex items-center gap-0.5 shrink-0">
                            <Bot className="w-2.5 h-2.5" />
                            <span>{t('chat.bot') || 'Bot'}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {d.username ? `@${d.username}` : (d.lastMessageText || (isGroup ? t('chat.group') : t('forward.chats')))}
                      </div>
                    </div>
                  </div>

                  {/* Multi-select indicator */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-2 rtl:ml-0 rtl:mr-2 ${
                      isSelected
                        ? 'bg-primary-600 border-primary-500 text-white shadow-sm'
                        : 'border-white/20 bg-dark-900/60'
                    }`}
                  >
                    {isSelected ? (
                      selectedChatIds.length > 1 ? (
                        <span className="text-[10px] font-bold">{orderIndex + 1}</span>
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )
                    ) : null}
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && !showSavedMessages && (
              <div className="py-12 text-center text-xs text-gray-500">
                {t('forward.no_chats_found') || 'No chats found matching search'}
              </div>
            )}
          </div>
        </div>

        {/* Telegram Minimalist Forward Preview & Options Bar (Compact Bottom Bar) */}
        <div className="border-t border-white/10 bg-dark-850/90 p-3 space-y-2">
          {/* Forward Quote Preview & Quick Toggles */}
          <div className="flex items-center justify-between text-xs bg-dark-900/80 border border-white/5 rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${withoutQuote ? 'bg-white/5 text-gray-400' : 'bg-primary-500/15 text-primary-400'}`}>
                {withoutQuote ? <EyeOff className="w-3.5 h-3.5" /> : <Quote className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-200 truncate text-[11px]">
                  {withoutQuote
                    ? (t('forward.hide_sender') || 'Without Quote (Sender Hidden)')
                    : (t('forward.show_sender') || `Quote: ${originalSenderName}`)}
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {message.mediaType ? `[${message.mediaType}] ` : ''}
                  {message.text ? message.text.slice(0, 45) : (messages && messages.length > 1 ? `${messages.length} messages` : '')}
                </div>
              </div>
            </div>

            {/* Quick Action Toggles */}
            <div className="flex items-center gap-1 shrink-0 ml-2 rtl:ml-0 rtl:mr-2">
              {/* Toggle Sender Name / Quote (Default ON) */}
              <button
                type="button"
                onClick={() => setWithoutQuote((prev) => !prev)}
                title={withoutQuote ? "Click to include author quote" : "Click to hide author quote"}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                  !withoutQuote
                    ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                    : 'bg-dark-800 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {!withoutQuote ? <Check className="w-3 h-3" /> : null}
                <span>{withoutQuote ? (t('forward.hide_sender') || 'No Quote') : (t('forward.show_sender') || 'Quote')}</span>
              </button>

              {/* Silent Toggle */}
              <button
                type="button"
                onClick={() => setSilent((prev) => !prev)}
                title={silent ? "Notification sound off" : "Normal notification"}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  silent
                    ? 'bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan'
                    : 'bg-dark-800 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {silent ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Expand Caption / Advanced Options */}
              <button
                type="button"
                onClick={() => setShowAdvancedOptions((prev) => !prev)}
                title="Add caption or options"
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  showAdvancedOptions || newCaption
                    ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                    : 'bg-dark-800 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Optional Caption Editor (Collapsible) */}
          <AnimatePresence>
            {showAdvancedOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 pt-1"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={newCaption}
                    dir={newCaption && newCaption.trim() ? (isRTL(newCaption) ? 'rtl' : 'ltr') : (isRTLContext ? 'rtl' : 'ltr')}
                    onChange={(e) => setNewCaption(e.target.value)}
                    placeholder={t('forward.add_comment') || 'Add a comment or caption...'}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                  {newCaption && (
                    <button
                      type="button"
                      onClick={() => setNewCaption('')}
                      className="absolute right-2 rtl:right-auto rtl:left-2 top-2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {message.mediaType && (
                  <label className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-200 cursor-pointer px-1">
                    <input
                      type="checkbox"
                      checked={dropMediaCaptions}
                      onChange={(e) => setDropMediaCaptions(e.target.checked)}
                      className="accent-primary-600 rounded cursor-pointer w-3.5 h-3.5"
                    />
                    <span>{t('forward.hide_caption') || 'Strip original media caption'}</span>
                  </label>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions: Cancel & Send */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-xs text-gray-400 truncate">
              {selectedChatIds.length > 0 ? (
                <span>
                  {t('forward.send_to_count', { count: formatNumber(selectedChatIds.length) }) ||
                    `Selected: ${selectedChatIds.length} chats`}
                </span>
              ) : (
                <span className="text-gray-500">{t('forward.search_placeholder') ? 'Select destination chats' : 'Select chats'}</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('common.cancel') || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleForward}
                disabled={selectedChatIds.length === 0 || loading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white shadow-glow transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5 rtl:-scale-x-100" />
                <span>
                  {loading
                    ? (t('common.sending') || 'Sending...')
                    : selectedChatIds.length > 1
                    ? (t('forward.send_to_count', { count: formatNumber(selectedChatIds.length) }) || `Send to ${selectedChatIds.length}`)
                    : (t('forward.send') || 'Send')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
